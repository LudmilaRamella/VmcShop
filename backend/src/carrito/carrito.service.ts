import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Carrito } from './entities/carrito.entity';
import { ItemCarrito } from './entities/item-carrito.entity';
import { Producto } from '../productos/entities/producto.entity';
import { PromocionesService } from '../promociones/promociones.service';
import { calcularTotales } from '../common/calculo-totales';

@Injectable()
export class CarritoService {
  constructor(
    @InjectRepository(Carrito)
    private readonly carritosRepo: Repository<Carrito>,
    @InjectRepository(ItemCarrito)
    private readonly itemsRepo: Repository<ItemCarrito>,
    @InjectRepository(Producto)
    private readonly productosRepo: Repository<Producto>,
    private readonly promocionesService: PromocionesService,
    private readonly config: ConfigService,
  ) {}

  // Cada usuario tiene un unico carrito (relacion 1 a 1). Si todavia no
  // tiene uno, se le crea la primera vez que lo necesita.
  async obtenerOCrearCarrito(usuarioId: number): Promise<Carrito> {
    const carrito = await this.carritosRepo.findOne({ where: { usuarioId } });
    if (carrito) return carrito;

    try {
      return await this.carritosRepo.save(this.carritosRepo.create({ usuarioId }));
    } catch (error) {
      // Ventana de carrera: si dos pedidos del mismo usuario (ej. dos
      // pestañas) piden el carrito casi al mismo tiempo, el indice UNIQUE de
      // usuario_id puede rechazar el segundo insert. No es un error real
      // para el usuario, asi que se recupera el carrito que gano la carrera
      // en vez de mostrarle un error.
      if (error instanceof QueryFailedError && (error as any).driverError?.code === 'ER_DUP_ENTRY') {
        const carritoExistente = await this.carritosRepo.findOne({ where: { usuarioId } });
        if (carritoExistente) return carritoExistente;
      }
      throw error;
    }
  }

  // Trae el carrito, lo sincroniza con el catalogo actual (productos dados
  // de baja, sin stock, o con el precio cambiado) y devuelve el detalle con
  // los totales ya calculados. Los "avisos" son los mensajes que el
  // frontend le muestra al cliente cuando algo se ajusto automaticamente.
  async verCarrito(usuarioId: number) {
    const carrito = await this.obtenerOCrearCarrito(usuarioId);
    const avisos: string[] = [];

    const items = await this.itemsRepo.find({
      where: { carritoId: carrito.id },
      relations: { producto: { categoria: true } },
    });

    const itemsVigentes: ItemCarrito[] = [];

    for (const item of items) {
      const producto = item.producto;

      if (!producto || !producto.activo) {
        avisos.push(`"${producto?.nombre ?? 'Un producto'}" ya no esta disponible y se quito del carrito`);
        await this.itemsRepo.remove(item);
        continue;
      }

      if (producto.stock === 0) {
        avisos.push(`"${producto.nombre}" se quedo sin stock y se quito del carrito`);
        await this.itemsRepo.remove(item);
        continue;
      }

      if (item.cantidad > producto.stock) {
        avisos.push(`Se ajusto "${producto.nombre}" a ${producto.stock} unidades por falta de stock`);
        item.cantidad = producto.stock;
        await this.itemsRepo.save(item);
      }

      if (Number(item.precioUnitario) !== Number(producto.precio)) {
        avisos.push(`El precio de "${producto.nombre}" cambio a $${producto.precio}`);
        item.precioUnitario = producto.precio;
        await this.itemsRepo.save(item);
      }

      itemsVigentes.push(item);
    }

    const promocionesProducto = await this.promocionesService.promocionesDeProductoVigentes();
    const promocionesGlobales = await this.promocionesService.promocionesGlobalesVigentes();
    const ivaRate = Number(this.config.get('IVA'));

    const totales = calcularTotales(
      itemsVigentes.map((item) => ({
        productoId: item.productoId,
        nombre: item.producto.nombre,
        cantidad: item.cantidad,
        precioUnitario: Number(item.precioUnitario),
        promociones: promocionesProducto.filter((promo) =>
          promo.productos.some((p) => p.id === item.productoId),
        ),
      })),
      promocionesGlobales,
      ivaRate,
    );

    return {
      carritoId: carrito.id,
      items: itemsVigentes.map((item, indice) => ({
        id: item.id,
        producto: {
          id: item.producto.id,
          nombre: item.producto.nombre,
          imagen: item.producto.imagen,
          stock: item.producto.stock,
          categoria: item.producto.categoria?.nombre,
        },
        ...totales.lineas[indice],
      })),
      totales,
      avisos,
    };
  }

  // Agrega un producto o suma unidades si ya estaba en el carrito.
  // Se valida la cantidad TOTAL resultante contra el stock, no solo la que
  // se agrega, para no permitir armar un carrito mas grande que el stock
  // real sumando de a poco.
  async agregarItem(usuarioId: number, productoId: number, cantidad: number) {
    const producto = await this.productosRepo.findOne({ where: { id: productoId } });
    if (!producto || !producto.activo) {
      throw new NotFoundException('El producto no existe o no esta disponible');
    }

    const carrito = await this.obtenerOCrearCarrito(usuarioId);

    let item = await this.itemsRepo.findOne({
      where: { carritoId: carrito.id, productoId },
    });

    const cantidadFinal = (item?.cantidad ?? 0) + cantidad;

    if (cantidadFinal > producto.stock) {
      throw new ConflictException(
        `Solo hay ${producto.stock} unidades disponibles de "${producto.nombre}"`,
      );
    }

    if (item) {
      item.cantidad = cantidadFinal;
      item.precioUnitario = producto.precio;
    } else {
      item = this.itemsRepo.create({
        carritoId: carrito.id,
        productoId,
        cantidad: cantidadFinal,
        precioUnitario: producto.precio,
      });
    }
    await this.itemsRepo.save(item);

    return this.verCarrito(usuarioId);
  }

  // Fija la cantidad exacta de un item. Cantidad 0 elimina la linea.
  async actualizarCantidad(usuarioId: number, itemId: number, cantidad: number) {
    const carrito = await this.obtenerOCrearCarrito(usuarioId);

    // El filtro por carritoId es lo que garantiza que un usuario no pueda
    // tocar un item que pertenece al carrito de otro pasando cualquier id.
    const item = await this.itemsRepo.findOne({
      where: { id: itemId, carritoId: carrito.id },
      relations: { producto: true },
    });
    if (!item) throw new NotFoundException('El item no existe en tu carrito');

    if (cantidad === 0) {
      await this.itemsRepo.remove(item);
      return this.verCarrito(usuarioId);
    }

    if (cantidad > item.producto.stock) {
      throw new ConflictException(
        `Solo hay ${item.producto.stock} unidades disponibles de "${item.producto.nombre}"`,
      );
    }

    item.cantidad = cantidad;
    await this.itemsRepo.save(item);

    return this.verCarrito(usuarioId);
  }

  async eliminarItem(usuarioId: number, itemId: number) {
    const carrito = await this.obtenerOCrearCarrito(usuarioId);
    const resultado = await this.itemsRepo.delete({ id: itemId, carritoId: carrito.id });

    if (resultado.affected === 0) {
      throw new NotFoundException('El item no existe en tu carrito');
    }
    return this.verCarrito(usuarioId);
  }
}
