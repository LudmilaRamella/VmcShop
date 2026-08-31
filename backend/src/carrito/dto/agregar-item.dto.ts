import { IsInt, IsPositive } from 'class-validator';

export class AgregarItemDto {
  @IsInt({ message: 'Debes indicar un producto valido' })
  productoId!: number;

  @IsInt()
  @IsPositive({ message: 'La cantidad debe ser al menos 1' })
  cantidad!: number;
}
