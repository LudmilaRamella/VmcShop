import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { Marca } from './entities/marca.entity';
import { Producto } from '../productos/entities/producto.entity';
import { CrearMarcaDto } from './dto/crear-marca.dto';
import { ActualizarMarcaDto } from './dto/actualizar-marca.dto';

@Injectable()
export class MarcasService {
  constructor(
    @InjectRepository(Marca)
    private readonly marcasRepo: Repository<Marca>,
    @InjectRepository(Producto)
    private readonly productosRepo: Repository<Producto>,
  ) {}

  async listar(soloActivas = false): Promise<Marca[]> {
    return this.marcasRepo.find({
      where: soloActivas ? { activa: true } : {},
      order: { nombre: 'ASC' },
    });
  }

  async obtener(id: number): Promise<Marca> {
    const marca = await this.marcasRepo.findOne({ where: { id } });
    if (!marca) throw new NotFoundException('La marca no existe');
    return marca;
  }

  async crear(datos: CrearMarcaDto, nombreImagen?: string): Promise<Marca> {
    // Se valida por nombre normalizado (sin importar mayusculas/minusculas
    // ni espacios al inicio/final) antes de guardar, para poder devolver un
    // mensaje claro en vez del error crudo de MySQL. La columna ya tiene un
    // indice UNIQUE como segunda proteccion (ver guardar()).
    if (await this.existeConMismoNombre(datos.nombre)) {
      throw new ConflictException('Ya existe una marca con ese nombre');
    }

    const marca = this.marcasRepo.create({
      ...datos,
      nombre: datos.nombre.trim(),
      imagen: nombreImagen,
    });
    return this.guardar(marca);
  }

  async actualizar(id: number, datos: ActualizarMarcaDto, nombreImagen?: string): Promise<Marca> {
    const marca = await this.obtener(id);

    // Solo se rechaza si el nombre pertenece a OTRA marca: la propia marca
    // puede conservar su nombre actual sin problema.
    if (datos.nombre !== undefined && (await this.existeConMismoNombre(datos.nombre, id))) {
      throw new ConflictException('Ya existe una marca con ese nombre');
    }

    if (nombreImagen) {
      if (marca.imagen) await this.borrarArchivoImagen(marca.imagen);
      marca.imagen = nombreImagen;
    }

    Object.assign(marca, {
      nombre: datos.nombre !== undefined ? datos.nombre.trim() : marca.nombre,
      descripcion: datos.descripcion ?? marca.descripcion,
      activa: datos.activa ?? marca.activa,
    });

    return this.guardar(marca);
  }

  // Compara ignorando mayusculas/minusculas y espacios al inicio/final, para
  // que "Royal Canin", "royal canin" y " ROYAL CANIN " se consideren el
  // mismo nombre. idAExcluir se usa en actualizar() para que un registro no
  // choque contra si mismo.
  private async existeConMismoNombre(nombre: string, idAExcluir?: number): Promise<boolean> {
    const query = this.marcasRepo
      .createQueryBuilder('marca')
      .where('LOWER(TRIM(marca.nombre)) = LOWER(TRIM(:nombre))', { nombre });
    if (idAExcluir !== undefined) {
      query.andWhere('marca.id != :id', { id: idAExcluir });
    }
    return (await query.getCount()) > 0;
  }

  // Ultima linea de defensa: si por una condicion de carrera dos pedidos
  // pasan la validacion anterior casi al mismo tiempo, el indice UNIQUE de
  // la base rechaza el segundo insert/update. Se convierte especificamente
  // ese error (MySQL ER_DUP_ENTRY) en un mensaje amigable; cualquier otro
  // error se relanza tal cual para no ocultar fallas reales.
  private async guardar(marca: Marca): Promise<Marca> {
    try {
      return await this.marcasRepo.save(marca);
    } catch (error) {
      if (error instanceof QueryFailedError && (error as any).driverError?.code === 'ER_DUP_ENTRY') {
        throw new ConflictException('Ya existe una marca con ese nombre');
      }
      throw error;
    }
  }

  // Regla analoga a la de categorias: no se puede eliminar una marca que
  // tenga productos activos asociados.
  async eliminar(id: number): Promise<{ mensaje: string }> {
    const marca = await this.obtener(id);

    const productosActivos = await this.productosRepo.count({
      where: { marcaId: id, activo: true },
    });

    if (productosActivos > 0) {
      throw new ConflictException(
        `No se puede eliminar "${marca.nombre}": tiene ${productosActivos} producto(s) activo(s) asociado(s)`,
      );
    }

    // Si la marca tiene productos dados de baja (inactivos), tampoco se
    // puede borrar fisicamente: la clave foranea de esos productos lo
    // impediria. En ese caso se la desactiva en vez de eliminarla.
    const productosTotales = await this.productosRepo.count({ where: { marcaId: id } });
    if (productosTotales > 0) {
      marca.activa = false;
      await this.marcasRepo.save(marca);
      return { mensaje: `Marca "${marca.nombre}" dada de baja (conserva productos historicos)` };
    }

    if (marca.imagen) await this.borrarArchivoImagen(marca.imagen);
    await this.marcasRepo.remove(marca);
    return { mensaje: `Marca "${marca.nombre}" eliminada` };
  }

  private async borrarArchivoImagen(nombreArchivo: string): Promise<void> {
    try {
      await unlink(join(process.cwd(), 'uploads', 'marcas', nombreArchivo));
    } catch {
      // Si el archivo ya no esta, no es un error grave: se ignora.
    }
  }
}
