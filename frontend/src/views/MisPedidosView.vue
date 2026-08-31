<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import api from '../services/api'
import socket from '../services/socket'
import { formatearFechaHora } from '../utils/fecha'
import { useNotificacionesStore } from '../stores/notificaciones'

const notificaciones = useNotificacionesStore()

const pedidos = ref([])
const cargando = ref(true)
const error = ref('')
const repitiendoId = ref(null)

const ESTADOS = {
  confirmado: { clase: 'badge-warning', etiqueta: 'Confirmado' },
  en_preparacion: { clase: 'badge-info', etiqueta: 'En preparación' },
  listo: { clase: 'badge-primary', etiqueta: 'Listo para retirar' },
  entregado: { clase: 'badge-success', etiqueta: 'Entregado' },
  cancelado: { clase: 'badge-danger', etiqueta: 'Cancelado' },
}

// Mensaje contextual que se muestra dentro de la tarjeta segun el estado
// actual del pedido (alcance: mejora del ciclo de vida del pedido).
const MENSAJES = {
  confirmado: 'Recibimos tu pedido.',
  en_preparacion: 'Estamos preparando tu pedido.',
  listo: 'Tu pedido está listo para retirar.',
  entregado: 'Tu pedido fue entregado.',
  cancelado: 'Este pedido fue cancelado.',
}

// Pasos del circuito normal del pedido, para el indicador visual de
// progreso. La cancelacion no forma parte de esta linea: se muestra aparte.
const PASOS = [
  { clave: 'confirmado', etiqueta: 'Pedido recibido' },
  { clave: 'en_preparacion', etiqueta: 'En preparación' },
  { clave: 'listo', etiqueta: 'Listo para retirar' },
  { clave: 'entregado', etiqueta: 'Entregado' },
]

function pasosDe(pedido) {
  const indiceActual = PASOS.findIndex((paso) => paso.clave === pedido.estado)
  return PASOS.map((paso, indice) => ({
    ...paso,
    estado: indice < indiceActual ? 'completado' : indice === indiceActual ? 'actual' : 'pendiente',
  }))
}

async function cargar() {
  error.value = ''
  try {
    const { data } = await api.get('/pedidos')
    pedidos.value = data
  } catch {
    error.value = 'No pudimos cargar tus pedidos. Intentá nuevamente.'
  } finally {
    cargando.value = false
  }
}

onMounted(() => {
  cargar()
  // Si el admin cambia el estado de un pedido mientras el cliente tiene
  // "Mis pedidos" abierto, se refresca solo. No hace falta ningun sistema
  // nuevo: se reutiliza el mismo canal que ya avisa cambios de catalogo.
  socket.on('pedido:cambio', cargar)
})
onUnmounted(() => socket.off('pedido:cambio', cargar))

// Repite un pedido anterior: el backend valida stock/vigencia y recalcula
// precios y promociones al momento, asi que el nuevo pedido puede diferir
// del original si algo cambio (precio, stock, promo vencida).
async function repetirPedido(pedido) {
  repitiendoId.value = pedido.id
  try {
    const { data } = await api.post(`/pedidos/${pedido.id}/repetir`)
    // El endpoint devuelve { pedido, items } por separado: el pedido no
    // trae la relacion "items" cargada porque recien se acaba de insertar.
    pedidos.value.unshift({ ...data.pedido, items: data.items })
    notificaciones.exito(`Se creo el pedido ${data.pedido.numero} a partir de ${pedido.numero}`)
  } catch (error) {
    notificaciones.error(error.response?.data?.message ?? 'No se pudo repetir el pedido')
  } finally {
    repitiendoId.value = null
  }
}
</script>

