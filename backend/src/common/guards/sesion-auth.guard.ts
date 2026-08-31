import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';

// Guard que exige que haya una sesion iniciada. Se usa en cualquier ruta
// donde haga falta estar logueado, sea cliente o admin, poniendo
// @UseGuards(SesionAuthGuard) en el controller o en un metodo puntual.
//
// req.isAuthenticated() lo agrega Passport automaticamente cuando detecta
// una sesion valida (ver AppModule / main.ts, donde se inicializa
// passport.session()).
@Injectable()
export class SesionAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    if (request.isAuthenticated && request.isAuthenticated()) {
      return true;
    }

    throw new UnauthorizedException('Necesitas iniciar sesion para continuar');
  }
}
