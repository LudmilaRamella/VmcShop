import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Usuario } from './entities/usuario.entity';
import { ActualizarUsuarioDto } from './dto/actualizar-usuario.dto';
import { Rol } from '../common/enums/rol.enum';

const RONDAS_BCRYPT = 10;

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuariosRepo: Repository<Usuario>,
  ) {}

  // Listado para el panel de administracion. No se muestran las passwords
  // porque la entidad Usuario las marca con @Exclude (class-transformer).
  async listar(): Promise<Usuario[]> {
    return this.usuariosRepo.find({ order: { id: 'ASC' } });
  }

  async obtener(id: number): Promise<Usuario> {
    const usuario = await this.usuariosRepo.findOne({ where: { id } });
    if (!usuario) throw new NotFoundException('El usuario no existe');
    return usuario;
  }

  // Autogestion de perfil (alcance 4). Lo usan tanto el cliente sobre si
  // mismo como el admin sobre cualquier usuario; la decision de quien puede
  // llamar a este metodo la toma el controller con los guards.
  async actualizar(id: number, datos: ActualizarUsuarioDto): Promise<Usuario> {
    const usuario = await this.obtener(id);

    if (datos.nombre !== undefined) usuario.nombre = datos.nombre;
    if (datos.apellido !== undefined) usuario.apellido = datos.apellido;
    if (datos.telefono !== undefined) usuario.telefono = datos.telefono;
    if (datos.direccion !== undefined) usuario.direccion = datos.direccion;

    if (datos.password) {
      usuario.password = await bcrypt.hash(datos.password, RONDAS_BCRYPT);
    }

    return this.usuariosRepo.save(usuario);
  }

  // Baja/alta logica de un usuario, solo para administradores. Se usa baja
  // logica en vez de un DELETE fisico porque un usuario con pedidos
  // historicos no puede eliminarse sin romper esos registros.
  async cambiarEstado(id: number, activo: boolean): Promise<Usuario> {
    const usuario = await this.obtener(id);
    usuario.activo = activo;
    return this.usuariosRepo.save(usuario);
  }

  // Emails de los administradores activos, para avisos operativos (ej. una
  // solicitud de turno en ServiciosService) sin hardcodear ninguna
  // direccion: se resuelve dinamicamente contra la tabla de usuarios, igual
  // que cualquier otra consulta por rol.
  async emailsAdminsActivos(): Promise<string[]> {
    const admins = await this.usuariosRepo.find({
      where: { rol: Rol.ADMIN, activo: true },
    });
    return admins.map((admin) => admin.email).filter((email): email is string => !!email);
  }
}
