import { computed, ref, watch } from 'vue'

// Paginado del lado del cliente: para listados chicos (categorias, marcas,
// pedidos) donde el backend no pagina y no vale la pena pedirle que lo haga.
// Recibe un ref con la lista completa ya cargada y devuelve solo la porcion
// de la pagina actual.
export function usePaginadoCliente(itemsRef, porPagina = 8) {
  const pagina = ref(1)

  const totalPaginas = computed(() => Math.max(1, Math.ceil(itemsRef.value.length / porPagina)))

  const itemsPagina = computed(() => {
    const inicio = (pagina.value - 1) * porPagina
    return itemsRef.value.slice(inicio, inicio + porPagina)
  })

  // Si la lista se achica (filtro, baja de un item) y la pagina actual queda
  // fuera de rango, se vuelve a la ultima pagina que si tiene datos.
  watch(itemsRef, () => {
    if (pagina.value > totalPaginas.value) pagina.value = totalPaginas.value
  })

  function irAPagina(nueva) {
    if (nueva < 1 || nueva > totalPaginas.value) return
    pagina.value = nueva
  }

  return { pagina, totalPaginas, itemsPagina, irAPagina }
}
