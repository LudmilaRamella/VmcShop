import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'
import '@fortawesome/fontawesome-free/css/all.min.css'
import './assets/main.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)

// Antes de montar la app se pregunta si ya hay una sesion activa (cookie
// valida). Si se montara sin esperar esto, el navbar mostraria "Iniciar
// sesion" por una fraccion de segundo aunque el usuario ya este logueado.
const auth = useAuthStore()
auth.verificarSesion().finally(() => {
  app.mount('#app')
})
