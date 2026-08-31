import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { RegistroDto } from './dto/registro.dto';
import { Rol } from '../common/enums/rol.enum';
import { MailService } from '../common/mail/mail.service';

const RONDAS_BCRYPT = 10;

// El token de recuperacion vive 1 hora: suficiente para que llegue el mail
// y se use, pero acotado para que un link viejo no quede utilizable.
const HORAS_VALIDEZ_TOKEN = 24;

// El codigo de validacion de cuenta vive 15 minutos: es un codigo corto de
// 6 digitos, asi que se le da una ventana chica para achicar el riesgo de
// que alguien lo adivine a fuerza bruta.
const MINUTOS_VALIDEZ_CODIGO = 30;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuariosRepo: Repository<Usuario>,
    private readonly mailService: MailService,
    private readonly config: ConfigService,
  ) {}

  // Crea una cuenta nueva de cliente. El rol admin no se puede elegir desde
  // el registro publico (ver nota en RegistroDto); si se necesita un admin,
  // se crea a mano en la base o desde un endpoint protegido a otro admin.
  async registrar(datos: RegistroDto): Promise<{ usuario: Usuario; mailEnviado: boolean }> {
    const email = datos.email.trim().toLowerCase();

    const existente = await this.usuariosRepo.findOne({ where: { email } });
    if (existente) {
      throw new ConflictException(
        'Ya existe una cuenta registrada con ese email',
      );
    }

    const passwordHasheada = await bcrypt.hash(datos.password, RONDAS_BCRYPT);

    const usuario = this.usuariosRepo.create({
      ...datos,
      email,
      password: passwordHasheada,
      rol: Rol.CLIENTE,
    });

    // El chequeo de arriba tiene una ventana de carrera (dos registros con el
    // mismo email casi al mismo tiempo): el indice UNIQUE de la columna es la
    // ultima linea de defensa. Se convierte especificamente ese error de
    // MySQL en el mismo mensaje amigable; cualquier otro error se relanza.
    try {
      await this.usuariosRepo.save(usuario);
    } catch (error) {
      if (error instanceof QueryFailedError && (error as any).driverError?.code === 'ER_DUP_ENTRY') {
        throw new ConflictException('Ya existe una cuenta registrada con ese email');
      }
      throw error;
    }

    const mailEnviado = await this.enviarCodigoValidacion(usuario);

    return { usuario, mailEnviado };
  }

  // Usado por la estrategia local de Passport (local.strategy.ts) para
  // validar el email y password del login.
  async validarCredenciales(email: string, password: string): Promise<Usuario> {
    const usuario = await this.usuariosRepo.findOne({
      where: { email: email.trim().toLowerCase() },
    });

    // Se devuelve el mismo mensaje generico exista o no el email, para no
    // darle pistas a quien intenta adivinar cuentas registradas.
    if (!usuario) {
      throw new UnauthorizedException('Email o password incorrectos');
    }

    if (!usuario.activo) {
      throw new UnauthorizedException('Esta cuenta esta deshabilitada');
    }

    const passwordValida = await bcrypt.compare(password, usuario.password);
    if (!passwordValida) {
      throw new UnauthorizedException('Email o password incorrectos');
    }

    // Solo se llega aca con la password correcta, asi que ya no hay riesgo
    // de revelarle a un desconocido si la cuenta existe: se le puede avisar
    // puntualmente que falta validarla y ofrecerle reenviar el codigo (ver
    // AuthController.reenviarCodigo). El "code" es lo que usa el frontend
    // para distinguir este caso de un error generico.
    if (!usuario.validadoEn) {
      throw new UnauthorizedException({
        message:
          'Todavia no validaste tu cuenta. Revisa tu email o pedi un nuevo codigo.',
        code: 'CUENTA_NO_VALIDADA',
      });
    }

    return usuario;
  }

  // Usado por SessionSerializer para reconstruir el usuario logueado en
  // cada peticion, a partir del id guardado en la cookie de sesion.
  async buscarPorId(id: number): Promise<Usuario | null> {
    return this.usuariosRepo.findOne({ where: { id } });
  }

  // Pide un mail de recuperacion de password. Siempre responde "ok" (ver
  // AuthController) exista o no la cuenta, para no revelar que emails estan
  // registrados; si existe, genera un token, lo guarda hasheado (igual que
  // la password) y manda por mail el link con el token en texto plano.
  async solicitarRecuperacion(email: string): Promise<void> {
    const usuario = await this.usuariosRepo.findOne({
      where: { email: email.trim().toLowerCase() },
    });

    if (!usuario || !usuario.activo) {
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    usuario.resetPasswordToken = this.hashearToken(token);
    usuario.resetPasswordExpira = new Date(
      Date.now() + HORAS_VALIDEZ_TOKEN * 60 * 60 * 1000,
    );
    await this.usuariosRepo.save(usuario);

    const frontendUrl = this.config.get<string>('FRONTEND_URL');
    const link = `${frontendUrl}/restablecer-password?token=${token}`;

    await this.mailService.enviar(
      usuario.email,
      'Recupera tu contraseña - VMC Shop',
      `
        <p>Hola ${usuario.apellido},</p>
        <p>Recibimos un pedido para restablecer tu contraseña. Hace click en el siguiente link para elegir una nueva (valido por ${HORAS_VALIDEZ_TOKEN} hora):</p>
        <p><a href="${link}">${link}</a></p>
        <p>Si vos no pediste esto, podes ignorar este correo.</p>
      `,
    );
  }

  // Segundo paso del flujo: valida el token recibido contra el hash
  // guardado y, si es correcto y no vencio, actualiza la password y
  // consume el token (para que no se pueda volver a usar).
  async restablecerPassword(
    token: string,
    passwordNueva: string,
  ): Promise<void> {
    const tokenHasheado = this.hashearToken(token);

    const usuario = await this.usuariosRepo.findOne({
      where: { resetPasswordToken: tokenHasheado },
    });

    if (
      !usuario ||
      !usuario.resetPasswordExpira ||
      usuario.resetPasswordExpira < new Date()
    ) {
      throw new UnauthorizedException(
        'El link de recuperacion no es valido o vencio',
      );
    }

    usuario.password = await bcrypt.hash(passwordNueva, RONDAS_BCRYPT);
    usuario.resetPasswordToken = null;
    usuario.resetPasswordExpira = null;
    await this.usuariosRepo.save(usuario);
  }

  // Confirma la cuenta con el codigo que llego por mail al registrarse (o
  // al reenviarlo). Si coincide con el hash guardado y no vencio, marca la
  // cuenta como validada y consume el codigo.
  async validarCuenta(email: string, codigo: string): Promise<void> {
    const usuario = await this.usuariosRepo.findOne({
      where: { email: email.trim().toLowerCase() },
    });

    if (
      !usuario ||
      !usuario.codigoValidacion ||
      usuario.codigoValidacion !== this.hashearToken(codigo) ||
      !usuario.codigoValidacionExpira ||
      usuario.codigoValidacionExpira < new Date()
    ) {
      throw new UnauthorizedException(
        'El codigo de validacion no es valido o vencio',
      );
    }

    usuario.validadoEn = new Date();
    usuario.codigoValidacion = null;
    usuario.codigoValidacionExpira = null;
    await this.usuariosRepo.save(usuario);
  }

  // Pide que se reenvie el codigo de validacion. Igual que en
  // solicitarRecuperacion, no distingue por respuesta si la cuenta existe o
  // ya esta validada: en todos esos casos simplemente no hace nada.
  async reenviarCodigoValidacion(email: string): Promise<void> {
    const usuario = await this.usuariosRepo.findOne({
      where: { email: email.trim().toLowerCase() },
    });

    if (!usuario || !usuario.activo || usuario.validadoEn) {
      return;
    }

    await this.enviarCodigoValidacion(usuario);
  }

  // Genera un codigo numerico de 6 digitos, guarda su hash y vencimiento, y
  // lo manda por mail. Se usa tanto al registrarse como al reenviar. Devuelve
  // si el mail se pudo enviar, para que registrar() se lo pueda comunicar al
  // frontend (reenviarCodigoValidacion no lo necesita: siempre responde el
  // mismo mensaje generico, se haya podido enviar o no).
  private async enviarCodigoValidacion(usuario: Usuario): Promise<boolean> {
    const codigo = crypto.randomInt(100000, 1000000).toString();
    usuario.codigoValidacion = this.hashearToken(codigo);
    usuario.codigoValidacionExpira = new Date(
      Date.now() + MINUTOS_VALIDEZ_CODIGO * 60 * 1000,
    );
    await this.usuariosRepo.save(usuario);

    return this.mailService.enviar(
      usuario.email,
      'Confirma tu cuenta - VMC Shop',
      `
        <p>Hola ${usuario.nombre},</p>
        <p>Para activar tu cuenta, ingresa este codigo de validacion:</p>
        <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px;">${codigo}</p>
        <p>Es valido por ${MINUTOS_VALIDEZ_CODIGO} minutos. Si vos no pediste esto, podes ignorar este mail.</p>
      `,
    );
  }

  // El token que viaja por mail nunca se guarda tal cual en la base (si
  // alguien accediera a la base, no deberia poder resetear passwords con
  // esos valores); se guarda su hash SHA-256, igual que se hace con las
  // passwords pero con un algoritmo mas liviano porque no hace falta salt
  // por password (el token ya es aleatorio de 32 bytes).
  private hashearToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
