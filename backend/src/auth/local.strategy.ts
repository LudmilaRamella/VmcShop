import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from './auth.service';
import { Usuario } from '../usuarios/entities/usuario.entity';

// Estrategia local de Passport: define COMO se validan las credenciales de
// un login con email + password. Nest la ejecuta automaticamente cuando el
// AuthController usa el guard AuthGuard('local') en /auth/login.
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    // Por defecto passport-local espera un campo "username"; se lo cambia
    // por "email" para que coincida con el formulario de login.
    super({ usernameField: 'email' });
  }

  // Passport llama a este metodo con lo que venga en el body. Si tira una
  // excepcion, el login falla con esa excepcion (401 Unauthorized).
  async validate(email: string, password: string): Promise<Usuario> {
    return this.authService.validarCredenciales(email, password);
  }
}
