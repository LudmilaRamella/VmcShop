<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import logo from '../assets/logo.png'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const email = ref(route.query.email || '')
const mailFallo = ref(route.query.mailFallo === '1')
const codigo = ref('')
const error = ref('')
const validando = ref(false)
const reenviando = ref(false)
const mensajeReenvio = ref('')

async function validar() {
  error.value = ''
  mensajeReenvio.value = ''
  validando.value = true
  try {
    await auth.validarCuenta(email.value, codigo.value)
    router.push({ name: 'login', query: { validada: '1' } })
  } catch (e) {
    error.value = e.response?.data?.message || 'No se pudo validar la cuenta.'
  } finally {
    validando.value = false
  }
}

async function reenviar() {
  error.value = ''
  mensajeReenvio.value = ''
  reenviando.value = true
  try {
    await auth.reenviarCodigo(email.value)
    mailFallo.value = false
    mensajeReenvio.value = 'Te mandamos un nuevo código por mail.'
  } catch (e) {
    error.value = e.response?.data?.message || 'No se pudo reenviar el código.'
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
    <h1 class="text-xl font-bold text-gray-800 mb-1">Validar cuenta</h1>

    <p v-if="mailFallo" class="text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3.5 py-2.5 text-sm mb-6 flex items-start gap-2">
      <i class="fa-solid fa-triangle-exclamation mt-0.5 shrink-0"></i>
      Tu cuenta se creo correctamente, pero no pudimos enviarte el correo de verificación. Pedi un código nuevo con el boton de abajo.
    </p>
    <p v-else class="text-sm text-gray-500 mb-6">
      Te mandamos un código de validación por mail. Ingresalo aca para activar tu cuenta.
    </p>

    <form @submit.prevent="validar" class="space-y-4">
      <div>
        <label class="field-label">Email</label>
        <div class="relative">
          <i class="fa-solid fa-envelope absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
          <input v-model="email" type="email" required class="input-field pl-10" placeholder="tu@email.com" />
        </div>
      </div>
      <div>
        <label class="field-label">Código de validación</label>
        <div class="relative">
          <i class="fa-solid fa-key absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
          <input
            v-model="codigo"
            required
            inputmode="numeric"
            maxlength="6"
            class="input-field pl-10"
            placeholder="123456"
          />
        </div>
      </div>

      <p v-if="error" class="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{{ error }}</p>
      <p v-if="mensajeReenvio" class="text-green-700 text-sm bg-green-50 rounded-lg px-3 py-2">{{ mensajeReenvio }}</p>

      <button type="submit" :disabled="validando" class="btn-primary w-full flex items-center justify-center gap-2">
        <i class="fa-solid" :class="validando ? 'fa-circle-notch fa-spin' : 'fa-check'"></i>
        {{ validando ? 'Validando...' : 'Validar cuenta' }}
      </button>
    </form>

    <p class="text-sm text-gray-500 mt-5 text-center">
      No te llego el código?
      <button
        type="button"
        :disabled="reenviando || !email"
        class="text-primary-700 font-semibold hover:underline disabled:opacity-50"
        @click="reenviar"
      >
        {{ reenviando ? 'Enviando...' : 'Reenviar código' }}
      </button>
    </p>
    </div>
  </div>
</template>
