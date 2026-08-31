<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import api from '../services/api'
import { useAuthStore } from '../stores/auth'
import { useCarritoStore } from '../stores/carrito'
import socket from '../services/socket'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const carrito = useCarritoStore()

const producto = ref(null)
const cargando = ref(true)
const noEncontrado = ref(false)
const mensaje = ref('')

const tienePrecio = () => producto.value?.precio !== undefined
const tieneDescuento = () => !!producto.value?.promocionAplicada

function etiquetaDescuento(promocion) {
  return promocion.tipo === 'porcentaje' ? `-${promocion.valor}%` : `-$${promocion.valor}`
}

async function cargar() {
  cargando.value = true
  noEncontrado.value = false
  try {
    const { data } = await api.get(`/productos/${route.params.id}`)
    producto.value = data
  } catch {
    noEncontrado.value = true
  } finally {
    cargando.value = false
  }
}

async function agregarAlCarrito() {
  if (!auth.esCliente) {
    mensaje.value = 'Iniciar sesión como cliente para comprar.'
    return
  }
  await carrito.agregar(producto.value.id, 1)
  mensaje.value = `"${producto.value.nombre}" agregado al carrito.`
  setTimeout(() => (mensaje.value = ''), 2500)
}

function irAMarca() {
  if (!producto.value?.marca) return
  router.push({ name: 'catalogo', query: { marcaId: producto.value.marca.id } })
}

function irACategoria() {
  if (!producto.value?.categoria) return
  router.push({ name: 'catalogo', query: { categoriaId: producto.value.categoria.id } })
}

onMounted(cargar)
watch(() => route.params.id, cargar)

// Si el admin edita o da de baja justo el producto que se esta mirando, se
// vuelve a pedir para que precio, stock o disponibilidad queden al dia.
function alCambiarUnProducto({ id }) {
  if (String(id) === String(route.params.id)) cargar()
}
socket.on('producto:cambio', alCambiarUnProducto)
onUnmounted(() => socket.off('producto:cambio', alCambiarUnProducto))
</script>

<template>
  <div>
    <RouterLink :to="{ name: 'catalogo' }" class="text-sm text-primary-600 font-medium hover:underline inline-flex items-center gap-1.5 mb-6">
      <i class="fa-solid fa-arrow-left"></i>
      Volver al catálogo
    </RouterLink>

    <p v-if="cargando" class="text-gray-500">
      <i class="fa-solid fa-circle-notch fa-spin mr-2"></i>Cargando producto...
    </p>

    <div v-else-if="noEncontrado" class="card empty-state">
      <i class="fa-solid fa-box-open empty-state-icon"></i>
      <p>Ese producto no existe o ya no esta disponible.</p>
    </div>

    <div v-else class="card p-6 sm:p-8 grid sm:grid-cols-2 gap-8">
      <div class="relative aspect-square bg-gray-100 rounded-xl overflow-hidden">
        <img
          v-if="producto.imagen"
          :src="`/uploads/productos/${producto.imagen}`"
          :alt="producto.nombre"
          class="h-full w-full object-cover"
        />
        <div v-else class="h-full w-full flex items-center justify-center">
          <div class="h-16 w-16 rounded-full bg-white ring-1 ring-gray-100 flex items-center justify-center text-primary-300 shadow-sm">
            <i class="fa-solid fa-paw text-2xl"></i>
          </div>
        </div>

        <span v-if="producto.stock === 0" class="absolute top-3 right-3 bg-gray-800/90 text-white text-xs font-bold px-2.5 py-1 rounded-full">
          Sin stock
        </span>
        <span
          v-else-if="tieneDescuento()"
          class="absolute top-3 left-3 inline-flex items-center gap-1 bg-accent-500 text-white text-xs font-bold pl-2 pr-2.5 py-1 rounded-full shadow-sm"
        >
          <i class="fa-solid fa-tag text-[10px]"></i>
          {{ etiquetaDescuento(producto.promocionAplicada) }}
        </span>
      </div>

      <div class="flex flex-col">
        <div class="flex items-center gap-1.5 text-xs">
          <button v-if="producto.categoria" @click="irACategoria" class="text-primary-600 font-semibold uppercase tracking-wide hover:underline">
            {{ producto.categoria.nombre }}
          </button>
          <template v-if="producto.marca">
            <span class="text-gray-300">&bull;</span>
            <button @click="irAMarca" class="text-gray-500 font-medium hover:underline">{{ producto.marca.nombre }}</button>
          </template>
        </div>

        <h1 class="text-2xl font-bold text-gray-800 mt-1">{{ producto.nombre }}</h1>
        <p class="text-gray-600 mt-3 flex-1">{{ producto.descripcion }}</p>

        <div class="mt-4">
          <div v-if="tienePrecio()" class="flex items-baseline gap-2.5">
            <span class="text-3xl font-bold text-primary-700">
              ${{ Number(producto.precioConDescuento ?? producto.precio).toFixed(2) }}
            </span>
            <span v-if="tieneDescuento()" class="text-base text-gray-400 line-through">
              ${{ Number(producto.precio).toFixed(2) }}
            </span>
          </div>
          <RouterLink v-else to="/login" class="flex items-center gap-1.5 text-primary-600 font-medium hover:underline">
            <i class="fa-solid fa-lock text-xs"></i>
            Iniciar sesión para ver el precio
          </RouterLink>

          <p v-if="producto.stock > 0" class="text-sm text-gray-400 mt-1">Stock disponible: {{ producto.stock }}</p>
        </div>

        <transition name="fade">
          <div v-if="mensaje" class="mt-4 bg-accent-50 text-accent-700 border border-accent-200 rounded-lg px-4 py-2.5 text-sm font-medium">
            {{ mensaje }}
          </div>
        </transition>

        <button
          v-if="tienePrecio()"
          class="btn-primary mt-5 w-full sm:w-auto flex items-center justify-center gap-2"
          :disabled="producto.stock === 0"
          @click="agregarAlCarrito"
        >
          <i class="fa-solid fa-cart-plus"></i>
          {{ producto.stock === 0 ? 'Sin stock' : 'Agregar al carrito' }}
        </button>
        <RouterLink v-else to="/login" class="btn-outline mt-5 w-full sm:w-auto flex items-center justify-center gap-2">
          <i class="fa-solid fa-right-to-bracket"></i>
          Iniciar sesión
        </RouterLink>
      </div>
    </div>
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
