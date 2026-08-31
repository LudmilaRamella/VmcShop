import { createRouter, createWebHistory } from 'vue-router'
import { watch } from 'vue'
import { useAuthStore } from '../stores/auth'

import HomeView from '../views/HomeView.vue'
import CatalogoView from '../views/CatalogoView.vue'
import ProductoDetalleView from '../views/ProductoDetalleView.vue'
import AcercaDeView from '../views/AcercaDeView.vue'
import ServiciosView from '../views/ServiciosView.vue'
import LoginView from '../views/LoginView.vue'
import RegistroView from '../views/RegistroView.vue'
import OlvidePasswordView from '../views/OlvidePasswordView.vue'
import RestablecerPasswordView from '../views/RestablecerPasswordView.vue'
import ValidarCuentaView from '../views/ValidarCuentaView.vue'
import CarritoView from '../views/CarritoView.vue'
import MisPedidosView from '../views/MisPedidosView.vue'
import AdminProductosView from '../views/admin/AdminProductosView.vue'
import AdminCategoriasView from '../views/admin/AdminCategoriasView.vue'
import AdminMarcasView from '../views/admin/AdminMarcasView.vue'
import AdminBannersView from '../views/admin/AdminBannersView.vue'
import AdminPromocionesView from '../views/admin/AdminPromocionesView.vue'
import AdminPedidosView from '../views/admin/AdminPedidosView.vue'
import AdminReportesView from '../views/admin/AdminReportesView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/catalogo', name: 'catalogo', component: CatalogoView },
    { path: '/productos/:id', name: 'producto-detalle', component: ProductoDetalleView },
    { path: '/acerca-de', name: 'acerca-de', component: AcercaDeView },
    { path: '/servicios', name: 'servicios', component: ServiciosView },
    { path: '/login', name: 'login', component: LoginView },
    { path: '/registro', name: 'registro', component: RegistroView },
    { path: '/olvide-password', name: 'olvide-password', component: OlvidePasswordView },
    { path: '/restablecer-password', name: 'restablecer-password', component: RestablecerPasswordView },
    { path: '/validar-cuenta', name: 'validar-cuenta', component: ValidarCuentaView },
    { path: '/carrito', name: 'carrito', component: CarritoView, meta: { requiereCliente: true } },
    { path: '/mis-pedidos', name: 'mis-pedidos', component: MisPedidosView, meta: { requiereCliente: true } },

    {
      path: '/admin/productos',
      name: 'admin-productos',
      component: AdminProductosView,
      meta: { requiereAdmin: true },
    },
    {
      path: '/admin/categorias',
      name: 'admin-categorias',
      component: AdminCategoriasView,
      meta: { requiereAdmin: true },
    },
    {
      path: '/admin/marcas',
      name: 'admin-marcas',
      component: AdminMarcasView,
      meta: { requiereAdmin: true },
    },
    {
      path: '/admin/banners',
      name: 'admin-banners',
      component: AdminBannersView,
      meta: { requiereAdmin: true },
    },
    {
      path: '/admin/promociones',
      name: 'admin-promociones',
      component: AdminPromocionesView,
      meta: { requiereAdmin: true },
    },
    {
      path: '/admin/pedidos',
      name: 'admin-pedidos',
      component: AdminPedidosView,
      meta: { requiereAdmin: true },
    },
    {
      path: '/admin/reportes',
      name: 'admin-reportes',
      component: AdminReportesView,
      meta: { requiereAdmin: true },
    },
  ],
})

// Guard de navegacion: espeja del lado del frontend las mismas reglas de
// rol que ya exige el backend (el backend es quien realmente protege los
// datos; esto solo evita que el usuario vea una pantalla que de todas
// formas le va a rechazar cada request).
router.beforeEach(async (to) => {
  const auth = useAuthStore()

  // La verificacion de sesion inicial (auth.verificarSesion() en main.js) es
  // asincronica. En una carga directa o un F5 sobre una ruta protegida, la
  // primera navegacion del router puede resolverse antes de que esa
  // verificacion termine: el guard veria "usuario: null" (todavia no llego
  // la respuesta de /auth/me) y mandaria a login a alguien con una sesion
  // valida. Se espera a que "cargando" pase a false antes de decidir.
  if (auth.cargando) {
    await new Promise((resolve) => {
      const dejarDeObservar = watch(
        () => auth.cargando,
        (sigueCargando) => {
          if (!sigueCargando) {
            dejarDeObservar()
            resolve()
          }
        },
      )
    })
  }

  if (to.meta.requiereAuth && !auth.estaLogueado) return { name: 'login' }
  if (to.meta.requiereCliente && !auth.esCliente) return { name: 'login' }
  if (to.meta.requiereAdmin && !auth.esAdmin) return { name: 'catalogo' }

  // Servicios/solicitud de turno es exclusivo de clientes (el backend lo
  // exige con @Roles(Rol.CLIENTE)): un admin no deberia poder llegar a la
  // pantalla y completar el formulario para recien enterarse del 403 al
  // enviarlo. El link ya esta oculto para admin en el navbar; esto cubre
  // adema el caso de que entre poniendo la URL a mano.
  if (to.name === 'servicios' && auth.esAdmin) return { name: 'catalogo' }

  return true
})

export default router
