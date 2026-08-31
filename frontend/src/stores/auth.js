import { defineStore } from 'pinia'
import api from '../services/api'

// Store de autenticacion: guarda quien es el usuario logueado (o null) y
// centraliza las llamadas de login/registro/logout. Los componentes
// consultan "usuario" y "esAdmin" en vez de manejar el estado de sesion
// cada uno por su cuenta.
export const useAuthStore = defineStore('auth', {
  state: () => ({
    usuario: null,
    cargando: true, // true mientras se verifica si ya habia una sesion activa
  }),

  getters: {
    estaLogueado: (state) => state.usuario !== null,
    esAdmin: (state) => state.usuario?.rol === 'admin',
    esCliente: (state) => state.usuario?.rol === 'cliente',
  },

  actions: {
    // Se llama una vez, al cargar la app: pregunta al backend si la cookie
    // de sesion que trae el navegador corresponde a un usuario logueado.
    async verificarSesion() {
      this.cargando = true
      try {
        const { data } = await api.get('/auth/me')
        this.usuario = data
      } catch {
        this.usuario = null
      } finally {
        this.cargando = false
      }
    },

    async login(email, password) {
      const { data } = await api.post('/auth/login', { email, password })
      this.usuario = data
      return data
    },

    async registro(datos) {
      return api.post('/auth/registro', datos)
    },

    async olvidePassword(email) {
      return api.post('/auth/olvide-password', { email })
    },

    async restablecerPassword(token, password) {
      return api.post('/auth/restablecer-password', { token, password })
    },

    async validarCuenta(email, codigo) {
      return api.post('/auth/validar-cuenta', { email, codigo })
    },

    async reenviarCodigo(email) {
      return api.post('/auth/reenviar-codigo', { email })
    },

    async logout() {
      await api.post('/auth/logout')
      this.usuario = null
    },
  },
})
