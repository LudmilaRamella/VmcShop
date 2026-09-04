<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useCarritoStore } from '../stores/carrito'
import { useNotificacionesStore } from '../stores/notificaciones'
import socket from '../services/socket'
import { imagenProducto, alFallarImagen } from '../utils/imagenCatalogo'

const carrito = useCarritoStore()
const notificaciones = useNotificacionesStore()

const confirmando = ref(false)
const error = ref('')
const comprobante = ref(null)

onMounted(() => carrito.cargar())

// Si el cliente deja esta pestana en segundo plano y vuelve (por ejemplo,
// despues de estar un rato en otra pestana), se vuelve a pedir el carrito
// para traer los avisos de stock/estado que hayan cambiado mientras tanto,
// en vez de esperar a que falle la confirmacion de compra para enterarse.
function alVolverALaPestana() {
  if (document.visibilityState === 'visible' && !comprobante.value) {
    carrito.cargar()
  }
}
document.addEventListener('visibilitychange', alVolverALaPestana)
onUnmounted(() => document.removeEventListener('visibilitychange', alVolverALaPestana))

// Un admin puede dar de baja o modificar (precio, stock) un producto que
// este en este carrito desde otra sesion, en cualquier momento. El backend
// avisa por este canal y se vuelve a pedir el carrito al toque, sin esperar
// a que el cliente reintente confirmar la compra para enterarse.
function alCambiarUnProducto() {
  if (!comprobante.value) carrito.cargar()
}
socket.on('producto:cambio', alCambiarUnProducto)
onUnmounted(() => socket.off('producto:cambio', alCambiarUnProducto))

// Cantidad maxima permitida: el stock disponible del producto. Se limita
// tanto al escribir en el input como al hacer click en "+", para no dejar
// pedir un pedido que despues el backend va a rechazar igual.
async function cambiarCantidad(item, cantidad) {
  if (cantidad < 1) return
  const cantidadFinal = Math.min(cantidad, item.producto.stock)
  if (cantidadFinal === item.cantidad) return
  try {
    await carrito.actualizarCantidad(item.id, cantidadFinal)
  } catch (e) {
    notificaciones.error(e.response?.data?.message || 'No se pudo actualizar la cantidad.')
    await carrito.cargar() // vuelve a traer el carrito para descartar el cambio que no se aplico
  }
}

function onInputCantidad(item, evento) {
  const valor = Number(evento.target.value)
  if (!Number.isInteger(valor) || valor < 1) {
    evento.target.value = item.cantidad
    return
  }
  cambiarCantidad(item, valor)
}

async function confirmar() {
  error.value = ''
  confirmando.value = true
  try {
    const resultado = await carrito.confirmarCompra()
    comprobante.value = resultado.pedido
  } catch (e) {
    error.value = e.response?.data?.message || 'No se pudo confirmar la compra.'
    await carrito.cargar() // resincroniza el carrito: puede haber quedado desactualizado (stock o estado de un producto cambio mientras tanto)
  } finally {
    confirmando.value = false
  }
}
</script>

