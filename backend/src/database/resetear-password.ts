import { NestFactory } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../app.module';
import { Usuario } from '../usuarios/entities/usuario.entity';

// Script de rescate: resetea la password de un usuario EXISTENTE a una
// nueva, sin tocar el resto de sus datos (nombre, rol, pedidos, etc).
//
// Sirve para el caso en que la password de una cuenta se perdio (por
// ejemplo, se creo con un script de seed que hasheo una password que nadie
// anoto): como bcrypt es de una sola via, no hay forma de "recuperar" el
// original, asi que en su lugar se pisa por una nueva conocida.
//
// Uso: npx ts-node src/database/resetear-password.ts <email> <password-nueva>
async function resetearPassword() {
  const [, , email, nuevaPassword] = process.argv;

  if (!email || !nuevaPassword) {
    console.error('Uso: npx ts-node src/database/resetear-password.ts <email> <password-nueva>');
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(AppModule);
  const usuariosRepo = app.get<Repository<Usuario>>(getRepositoryToken(Usuario));

  const usuario = await usuariosRepo.findOne({ where: { email: email.toLowerCase() } });

  if (!usuario) {
    console.error(`No existe ningun usuario con el email ${email}.`);
    await app.close();
    process.exit(1);
  }

  usuario.password = await bcrypt.hash(nuevaPassword, 10);
  await usuariosRepo.save(usuario);

  console.log(`Password de ${email} (rol: ${usuario.rol}) actualizada correctamente.`);

  await app.close();
}

resetearPassword();
