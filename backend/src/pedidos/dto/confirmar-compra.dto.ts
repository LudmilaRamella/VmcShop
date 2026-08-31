import { IsOptional } from 'class-validator';

export class ConfirmarCompraDto {
  @IsOptional()
  observaciones?: string;
}
