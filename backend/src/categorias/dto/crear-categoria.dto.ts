import { IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class CrearCategoriaDto {
  // Orden de los decoradores: con stopAtFirstError (ver main.ts), el
  // decorador mas cercano a la propiedad es el que se evalua primero. Se
  // pone @IsNotEmpty al final para que, si el campo viene vacio, el mensaje
  // sea "es obligatorio" y no el de MaxLength (que tambien "falla" con un
  // valor vacio, pero es menos preciso en ese caso).
  @MaxLength(60, { message: 'El nombre de la categoria no puede superar los 60 caracteres' })
  @IsNotEmpty({ message: 'El nombre de la categoria es obligatorio' })
  nombre!: string;

  @IsOptional()
  descripcion?: string;
}
