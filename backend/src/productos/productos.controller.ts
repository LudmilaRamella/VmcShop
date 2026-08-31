import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import type { Request } from 'express';
import { ProductosService, OrdenCatalogo } from './productos.service';
import { CrearProductoDto } from './dto/crear-producto.dto';
import { ActualizarProductoDto } from './dto/actualizar-producto.dto';
import { SesionAuthGuard } from '../common/guards/sesion-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Rol } from '../common/enums/rol.enum';

// Extensiones de imagen aceptadas. Se valida tanto la extension como el
// mimetype para que no baste con renombrar un archivo cualquiera a ".jpg".
const EXTENSIONES_PERMITIDAS = /\.(jpg|jpeg|png|webp|gif)$/i;

const configuracionMulter = {
  storage: diskStorage({
    destination: './uploads/productos',
    // El nombre de archivo lo genera el servidor (timestamp + numero
    // aleatorio), nunca se usa el nombre original: si se usara tal cual,
    // alguien podria mandar un nombre con "../" e intentar escribir fuera
    // de la carpeta de destino.
    filename: (_req, file, callback) => {
      const sufijo = Date.now() + '-' + Math.round(Math.random() * 1e9);
      callback(null, `producto-${sufijo}${extname(file.originalname)}`);
    },
  }),
  fileFilter: (_req, file, callback) => {
    if (!EXTENSIONES_PERMITIDAS.test(extname(file.originalname))) {
      return callback(new BadRequestException('Solo se permiten imagenes (jpg, png, webp, gif)'), false);
    }
    callback(null, true);
  },
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
};

const ORDENES_VALIDOS: OrdenCatalogo[] = ['nombre', 'nombre_desc', 'precio_asc', 'precio_desc'];

@Controller('productos')
export class ProductosController {
  constructor(private readonly productosService: ProductosService) {}

  // Publico: catalogo con filtros, orden y paginado. Si no hay sesion
  // iniciada, se ocultan los precios (regla de negocio: los precios solo
  // los ve un usuario logueado).
  @Get()
  async listar(
    @Req() req: Request,
    @Query('categoriaId') categoriaId?: string,
    @Query('marcaId') marcaId?: string,
    @Query('buscar') buscar?: string,
    @Query('soloActivos') soloActivos?: string,
    @Query('pagina') pagina?: string,
    @Query('limite') limite?: string,
    @Query('orden') orden?: string,
  ) {
    const resultado = await this.productosService.listar({
      categoriaId: categoriaId ? Number(categoriaId) : undefined,
      marcaId: marcaId ? Number(marcaId) : undefined,
      buscar,
      soloActivos: soloActivos !== 'false', // por defecto, el catalogo publico solo muestra activos
      pagina: pagina ? Number(pagina) : undefined,
      limite: limite ? Number(limite) : undefined,
      orden: ORDENES_VALIDOS.includes(orden as OrdenCatalogo) ? (orden as OrdenCatalogo) : undefined,
    });

    return {
      ...resultado,
      items: resultado.items.map((producto) => this.aplicarVisibilidadDePrecio(producto, req)),
    };
  }

  @Get(':id')
  async obtener(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    const producto = await this.productosService.obtener(id);
    return this.aplicarVisibilidadDePrecio(producto, req);
  }

  @Post()
  @UseGuards(SesionAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
  @UseInterceptors(FileInterceptor('imagen', configuracionMulter))
  crear(@Body() datos: CrearProductoDto, @UploadedFile() imagen?: Express.Multer.File) {
    return this.productosService.crear(datos, imagen?.filename);
  }

  @Patch(':id')
  @UseGuards(SesionAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
  @UseInterceptors(FileInterceptor('imagen', configuracionMulter))
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() datos: ActualizarProductoDto,
    @UploadedFile() imagen?: Express.Multer.File,
  ) {
    return this.productosService.actualizar(id, datos, imagen?.filename);
  }

  @Delete(':id')
  @UseGuards(SesionAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.productosService.eliminar(id);
  }

  // Sin sesion iniciada no se muestra ni el precio de lista ni el
  // descontado ni la promocion: solo se puede ver que existe el producto,
  // su nombre, foto y stock. Es una decision de negocio (no tecnica) para
  // incentivar el registro antes de mostrar precios.
  private aplicarVisibilidadDePrecio(producto: any, req: Request) {
    const logueado = typeof req.isAuthenticated === 'function' && req.isAuthenticated();
    if (logueado) return producto;

    const { precio, precioConDescuento, promocionAplicada, ...resto } = producto;
    return resto;
  }
}
