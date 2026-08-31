import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, UseGuards } from '@nestjs/common';
import { CarritoService } from './carrito.service';
import { AgregarItemDto } from './dto/agregar-item.dto';
import { ActualizarItemDto } from './dto/actualizar-item.dto';
import { SesionAuthGuard } from '../common/guards/sesion-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Rol } from '../common/enums/rol.enum';
import { UsuarioActual } from '../common/decorators/usuario-actual.decorator';
import { Usuario } from '../usuarios/entities/usuario.entity';

// Regla del enunciado: comprar es una accion exclusiva de clientes, los
// administradores no pueden operar el carrito. Por eso se exige el rol
// CLIENTE en todo este controller, ademas de estar logueado.
@Controller('carrito')
@UseGuards(SesionAuthGuard, RolesGuard)
@Roles(Rol.CLIENTE)
export class CarritoController {
  constructor(private readonly carritoService: CarritoService) {}

  @Get()
  ver(@UsuarioActual() usuario: Usuario) {
    return this.carritoService.verCarrito(usuario.id);
  }

  @Post('items')
  agregar(@Body() datos: AgregarItemDto, @UsuarioActual() usuario: Usuario) {
    return this.carritoService.agregarItem(usuario.id, datos.productoId, datos.cantidad);
  }

  @Put('items/:id')
  actualizar(
    @Param('id', ParseIntPipe) itemId: number,
    @Body() datos: ActualizarItemDto,
    @UsuarioActual() usuario: Usuario,
  ) {
    return this.carritoService.actualizarCantidad(usuario.id, itemId, datos.cantidad);
  }

  @Delete('items/:id')
  eliminar(@Param('id', ParseIntPipe) itemId: number, @UsuarioActual() usuario: Usuario) {
    return this.carritoService.eliminarItem(usuario.id, itemId);
  }
}
