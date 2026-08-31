import { PartialType } from '@nestjs/mapped-types';
import { CrearBannerDto } from './crear-banner.dto';

// No incluye "activo": ese cambio de estado se hace por un endpoint aparte
// (PATCH /banners/:id/estado) con JSON en vez de multipart/form-data. Un
// booleano mandado por FormData llega como el string "false", y
// convertirlo de vuelta a boolean de forma confiable requiere logica
// extra que no vale la pena para un toggle tan simple.
export class ActualizarBannerDto extends PartialType(CrearBannerDto) {}
