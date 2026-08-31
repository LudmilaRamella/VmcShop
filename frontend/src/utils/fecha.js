// Formateo de fechas centralizado: todas las vistas muestran fechas en
// formato es-AR (dd/mm/aaaa) en vez de dejar pasar el ISO crudo que devuelve
// la base (aaaa-mm-dd) o repetir "new Date(...).toLocaleString(...)" suelto
// en cada componente.

export function formatearFecha(fecha) {
  if (!fecha) return ''
  return new Date(fecha).toLocaleDateString('es-AR', { timeZone: 'UTC' })
}

export function formatearFechaHora(fecha) {
  if (!fecha) return ''
  return new Date(fecha).toLocaleString('es-AR')
}
