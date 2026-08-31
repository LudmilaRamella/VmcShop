import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Carrito } from '../carrito/entities/carrito.entity';
import { ItemCarrito } from '../carrito/entities/item-carrito.entity';
import { Producto } from '../productos/entities/producto.entity';
import { Pedido } from './entities/pedido.entity';
import { ItemPedido } from './entities/item-pedido.entity';
import { PedidosService } from './pedidos.service';
import { PedidosController } from './pedidos.controller';
import { PromocionesModule } from '../promociones/promociones.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { MailService } from '../common/mail/mail.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Carrito, ItemCarrito, Producto, Pedido, ItemPedido]),
    PromocionesModule,
    RealtimeModule,
  ],
  controllers: [PedidosController],
  providers: [PedidosService, MailService],
  exports: [PedidosService],
})
export class PedidosModule {}
