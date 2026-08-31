<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useCarritoStore } from '../stores/carrito'
import logo from '../assets/logo.png'

const auth = useAuthStore()
const carrito = useCarritoStore()
const router = useRouter()

const menuAbierto = ref(false)
const adminMenuAbierto = ref(false)
const adminMenuRef = ref(null)

async function cerrarSesion() {
  await auth.logout()
  router.push({ name: 'login' })
}

function alClickFuera(evento) {
  if (adminMenuAbierto.value && adminMenuRef.value && !adminMenuRef.value.contains(evento.target)) {
    adminMenuAbierto.value = false
  }
}

onMounted(() => document.addEventListener('click', alClickFuera))
onUnmounted(() => document.removeEventListener('click', alClickFuera))

// Cierra el menu mobile y el dropdown de admin al navegar, para no dejarlos
// abiertos tapando la pantalla siguiente.
router.afterEach(() => {
  menuAbierto.value = false
  adminMenuAbierto.value = false
})

// Clases compartidas por los links de navegacion: texto blanco translucido
// por defecto, blanco solido al pasar el mouse, y turquesa (accent) cuando
// el link corresponde a la ruta activa. El selector [&.router-link-active]
// engancha con la clase que Vue Router le agrega automaticamente al <a>.
const linkClase =
  'flex items-center gap-1.5 text-white/80 hover:text-white transition-colors border-b-2 border-transparent py-1 [&.router-link-active]:text-white [&.router-link-active]:font-semibold [&.router-link-active]:border-accent-300'

const linkMobileClase =
  'flex items-center gap-2 text-white/80 hover:text-white transition-colors py-2 pl-2.5 border-l-2 border-transparent [&.router-link-active]:text-white [&.router-link-active]:font-semibold [&.router-link-active]:border-accent-300 [&.router-link-active]:bg-white/5'

const adminLinks = [
  { to: '/admin/productos', icono: 'fa-box', texto: 'Productos' },
  { to: '/admin/categorias', icono: 'fa-tags', texto: 'Categorías' },
  { to: '/admin/marcas', icono: 'fa-copyright', texto: 'Marcas' },
  { to: '/admin/banners', icono: 'fa-images', texto: 'Banners' },
  { to: '/admin/promociones', icono: 'fa-percent', texto: 'Promociones' },
  { to: '/admin/pedidos', icono: 'fa-clipboard-list', texto: 'Pedidos' },
  { to: '/admin/reportes', icono: 'fa-chart-line', texto: 'Reportes' },
]
</script>

