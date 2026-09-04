// Resuelve la imagen a mostrar para categorías, marcas y productos del
// catálogo. Prioridad absoluta a lo que haya subido el admin; la demo
// (frontend/public/demo/...) es solo un fallback visual.
//
// Reglas:
// 1. Si "imagen" es una URL absoluta (http/https), se usa tal cual.
// 2. Si "imagen" es una ruta /uploads/... o un nombre de archivo (lo que
//    guarda el backend al subir), se resuelve contra VITE_UPLOADS_URL.
// 3. Si "imagen" está vacío, se usa la imagen demo.
// 4. Si la imagen real (subida) falla al cargar, se cae a la imagen demo
//    (nunca se reemplaza una imagen real válida por una demo de antemano).
// 5. Si hasta la demo falla, se cae a la genérica del tipo (nunca queda un
//    ícono roto).

import { uploadUrl } from './uploads'

function normalizar(texto) {
  return (texto || '')
    .toString()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

function esUrlAbsoluta(valor) {
  return /^https?:\/\//i.test(valor || '')
}

function incluyeAlguno(texto, palabras) {
  return palabras.some((palabra) => texto.includes(palabra))
}

// El backend guarda solo el nombre de archivo (ej. "categoria-123-456.jpg"),
// pero por las dudas se admite que "imagen" venga como "/uploads/xxx/archivo"
// o "xxx/archivo": se limpia el prefijo antes de armar la URL final, para no
// terminar con una ruta duplicada tipo ".../uploads/categorias/categorias/...".
function limpiarNombreArchivo(valor, carpeta) {
  let limpio = valor.toString().trim().replace(/^\/+/, '')
  limpio = limpio.replace(/^uploads\//i, '')
  limpio = limpio.replace(new RegExp(`^${carpeta}/`, 'i'), '')
  return limpio
}

function resolverImagenSubida(valor, carpeta) {
  if (!valor) return null
  if (esUrlAbsoluta(valor)) return valor
  return uploadUrl(carpeta, limpiarNombreArchivo(valor, carpeta))
}

function demoCategoria(categoria) {
  const nombre = normalizar(categoria?.nombre)
  let archivo = 'categoria-generica'
  if (incluyeAlguno(nombre, ['aliment', 'nutricion', 'croqueta'])) archivo = 'alimentos'
  else if (incluyeAlguno(nombre, ['higiene', 'bano', 'shampoo', 'limpieza'])) archivo = 'higiene'
  else if (nombre.includes('juguete')) archivo = 'juguetes'
  else if (incluyeAlguno(nombre, ['farmacia', 'medic', 'salud', 'veterinari'])) archivo = 'farmacia'
  else if (nombre.includes('gato')) archivo = 'accesorios-gatos'
  else if (nombre.includes('perro')) archivo = 'accesorios-perros'

  return `/demo/categorias/${archivo}.svg`
}

function demoMarca(marca) {
  const nombre = normalizar(marca?.nombre).replace(/\s+/g, '')
  let archivo = 'marca-generica'
  if (nombre.includes('pawcare')) archivo = 'pawcare'
  else if (nombre.includes('petnova')) archivo = 'petnova'
  else if (nombre.includes('nutrivet')) archivo = 'nutrivet'
  else if (nombre.includes('vetlife')) archivo = 'vetlife'

  return `/demo/marcas/${archivo}.svg`
}

function demoProducto(producto) {
  const nombre = normalizar(producto?.nombre)
  if (incluyeAlguno(nombre, ['aliment', 'balanceado', 'croqueta'])) {
    return `/demo/productos/${nombre.includes('gato') ? 'alimento-gato-premium' : 'alimento-perro-premium'}.svg`
  }
  if (incluyeAlguno(nombre, ['antiparasit', 'pipeta', 'pulga', 'garrapata'])) return '/demo/productos/antiparasitario.svg'
  if (incluyeAlguno(nombre, ['shampoo', 'champu', 'avena'])) return '/demo/productos/shampoo-avena.svg'
  if (incluyeAlguno(nombre, ['comedero', 'bebedero', 'plato'])) return '/demo/productos/comedero.svg'
  if (incluyeAlguno(nombre, ['cama', 'colchon', 'cucha'])) return '/demo/productos/cama-perro.svg'
  if (incluyeAlguno(nombre, ['mordillo', 'juguete', 'pelota', 'hueso'])) return '/demo/productos/juguete-mordillo.svg'

  // Sin coincidencia por nombre: si se sabe la categoría, se usa su imagen
  // demo (queda coherente); si no, la imagen genérica de producto.
  if (producto?.categoria?.nombre) return demoCategoria(producto.categoria)
  return '/demo/productos/producto-generico.svg'
}

export function imagenCategoria(categoria) {
  return resolverImagenSubida(categoria?.imagen, 'categorias') || demoCategoria(categoria)
}

export function imagenMarca(marca) {
  return resolverImagenSubida(marca?.imagen, 'marcas') || demoMarca(marca)
}

export function imagenProducto(producto) {
  return resolverImagenSubida(producto?.imagen, 'productos') || demoProducto(producto)
}

// Handler para el evento @error de <img>. Se le pasa la entidad (categoria/
// marca/producto) para poder calcular su demo correspondiente:
// - si lo que fallo era una imagen subida real, cae a la demo (por nombre).
// - si lo que fallo ya era una demo (o no hay entidad para calcularla), cae
//   a la generica del tipo, para nunca dejar un icono roto.
export function alFallarImagen(evento, tipo, entidad) {
  const demos = { categoria: demoCategoria, marca: demoMarca, producto: demoProducto }
  const genericas = {
    categoria: '/demo/categorias/categoria-generica.svg',
    marca: '/demo/marcas/marca-generica.svg',
    producto: '/demo/productos/producto-generico.svg',
  }

  const srcActual = evento.target.src
  const yaEsDemo = srcActual.includes('/demo/')

  if (!yaEsDemo && demos[tipo]) {
    evento.target.src = demos[tipo](entidad)
    return
  }

  const destino = genericas[tipo]
  if (destino && srcActual.indexOf(destino) === -1) {
    evento.target.src = destino
  }
}
