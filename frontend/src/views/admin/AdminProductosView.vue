<script setup>
import { onBeforeUnmount, onMounted, onUnmounted, ref, watch } from 'vue'
import api from '../../services/api'
import Paginador from '../../components/Paginador.vue'
import { useNotificacionesStore } from '../../stores/notificaciones'
import socket from '../../services/socket'

const notificaciones = useNotificacionesStore()

const productos = ref([])
const categorias = ref([])
const marcas = ref([])
const form = ref({ nombre: '', descripcion: '', precio: '', stock: '', categoriaId: '', marcaId: '' })
const archivoImagen = ref(null)
const editandoId = ref(null)
const error = ref('')
const busqueda = ref('')

const pagina = ref(1)
const totalPaginas = ref(1)
const panelAbierto = ref(false)

function nuevoProducto() {
  cancelarEdicion()
  panelAbierto.value = true
}

async function cargar() {
  const [prod, cat, mar] = await Promise.all([
    api.get('/productos', {
      params: { soloActivos: false, pagina: pagina.value, limite: 10, buscar: busqueda.value || undefined },
    }),
    api.get('/categorias'),
    api.get('/marcas'),
  ])
  totalPaginas.value = prod.data.totalPaginas
  categorias.value = cat.data
  marcas.value = mar.data

  // Si se elimino el ultimo producto de la ultima pagina, esa pagina ya no
  // existe: se retrocede una y se vuelve a pedir en vez de mostrar "vacio".
  if (prod.data.items.length === 0 && pagina.value > 1) {
    pagina.value -= 1
    return cargar()
  }
  productos.value = prod.data.items
}

function irAPagina(nueva) {
  if (nueva < 1 || nueva > totalPaginas.value) return
  pagina.value = nueva
  cargar()
}

function editar(producto) {
  editandoId.value = producto.id
  form.value = {
    nombre: producto.nombre,
    descripcion: producto.descripcion || '',
    precio: producto.precio,
    stock: producto.stock,
    categoriaId: producto.categoria?.id,
    marcaId: producto.marca?.id || '',
  }
  panelAbierto.value = true
}

function cancelarEdicion() {
  editandoId.value = null
  form.value = { nombre: '', descripcion: '', precio: '', stock: '', categoriaId: '', marcaId: '' }
  archivoImagen.value = null
  panelAbierto.value = false
}

function onArchivoSeleccionado(evento) {
  archivoImagen.value = evento.target.files[0] || null
}

async function guardar() {
  error.value = ''

  // Como se puede mandar una imagen, el body se arma como FormData en vez
  // de JSON: es lo que espera Multer del lado del backend.
  const datos = new FormData()
  Object.entries(form.value).forEach(([clave, valor]) => {
    if (clave === 'marcaId' && !valor) return // marca es opcional: no mandar vacio
    datos.append(clave, valor)
  })
  if (archivoImagen.value) datos.append('imagen', archivoImagen.value)

  const creando = !editandoId.value
  try {
    if (editandoId.value) {
      await api.patch(`/productos/${editandoId.value}`, datos)
    } else {
      await api.post('/productos', datos)
    }
    cancelarEdicion()
    if (creando) pagina.value = 1
    await cargar()
    notificaciones.exito(creando ? 'Producto creado correctamente.' : 'Producto actualizado correctamente.')
  } catch (e) {
    const mensaje = e.response?.data?.message
    error.value = Array.isArray(mensaje) ? mensaje.join(', ') : mensaje || 'No se pudo guardar el producto.'
  }
}

async function eliminar(producto) {
  if (!confirm(`Dar de baja "${producto.nombre}"?`)) return
  try {
    await api.delete(`/productos/${producto.id}`)
    await cargar()
    notificaciones.exito(`Producto "${producto.nombre}" dado de baja.`)
  } catch (e) {
    notificaciones.error(e.response?.data?.message || 'No se pudo eliminar el producto.')
  }
}

// Reactivar reutiliza el mismo PATCH que ya usa guardar() para editar: el
// backend acepta "activo" en el body (ver ActualizarProductoDto). Se manda
// como FormData, igual que el resto de este endpoint, para no depender de
// si el body llega como JSON o multipart.
async function reactivar(producto) {
  try {
    const datos = new FormData()
    datos.append('activo', 'true')
    await api.patch(`/productos/${producto.id}`, datos)
    await cargar()
    notificaciones.exito(`Producto "${producto.nombre}" reactivado.`)
  } catch (e) {
    notificaciones.error(e.response?.data?.message || 'No se pudo reactivar el producto.')
  }
}

let debounceId = null
watch(busqueda, () => {
  clearTimeout(debounceId)
  debounceId = setTimeout(() => {
    pagina.value = 1
    cargar()
  }, 300)
})
onBeforeUnmount(() => clearTimeout(debounceId))

onMounted(cargar)

// Si otro admin (en otra sesion) da de alta, edita o da de baja un
// producto, esta lista se actualiza sola.
socket.on('producto:cambio', cargar)
onUnmounted(() => socket.off('producto:cambio', cargar))
</script>

