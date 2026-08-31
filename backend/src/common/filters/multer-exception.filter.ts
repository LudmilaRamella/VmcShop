import { ArgumentsHost, BadRequestException, Catch, HttpStatus, PayloadTooLargeException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';

// @nestjs/platform-express ya convierte los errores de Multer (imagen
// demasiado grande, campo de archivo inesperado, etc.) en un
// BadRequestException o PayloadTooLargeException, asi que nunca llegan como
// 500. El problema es que conservan el mensaje crudo de Multer, en ingles
// (ej. "File too large"). Este filtro reescribe especificamente esos
// mensajes conocidos a un texto claro en español y deja pasar sin tocar
// cualquier otra excepcion (delegando en BaseExceptionFilter, el mismo
// manejo por defecto de Nest, incluidos los 500 reales e inesperados).
const MENSAJES_MULTER: Record<string, string> = {
  'File too large': 'La imagen supera el tamaño maximo permitido',
  'Too many files': 'Solo se puede subir un archivo por vez',
  'Unexpected field': 'El archivo no se envio en el campo esperado',
  'Field name too long': 'El nombre de un campo es demasiado largo',
  'Field value too long': 'El valor de un campo es demasiado largo',
  'Too many fields': 'Se enviaron demasiados campos',
  'Field name missing': 'Falta el nombre de un campo',
  'Field name nesting too deep': 'El campo tiene una estructura invalida',
  'Too many parts': 'La solicitud tiene demasiadas partes',
};

@Catch()
export class MulterExceptionFilter extends BaseExceptionFilter {
  catch(excepcion: unknown, host: ArgumentsHost) {
    if (excepcion instanceof BadRequestException || excepcion instanceof PayloadTooLargeException) {
      const cuerpo = excepcion.getResponse();
      const mensajeOriginal = typeof cuerpo === 'string' ? cuerpo : (cuerpo as any)?.message;

      if (typeof mensajeOriginal === 'string') {
        const clave = Object.keys(MENSAJES_MULTER).find((prefijo) => mensajeOriginal.startsWith(prefijo));
        if (clave) {
          const status = excepcion.getStatus();
          const traducida =
            status === HttpStatus.PAYLOAD_TOO_LARGE
              ? new PayloadTooLargeException(MENSAJES_MULTER[clave])
              : new BadRequestException(MENSAJES_MULTER[clave]);
          return super.catch(traducida, host);
        }
      }
    }

    return super.catch(excepcion, host);
  }
}