<template>
  <div v-if="comprobante" class="max-w-md mx-auto card p-8 text-center mt-6">
    <div class="w-14 h-14 rounded-full bg-accent-50 text-accent-600 flex items-center justify-center mx-auto mb-4 text-2xl">
      <i class="fa-solid fa-check"></i>
    </div>
    <h1 class="text-xl font-bold text-gray-800 mb-1">Compra confirmada</h1>
    <p class="text-gray-500 mb-4">Comprobante N° {{ comprobante.numero }}</p>
    <p class="text-3xl font-bold text-primary-700 mb-6">${{ Number(comprobante.total).toFixed(2) }}</p>
    <RouterLink to="/mis-pedidos" class="btn-primary inline-block">Ver mis pedidos</RouterLink>
  </div>

  <div v-else>
    <div class="page-header">
      <h1 class="page-title">Mi carrito</h1>
    </div>

    <ul v-if="carrito.avisos.length" class="mb-4 space-y-2">
      <li
        v-for="(aviso, i) in carrito.avisos"
        :key="i"
        class="text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3.5 py-2.5 text-sm flex items-start gap-2"
      >
        <i class="fa-solid fa-circle-info mt-0.5 shrink-0"></i>
        {{ aviso }}
      </li>
    </ul>

    <div v-if="carrito.items.length === 0" class="card empty-state">
      <i class="fa-solid fa-cart-shopping empty-state-icon"></i>
      <p class="font-medium text-gray-600">Tu carrito está vacío.</p>
      <RouterLink to="/catalogo" class="btn-primary inline-flex items-center gap-2 mt-4">
        <i class="fa-solid fa-store"></i>
        Ir al catálogo
      </RouterLink>
    </div>

    <div v-else class="grid md:grid-cols-3 gap-6 items-start">
      <div class="md:col-span-2">
        <h2 class="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
          Productos ({{ carrito.items.length }})
        </h2>
        <div class="space-y-3">
          <div v-for="item in carrito.items" :key="item.id" class="card p-3 flex flex-wrap sm:flex-nowrap items-center gap-3">
            <img
              :src="imagenProducto(item.producto)"
              @error="alFallarImagen($event, 'producto')"
              :alt="item.producto.nombre"
              class="w-16 h-16 object-cover rounded-lg shrink-0"
            />

            <div class="flex-1 min-w-[9rem]">
              <p class="font-medium text-gray-800 truncate">{{ item.producto.nombre }}</p>
              <p class="text-sm text-gray-500">${{ item.precioUnitario }} c/u</p>
              <p v-if="item.descuento > 0" class="text-xs text-accent-600 font-medium">
                Descuento aplicado: -${{ item.descuento }}
              </p>
            </div>

            <div class="flex items-center justify-between gap-3 w-full sm:w-auto order-3 sm:order-none">
              <div class="flex flex-col items-center gap-1 shrink-0">
                <div class="flex items-center gap-2">
                  <button
                    @click="cambiarCantidad(item, item.cantidad - 1)"
                    aria-label="Restar una unidad"
                    class="w-7 h-7 border border-gray-300 rounded-md hover:bg-gray-50 text-gray-600 flex items-center justify-center text-xs"
                  >
                    <i class="fa-solid fa-minus"></i>
                  </button>
                  <input
                    type="number"
                    :value="item.cantidad"
                    @change="onInputCantidad(item, $event)"
                    min="1"
                    :max="item.producto.stock"
                    aria-label="Cantidad"
                    class="w-14 text-center font-medium input-field py-1"
                  />
                  <button
                    @click="cambiarCantidad(item, item.cantidad + 1)"
                    :disabled="item.cantidad >= item.producto.stock"
                    aria-label="Sumar una unidad"
                    class="w-7 h-7 border border-gray-300 rounded-md hover:bg-gray-50 text-gray-600 flex items-center justify-center text-xs disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    <i class="fa-solid fa-plus"></i>
                  </button>
                </div>
                <span class="text-xs text-gray-400">{{ item.producto.stock }} disponibles</span>
              </div>

              <p class="w-16 text-right font-semibold text-gray-800 shrink-0">${{ item.subtotal }}</p>

              <button
                @click="carrito.eliminar(item.id)"
                title="Quitar del carrito"
                aria-label="Quitar del carrito"
                class="btn-ghost-icon hover:!bg-red-50 hover:!text-red-600 shrink-0"
              >
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="card p-5 h-fit space-y-2.5 sticky top-20">
        <h2 class="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Resumen de compra</h2>
        <div class="flex justify-between text-sm text-gray-600">
          <span>Subtotal</span>
          <span>${{ carrito.totales?.subtotal }}</span>
        </div>
        <div v-if="carrito.totales?.descuentoGlobal > 0" class="flex justify-between text-sm text-accent-600 font-medium">
          <span>Descuento</span>
          <span>-${{ carrito.totales.descuentoGlobal }}</span>
        </div>
        <div class="flex justify-between text-sm text-gray-400">
          <span>IVA incluido</span>
          <span>${{ carrito.totales?.impuestos }}</span>
        </div>
        <div class="flex justify-between items-center font-bold text-gray-800 bg-primary-50 -mx-5 px-5 py-3 mt-1">
          <span class="text-sm uppercase tracking-wide text-primary-700">Total</span>
          <span class="text-2xl text-primary-700">${{ carrito.totales?.total }}</span>
        </div>

        <p v-if="error" class="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2 flex items-start gap-2">
          <i class="fa-solid fa-circle-exclamation mt-0.5 shrink-0"></i>
          {{ error }}
        </p>

        <button @click="confirmar" :disabled="confirmando" class="btn-primary w-full mt-2 flex items-center justify-center gap-2">
          <i class="fa-solid" :class="confirmando ? 'fa-circle-notch fa-spin' : 'fa-lock'"></i>
          {{ confirmando ? 'Confirmando...' : 'Confirmar compra' }}
        </button>
      </div>
    </div>
  </div>
</template>
