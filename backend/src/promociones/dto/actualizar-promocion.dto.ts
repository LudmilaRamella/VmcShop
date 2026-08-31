import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CrearPromocionDto } from './crear-promocion.dto';

export class ActualizarPromocionDto extends PartialType(CrearPromocionDto) {
  @IsOptional()
  @IsBoolean({ message: 'El estado debe ser verdadero o falso' })
  activa?: boolean;
}
