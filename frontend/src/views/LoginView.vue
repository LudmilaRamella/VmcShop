<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import logo from '../assets/logo.png'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const email = ref('')
const password = ref('')
const error = ref('')
const enviando = ref(false)
const cuentaNoValidada = ref(false)
const reenviando = ref(false)
const mensajeReenvio = ref('')
const cuentaValidada = ref(route.query.validada === '1')

async function enviar() {
  error.value = ''
  cuentaNoValidada.value = false
  mensajeReenvio.value = ''
  enviando.value = true
  try {
    await auth.login(email.value, password.value)
    if (typeof route.query.redirect === 'string') {
      router.push({ path: route.query.redirect, query: { servicio: route.query.servicio } })
    } else {
      router.push({ name: 'catalogo' })
    }
  } catch (e) {
    error.value = e.response?.data?.message || 'No se pudo iniciar sesión.'
    cuentaNoValidada.value = e.response?.data?.code === 'CUENTA_NO_VALIDADA'
  } finally {
    enviando.value = false
  }
}

async function reenviar() {
  mensajeReenvio.value = ''
  reenviando.value = true
  try {
    await auth.reenviarCodigo(email.value)
    mensajeReenvio.value = 'Te mandamos un nuevo código por mail.'
  } catch (e) {
    mensajeReenvio.value = e.response?.data?.message || 'No se pudo reenviar el código.'
  } finally {
    reenviando.value = false
  }
}
</script>

<template>
  <div class="max-w-sm mx-auto mt-6 sm:mt-10">
    <div class="flex flex-col items-center gap-2 mb-6">
      <img :src="logo" alt="VMC Shop" class="h-14 w-14 object-contain" />
      <span class="font-extrabold text-primary-700 tracking-tight">VMC<span class="text-accent-500"> Shop</span></span>
    </div>

    <div class="card p-8">
      <h1 class="text-xl font-bold text-gray-800 mb-1">Iniciar sesión</h1>
      <p class="text-sm text-gray-500 mb-6">Entra con tu cuenta para comprar.</p>

      <p v-if="cuentaValidada" class="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2 mb-4">
        Cuenta validada correctamente. Ya podes iniciar sesión.
      </p>

    <form @submit.prevent="enviar" class="space-y-4">
      <div>
        <label class="field-label">Email</label>
        <div class="relative">
          <i class="fa-solid fa-envelope absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
          <input v-model="email" type="email" required class="input-field pl-10" placeholder="tu@email.com" />
        </div>
      </div>
      <div>
        <label class="field-label">Password</label>
        <div class="relative">
          <i class="fa-solid fa-lock absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
          <input v-model="password" type="password" required class="input-field pl-10" placeholder="••••••••" />
        </div>
        <RouterLink to="/olvide-password" class="text-xs text-primary-700 font-semibold hover:underline block text-right mt-1.5">
          Olvidaste tu contraseña?
        </RouterLink>
      </div>

      <div v-if="error" class="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">
        <p>{{ error }}</p>
        <div v-if="cuentaNoValidada" class="flex items-center gap-3 mt-1">
          <button
            type="button"
            :disabled="reenviando"
            class="text-primary-700 font-semibold hover:underline disabled:opacity-50"
            @click="reenviar"
          >
            {{ reenviando ? 'Enviando...' : 'Reenviar código' }}
          </button>
          <RouterLink :to="{ name: 'validar-cuenta', query: { email } }" class="text-primary-700 font-semibold hover:underline">
            Ya tengo un código
          </RouterLink>
        </div>
      </div>
      <p v-if="mensajeReenvio" class="text-green-700 text-sm bg-green-50 rounded-lg px-3 py-2">{{ mensajeReenvio }}</p>

      <button type="submit" :disabled="enviando" class="btn-primary w-full flex items-center justify-center gap-2">
        <i class="fa-solid" :class="enviando ? 'fa-circle-notch fa-spin' : 'fa-right-to-bracket'"></i>
        {{ enviando ? 'Ingresando...' : 'Ingresar' }}
      </button>
    </form>

      <p class="text-sm text-gray-500 mt-5 text-center">
        No tenes cuenta?
        <RouterLink to="/registro" class="text-primary-700 font-semibold hover:underline">Registrate</RouterLink>
      </p>
    </div>
  </div>
</template>
