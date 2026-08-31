// Roles de usuario del sistema.
// Se usa un enum en vez de strings sueltos para no tener typos como 'admn'
// repartidos por el codigo, y para que TypeScript avise si escribimos mal.
export enum Rol {
  CLIENTE = 'cliente',
  ADMIN = 'admin',
}
