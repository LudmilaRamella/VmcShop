import { IsEmail, IsNotEmpty, IsOptional, MinLength } from 'class-validator';

// DTO (Data Transfer Object): describe la forma que debe tener el body del
// registro. class-validator revisa estas reglas automaticamente gracias al
// ValidationPipe global configurado en main.ts; si algo no cumple, Nest
// responde 400 antes de que el controller llegue a ejecutarse.
export class RegistroDto {
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  nombre!: string;

  @IsNotEmpty({ message: 'El apellido es obligatorio' })
  apellido!: string;

  @IsEmail({}, { message: 'El email no tiene un formato valido' })
  email!: string;

  // Password segura: minimo 8 caracteres. Se podria pedir tambien numeros y
  // mayusculas, pero para el alcance de este proyecto con el minimo alcanza.
  @MinLength(8, { message: 'La password debe tener al menos 8 caracteres' })
  password!: string;

  @IsOptional()
  telefono?: string;

  @IsOptional()
  direccion?: string;

  // Notese que NO hay un campo "rol" aca: el registro publico siempre crea
  // un cliente. Si se aceptara el rol desde el body, cualquiera podria
  // registrarse como administrador.
}
