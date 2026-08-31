import { SetMetadata } from '@nestjs/common';
import { Rol } from '../enums/rol.enum';

// Decorador @Roles(...): marca que roles pueden acceder a una ruta.
// Guarda esa informacion como "metadata" del handler; despues RolesGuard la
// lee con Reflector y decide si deja pasar la peticion.
//
// Uso: @Roles(Rol.ADMIN) arriba de un metodo del controller.
export const ROLES_KEY = 'roles';
export const Roles = (...roles: Rol[]) => SetMetadata(ROLES_KEY, roles);
