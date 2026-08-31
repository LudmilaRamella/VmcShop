<script setup>
import { computed, onMounted, ref } from 'vue'
import api from '../../services/api'
import Paginador from '../../components/Paginador.vue'
import { usePaginadoCliente } from '../../composables/usePaginadoCliente'
import { useNotificacionesStore } from '../../stores/notificaciones'

const notificaciones = useNotificacionesStore()

const categorias = ref([])
const form = ref({ nombre: '', descripcion: '' })
const archivoImagen = ref(null)
const editandoId = ref(null)
const error = ref('')
const busqueda = ref('')
const panelAbierto = ref(false)

function nuevaCategoria() {
  cancelarEdicion()
  panelAbierto.value = true
}

const categoriasFiltradas = computed(() => {
  const texto = busqueda.value.trim().toLowerCase()
  if (!texto) return categorias.value
  return categorias.value.filter((c) => c.nombre?.toLowerCase().includes(texto))
})

const { pagina, totalPaginas, itemsPagina: categoriasPagina, irAPagina } = usePaginadoCliente(categoriasFiltradas, 8)

async function cargar() {
  const { data } = await api.get('/categorias')
  categorias.value = data
}

function editar(categoria) {
  editandoId.value = categoria.id
  form.value = { nombre: categoria.nombre, descripcion: categoria.descripcion || '' }
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
      await api.patch(`/categorias/${editandoId.value}`, datos)
    } else {
      await api.post('/categorias', datos)
    }
    cancelarEdicion()
    await cargar()
    notificaciones.exito(creando ? 'Categoría creada correctamente.' : 'Categoría actualizada correctamente.')
  } catch (e) {
    error.value = e.response?.data?.message || 'No se pudo guardar la categoría.'
  }
}

async function eliminar(categoria) {
  if (!confirm(`Eliminar/dar de baja "${categoria.nombre}"?`)) return
  try {
    const { data } = await api.delete(`/categorias/${categoria.id}`)
    await cargar()
    notificaciones.exito(data.mensaje)
  } catch (e) {
    notificaciones.error(e.response?.data?.message || 'No se pudo eliminar la categoría.')
  }
}

// Reactivar reutiliza el mismo PATCH que ya usa guardar() para editar: el
// backend acepta "activa" en el body (ver ActualizarCategoriaDto). Se manda
// como FormData, igual que el resto de este endpoint.
async function reactivar(categoria) {
  try {
    const datos = new FormData()
    datos.append('activa', 'true')
    await api.patch(`/categorias/${categoria.id}`, datos)
    await cargar()
    notificaciones.exito(`Categoría "${categoria.nombre}" reactivada.`)
  } catch (e) {
    notificaciones.error(e.response?.data?.message || 'No se pudo reactivar la categoría.')
  }
}

onMounted(cargar)
</script>

<template>
  <div>
    <div class="admin-toolbar">
      <h1 class="page-title">Categorías</h1>
      <button v-if="!panelAbierto" type="button" class="btn-primary flex items-center gap-2 shrink-0" @click="nuevaCategoria">
        <i class="fa-solid fa-plus"></i>
        Nueva categoría
      </button>
    </div>

    <transition name="panel">
      <form v-if="panelAbierto" @submit.prevent="guardar" class="card p-5 mb-6 flex gap-3 items-end flex-wrap">
        <div class="w-full flex items-center justify-between -mb-1">
          <h2 class="section-title text-base">{{ editandoId ? 'Editar categoría' : 'Nueva categoría' }}</h2>
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
          <label class="field-label">Imagen (opcional, 500x500)</label>
          <input type="file" accept="image/*" @change="onArchivoSeleccionado" class="file-field" />
        </div>
        <button type="submit" class="btn-primary flex items-center gap-2">
          <i class="fa-solid" :class="editandoId ? 'fa-check' : 'fa-plus'"></i>
          {{ editandoId ? 'Guardar cambios' : 'Crear categoría' }}
        </button>
        <button type="button" @click="cancelarEdicion" class="btn-outline">
          Cancelar
        </button>
      </form>
    </transition>
    <p v-if="error" class="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2 mb-4">{{ error }}</p>

    <div class="relative mb-4 max-w-sm">
      <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
      <input v-model="busqueda" type="text" placeholder="Buscar categoría..." class="input-field pl-9" />
    </div>

    <div class="card overflow-hidden overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 text-left">
          <tr>
            <th class="table-head-cell">Imagen</th>
            <th class="table-head-cell">Nombre</th>
            <th class="table-head-cell">Descripción</th>
            <th class="table-head-cell">Estado</th>
            <th class="table-head-cell text-right">Acciones</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="c in categoriasPagina" :key="c.id" class="hover:bg-gray-50/60">
            <td class="p-3">
              <img v-if="c.imagen" :src="`/uploads/categorias/${c.imagen}`" class="w-9 h-9 object-cover rounded-full" />
              <div v-else class="w-9 h-9 rounded-full bg-primary-50 text-primary-400 flex items-center justify-center text-xs font-bold">
                {{ c.nombre?.[0]?.toUpperCase() }}
              </div>
            </td>
            <td class="p-3 font-medium text-gray-800">{{ c.nombre }}</td>
            <td class="p-3 text-gray-500">{{ c.descripcion }}</td>
            <td class="p-3">
              <span :class="c.activa ? 'badge-success' : 'badge-danger'">{{ c.activa ? 'Activa' : 'Inactiva' }}</span>
            </td>
            <td class="p-3 text-right">
              <div class="flex justify-end gap-1.5">
                <button @click="editar(c)" class="btn-ghost-icon" title="Editar categoría" aria-label="Editar categoría">
                  <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button
                  v-if="c.activa"
                  @click="eliminar(c)"
                  class="btn-ghost-icon hover:!bg-red-50 hover:!text-red-600"
                  title="Eliminar categoría"
                  aria-label="Eliminar categoría"
                >
                  <i class="fa-solid fa-trash"></i>
                </button>
                <button
                  v-else
                  @click="reactivar(c)"
                  class="btn-ghost-icon hover:!bg-accent-50 hover:!text-accent-700"
                  title="Reactivar categoría"
                  aria-label="Reactivar categoría"
                >
                  <i class="fa-solid fa-rotate-left"></i>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="categoriasFiltradas.length === 0" class="empty-state">
        <i class="fa-solid fa-tags empty-state-icon"></i>
        {{ busqueda ? 'No se encontraron categorías.' : 'Todavía no hay categorías cargadas.' }}
      </p>
    </div>
    <Paginador :pagina="pagina" :total-paginas="totalPaginas" @cambiar="irAPagina" />
  </div>
</template>
