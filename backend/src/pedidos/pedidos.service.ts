import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, DataSource, EntityManager, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Carrito } from '../carrito/entities/carrito.entity';
import { ItemCarrito } from '../carrito/entities/item-carrito.entity';
import { Producto } from '../productos/entities/producto.entity';
import { Pedido, EstadoPedido } from './entities/pedido.entity';
import { ItemPedido } from './entities/item-pedido.entity';
import { PromocionesService } from '../promociones/promociones.service';
import { calcularTotales } from '../common/calculo-totales';
import { MailService } from '../common/mail/mail.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

// Etiquetas legibles de cada estado, usadas tanto en los mensajes de error
// de transicion invalida como en los mails al cliente.
const ETIQUETAS_ESTADO: Record<EstadoPedido, string> = {
  [EstadoPedido.CONFIRMADO]: 'confirmado',
  [EstadoPedido.EN_PREPARACION]: 'en preparacion',
  [EstadoPedido.LISTO]: 'listo para retirar',
  [EstadoPedido.ENTREGADO]: 'entregado',
  [EstadoPedido.CANCELADO]: 'cancelado',
};

// Circuito interno del pedido despues del checkout. La cancelacion no entra
// en este mapa: se maneja aparte en cancelarPedido() porque tiene su propia
// regla (permitida desde cualquier estado que no sea entregado/cancelado) y
// efectos secundarios propios (reponer stock).
const TRANSICIONES_VALIDAS: Record<EstadoPedido, EstadoPedido[]> = {
  [EstadoPedido.CONFIRMADO]: [EstadoPedido.EN_PREPARACION],
  [EstadoPedido.EN_PREPARACION]: [EstadoPedido.LISTO],
  [EstadoPedido.LISTO]: [EstadoPedido.ENTREGADO],
  [EstadoPedido.ENTREGADO]: [],
  [EstadoPedido.CANCELADO]: [],
};

@Injectable()
export class PedidosService {
  private readonly logger = new Logger(PedidosService.name);

  constructor(
    @InjectRepository(Carrito)
    private readonly carritosRepo: Repository<Carrito>,
    @InjectRepository(ItemCarrito)
    private readonly itemsCarritoRepo: Repository<ItemCarrito>,
    @InjectRepository(Pedido)
    private readonly pedidosRepo: Repository<Pedido>,
    private readonly promocionesService: PromocionesService,
    private readonly config: ConfigService,
    private readonly mailService: MailService,
    private readonly realtimeGateway: RealtimeGateway,
    // DataSource se usa para abrir la transaccion manualmente en
    // confirmarCompra(). Es la unica operacion del sistema que necesita
    // tocar varias tablas (pedidos, items_pedido, productos, items_carrito)
    // de forma atomica.
    private readonly dataSource: DataSource,
  ) {}

  // CONFIRMACION DE COMPRA (alcance 9 del enunciado).
  //
  // Todo lo que pasa aca adentro corre dentro de UNA transaccion: si algo
  // falla en cualquier paso, TypeORM deshace automaticamente todo lo que se
  // hizo hasta ese punto (rollback). Si termina sin errores, se confirma
  // todo junto (commit). No puede quedar un pedido creado sin su descuento
  // de stock, ni un stock descontado sin su pedido.
  async confirmarCompra(usuarioId: number, observaciones?: string) {
    const carrito = await this.carritosRepo.findOne({ where: { usuarioId } });
    const itemsCarrito = carrito
      ? await this.itemsCarritoRepo.find({ where: { carritoId: carrito.id } })
      : [];

    // Regla del enunciado: no se puede procesar un carrito vacio.
    if (!carrito || itemsCarrito.length === 0) {
      throw new BadRequestException('Tu carrito esta vacio');
    }
    const carritoId = carrito.id;

    return this.dataSource.transaction(async (manager) => {
      const resultado = await this.crearPedidoDesdeItems(
        manager,
        usuarioId,
        itemsCarrito.map((item) => ({ productoId: item.productoId, cantidad: item.cantidad })),
        observaciones,
      );

      // El carrito queda vacio despues de confirmar la compra.
      await manager.getRepository(ItemCarrito).delete({ carritoId });

      return resultado;
    });
  }

