import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportesService } from './reportes.service';
import { SesionAuthGuard } from '../common/guards/sesion-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Rol } from '../common/enums/rol.enum';

// Acceso exclusivo para administradores (alcance 10 del enunciado).
@Controller('reportes')
@UseGuards(SesionAuthGuard, RolesGuard)
@Roles(Rol.ADMIN)
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @Get('ventas')
  ventas(@Query('desde') desde?: string, @Query('hasta') hasta?: string) {
    return this.reportesService.resumenVentas(desde, hasta);
  }

  @Get('productos-mas-vendidos')
  productosMasVendidos(
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
    @Query('limite') limite?: string,
  ) {
    return this.reportesService.productosMasVendidos(desde, hasta, limite ? Number(limite) : 10);
  }

  @Get('clientes-frecuentes')
  clientesFrecuentes(
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
    @Query('limite') limite?: string,
  ) {
    return this.reportesService.clientesFrecuentes(desde, hasta, limite ? Number(limite) : 10);
  }
}
