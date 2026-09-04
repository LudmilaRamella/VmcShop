// Resuelve la imagen a mostrar para categorías, marcas y productos del
// catálogo usando assets estáticos servidos por el propio frontend
// (frontend/public/demo/...). Así la demo no depende de backend/uploads,
// que en Render no persiste archivos entre deploys.
//
// Reglas:
// - Si el campo "imagen" es una URL absoluta (http/https), se usa tal cual.
// - En cualquier otro caso (vacío, o un nombre de archivo que solo existía
//   en backend/uploads) se reemplaza por una imagen demo.
// - La imagen demo se elige según el nombre de la categoría/marca/producto,
//   si coincide con algo conocido; si no, se usa una imagen genérica del
//   mismo tipo (nunca queda un ícono roto).

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

export function imagenCategoria(categoria) {
  if (esUrlAbsoluta(categoria?.imagen)) return categoria.imagen

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

export function imagenMarca(marca) {
  if (esUrlAbsoluta(marca?.imagen)) return marca.imagen

  const nombre = normalizar(marca?.nombre).replace(/\s+/g, '')
  let archivo = 'marca-generica'
  if (nombre.includes('pawcare')) archivo = 'pawcare'
  else if (nombre.includes('petnova')) archivo = 'petnova'
  else if (nombre.includes('nutrivet')) archivo = 'nutrivet'
  else if (nombre.includes('vetlife')) archivo = 'vetlife'

  return `/demo/marcas/${archivo}.svg`
}

export function imagenProducto(producto) {
  if (esUrlAbsoluta(producto?.imagen)) return producto.imagen

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
  if (producto?.categoria?.nombre) return imagenCategoria(producto.categoria)
  return '/demo/productos/producto-generico.svg'
}

// Handler para el evento @error de <img>: si una imagen demo llegara a
// fallar igual (ruta mal escrita, asset borrado, etc.), muestra la
// genérica del tipo correspondiente en vez de dejar el ícono roto.
export function alFallarImagen(evento, tipo) {
  const genericas = {
    categoria: '/demo/categorias/categoria-generica.svg',
    marca: '/demo/marcas/marca-generica.svg',
    producto: '/demo/productos/producto-generico.svg',
  }
  const destino = genericas[tipo]
  if (destino && evento.target.src.indexOf(destino) === -1) {
    evento.target.src = destino
  }
}
