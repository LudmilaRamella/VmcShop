// Catalogo de servicios veterinarios de VMC. Es informacion estatica: para
// esta primera version de "solicitud de turno" no existe un modelo de
// Servicios en el backend (ver ServiciosModule), asi que se define aca
// mismo. Los slugs tienen que coincidir con SERVICIOS_VETERINARIOS del
// backend (servicios.constants.ts), que es quien valida cual llega en la
// solicitud.
export const SERVICIOS = [
  {
    slug: 'consulta-clinica',
    nombre: 'Consulta clínica',
    descripcion: 'Atención clínica general y controles de rutina.',
    icono: 'fa-stethoscope',
  },
  {
    slug: 'vacunacion',
    nombre: 'Vacunación',
    descripcion: 'Plan de vacunas y prevención para tu mascota.',
    icono: 'fa-syringe',
  },
  {
    slug: 'cardiologia',
    nombre: 'Cardiología',
    descripcion: 'Evaluación y seguimiento cardiológico.',
    icono: 'fa-heart-pulse',
  },
  {
    slug: 'ecografia',
    nombre: 'Ecografía',
    descripcion: 'Diagnóstico por imágenes.',
    icono: 'fa-x-ray',
  },
  {
    slug: 'laboratorio',
    nombre: 'Laboratorio',
    descripcion: 'Análisis clínicos y estudios de laboratorio.',
    icono: 'fa-vial',
  },
  {
    slug: 'cirugia',
    nombre: 'Cirugía',
    descripcion: 'Procedimientos quirúrgicos programados.',
    icono: 'fa-kit-medical',
  },
  {
    slug: 'traumatologia',
    nombre: 'Traumatología',
    descripcion: 'Atención de lesiones y afecciones óseas.',
    icono: 'fa-bone',
  },
  {
    slug: 'exoticos',
    nombre: 'Animales exóticos',
    descripcion: 'Atención especializada para especies exóticas.',
    icono: 'fa-dove',
  },
]

export const ESPECIES = [
  { slug: 'perro', nombre: 'Perro' },
  { slug: 'gato', nombre: 'Gato' },
  { slug: 'otro', nombre: 'Otro' },
]

// Franjas preferidas, no horarios reales: todavia no hay disponibilidad ni
// agenda en el sistema, asi que solo se pide una preferencia amplia.
export const FRANJAS_HORARIAS = [
  { slug: 'manana', nombre: 'Mañana' },
  { slug: 'tarde', nombre: 'Tarde' },
  { slug: 'indistinto', nombre: 'Indistinto' },
]
