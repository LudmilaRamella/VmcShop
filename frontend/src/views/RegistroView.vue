<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import logo from '../assets/logo.png'

const auth = useAuthStore()
const router = useRouter()

const form = ref({ nombre: '', apellido: '', email: '', password: '', telefono: '' })
const errores = ref([])
const enviando = ref(false)

async function enviar() {
  errores.value = []
  enviando.value = true
  try {
    const { data } = await auth.registro(form.value)
    router.push({
      name: 'validar-cuenta',
      query: { email: form.value.email, mailFallo: data.mailEnviado ? undefined : '1' },
    })
  } catch (e) {
    const mensaje = e.response?.data?.message
    errores.value = Array.isArray(mensaje) ? mensaje : [mensaje || 'No se pudo completar el registro.']
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
    <h1 class="text-xl font-bold text-gray-800 mb-1">Crear cuenta</h1>
    <p class="text-sm text-gray-500 mb-6">Registrate para empezar a comprar.</p>

    <form @submit.prevent="enviar" class="space-y-4">
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="field-label">Nombre</label>
          <input v-model="form.nombre" required class="input-field" />
        </div>
        <div>
          <label class="field-label">Apellido</label>
          <input v-model="form.apellido" required class="input-field" />
        </div>
      </div>
      <div>
        <label class="field-label">Email</label>
        <div class="relative">
          <i class="fa-solid fa-envelope absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
          <input v-model="form.email" type="email" required class="input-field pl-10" />
        </div>
      </div>
      <div>
        <label class="field-label">Password (mínimo 8 caracteres)</label>
        <div class="relative">
          <i class="fa-solid fa-lock absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
          <input v-model="form.password" type="password" required minlength="8" class="input-field pl-10" />
        </div>
      </div>
      <div>
        <label class="field-label">Teléfono (opcional)</label>
        <div class="relative">
          <i class="fa-solid fa-phone absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
          <input v-model="form.telefono" class="input-field pl-10" />
        </div>
      </div>

      <ul v-if="errores.length" class="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2 list-disc pl-6 space-y-0.5">
        <li v-for="(err, i) in errores" :key="i">{{ err }}</li>
      </ul>

      <button type="submit" :disabled="enviando" class="btn-primary w-full flex items-center justify-center gap-2">
        <i class="fa-solid" :class="enviando ? 'fa-circle-notch fa-spin' : 'fa-user-plus'"></i>
        {{ enviando ? 'Creando cuenta...' : 'Registrarme' }}
      </button>
    </form>
    </div>
  </div>
</template>
