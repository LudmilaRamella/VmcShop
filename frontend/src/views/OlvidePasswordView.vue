<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import logo from '../assets/logo.png'

const auth = useAuthStore()

const email = ref('')
const error = ref('')
const enviado = ref(false)
const enviando = ref(false)

async function enviar() {
  error.value = ''
  enviando.value = true
  try {
    await auth.olvidePassword(email.value)
    enviado.value = true
  } catch (e) {
    error.value = e.response?.data?.message || 'No se pudo procesar el pedido.'
  } finally {
    enviando.value = false
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
    <h1 class="text-xl font-bold text-gray-800 mb-1">Recuperar contraseña</h1>
    <p class="text-sm text-gray-500 mb-6">Te mandamos un mail con instrucciones para elegir una nueva.</p>

    <div v-if="enviado" class="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
      Si el email está registrado, vas a recibir un mail con instrucciones en breve.
    </div>

    <form v-else @submit.prevent="enviar" class="space-y-4">
      <div>
        <label class="field-label">Email</label>
        <div class="relative">
          <i class="fa-solid fa-envelope absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
          <input v-model="email" type="email" required class="input-field pl-10" placeholder="tu@email.com" />
        </div>
      </div>

      <p v-if="error" class="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{{ error }}</p>

      <button type="submit" :disabled="enviando" class="btn-primary w-full flex items-center justify-center gap-2">
        <i class="fa-solid" :class="enviando ? 'fa-circle-notch fa-spin' : 'fa-paper-plane'"></i>
        {{ enviando ? 'Enviando...' : 'Enviar instrucciones' }}
      </button>
    </form>

    <p class="text-sm text-gray-500 mt-5 text-center">
      <RouterLink to="/login" class="text-primary-700 font-semibold hover:underline">Volver a iniciar sesión</RouterLink>
    </p>
    </div>
  </div>
</template>
