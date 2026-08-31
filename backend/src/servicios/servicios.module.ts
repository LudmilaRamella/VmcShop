import { Module } from '@nestjs/common';
import { ServiciosController } from './servicios.controller';
import { ServiciosService } from './servicios.service';
import { MailService } from '../common/mail/mail.service';
import { UsuariosModule } from '../usuarios/usuarios.module';

// Sin Entity ni Repository propios a proposito: esta primera version de
// Servicios/Solicitud de turno es intencionalmente provisoria, no reserva
// ni bloquea horarios y no persiste nada en base de datos, solo envia
// mails via MailService (ver ServiciosService). Se importa UsuariosModule
// para reutilizar el Repository/Entity de Usuario y resolver los
// destinatarios admin dinamicamente, en vez de duplicar esa consulta aca.
// El dia que se implemente un turnero real con agenda y disponibilidad,
// este modulo es el que se reemplaza por un TurnosModule con persistencia,
// sin tocar la vista de Servicios del frontend (que ya separa datos del
// formulario, envio y UI).
@Module({
  imports: [UsuariosModule],
  controllers: [ServiciosController],
  providers: [ServiciosService, MailService],
})
export class ServiciosModule {}
