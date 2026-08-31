import { NestFactory, Reflector } from '@nestjs/core';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import session from 'express-session';
import passport from 'passport';
import { join } from 'path';
import { AppModule } from './app.module';
import { MulterExceptionFilter } from './common/filters/multer-exception.filter';

async function bootstrap() {
  // NestExpressApplication en vez de la interfaz generica: nos da acceso a
  // useStaticAssets, que se usa mas abajo para servir las fotos de producto.
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);
  const esProduccion = config.get<string>('NODE_ENV') === 'production';
  const frontendUrl = config.get<string>('FRONTEND_URL') || 'http://localhost:5173';
  const origenesPermitidos = frontendUrl
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (esProduccion) {
    app.set('trust proxy', 1);
  }

  // Habilita CORS solo para el origen del frontend Vue, y permite que el
  // navegador mande la cookie de sesion en las peticiones (credentials).
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || origenesPermitidos.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Origen no permitido por CORS'), false);
    },
    credentials: true,
  });

  // Middleware de sesion: guarda un id de sesion en una cookie httpOnly del
  // navegador y el estado real (usuario logueado) del lado del servidor.
  // Se eligio sesion en vez de JWT porque el logout puede invalidarla al
  // instante y porque la cookie httpOnly no es accesible desde JavaScript,
  // lo que la protege de robos por XSS.
  app.use(
    session({
      secret: config.get<string>('SESSION_SECRET')!,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: esProduccion,
        sameSite: esProduccion ? 'none' : 'lax',
        maxAge: 24 * 60 * 60 * 1000, // 24 horas
      },
    }),
  );

  // Passport se apoya en la sesion de arriba para saber quien esta logueado.
  app.use(passport.initialize());
  app.use(passport.session());

  // Valida automaticamente el body de cada peticion contra los DTO definidos
  // en cada modulo (decorados con class-validator). whitelist descarta
  // cualquier campo que no este declarado en el DTO, para que el cliente no
  // pueda colar, por ejemplo, un "rol: admin" en el registro.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      // Sin esto, un campo con varias reglas (ej. obligatorio + longitud
      // maxima) devuelve TODOS sus mensajes de error a la vez, aunque no
      // tenga sentido mostrarlos juntos (ej. "es obligatorio" y "supera los
      // 60 caracteres" para un campo vacio). Con stopAtFirstError, cada
      // campo reporta un unico mensaje: el de la primera regla que no paso.
      stopAtFirstError: true,
    }),
  );

  // Aplica los decoradores @Exclude() de las entidades (por ejemplo, el
  // password de Usuario) a toda respuesta de la API, para que ese campo
  // nunca viaje al frontend aunque el service devuelva la entidad entera.
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // Sin este filtro, un archivo que supera el limite de tamanio (u otro
  // error de Multer) llega con el mensaje crudo en ingles de Multer (ej.
  // "File too large") en vez de un texto claro para el usuario.
  app.useGlobalFilters(new MulterExceptionFilter(app.getHttpAdapter()));

  // Sirve las imagenes subidas de los productos como archivos estaticos,
  // accesibles en http://localhost:3000/uploads/productos/archivo.jpg
  app.useStaticAssets(join(__dirname, '..', 'uploads'), { prefix: '/uploads' });

  // Todas las rutas quedan bajo /api (ej. /api/productos, /api/auth/login)
  app.setGlobalPrefix('api', { exclude: ['health'] });

  const puerto = Number(config.get('PORT') || 3000);
  await app.listen(puerto, '0.0.0.0');
  console.log(`Backend corriendo en http://localhost:${puerto}/api`);
}
bootstrap();
