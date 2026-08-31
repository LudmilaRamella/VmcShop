import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegistroDto } from './dto/registro.dto';
import { LoginDto } from './dto/login.dto';
import { OlvidePasswordDto } from './dto/olvide-password.dto';
import { RestablecerPasswordDto } from './dto/restablecer-password.dto';
import { ValidarCuentaDto } from './dto/validar-cuenta.dto';
import { ReenviarCodigoDto } from './dto/reenviar-codigo.dto';
import { SesionAuthGuard } from '../common/guards/sesion-auth.guard';
import { UsuarioActual } from '../common/decorators/usuario-actual.decorator';
import { Usuario } from '../usuarios/entities/usuario.entity';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Registro publico. Solo crea clientes (ver RegistroDto y AuthService).
  // La cuenta queda sin validar hasta que se confirme el codigo mandado por
  // mail (ver validarCuenta), asi que el login todavia no va a funcionar.
  @Post('registro')
  async registro(@Body() datos: RegistroDto) {
    const { usuario, mailEnviado } = await this.authService.registrar(datos);

    return {
      id: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
      mailEnviado,
      mensaje: mailEnviado
        ? 'Cuenta creada correctamente. Revisa tu email para validar la cuenta.'
        : 'La cuenta fue creada, pero no pudimos enviar el correo de verificacion. Podes solicitar un nuevo codigo.',
    };
  }

  // Confirma la cuenta con el codigo recibido por mail al registrarse (o al
  // pedir que se reenvie). Recien despues de esto el login deja de rechazar
  // a este usuario.
  @Post('validar-cuenta')
  @HttpCode(200)
  async validarCuenta(@Body() datos: ValidarCuentaDto) {
    await this.authService.validarCuenta(datos.email, datos.codigo);
    return { mensaje: 'Cuenta validada correctamente. Ya podes iniciar sesion.' };
  }

  // Reenvia el codigo de validacion. Responde siempre el mismo mensaje
  // generico, exista la cuenta o no, para no revelar que emails estan
  // registrados (igual criterio que olvide-password).
  @Post('reenviar-codigo')
  @HttpCode(200)
  async reenviarCodigo(@Body() datos: ReenviarCodigoDto) {
    await this.authService.reenviarCodigoValidacion(datos.email);
    return {
      mensaje:
        'Si la cuenta existe y falta validarla, vas a recibir un nuevo codigo por mail',
    };
  }

  // AuthGuard('local') ejecuta LocalStrategy, que valida email/password
  // contra la base y, si son correctas, deja el usuario en req.user.
  //
  // OJO: el guard NO inicia la sesion por si solo, hay que llamar a
  // req.logIn() a mano (es el comportamiento documentado de @nestjs/passport
  // para auth basada en sesion). req.logIn() es lo que hace que Passport
  // guarde el usuario en la sesion y el navegador reciba la cookie.
  //
  // LoginDto solo se usa para que el cliente sepa que body mandar: la
  // validacion real de las credenciales la hace la estrategia.
  @UseGuards(AuthGuard('local'))
  @Post('login')
  @HttpCode(200)
  async login(@Body() _datos: LoginDto, @Req() req: Request) {
    const usuario = req.user as Usuario;

    await new Promise<void>((resolve, reject) => {
      req.logIn(usuario, (error) => (error ? reject(error) : resolve()));
    });

    return {
      id: usuario.id,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      email: usuario.email,
      rol: usuario.rol,
    };
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await new Promise<void>((resolve, reject) => {
      req.logout((error) => {
        if (error) return reject(error);
        req.session.destroy((err) => (err ? reject(err) : resolve()));
      });
    });

    res.clearCookie('connect.sid');
    return { mensaje: 'Sesion cerrada' };
  }

  // Devuelve el usuario logueado. El frontend lo usa al cargar la app para
  // saber si hay una sesion activa y con que rol.
  @UseGuards(SesionAuthGuard)
  @Get('me')
  quienSoy(@UsuarioActual() usuario: Usuario) {
    return {
      id: usuario.id,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      email: usuario.email,
      rol: usuario.rol,
    };
  }

  // Primer paso de "olvide mi password": recibe el email y, si existe una
  // cuenta activa con ese email, le manda un link para restablecerla.
  // Siempre responde el mismo mensaje generico, exista o no la cuenta, para
  // no dejar adivinar que emails estan registrados.
  @Post('olvide-password')
  @HttpCode(200)
  async olvidePassword(@Body() datos: OlvidePasswordDto) {
    await this.authService.solicitarRecuperacion(datos.email);
    return {
      mensaje:
        'Si el email esta registrado, vas a recibir un mail con instrucciones',
    };
  }

  // Segundo paso: recibe el token que llego por mail junto con la password
  // nueva y, si el token es valido y no vencio, la actualiza.
  @Post('restablecer-password')
  @HttpCode(200)
  async restablecerPassword(@Body() datos: RestablecerPasswordDto) {
    await this.authService.restablecerPassword(datos.token, datos.password);
    return { mensaje: 'Password actualizada correctamente' };
  }
}
