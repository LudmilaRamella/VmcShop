import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { ActualizarUsuarioDto } from './dto/actualizar-usuario.dto';
import { SesionAuthGuard } from '../common/guards/sesion-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UsuarioActual } from '../common/decorators/usuario-actual.decorator';
import { Rol } from '../common/enums/rol.enum';
import { Usuario } from './entities/usuario.entity';

@Controller('usuarios')
@UseGuards(SesionAuthGuard) // toda ruta de este controller exige estar logueado
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  // Listado completo de clientes registrados, exclusivo de administradores.
  @Get()
  @UseGuards(RolesGuard)
  @Roles(Rol.ADMIN)
  listar() {
    return this.usuariosService.listar();
  }

  @Get(':id')
  obtener(@Param('id', ParseIntPipe) id: number, @UsuarioActual() usuarioActual: Usuario) {
    this.verificarAccesoPropioOAdmin(id, usuarioActual);
    return this.usuariosService.obtener(id);
  }

  // Autogestion de perfil: un cliente edita sus propios datos; un admin
  // puede editar los de cualquiera.
  @Patch(':id')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() datos: ActualizarUsuarioDto,
    @UsuarioActual() usuarioActual: Usuario,
  ) {
    this.verificarAccesoPropioOAdmin(id, usuarioActual);
    return this.usuariosService.actualizar(id, datos);
  }

  // Dar de baja/alta a un usuario. Solo administradores.
  @Patch(':id/estado')
  @UseGuards(RolesGuard)
  @Roles(Rol.ADMIN)
  cambiarEstado(@Param('id', ParseIntPipe) id: number, @Body('activo') activo: boolean) {
    return this.usuariosService.cambiarEstado(id, activo);
  }

  // Un admin puede ver/editar a cualquiera; un cliente solo a si mismo.
  private verificarAccesoPropioOAdmin(idSolicitado: number, usuarioActual: Usuario) {
    if (usuarioActual.rol !== Rol.ADMIN && usuarioActual.id !== idSolicitado) {
      throw new ForbiddenException('Solo podes acceder a tu propia informacion');
    }
  }
}
