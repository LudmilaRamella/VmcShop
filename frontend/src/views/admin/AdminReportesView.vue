<script setup>
import { onMounted, ref } from 'vue'
import api from '../../services/api'

const filtros = ref({ desde: '', hasta: '' })
const ventas = ref(null)
const productosMasVendidos = ref([])
const clientesFrecuentes = ref([])
const cargando = ref(true)
const error = ref('')

async function cargar() {
  cargando.value = true
  error.value = ''
  const params = {}
  if (filtros.value.desde) params.desde = filtros.value.desde
  if (filtros.value.hasta) params.hasta = filtros.value.hasta

  try {
    const [r1, r2, r3] = await Promise.all([
      api.get('/reportes/ventas', { params }),
      api.get('/reportes/productos-mas-vendidos', { params }),
      api.get('/reportes/clientes-frecuentes', { params }),
    ])
    ventas.value = r1.data
    productosMasVendidos.value = r2.data
    clientesFrecuentes.value = r3.data
  } catch {
    error.value = 'No pudimos cargar los reportes. Intentá nuevamente.'
  } finally {
    cargando.value = false
  }
}

onMounted(cargar)
</script>

<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">Reportes</h1>
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
      <button @click="cargar" class="btn-primary flex items-center gap-2">
        <i class="fa-solid fa-filter"></i>
        Aplicar
      </button>
    </div>

    <p v-if="cargando" class="text-gray-500"><i class="fa-solid fa-circle-notch fa-spin mr-2"></i>Cargando reportes...</p>

    <div v-else-if="error" class="card empty-state">
      <i class="fa-solid fa-triangle-exclamation empty-state-icon"></i>
      <p class="font-medium text-gray-600">{{ error }}</p>
      <button @click="cargar" class="btn-outline inline-flex items-center gap-2 mt-4">
        <i class="fa-solid fa-rotate-right"></i>
        Reintentar
      </button>
    </div>

    <template v-else>
      <div class="grid sm:grid-cols-2 gap-4 mb-6">
        <div class="card p-5 flex items-center gap-4">
          <div class="w-11 h-11 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center text-lg shrink-0">
            <i class="fa-solid fa-clipboard-list"></i>
          </div>
          <div>
            <p class="text-sm text-gray-500">Pedidos confirmados</p>
            <p class="text-3xl font-bold text-gray-800">{{ ventas?.cantidadPedidos ?? 0 }}</p>
          </div>
        </div>
        <div class="card p-5 bg-primary-700 border-primary-700 flex items-center gap-4">
          <div class="w-11 h-11 rounded-lg bg-white/10 text-accent-300 flex items-center justify-center text-lg shrink-0">
            <i class="fa-solid fa-sack-dollar"></i>
          </div>
          <div>
            <p class="text-sm text-white/70">Total vendido</p>
            <p class="text-3xl font-bold text-accent-300">${{ ventas?.totalVendido ?? 0 }}</p>
          </div>
        </div>
      </div>

      <div class="grid md:grid-cols-2 gap-6">
        <div class="card p-5">
          <h2 class="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <i class="fa-solid fa-trophy text-accent-500"></i>
            Productos más vendidos
          </h2>
          <table class="w-full text-sm">
            <thead class="text-left text-gray-400">
              <tr>
                <th class="pb-2 font-medium">Producto</th>
                <th class="pb-2 font-medium text-right">Unidades</th>
                <th class="pb-2 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="p in productosMasVendidos" :key="p.productoId">
                <td class="py-1.5 text-gray-800">{{ p.nombre }}</td>
                <td class="py-1.5 text-gray-600 text-right tabular-nums">{{ p.unidadesVendidas }}</td>
                <td class="py-1.5 text-gray-600 text-right tabular-nums">${{ p.totalVendido }}</td>
              </tr>
            </tbody>
          </table>
          <p v-if="productosMasVendidos.length === 0" class="text-gray-400 text-sm">Sin datos.</p>
        </div>

        <div class="card p-5">
          <h2 class="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <i class="fa-solid fa-users text-accent-500"></i>
            Clientes frecuentes
          </h2>
          <table class="w-full text-sm">
            <thead class="text-left text-gray-400">
              <tr>
                <th class="pb-2 font-medium">Cliente</th>
                <th class="pb-2 font-medium text-right">Pedidos</th>
                <th class="pb-2 font-medium text-right">Gastado</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="c in clientesFrecuentes" :key="c.usuarioId">
                <td class="py-1.5 text-gray-800">{{ c.nombre }}</td>
                <td class="py-1.5 text-gray-600 text-right tabular-nums">{{ c.cantidadPedidos }}</td>
                <td class="py-1.5 text-gray-600 text-right tabular-nums">${{ c.totalGastado }}</td>
              </tr>
            </tbody>
          </table>
          <p v-if="clientesFrecuentes.length === 0" class="text-gray-400 text-sm">Sin datos.</p>
        </div>
      </div>
    </template>
  </div>
</template>
