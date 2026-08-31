import { Entity, PrimaryGeneratedColumn, OneToOne, JoinColumn, Column, OneToMany } from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { ItemCarrito } from './item-carrito.entity';

// Entidad Carrito: espacio de compra temporal de un cliente. Es MUTABLE
// (se agregan, cambian y quitan productos libremente) y se vacia cuando la
// compra se confirma y pasa a ser un Pedido, que ya es historico e
// inmutable.
@Entity('carritos')
export class Carrito {
  @PrimaryGeneratedColumn()
  id!: number;

  // unique: true en la FK es lo que impone la relacion 1 a 1: cada usuario
  // tiene un unico carrito.
  @OneToOne(() => Usuario, (usuario) => usuario.carrito)
  @JoinColumn({ name: 'usuario_id' })
  usuario!: Usuario;

  @Column({ name: 'usuario_id', unique: true })
  usuarioId!: number;

  @OneToMany(() => ItemCarrito, (item) => item.carrito, { cascade: true })
  items!: ItemCarrito[];
}
