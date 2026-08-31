import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Producto } from '../../productos/entities/producto.entity';

// Entidad Categoria: agrupa los productos del catalogo (alimentos,
// accesorios, medicamentos, juguetes, etc).
@Entity('categorias')
export class Categoria {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 60, unique: true })
  nombre!: string;

  @Column({ length: 255, nullable: true })
  descripcion!: string;

  // Nombre del archivo guardado en uploads/categorias/. Recomendado 500x500
  // para que se vea bien tanto en el catalogo como en el home.
  @Column({ nullable: true })
  imagen!: string;

  // Baja logica. No se puede eliminar fisicamente una categoria con
  // productos asociados (ver CategoriasService.eliminar), asi que en su
  // lugar se la desactiva.
  @Column({ default: true })
  activa!: boolean;

  @OneToMany(() => Producto, (producto) => producto.categoria)
  productos!: Producto[];
}
