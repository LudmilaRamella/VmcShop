import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Carrito } from './entities/carrito.entity';
import { ItemCarrito } from './entities/item-carrito.entity';
import { Producto } from '../productos/entities/producto.entity';
import { CarritoService } from './carrito.service';
import { CarritoController } from './carrito.controller';
import { PromocionesModule } from '../promociones/promociones.module';

@Module({
  imports: [TypeOrmModule.forFeature([Carrito, ItemCarrito, Producto]), PromocionesModule],
  controllers: [CarritoController],
  providers: [CarritoService],
  exports: [CarritoService],
})
export class CarritoModule {}