<template>
  <nav class="bg-primary-700 text-white shadow-md sticky top-0 z-20">
    <div class="max-w-6xl mx-auto px-4">
      <div class="flex items-center justify-between gap-4 py-2.5">
        <RouterLink to="/" class="flex items-center gap-2 shrink-0">
          <img :src="logo" alt="VMC" class="h-9 w-9 object-contain" />
          <span class="text-lg font-extrabold tracking-tight leading-none">
            VMC<span class="text-accent-300"> Shop</span>
          </span>
        </RouterLink>

        <!-- Links de escritorio -->
        <div class="hidden lg:flex items-center gap-6 text-sm ml-auto">
          <RouterLink to="/" :class="linkClase">
            <i class="fa-solid fa-house text-xs"></i>
            Inicio
          </RouterLink>

          <RouterLink to="/catalogo" :class="linkClase">
            <i class="fa-solid fa-store text-xs"></i>
            Catálogo
          </RouterLink>

          <RouterLink v-if="!auth.esAdmin" to="/servicios" :class="linkClase">
            <i class="fa-solid fa-stethoscope text-xs"></i>
            Servicios
          </RouterLink>

          <RouterLink to="/acerca-de" :class="linkClase">
            <i class="fa-solid fa-circle-info text-xs"></i>
            Acerca de
          </RouterLink>

          <template v-if="auth.esCliente">
            <RouterLink to="/carrito" :class="linkClase">
              <i class="fa-solid fa-cart-shopping text-xs"></i>
              Carrito
              <span
                v-if="carrito.cantidadItems"
                class="bg-accent-400 text-primary-900 rounded-full px-2 py-0.5 text-xs font-bold leading-none"
              >
                {{ carrito.cantidadItems }}
              </span>
            </RouterLink>
            <RouterLink to="/mis-pedidos" :class="linkClase">
              <i class="fa-solid fa-receipt text-xs"></i>
              Mis pedidos
            </RouterLink>
          </template>

          <!-- Los links de admin van agrupados en un dropdown para no saturar la barra -->
          <div v-if="auth.esAdmin" ref="adminMenuRef" class="relative">
            <button
              type="button"
              class="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 -mx-2.5 transition-colors"
              :class="adminMenuAbierto ? 'bg-white/15 text-white' : 'text-white/80 hover:text-white hover:bg-white/10'"
              @click="adminMenuAbierto = !adminMenuAbierto"
            >
              <i class="fa-solid fa-user-shield text-xs"></i>
              Administrador
              <i class="fa-solid fa-chevron-down text-[10px] transition-transform" :class="{ 'rotate-180': adminMenuAbierto }"></i>
            </button>

            <div
              v-if="adminMenuAbierto"
              class="absolute right-0 top-full mt-2 w-52 bg-white text-primary-900 rounded-lg shadow-lg ring-1 ring-black/5 py-1.5 flex flex-col"
            >
              <RouterLink
                v-for="link in adminLinks"
                :key="link.to"
                :to="link.to"
                class="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-700 transition-colors [&.router-link-active]:bg-primary-50 [&.router-link-active]:text-primary-700 [&.router-link-active]:font-semibold"
              >
                <i class="fa-solid text-xs w-3" :class="link.icono"></i>
                {{ link.texto }}
              </RouterLink>
            </div>
          </div>

          <div class="h-5 w-px bg-white/20 shrink-0" />

          <template v-if="auth.estaLogueado">
            <span class="text-white/70 flex items-center gap-1.5 text-xs max-w-[9rem] truncate" :title="auth.usuario.nombre">
              <i class="fa-solid fa-circle-user text-sm"></i>
              {{ auth.usuario.nombre }}
            </span>
            <button
              @click="cerrarSesion"
              class="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors shrink-0 font-medium"
            >
              <i class="fa-solid fa-right-from-bracket text-xs"></i>
              Salir
            </button>
          </template>
          <template v-else>
            <RouterLink to="/login" :class="linkClase" class="shrink-0">
              <i class="fa-solid fa-right-to-bracket text-xs"></i>
              Ingresar
            </RouterLink>
            <RouterLink
              to="/registro"
              class="bg-accent-400 hover:bg-accent-300 text-primary-900 px-3 py-1.5 rounded-lg font-semibold transition-colors shrink-0"
            >
              Registrarme
            </RouterLink>
          </template>
        </div>

        <!-- Boton de menu mobile/tablet -->
        <button
          type="button"
          class="lg:hidden flex items-center justify-center h-9 w-9 shrink-0 text-white"
          @click="menuAbierto = !menuAbierto"
        >
          <i class="fa-solid text-lg" :class="menuAbierto ? 'fa-xmark' : 'fa-bars'"></i>
        </button>
      </div>

      <!-- Panel de menu mobile/tablet -->
      <div v-if="menuAbierto" class="lg:hidden border-t border-white/15 py-3 flex flex-col text-sm">
        <RouterLink to="/" :class="linkMobileClase">
          <i class="fa-solid fa-house text-xs"></i>
          Inicio
        </RouterLink>

        <RouterLink to="/catalogo" :class="linkMobileClase">
          <i class="fa-solid fa-store text-xs"></i>
          Catálogo
        </RouterLink>

        <RouterLink v-if="!auth.esAdmin" to="/servicios" :class="linkMobileClase">
          <i class="fa-solid fa-stethoscope text-xs"></i>
          Servicios
        </RouterLink>

        <RouterLink to="/acerca-de" :class="linkMobileClase">
          <i class="fa-solid fa-circle-info text-xs"></i>
          Acerca de
        </RouterLink>

        <template v-if="auth.esCliente">
          <RouterLink to="/carrito" :class="linkMobileClase">
            <i class="fa-solid fa-cart-shopping text-xs"></i>
            Carrito
            <span
              v-if="carrito.cantidadItems"
              class="bg-accent-400 text-primary-900 rounded-full px-2 py-0.5 text-xs font-bold leading-none"
            >
              {{ carrito.cantidadItems }}
            </span>
          </RouterLink>
          <RouterLink to="/mis-pedidos" :class="linkMobileClase">
            <i class="fa-solid fa-receipt text-xs"></i>
            Mis pedidos
          </RouterLink>
        </template>

        <template v-if="auth.esAdmin">
          <div class="mt-2 pt-2 border-t border-white/10 text-white/50 text-xs uppercase tracking-wide">
            Administrador
          </div>
          <RouterLink v-for="link in adminLinks" :key="link.to" :to="link.to" :class="linkMobileClase">
            <i class="fa-solid text-xs" :class="link.icono"></i>
            {{ link.texto }}
          </RouterLink>
        </template>

        <div class="mt-2 pt-2 border-t border-white/10 flex flex-col gap-2">
          <template v-if="auth.estaLogueado">
            <span class="text-white/70 flex items-center gap-1.5 py-1">
              <i class="fa-solid fa-circle-user"></i>
              {{ auth.usuario.nombre }}
            </span>
            <button
              @click="cerrarSesion"
              class="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg transition-colors self-start font-medium"
            >
              <i class="fa-solid fa-right-from-bracket text-xs"></i>
              Salir
            </button>
          </template>
          <template v-else>
            <RouterLink to="/login" :class="linkMobileClase">
              <i class="fa-solid fa-right-to-bracket text-xs"></i>
              Ingresar
            </RouterLink>
            <RouterLink
              to="/registro"
              class="bg-accent-400 hover:bg-accent-300 text-primary-900 px-3 py-2 rounded-lg font-semibold transition-colors self-start"
            >
              Registrarme
            </RouterLink>
          </template>
        </div>
      </div>
    </div>
  </nav>
</template>
