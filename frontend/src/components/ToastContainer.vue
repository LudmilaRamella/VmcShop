<script setup>
import { useNotificacionesStore } from '../stores/notificaciones'

const notificaciones = useNotificacionesStore()
</script>

<template>
  <div class="fixed top-4 right-4 z-50 flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]">
    <transition-group name="toast">
      <div
        v-for="item in notificaciones.items"
        :key="item.id"
        class="rounded-lg shadow-md px-4 py-3 text-sm font-medium flex items-start gap-2.5 border"
        :class="item.tipo === 'exito'
          ? 'bg-accent-50 text-accent-800 border-accent-200'
          : 'bg-red-50 text-red-700 border-red-200'"
      >
        <i
          class="fa-solid mt-0.5"
          :class="item.tipo === 'exito' ? 'fa-circle-check' : 'fa-circle-exclamation'"
        ></i>
        <p class="flex-1">{{ item.mensaje }}</p>
        <button @click="notificaciones.quitar(item.id)" class="opacity-60 hover:opacity-100" title="Cerrar" aria-label="Cerrar notificación">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    </transition-group>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.25s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