<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">Mis pedidos</h1>
    </div>

    <p v-if="cargando" class="text-gray-500"><i class="fa-solid fa-circle-notch fa-spin mr-2"></i>Cargando...</p>
    <div v-else-if="error" class="card empty-state">
      <i class="fa-solid fa-triangle-exclamation empty-state-icon"></i>
      <p class="font-medium text-gray-600">{{ error }}</p>
      <button @click="cargar" class="btn-outline inline-flex items-center gap-2 mt-4">
        <i class="fa-solid fa-rotate-right"></i>
        Reintentar
      </button>
    </div>
    <div v-else-if="pedidos.length === 0" class="card empty-state">
      <i class="fa-solid fa-receipt empty-state-icon"></i>
      <p class="font-medium text-gray-600">Todavía no realizaste ningún pedido.</p>
      <RouterLink to="/catalogo" class="btn-primary inline-flex items-center gap-2 mt-4">
        <i class="fa-solid fa-store"></i>
        Ir al catálogo
      </RouterLink>
    </div>

    <div v-else class="space-y-4">
      <div v-for="pedido in pedidos" :key="pedido.id" class="card p-5">
        <div class="flex justify-between items-start flex-wrap gap-2">
          <div>
            <p class="font-semibold text-gray-800">Comprobante {{ pedido.numero }}</p>
            <p class="text-sm text-gray-500">{{ formatearFechaHora(pedido.creadoEn) }}</p>
          </div>
          <span :class="ESTADOS[pedido.estado]?.clase ?? 'badge-danger'">
            {{ ESTADOS[pedido.estado]?.etiqueta ?? pedido.estado }}
          </span>
        </div>

        <p class="text-sm text-gray-600 mt-2">{{ MENSAJES[pedido.estado] ?? '' }}</p>

        <!-- Indicador de progreso: solo para pedidos que siguen el circuito
             normal. Un pedido cancelado no "avanza", asi que se muestra
             aparte, como un flujo detenido y no como un paso mas. -->
        <div v-if="pedido.estado === 'cancelado'" class="mt-4 flex items-center gap-2.5 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">
          <i class="fa-solid fa-circle-xmark text-base"></i>
          <span class="font-medium">Pedido cancelado — no continua el circuito habitual</span>
        </div>

        <ol v-else class="mt-5 flex items-start">
          <li v-for="(paso, indice) in pasosDe(pedido)" :key="paso.clave" class="flex-1 flex flex-col items-center text-center px-1">
            <div class="flex items-center w-full">
              <div
                class="flex-1 h-0.5"
                :class="[indice === 0 ? 'invisible' : '', pasosDe(pedido)[indice - 1]?.estado === 'completado' || paso.estado !== 'pendiente' ? 'bg-accent-400' : 'bg-gray-200']"
              ></div>
              <div
                class="h-7 w-7 sm:h-8 sm:w-8 rounded-full flex items-center justify-center text-xs shrink-0 border-2"
                :class="{
                  'bg-accent-400 border-accent-400 text-white': paso.estado === 'completado',
                  'bg-white border-primary-600 text-primary-600': paso.estado === 'actual',
                  'bg-white border-gray-200 text-gray-300': paso.estado === 'pendiente',
                }"
              >
                <i v-if="paso.estado === 'completado'" class="fa-solid fa-check"></i>
                <i v-else-if="paso.estado === 'actual'" class="fa-solid fa-circle text-[8px]"></i>
                <span v-else>{{ indice + 1 }}</span>
              </div>
              <div
                class="flex-1 h-0.5"
                :class="[indice === 3 ? 'invisible' : '', paso.estado === 'completado' ? 'bg-accent-400' : 'bg-gray-200']"
              ></div>
            </div>
            <span
              class="text-[11px] sm:text-xs mt-1.5 leading-tight"
              :class="[
                paso.estado === 'pendiente' ? 'text-gray-400' : 'text-gray-700',
                { 'font-semibold': paso.estado === 'actual' },
              ]"
            >
              {{ paso.etiqueta }}
            </span>
          </li>
        </ol>

        <ul class="mt-5 text-sm divide-y divide-gray-100">
          <li v-for="item in pedido.items" :key="item.id" class="py-1.5 flex justify-between text-gray-600">
            <span>{{ item.cantidad }} x {{ item.nombreProducto }}</span>
            <span>${{ item.subtotal }}</span>
          </li>
        </ul>

        <div class="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
          <button
            class="btn-outline text-sm !px-3 !py-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="repitiendoId === pedido.id"
            @click="repetirPedido(pedido)"
          >
            <i class="fa-solid fa-rotate-right mr-1.5" :class="{ 'fa-spin': repitiendoId === pedido.id }"></i>
            Repetir pedido
          </button>
          <p class="font-bold text-gray-800">Total: <span class="text-primary-700">${{ pedido.total }}</span></p>
        </div>
      </div>
    </div>
  </div>
</template>
