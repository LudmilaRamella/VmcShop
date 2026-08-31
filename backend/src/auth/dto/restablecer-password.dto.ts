import { IsNotEmpty, MinLength } from 'class-validator';

export class RestablecerPasswordDto {
  @IsNotEmpty({ message: 'El token es obligatorio' })
  token!: string;

  @MinLength(8, { message: 'La password debe tener al menos 8 caracteres' })
  password!: string;
}
