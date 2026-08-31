import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, JoinTable } from 'typeorm';
import { Producto } from '../../productos/entities/producto.entity';

export enum TipoDescuento {
  PORCENTAJE = 'porcentaje',
  MONTO_FIJO = 'monto_fijo',
}

// Una promocion 'producto' se aplica solo a los productos asociados (tabla
// promocion_producto). Una promocion 'global' se aplica sobre el total del
// pedido si se cumplen sus condiciones (monto minimo y/o cantidad minima de
// items).
export enum AlcancePromocion {
  PRODUCTO = 'producto',
  GLOBAL = 'global',
}

// Entidad Promocion: descuentos y ofertas del catalogo.
@Entity('promociones')
export class Promocion {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 100 })
  nombre!: string;

  @Column({ length: 255, nullable: true })
  descripcion!: string;

  @Column({ type: 'enum', enum: TipoDescuento, default: TipoDescuento.PORCENTAJE })
  tipo!: TipoDescuento;

  // Interpretado segun "tipo": si es porcentaje, 10 significa 10%.
  // Si es monto_fijo, 2500 significa $2500 de descuento.
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  valor!: number;

  @Column({ type: 'enum', enum: AlcancePromocion, default: AlcancePromocion.PRODUCTO })
  alcance!: AlcancePromocion;

  // Solo se usan cuando alcance = 'global'.
  @Column({ name: 'monto_minimo', type: 'decimal', precision: 12, scale: 2, nullable: true })
  montoMinimo!: number;

  @Column({ name: 'cantidad_minima', nullable: true })
  cantidadMinima!: number;

  @Column({ name: 'fecha_inicio', type: 'date', nullable: true })
  fechaInicio!: string;

  @Column({ name: 'fecha_fin', type: 'date', nullable: true })
  fechaFin!: string;

  @Column({ default: true })
  activa!: boolean;

  @ManyToMany(() => Producto, (producto) => producto.promociones)
  @JoinTable({
    name: 'promocion_producto',
    joinColumn: { name: 'promocion_id' },
    inverseJoinColumn: { name: 'producto_id' },
  })
  productos!: Producto[];
}
