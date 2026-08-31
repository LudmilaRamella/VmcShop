import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PedidosService } from './pedidos.service';
import { ConfirmarCompraDto } from './dto/confirmar-compra.dto';
import { SesionAuthGuard } from '../common/guards/sesion-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Rol } from '../common/enums/rol.enum';
import { UsuarioActual } from '../common/decorators/usuario-actual.decorator';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { EstadoPedido } from './entities/pedido.entity';

@Controller('pedidos')
@UseGuards(SesionAuthGuard)
export class PedidosController {
  constructor(private readonly pedidosService: PedidosService) {}

  // Confirmar compra: solo clientes (regla del enunciado: los admin no compran).
  @Post('confirmar')
  @UseGuards(RolesGuard)
  @Roles(Rol.CLIENTE)
  confirmar(@Body() datos: ConfirmarCompraDto, @UsuarioActual() usuario: Usuario) {
    return this.pedidosService.confirmarCompra(usuario.id, datos.observaciones);
  }

  // Un cliente ve solo sus propios pedidos; un admin puede ver los de todos
  // y filtrar por fecha/estado/cliente (alcance 10: reportes y consultas).
  @Get()
  listar(
    @UsuarioActual() usuario: Usuario,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
    @Query('estado') estado?: EstadoPedido,
    @Query('usuarioId') usuarioIdQuery?: string,
  ) {
    const esAdmin = usuario.rol === Rol.ADMIN;
    return this.pedidosService.listar({
      usuarioId: esAdmin ? (usuarioIdQuery ? Number(usuarioIdQuery) : undefined) : usuario.id,
      desde,
      hasta,
      estado,
    });
  }

  @Get(':id')
  obtener(@Param('id', ParseIntPipe) id: number, @UsuarioActual() usuario: Usuario) {
    const esAdmin = usuario.rol === Rol.ADMIN;
    return this.pedidosService.obtener(id, esAdmin ? undefined : usuario.id);
  }

  // Repetir pedido: solo clientes, y solo sobre sus propios pedidos (el
  // service valida la pertenencia).
  @Post(':id/repetir')
  @UseGuards(RolesGuard)
  @Roles(Rol.CLIENTE)
  repetir(@Param('id', ParseIntPipe) id: number, @UsuarioActual() usuario: Usuario) {
    return this.pedidosService.repetirPedido(id, usuario.id);
  }

  @Patch(':id/cancelar')
  @UseGuards(RolesGuard)
  @Roles(Rol.ADMIN)
  cancelar(@Param('id', ParseIntPipe) id: number) {
    return this.pedidosService.cancelarPedido(id);
  }

  // Circuito interno del pedido: confirmado -> en_preparacion -> listo ->
  // entregado. Solo el admin lo mueve de estado (el cliente no interviene en
  // esta parte); PedidosService valida que la transicion pedida sea valida
  // para el estado actual, asi que esto no depende de lo que mande el front.
  @Patch(':id/preparar')
  @UseGuards(RolesGuard)
  @Roles(Rol.ADMIN)
  marcarEnPreparacion(@Param('id', ParseIntPipe) id: number) {
    return this.pedidosService.marcarEnPreparacion(id);
  }

  @Patch(':id/listo')
  @UseGuards(RolesGuard)
  @Roles(Rol.ADMIN)
  marcarListo(@Param('id', ParseIntPipe) id: number) {
    return this.pedidosService.marcarListo(id);
  }

  @Patch(':id/entregar')
  @UseGuards(RolesGuard)
  @Roles(Rol.ADMIN)
  marcarEntregado(@Param('id', ParseIntPipe) id: number) {
    return this.pedidosService.marcarEntregado(id);
  }
}
