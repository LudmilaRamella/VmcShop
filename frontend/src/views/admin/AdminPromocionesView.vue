<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import api from '../../services/api'
import Paginador from '../../components/Paginador.vue'
import { usePaginadoCliente } from '../../composables/usePaginadoCliente'
import { useNotificacionesStore } from '../../stores/notificaciones'
import { formatearFecha } from '../../utils/fecha'

const notificaciones = useNotificacionesStore()

const promociones = ref([])
const editandoId = ref(null)
const error = ref('')
const busqueda = ref('')
const panelAbierto = ref(false)

function nuevaPromocion() {
  cancelarEdicion()
  panelAbierto.value = true
}

const promocionesFiltradas = computed(() => {
  const texto = busqueda.value.trim().toLowerCase()
  if (!texto) return promociones.value
  return promociones.value.filter((p) => p.nombre?.toLowerCase().includes(texto))
})

const formInicial = () => ({
  nombre: '',
  descripcion: '',
  tipo: 'porcentaje',
  valor: '',
  alcance: 'producto',
  montoMinimo: '',
  cantidadMinima: '',
  fechaInicio: '',
  fechaFin: '',
  activa: true,
})
const form = ref(formInicial())

// Se guarda {id, nombre} y no solo el id: asi se puede mostrar el chip con
// el nombre sin depender de tener cargada la lista completa de productos
// (que puede superar largamente los que trae una sola pagina de busqueda).
const productosSeleccionados = ref([])

const { pagina, totalPaginas, itemsPagina: promocionesPagina, irAPagina } = usePaginadoCliente(promocionesFiltradas, 8)

async function cargar() {
  const { data } = await api.get('/promociones')
  promociones.value = data
}

function editar(promocion) {
  editandoId.value = promocion.id
  form.value = {
    nombre: promocion.nombre,
    descripcion: promocion.descripcion || '',
    tipo: promocion.tipo,
    valor: promocion.valor,
    alcance: promocion.alcance,
    montoMinimo: promocion.montoMinimo ?? '',
    cantidadMinima: promocion.cantidadMinima ?? '',
    fechaInicio: promocion.fechaInicio || '',
    fechaFin: promocion.fechaFin || '',
    activa: promocion.activa,
  }
  productosSeleccionados.value = (promocion.productos || []).map((p) => ({ id: p.id, nombre: p.nombre }))
  panelAbierto.value = true
}

function cancelarEdicion() {
  editandoId.value = null
  form.value = formInicial()
  productosSeleccionados.value = []
  panelAbierto.value = false
}

async function guardar() {
  error.value = ''

  if (form.value.alcance === 'producto' && productosSeleccionados.value.length === 0) {
    error.value = 'Elegi al menos un producto para esta promoción.'
    return
  }

  const creando = !editandoId.value

  const datos = {
    nombre: form.value.nombre,
    descripcion: form.value.descripcion || undefined,
    tipo: form.value.tipo,
    valor: form.value.valor,
    alcance: form.value.alcance,
    fechaInicio: form.value.fechaInicio || undefined,
    fechaFin: form.value.fechaFin || undefined,
    activa: form.value.activa,
  }

  if (form.value.alcance === 'producto') {
    datos.productosIds = productosSeleccionados.value.map((p) => p.id)
  } else {
    datos.montoMinimo = form.value.montoMinimo || undefined
    datos.cantidadMinima = form.value.cantidadMinima || undefined
  }

  try {
    if (editandoId.value) {
      await api.patch(`/promociones/${editandoId.value}`, datos)
    } else {
      await api.post('/promociones', datos)
    }
    cancelarEdicion()
    await cargar()
    notificaciones.exito(creando ? 'Promoción creada correctamente.' : 'Promoción actualizada correctamente.')
  } catch (e) {
    const mensaje = e.response?.data?.message
    error.value = Array.isArray(mensaje) ? mensaje.join(', ') : mensaje || 'No se pudo guardar la promoción.'
  }
}

async function eliminar(promocion) {
  if (!confirm(`Eliminar la promoción "${promocion.nombre}"?`)) return
  try {
    await api.delete(`/promociones/${promocion.id}`)
    await cargar()
    notificaciones.exito(`Promoción "${promocion.nombre}" eliminada.`)
  } catch (e) {
    notificaciones.error(e.response?.data?.message || 'No se pudo eliminar la promoción.')
  }
}

function textoValor(promocion) {
  return promocion.tipo === 'porcentaje' ? `${promocion.valor}%` : `$${promocion.valor}`
}

// --- Selector de productos (modal con buscador) ---
const selectorAbierto = ref(false)
const busquedaModal = ref('')
const resultadosModal = ref([])
const buscandoModal = ref(false)
let debounceId = null

function estaSeleccionado(id) {
  return productosSeleccionados.value.some((p) => p.id === id)
}

