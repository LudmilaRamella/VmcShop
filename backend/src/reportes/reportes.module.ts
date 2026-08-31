import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pedido } from '../pedidos/entities/pedido.entity';
import { ItemPedido } from '../pedidos/entities/item-pedido.entity';
import { ReportesService } from './reportes.service';
import { ReportesController } from './reportes.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Pedido, ItemPedido])],
  controllers: [ReportesController],
  providers: [ReportesService],
})
export class ReportesModule {}
