import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Marca } from './entities/marca.entity';
import { Producto } from '../productos/entities/producto.entity';
import { MarcasService } from './marcas.service';
import { MarcasController } from './marcas.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Marca, Producto])],
  controllers: [MarcasController],
  providers: [MarcasService],
  exports: [MarcasService],
})
export class MarcasModule {}
