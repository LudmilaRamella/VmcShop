<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import api from '../../services/api'
import socket from '../../services/socket'
import Paginador from '../../components/Paginador.vue'
import { usePaginadoCliente } from '../../composables/usePaginadoCliente'
import { useNotificacionesStore } from '../../stores/notificaciones'
import { formatearFechaHora } from '../../utils/fecha'

const notificaciones = useNotificacionesStore()

const pedidos = ref([])
const filtros = ref({ desde: '', hasta: '', estado: '' })
const expandidoId = ref(null) // id del pedido cuyo detalle esta abierto (uno solo a la vez)

const { pagina, totalPaginas, itemsPagina: pedidosPagina, irAPagina } = usePaginadoCliente(pedidos, 8)

// Config visual por estado: clase de badge y etiqueta legible. En un solo
// lugar para no repetir el mapeo en cada template.
const ESTADOS = {
  confirmado: { clase: 'badge-warning', etiqueta: 'Confirmado' },
  en_preparacion: { clase: 'badge-info', etiqueta: 'En preparación' },
  listo: { clase: 'badge-primary', etiqueta: 'Listo para retirar' },
  entregado: { clase: 'badge-success', etiqueta: 'Entregado' },
  cancelado: { clase: 'badge-danger', etiqueta: 'Cancelado' },
}

// Estados desde los que todavia tiene sentido cancelar (no entregado, no ya
// cancelado). Es solo ayuda de UI: la regla real la aplica PedidosService.
const ESTADOS_CANCELABLES = ['confirmado', 'en_preparacion', 'listo']

async function cargar() {
  const params = {}
  if (filtros.value.desde) params.desde = filtros.value.desde
  if (filtros.value.hasta) params.hasta = filtros.value.hasta
  if (filtros.value.estado) params.estado = filtros.value.estado

  const { data } = await api.get('/pedidos', { params })
  pedidos.value = data
}

function alternarDetalle(pedido) {
  expandidoId.value = expandidoId.value === pedido.id ? null : pedido.id
}

async function prepararPedido(pedido) {
  try {
    await api.patch(`/pedidos/${pedido.id}/preparar`)
    await cargar()
    notificaciones.exito(`Pedido ${pedido.numero} enviado a preparación.`)
  } catch (e) {
    notificaciones.error(e.response?.data?.message || 'No se pudo actualizar el pedido.')
  }
}

async function marcarListo(pedido) {
  try {
    await api.patch(`/pedidos/${pedido.id}/listo`)
    await cargar()
    notificaciones.exito(`Pedido ${pedido.numero} marcado como listo para retirar.`)
  } catch (e) {
    notificaciones.error(e.response?.data?.message || 'No se pudo actualizar el pedido.')
  }
}

async function entregarPedido(pedido) {
  try {
    await api.patch(`/pedidos/${pedido.id}/entregar`)
    await cargar()
    notificaciones.exito(`Pedido ${pedido.numero} marcado como entregado.`)
  } catch (e) {
    notificaciones.error(e.response?.data?.message || 'No se pudo actualizar el pedido.')
  }
}

async function cancelar(pedido) {
  if (!confirm(`Cancelar el pedido ${pedido.numero}? Se repone el stock.`)) return
  try {
    await api.patch(`/pedidos/${pedido.id}/cancelar`)
    await cargar()
    notificaciones.exito(`Pedido ${pedido.numero} cancelado correctamente.`)
  } catch (e) {
    notificaciones.error(e.response?.data?.message || 'No se pudo cancelar el pedido.')
  }
}

onMounted(() => {
  cargar()
  // Si otro admin (u otra pestaña) cambia el estado de un pedido, esta
  // vista se refresca sola. Reutiliza el mismo canal de tiempo real que ya
  // existe para avisar cambios de catalogo.
  socket.on('pedido:cambio', cargar)
})
onUnmounted(() => socket.off('pedido:cambio', cargar))
</script>

