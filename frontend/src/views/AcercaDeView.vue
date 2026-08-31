<script setup>
const stackFrontend = ['Vue 3', 'Vite', 'Tailwind CSS', 'Pinia']
const stackBackend = ['NestJS', 'TypeORM', 'MySQL']
</script>

<template>
  <div class="max-w-3xl mx-auto">
    <div class="text-center mb-10">
      <span class="inline-flex items-center gap-2 bg-primary-50 text-primary-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-3">
        <i class="fa-solid fa-paw"></i>
        Trabajo Final Integrador
      </span>
      <h1 class="page-title">Sobre VMC Shop</h1>
      <p class="page-subtitle">Un poco de contexto sobre el proyecto y cómo se hizo.</p>
    </div>

    <section class="card p-6 sm:p-8 mb-6">
      <h2 class="text-lg font-bold text-gray-800 flex items-center gap-2 mb-3">
        <i class="fa-solid fa-store text-primary-500"></i>
        ¿Qué es VMC Shop?
      </h2>
      <p class="text-gray-600 leading-relaxed mb-4">
        VMC Shop es una tienda online de productos para mascotas: alimentos, accesorios, medicamentos y
        juguetes. Nació como Trabajo Final Integrador de mi carrera, pensado para cubrir de punta a
        punta el circuito de un e-commerce real, desde la vidriera hasta la administración del negocio.
      </p>
      <ul class="grid sm:grid-cols-2 gap-3 text-sm text-gray-600">
        <li class="flex items-start gap-2">
          <i class="fa-solid fa-magnifying-glass text-accent-500 mt-0.5"></i>
          Catálogo con búsqueda y filtro por categoría
        </li>
        <li class="flex items-start gap-2">
          <i class="fa-solid fa-cart-shopping text-accent-500 mt-0.5"></i>
          Carrito de compras y confirmación de pedido
        </li>
        <li class="flex items-start gap-2">
          <i class="fa-solid fa-receipt text-accent-500 mt-0.5"></i>
          Historial de pedidos para clientes
        </li>
        <li class="flex items-start gap-2">
          <i class="fa-solid fa-user-shield text-accent-500 mt-0.5"></i>
          Cuentas de cliente y de administrador
        </li>
        <li class="flex items-start gap-2">
          <i class="fa-solid fa-box text-accent-500 mt-0.5"></i>
          Panel admin para productos, categorías y stock
        </li>
        <li class="flex items-start gap-2">
          <i class="fa-solid fa-chart-line text-accent-500 mt-0.5"></i>
          Gestión de pedidos y reportes de ventas
        </li>
      </ul>
    </section>

    <section class="card p-6 sm:p-8 mb-6">
      <h2 class="text-lg font-bold text-gray-800 flex items-center gap-2 mb-3">
        <i class="fa-solid fa-code text-primary-500"></i>
        Stack tecnológico
      </h2>
      <div class="grid sm:grid-cols-2 gap-4 text-sm">
        <div>
          <p class="text-gray-500 font-medium mb-2">Frontend</p>
          <div class="flex flex-wrap gap-2">
            <span v-for="t in stackFrontend" :key="t" class="badge-success">{{ t }}</span>
          </div>
        </div>
        <div>
          <p class="text-gray-500 font-medium mb-2">Backend</p>
          <div class="flex flex-wrap gap-2">
            <span v-for="t in stackBackend" :key="t" class="badge-success">{{ t }}</span>
          </div>
        </div>
      </div>
    </section>

    <section class="card p-6 sm:p-8 mb-6 border-primary-100">
      <h2 class="text-lg font-bold text-gray-800 flex items-center gap-2 mb-3">
        <i class="fa-solid fa-heart text-primary-500"></i>
        Agradecimientos
      </h2>
      <p class="text-gray-600 leading-relaxed">
        Este proyecto lo desarrollé como práctica profesional junto a
        <a
          href="https://aurevora.com.ar"
          target="_blank"
          rel="noopener noreferrer"
          class="text-primary-600 font-semibold hover:text-primary-700 underline"
        >
          Aurevora
        </a>,
        a quienes quiero agradecer por el acompañamiento durante todo el proceso: por guiarme en el
        diseño de la aplicación, en la arquitectura del backend y del frontend, y por la buena onda para
        resolver dudas en cada etapa. Fue una gran oportunidad para llevar lo aprendido en la carrera a un
        proyecto real de principio a fin.
      </p>
      <p class="text-gray-600 leading-relaxed mt-4">
        También usé <span class="font-semibold">Claude AI</span> como apoyo durante el desarrollo: me
        ayudó a ordenar mejor la estructura del proyecto y a destrabarme rápido cuando me quedaba
        atascada con algún error o alguna duda puntual de código.
      </p>
    </section>

    <p class="text-center text-sm text-gray-400">
      Desarrollado por Ludmila Antonella Kuszñir Ramella &middot; 2026
    </p>
  </div>
</template>
