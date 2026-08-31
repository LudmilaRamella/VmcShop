import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  OneToMany,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Rol } from '../../common/enums/rol.enum';
import { Carrito } from '../../carrito/entities/carrito.entity';
import { Pedido } from '../../pedidos/entities/pedido.entity';

// Entidad Usuario: representa tanto a clientes como a administradores.
// Se usan las dos en la misma tabla porque comparten todos los datos de
// identidad (nombre, email, password) y solo cambian por el campo "rol".
@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 80 })
  nombre!: string;

  @Column({ length: 80 })
  apellido!: string;

  // unique: true crea un indice UNIQUE en la base, que es lo que garantiza
  // que no puedan registrarse dos cuentas con el mismo email.
  @Column({ length: 120, unique: true })
  email!: string;

  // @Exclude hace que este campo no aparezca cuando la entidad se convierte a
  // JSON (ClassSerializerInterceptor). Asi el hash de la password nunca viaja
  // en las respuestas de la API, aunque nos olvidemos de sacarlo a mano.
  @Exclude()
  @Column()
  password!: string;

  @Column({ length: 30, nullable: true })
  telefono!: string;

  @Column({ length: 150, nullable: true })
  direccion!: string;

  @Column({ type: 'enum', enum: Rol, default: Rol.CLIENTE })
  rol!: Rol;

  // Baja logica: en vez de borrar usuarios de la base (lo que rompería sus
  // pedidos historicos), se los marca como inactivos y no pueden loguearse.
  @Column({ default: true })
  activo!: boolean;

  // Recuperacion de password: se guarda el HASH del token (nunca el token en
  // texto plano, igual que la password) y su vencimiento. Se generan de
  // nuevo en cada pedido de recuperacion y se limpian al usarse.
  @Exclude()
  @Column({
    name: 'reset_password_token',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  resetPasswordToken!: string | null;

  @Exclude()
  @Column({ name: 'reset_password_expira', type: 'datetime', nullable: true })
  resetPasswordExpira!: Date | null;

  // Validacion de cuenta por mail: mientras validadoEn sea null, el login
  // se rechaza (ver AuthService.validarCredenciales). Se completa cuando el
  // usuario confirma el codigo mandado al registrarse.
  @Column({ name: 'validado_en', type: 'datetime', nullable: true })
  validadoEn!: Date | null;

  // Igual que con el reset de password, se guarda el HASH del codigo (nunca
  // en texto plano) y su vencimiento. Se regeneran en cada reenvio.
  @Exclude()
  @Column({
    name: 'codigo_validacion',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  codigoValidacion!: string | null;

  @Exclude()
  @Column({
    name: 'codigo_validacion_expira',
    type: 'datetime',
    nullable: true,
  })
  codigoValidacionExpira!: Date | null;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn!: Date;

  // Relacion 1 a 1: cada usuario tiene como maximo un carrito.
  @OneToOne(() => Carrito, (carrito) => carrito.usuario)
  carrito!: Carrito;

  // Relacion 1 a N: un usuario puede tener muchos pedidos confirmados.
  @OneToMany(() => Pedido, (pedido) => pedido.usuario)
  pedidos!: Pedido[];
}
