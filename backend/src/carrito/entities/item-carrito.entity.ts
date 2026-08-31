import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Column } from 'typeorm';
import { Carrito } from './carrito.entity';
import { Producto } from '../../productos/entities/producto.entity';

// Entidad ItemCarrito: es la tabla intermedia que resuelve la relacion N a M
// entre Carrito y Producto. Ademas de la relacion, guarda la cantidad
// elegida y el precio que tenia el producto cuando se agrego.
//
// Ese precio guardado ("precioUnitario") NO es el que se le termina
// cobrando al cliente: cada vez que se consulta el carrito, se compara
// contra el precio actual del producto y se actualiza si cambio (ver
// CarritoService.verCarrito). El precio realmente definitivo recien se
// congela en ItemPedido, al confirmar la compra.
@Entity('items_carrito')
export class ItemCarrito {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Carrito, (carrito) => carrito.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'carrito_id' })
  carrito!: Carrito;

  @Column({ name: 'carrito_id' })
  carritoId!: number;

  @ManyToOne(() => Producto, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'producto_id' })
  producto!: Producto;

  @Column({ name: 'producto_id' })
  productoId!: number;

  @Column({ default: 1 })
  cantidad!: number;

  @Column({ name: 'precio_unitario', type: 'decimal', precision: 10, scale: 2 })
  precioUnitario!: number;
}
