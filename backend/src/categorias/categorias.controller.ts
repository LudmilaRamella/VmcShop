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
import { CategoriasService } from './categorias.service';
import { CrearCategoriaDto } from './dto/crear-categoria.dto';
import { ActualizarCategoriaDto } from './dto/actualizar-categoria.dto';
import { SesionAuthGuard } from '../common/guards/sesion-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Rol } from '../common/enums/rol.enum';
import { configuracionMulterImagen } from '../common/multer-imagen';

const uploadImagenCategoria = FileInterceptor('imagen', configuracionMulterImagen('categorias'));

@Controller('categorias')
export class CategoriasController {
  constructor(private readonly categoriasService: CategoriasService) {}

  // Publico: cualquiera puede ver el catalogo de categorias (no requiere login).
  // ?soloActivas=true lo usa el catalogo del cliente; el panel de admin pide
  // todas, activas e inactivas, para poder reactivarlas.
  @Get()
  listar(@Query('soloActivas') soloActivas?: string) {
    return this.categoriasService.listar(soloActivas === 'true');
  }

  @Get(':id')
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.categoriasService.obtener(id);
  }

  @Post()
  @UseGuards(SesionAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
  @UseInterceptors(uploadImagenCategoria)
  crear(@Body() datos: CrearCategoriaDto, @UploadedFile() imagen?: Express.Multer.File) {
    return this.categoriasService.crear(datos, imagen?.filename);
  }

  @Patch(':id')
  @UseGuards(SesionAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
  @UseInterceptors(uploadImagenCategoria)
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() datos: ActualizarCategoriaDto,
    @UploadedFile() imagen?: Express.Multer.File,
  ) {
    return this.categoriasService.actualizar(id, datos, imagen?.filename);
  }

  @Delete(':id')
  @UseGuards(SesionAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.categoriasService.eliminar(id);
  }
}
