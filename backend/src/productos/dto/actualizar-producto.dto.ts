import { PartialType } from '@nestjs/mapped-types';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { CrearProductoDto } from './crear-producto.dto';

export class ActualizarProductoDto extends PartialType(CrearProductoDto) {
  // Este DTO tambien se manda como multipart/form-data (por la imagen), asi
  // que "activo" puede llegar como el string "true"/"false" en vez de un
  // booleano real. @Type(() => Boolean) no sirve aca: Boolean("false") da
  // true en JS. Se convierte a mano solo cuando llega como string.
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value === 'true' : value))
  @IsBoolean({ message: 'El estado debe ser verdadero o falso' })
  activo?: boolean;
}
