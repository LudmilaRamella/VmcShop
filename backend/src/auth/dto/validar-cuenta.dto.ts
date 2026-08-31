import { IsEmail, IsNotEmpty } from 'class-validator';

export class ValidarCuentaDto {
  @IsEmail({}, { message: 'El email no tiene un formato valido' })
  email!: string;

  @IsNotEmpty({ message: 'El codigo de validacion es obligatorio' })
  codigo!: string;
}
