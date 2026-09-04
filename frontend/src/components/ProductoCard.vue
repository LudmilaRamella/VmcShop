<script setup>
import { computed } from 'vue'
import { imagenProducto, alFallarImagen } from '../utils/imagenCatalogo'

const props = defineProps({
  producto: { type: Object, required: true },
})
defineEmits(['agregar'])

// Si el producto no trae "precio", es porque el backend lo oculto: no hay
// sesion iniciada. No se decide aca si mostrar o no el precio, solo se
// reacciona a lo que ya vino filtrado desde la API.
const tienePrecio = computed(() => props.producto.precio !== undefined)
const tieneDescuento = computed(() => !!props.producto.promocionAplicada)
const sinStock = computed(() => props.producto.stock === 0)

function etiquetaDescuento(promocion) {
  return promocion.tipo === 'porcentaje' ? `-${promocion.valor}%` : `-$${promocion.valor}`
}
</script>

<template>
  <div class="group card overflow-hidden flex flex-col h-full hover:shadow-md hover:-translate-y-0.5 hover:border-primary-200 transition-all duration-200">
    <RouterLink
      :to="{ name: 'producto-detalle', params: { id: producto.id } }"
      class="relative aspect-[4/3] w-full bg-gray-50 block overflow-hidden"
    >
      <img
        :src="imagenProducto(producto)"
        @error="alFallarImagen($event, 'producto')"
        :alt="producto.nombre"
        loading="lazy"
        class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.06]"
        :class="sinStock ? 'grayscale opacity-60' : ''"
      />

      <span
        v-if="sinStock"
        class="absolute top-2 right-2 bg-gray-800/90 text-white text-[11px] font-bold px-2.5 py-1 rounded-full"
      >
        Sin stock
      </span>
      <span
        v-else-if="tieneDescuento"
        class="absolute top-2 left-2 inline-flex items-center gap-1 bg-accent-500 text-white text-[11px] font-bold pl-1.5 pr-2.5 py-1 rounded-full shadow-sm"
      >
        <i class="fa-solid fa-tag text-[10px]"></i>
        {{ etiquetaDescuento(producto.promocionAplicada) }}
      </span>
    </RouterLink>

    <div class="p-3.5 flex flex-col flex-1">
      <span class="text-[11px] font-semibold uppercase tracking-wide text-primary-600">
        {{ producto.categoria?.nombre }}
      </span>

      <h3 class="font-semibold text-gray-800 text-[15px] leading-snug line-clamp-2 mt-0.5">
        <RouterLink :to="{ name: 'producto-detalle', params: { id: producto.id } }" class="hover:text-primary-700 transition-colors">
          {{ producto.nombre }}
        </RouterLink>
      </h3>

      <p v-if="producto.marca || !sinStock" class="text-xs text-gray-400 mt-1 truncate">
        <template v-if="producto.marca">{{ producto.marca.nombre }}</template>
        <template v-if="producto.marca && !sinStock"> &middot; </template>
        <template v-if="!sinStock">Stock: {{ producto.stock }}</template>
      </p>

      <p class="text-xs text-gray-400 mt-1.5 flex-1 line-clamp-2">{{ producto.descripcion }}</p>

      <div class="flex items-end justify-between gap-2 mt-2.5">
        <div v-if="tienePrecio" class="flex flex-col leading-none">
          <span v-if="tieneDescuento" class="text-[11px] text-gray-400 line-through mb-1">
            ${{ Number(producto.precio).toFixed(2) }}
          </span>
          <span class="text-xl font-extrabold text-primary-700">
            ${{ Number(producto.precioConDescuento ?? producto.precio).toFixed(2) }}
          </span>
        </div>
        <RouterLink v-else to="/login" class="flex items-center gap-1.5 text-sm text-primary-600 font-medium hover:underline">
          <i class="fa-solid fa-lock text-xs"></i>
          Ver precio
        </RouterLink>
      </div>

      <button
        v-if="tienePrecio"
        class="btn-primary mt-3 w-full text-sm flex items-center justify-center gap-2"
        :disabled="sinStock"
        @click="$emit('agregar', producto)"
      >
        <i class="fa-solid fa-cart-plus"></i>
        {{ sinStock ? 'Sin stock' : 'Agregar al carrito' }}
      </button>
      <RouterLink v-else to="/login" class="btn-outline mt-3 w-full text-sm flex items-center justify-center gap-2">
        <i class="fa-solid fa-right-to-bracket"></i>
        Iniciar sesión
      </RouterLink>
    </div>
  </div>
</template>
