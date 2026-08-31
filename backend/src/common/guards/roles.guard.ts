import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Rol } from '../enums/rol.enum';

// Guard que revisa el rol del usuario logueado contra los roles permitidos
// por el decorador @Roles() de la ruta. Se usa SIEMPRE despues de
// SesionAuthGuard, porque necesita que req.user ya este cargado.
//
// Importante: el rol se lee de req.user, que Passport arma desde la base de
// datos en cada peticion (session.serializer.ts). Nunca se confia en un rol
// que venga en el body o en un header, porque el cliente podria falsearlo.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const rolesPermitidos = this.reflector.get<Rol[]>(ROLES_KEY, context.getHandler());

    // Si la ruta no tiene @Roles(), no restringe por rol (alcanza con estar logueado).
    if (!rolesPermitidos || rolesPermitidos.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user || !rolesPermitidos.includes(user.rol)) {
      throw new ForbiddenException('No tenes permisos para realizar esta accion');
    }

    return true;
  }
}
