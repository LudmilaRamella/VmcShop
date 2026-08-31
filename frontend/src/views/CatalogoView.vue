<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import api from '../services/api'
import { useAuthStore } from '../stores/auth'
import { useCarritoStore } from '../stores/carrito'
import ProductoCard from '../components/ProductoCard.vue'
import Paginador from '../components/Paginador.vue'
import socket from '../services/socket'

const route = useRoute()
const auth = useAuthStore()
const carrito = useCarritoStore()

const productos = ref([])
const categorias = ref([])
const marcas = ref([])
const promocionesGlobales = ref([])

const categoriaSeleccionada = ref(route.query.categoriaId || '')
const marcaSeleccionada = ref(route.query.marcaId || '')
const buscar = ref('')
const orden = ref('nombre')
const pagina = ref(1)
const totalPaginas = ref(1)
const totalProductos = ref(0)

const cargando = ref(true)
const error = ref('')
const mensaje = ref('')

async function cargarCategorias() {
  const { data } = await api.get('/categorias', { params: { soloActivas: true } })
  categorias.value = data
}

async function cargarMarcas() {
  const { data } = await api.get('/marcas', { params: { soloActivas: true } })
  marcas.value = data
}

// Las promociones globales (por monto o cantidad de items) se avisan aca
// arriba, en un banner: no dependen de un producto puntual, sino del
// pedido completo, asi que no tiene sentido mostrarlas en una tarjeta.
async function cargarPromocionesGlobales() {
  const { data } = await api.get('/promociones')
  const hoy = new Date()
  promocionesGlobales.value = data.filter((p) => {
    if (p.alcance !== 'global' || !p.activa) return false
    if (p.fechaInicio && hoy < new Date(p.fechaInicio)) return false
    if (p.fechaFin && hoy > new Date(`${p.fechaFin}T23:59:59`)) return false
    return true
  })
}

function describirPromocionGlobal(p) {
  const beneficio = p.tipo === 'porcentaje' ? `${p.valor}% de descuento` : `$${p.valor} de descuento`
  const condiciones = []
  if (p.montoMinimo) condiciones.push(`compras desde $${p.montoMinimo}`)
  if (p.cantidadMinima) condiciones.push(`${p.cantidadMinima} o más productos`)
  return condiciones.length ? `${beneficio} en ${condiciones.join(' y ')}` : beneficio
}

async function cargarProductos() {
  cargando.value = true
  error.value = ''
  try {
    const { data } = await api.get('/productos', {
      params: {
        categoriaId: categoriaSeleccionada.value || undefined,
        marcaId: marcaSeleccionada.value || undefined,
        buscar: buscar.value || undefined,
        orden: orden.value,
        pagina: pagina.value,
        limite: 12,
      },
    })
    productos.value = data.items
    totalPaginas.value = data.totalPaginas
    totalProductos.value = data.total
  } catch {
    error.value = 'No pudimos cargar el catálogo. Intentá nuevamente.'
    productos.value = []
  } finally {
    cargando.value = false
  }
}

async function agregarAlCarrito(producto) {
  if (!auth.esCliente) {
    mensaje.value = 'Iniciar sesión como cliente para comprar.'
    return
  }
  await carrito.agregar(producto.id, 1)
  mensaje.value = `"${producto.nombre}" agregado al carrito.`
  setTimeout(() => (mensaje.value = ''), 2500)
}

