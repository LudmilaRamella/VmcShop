<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useNotificacionesStore } from '../stores/notificaciones'
import api from '../services/api'
import { ESPECIES, FRANJAS_HORARIAS, SERVICIOS } from '../data/servicios'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const notificaciones = useNotificacionesStore()

const panelRef = ref(null)
const panelVisible = ref(false)
const enviando = ref(false)
const enviado = ref(false)
const errores = ref([])

// Fecha "de manana en adelante" calculada con componentes locales (getFullYear/
// getMonth/getDate), nunca con toISOString(): esa arma la fecha en UTC y
// puede correrse un dia para atras segun el huso horario del navegador.
function formatearFechaLocal(fecha) {
  const anio = fecha.getFullYear()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${anio}-${mes}-${dia}`
}

const manana = new Date()
manana.setDate(manana.getDate() + 1)
const fechaMinima = formatearFechaLocal(manana)

function formularioVacio() {
  return {
    servicio: '',
    nombrePaciente: '',
    especie: '',
    fechaPreferida: '',
    franjaHoraria: '',
    telefonoContacto: auth.usuario?.telefono || '',
    comentario: '',
  }
}

const form = ref(formularioVacio())

const servicioSeleccionado = computed(() => SERVICIOS.find((s) => s.slug === form.value.servicio))

function abrirFormulario(slug) {
  if (!auth.estaLogueado) {
    router.push({ name: 'login', query: { redirect: '/servicios', servicio: slug } })
    return
  }

  form.value = { ...formularioVacio(), servicio: slug }
  errores.value = []
  enviado.value = false
  panelVisible.value = true
  nextTick(() => panelRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}

function cerrarFormulario() {
  panelVisible.value = false
  enviado.value = false
  errores.value = []
}

async function enviar() {
  errores.value = []
  enviando.value = true
  try {
    const { data } = await api.post('/servicios/solicitar-turno', form.value)
    enviado.value = true
    notificaciones.exito(data.mensaje)
  } catch (e) {
    const mensaje = e.response?.data?.message
    const lista = Array.isArray(mensaje)
      ? mensaje
      : [mensaje || 'No pudimos enviar tu solicitud en este momento. Intentá nuevamente más tarde.']
    errores.value = lista
    notificaciones.error(lista[0])
  } finally {
    enviando.value = false
  }
}

// Si venimos de un login con "?servicio=..." (ver seccion 25: preservar el
// destino cuando un visitante intenta pedir un turno), abrimos el
// formulario directo con ese servicio ya seleccionado.
onMounted(() => {
  if (auth.estaLogueado && route.query.servicio) {
    abrirFormulario(String(route.query.servicio))
  }
})
</script>

<template>
  <div class="max-w-5xl mx-auto">
    <div class="text-center mb-10">
      <span class="inline-flex items-center gap-2 bg-primary-50 text-primary-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-3">
        <i class="fa-solid fa-paw"></i>
        Servicios veterinarios
      </span>
      <h1 class="page-title">Servicios y solicitud de turno</h1>
      <p class="page-subtitle max-w-2xl mx-auto">
        Elegí el servicio que necesitás y solicitá un turno. El equipo de VMC se va a comunicar con vos
        para confirmar la disponibilidad.
      </p>
    </div>

    <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
      <div
        v-for="servicio in SERVICIOS"
        :key="servicio.slug"
        class="card p-5 flex flex-col hover:shadow-md hover:-translate-y-0.5 transition-all"
      >
        <div class="h-11 w-11 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center text-lg mb-3">
          <i class="fa-solid" :class="servicio.icono"></i>
        </div>
        <h3 class="font-semibold text-gray-800">{{ servicio.nombre }}</h3>
        <p class="text-sm text-gray-500 mt-1 flex-1">{{ servicio.descripcion }}</p>
        <button
          type="button"
          class="btn-primary mt-4 w-full text-sm flex items-center justify-center gap-2"
          @click="abrirFormulario(servicio.slug)"
        >
          <i class="fa-solid fa-calendar-check"></i>
          Solicitar turno
        </button>
      </div>
    </div>

    <section v-if="panelVisible" ref="panelRef" class="card p-6 sm:p-8 max-w-2xl mx-auto scroll-mt-20">
      <template v-if="!enviado">
        <div class="flex items-start justify-between gap-4 mb-1">
          <div>
            <h2 class="text-xl font-bold text-gray-800">Solicitar turno</h2>
            <p class="text-sm text-gray-500 mt-1">Completá tus datos y te contactamos para coordinar.</p>
          </div>
          <button type="button" class="text-gray-400 hover:text-gray-600 shrink-0" @click="cerrarFormulario" aria-label="Cerrar">
            <i class="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        <p class="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3.5 py-2.5 mt-4 flex items-start gap-2">
          <i class="fa-solid fa-circle-info mt-0.5 shrink-0"></i>
          Esta solicitud no confirma automáticamente un turno. El equipo de VMC se comunicará con vos
          para coordinar la disponibilidad.
        </p>

        <form @submit.prevent="enviar" class="space-y-4 mt-5">
          <div>
            <label for="servicio" class="field-label">Servicio</label>
            <select id="servicio" v-model="form.servicio" required class="input-field">
              <option value="" disabled>Seleccioná un servicio</option>
              <option v-for="s in SERVICIOS" :key="s.slug" :value="s.slug">{{ s.nombre }}</option>
            </select>
          </div>

          <div class="grid sm:grid-cols-2 gap-3">
            <div>
              <label for="nombrePaciente" class="field-label">Nombre del paciente</label>
              <input
                id="nombrePaciente"
                v-model="form.nombrePaciente"
                required
                maxlength="60"
                placeholder="Ej: Firulais"
                class="input-field"
              />
            </div>
            <div>
              <label for="especie" class="field-label">Especie</label>
              <select id="especie" v-model="form.especie" required class="input-field">
                <option value="" disabled>Seleccioná una especie</option>
                <option v-for="e in ESPECIES" :key="e.slug" :value="e.slug">{{ e.nombre }}</option>
              </select>
            </div>
          </div>

          <div class="grid sm:grid-cols-2 gap-3">
            <div>
              <label for="fechaPreferida" class="field-label">Fecha preferida</label>
              <input
                id="fechaPreferida"
                v-model="form.fechaPreferida"
                type="date"
                required
                :min="fechaMinima"
                class="input-field"
              />
              <p class="text-xs text-gray-400 mt-1">No representa disponibilidad real, es solo tu preferencia.</p>
            </div>
            <div>
              <label for="franjaHoraria" class="field-label">Franja horaria preferida</label>
              <select id="franjaHoraria" v-model="form.franjaHoraria" required class="input-field">
                <option value="" disabled>Seleccioná una franja</option>
                <option v-for="f in FRANJAS_HORARIAS" :key="f.slug" :value="f.slug">{{ f.nombre }}</option>
              </select>
            </div>
          </div>

          <div>
            <label for="telefonoContacto" class="field-label">Teléfono de contacto</label>
            <div class="relative">
              <i class="fa-solid fa-phone absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
              <input
                id="telefonoContacto"
                v-model="form.telefonoContacto"
                required
                placeholder="Ej: 11 5555-5555"
                class="input-field pl-10"
              />
            </div>
          </div>

          <div>
            <label for="comentario" class="field-label">Comentario u observación (opcional)</label>
            <textarea
              id="comentario"
              v-model="form.comentario"
              rows="3"
              maxlength="500"
              placeholder="Contanos si hay algo puntual que debamos saber"
              class="input-field resize-none"
            ></textarea>
          </div>

          <ul v-if="errores.length" class="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2 list-disc pl-6 space-y-0.5">
            <li v-for="(err, i) in errores" :key="i">{{ err }}</li>
          </ul>

          <button type="submit" :disabled="enviando" class="btn-primary w-full flex items-center justify-center gap-2">
            <i class="fa-solid" :class="enviando ? 'fa-circle-notch fa-spin' : 'fa-paper-plane'"></i>
            {{ enviando ? 'Enviando solicitud...' : 'Solicitar turno' }}
          </button>
        </form>
      </template>

      <template v-else>
        <div class="text-center py-4">
          <div class="h-14 w-14 rounded-full bg-accent-50 text-accent-600 flex items-center justify-center text-2xl mx-auto mb-4">
            <i class="fa-solid fa-circle-check"></i>
          </div>
          <h2 class="text-xl font-bold text-gray-800">Tu solicitud fue enviada</h2>
          <p class="text-gray-500 mt-2 max-w-md mx-auto">
            Nos comunicaremos para confirmar disponibilidad
            <template v-if="servicioSeleccionado">de <strong>{{ servicioSeleccionado.nombre }}</strong></template>.
            Esta solicitud todavía no es un turno confirmado.
          </p>
          <button type="button" class="btn-outline mt-6" @click="cerrarFormulario">
            Volver a servicios
          </button>
        </div>
      </template>
    </section>
  </div>
</template>
