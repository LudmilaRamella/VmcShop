// Catalogo de servicios veterinarios de VMC. Es informacion estatica (no
// hay una tabla en base de datos: ver la nota en ServiciosModule sobre por
// que esta version de "solicitud de turno" no persiste nada) pero se valida
// en el DTO para que el mail a la veterinaria siempre lleve un nombre de
// servicio conocido, nunca texto libre mandado por el cliente.
export const SERVICIOS_VETERINARIOS = [
  { slug: 'consulta-clinica', nombre: 'Consulta clínica' },
  { slug: 'vacunacion', nombre: 'Vacunación' },
  { slug: 'cardiologia', nombre: 'Cardiología' },
  { slug: 'ecografia', nombre: 'Ecografía' },
  { slug: 'laboratorio', nombre: 'Laboratorio' },
  { slug: 'cirugia', nombre: 'Cirugía' },
  { slug: 'traumatologia', nombre: 'Traumatología' },
  { slug: 'exoticos', nombre: 'Animales exóticos' },
] as const;

export const SLUGS_SERVICIOS = SERVICIOS_VETERINARIOS.map((s) => s.slug);

export function nombreServicio(slug: string): string {
  return SERVICIOS_VETERINARIOS.find((s) => s.slug === slug)?.nombre ?? slug;
}

export const ESPECIES_VALIDAS = ['perro', 'gato', 'otro'] as const;

const NOMBRES_ESPECIE: Record<string, string> = {
  perro: 'Perro',
  gato: 'Gato',
  otro: 'Otro',
};

export function nombreEspecie(slug: string): string {
  return NOMBRES_ESPECIE[slug] ?? slug;
}

// Franjas preferidas, no horarios reales: todavia no existe disponibilidad
// ni agenda en el sistema (ver seccion 8 de la consigna), asi que solo se
// pide una preferencia amplia que despues coordina la veterinaria.
export const FRANJAS_HORARIAS = [
  { slug: 'manana', nombre: 'Mañana' },
  { slug: 'tarde', nombre: 'Tarde' },
  { slug: 'indistinto', nombre: 'Indistinto' },
] as const;

export const SLUGS_FRANJAS = FRANJAS_HORARIAS.map((f) => f.slug);

export function nombreFranja(slug: string): string {
  return FRANJAS_HORARIAS.find((f) => f.slug === slug)?.nombre ?? slug;
}
