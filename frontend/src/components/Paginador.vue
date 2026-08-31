<script setup>
defineProps({
  pagina: { type: Number, required: true },
  totalPaginas: { type: Number, required: true },
})
const emit = defineEmits(['cambiar'])
</script>

<template>
  <div v-if="totalPaginas > 1" class="flex items-center justify-center gap-2 mt-4">
    <button
      @click="emit('cambiar', pagina - 1)"
      :disabled="pagina === 1"
      aria-label="Pagina anterior"
      class="w-9 h-9 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white flex items-center justify-center"
    >
      <i class="fa-solid fa-chevron-left text-xs"></i>
    </button>

    <span class="text-sm text-gray-600 px-2">Pagina {{ pagina }} de {{ totalPaginas }}</span>

    <button
      @click="emit('cambiar', pagina + 1)"
      :disabled="pagina === totalPaginas"
      aria-label="Pagina siguiente"
      class="w-9 h-9 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white flex items-center justify-center"
    >
      <i class="fa-solid fa-chevron-right text-xs"></i>
    </button>
  </div>
</template>
