import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, Min } from 'class-validator';

// Este DTO se usa con multipart/form-data (por la imagen), asi que todos los
// campos numericos llegan como string y hay que convertirlos con @Type.
export class CrearProductoDto {
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  nombre!: string;

  @IsOptional()
  descripcion?: string;

  // Regla del enunciado: el precio tiene que ser positivo.
  //
  // Orden de los decoradores: con stopAtFirstError (ver main.ts), el
  // decorador mas cercano a la propiedad se evalua primero. @IsNotEmpty va
  // al final para que "es obligatorio" gane si el valor viene vacio, y las
  // reglas de formato (IsNumber) antes que las de rango (IsPositive), para
  // que un valor invalido como "abc" no se reporte como "no es positivo".
  @Type(() => Number)
  @IsPositive({ message: 'El precio debe ser mayor a cero' })
  @IsNumber({}, { message: 'El precio debe ser un numero valido' })
  @IsNotEmpty({ message: 'El precio es obligatorio' })
  precio!: number;

  // Regla del enunciado: el stock puede ser 0 pero no negativo.
  @Type(() => Number)
  @Min(0, { message: 'El stock no puede ser negativo' })
  @IsInt({ message: 'El stock debe ser un numero entero' })
  @IsNotEmpty({ message: 'El stock es obligatorio' })
  stock!: number;

  // Regla del enunciado: el producto debe pertenecer a una categoria valida.
  @Type(() => Number)
  @IsInt({ message: 'Debes seleccionar una categoria' })
  categoriaId!: number;

  // La marca es opcional: no todos los productos tienen una marca comercial
  // declarada.
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La marca seleccionada no es valida' })
  marcaId?: number;
}
