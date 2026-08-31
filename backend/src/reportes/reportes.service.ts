import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pedido, EstadoPedido } from '../pedidos/entities/pedido.entity';
import { ItemPedido } from '../pedidos/entities/item-pedido.entity';

// Reportes dinamicos para el panel de administracion (alcance 10 del
// enunciado). Todos aceptan filtros de fecha opcionales; si no se mandan,
// se calculan sobre el historico completo.
@Injectable()
export class ReportesService {
  constructor(
    @InjectRepository(Pedido)
    private readonly pedidosRepo: Repository<Pedido>,
    @InjectRepository(ItemPedido)
    private readonly itemsPedidoRepo: Repository<ItemPedido>,
  ) {}

  // Resumen general de ventas: cantidad de pedidos y monto total vendido en
  // el rango de fechas pedido. Cuenta confirmado/en_preparacion/entregado por
  // igual (son la misma venta en distintas etapas de su circuito interno);
  // solo los pedidos cancelados quedan afuera.
  async resumenVentas(desde?: string, hasta?: string) {
    const query = this.pedidosRepo
      .createQueryBuilder('pedido')
      .where('pedido.estado != :estado', { estado: EstadoPedido.CANCELADO });

    if (desde) query.andWhere('pedido.creadoEn >= :desde', { desde: `${desde} 00:00:00` });
    if (hasta) query.andWhere('pedido.creadoEn <= :hasta', { hasta: `${hasta} 23:59:59` });

    const { cantidadPedidos, totalVendido } = await query
      .select('COUNT(pedido.id)', 'cantidadPedidos')
      .addSelect('COALESCE(SUM(pedido.total), 0)', 'totalVendido')
      .getRawOne();

    return {
      cantidadPedidos: Number(cantidadPedidos),
      totalVendido: Number(totalVendido),
    };
  }

  // Ranking de productos mas vendidos, sumando las unidades de todas las
  // lineas de pedidos confirmados. Sirve para que el admin sepa que
  // reponer o que promocionar.
  async productosMasVendidos(desde?: string, hasta?: string, limite = 10) {
    const query = this.itemsPedidoRepo
      .createQueryBuilder('item')
      .innerJoin('item.pedido', 'pedido')
      .where('pedido.estado != :estado', { estado: EstadoPedido.CANCELADO });

    if (desde) query.andWhere('pedido.creadoEn >= :desde', { desde: `${desde} 00:00:00` });
    if (hasta) query.andWhere('pedido.creadoEn <= :hasta', { hasta: `${hasta} 23:59:59` });

    return query
      .select('item.productoId', 'productoId')
      .addSelect('item.nombreProducto', 'nombre')
      .addSelect('SUM(item.cantidad)', 'unidadesVendidas')
      .addSelect('SUM(item.subtotal)', 'totalVendido')
      .groupBy('item.productoId')
      .addGroupBy('item.nombreProducto')
      .orderBy('unidadesVendidas', 'DESC')
      .limit(limite)
      .getRawMany();
  }

  // Clientes frecuentes: cuantos pedidos hizo cada uno y cuanto gasto en
  // total. Ayuda a identificar a los mejores clientes.
  async clientesFrecuentes(desde?: string, hasta?: string, limite = 10) {
    const query = this.pedidosRepo
      .createQueryBuilder('pedido')
      .innerJoin('pedido.usuario', 'usuario')
      .where('pedido.estado != :estado', { estado: EstadoPedido.CANCELADO });

    if (desde) query.andWhere('pedido.creadoEn >= :desde', { desde: `${desde} 00:00:00` });
    if (hasta) query.andWhere('pedido.creadoEn <= :hasta', { hasta: `${hasta} 23:59:59` });

    return query
      .select('usuario.id', 'usuarioId')
      .addSelect("CONCAT(usuario.nombre, ' ', usuario.apellido)", 'nombre')
      .addSelect('usuario.email', 'email')
      .addSelect('COUNT(pedido.id)', 'cantidadPedidos')
      .addSelect('SUM(pedido.total)', 'totalGastado')
      .groupBy('usuario.id')
      .addGroupBy('usuario.nombre')
      .addGroupBy('usuario.apellido')
      .addGroupBy('usuario.email')
      .orderBy('cantidadPedidos', 'DESC')
      .limit(limite)
      .getRawMany();
  }
}
