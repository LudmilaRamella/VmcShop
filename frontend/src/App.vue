<script setup>
import { RouterView, RouterLink } from 'vue-router'
import NavBar from './components/NavBar.vue'
import ToastContainer from './components/ToastContainer.vue'
</script>

<template>
  <div class="min-h-screen flex flex-col overflow-x-hidden">
    <ToastContainer />
    <NavBar />
    <main class="max-w-6xl mx-auto px-4 py-8 flex-1 w-full">
      <RouterView />
    </main>
    <footer class="border-t border-gray-200 py-4 text-center text-xs text-gray-400">
      VMC Shop &middot; Trabajo Final Integrador &middot; Ludmila Antonella Kuszñir Ramella - 2026 &middot;
      <RouterLink to="/acerca-de" class="text-gray-500 hover:text-gray-700 underline">Acerca del proyecto</RouterLink>
    </footer>
  </div>
</template>
