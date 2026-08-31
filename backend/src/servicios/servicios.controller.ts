import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ServiciosService } from './servicios.service';
import { SolicitarTurnoDto } from './dto/solicitar-turno.dto';
import { SesionAuthGuard } from '../common/guards/sesion-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Rol } from '../common/enums/rol.enum';
import { UsuarioActual } from '../common/decorators/usuario-actual.decorator';
import { Usuario } from '../usuarios/entities/usuario.entity';

// Servicios veterinarios de VMC: por ahora el unico endpoint es la
// solicitud provisoria de turno (ver ServiciosService). El catalogo de
// servicios en si es estatico en el frontend, asi que no hay un GET aca.
@Controller('servicios')
@UseGuards(SesionAuthGuard)
export class ServiciosController {
  constructor(private readonly serviciosService: ServiciosService) {}

  // Solo clientes: un admin no solicita turnos para si mismo, es quien los
  // recibe y coordina (ver ServiciosService.solicitarTurno, que le manda el
  // mail operativo). RolesGuard ya se apoya en el rol guardado en la
  // sesion (req.user), nunca en algo que mande el frontend.
  @Post('solicitar-turno')
  @UseGuards(RolesGuard)
  @Roles(Rol.CLIENTE)
  solicitarTurno(@Body() datos: SolicitarTurnoDto, @UsuarioActual() usuario: Usuario) {
    return this.serviciosService.solicitarTurno(usuario, datos);
  }
}
