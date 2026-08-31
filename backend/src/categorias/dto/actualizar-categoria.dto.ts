import { PartialType } from '@nestjs/mapped-types';
import { Transform } from 'class-transformer';
import { IsOptional, IsBoolean } from 'class-validator';
import { CrearCategoriaDto } from './crear-categoria.dto';

// PartialType toma CrearCategoriaDto y hace todos sus campos opcionales:
// para actualizar no hace falta mandar nombre y descripcion juntos.
export class ActualizarCategoriaDto extends PartialType(CrearCategoriaDto) {
  // Este DTO tambien se manda como multipart/form-data (por la imagen), asi
  // que "activa" puede llegar como el string "true"/"false" en vez de un
  // booleano real. @Type(() => Boolean) no sirve aca: Boolean("false") da
  // true en JS. Se convierte a mano solo cuando llega como string.
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value === 'true' : value))
  @IsBoolean({ message: 'El estado debe ser verdadero o falso' })
  activa?: boolean;
}
