import { IsEmail } from 'class-validator';

export class ReenviarCodigoDto {
  @IsEmail({}, { message: 'El email no tiene un formato valido' })
  email!: string;
}