function toggleProducto(producto) {
  if (estaSeleccionado(producto.id)) {
    productosSeleccionados.value = productosSeleccionados.value.filter((p) => p.id !== producto.id)
  } else {
    productosSeleccionados.value.push({ id: producto.id, nombre: producto.nombre })
  }
}

function quitarProducto(id) {
  productosSeleccionados.value = productosSeleccionados.value.filter((p) => p.id !== id)
}

async function buscarProductosModal() {
  buscandoModal.value = true
  try {
    const { data } = await api.get('/productos', {
      params: { soloActivos: false, limite: 20, buscar: busquedaModal.value || undefined },
    })
    resultadosModal.value = data.items
  } finally {
    buscandoModal.value = false
  }
}

function abrirSelector() {
  selectorAbierto.value = true
  buscarProductosModal()
}

function cerrarSelector() {
  selectorAbierto.value = false
}

watch(busquedaModal, () => {
  clearTimeout(debounceId)
  debounceId = setTimeout(buscarProductosModal, 300)
})

onBeforeUnmount(() => clearTimeout(debounceId))
onMounted(cargar)
</script>

<template>
  <div>
    <div class="admin-toolbar">
      <h1 class="page-title">Promociones y descuentos</h1>
      <button v-if="!panelAbierto" type="button" class="btn-primary flex items-center gap-2 shrink-0" @click="nuevaPromocion">
        <i class="fa-solid fa-plus"></i>
        Nueva promoción
      </button>
    </div>

    <transition name="panel">
    <form v-if="panelAbierto" @submit.prevent="guardar" class="card p-5 mb-6 grid sm:grid-cols-2 gap-4">
      <div class="sm:col-span-2 flex items-center justify-between -mt-1 mb-1">
        <h2 class="section-title text-base">{{ editandoId ? 'Editar promoción' : 'Nueva promoción' }}</h2>
        <button type="button" @click="cancelarEdicion" class="btn-ghost-icon" title="Cerrar" aria-label="Cerrar formulario">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <div>
        <label class="field-label">Nombre</label>
        <input v-model="form.nombre" required class="input-field" />
      </div>
      <div>
        <label class="field-label">Alcance</label>
        <select v-model="form.alcance" class="input-field">
          <option value="producto">Producto/s específico/s</option>
          <option value="global">Global (sobre el total del pedido)</option>
        </select>
      </div>
      <div>
        <label class="field-label">Tipo de descuento</label>
        <select v-model="form.tipo" class="input-field">
          <option value="porcentaje">Porcentaje</option>
          <option value="monto_fijo">Monto fijo</option>
        </select>
      </div>
      <div>
        <label class="field-label">Valor {{ form.tipo === 'porcentaje' ? '(%)' : '($)' }}</label>
        <input
          v-model="form.valor"
          type="number"
          step="0.01"
          min="0.01"
          :max="form.tipo === 'porcentaje' ? 100 : undefined"
          required
          class="input-field"
        />
      </div>

      <template v-if="form.alcance === 'global'">
        <div>
          <label class="field-label">Monto mínimo del pedido (opcional)</label>
          <input v-model="form.montoMinimo" type="number" step="0.01" min="0" class="input-field" />
        </div>
        <div>
          <label class="field-label">Cantidad mínima de items (opcional)</label>
          <input v-model="form.cantidadMinima" type="number" min="1" class="input-field" />
        </div>
      </template>

      <div v-if="form.alcance === 'producto'" class="sm:col-span-2">
        <label class="field-label">Productos a los que aplica</label>
        <div class="flex flex-wrap gap-2 mb-2">
          <span
            v-for="p in productosSeleccionados"
            :key="p.id"
            class="inline-flex items-center gap-1.5 bg-primary-50 text-primary-700 text-xs font-medium px-2.5 py-1 rounded-full"
          >
            {{ p.nombre }}
            <button type="button" @click="quitarProducto(p.id)" class="text-primary-400 hover:text-primary-700">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </span>
          <p v-if="productosSeleccionados.length === 0" class="text-sm text-gray-400">
            Ningún producto seleccionado todavía.
          </p>
        </div>
        <button type="button" @click="abrirSelector" class="text-primary-700 text-sm font-medium hover:underline">
          <i class="fa-solid fa-magnifying-glass mr-1"></i> Buscar y agregar productos
        </button>
      </div>

      <div>
        <label class="field-label">Vigencia desde (opcional)</label>
        <input v-model="form.fechaInicio" type="date" class="input-field" />
      </div>
      <div>
        <label class="field-label">Vigencia hasta (opcional)</label>
        <input v-model="form.fechaFin" type="date" class="input-field" />
      </div>

      <div class="sm:col-span-2">
        <label class="field-label">Descripción (opcional)</label>
        <input v-model="form.descripcion" class="input-field" />
      </div>

      <div v-if="editandoId" class="sm:col-span-2">
        <label class="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" v-model="form.activa" />
          Promoción activa
        </label>
      </div>

      <p v-if="error" class="sm:col-span-2 text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{{ error }}</p>

      <div class="sm:col-span-2 flex gap-3">
        <button type="submit" class="btn-primary flex items-center gap-2">
          <i class="fa-solid" :class="editandoId ? 'fa-check' : 'fa-plus'"></i>
          {{ editandoId ? 'Guardar cambios' : 'Crear promoción' }}
        </button>
        <button type="button" @click="cancelarEdicion" class="btn-outline">
          Cancelar
        </button>
      </div>
    </form>
    </transition>

    <div class="relative mb-4 max-w-sm">
      <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
      <input v-model="busqueda" type="text" placeholder="Buscar promoción..." class="input-field pl-9" />
    </div>

    <div class="card overflow-hidden overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 text-left">
          <tr>
            <th class="table-head-cell">Nombre</th>
            <th class="table-head-cell">Alcance</th>
            <th class="table-head-cell text-right">Descuento</th>
            <th class="table-head-cell">Vigencia</th>
            <th class="table-head-cell">Estado</th>
            <th class="table-head-cell text-right">Acciones</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="promo in promocionesPagina" :key="promo.id" class="hover:bg-gray-50/60">
            <td class="p-3 font-medium text-gray-800">{{ promo.nombre }}</td>
            <td class="p-3 text-gray-500">
              {{ promo.alcance === 'global' ? 'Global' : `${promo.productos?.length || 0} producto/s` }}
            </td>
            <td class="p-3 text-gray-800 text-right tabular-nums">{{ textoValor(promo) }}</td>
            <td class="p-3 text-gray-500">
              <span v-if="promo.fechaInicio || promo.fechaFin">
                {{ formatearFecha(promo.fechaInicio) || 'sin inicio' }} - {{ formatearFecha(promo.fechaFin) || 'sin fin' }}
              </span>
              <span v-else>Sin límite</span>
            </td>
            <td class="p-3">
              <span :class="promo.activa ? 'badge-success' : 'badge-danger'">{{ promo.activa ? 'Activa' : 'Inactiva' }}</span>
            </td>
            <td class="p-3 text-right">
              <div class="flex justify-end gap-1.5">
                <button @click="editar(promo)" class="btn-ghost-icon" title="Editar promoción" aria-label="Editar promoción">
                  <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button
                  @click="eliminar(promo)"
                  class="btn-ghost-icon hover:!bg-red-50 hover:!text-red-600"
                  title="Eliminar promoción"
                  aria-label="Eliminar promoción"
                >
                  <i class="fa-solid fa-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="promocionesFiltradas.length === 0" class="empty-state">
        <i class="fa-solid fa-tags empty-state-icon"></i>
        {{ busqueda ? 'No se encontraron promociones.' : 'Todavía no hay promociones cargadas.' }}
      </p>
    </div>
    <Paginador :pagina="pagina" :total-paginas="totalPaginas" @cambiar="irAPagina" />

    <div
      v-if="selectorAbierto"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-30 p-4"
      @click.self="cerrarSelector"
    >
      <div class="card w-full max-w-lg max-h-[80vh] flex flex-col">
        <div class="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 class="font-semibold text-gray-800">Elegir productos</h2>
          <button type="button" @click="cerrarSelector" class="btn-ghost-icon" title="Cerrar" aria-label="Cerrar selector de productos">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div class="p-4 border-b border-gray-100">
          <div class="relative">
            <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
            <input v-model="busquedaModal" type="text" placeholder="Buscar productos..." class="input-field pl-9" />
          </div>
          <p class="text-xs text-gray-400 mt-2">{{ productosSeleccionados.length }} producto/s seleccionado/s</p>
        </div>
        <div class="flex-1 overflow-y-auto divide-y divide-gray-100">
          <label
            v-for="p in resultadosModal"
            :key="p.id"
            class="flex items-center gap-3 p-3 hover:bg-gray-50/60 cursor-pointer"
          >
            <input type="checkbox" :checked="estaSeleccionado(p.id)" @change="toggleProducto(p)" />
            <span class="flex-1 text-sm text-gray-800">{{ p.nombre }}</span>
            <span class="text-xs text-gray-400">${{ p.precio }}</span>
          </label>
          <p v-if="!buscandoModal && resultadosModal.length === 0" class="p-6 text-center text-gray-400 text-sm">
            No se encontraron productos.
          </p>
        </div>
        <div class="p-4 border-t border-gray-100 flex justify-end">
          <button type="button" @click="cerrarSelector" class="btn-primary">Listo</button>
        </div>
      </div>
    </div>
  </div>
</template>