  // Repetir pedido (desde "Mis pedidos"): crea un pedido NUEVO con los
  // mismos productos y cantidades que uno anterior del cliente. No es una
  // copia de la fila vieja: pasa por la misma validacion de stock/vigencia
  // y recalcula precios y promociones con lo que rige HOY, igual que una
  // confirmacion de compra normal.
  async repetirPedido(pedidoId: number, usuarioId: number) {
    const pedidoOriginal = await this.pedidosRepo.findOne({
      where: { id: pedidoId },
      relations: { items: true },
    });
    if (!pedidoOriginal || pedidoOriginal.usuarioId !== usuarioId) {
      throw new NotFoundException('El pedido no existe');
    }
    if (pedidoOriginal.items.length === 0) {
      throw new BadRequestException('Ese pedido no tiene productos para repetir');
    }

    return this.dataSource.transaction((manager) =>
      this.crearPedidoDesdeItems(
        manager,
        usuarioId,
        pedidoOriginal.items.map((item) => ({ productoId: item.productoId, cantidad: item.cantidad })),
      ),
    );
  }

  // Logica compartida por confirmarCompra() y repetirPedido(): dada una
  // lista de productos+cantidades, valida stock con bloqueo, recalcula
  // totales con precios/promociones vigentes, inserta el pedido y sus
  // items, y descuenta el stock. Debe ejecutarse dentro de una transaccion
  // ya abierta (recibe el EntityManager de esa transaccion).
  private async crearPedidoDesdeItems(
    manager: EntityManager,
    usuarioId: number,
    itemsFuente: { productoId: number; cantidad: number }[],
    observaciones?: string,
  ) {
    const productosRepo = manager.getRepository(Producto);
    const pedidosRepo = manager.getRepository(Pedido);
    const itemsPedidoRepo = manager.getRepository(ItemPedido);

    const idsProductos = itemsFuente.map((item) => item.productoId);

    // SELECT ... FOR UPDATE: bloquea las filas de estos productos hasta
    // que termine la transaccion. Es lo que evita que dos compras
    // simultaneas lean el mismo stock disponible y las dos lo descuenten,
    // dejando el stock en negativo (venta doble de lo mismo).
    const productos = await productosRepo
      .createQueryBuilder('producto')
      .where('producto.id IN (:...ids)', { ids: idsProductos })
      .setLock('pessimistic_write')
      .getMany();

    const productosPorId = new Map(productos.map((p) => [p.id, p]));

    // Se vuelve a validar disponibilidad ya con el bloqueo tomado: entre
    // que el cliente vio el carrito (o el pedido a repetir) y confirmo la
    // compra, el stock pudo haber cambiado.
    for (const item of itemsFuente) {
      const producto = productosPorId.get(item.productoId);
      if (!producto || !producto.activo) {
        throw new ConflictException(`Un producto de tu pedido ya no esta disponible`);
      }
      if (producto.stock < item.cantidad) {
        throw new ConflictException(
          `No hay stock suficiente de "${producto.nombre}" (quedan ${producto.stock})`,
        );
      }
    }

    // Los importes se recalculan desde cero con los precios y promociones
    // VIGENTES en este momento, no con lo que tenia guardado el carrito o
    // el pedido anterior. Asi nadie puede manipular el precio desde el
    // navegador, y una repeticion nunca hereda un precio viejo.
    const promocionesProducto = await this.promocionesService.promocionesDeProductoVigentes();
    const promocionesGlobales = await this.promocionesService.promocionesGlobalesVigentes();
    const ivaRate = Number(this.config.get('IVA'));

    const totales = calcularTotales(
      itemsFuente.map((item) => {
        // Ya se valido arriba que todos los productos existen y estan
        // activos, asi que el "!" es seguro aca.
        const producto = productosPorId.get(item.productoId)!;
        return {
          productoId: producto.id,
          nombre: producto.nombre,
          cantidad: item.cantidad,
          precioUnitario: Number(producto.precio),
          promociones: promocionesProducto.filter((promo) =>
            promo.productos.some((p) => p.id === producto.id),
          ),
        };
      }),
      promocionesGlobales,
      ivaRate,
    );

    // Se crea el pedido con un numero provisorio porque el numero final
    // usa el id, que recien se conoce despues de guardar por primera vez.
    let pedido = pedidosRepo.create({
      numero: `TMP-${Date.now()}`,
      usuarioId,
      subtotal: totales.subtotal,
      descuento: totales.descuentoTotal,
      impuestos: totales.impuestos,
      ivaAplicado: ivaRate,
      total: totales.total,
      estado: EstadoPedido.CONFIRMADO,
      observaciones,
    });
    pedido = await pedidosRepo.save(pedido);

    pedido.numero = `0001-${String(pedido.id).padStart(8, '0')}`;
    await pedidosRepo.save(pedido);

    // Se crean los items del pedido CONGELANDO nombre y precio: si el
    // producto cambia despues, este comprobante no se ve afectado.
    const itemsPedido = totales.lineas.map((linea) =>
      itemsPedidoRepo.create({
        pedidoId: pedido.id,
        productoId: linea.productoId,
        nombreProducto: linea.nombre,
        cantidad: linea.cantidad,
        precioUnitario: linea.precioUnitario,
        descuento: linea.descuento,
        subtotal: linea.subtotal,
      }),
    );
    await itemsPedidoRepo.save(itemsPedido);

    // Actualizacion en cascada del stock: se descuenta lo comprado de
    // cada producto.
    for (const item of itemsFuente) {
      const producto = productosPorId.get(item.productoId)!;
      producto.stock -= item.cantidad;
      await productosRepo.save(producto);
    }

    return { pedido, items: itemsPedido };
  }

