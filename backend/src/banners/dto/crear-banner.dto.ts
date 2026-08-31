import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CrearBannerDto {
  // No es una @IsUrl a proposito: el link puede ser una ruta interna
  // relativa (ej "/catalogo?marcaId=3"), que no es una URL absoluta valida.
  @IsOptional()
  @IsString({ message: 'El enlace debe ser un texto valido' })
  @MaxLength(255, { message: 'El enlace no puede superar los 255 caracteres' })
  enlaceUrl?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El orden debe ser un numero entero' })
  @Min(0, { message: 'El orden no puede ser negativo' })
  orden?: number;
}
