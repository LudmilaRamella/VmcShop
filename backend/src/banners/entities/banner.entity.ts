import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

// Entidad Banner: imagenes promocionales que el admin sube para mostrar en
// el home. Formato recomendado 1080x1920 (vertical, tipo poster/historia).
// Solo se muestran en pantallas grandes (la decision de ocultarlos en
// mobile es del frontend, no algo que el backend necesite saber).
@Entity('banners')
export class Banner {
  @PrimaryGeneratedColumn()
  id!: number;

  // Nombre del archivo guardado en uploads/banners/.
  @Column()
  imagen!: string;

  // Adonde lleva el banner al hacer click. Puede ser una ruta interna
  // (ej "/catalogo?marcaId=3") o una URL externa completa. Si esta vacio,
  // el banner se muestra pero no es clickeable.
  @Column({ name: 'enlace_url', length: 255, nullable: true })
  enlaceUrl!: string;

  // Orden de aparicion en la fila de banners (menor = mas a la izquierda).
  @Column({ default: 0 })
  orden!: number;

  @Column({ default: true })
  activo!: boolean;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn!: Date;
}
