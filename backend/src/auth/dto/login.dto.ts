import { IsEmail, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'El email no tiene un formato valido' })
  email!: string;

  @IsNotEmpty({ message: 'La password es obligatoria' })
  password!: string;
}
