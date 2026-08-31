import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { Categoria } from './entities/categoria.entity';
import { Producto } from '../productos/entities/producto.entity';
import { CrearCategoriaDto } from './dto/crear-categoria.dto';
import { ActualizarCategoriaDto } from './dto/actualizar-categoria.dto';

@Injectable()
export class CategoriasService {
  constructor(
    @InjectRepository(Categoria)
    private readonly categoriasRepo: Repository<Categoria>,
    @InjectRepository(Producto)
    private readonly productosRepo: Repository<Producto>,
  ) {}

  async listar(soloActivas = false): Promise<Categoria[]> {
    return this.categoriasRepo.find({
      where: soloActivas ? { activa: true } : {},
      order: { nombre: 'ASC' },
    });
  }

  async obtener(id: number): Promise<Categoria> {
    const categoria = await this.categoriasRepo.findOne({ where: { id } });
    if (!categoria) throw new NotFoundException('La categoria no existe');
    return categoria;
  }

  async crear(datos: CrearCategoriaDto, nombreImagen?: string): Promise<Categoria> {
    // Se valida por nombre normalizado (sin importar mayusculas/minusculas
    // ni espacios al inicio/final) antes de guardar, para poder devolver un
    // mensaje claro en vez del error crudo de MySQL. La columna ya tiene un
    // indice UNIQUE como segunda proteccion (ver guardar()).
    if (await this.existeConMismoNombre(datos.nombre)) {
      throw new ConflictException('Ya existe una categoria con ese nombre');
    }

    const categoria = this.categoriasRepo.create({
      ...datos,
      nombre: datos.nombre.trim(),
      imagen: nombreImagen,
    });
    return this.guardar(categoria);
  }

  async actualizar(
    id: number,
    datos: ActualizarCategoriaDto,
    nombreImagen?: string,
  ): Promise<Categoria> {
    const categoria = await this.obtener(id);

    // Solo se rechaza si el nombre pertenece a OTRA categoria: la propia
    // categoria puede conservar su nombre actual sin problema.
    if (datos.nombre !== undefined && (await this.existeConMismoNombre(datos.nombre, id))) {
      throw new ConflictException('Ya existe una categoria con ese nombre');
    }

    // Si se subio una imagen nueva, se borra la anterior del disco para no
    // dejar archivos huerfanos acumulandose en el servidor.
    if (nombreImagen) {
      if (categoria.imagen) await this.borrarArchivoImagen(categoria.imagen);
      categoria.imagen = nombreImagen;
    }

    Object.assign(categoria, {
      nombre: datos.nombre !== undefined ? datos.nombre.trim() : categoria.nombre,
      descripcion: datos.descripcion ?? categoria.descripcion,
      activa: datos.activa ?? categoria.activa,
    });

    return this.guardar(categoria);
  }

  // Compara ignorando mayusculas/minusculas y espacios al inicio/final, para
  // que "Alimentos", "alimentos" y " ALIMENTOS " se consideren el mismo
  // nombre. idAExcluir se usa en actualizar() para que un registro no
  // choque contra si mismo.
  private async existeConMismoNombre(nombre: string, idAExcluir?: number): Promise<boolean> {
    const query = this.categoriasRepo
      .createQueryBuilder('categoria')
      .where('LOWER(TRIM(categoria.nombre)) = LOWER(TRIM(:nombre))', { nombre });
    if (idAExcluir !== undefined) {
      query.andWhere('categoria.id != :id', { id: idAExcluir });
    }
    return (await query.getCount()) > 0;
  }

  // Ultima linea de defensa: si por una condicion de carrera dos pedidos
  // pasan la validacion anterior casi al mismo tiempo, el indice UNIQUE de
  // la base rechaza el segundo insert/update. Se convierte especificamente
  // ese error (MySQL ER_DUP_ENTRY) en un mensaje amigable; cualquier otro
  // error se relanza tal cual para no ocultar fallas reales.
  private async guardar(categoria: Categoria): Promise<Categoria> {
    try {
      return await this.categoriasRepo.save(categoria);
    } catch (error) {
      if (error instanceof QueryFailedError && (error as any).driverError?.code === 'ER_DUP_ENTRY') {
        throw new ConflictException('Ya existe una categoria con ese nombre');
      }
      throw error;
    }
  }

  // Regla del enunciado: no se puede eliminar una categoria que tenga
  // productos activos asociados.
  async eliminar(id: number): Promise<{ mensaje: string }> {
    const categoria = await this.obtener(id);

    const productosActivos = await this.productosRepo.count({
      where: { categoriaId: id, activo: true },
    });

    if (productosActivos > 0) {
      throw new ConflictException(
        `No se puede eliminar "${categoria.nombre}": tiene ${productosActivos} producto(s) activo(s) asociado(s)`,
      );
    }

    // Si la categoria tiene productos dados de baja (inactivos), tampoco se
    // puede borrar fisicamente: la clave foranea de esos productos lo
    // impediria. En ese caso se la desactiva en vez de eliminarla.
    const productosTotales = await this.productosRepo.count({ where: { categoriaId: id } });
    if (productosTotales > 0) {
      categoria.activa = false;
      await this.categoriasRepo.save(categoria);
      return { mensaje: `Categoria "${categoria.nombre}" dada de baja (conserva productos historicos)` };
    }

    if (categoria.imagen) await this.borrarArchivoImagen(categoria.imagen);
    await this.categoriasRepo.remove(categoria);
    return { mensaje: `Categoria "${categoria.nombre}" eliminada` };
  }

  private async borrarArchivoImagen(nombreArchivo: string): Promise<void> {
    try {
      await unlink(join(process.cwd(), 'uploads', 'categorias', nombreArchivo));
    } catch {
      // Si el archivo ya no esta, no es un error grave: se ignora.
    }
  }
}
