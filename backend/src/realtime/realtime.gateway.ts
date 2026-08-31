import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

// Gateway de notificaciones en vivo. Emite un evento cuando el catalogo
// cambia (alta, baja o edicion de un producto) para que el catalogo, el
// detalle de producto y el carrito de TODOS los clientes conectados se
// resincronicen solos, sin esperar a que el usuario recargue la pagina.
//
// No requiere autenticacion ni CORS restringido a un origen puntual: lo que
// viaja por este canal es solo un aviso de "algo cambio" (el id del
// producto), nunca datos sensibles ni la cookie de sesion. Cada cliente,
// al recibir el aviso, vuelve a pedir por REST lo que le interese; ese
// pedido si pasa por los guards normales.
@WebSocketGateway({ cors: { origin: true } })
export class RealtimeGateway {
  @WebSocketServer()
  private server: Server;

  emitirCambioProducto(productoId: number): void {
    this.server.emit('producto:cambio', { id: productoId });
  }

  // Mismo criterio que emitirCambioProducto: solo viaja el id del pedido,
  // nunca datos del cliente ni del contenido. Quien reciba el aviso decide
  // si le interesa (el admin siempre; el cliente vuelve a pedir "Mis
  // pedidos" y ve su propio estado actualizado si corresponde).
  emitirCambioPedido(pedidoId: number): void {
    this.server.emit('pedido:cambio', { id: pedidoId });
  }
}
