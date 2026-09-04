# VMC Shop

Práctica Profesional Supervisada (PPS) — Tecnicatura Universitaria en Programación.

E-commerce full stack para la venta general para una veterinaria, con catálogo de productos, carrito de compras, gestión de pedidos, promociones y un panel de administración.

DEMO DESPLEGADA: https://vmcshop.onrender.com

## Stack

**Backend**
- [NestJS](https://nestjs.com/) + TypeScript
- TypeORM + MySQL
- Autenticación por sesión (Passport local + `express-session`)
- Documentación de la API con Swagger

**Frontend**
- Vue 3 + Vite
- Pinia (manejo de estado)
- Vue Router
- Tailwind CSS
- Axios

## Estructura del repositorio

```
VMC-Shop/
├── backend/    API REST (NestJS)
├── frontend/   Aplicación web (Vue 3)
└── docs/       Documentación del proyecto
```

## Funcionalidades principales

- Catálogo de productos por categorías
- Carrito de compras y checkout
- Registro / login de usuarios y sesión persistente
- Historial de pedidos del cliente ("Mis pedidos")
- Panel de administración: productos, categorías, pedidos, promociones y reportes

## Puesta en marcha

### Requisitos previos

- Node.js
- MySQL (o MariaDB, por ejemplo vía XAMPP)

### Backend

```bash
cd backend
npm install
cp .env.example .env   # completar los datos de conexión a la base de datos
npm run start:dev
```

La API queda disponible en `http://localhost:3000`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

La aplicación queda disponible en `http://localhost:5173`.

## Contexto académico

Este proyecto se desarrolla como Práctica Profesional Supervisada (PPS) de la Tecnicatura Universitaria en Programación.
