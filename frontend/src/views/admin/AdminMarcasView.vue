<script setup>
import { computed, onMounted, ref } from 'vue'
import api from '../../services/api'
import Paginador from '../../components/Paginador.vue'
import { usePaginadoCliente } from '../../composables/usePaginadoCliente'
import { useNotificacionesStore } from '../../stores/notificaciones'
import { imagenMarca, alFallarImagen } from '../../utils/imagenCatalogo'

const notificaciones = useNotificacionesStore()

const marcas = ref([])
const form = ref({ nombre: '', descripcion: '' })
const archivoImagen = ref(null)
const editandoId = ref(null)
const error = ref('')
const busqueda = ref('')
const panelAbierto = ref(false)

function nuevaMarca() {
  cancelarEdicion()
  panelAbierto.value = true
}

const marcasFiltradas = computed(() => {
  const texto = busqueda.value.trim().toLowerCase()
  if (!texto) return marcas.value
  return marcas.value.filter((m) => m.nombre?.toLowerCase().includes(texto))
})

const { pagina, totalPaginas, itemsPagina: marcasPagina, irAPagina } = usePaginadoCliente(marcasFiltradas, 8)

async function cargar() {
  const { data } = await api.get('/marcas')
  marcas.value = data
}

function editar(marca) {
  editandoId.value = marca.id
  form.value = { nombre: marca.nombre, descripcion: marca.descripcion || '' }
  panelAbierto.value = true
}

function cancelarEdicion() {
  editandoId.value = null
  form.value = { nombre: '', descripcion: '' }
  archivoImagen.value = null
  panelAbierto.value = false
}

function onArchivoSeleccionado(evento) {
  archivoImagen.value = evento.target.files[0] || null
}

async function guardar() {
  error.value = ''
  const creando = !editandoId.value

  const datos = new FormData()
  Object.entries(form.value).forEach(([clave, valor]) => datos.append(clave, valor))
  if (archivoImagen.value) datos.append('imagen', archivoImagen.value)

  try {
    if (editandoId.value) {
      await api.patch(`/marcas/${editandoId.value}`, datos)
    } else {
      await api.post('/marcas', datos)
    }
    cancelarEdicion()
    await cargar()
    notificaciones.exito(creando ? 'Marca creada correctamente.' : 'Marca actualizada correctamente.')
  } catch (e) {
    error.value = e.response?.data?.message || 'No se pudo guardar la marca.'
  }
}

async function eliminar(marca) {
  if (!confirm(`Eliminar/dar de baja "${marca.nombre}"?`)) return
  try {
    const { data } = await api.delete(`/marcas/${marca.id}`)
    await cargar()
    notificaciones.exito(data.mensaje)
  } catch (e) {
    notificaciones.error(e.response?.data?.message || 'No se pudo eliminar la marca.')
  }
}

// Reactivar reutiliza el mismo PATCH que ya usa guardar() para editar: el
// backend acepta "activa" en el body (ver ActualizarMarcaDto). Se manda
// como FormData, igual que el resto de este endpoint.
async function reactivar(marca) {
  try {
    const datos = new FormData()
    datos.append('activa', 'true')
    await api.patch(`/marcas/${marca.id}`, datos)
    await cargar()
    notificaciones.exito(`Marca "${marca.nombre}" reactivada.`)
  } catch (e) {
    notificaciones.error(e.response?.data?.message || 'No se pudo reactivar la marca.')
  }
}

onMounted(cargar)
</script>

<template>
  <div>
    <div class="admin-toolbar">
      <h1 class="page-title">Marcas</h1>
      <button v-if="!panelAbierto" type="button" class="btn-primary flex items-center gap-2 shrink-0" @click="nuevaMarca">
        <i class="fa-solid fa-plus"></i>
        Nueva marca
      </button>
    </div>

    <transition name="panel">
      <form v-if="panelAbierto" @submit.prevent="guardar" class="card p-5 mb-6 flex gap-3 items-end flex-wrap">
        <div class="w-full flex items-center justify-between -mb-1">
          <h2 class="section-title text-base">{{ editandoId ? 'Editar marca' : 'Nueva marca' }}</h2>
        </div>
        <div>
          <label class="field-label">Nombre</label>
          <input v-model="form.nombre" required class="input-field" />
        </div>
        <div class="flex-1 min-w-48">
          <label class="field-label">Descripción</label>
          <input v-model="form.descripcion" class="input-field" />
        </div>
        <div>
          <label class="field-label">Logo (opcional)</label>
          <input type="file" accept="image/*" @change="onArchivoSeleccionado" class="file-field" />
        </div>
        <button type="submit" class="btn-primary flex items-center gap-2">
          <i class="fa-solid" :class="editandoId ? 'fa-check' : 'fa-plus'"></i>
          {{ editandoId ? 'Guardar cambios' : 'Crear marca' }}
        </button>
        <button type="button" @click="cancelarEdicion" class="btn-outline">
          Cancelar
        </button>
      </form>
    </transition>
    <p v-if="error" class="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2 mb-4">{{ error }}</p>

    <div class="relative mb-4 max-w-sm">
      <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
      <input v-model="busqueda" type="text" placeholder="Buscar marca..." class="input-field pl-9" />
    </div>

    <div class="card overflow-hidden overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 text-left">
          <tr>
            <th class="table-head-cell">Logo</th>
            <th class="table-head-cell">Nombre</th>
            <th class="table-head-cell">Descripción</th>
            <th class="table-head-cell">Estado</th>
            <th class="table-head-cell text-right">Acciones</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="m in marcasPagina" :key="m.id" class="hover:bg-gray-50/60">
            <td class="p-3">
              <img
                :src="imagenMarca(m)"
                @error="alFallarImagen($event, 'marca')"
                :alt="m.nombre"
                class="w-9 h-9 object-contain rounded"
              />
            </td>
            <td class="p-3 font-medium text-gray-800">{{ m.nombre }}</td>
            <td class="p-3 text-gray-500">{{ m.descripcion }}</td>
            <td class="p-3">
              <span :class="m.activa ? 'badge-success' : 'badge-danger'">{{ m.activa ? 'Activa' : 'Inactiva' }}</span>
            </td>
            <td class="p-3 text-right">
              <div class="flex justify-end gap-1.5">
                <button @click="editar(m)" class="btn-ghost-icon" title="Editar marca" aria-label="Editar marca">
                  <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button
                  v-if="m.activa"
                  @click="eliminar(m)"
                  class="btn-ghost-icon hover:!bg-red-50 hover:!text-red-600"
                  title="Eliminar marca"
                  aria-label="Eliminar marca"
                >
                  <i class="fa-solid fa-trash"></i>
                </button>
                <button
                  v-else
                  @click="reactivar(m)"
                  class="btn-ghost-icon hover:!bg-accent-50 hover:!text-accent-700"
                  title="Reactivar marca"
                  aria-label="Reactivar marca"
                >
                  <i class="fa-solid fa-rotate-left"></i>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="marcasFiltradas.length === 0" class="empty-state">
        <i class="fa-solid fa-copyright empty-state-icon"></i>
        {{ busqueda ? 'No se encontraron marcas.' : 'Todavía no hay marcas cargadas.' }}
      </p>
    </div>
    <Paginador :pagina="pagina" :total-paginas="totalPaginas" @cambiar="irAPagina" />
  </div>
</template>
