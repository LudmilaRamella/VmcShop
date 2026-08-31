import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Producto } from '../../productos/entities/producto.entity';

// Entidad Marca: fabricante/marca comercial que se le puede asignar a un
// producto (ej. Royal Canin, Purina, Whiskas).
@Entity('marcas')
export class Marca {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 60, unique: true })
  nombre!: string;

  @Column({ length: 255, nullable: true })
  descripcion!: string;

  // Logo de la marca, guardado en uploads/marcas/. Se usa en el carrusel
  // de marcas del home y en el formulario de productos.
  @Column({ nullable: true })
  imagen!: string;

  // Baja logica. No se puede eliminar fisicamente una marca con productos
  // activos asociados (ver MarcasService.eliminar), asi que en su lugar se
  // la desactiva.
  @Column({ default: true })
  activa!: boolean;

  @OneToMany(() => Producto, (producto) => producto.marca)
  productos!: Producto[];
}
