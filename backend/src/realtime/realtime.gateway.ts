import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

// Gateway de notificaciones en vivo. Emite un evento cuando el catalogo
// cambia (alta, baja o edicion de un producto) para que el catalogo, el
// detalle de producto y el carrito de TODOS los clientes conectados se
// resincronicen solos, sin esperar a que el usuario recargue la pagina.
//
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
const origenesPermitidos = frontendUrl
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Usa el mismo origen permitido que el frontend REST. Por este canal solo
// viajan avisos de cambio, nunca datos sensibles.
@WebSocketGateway({
  cors: {
    origin: (origin, callback) => {
      if (!origin || origenesPermitidos.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Origen no permitido por CORS'), false);
    },
    credentials: true,
  },
})
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
