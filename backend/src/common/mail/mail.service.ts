import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

// Servicio de envio de mails por SMTP. Se usa un unico transporter para
// toda la app, creado a partir de las variables SMTP_* del .env (ver
// .env.example). Si esas variables no estan completas, el transporter no se
// crea y los mails se registran en el log en vez de tirar la app abajo.
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null;
  private readonly remitente: string;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST');
    const puerto = this.config.get<string>('SMTP_PORT');
    const usuario = this.config.get<string>('SMTP_USER');
    const password = this.config.get<string>('SMTP_PASSWORD');

    this.remitente =
      this.config.get<string>('SMTP_FROM') || usuario || 'no-reply@vmcshop.com';

    if (host && puerto && usuario && password) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(puerto),
        secure: this.config.get<string>('SMTP_SECURE') === 'true',
        auth: { user: usuario, pass: password },
      });
    } else {
      this.transporter = null;
      this.logger.warn(
        'Variables SMTP_* incompletas en el .env: los mails no se van a enviar, solo se van a loguear.',
      );
    }
  }

  // Devuelve si el mail se pudo enviar (o simular, si SMTP no esta
  // configurado). El envio es un efecto secundario best-effort de
  // operaciones que ya hicieron su trabajo principal (crear la cuenta,
  // generar el token de recuperacion, etc.): si el proveedor de correo
  // rechaza el mensaje o falla la conexion, no tiene sentido que ese error
  // tire abajo toda la operacion como un 500. Se loguea el detalle interno
  // (para poder diagnosticarlo) y se devuelve false para que quien llamo
  // decida como comunicarselo al usuario sin expresar detalles de SMTP.
  async enviar(
    destinatario: string,
    asunto: string,
    html: string,
  ): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn(
        `SMTP no configurado. Mail para ${destinatario} (${asunto}) no enviado.`,
      );
      return false;
    }

    try {
      await this.transporter.sendMail({
        from: this.remitente,
        to: destinatario,
        subject: asunto,
        html,
      });
      return true;
    } catch (error) {
      this.logger.error(`No se pudo enviar el mail a ${destinatario} (${asunto})`, error as Error);
      return false;
    }
  }
}