<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">Pedidos</h1>
    </div>

    <div class="card p-5 mb-6 flex flex-wrap gap-3 items-end">
      <div>
        <label class="field-label">Desde</label>
        <input v-model="filtros.desde" type="date" class="input-field" />
      </div>
      <div>
        <label class="field-label">Hasta</label>
        <input v-model="filtros.hasta" type="date" class="input-field" />
      </div>
      <div>
        <label class="field-label">Estado</label>
        <select v-model="filtros.estado" class="input-field">
          <option value="">Todos</option>
          <option value="confirmado">Confirmado</option>
          <option value="en_preparacion">En preparación</option>
          <option value="listo">Listo para retirar</option>
          <option value="entregado">Entregado</option>
          <option value="cancelado">Cancelado</option>
        </select>
      </div>
      <button @click="cargar" class="btn-primary flex items-center gap-2">
        <i class="fa-solid fa-filter"></i>
        Filtrar
      </button>
    </div>

    <div class="space-y-3">
      <div v-for="pedido in pedidosPagina" :key="pedido.id" class="card p-5">
        <div class="flex justify-between items-start flex-wrap gap-2">
          <button class="text-left" :aria-expanded="expandidoId === pedido.id" @click="alternarDetalle(pedido)">
            <p class="font-semibold text-gray-800 hover:underline">
              <i class="fa-solid" :class="expandidoId === pedido.id ? 'fa-chevron-down' : 'fa-chevron-right'"></i>
              {{ pedido.numero }} — {{ pedido.usuario?.nombre }} {{ pedido.usuario?.apellido }}
            </p>
            <p class="text-sm text-gray-500">{{ pedido.usuario?.email }} · {{ formatearFechaHora(pedido.creadoEn) }}</p>
          </button>
          <div class="flex items-center gap-3 flex-wrap">
            <span :class="ESTADOS[pedido.estado]?.clase ?? 'badge-danger'">
              {{ ESTADOS[pedido.estado]?.etiqueta ?? pedido.estado }}
            </span>
            <span class="font-bold text-gray-800">${{ pedido.total }}</span>

            <button v-if="pedido.estado === 'confirmado'" @click="prepararPedido(pedido)" class="btn-info-text text-sm flex items-center gap-1">
              <i class="fa-solid fa-box"></i>
              Enviar a preparación
            </button>
            <button v-if="pedido.estado === 'en_preparacion'" @click="marcarListo(pedido)" class="btn-info-text text-sm flex items-center gap-1">
              <i class="fa-solid fa-box-open"></i>
              Marcar listo
            </button>
            <button v-if="pedido.estado === 'listo'" @click="entregarPedido(pedido)" class="btn-info-text text-sm flex items-center gap-1">
              <i class="fa-solid fa-truck"></i>
              Marcar entregado
            </button>
            <button
              v-if="ESTADOS_CANCELABLES.includes(pedido.estado)"
              @click="cancelar(pedido)"
              class="btn-danger-text text-sm"
            >
              <i class="fa-solid fa-ban"></i>
              Cancelar
            </button>
          </div>
        </div>

        <div v-if="expandidoId === pedido.id" class="mt-4 pt-4 border-t border-gray-100">
          <ul class="text-sm divide-y divide-gray-100">
            <li v-for="item in pedido.items" :key="item.id" class="py-1.5 flex justify-between text-gray-600">
              <span>{{ item.cantidad }} x {{ item.nombreProducto }} (${{ item.precioUnitario }} c/u)</span>
              <span>${{ item.subtotal }}</span>
            </li>
          </ul>
          <p v-if="pedido.observaciones" class="text-sm text-gray-500 mt-2">
            <span class="font-medium">Observaciones:</span> {{ pedido.observaciones }}
          </p>
          <dl class="text-sm text-gray-600 mt-3 space-y-1">
            <div class="flex justify-between"><dt>Subtotal</dt><dd>${{ pedido.subtotal }}</dd></div>
            <div class="flex justify-between"><dt>Descuento</dt><dd>-${{ pedido.descuento }}</dd></div>
            <div class="flex justify-between font-bold text-gray-800 pt-1 border-t border-gray-100"><dt>Total</dt><dd>${{ pedido.total }}</dd></div>
          </dl>
        </div>
      </div>
      <div v-if="pedidos.length === 0" class="card empty-state">
        <i class="fa-solid fa-clipboard-list empty-state-icon"></i>
        No hay pedidos para los filtros seleccionados.
      </div>
    </div>
    <Paginador :pagina="pagina" :total-paginas="totalPaginas" @cambiar="irAPagina" />
  </div>
</template>