function irAPagina(nueva) {
  if (nueva < 1 || nueva > totalPaginas.value) return
  pagina.value = nueva
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(() => {
  cargarCategorias()
  cargarMarcas()
  cargarPromocionesGlobales()
  cargarProductos()
})

// Si un admin da de alta, edita o da de baja un producto mientras alguien
// esta mirando el catalogo, se vuelve a pedir la pagina actual para que lo
// vea reflejado sin tener que recargar la pantalla a mano.
socket.on('producto:cambio', cargarProductos)
onUnmounted(() => socket.off('producto:cambio', cargarProductos))

// Buscar/filtrar/ordenar siempre vuelve a la pagina 1: si estabas en la
// pagina 3 y cambias el filtro, la pagina 3 del resultado nuevo podria ni
// existir.
watch([categoriaSeleccionada, marcaSeleccionada, buscar, orden], () => {
  pagina.value = 1
  cargarProductos()
})
watch(pagina, cargarProductos)
</script>

<template>
  <div>
    <div class="flex flex-wrap items-end justify-between gap-3 mb-4">
      <div>
        <h1 class="page-title">Catálogo</h1>
        <p class="page-subtitle">Alimentos, accesorios, medicamentos y juguetes para tu mascota.</p>
      </div>
    </div>

    <div v-if="promocionesGlobales.length" class="mb-4 space-y-2">
      <div
        v-for="p in promocionesGlobales"
        :key="p.id"
        class="rounded-xl bg-accent-500 text-white px-4 py-3 flex items-center gap-3 shadow-sm"
      >
        <span class="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
          <i class="fa-solid fa-tags"></i>
        </span>
        <p class="text-sm leading-snug">
          <span class="font-bold">{{ p.nombre }}</span>
          <span class="text-white/90"> &mdash; {{ describirPromocionGlobal(p) }}</span>
        </p>
      </div>
    </div>

    <div v-if="!auth.estaLogueado" class="mb-4 bg-primary-50 border border-primary-200 text-primary-800 rounded-lg px-4 py-2.5 text-sm font-medium flex items-center gap-2">
      <i class="fa-solid fa-lock"></i>
      Los precios estan ocultos.
      <RouterLink to="/login" class="underline font-semibold">Iniciar sesión</RouterLink>
      o
      <RouterLink to="/registro" class="underline font-semibold">crear una cuenta</RouterLink>
      para verlos.
    </div>

    <transition name="fade">
      <div v-if="mensaje" class="mb-4 bg-accent-50 text-accent-700 border border-accent-200 rounded-lg px-4 py-2.5 text-sm font-medium">
        {{ mensaje }}
      </div>
    </transition>

    <div class="bg-white border border-gray-200 rounded-xl p-2.5 mb-4 flex flex-col lg:flex-row gap-2.5">
      <div class="relative lg:flex-1">
        <i class="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
        <input
          v-model="buscar"
          type="text"
          placeholder="Buscar productos, marcas..."
          class="input-field pl-10 border-0 bg-gray-50 focus:bg-white lg:text-[15px]"
        />
      </div>
      <div class="grid grid-cols-3 lg:flex gap-2.5">
        <select v-model="categoriaSeleccionada" class="input-field lg:w-44">
          <option value="">Todas las categorías</option>
          <option v-for="c in categorias" :key="c.id" :value="c.id">{{ c.nombre }}</option>
        </select>
        <select v-model="marcaSeleccionada" class="input-field lg:w-44">
          <option value="">Todas las marcas</option>
          <option v-for="m in marcas" :key="m.id" :value="m.id">{{ m.nombre }}</option>
        </select>
        <select v-model="orden" class="input-field lg:w-44">
          <option value="nombre">Nombre (A-Z)</option>
          <option value="nombre_desc">Nombre (Z-A)</option>
          <option v-if="auth.estaLogueado" value="precio_asc">Precio: menor a mayor</option>
          <option v-if="auth.estaLogueado" value="precio_desc">Precio: mayor a menor</option>
        </select>
      </div>
    </div>

    <p v-if="cargando" class="text-gray-500">
      <i class="fa-solid fa-circle-notch fa-spin mr-2"></i>Cargando productos...
    </p>
    <div v-else-if="error" class="card empty-state">
      <i class="fa-solid fa-triangle-exclamation empty-state-icon"></i>
      <p class="font-medium text-gray-600">{{ error }}</p>
      <button @click="cargarProductos" class="btn-outline inline-flex items-center gap-2 mt-4">
        <i class="fa-solid fa-rotate-right"></i>
        Reintentar
      </button>
    </div>
    <div v-else-if="productos.length === 0" class="card empty-state">
      <i class="fa-solid fa-box-open empty-state-icon"></i>
      <p class="font-medium text-gray-600">No encontramos productos con estos filtros.</p>
      <p class="text-sm text-gray-400 mt-1">Probá ajustar la búsqueda o quitar algún filtro.</p>
    </div>

    <template v-else>
      <p class="text-sm text-gray-500 mb-3 flex items-center gap-1.5">
        <i class="fa-solid fa-box text-gray-300"></i>
        <span class="font-semibold text-gray-700">{{ totalProductos }}</span>
        producto{{ totalProductos === 1 ? '' : 's' }} encontrado{{ totalProductos === 1 ? '' : 's' }}
      </p>

      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        <ProductoCard
          v-for="producto in productos"
          :key="producto.id"
          :producto="producto"
          @agregar="agregarAlCarrito"
        />
      </div>

      <div class="mt-5">
        <Paginador :pagina="pagina" :total-paginas="totalPaginas" @cambiar="irAPagina" />
      </div>
    </template>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
