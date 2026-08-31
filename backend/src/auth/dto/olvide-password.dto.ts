import { IsEmail } from 'class-validator';

export class OlvidePasswordDto {
  @IsEmail({}, { message: 'El email no tiene un formato valido' })
  email!: string;
}
