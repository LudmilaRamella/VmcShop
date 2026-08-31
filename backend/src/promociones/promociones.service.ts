import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AlcancePromocion, Promocion, TipoDescuento } from './entities/promocion.entity';
import { Producto } from '../productos/entities/producto.entity';
import { CrearPromocionDto } from './dto/crear-promocion.dto';
import { ActualizarPromocionDto } from './dto/actualizar-promocion.dto';

@Injectable()
export class PromocionesService {
  constructor(
    @InjectRepository(Promocion)
    private readonly promocionesRepo: Repository<Promocion>,
    @InjectRepository(Producto)
    private readonly productosRepo: Repository<Producto>,
  ) {}

  async listar(): Promise<Promocion[]> {
    return this.promocionesRepo.find({ relations: { productos: true }, order: { id: 'DESC' } });
  }

  async obtener(id: number): Promise<Promocion> {
    const promocion = await this.promocionesRepo.findOne({
      where: { id },
      relations: { productos: true },
    });
    if (!promocion) throw new NotFoundException('La promocion no existe');
    return promocion;
  }

  async crear(datos: CrearPromocionDto): Promise<Promocion> {
    const { productosIds, ...resto } = datos;
    const promocion = this.promocionesRepo.create(resto);

    promocion.productos =
      promocion.alcance === AlcancePromocion.PRODUCTO ? await this.buscarProductosOFallar(productosIds) : [];

    this.validarCoherencia(promocion);

    return this.promocionesRepo.save(promocion);
  }

  async actualizar(id: number, datos: ActualizarPromocionDto): Promise<Promocion> {
    const promocion = await this.obtener(id);
    const { productosIds, ...resto } = datos;

    Object.assign(promocion, resto);

    if (promocion.alcance === AlcancePromocion.PRODUCTO) {
      // Si esta actualizacion no toco los productos, se conservan los que ya
      // tenia (por ejemplo, si solo se cambio la descripcion).
      if (productosIds) {
        promocion.productos = await this.buscarProductosOFallar(productosIds);
      } else if (promocion.productos.length === 0) {
        throw new BadRequestException(
          'Una promocion de alcance "producto" necesita al menos un producto seleccionado',
        );
      }
    } else {
      // Alcance global: no tiene sentido conservar productos asociados de un
      // alcance anterior.
      promocion.productos = [];
    }

    this.validarCoherencia(promocion);

    return this.promocionesRepo.save(promocion);
  }

  async eliminar(id: number): Promise<{ mensaje: string }> {
    const promocion = await this.obtener(id);
    await this.promocionesRepo.remove(promocion);
    return { mensaje: `Promocion "${promocion.nombre}" eliminada` };
  }

  // Alcance PRODUCTO exige al menos un producto valido: una promocion de
  // este tipo sin productos quedaria "viva" pero sin poder aplicarse nunca.
  private async buscarProductosOFallar(productosIds?: number[]): Promise<Producto[]> {
    if (!productosIds || productosIds.length === 0) {
      throw new BadRequestException(
        'Una promocion de alcance "producto" necesita al menos un producto seleccionado',
      );
    }

    const productos = await this.productosRepo.findBy({ id: In(productosIds) });
    if (productos.length !== productosIds.length) {
      throw new BadRequestException('Uno o mas de los productos seleccionados no existen');
    }
    return productos;
  }

  // Reglas de coherencia entre campos que el DTO no puede validar por si
  // solo (dependen de la combinacion de varios valores a la vez).
  private validarCoherencia(promocion: Promocion): void {
    // El limite de 100% solo tiene sentido para un descuento porcentual: un
    // monto_fijo perfectamente puede ser, por ejemplo, $500.
    if (promocion.tipo === TipoDescuento.PORCENTAJE && Number(promocion.valor) > 100) {
      throw new BadRequestException('Un descuento porcentual no puede superar el 100%');
    }

    if (promocion.fechaInicio && promocion.fechaFin && promocion.fechaFin < promocion.fechaInicio) {
      throw new BadRequestException('La fecha de fin no puede ser anterior a la fecha de inicio');
    }
  }

  // Usado por CarritoService y PedidosService para saber que promociones de
  // producto estan activas, junto con los productos a los que se aplican.
  // El filtrado de "cual promocion corresponde a cada linea" lo hace el
  // motor de calculo (common/calculo-totales.ts).
  async promocionesDeProductoVigentes(): Promise<Promocion[]> {
    return this.promocionesRepo.find({
      where: { alcance: AlcancePromocion.PRODUCTO, activa: true },
      relations: { productos: true },
    });
  }

  async promocionesGlobalesVigentes(): Promise<Promocion[]> {
    return this.promocionesRepo.find({
      where: { alcance: AlcancePromocion.GLOBAL, activa: true },
    });
  }
}
