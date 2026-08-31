import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PromocionesService } from './promociones.service';
import { CrearPromocionDto } from './dto/crear-promocion.dto';
import { ActualizarPromocionDto } from './dto/actualizar-promocion.dto';
import { SesionAuthGuard } from '../common/guards/sesion-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Rol } from '../common/enums/rol.enum';

@Controller('promociones')
export class PromocionesController {
  constructor(private readonly promocionesService: PromocionesService) {}

  // Publico: el catalogo muestra que promociones estan corriendo.
  @Get()
  listar() {
    return this.promocionesService.listar();
  }

  @Get(':id')
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.promocionesService.obtener(id);
  }

  @Post()
  @UseGuards(SesionAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
  crear(@Body() datos: CrearPromocionDto) {
    return this.promocionesService.crear(datos);
  }

  @Patch(':id')
  @UseGuards(SesionAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
  actualizar(@Param('id', ParseIntPipe) id: number, @Body() datos: ActualizarPromocionDto) {
    return this.promocionesService.actualizar(id, datos);
  }

  @Delete(':id')
  @UseGuards(SesionAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.promocionesService.eliminar(id);
  }
}
