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
import { BannersService } from './banners.service';
import { CrearBannerDto } from './dto/crear-banner.dto';
import { ActualizarBannerDto } from './dto/actualizar-banner.dto';
import { SesionAuthGuard } from '../common/guards/sesion-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Rol } from '../common/enums/rol.enum';
import { configuracionMulterImagen } from '../common/multer-imagen';

// Los banners son imagenes grandes (recomendado 1080x1920), asi que se les
// da un limite de tamanio mayor al de categorias/marcas/productos.
const uploadImagenBanner = FileInterceptor('imagen', configuracionMulterImagen('banners', 5));

@Controller('banners')
export class BannersController {
  constructor(private readonly bannersService: BannersService) {}

  // Publico: el home pide ?soloActivos=true. El panel de admin pide todos.
  @Get()
  listar(@Query('soloActivos') soloActivos?: string) {
    return this.bannersService.listar(soloActivos === 'true');
  }

  @Get(':id')
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.bannersService.obtener(id);
  }

  @Post()
  @UseGuards(SesionAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
  @UseInterceptors(uploadImagenBanner)
  crear(@Body() datos: CrearBannerDto, @UploadedFile() imagen?: Express.Multer.File) {
    return this.bannersService.crear(datos, imagen?.filename);
  }

  @Patch(':id')
  @UseGuards(SesionAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
  @UseInterceptors(uploadImagenBanner)
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() datos: ActualizarBannerDto,
    @UploadedFile() imagen?: Express.Multer.File,
  ) {
    return this.bannersService.actualizar(id, datos, imagen?.filename);
  }

  // Toggle de alta/baja. JSON puro (no FormData), para que "activo" llegue
  // como un boolean real y no como el string "false".
  @Patch(':id/estado')
  @UseGuards(SesionAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
  cambiarEstado(@Param('id', ParseIntPipe) id: number, @Body('activo') activo: boolean) {
    return this.bannersService.cambiarEstado(id, activo);
  }

  @Delete(':id')
  @UseGuards(SesionAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.bannersService.eliminar(id);
  }
}
