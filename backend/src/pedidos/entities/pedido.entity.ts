import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  CreateDateColumn,
} from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { ItemPedido } from './item-pedido.entity';

export enum EstadoPedido {
  CONFIRMADO = 'confirmado',
  EN_PREPARACION = 'en_preparacion',
  LISTO = 'listo',
  ENTREGADO = 'entregado',
  CANCELADO = 'cancelado',
}

// Entidad Pedido: una compra ya confirmada. A diferencia del carrito, es
// un registro HISTORICO que no deberia modificarse una vez creado (salvo
// para cancelarlo).
//
// Los importes (subtotal, descuento, impuestos, total) se guardan calculados
// en vez de recalcularse cada vez que se consulta el pedido. La razon es que
// si en el futuro cambia el precio de un producto o vence una promocion, el
// comprobante de una compra vieja tiene que seguir mostrando lo que
// realmente se cobro ese dia.
@Entity('pedidos')
export class Pedido {
  @PrimaryGeneratedColumn()
  id!: number;

  // Numero de comprobante mostrable al cliente (distinto del id interno).
  @Column({ length: 20, unique: true })
  numero!: string;

  @ManyToOne(() => Usuario, (usuario) => usuario.pedidos)
  @JoinColumn({ name: 'usuario_id' })
  usuario!: Usuario;

  @Column({ name: 'usuario_id' })
  usuarioId!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  subtotal!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  descuento!: number;

  // Porcion de IVA contenida en el total (los precios ya lo incluyen, por
  // eso este monto es informativo y no se suma al total).
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  impuestos!: number;

  @Column({ name: 'iva_aplicado', type: 'decimal', precision: 5, scale: 4, default: 0.21 })
  ivaAplicado!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  total!: number;

  @Column({ type: 'enum', enum: EstadoPedido, default: EstadoPedido.CONFIRMADO })
  estado!: EstadoPedido;

  @Column({ length: 255, nullable: true })
  observaciones!: string;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn!: Date;

  @OneToMany(() => ItemPedido, (item) => item.pedido, { cascade: true })
  items!: ItemPedido[];
}
