import { NestFactory } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../app.module';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Rol } from '../common/enums/rol.enum';

// Script de un solo uso para crear el primer administrador del sistema.
// El registro publico (POST /auth/registro) siempre crea clientes a
// proposito (ver RegistroDto), asi que el primer admin se crea por afuera,
// corriendo este script una vez.
//
// Uso: npx ts-node src/database/crear-admin.ts <email> <password>
async function crearAdmin() {
  const [, , email, password] = process.argv;

  if (!email || !password) {
    console.error('Uso: npx ts-node src/database/crear-admin.ts <email> <password>');
    process.exit(1);
  }

  // Se levanta el contexto completo de Nest (conexion a la base incluida)
  // solo para tener acceso al repositorio de Usuario, y se cierra al final.
  const app = await NestFactory.createApplicationContext(AppModule);
  const usuariosRepo = app.get<Repository<Usuario>>(getRepositoryToken(Usuario));

  const existente = await usuariosRepo.findOne({ where: { email: email.toLowerCase() } });

  if (existente) {
    existente.rol = Rol.ADMIN;
    await usuariosRepo.save(existente);
    console.log(`El usuario ${email} ya existia: se le asigno el rol admin.`);
  } else {
    const admin = usuariosRepo.create({
      nombre: 'Administrador',
      apellido: 'Sistema',
      email: email.toLowerCase(),
      password: await bcrypt.hash(password, 10),
      rol: Rol.ADMIN,
    });
    await usuariosRepo.save(admin);
    console.log(`Administrador ${email} creado correctamente.`);
  }

  await app.close();
}

crearAdmin();
