import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Promocion } from './entities/promocion.entity';
import { Producto } from '../productos/entities/producto.entity';
import { PromocionesService } from './promociones.service';
import { PromocionesController } from './promociones.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Promocion, Producto])],
  controllers: [PromocionesController],
  providers: [PromocionesService],
  exports: [PromocionesService],
})
export class PromocionesModule {}
