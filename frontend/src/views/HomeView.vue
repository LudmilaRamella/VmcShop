<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '../services/api'
import { useAuthStore } from '../stores/auth'
import logo from '../assets/logo.png'
import { uploadUrl } from '../utils/uploads'

const auth = useAuthStore()
const router = useRouter()

const categorias = ref([])
const marcas = ref([])
const banners = ref([])
const error = ref('')

// Carrusel de banners: si hay mas de uno, rota solo automaticamente cada
// 5s. El intervalo se limpia al desmontar para no seguir corriendo en el
// fondo despues de salir del home.
const indiceBanner = ref(0)
let intervaloBanner = null

function iniciarCarruselBanners() {
  clearInterval(intervaloBanner)
  if (banners.value.length <= 1) return
  intervaloBanner = setInterval(() => {
    indiceBanner.value = (indiceBanner.value + 1) % banners.value.length
  }, 5000)
}

onBeforeUnmount(() => clearInterval(intervaloBanner))

function irAlCatalogo(categoriaId) {
  router.push({ name: 'catalogo', query: categoriaId ? { categoriaId } : {} })
}

function irAMarca(marcaId) {
  router.push({ name: 'catalogo', query: { marcaId } })
}

function irABanner(banner) {
  if (!banner.enlaceUrl) return
  if (banner.enlaceUrl.startsWith('/')) {
    router.push(banner.enlaceUrl)
  } else {
    window.open(banner.enlaceUrl, '_blank', 'noopener,noreferrer')
  }
}

// El carrusel de marcas se arma duplicando la lista y animandola con CSS
// (@keyframes en el <style> de abajo): al llegar a la mitad del recorrido
// ya se repitio la misma secuencia, asi que el salto al reiniciar la
// animacion es invisible. Con menos de 6 marcas no alcanza a notarse el
// loop, asi que directamente no se anima (se muestran quietas).
const marcasCarrusel = computed(() => (marcas.value.length >= 6 ? [...marcas.value, ...marcas.value] : marcas.value))

async function cargarInicio() {
  error.value = ''
  try {
    const [cat, mar, ban] = await Promise.all([
      api.get('/categorias', { params: { soloActivas: true } }),
      api.get('/marcas', { params: { soloActivas: true } }),
      api.get('/banners', { params: { soloActivas: true } }),
    ])
    categorias.value = cat.data
    marcas.value = mar.data
    banners.value = ban.data
    iniciarCarruselBanners()
  } catch {
    error.value = 'No pudimos cargar el contenido de la portada. Intentá nuevamente.'
  }
}

onMounted(cargarInicio)
</script>

