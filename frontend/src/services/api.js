import axios from 'axios'

// Cliente HTTP centralizado. Todas las llamadas al backend pasan por aca en
// vez de usar axios directo en cada componente, para no repetir la
// configuracion (baseURL, cookies de sesion) en cada lugar.
//
// withCredentials: true es imprescindible para que el navegador mande la
// cookie de sesion (connect.sid) en cada request: sin esto, el backend
// recibiria las peticiones como si nadie estuviera logueado.
const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

export default api
