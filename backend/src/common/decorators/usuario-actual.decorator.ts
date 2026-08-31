import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// Decorador @UsuarioActual(): permite pedir el usuario logueado directo
// como parametro del controller, en vez de escribir
// "const usuario = req.user" en cada metodo.
//
// Uso: listar(@UsuarioActual() usuario: Usuario) { ... }
export const UsuarioActual = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();
    return request.user;
  },
);
