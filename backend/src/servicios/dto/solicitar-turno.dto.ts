import { IsIn, IsNotEmpty, IsOptional, Matches, MaxLength } from 'class-validator';
import { ESPECIES_VALIDAS, SLUGS_FRANJAS, SLUGS_SERVICIOS } from '../servicios.constants';

// DTO de la solicitud provisoria de turno (ver ServiciosService). No hay
// "usuarioId" ni "email" aca a proposito: esos datos se toman siempre del
// usuario autenticado (@UsuarioActual en el controller), nunca de lo que
// mande el frontend, para que nadie pueda enviar una solicitud a nombre de
// otra cuenta.
export class SolicitarTurnoDto {
  @IsIn(SLUGS_SERVICIOS, { message: 'Seleccioná un servicio.' })
  servicio!: string;

  @MaxLength(60, { message: 'El nombre del paciente es demasiado largo.' })
  @IsNotEmpty({ message: 'Ingresá el nombre del paciente.' })
  nombrePaciente!: string;

  @IsIn(ESPECIES_VALIDAS, { message: 'Seleccioná la especie del paciente.' })
  especie!: string;

  // Formato YYYY-MM-DD, lo que entrega un <input type="date">. Solo se
  // valida el formato aca; que la fecha exista de verdad (ej. rechazar un
  // 31 de febrero) y que no sea pasada lo valida ServiciosService, que
  // necesita comparar contra el dia de hoy en el momento de la peticion.
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Seleccioná una fecha válida.' })
  fechaPreferida!: string;

  @IsIn(SLUGS_FRANJAS, { message: 'Seleccioná una franja horaria.' })
  franjaHoraria!: string;

  @Matches(/^[0-9+\-\s()]{6,20}$/, { message: 'Ingresá un teléfono de contacto válido.' })
  @IsNotEmpty({ message: 'Ingresá un teléfono de contacto.' })
  telefonoContacto!: string;

  @IsOptional()
  @MaxLength(500, { message: 'La observación es demasiado larga.' })
  comentario?: string;
}
