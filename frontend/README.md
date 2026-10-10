# SIGEV · Frontend

Interfaz web de **SIGEV** (Sistema de Gestión y Planificación Logística de Eventos). Consume la API REST del backend (`/backend`) para iniciar sesión, consultar y registrar eventos con sus requerimientos, y administrar el inventario propio.

| Modo claro | Modo oscuro |
| --- | --- |
| ![Eventos en modo claro](../docs/imagenes/eventos-claro.png) | ![Eventos en modo oscuro](../docs/imagenes/eventos-oscuro.png) |

## Stack

| Herramienta | Uso |
| --- | --- |
| [React 19](https://react.dev) + [TypeScript](https://www.typescriptlang.org) | Interfaz y tipado |
| [Vite](https://vite.dev) | Servidor de desarrollo y build |
| [Tailwind CSS 4](https://tailwindcss.com) | Estilos y temas claro/oscuro |
| Componentes estilo [shadcn/ui](https://ui.shadcn.com) | Botones, campos, alertas y tarjetas reutilizables (`src/components/ui`) |
| [React Router](https://reactrouter.com) | Páginas y rutas protegidas |
| [lucide-react](https://lucide.dev) | Íconos |
| [oxlint](https://oxc.rs) | Linter |

## Requisitos

- **Node.js 20.19+ o 22.12+** (lo exige Vite). Verifica con `node -v`.
- **npm 10+**.
- El **backend de SIGEV corriendo** (por defecto en `http://localhost:3000`). Ver [`backend/README.md`](../backend/README.md).

## Puesta en marcha

### 1. Levantar el backend

Sigue [`backend/README.md`](../backend/README.md): instalar dependencias, crear `backend/.env` a partir de `.env.example`, crear un usuario con `crearUsuario.js` y ejecutar `node src/server.js`.

### 2. Configurar el frontend

En otra terminal, desde la raíz del repositorio:

```bash
cd frontend
cp .env.example .env
npm install
```

| Variable | Descripción | Valor por defecto |
| --- | --- | --- |
| `VITE_API_URL` | URL base de la API, incluido el prefijo `/api` | `http://localhost:3000/api` |

### 3. Levantar el frontend

```bash
npm run dev
```

Abre <http://localhost:5173> e inicia sesión con un usuario creado en el paso 1.

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo con recarga en caliente |
| `npm run build` | Revisa tipos (`tsc`) y genera la versión de producción en `dist/` |
| `npm run preview` | Sirve localmente el contenido de `dist/` |
| `npm run lint` | Revisa el código con oxlint |

## Pantallas

| Ruta | Pantalla | Historias |
| --- | --- | --- |
| `/login` | Inicio de sesión (sin registro público) | Login |
| `/eventos` | Resumen, búsqueda, filtros y detalle del evento seleccionado (con el mobiliario propio y a alquilar). Acepta `?evento=ID` para abrir un evento concreto. | HU-06, HU-12 |
| `/eventos/nuevo` | Asistente de registro en 3 pasos: datos, requerimientos y resumen. Las bebidas generales y las de coctelería se registran por separado; el mobiliario se elige del inventario y muestra qué se alquila. | HU-01 a HU-05, HU-07, HU-12, HU-13 |
| `/inventario` | Elementos del inventario por categoría (Mobiliario, Bar/Bebidas, Bebidas de Coctelería y Vajilla) y por propiedad (propio o alquilado), adquisiciones e historial de movimientos | HU-08, HU-09, HU-12 |

![Registro de evento, paso 2](../docs/imagenes/registro-paso2-alimentos.png)

## Estructura del proyecto

```text
frontend/src/
├── main.tsx                 Punto de entrada: monta la app
├── App.tsx                  Proveedores globales (tema y sesión) + router
├── index.css                Tailwind y los colores de ambos temas
├── config/                  Variables de entorno (URL de la API)
├── routes/                  Mapa de rutas y guardas (páginas privadas / solo públicas)
├── layouts/                 Estructura de las páginas privadas (menú lateral + contenido)
├── pages/                   Una carpeta por módulo: auth, eventos, inventario, más la página 404
├── components/
│   ├── ui/                  Componentes base reutilizables (Button, Input, Select, Alert, Card...)
│   ├── layout/              Menú lateral
│   ├── brand/               Logo
│   ├── eventos/             Tabla, filtros, detalle, campo de asistentes...
│   │   └── registro/        Pasos y pestañas del asistente de registro
│   └── inventario/          Formularios, tabla e historial de movimientos
├── context/                 Estado global: sesión (AuthProvider) y tema (ThemeProvider)
├── hooks/                   Acceso al estado global y carga de datos (useEventos, useInventario...)
├── services/                Cliente HTTP (api.ts) y un servicio por recurso de la API
├── lib/                     Reglas de negocio, cálculos, formatos, sesión y utilidades
└── types/                   Tipos compartidos (eventos, catálogo, inventario, sesión...)
```

Reglas para mantener el orden:

- Las **páginas** solo arman la vista; las llamadas a la API van en `services/` y los tipos en `types/`.
- Las **reglas de negocio** (rango de asistentes, fórmulas de cálculo) viven en `lib/` y deben coincidir con las del backend.
- Un componente que se reutiliza en varias vistas va en `components/`; uno que solo usa un módulo va en la carpeta de ese módulo.
- Los colores se usan por su nombre de token (`bg-primary`, `text-muted-foreground`, `bg-alimentos-soft`…), nunca en hexadecimal, para que funcionen en ambos temas.
- Importa con el alias `@/` (por ejemplo `@/components/ui/button`).
- Cada archivo empieza con un comentario que explica para qué sirve; comenta en español la lógica que no sea obvia.

## Cómo se conecta con el backend

1. Todas las llamadas pasan por `apiRequest` en [`src/services/api.ts`](src/services/api.ts), que arma la URL con `VITE_API_URL`, agrega el token de sesión y convierte los errores del servidor en mensajes claros.
2. Cada recurso tiene su servicio (`eventosService`, `inventarioService`...) y, cuando hace falta cargar datos en una página, un hook (`useEventos`, `useInventario`...) que expone `cargando`, `error` y `recargar`.
3. La sesión se guarda en el `localStorage` del navegador y se cierra sola cuando vence el token (8 horas).

## Temas claro y oscuro

Los colores de cada tema están en `src/index.css` como variables CSS: `:root` para el modo claro (índigo) y `.dark` para el oscuro (negro y dorado). El usuario cambia de tema desde el menú lateral o desde el login, y la preferencia se guarda en el navegador.

| Modo claro | Modo oscuro |
| --- | --- |
| ![Login en modo claro](../docs/imagenes/login-claro.png) | ![Login en modo oscuro](../docs/imagenes/login-oscuro.png) |

## Flujo de trabajo con Git

Trabajamos **una historia de usuario por rama** y todo llega a `develop` por Pull Request.

1. Parte siempre de `develop` actualizado:

   ```bash
   git switch develop
   git pull
   git switch -c feature/hu-XX-descripcion-corta
   ```

2. Haz commits pequeños con mensajes en español, en infinitivo (por ejemplo `agregar formulario de registro de evento`).
3. Antes de subir, verifica que `npm run build` y `npm run lint` pasen.
4. Sube la rama y abre el PR hacia `develop`:

   ```bash
   git push -u origin feature/hu-XX-descripcion-corta
   gh pr create --base develop
   ```

## Problemas comunes

| Síntoma | Solución |
| --- | --- |
| «No se pudo conectar con el servidor» al iniciar sesión | El backend no está corriendo o `VITE_API_URL` apunta a otro puerto. |
| «Usuario o contraseña incorrectos» con datos correctos | El usuario no existe en la base a la que apunta tu `backend/.env`; créalo con `crearUsuario.js`. |
| La pantalla de inventario muestra un error al cargar | A la base le faltan las tablas del inventario: ejecuta de nuevo `backend/src/db/schema.sql`. |
| Cambié `.env` y no se nota | Reinicia `npm run dev`; Vite solo lee las variables al arrancar. |
