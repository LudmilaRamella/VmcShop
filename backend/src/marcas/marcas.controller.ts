import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MarcasService } from './marcas.service';
import { CrearMarcaDto } from './dto/crear-marca.dto';
import { ActualizarMarcaDto } from './dto/actualizar-marca.dto';
import { SesionAuthGuard } from '../common/guards/sesion-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Rol } from '../common/enums/rol.enum';
import { configuracionMulterImagen } from '../common/multer-imagen';

const uploadImagenMarca = FileInterceptor('imagen', configuracionMulterImagen('marcas'));

@Controller('marcas')
export class MarcasController {
  constructor(private readonly marcasService: MarcasService) {}

  // Publico: cualquiera puede ver el listado de marcas (no requiere login).
  // ?soloActivas=true lo usa el catalogo/formulario de producto; el panel
  // de admin pide todas, activas e inactivas, para poder reactivarlas.
  @Get()
  listar(@Query('soloActivas') soloActivas?: string) {
    return this.marcasService.listar(soloActivas === 'true');
  }

  @Get(':id')
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.marcasService.obtener(id);
  }

  @Post()
  @UseGuards(SesionAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
  @UseInterceptors(uploadImagenMarca)
  crear(@Body() datos: CrearMarcaDto, @UploadedFile() imagen?: Express.Multer.File) {
    return this.marcasService.crear(datos, imagen?.filename);
  }

  @Patch(':id')
  @UseGuards(SesionAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
  @UseInterceptors(uploadImagenMarca)
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() datos: ActualizarMarcaDto,
    @UploadedFile() imagen?: Express.Multer.File,
  ) {
    return this.marcasService.actualizar(id, datos, imagen?.filename);
  }

  @Delete(':id')
  @UseGuards(SesionAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.marcasService.eliminar(id);
  }
}
