import { defineStore } from 'pinia'

// Store de notificaciones tipo "toast". Cualquier vista puede llamar a
// exito()/error() para avisar el resultado de una accion (crear, editar,
// eliminar, etc.) sin tener que manejar su propio estado de mensaje/timeout.
let siguienteId = 1

export const useNotificacionesStore = defineStore('notificaciones', {
  state: () => ({
    items: [],
  }),

  actions: {
    mostrar(mensaje, tipo = 'exito') {
      const id = siguienteId++
      this.items.push({ id, mensaje, tipo })
      setTimeout(() => this.quitar(id), 3500)
    },

    exito(mensaje) {
      this.mostrar(mensaje, 'exito')
    },

    error(mensaje) {
      this.mostrar(mensaje, 'error')
    },

    quitar(id) {
      this.items = this.items.filter((item) => item.id !== id)
    },
  },
})
