import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  ManyToMany,
  JoinColumn,
} from 'typeorm';
import { Categoria } from '../../categorias/entities/categoria.entity';
import { Marca } from '../../marcas/entities/marca.entity';
import { Promocion } from '../../promociones/entities/promocion.entity';

// Entidad Producto: articulo del catalogo.
//
// El precio se carga CON IVA incluido (precio final al publico, como se ve
// en la gondola de cualquier comercio). El IVA se descuenta hacia atras
// recien al generar el pedido, en PedidosService. Se decidio asi para no
// mostrarle al cliente un precio en el catalogo y cobrarle otro distinto al
// pagar.
@Entity('productos')
export class Producto {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 120 })
  nombre!: string;

  @Column({ type: 'text', nullable: true })
  descripcion!: string;

  // decimal y no float: con numeros de punto flotante, sumar varios precios
  // puede dar resultados con error de centavos (ej. 0.1 + 0.2 !== 0.3).
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  precio!: number;

  @Column({ default: 0 })
  stock!: number;

  // Nombre del archivo guardado por Multer en la carpeta uploads/productos.
  @Column({ nullable: true })
  imagen!: string;

  @ManyToOne(() => Categoria, (categoria) => categoria.productos)
  @JoinColumn({ name: 'categoria_id' })
  categoria!: Categoria;

  @Column({ name: 'categoria_id' })
  categoriaId!: number;

  // Marca es opcional: no todos los productos del catalogo tienen una marca
  // comercial declarada (ej. productos sueltos o de marca propia).
  @ManyToOne(() => Marca, (marca) => marca.productos, { nullable: true })
  @JoinColumn({ name: 'marca_id' })
  marca!: Marca;

  @Column({ name: 'marca_id', nullable: true })
  marcaId!: number;

  // Baja logica. Un producto que ya fue vendido no se puede borrar sin
  // romper el historial de pedidos, asi que se lo desactiva y desaparece
  // del catalogo publico.
  @Column({ default: true })
  activo!: boolean;

  // Relacion N a M con Promocion (promociones que aplican a este producto
  // en particular, distintas de las promociones globales del pedido).
  @ManyToMany(() => Promocion, (promocion) => promocion.productos)
  promociones!: Promocion[];
}
