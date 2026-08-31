<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import logo from '../assets/logo.png'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const token = ref(String(route.query.token || ''))
const password = ref('')
const confirmarPassword = ref('')
const error = ref('')
const listo = ref(false)
const enviando = ref(false)

async function enviar() {
  error.value = ''

  if (!token.value) {
    error.value = 'El link de recuperación no es válido.'
    return
  }
  if (password.value !== confirmarPassword.value) {
    error.value = 'Las passwords no coinciden.'
    return
  }

  enviando.value = true
  try {
    await auth.restablecerPassword(token.value, password.value)
    listo.value = true
    setTimeout(() => router.push({ name: 'login' }), 2000)
  } catch (e) {
    error.value = e.response?.data?.message || 'No se pudo restablecer la password.'
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
    <h1 class="text-xl font-bold text-gray-800 mb-1">Restablecer contraseña</h1>
    <p class="text-sm text-gray-500 mb-6">Elegí tu nueva password.</p>

    <div v-if="listo" class="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
      Password actualizada. Te llevamos a iniciar sesión...
    </div>

    <form v-else @submit.prevent="enviar" class="space-y-4">
      <div>
        <label class="field-label">Password nueva</label>
        <div class="relative">
          <i class="fa-solid fa-lock absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
          <input v-model="password" type="password" required minlength="8" class="input-field pl-10" placeholder="••••••••" />
        </div>
      </div>
      <div>
        <label class="field-label">Confirmar password</label>
        <div class="relative">
          <i class="fa-solid fa-lock absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
          <input v-model="confirmarPassword" type="password" required minlength="8" class="input-field pl-10" placeholder="••••••••" />
        </div>
      </div>

      <p v-if="error" class="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{{ error }}</p>

      <button type="submit" :disabled="enviando" class="btn-primary w-full flex items-center justify-center gap-2">
        <i class="fa-solid" :class="enviando ? 'fa-circle-notch fa-spin' : 'fa-key'"></i>
        {{ enviando ? 'Guardando...' : 'Guardar nueva password' }}
      </button>
    </form>
    </div>
  </div>
</template>