  // Cancela un pedido y repone el stock. Tambien va en transaccion: si se
  // repusiera el stock de la mitad de los items y algo fallara despues, el
  // inventario quedaria mal.
  //
  // Permitida desde cualquier estado que no sea ya terminal (entregado o
  // cancelado): un pedido confirmado, en preparacion o incluso ya listo
  // para retirar todavia puede cancelarse porque el producto no salio del
  // negocio. Uno ya cancelado no se vuelve a cancelar.
  async cancelarPedido(pedidoId: number): Promise<Pedido> {
    const pedido = await this.dataSource.transaction(async (manager) => {
      const pedidosRepo = manager.getRepository(Pedido);
      const productosRepo = manager.getRepository(Producto);

      const pedidoActual = await pedidosRepo.findOne({
        where: { id: pedidoId },
        relations: { items: true, usuario: true },
      });
      if (!pedidoActual) throw new NotFoundException('El pedido no existe');
      if (pedidoActual.estado === EstadoPedido.CANCELADO) {
        throw new ConflictException('El pedido ya se encuentra cancelado');
      }
      if (pedidoActual.estado === EstadoPedido.ENTREGADO) {
        throw new ConflictException('No se puede cancelar un pedido ya entregado');
      }

      // El stock se repone UNA sola vez: recien aca, dentro de la misma
      // transaccion que cambia el estado. Si algo de esto falla, TypeORM
      // deshace todo (ni el stock se repuso ni el estado cambio).
      for (const item of pedidoActual.items) {
        await productosRepo.increment({ id: item.productoId }, 'stock', item.cantidad);
      }

      pedidoActual.estado = EstadoPedido.CANCELADO;
      return pedidosRepo.save(pedidoActual);
    });

    // El mail se intenta DESPUES de que la transaccion hizo commit: si se
    // mandara antes y la transaccion fallara, el cliente se enteraria de
    // una cancelacion que nunca se aplico.
    await this.avisarCambioEstado(pedido);
    this.realtimeGateway.emitirCambioPedido(pedido.id);

    return pedido;
  }

  // Avanza el pedido al siguiente paso del circuito interno (confirmado ->
  // en_preparacion -> listo -> entregado). No repone ni descuenta stock: eso
  // ya se resolvio al confirmar la compra o al cancelar.
  async marcarEnPreparacion(pedidoId: number): Promise<Pedido> {
    return this.avanzarEstado(pedidoId, EstadoPedido.EN_PREPARACION);
  }

  async marcarListo(pedidoId: number): Promise<Pedido> {
    return this.avanzarEstado(pedidoId, EstadoPedido.LISTO);
  }

  async marcarEntregado(pedidoId: number): Promise<Pedido> {
    return this.avanzarEstado(pedidoId, EstadoPedido.ENTREGADO);
  }

  // Logica compartida por las tres transiciones de arriba:
  // 1) valida que la transicion pedida tenga sentido para el estado actual
  // 2) persiste el nuevo estado
  // 3) recien despues de guardar con exito, intenta avisar por mail y por
  //    el canal de tiempo real (nunca al reves).
  private async avanzarEstado(pedidoId: number, nuevoEstado: EstadoPedido): Promise<Pedido> {
    const pedido = await this.pedidosRepo.findOne({
      where: { id: pedidoId },
      relations: { usuario: true },
    });
    if (!pedido) throw new NotFoundException('El pedido no existe');

    this.validarTransicion(pedido.estado, nuevoEstado);

    pedido.estado = nuevoEstado;
    const guardado = await this.pedidosRepo.save(pedido);

    await this.avisarCambioEstado(guardado);
    this.realtimeGateway.emitirCambioPedido(guardado.id);

    return guardado;
  }

