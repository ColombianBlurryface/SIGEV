# SIGEV · Frontend

Interfaz web de **SIGEV** (Sistema de Gestión y Planificación Logística de Eventos). Consume la API REST del backend (`/backend`) y permite iniciar sesión, consultar eventos y registrar sus requerimientos.

## Stack

| Herramienta | Uso |
| --- | --- |
| [React 19](https://react.dev) + [TypeScript](https://www.typescriptlang.org) | Interfaz y tipado |
| [Vite](https://vite.dev) | Servidor de desarrollo y build |
| [Tailwind CSS 4](https://tailwindcss.com) | Estilos y temas claro/oscuro |
| Componentes estilo [shadcn/ui](https://ui.shadcn.com) | Botones, inputs, alertas y tarjetas reutilizables (`src/components/ui`) |
| [React Router](https://reactrouter.com) | Rutas y rutas protegidas |
| [lucide-react](https://lucide.dev) | Iconos |
| [oxlint](https://oxc.rs) | Linter |

## Requisitos

- **Node.js 20.19+ o 22.12+** (lo exige Vite). Verifica con `node -v`.
- **npm 10+**.
- El **backend de SIGEV corriendo** (por defecto en `http://localhost:3000`). Ver el paso 2.

## Puesta en marcha paso a paso

### 1. Clonar el repositorio

```bash
git clone https://github.com/ColombianBlurryface/SIGEV.git
cd SIGEV
git switch develop
```

### 2. Levantar el backend

El frontend necesita la API para iniciar sesión.

```bash
cd backend
npm install
```

Crea el archivo `backend/.env` con estas variables (pide los valores reales al equipo; **nunca los subas al repositorio**):

| Variable | Descripción |
| --- | --- |
| `DB_HOST` | Host de PostgreSQL (Supabase: el host del *pooler*) |
| `DB_PORT` | Puerto de PostgreSQL |
| `DB_NAME` | Nombre de la base de datos |
| `DB_USER` | Usuario de la base de datos |
| `DB_PASSWORD` | Contraseña de la base de datos |
| `DB_SSL` | `true` para Supabase, `false` para un Postgres local |
| `PORT` | Puerto del backend (por defecto `3000`) |
| `JWT_SECRET` | Clave para firmar los tokens de sesión |

Si usas una base de datos nueva, crea las tablas y los datos de prueba ejecutando en orden `backend/src/db/schema.sql` y `backend/src/db/seeds.sql`.

No hay registro público: los usuarios se crean desde la terminal.

```bash
node src/scripts/crearUsuario.js <usuario> <contraseña> "<Nombre Completo>" [rol]
```

Inicia el backend y déjalo corriendo en esa terminal:

```bash
node src/server.js
```

Comprueba que responde en <http://localhost:3000/api/health>.

> El login (`POST /api/auth/login`), la variable `JWT_SECRET` y el script `crearUsuario.js` llegan con el PR de migración a Supabase y autenticación. Si tu `develop` todavía no los tiene, el login responderá 404.

### 3. Configurar el frontend

En otra terminal, desde la raíz del repositorio:

```bash
cd frontend
cp .env.example .env
npm install
```

| Variable | Descripción | Valor por defecto |
| --- | --- | --- |
| `VITE_API_URL` | URL base de la API, incluido el prefijo `/api` | `http://localhost:3000/api` |

### 4. Levantar el frontend

```bash
npm run dev
```

Abre <http://localhost:5173> e inicia sesión con un usuario creado en el paso 2.

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo con recarga en caliente |
| `npm run build` | Revisa tipos (`tsc`) y genera la versión de producción en `dist/` |
| `npm run preview` | Sirve localmente el contenido de `dist/` |
| `npm run lint` | Revisa el código con oxlint |

## Estructura del proyecto

```text
frontend/
├── public/                  Archivos estáticos (favicon)
├── src/
│   ├── components/
│   │   ├── ui/              Componentes base reutilizables (Button, Input, Label, Alert, Card)
│   │   ├── layout/          Piezas del layout (menú lateral)
│   │   ├── brand/           Logo
│   │   └── ThemeToggle.tsx  Interruptor de modo claro / oscuro
│   ├── config/              Lectura de variables de entorno
│   ├── context/             Estado global: sesión (AuthProvider) y tema (ThemeProvider)
│   ├── hooks/               Hooks para usar los contextos (useAuth, useTheme)
│   ├── layouts/             Layouts de página (AppLayout con menú lateral)
│   ├── lib/                 Utilidades (clases CSS, sesión en localStorage, JWT)
│   ├── pages/               Vistas por módulo (auth, eventos, 404)
│   ├── routes/              Router y guardas de rutas (protegidas / solo públicas)
│   ├── services/            Cliente HTTP y servicios por recurso de la API
│   ├── types/               Tipos compartidos
│   ├── App.tsx              Proveedores + router
│   ├── main.tsx             Punto de entrada
│   └── index.css            Tailwind y tokens de color de ambos temas
├── .env.example
├── index.html
└── vite.config.ts
```

Reglas para mantener el orden:

- Las **páginas** solo arman la vista; las llamadas a la API van en `services/` y los tipos en `types/`.
- Un componente que se reutiliza en varias vistas va en `components/`; uno que solo usa una página puede vivir junto a esa página.
- Los colores se usan por su nombre de token (`bg-primary`, `text-muted-foreground`, `bg-alimentos-soft`…), nunca en hexadecimal, para que funcionen en ambos temas.
- Importa con el alias `@/` (por ejemplo `@/components/ui/button`).

## Temas claro y oscuro

Los colores de cada tema están en `src/index.css` como variables CSS: `:root` para el modo claro (índigo) y `.dark` para el oscuro (negro y dorado). El usuario cambia de tema desde el menú lateral o desde el login, y la preferencia se guarda en el navegador.

## Flujo de trabajo con Git

Trabajamos **una historia de usuario por rama** y todo llega a `develop` por Pull Request.

1. Parte siempre de `develop` actualizado:

   ```bash
   git switch develop
   git pull
   git switch -c feature/hu-01-registrar-evento
   ```

2. Haz commits pequeños con mensajes en español, en infinitivo (por ejemplo `agregar formulario de registro de evento`).
3. Antes de subir, verifica que `npm run build` y `npm run lint` pasen.
4. Sube la rama y abre el PR hacia `develop`:

   ```bash
   git push -u origin feature/hu-01-registrar-evento
   gh pr create --base develop
   ```

## Problemas comunes

| Síntoma | Solución |
| --- | --- |
| «No se pudo conectar con el servidor» al iniciar sesión | El backend no está corriendo o `VITE_API_URL` apunta a otro puerto. |
| El login responde 404 | Tu backend todavía no tiene la ruta de autenticación (ver la nota del paso 2). |
| «Usuario o contraseña incorrectos» con datos correctos | El usuario no existe en la base a la que apunta tu `backend/.env`; créalo con `crearUsuario.js`. |
| Cambié `.env` y no se nota | Reinicia `npm run dev`; Vite solo lee las variables al arrancar. |
