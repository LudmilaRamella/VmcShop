import { defineStore } from 'pinia'
import api from '../services/api'

// Store del carrito de compras. Guarda el ultimo estado que devolvio el
// backend (items, totales, avisos de cambios de precio/stock) y expone
// acciones para agregar, modificar y quitar productos.
export const useCarritoStore = defineStore('carrito', {
  state: () => ({
    items: [],
    totales: null,
    avisos: [],
    cargando: false,
  }),

  getters: {
    cantidadItems: (state) => state.items.reduce((acc, item) => acc + item.cantidad, 0),
  },

  actions: {
    // El backend, ademas de devolver el carrito, lo sincroniza con el
    // catalogo (ajusta cantidades por stock, actualiza precios) y manda
    // "avisos" con los cambios que aplico. Esta funcion se usa despues de
    // cada operacion para que el store siempre refleje ese estado ya
    // corregido.
    aplicarRespuesta(data) {
      this.items = data.items
      this.totales = data.totales
      this.avisos = data.avisos
    },

    async cargar() {
      this.cargando = true
      try {
        const { data } = await api.get('/carrito')
        this.aplicarRespuesta(data)
      } finally {
        this.cargando = false
      }
    },

    async agregar(productoId, cantidad = 1) {
      const { data } = await api.post('/carrito/items', { productoId, cantidad })
      this.aplicarRespuesta(data)
    },

    async actualizarCantidad(itemId, cantidad) {
      const { data } = await api.put(`/carrito/items/${itemId}`, { cantidad })
      this.aplicarRespuesta(data)
    },

    async eliminar(itemId) {
      const { data } = await api.delete(`/carrito/items/${itemId}`)
      this.aplicarRespuesta(data)
    },

    async confirmarCompra(observaciones) {
      const { data } = await api.post('/pedidos/confirmar', { observaciones })
      // Despues de confirmar, el carrito queda vacio en el backend.
      this.items = []
      this.totales = null
      return data
    },
  },
})