  // Controla que transicion de estado es valida. Se llama ANTES de guardar
  // nada, asi una transicion invalida nunca llega a tocar la base ni a
  // disparar un mail.
  private validarTransicion(actual: EstadoPedido, nuevo: EstadoPedido): void {
    if (actual === nuevo) {
      throw new ConflictException(
        `El pedido ya se encuentra en estado "${ETIQUETAS_ESTADO[actual]}"`,
      );
    }

    if (actual === EstadoPedido.CANCELADO || actual === EstadoPedido.ENTREGADO) {
      throw new ConflictException(
        `El pedido ${ETIQUETAS_ESTADO[actual]} no puede cambiar de estado`,
      );
    }

    const permitidos = TRANSICIONES_VALIDAS[actual] ?? [];
    if (!permitidos.includes(nuevo)) {
      throw new ConflictException(
        `No se puede cambiar un pedido ${ETIQUETAS_ESTADO[actual]} a ${ETIQUETAS_ESTADO[nuevo]}`,
      );
    }
  }

  // Avisa al cliente por mail que su pedido cambio de estado. Es un efecto
  // secundario best-effort: MailService ya se encarga de loguear el error y
  // devolver false si SMTP falla, en vez de tirar una excepcion. Por eso una
  // falla de SMTP nunca puede revertir ni transformar en 500 un cambio de
  // estado que ya quedo guardado en la base.
  private async avisarCambioEstado(pedido: Pedido): Promise<void> {
    const contenidos: Partial<Record<EstadoPedido, string>> = {
      [EstadoPedido.EN_PREPARACION]: `Tu pedido #${pedido.numero} ya esta siendo preparado.`,
      [EstadoPedido.LISTO]: `Tu pedido #${pedido.numero} esta listo para retirar.`,
      [EstadoPedido.ENTREGADO]: `Tu pedido #${pedido.numero} fue entregado. Gracias por tu compra.`,
      [EstadoPedido.CANCELADO]: `Tu pedido #${pedido.numero} fue cancelado.`,
    };

    // El estado CONFIRMADO no dispara mail desde aca: ese aviso, si existe,
    // lo maneja el flujo de checkout, no el cambio de estado administrativo.
    const mensaje = contenidos[pedido.estado];
    if (!mensaje) return;

    const enviado = await this.mailService.enviar(
      pedido.usuario.email,
      `Pedido #${pedido.numero} ${ETIQUETAS_ESTADO[pedido.estado]} - VMC Shop`,
      `
        <p>Hola ${pedido.usuario.nombre},</p>
        <p>${mensaje}</p>
      `,
    );

    if (!enviado) {
      this.logger.warn(
        `No se pudo avisar por mail el cambio de estado del pedido ${pedido.numero} (usuario ${pedido.usuarioId})`,
      );
    }
  }

  // Listado de pedidos con filtros, usado tanto por el cliente (ve solo los
  // propios) como por el admin (ve todos) desde el controller.
  async listar(filtros: { usuarioId?: number; desde?: string; hasta?: string; estado?: EstadoPedido }) {
    const where: any = {};
    if (filtros.usuarioId) where.usuarioId = filtros.usuarioId;
    if (filtros.estado) where.estado = filtros.estado;
    if (filtros.desde && filtros.hasta) {
      where.creadoEn = Between(new Date(`${filtros.desde}T00:00:00`), new Date(`${filtros.hasta}T23:59:59`));
    }

    return this.pedidosRepo.find({
      where,
      relations: { usuario: true, items: true },
      order: { creadoEn: 'DESC' },
    });
  }

  // Detalle de un pedido, usado como comprobante digital. Si viene
  // usuarioId (lo manda el controller cuando quien pregunta es un cliente),
  // se exige que el pedido sea de ese usuario.
  async obtener(id: number, usuarioId?: number): Promise<Pedido> {
    const pedido = await this.pedidosRepo.findOne({
      where: { id },
      relations: { usuario: true, items: { producto: true } },
    });

    if (!pedido || (usuarioId && pedido.usuarioId !== usuarioId)) {
      throw new NotFoundException('El pedido no existe');
    }

    return pedido;
  }
}
