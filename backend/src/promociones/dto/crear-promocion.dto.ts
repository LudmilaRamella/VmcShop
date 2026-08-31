import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  Min,
} from 'class-validator';
import { AlcancePromocion, TipoDescuento } from '../entities/promocion.entity';

// Nota sobre el orden de los decoradores: con stopAtFirstError (ver
// main.ts), el decorador mas cercano a la propiedad se evalua primero. Por
// eso, en los campos obligatorios con mas de una regla, @IsNotEmpty queda al
// final (para que "es obligatorio" gane cuando el valor viene vacio) y las
// reglas mas especificas (formato, luego rango) quedan arriba.
export class CrearPromocionDto {
  @IsNotEmpty({ message: 'El nombre de la promocion es obligatorio' })
  nombre!: string;

  @IsOptional()
  descripcion?: string;

  @IsEnum(TipoDescuento, { message: 'El tipo de descuento debe ser porcentaje o monto fijo' })
  tipo!: TipoDescuento;

  // El limite de 100% para descuentos porcentuales depende de "tipo" (un
  // monto_fijo si puede superar 100), asi que esa coherencia entre campos se
  // valida en PromocionesService, no aca.
  @Type(() => Number)
  @IsPositive({ message: 'El valor del descuento debe ser mayor a cero' })
  @IsNumber({}, { message: 'El valor del descuento debe ser un numero valido' })
  @IsNotEmpty({ message: 'El valor del descuento es obligatorio' })
  valor!: number;

  @IsEnum(AlcancePromocion, { message: 'El alcance de la promocion debe ser producto o global' })
  alcance!: AlcancePromocion;

  // Solo se usan si alcance = GLOBAL. Que sean opcionales es intencional: una
  // promocion global sin monto ni cantidad minima aplica sin condiciones
  // (ver calcularTotales en common/calculo-totales.ts).
  @IsOptional()
  @Type(() => Number)
  @Min(0, { message: 'El monto minimo no puede ser negativo' })
  @IsNumber({}, { message: 'El monto minimo debe ser un numero valido' })
  montoMinimo?: number;

  @IsOptional()
  @Type(() => Number)
  @Min(1, { message: 'La cantidad minima debe ser al menos 1' })
  @IsInt({ message: 'La cantidad minima debe ser un numero entero' })
  cantidadMinima?: number;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha de inicio no tiene un formato valido' })
  fechaInicio?: string;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha de fin no tiene un formato valido' })
  fechaFin?: string;

  // Solo se usa si alcance = PRODUCTO: ids de los productos a los que
  // aplica. Que la lista no pueda estar vacia en ese caso se valida en
  // PromocionesService (depende del valor de "alcance").
  @IsOptional()
  @Type(() => Number)
  @IsInt({ each: true, message: 'Cada producto debe identificarse con un id valido' })
  @IsArray({ message: 'Los productos de la promocion deben mandarse como una lista' })
  productosIds?: number[];
}