<template>
  <div>
    <!-- Hero -->
    <section class="card overflow-hidden bg-primary-700 border-primary-700 text-white mb-10">
      <div class="px-6 py-12 sm:px-12 sm:py-16 grid sm:grid-cols-[1fr_auto] items-center gap-10">
        <div class="flex flex-col gap-5 text-center sm:text-left">
          <span class="inline-flex items-center gap-2 self-center sm:self-start bg-white/10 text-accent-300 text-xs font-semibold px-3 py-1.5 rounded-full">
            <i class="fa-solid fa-paw"></i>
            Tienda veterinaria online
          </span>
          <h1 class="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
            Todo para tu mascota, <span class="text-accent-300">en un solo lugar</span>
          </h1>
          <p class="text-white/80 max-w-xl">
            Alimentos, accesorios, medicamentos y juguetes para perros, gatos y más. Precios claros,
            stock siempre actualizado y turnos con nuestro equipo veterinario.
          </p>
          <div class="flex flex-wrap gap-3 justify-center sm:justify-start mt-1">
            <button @click="irAlCatalogo()" class="btn-accent flex items-center gap-2">
              <i class="fa-solid fa-store"></i>
              Ver catálogo
            </button>
            <RouterLink to="/servicios" class="btn-outline bg-transparent border-white/40 text-white hover:bg-white/10 hover:text-white flex items-center gap-2">
              <i class="fa-solid fa-stethoscope"></i>
              Servicios y turnos
            </RouterLink>
          </div>
          <RouterLink v-if="!auth.estaLogueado" to="/registro" class="text-sm text-white/70 hover:text-white font-medium self-center sm:self-start mt-0.5">
            Todavía no tenes cuenta? <span class="underline">Registrate gratis</span>
          </RouterLink>
        </div>

        <div class="hidden sm:flex items-center justify-center h-40 w-40 rounded-full bg-white/10 shrink-0">
          <img :src="logo" alt="VMC" class="h-24 w-24 object-contain drop-shadow" />
        </div>
      </div>
    </section>

    <div v-if="error" class="card empty-state mb-10">
      <i class="fa-solid fa-triangle-exclamation empty-state-icon"></i>
      <p class="font-medium text-gray-600">{{ error }}</p>
      <button @click="cargarInicio" class="btn-outline inline-flex items-center gap-2 mt-4">
        <i class="fa-solid fa-rotate-right"></i>
        Reintentar
      </button>
    </div>

    <!-- Banners: carrusel a todo el ancho de la pantalla (full-bleed, sale
         del max-w del <main>), mostrando cada imagen completa (sin recortar). -->
    <section v-if="banners.length" class="relative left-1/2 w-screen -translate-x-1/2 mb-10 bg-gray-900">
      <div
        v-for="(b, i) in banners"
        v-show="i === indiceBanner"
        :key="b.id"
        @click="irABanner(b)"
        :class="b.enlaceUrl ? 'cursor-pointer' : ''"
        class="flex justify-center"
      >
        <img :src="uploadUrl('banners', b.imagen)" class="max-h-[70vh] w-full object-contain" />
      </div>

      <div v-if="banners.length > 1" class="flex justify-center gap-2 py-3">
        <button
          v-for="(b, i) in banners"
          :key="`dot-${b.id}`"
          @click="indiceBanner = i; iniciarCarruselBanners()"
          class="w-2 h-2 rounded-full transition-colors"
          :class="i === indiceBanner ? 'bg-white' : 'bg-white/40'"
        ></button>
      </div>
    </section>

    <!-- Categorias destacadas -->
    <section v-if="categorias.length" class="mb-10">
      <h2 class="section-title mb-4">Comprar por categoría</h2>
      <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 sm:gap-4">
        <button
          v-for="c in categorias"
          :key="c.id"
          @click="irAlCatalogo(c.id)"
          class="card p-4 sm:p-5 flex flex-col items-center gap-2.5 hover:shadow-md hover:-translate-y-0.5 hover:border-primary-200 transition-all text-center"
        >
          <img
            v-if="c.imagen"
            :src="uploadUrl('categorias', c.imagen)"
            :alt="c.nombre"
            class="w-14 h-14 rounded-full object-cover ring-1 ring-gray-100"
          />
          <div v-else class="w-14 h-14 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center text-xl font-bold ring-1 ring-primary-100">
            {{ c.nombre?.[0]?.toUpperCase() }}
          </div>
          <span class="font-medium text-gray-700 text-sm leading-tight">{{ c.nombre }}</span>
        </button>
      </div>
    </section>

    <!-- Carrusel de marcas: mismo estilo de tarjeta que "Comprar por categoria"
         (logo en circulo, o inicial como respaldo si la marca no tiene imagen
         cargada), pero deslizandose en una fila porque suele haber muchas mas
         marcas que categorias. -->
    <section v-if="marcas.length" class="mb-10">
      <h2 class="section-title mb-4">Marcas</h2>
      <div class="overflow-hidden">
        <div class="flex gap-4 w-max" :class="marcas.length >= 6 ? 'animate-carrusel' : ''">
          <button
            v-for="(m, indice) in marcasCarrusel"
            :key="`${m.id}-${indice}`"
            @click="irAMarca(m.id)"
            class="card p-5 w-36 shrink-0 flex flex-col items-center gap-2.5 hover:shadow-md hover:-translate-y-0.5 hover:border-primary-200 transition-all text-center"
          >
            <img
              v-if="m.imagen"
              :src="uploadUrl('marcas', m.imagen)"
              :alt="m.nombre"
              class="w-14 h-14 rounded-full object-cover ring-1 ring-gray-100"
            />
            <div v-else class="w-14 h-14 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center text-lg font-bold ring-1 ring-primary-100">
              {{ m.nombre?.[0]?.toUpperCase() }}
            </div>
            <span class="font-medium text-gray-700 text-sm leading-tight">{{ m.nombre }}</span>
          </button>
        </div>
      </div>
    </section>

    <!-- Aviso de precios para invitados -->
    <section v-if="!auth.estaLogueado" class="card p-6 sm:p-8 bg-accent-50 border-accent-200 flex flex-col sm:flex-row items-center gap-4 justify-between">
      <div class="flex items-center gap-3">
        <i class="fa-solid fa-tag text-2xl text-accent-600"></i>
        <div>
          <p class="font-semibold text-gray-800">Inicia sesión para ver los precios</p>
          <p class="text-sm text-gray-600">Registrate gratis y accede al catálogo completo con precios y promociones.</p>
        </div>
      </div>
      <RouterLink to="/registro" class="btn-primary shrink-0">Registrarme</RouterLink>
    </section>
  </div>
</template>

<style scoped>
/* Desliza la fila de marcas hacia la izquierda el 50% de su ancho (que es
   exactamente una copia completa de la lista, porque marcasCarrusel la
   duplica) y vuelve a arrancar: como la segunda mitad es identica a la
   primera, el reinicio es invisible. */
@keyframes carrusel-marcas {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(-50%);
  }
}
.animate-carrusel {
  animation: carrusel-marcas 25s linear infinite;
}
.animate-carrusel:hover {
  animation-play-state: paused;
}
</style>
