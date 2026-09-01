import { io } from 'socket.io-client'

// Conexion unica al canal de avisos en vivo del backend. En produccion usa
// VITE_SOCKET_URL; en desarrollo, sin variable, usa el origen actual y el
// proxy '/socket.io' definido en vite.config.js.
const socket = io(import.meta.env.VITE_SOCKET_URL || undefined, {
  path: '/socket.io',
  withCredentials: true,
})

export default socket
