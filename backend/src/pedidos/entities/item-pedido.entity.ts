import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Column } from 'typeorm';
import { Pedido } from './pedido.entity';
import { Producto } from '../../productos/entities/producto.entity';

// Entidad ItemPedido: una linea de una compra ya confirmada.
//
// Es la pieza clave de la trazabilidad del sistema: "nombreProducto" y
// "precioUnitario" quedan CONGELADOS con los valores que tenia el producto
// al momento de la venta. Si despues el producto cambia de nombre, sube de
// precio o se da de baja, este comprobante sigue mostrando exactamente lo
// que el cliente vio y pago ese dia.
@Entity('items_pedido')
export class ItemPedido {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Pedido, (pedido) => pedido.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pedido_id' })
  pedido!: Pedido;

  @Column({ name: 'pedido_id' })
  pedidoId!: number;

  // Se conserva la referencia al producto para poder armar reportes como
  // "productos mas vendidos", aunque el comprobante no dependa de ella.
  @ManyToOne(() => Producto)
  @JoinColumn({ name: 'producto_id' })
  producto!: Producto;

  @Column({ name: 'producto_id' })
  productoId!: number;

  @Column({ name: 'nombre_producto', length: 120 })
  nombreProducto!: string;

  @Column()
  cantidad!: number;

  @Column({ name: 'precio_unitario', type: 'decimal', precision: 10, scale: 2 })
  precioUnitario!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  descuento!: number;

  // subtotal = precioUnitario * cantidad - descuento (ya calculado y guardado)
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  subtotal!: number;
}
