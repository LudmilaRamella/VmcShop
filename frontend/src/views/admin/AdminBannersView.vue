<script setup>
import { onMounted, ref } from 'vue'
import api from '../../services/api'
import Paginador from '../../components/Paginador.vue'
import { usePaginadoCliente } from '../../composables/usePaginadoCliente'
import { useNotificacionesStore } from '../../stores/notificaciones'

const notificaciones = useNotificacionesStore()

const banners = ref([])
const form = ref({ enlaceUrl: '', orden: 0 })
const archivoImagen = ref(null)
const editandoId = ref(null)
const error = ref('')
const panelAbierto = ref(false)

function nuevoBanner() {
  cancelarEdicion()
  panelAbierto.value = true
}

const { pagina, totalPaginas, itemsPagina: bannersPagina, irAPagina } = usePaginadoCliente(banners, 8)

async function cargar() {
  const { data } = await api.get('/banners')
  banners.value = data
}

function editar(banner) {
  editandoId.value = banner.id
  form.value = { enlaceUrl: banner.enlaceUrl || '', orden: banner.orden }
  panelAbierto.value = true
}

function cancelarEdicion() {
  editandoId.value = null
  form.value = { enlaceUrl: '', orden: 0 }
  archivoImagen.value = null
  panelAbierto.value = false
}

function onArchivoSeleccionado(evento) {
  archivoImagen.value = evento.target.files[0] || null
}

async function guardar() {
  error.value = ''
  const creando = !editandoId.value

  // La imagen es obligatoria al crear (el backend la rechaza si falta),
  // opcional al editar (si no se sube una nueva, se conserva la actual).
  if (creando && !archivoImagen.value) {
    error.value = 'El banner necesita una imagen'
    return
  }

  const datos = new FormData()
  Object.entries(form.value).forEach(([clave, valor]) => datos.append(clave, valor))
  if (archivoImagen.value) datos.append('imagen', archivoImagen.value)

  try {
    if (editandoId.value) {
      await api.patch(`/banners/${editandoId.value}`, datos)
    } else {
      await api.post('/banners', datos)
    }
    cancelarEdicion()
    await cargar()
    notificaciones.exito(creando ? 'Banner creado correctamente.' : 'Banner actualizado correctamente.')
  } catch (e) {
    error.value = e.response?.data?.message || 'No se pudo guardar el banner.'
  }
}

// Toggle activo/inactivo: endpoint aparte con JSON, no mezclado con el
// formulario de imagen (ver nota en el backend, banners.controller.ts).
async function cambiarEstado(banner) {
  try {
    await api.patch(`/banners/${banner.id}/estado`, { activo: !banner.activo })
    await cargar()
  } catch (e) {
    notificaciones.error(e.response?.data?.message || 'No se pudo cambiar el estado del banner.')
  }
}

async function eliminar(banner) {
  if (!confirm('Eliminar este banner?')) return
  try {
    await api.delete(`/banners/${banner.id}`)
    await cargar()
    notificaciones.exito('Banner eliminado correctamente.')
  } catch (e) {
    notificaciones.error(e.response?.data?.message || 'No se pudo eliminar el banner.')
  }
}

onMounted(cargar)
</script>

<template>
  <div>
    <div class="admin-toolbar">
      <div>
        <h1 class="page-title">Banners</h1>
        <p class="page-subtitle">
          Se muestran en el home como un carrusel a todo el ancho de la pantalla (si hay más de uno, rotan
          automáticamente). Tamaño recomendado: 1600x500 (horizontal).
        </p>
      </div>
      <button v-if="!panelAbierto" type="button" class="btn-primary flex items-center gap-2 shrink-0" @click="nuevoBanner">
        <i class="fa-solid fa-plus"></i>
        Nuevo banner
      </button>
    </div>

    <transition name="panel">
      <form v-if="panelAbierto" @submit.prevent="guardar" class="card p-5 mb-6 flex gap-3 items-end flex-wrap">
        <div class="w-full flex items-center justify-between -mb-1">
          <h2 class="section-title text-base">{{ editandoId ? 'Editar banner' : 'Nuevo banner' }}</h2>
        </div>
        <div>
          <label class="field-label">Imagen {{ editandoId ? '(dejar vacío para conservar la actual)' : '' }}</label>
          <input type="file" accept="image/*" @change="onArchivoSeleccionado" class="file-field" />
        </div>
        <div class="flex-1 min-w-56">
          <label class="field-label">Link al hacer click (opcional)</label>
          <input v-model="form.enlaceUrl" placeholder="/catalogo?marcaId=3 o https://..." class="input-field" />
        </div>
        <div>
          <label class="field-label">Orden</label>
          <input v-model="form.orden" type="number" min="0" class="input-field w-24" />
        </div>
        <button type="submit" class="btn-primary flex items-center gap-2">
          <i class="fa-solid" :class="editandoId ? 'fa-check' : 'fa-plus'"></i>
          {{ editandoId ? 'Guardar cambios' : 'Crear banner' }}
        </button>
        <button type="button" @click="cancelarEdicion" class="btn-outline">
          Cancelar
        </button>
      </form>
    </transition>
    <p v-if="error" class="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2 mb-4">{{ error }}</p>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="b in bannersPagina" :key="b.id" class="card overflow-hidden flex flex-col">
        <img :src="`/uploads/banners/${b.imagen}`" class="w-full aspect-[16/5] object-cover" />
        <div class="p-2.5 flex flex-col gap-1.5">
          <span :class="b.activo ? 'badge-success' : 'badge-danger'" class="self-start">
            {{ b.activo ? 'Activo' : 'Inactivo' }}
          </span>
          <p class="text-xs text-gray-400 truncate" :title="b.enlaceUrl">{{ b.enlaceUrl || 'Sin link' }}</p>
          <div class="flex items-center justify-between mt-1">
            <div class="flex gap-1">
              <button @click="editar(b)" class="btn-ghost-icon !w-7 !h-7 text-sm" title="Editar banner" aria-label="Editar banner">
                <i class="fa-solid fa-pen-to-square"></i>
              </button>
              <button
                @click="eliminar(b)"
                class="btn-ghost-icon !w-7 !h-7 text-sm hover:!bg-red-50 hover:!text-red-600"
                title="Eliminar banner"
                aria-label="Eliminar banner"
              >
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
            <button
              @click="cambiarEstado(b)"
              class="btn-ghost-icon !w-7 !h-7 text-sm"
              :title="b.activo ? 'Desactivar banner' : 'Activar banner'"
              :aria-label="b.activo ? 'Desactivar banner' : 'Activar banner'"
            >
              <i class="fa-solid" :class="b.activo ? 'fa-toggle-on' : 'fa-toggle-off'"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <p v-if="banners.length === 0" class="card empty-state mt-4">
      <i class="fa-solid fa-images empty-state-icon"></i>
      Todavía no hay banners cargados.
    </p>

    <Paginador :pagina="pagina" :total-paginas="totalPaginas" @cambiar="irAPagina" />
  </div>
</template>