<template>
  <div>
    <div class="admin-toolbar">
      <div>
        <h1 class="page-title">Productos</h1>
        <p class="page-subtitle">Alta, edición y baja del catálogo.</p>
      </div>
      <button v-if="!panelAbierto" type="button" class="btn-primary flex items-center gap-2 shrink-0" @click="nuevoProducto">
        <i class="fa-solid fa-plus"></i>
        Nuevo producto
      </button>
    </div>

    <transition name="panel">
      <form v-if="panelAbierto" @submit.prevent="guardar" class="card p-5 mb-6 grid sm:grid-cols-2 gap-4">
        <div class="sm:col-span-2 flex items-center justify-between -mt-1 mb-1">
          <h2 class="section-title text-base">{{ editandoId ? 'Editar producto' : 'Nuevo producto' }}</h2>
          <button type="button" @click="cancelarEdicion" class="btn-ghost-icon" title="Cerrar" aria-label="Cerrar formulario">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div>
          <label class="field-label">Nombre</label>
          <input v-model="form.nombre" required class="input-field" />
        </div>
        <div>
          <label class="field-label">Categoría</label>
          <select v-model="form.categoriaId" required class="input-field">
            <option value="" disabled>Seleccionar...</option>
            <option v-for="c in categorias" :key="c.id" :value="c.id">{{ c.nombre }}</option>
          </select>
        </div>
        <div>
          <label class="field-label">Marca</label>
          <select v-model="form.marcaId" class="input-field">
            <option value="">Sin marca</option>
            <option v-for="m in marcas" :key="m.id" :value="m.id">{{ m.nombre }}</option>
          </select>
        </div>
        <div>
          <label class="field-label">Precio (con IVA incluido)</label>
          <input v-model="form.precio" type="number" step="0.01" min="0.01" required class="input-field" />
        </div>
        <div>
          <label class="field-label">Stock</label>
          <input v-model="form.stock" type="number" min="0" required class="input-field" />
        </div>
        <div class="sm:col-span-2">
          <label class="field-label">Descripción</label>
          <textarea v-model="form.descripcion" class="input-field" rows="2"></textarea>
        </div>
        <div class="sm:col-span-2">
          <label class="field-label">Imagen (opcional, jpg/png/webp)</label>
          <input type="file" accept="image/*" @change="onArchivoSeleccionado" class="file-field" />
        </div>

        <p v-if="error" class="sm:col-span-2 text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{{ error }}</p>

        <div class="sm:col-span-2 flex gap-3">
          <button type="submit" class="btn-primary flex items-center gap-2">
            <i class="fa-solid" :class="editandoId ? 'fa-check' : 'fa-plus'"></i>
            {{ editandoId ? 'Guardar cambios' : 'Crear producto' }}
          </button>
          <button type="button" @click="cancelarEdicion" class="btn-outline">
            Cancelar
          </button>
        </div>
      </form>
    </transition>

    <div class="relative mb-4 max-w-sm">
      <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
      <input v-model="busqueda" type="text" placeholder="Buscar producto..." class="input-field pl-9" />
    </div>

    <div class="card overflow-hidden overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 text-left">
          <tr>
            <th class="table-head-cell">Producto</th>
            <th class="table-head-cell">Categoría</th>
            <th class="table-head-cell">Marca</th>
            <th class="table-head-cell text-right">Precio</th>
            <th class="table-head-cell text-right">Stock</th>
            <th class="table-head-cell">Estado</th>
            <th class="table-head-cell text-right">Acciones</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="p in productos" :key="p.id" class="hover:bg-gray-50/60">
            <td class="p-3 font-medium text-gray-800">{{ p.nombre }}</td>
            <td class="p-3 text-gray-500">{{ p.categoria?.nombre }}</td>
            <td class="p-3 text-gray-500">{{ p.marca?.nombre || '-' }}</td>
            <td class="p-3 text-gray-800 text-right tabular-nums">${{ p.precio }}</td>
            <td class="p-3 text-gray-800 text-right tabular-nums">{{ p.stock }}</td>
            <td class="p-3">
              <span :class="p.activo ? 'badge-success' : 'badge-danger'">{{ p.activo ? 'Activo' : 'Baja' }}</span>
            </td>
            <td class="p-3 text-right">
              <div class="flex justify-end gap-1.5">
                <button @click="editar(p)" class="btn-ghost-icon" title="Editar producto" aria-label="Editar producto">
                  <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button
                  v-if="p.activo"
                  @click="eliminar(p)"
                  class="btn-ghost-icon hover:!bg-red-50 hover:!text-red-600"
                  title="Dar de baja"
                  aria-label="Dar de baja"
                >
                  <i class="fa-solid fa-ban"></i>
                </button>
                <button
                  v-else
                  @click="reactivar(p)"
                  class="btn-ghost-icon hover:!bg-accent-50 hover:!text-accent-700"
                  title="Reactivar producto"
                  aria-label="Reactivar producto"
                >
                  <i class="fa-solid fa-rotate-left"></i>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="productos.length === 0" class="empty-state">
        <i class="fa-solid fa-box-open empty-state-icon"></i>
        {{ busqueda ? 'No se encontraron productos.' : 'Todavía no hay productos cargados.' }}
      </p>
    </div>
    <Paginador :pagina="pagina" :total-paginas="totalPaginas" @cambiar="irAPagina" />
  </div>
</template>
