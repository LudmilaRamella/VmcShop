import { Injectable } from '@nestjs/common';
import { PassportSerializer } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { Usuario } from '../usuarios/entities/usuario.entity';

// Define que se guarda en la sesion y como se reconstruye el usuario en cada
// peticion siguiente.
//
// Solo se guarda el ID del usuario en la cookie de sesion (serializeUser),
// nunca el objeto completo: guardar el objeto entero dejaria datos
// desactualizados si, por ejemplo, un admin cambia el rol de ese usuario
// mientras tiene la sesion abierta. En cada peticion, deserializeUser vuelve
// a buscar el usuario fresco en la base a partir de ese id.
@Injectable()
export class SessionSerializer extends PassportSerializer {
  constructor(private readonly authService: AuthService) {
    super();
  }

  serializeUser(usuario: Usuario, done: (err: Error | null, id?: number) => void): void {
    done(null, usuario.id);
  }

  async deserializeUser(
    id: number,
    done: (err: Error | null, usuario?: Usuario | false) => void,
  ): Promise<void> {
    const usuario = await this.authService.buscarPorId(id);

    // Si el usuario fue eliminado o dado de baja despues de loguearse, se
    // invalida la sesion en el acto (done con "false").
    if (!usuario || !usuario.activo) {
      return done(null, false);
    }
    done(null, usuario);
  }
}
