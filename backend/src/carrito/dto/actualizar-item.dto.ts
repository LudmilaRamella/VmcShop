import { IsInt, Min } from 'class-validator';

export class ActualizarItemDto {
  // 0 esta permitido y significa "eliminar el item".
  @IsInt({ message: 'La cantidad debe ser un numero entero' })
  @Min(0, { message: 'La cantidad no puede ser negativa' })
  cantidad!: number;
}
