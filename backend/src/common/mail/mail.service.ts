import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

const RESEND_API_URL = 'https://api.resend.com/emails';

// Servicio de envio de mails. Si esta configurada la API key de Resend
// (RESEND_API_KEY), los mails se mandan por HTTPS contra la API de Resend,
// ya que Render Free bloquea los puertos SMTP salientes. Si no esta
// configurada, se usa SMTP (nodemailer) como en desarrollo local, a partir
// de las variables SMTP_* del .env (ver .env.example). Si ninguna de las
// dos esta configurada, los mails se registran en el log en vez de tirar
// la app abajo.
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null;
  private readonly remitente: string;
  private readonly resendApiKey: string | undefined;

  constructor(private readonly config: ConfigService) {
    this.resendApiKey = this.config.get<string>('RESEND_API_KEY');
    const resendFrom = this.config.get<string>('RESEND_FROM');

    const host = this.config.get<string>('SMTP_HOST');
    const puerto = this.config.get<string>('SMTP_PORT');
    const usuario = this.config.get<string>('SMTP_USER');
    const password = this.config.get<string>('SMTP_PASSWORD');
    const smtpFrom = this.config.get<string>('SMTP_FROM');

    this.remitente =
      (this.resendApiKey ? resendFrom : undefined) ||
      smtpFrom ||
      usuario ||
      'no-reply@vmcshop.com';

    if (this.resendApiKey) {
      this.transporter = null;
    } else if (host && puerto && usuario && password) {
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
    if (this.resendApiKey) {
      return this.enviarPorResend(destinatario, asunto, html);
    }

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

  // Envia el mail via la API HTTPS de Resend (https://resend.com/docs/api-reference/emails/send-email).
  // Se usa fetch nativo (disponible desde Node 18+) para no agregar una
  // dependencia solo para esto.
  private async enviarPorResend(
    destinatario: string,
    asunto: string,
    html: string,
  ): Promise<boolean> {
    try {
      const respuesta = await fetch(RESEND_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.remitente,
          to: destinatario,
          subject: asunto,
          html,
        }),
      });

      if (!respuesta.ok) {
        this.logger.error(
          `No se pudo enviar el mail a ${destinatario} (${asunto}) via Resend: HTTP ${respuesta.status}`,
        );
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(`No se pudo enviar el mail a ${destinatario} (${asunto}) via Resend`, error as Error);
      return false;
    }
  }
}
