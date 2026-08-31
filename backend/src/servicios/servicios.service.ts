import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { MailService } from '../common/mail/mail.service';
import { UsuariosService } from '../usuarios/usuarios.service';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { SolicitarTurnoDto } from './dto/solicitar-turno.dto';
import { nombreEspecie, nombreFranja, nombreServicio } from './servicios.constants';

@Injectable()
export class ServiciosService {
  private readonly logger = new Logger(ServiciosService.name);

  constructor(
    private readonly mailService: MailService,
    private readonly usuariosService: UsuariosService,
  ) {}

  // Solicitud provisoria de turno: no persiste nada (no hay tabla de
  // turnos, ver nota en ServiciosModule), solo manda un mail a los
  // administradores activos y, si eso funciono, uno de confirmacion al
  // cliente.
  //
  // El distingo entre ambos mails es a proposito: como la solicitud no
  // queda guardada en ningun lado, si no le llega a ningun admin la
  // solicitud realmente no llego a destino, asi que se responde error. Si
  // en cambio falla solo la confirmacion al cliente, la solicitud ya esta
  // en manos de VMC: se responde exito igual y el fallo secundario solo se
  // loguea (ver seccion 15 de la consigna original).
  async solicitarTurno(usuario: Usuario, datos: SolicitarTurnoDto): Promise<{ mensaje: string }> {
    this.validarFechaPreferida(datos.fechaPreferida);

    // Destinatarios resueltos dinamicamente contra la tabla de usuarios
    // (rol admin, activos): nunca una direccion fija en el .env ni en el
    // codigo, para que dar de alta/baja un admin alcance para que empiece o
    // deje de recibir estos avisos.
    const emailsAdmin = await this.usuariosService.emailsAdminsActivos();

    if (emailsAdmin.length === 0) {
      this.logger.error(
        'No hay administradores activos con email para recibir solicitudes de turno.',
      );
      throw new BadRequestException(
        'No pudimos enviar tu solicitud en este momento. Intentá nuevamente más tarde.',
      );
    }

    const nombreCompleto = `${usuario.nombre} ${usuario.apellido}`.trim();
    const servicio = nombreServicio(datos.servicio);
    const especie = nombreEspecie(datos.especie);
    const franja = nombreFranja(datos.franjaHoraria);

    const htmlAdmin = `
      <h2>Nueva solicitud de turno</h2>
      <p><strong>Cliente:</strong><br/>
      Nombre: ${nombreCompleto}<br/>
      Email: ${usuario.email}<br/>
      Teléfono: ${datos.telefonoContacto}</p>
      <p><strong>Paciente:</strong><br/>
      Nombre: ${datos.nombrePaciente}<br/>
      Especie: ${especie}</p>
      <p><strong>Servicio:</strong><br/>
      ${servicio}</p>
      <p><strong>Fecha preferida:</strong><br/>
      ${datos.fechaPreferida}</p>
      <p><strong>Franja horaria:</strong><br/>
      ${franja}</p>
      <p><strong>Observaciones:</strong><br/>
      ${datos.comentario || 'Sin observaciones.'}</p>
      <p><em>Solicitud pendiente de coordinación.</em></p>
    `;

    // Un mail por admin (nunca todos en un mismo "to"/"cc") para que no se
    // vean las direcciones de los demas administradores entre si.
    const envios = await Promise.all(
      emailsAdmin.map((email) =>
        this.mailService.enviar(email, `Nueva solicitud de turno - ${servicio}`, htmlAdmin),
      ),
    );
    const enviadoAAlgunAdmin = envios.some(Boolean);

    // Sin persistencia, si no le llego a ningun admin la solicitud
    // realmente no llego a ningun lado: no se le puede decir al cliente que
    // salio bien.
    if (!enviadoAAlgunAdmin) {
      throw new BadRequestException(
        'No pudimos enviar tu solicitud en este momento. Intentá nuevamente más tarde.',
      );
    }

    const enviadoAlCliente = await this.mailService.enviar(
      usuario.email,
      'Recibimos tu solicitud de turno',
      `
        <p>Hola ${usuario.nombre},</p>
        <p>Recibimos tu solicitud para <strong>${servicio}</strong>.</p>
        <p>Fecha preferida: ${datos.fechaPreferida}<br/>
        Franja: ${franja}</p>
        <p>Esto todavía no confirma el turno. El equipo de VMC se comunicará con vos para coordinar disponibilidad.</p>
      `,
    );

    if (!enviadoAlCliente) {
      this.logger.warn(
        `Solicitud de turno enviada a los administradores, pero fallo el mail de confirmacion a ${usuario.email}`,
      );
    }

    return { mensaje: 'Tu solicitud fue enviada. Nos comunicaremos para confirmar disponibilidad.' };
  }

  // No se usa "new Date(fecha)" directo sobre el string YYYY-MM-DD para
  // evitar corrimientos por UTC (ese formato se interpreta como medianoche
  // UTC, que en husos horarios negativos cae en el dia anterior). Se arma
  // la fecha a mano con los componentes locales.
  private validarFechaPreferida(fecha: string): void {
    const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha)!;
    const anio = Number(partes[1]);
    const mes = Number(partes[2]);
    const dia = Number(partes[3]);

    const fechaIngresada = new Date(anio, mes - 1, dia);
    const esFechaCalendarioValida =
      fechaIngresada.getFullYear() === anio &&
      fechaIngresada.getMonth() === mes - 1 &&
      fechaIngresada.getDate() === dia;

    if (!esFechaCalendarioValida) {
      throw new BadRequestException('Seleccioná una fecha válida.');
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    if (fechaIngresada < hoy) {
      throw new BadRequestException('La fecha preferida no puede ser anterior a hoy.');
    }

    // No hay reglas de disponibilidad todavia (ver seccion 7 de la
    // consigna original), asi que para evitar solicitudes inviables de
    // ultimo momento se pide como minimo el dia siguiente.
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);
    if (fechaIngresada < manana) {
      throw new BadRequestException(
        'Elegí una fecha a partir de mañana para que podamos coordinar la solicitud.',
      );
    }
  }
}
