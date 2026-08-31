import { io } from 'socket.io-client'

// Conexion unica al canal de avisos en vivo del backend. Sin URL: usa el
// mismo origen de la pagina (localhost:5173 en desarrollo), y Vite lo
// redirige al backend via el proxy '/socket.io' definido en vite.config.js,
// igual que ya se hace con '/api' y '/uploads'.
const socket = io({ path: '/socket.io' })

export default socket
