import { IsOptional, MinLength } from 'class-validator';

// Datos que un usuario (cliente o admin) puede modificar de su propio
// perfil, o que un admin puede modificar de cualquier usuario. No incluye
// "email" (se mantiene fijo para no romper el login) ni "rol" (eso lo
// maneja un endpoint aparte, solo para admins).
export class ActualizarUsuarioDto {
  @IsOptional()
  nombre?: string;

  @IsOptional()
  apellido?: string;

  @IsOptional()
  telefono?: string;

  @IsOptional()
  direccion?: string;

  // Password nueva, opcional: si no se manda, no se toca la actual.
  @IsOptional()
  @MinLength(8, { message: 'La password debe tener al menos 8 caracteres' })
  password?: string;
}
