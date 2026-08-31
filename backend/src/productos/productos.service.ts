import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { Producto } from './entities/producto.entity';
import { Categoria } from '../categorias/entities/categoria.entity';
import { Marca } from '../marcas/entities/marca.entity';
import { ItemCarrito } from '../carrito/entities/item-carrito.entity';
import { CrearProductoDto } from './dto/crear-producto.dto';
import { ActualizarProductoDto } from './dto/actualizar-producto.dto';
import { AlcancePromocion } from '../promociones/entities/promocion.entity';
import { calcularPrecioConDescuento } from '../common/calculo-totales';
import { RealtimeGateway } from '../realtime/realtime.gateway';

export type OrdenCatalogo = 'nombre' | 'nombre_desc' | 'precio_asc' | 'precio_desc';

export interface ResultadoCatalogo {
  items: Producto[];
  total: number;
  pagina: number;
  totalPaginas: number;
}

@Injectable()
export class ProductosService {
  constructor(
    @InjectRepository(Producto)
    private readonly productosRepo: Repository<Producto>,
    @InjectRepository(Categoria)
    private readonly categoriasRepo: Repository<Categoria>,
    @InjectRepository(Marca)
    private readonly marcasRepo: Repository<Marca>,
    @InjectRepository(ItemCarrito)
    private readonly itemsCarritoRepo: Repository<ItemCarrito>,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  // Listado del catalogo, con paginado, orden y calculo de promociones
  // vigentes por producto. filtros.categoriaId y filtros.buscar son
  // opcionales y se usan desde la pantalla publica del catalogo.
  async listar(filtros: {
    categoriaId?: number;
    marcaId?: number;
    buscar?: string;
    soloActivos?: boolean;
    pagina?: number;
    limite?: number;
    orden?: OrdenCatalogo;
  }): Promise<ResultadoCatalogo> {
    const where: any = {};
    if (filtros.categoriaId) where.categoriaId = filtros.categoriaId;
    if (filtros.marcaId) where.marcaId = filtros.marcaId;
    if (filtros.buscar) where.nombre = Like(`%${filtros.buscar}%`);
    if (filtros.soloActivos) where.activo = true;

    const pagina = Math.max(1, filtros.pagina ?? 1);
    const limite = Math.min(60, Math.max(1, filtros.limite ?? 12));

    // El orden por precio se hace sobre el precio de LISTA (sin descuento):
    // ordenar por el precio ya rebajado obligaria a traer todo a memoria y
    // ordenar ahi, porque el descuento se calcula recien despues de leer las
    // promociones. Para el volumen de un catalogo de pet shop la diferencia
    // es minima y no vale la complejidad extra.
    const ordenSql: Record<OrdenCatalogo, Record<string, 'ASC' | 'DESC'>> = {
      nombre: { nombre: 'ASC' },
      nombre_desc: { nombre: 'DESC' },
      precio_asc: { precio: 'ASC' },
      precio_desc: { precio: 'DESC' },
    };

    const [productos, total] = await this.productosRepo.findAndCount({
      where,
      relations: { categoria: true, marca: true, promociones: true },
      order: ordenSql[filtros.orden ?? 'nombre'],
      skip: (pagina - 1) * limite,
      take: limite,
    });

    // Se calcula el precio con descuento de cada producto usando solo sus
    // promociones de alcance 'producto' que esten vigentes hoy.
    const items = productos.map((producto) => {
      const promocionesDeProducto = producto.promociones.filter(
        (p) => p.alcance === AlcancePromocion.PRODUCTO,
      );
      const { precioFinal, promocion } = calcularPrecioConDescuento(
        Number(producto.precio),
        promocionesDeProducto,
      );

      // No hace falta mandar la lista completa de promociones al frontend,
      // alcanza con el resultado ya calculado.
      (producto as any).promociones = undefined;
      (producto as any).precioConDescuento = precioFinal;
      (producto as any).promocionAplicada = promocion
        ? { id: promocion.id, nombre: promocion.nombre, tipo: promocion.tipo, valor: Number(promocion.valor) }
        : null;

      return producto;
    });

    return {
      items,
      total,
      pagina,
      totalPaginas: Math.max(1, Math.ceil(total / limite)),
    };
  }

  // Version publica: incluye el calculo de promociones. La usa el
  // controller para mostrarle el producto al cliente.
  async obtener(id: number): Promise<Producto> {
    const producto = await this.buscarPorId(id, { conPromociones: true });

    const promocionesDeProducto = producto.promociones.filter(
      (p) => p.alcance === AlcancePromocion.PRODUCTO,
    );
    const { precioFinal, promocion } = calcularPrecioConDescuento(
      Number(producto.precio),
      promocionesDeProducto,
    );
    (producto as any).promociones = undefined;
    (producto as any).precioConDescuento = precioFinal;
    (producto as any).promocionAplicada = promocion
      ? { id: promocion.id, nombre: promocion.nombre, tipo: promocion.tipo, valor: Number(promocion.valor) }
      : null;

    return producto;
  }

  // Version interna, sin el calculo de promociones: la usan actualizar() y
  // eliminar() para leer y modificar la entidad real. Si se le pegaran los
  // campos calculados (precioConDescuento, promocionAplicada) antes de un
  // save(), quedarian dando vueltas en el objeto sin sentido; separarla
  // evita esa mezcla entre "dato de negocio" y "dato para mostrar".
  private async buscarPorId(
    id: number,
    opciones: { conPromociones?: boolean } = {},
  ): Promise<Producto> {
    const producto = await this.productosRepo.findOne({
      where: { id },
      relations: { categoria: true, marca: true, promociones: !!opciones.conPromociones },
    });
    if (!producto) throw new NotFoundException('El producto no existe');
    return producto;
  }

  async crear(datos: CrearProductoDto, nombreImagen?: string): Promise<Producto> {
    await this.validarCategoria(datos.categoriaId);
    if (datos.marcaId !== undefined) {
      await this.validarMarca(datos.marcaId);
    }

    const producto = this.productosRepo.create({
      ...datos,
      imagen: nombreImagen,
    });
    const guardado = await this.productosRepo.save(producto);
    this.realtimeGateway.emitirCambioProducto(guardado.id);
    return guardado;
  }

  async actualizar(
    id: number,
    datos: ActualizarProductoDto,
    nombreImagen?: string,
  ): Promise<Producto> {
    const producto = await this.buscarPorId(id);

    if (datos.categoriaId !== undefined) {
      await this.validarCategoria(datos.categoriaId);
    }
    if (datos.marcaId !== undefined) {
      await this.validarMarca(datos.marcaId);
    }

    // Si se subio una imagen nueva, se borra la anterior del disco para no
    // dejar archivos huerfanos acumulandose en el servidor.
    if (nombreImagen) {
      if (producto.imagen) await this.borrarArchivoImagen(producto.imagen);
      producto.imagen = nombreImagen;
    }

    Object.assign(producto, {
      nombre: datos.nombre ?? producto.nombre,
      descripcion: datos.descripcion ?? producto.descripcion,
      precio: datos.precio ?? producto.precio,
      stock: datos.stock ?? producto.stock,
      categoriaId: datos.categoriaId ?? producto.categoriaId,
      marcaId: datos.marcaId ?? producto.marcaId,
      activo: datos.activo ?? producto.activo,
    });

    const guardado = await this.productosRepo.save(producto);
    this.realtimeGateway.emitirCambioProducto(guardado.id);
    return guardado;
  }

  // Baja logica. No se borra fisicamente el producto porque podria estar
  // referenciado en pedidos historicos (la clave foranea lo impediria de
  // todas formas). Ademas, se lo quita de cualquier carrito donde estuviera
  // esperando a confirmarse, cumpliendo la regla de "no dejar productos
  // dados de baja en carritos activos".
  async eliminar(id: number): Promise<{ mensaje: string }> {
    const producto = await this.buscarPorId(id);

    producto.activo = false;
    await this.productosRepo.save(producto);

    await this.itemsCarritoRepo.delete({ productoId: id });
    this.realtimeGateway.emitirCambioProducto(id);

    return { mensaje: `Producto "${producto.nombre}" dado de baja` };
  }

  private async validarCategoria(categoriaId: number): Promise<void> {
    const categoria = await this.categoriasRepo.findOne({
      where: { id: categoriaId, activa: true },
    });
    if (!categoria) {
      throw new BadRequestException('La categoria seleccionada no existe o esta dada de baja');
    }
  }

  private async validarMarca(marcaId: number): Promise<void> {
    const marca = await this.marcasRepo.findOne({ where: { id: marcaId, activa: true } });
    if (!marca) {
      throw new BadRequestException('La marca seleccionada no existe o esta dada de baja');
    }
  }

  private async borrarArchivoImagen(nombreArchivo: string): Promise<void> {
    try {
      await unlink(join(process.cwd(), 'uploads', 'productos', nombreArchivo));
    } catch {
      // Si el archivo ya no esta (por ejemplo, se borro a mano), no es un
      // error grave: simplemente se ignora.
    }
  }
}
