import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { CategoriasModule } from './categorias/categorias.module';
import { MarcasModule } from './marcas/marcas.module';
import { ProductosModule } from './productos/productos.module';
import { CarritoModule } from './carrito/carrito.module';
import { PedidosModule } from './pedidos/pedidos.module';
import { PromocionesModule } from './promociones/promociones.module';
import { ReportesModule } from './reportes/reportes.module';
import { BannersModule } from './banners/banners.module';
import { ServiciosModule } from './servicios/servicios.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    // Carga el archivo .env y deja las variables disponibles en toda la app
    // a traves de ConfigService, en vez de leer process.env directamente en
    // cada archivo.
    ConfigModule.forRoot({ isGlobal: true }),

    // Conexion a la base de datos MySQL/MariaDB usando TypeORM.
    // Se configura de forma asincronica (forRootAsync) para poder inyectar
    // el ConfigService y leer los datos desde el .env.
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const esProduccion = config.get<string>('NODE_ENV') === 'production';
        const sslHabilitado = config.get<string>('DB_SSL') === 'true';
        const sslCa = config.get<string>('DB_SSL_CA');
        const synchronizeConfig = config.get<string>('DB_SYNCHRONIZE');

        return {
          type: 'mysql',
          host: config.get('DB_HOST'),
          port: Number(config.get('DB_PORT') || 3306),
          username: config.get('DB_USER'),
          password: config.get('DB_PASSWORD'),
          database: config.get('DB_NAME'),
          autoLoadEntities: true, // toma automaticamente las entidades registradas en cada modulo
          // En produccion debe quedar en false para evitar cambios automaticos
          // de esquema sobre datos existentes. Localmente conserva el
          // comportamiento anterior si DB_SYNCHRONIZE no esta definido.
          synchronize:
            synchronizeConfig === undefined ? !esProduccion : synchronizeConfig === 'true',
          ssl: sslHabilitado
            ? {
                rejectUnauthorized:
                  config.get<string>('DB_SSL_REJECT_UNAUTHORIZED') !== 'false',
                ...(sslCa ? { ca: sslCa.replace(/\\n/g, '\n') } : {}),
              }
            : undefined,
        };
      },
    }),

    AuthModule,
    UsuariosModule,
    CategoriasModule,
    MarcasModule,
    ProductosModule,
    CarritoModule,
    PedidosModule,
    PromocionesModule,
    ReportesModule,
    BannersModule,
    ServiciosModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
