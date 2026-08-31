import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname } from 'path';

// Configuracion de Multer reutilizable para subir una imagen (categorias,
// marcas, banners...). El mismo patron que ya usaba Productos, sacado a un
// solo lugar para no repetir esta configuracion en cada controller.
//
// Se valida la extension para no aceptar cualquier archivo, y el nombre de
// archivo lo genera el servidor (nunca el nombre original) para que nadie
// pueda mandar algo como "../../otra-carpeta/archivo" e intentar escribir
// fuera de la carpeta de destino.
const EXTENSIONES_PERMITIDAS = /\.(jpg|jpeg|png|webp|gif)$/i;

export function configuracionMulterImagen(carpetaDestino: string, tamanioMaximoMB = 2) {
  return {
    storage: diskStorage({
      destination: `./uploads/${carpetaDestino}`,
      filename: (_req, file, callback) => {
        const sufijo = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const prefijo = carpetaDestino.replace(/s$/, '');
        callback(null, `${prefijo}-${sufijo}${extname(file.originalname)}`);
      },
    }),
    fileFilter: (_req, file, callback) => {
      if (!EXTENSIONES_PERMITIDAS.test(extname(file.originalname))) {
        return callback(
          new BadRequestException('Solo se permiten imagenes (jpg, png, webp, gif)'),
          false,
        );
      }
      callback(null, true);
    },
    limits: { fileSize: tamanioMaximoMB * 1024 * 1024 },
  };
}
