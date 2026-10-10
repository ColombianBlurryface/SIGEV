# SIGEV · Sistema de Gestión y Planificación Logística de Eventos

SIGEV ayuda a una empresa de eventos a **planificar cada evento con precisión**: registra el evento y sus asistentes y calcula automáticamente cuánta comida y bebida se necesita, con un margen de seguridad del 10%. También lleva el mobiliario, los servicios adicionales y el **inventario propio** de la organización.

![Pantalla de eventos](docs/imagenes/eventos-claro.png)

---

## Contenido

- [Funcionalidades](#funcionalidades)
- [Capturas](#capturas)
- [Arquitectura](#arquitectura)
- [Estructura del repositorio](#estructura-del-repositorio)
- [Puesta en marcha](#puesta-en-marcha)
- [Base de datos](#base-de-datos)
- [Reglas de negocio](#reglas-de-negocio)
- [Flujo de trabajo del equipo](#flujo-de-trabajo-del-equipo)
- [Pendientes y próximos pasos](#pendientes-y-próximos-pasos)

---

## Funcionalidades

| Historia | Qué permite | Dónde está |
| --- | --- | --- |
| Login | Iniciar sesión con usuario y contraseña. No hay registro público: el administrador crea las cuentas. | `/login` |
| HU-01 | Registrar un evento: nombre, tipo, fecha, duración, asistentes y observaciones. | Nuevo evento · paso 1 |
| HU-07 | Validar que el evento tenga entre 40 y 600 asistentes, con aviso inmediato si está fuera de rango. | Nuevo evento · paso 1 |
| HU-02 | Agregar alimentos del catálogo con su porción por persona y los componentes del menú. | Nuevo evento · paso 2 |
| HU-03 | Agregar bebidas individuales (por persona) o compartidas (por botella). | Nuevo evento · paso 2 |
| Catálogo | Crear, editar y activar o desactivar los alimentos y bebidas con los que se calculan los eventos, con sus datos de cálculo y su precio. Los productos nuevos aparecen enseguida al registrar un evento. | `/catalogo` |
| HU-13 | Registrar por separado las bebidas generales y las del bar de coctelería: cada grupo tiene sus productos, su tabla y su subtotal, también en el resumen y el detalle del evento. En el inventario, las dos categorías se registran y consultan sin mezclarse. | Nuevo evento · paso 2 y 3, detalle del evento, `/inventario` |
| HU-04 | Agregar el mobiliario del evento, elegido del inventario (o «Otro» si no está), con su cantidad. | Nuevo evento · paso 2 |
| HU-05 | Agregar servicios adicionales (DJ, música, sonido, entretenimiento...). | Nuevo evento · paso 2 |
| HU-06 | Consultar los eventos con búsqueda, filtro por estado y el detalle de sus requerimientos y costos. | `/eventos` |
| HU-08 | Registrar elementos del inventario propio, actualizar su cantidad y consultarlos. | `/inventario` |
| HU-09 | Registrar adquisiciones que suman al inventario, con historial de todos los movimientos. | `/inventario` |
| HU-09 · clasificación | Clasificar el inventario en cuatro categorías cerradas: Mobiliario, Bar/Bebidas, Bebidas de Coctelería y Vajilla. No existe «Decoración». Se filtra por categoría y se puede cambiar la categoría de un elemento (por ahora solo en la API). | `/inventario` |
| HU-10 | Dar de baja unidades dañadas desde una sección aparte: se elige el elemento y se escribe solo la cantidad dañada; el sistema hace la resta, muestra el nuevo total y no deja dar de baja más de lo disponible. | `/inventario` · pestaña «Baja» |
| HU-12 | Diferenciar lo propio de lo alquilado: cada elemento del inventario se registra como **Propio** o **Alquilado** (con filtro por propiedad), cada línea de mobiliario del evento dice cuántas unidades son propias y cuántas se alquilan, y se avisa de alquiler cuando el evento supera el umbral de asistentes (200 por defecto). | `/inventario`, nuevo evento · paso 2 y 3, detalle del evento |

Además, toda la aplicación tiene **modo claro y modo oscuro**, que se cambia desde el menú lateral o desde el login.

---

## Capturas

### Inicio de sesión

| Modo claro | Modo oscuro |
| --- | --- |
| ![Login en modo claro](docs/imagenes/login-claro.png) | ![Login en modo oscuro](docs/imagenes/login-oscuro.png) |

### Eventos (HU-06)

Resumen, búsqueda, filtros por estado y, a la derecha, el detalle del evento seleccionado con sus requerimientos y el costo estimado.

| Modo claro | Modo oscuro |
| --- | --- |
| ![Eventos en modo claro](docs/imagenes/eventos-claro.png) | ![Eventos en modo oscuro](docs/imagenes/eventos-oscuro.png) |

En el detalle, el mobiliario se compara con el **inventario actual**: si después se compran más unidades, lo que hay que alquilar baja solo.

![Detalle de un evento con mobiliario propio y alquilado](docs/imagenes/eventos-alquiler.png)

### Registrar un evento (HU-01 a HU-05 y HU-07)

El registro es un asistente de tres pasos. Todo se guarda al final, en un solo envío.

**Paso 1 · Datos del evento.** A la derecha se ve una vista previa en vivo.

![Paso 1 del registro](docs/imagenes/registro-paso1-datos.png)

Si el número de asistentes está fuera del rango permitido, el campo lo avisa de inmediato y no deja avanzar:

![Validación de asistentes](docs/imagenes/validacion-asistentes.png)

**Paso 2 · Requerimientos.** Una pestaña por categoría. Las cantidades y costos se calculan mientras se escribe.

| Alimentos | Bebidas (generales y bar de coctelería, HU-13) |
| --- | --- |
| ![Pestaña de alimentos](docs/imagenes/registro-paso2-alimentos.png) | ![Pestaña de bebidas](docs/imagenes/registro-paso2-bebidas.png) |

![Pestaña de servicios adicionales](docs/imagenes/registro-paso2-servicios.png)

**Mobiliario propio y alquilado (HU-12).** El mobiliario se elige del inventario. Cada línea indica cuántas unidades son propias y cuántas hay que alquilar; lo que no está en el inventario va todo a alquiler. Con más de 200 asistentes aparece el aviso de alquiler (RN-03).

![Pestaña de mobiliario con unidades propias y a alquilar](docs/imagenes/registro-paso2-mobiliario.png)

**Paso 3 · Resumen.** Revisión final con el costo estimado antes de guardar.

![Paso 3 del registro](docs/imagenes/registro-paso3-resumen.png)

### Catálogo

Aquí se mantienen los productos que se ofrecen al registrar un evento. Cada uno lleva cómo se calcula (gramos por persona, unidades por persona o botella compartida) y su precio; mientras se escribe, una vista previa muestra cuánto saldría con 100 asistentes. Los productos no se borran: se desactivan, y los eventos ya guardados conservan sus cantidades y costos.

![Pantalla de catálogo](docs/imagenes/catalogo.png)

### Inventario (HU-08 y HU-09)

Registro de elementos y adquisiciones, tabla con búsqueda y filtros por categoría, y el historial de movimientos (registros, adquisiciones y ajustes).

| Modo claro | Modo oscuro |
| --- | --- |
| ![Inventario en modo claro](docs/imagenes/inventario-claro.png) | ![Inventario en modo oscuro](docs/imagenes/inventario-oscuro.png) |

**Baja por daño (HU-10).** La pestaña «Baja» (o el botón «Baja» de cada fila) separa esta acción de actualizar la cantidad: solo se escribe cuántas unidades se dañaron y el sistema resta. Lo dado de baja deja de contarse como disponible, también para los eventos.

![Sección de baja de elementos dañados](docs/imagenes/inventario-baja.png)

Cada elemento es **propio** o **alquilado** a un proveedor (HU-12). Los alquilados se marcan con su etiqueta, se pueden filtrar y no suman a las unidades propias; en un evento, todo lo que se pida de ellos cuenta como «a alquilar».

![Inventario filtrado por elementos alquilados](docs/imagenes/inventario-propiedad.png)

Las categorías son un conjunto cerrado (Mobiliario, Bar/Bebidas, Bebidas de Coctelería y Vajilla); el filtro de cada una muestra solo sus elementos:

![Inventario filtrado por Vajilla](docs/imagenes/inventario-vajilla.png)

> Las capturas se tomaron con datos de ejemplo en una base de datos local.

---

## Arquitectura

```mermaid
flowchart LR
    U[Usuario en el navegador] --> F[Frontend<br/>React + Vite]
    F -- "HTTP / JSON<br/>(token JWT)" --> B[Backend<br/>Node.js + Express]
    B -- "SQL (pg)" --> D[(PostgreSQL<br/>Supabase)]
```

| Capa | Tecnologías | Carpeta |
| --- | --- | --- |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4, componentes estilo shadcn/ui, React Router | [`frontend/`](frontend) |
| Backend | Node.js, Express 5, `pg` (consultas SQL directas), JWT, bcrypt | [`backend/`](backend) |
| Base de datos | PostgreSQL alojado en Supabase (se conecta por el *pooler*) | [`backend/src/db/`](backend/src/db) |

- El **frontend** solo muestra información y valida antes de enviar; nunca habla directamente con la base de datos.
- El **backend** aplica las reglas de negocio (cálculos, validaciones, transacciones) y es el único que consulta la base.
- **Supabase** se usa solo como PostgreSQL administrado: no se usan su autenticación ni su API automática.

---

## Estructura del repositorio

```text
SIGEV/
├── backend/                 API REST (Node.js + Express)
│   ├── src/
│   │   ├── server.js        Punto de entrada: configura Express y registra las rutas
│   │   ├── config/          Conexión a PostgreSQL
│   │   ├── routes/          Rutas de cada módulo (auth, eventos, catálogo, inventario)
│   │   ├── controllers/     Lógica de cada ruta: validaciones, cálculos y consultas SQL
│   │   ├── middlewares/     Validaciones previas y verificación del token
│   │   ├── scripts/         Script para crear usuarios
│   │   └── db/              schema.sql (estructura) y seeds.sql (datos iniciales)
│   ├── .env.example         Plantilla de variables de entorno
│   └── README.md            Documentación de la API
├── frontend/                Aplicación web (React + Vite)
│   ├── src/                 Páginas, componentes, servicios, hooks y tipos
│   └── README.md            Cómo levantarlo y cómo está organizado
└── docs/
    └── imagenes/            Capturas usadas en la documentación
```

---

## Puesta en marcha

Requisitos: **Node.js 20.19 o superior** (o 22.12+) y **npm 10+**.

```bash
git clone https://github.com/ColombianBlurryface/SIGEV.git
cd SIGEV
git switch develop
```

1. **Backend:** sigue [`backend/README.md`](backend/README.md). En resumen: `cd backend`, `npm install`, copiar `.env.example` a `.env` con los datos de Supabase y ejecutar `node src/server.js`.
2. **Frontend:** sigue [`frontend/README.md`](frontend/README.md). En resumen: `cd frontend`, `npm install`, copiar `.env.example` a `.env` y ejecutar `npm run dev`.
3. Abre <http://localhost:5173> e inicia sesión con un usuario creado con el script `crearUsuario.js`.

---

## Base de datos

La estructura completa está en [`backend/src/db/schema.sql`](backend/src/db/schema.sql) y los productos iniciales del catálogo en [`backend/src/db/seeds.sql`](backend/src/db/seeds.sql).

| Tabla | Para qué sirve |
| --- | --- |
| `eventos` | Datos generales de cada evento y su estado (planificación, confirmado, realizado, cancelado). |
| `catalogo_productos` | Productos del catálogo (alimentos y bebidas con porción y precio) y también los elementos del inventario (los que tienen `categoria_inventario`). El nombre es único dentro del catálogo y, por separado, dentro del inventario. |
| `evento_productos` | Alimentos y bebidas de cada evento con la cantidad neta, la cantidad con margen y el costo estimado. |
| `requerimientos_adicionales` | Mobiliario y servicios adicionales de cada evento (sin cálculo automático). El mobiliario guarda en `producto_id` el elemento del inventario con el que se relaciona (HU-12). |
| `usuarios` | Cuentas que pueden iniciar sesión (contraseña guardada como hash bcrypt). |
| `movimientos_inventario` | Historial de cada cambio de cantidad del inventario: registro inicial, adquisición, ajuste o baja por daño. |

> **Importante:** modificar `schema.sql` **no actualiza Supabase por sí solo**. Quien cambie una tabla debe ejecutar ese cambio en Supabase (SQL Editor) dentro del mismo PR y avisarlo en la descripción.

---

## Reglas de negocio

- Un evento debe tener **entre 40 y 600 asistentes** (RN-01 / HU-07).
- Con **más de 300 asistentes** el evento es de modalidad **buffet** (RN-02).
- Con **más de 200 asistentes** (valor por defecto del umbral) se avisa que probablemente haya que **alquilar mobiliario** (RN-03 / P-05).
- El mobiliario de un evento se compara con el stock actual del inventario: lo que alcanza es **propio** y el resto se **alquila**. Lo que no está en el inventario, o está marcado como **alquilado**, se alquila completo (HU-12).
- El umbral de 200 asistentes no está escrito en el código: se define con la variable `MAX_OWNED_CAPACITY_THRESHOLD` del backend (P-05). Si el cliente compra más inventario y el límite sube, solo se cambia el `.env` y se reinicia el servidor.
- Las **bebidas generales** (cerveza, vino, champaña, gaseosa) y las del **bar de coctelería** (licores fuertes) se manejan por separado y un producto pertenece a un solo grupo (RN-08 / HU-13).
- Todas las cantidades de alimentos y bebidas llevan un **margen de seguridad del 10%** (RN-09).
- Cómo se calcula cada producto:
  - **Por porción** (alimentos): asistentes × gramos por persona; si supera 1000 g se expresa en kg.
  - **Por unidad** (bebidas individuales): asistentes × unidades por persona, redondeado hacia arriba.
  - **Por botella** (bebidas compartidas): porciones por botella = volumen ÷ tamaño de la porción; botellas = asistentes ÷ porciones por botella, redondeado hacia arriba.
- El costo estimado solo incluye alimentos y bebidas; el mobiliario y los servicios se cotizan aparte.
- Todo elemento del inventario tiene **una de cuatro categorías**: Mobiliario, Bar/Bebidas, Bebidas de Coctelería o Vajilla. Cualquier otro valor (por ejemplo «Decoración») se rechaza, tanto en la API como en la base de datos (RF-10 / HU-09).
- En el inventario, la suma de los movimientos de cada elemento siempre es igual a su cantidad disponible.

---

## Flujo de trabajo del equipo

- **Una historia de usuario por rama**, creada desde `develop`: `feature/hu-XX-descripcion-corta`.
- **Commits** en español, en infinitivo y en minúscula, por ejemplo `agregar registro de bebidas`.
- Todo llega a `develop` mediante **Pull Request** con una descripción de qué cambió y cómo probarlo.
- Si el PR cambia la base de datos, se aplica en Supabase en el mismo PR y se indica en la descripción.
- Antes de abrir el PR: `npm run build` y `npm run lint` en el frontend deben pasar sin errores.

---

## Pendientes y próximos pasos

- **Proteger la API con el token de sesión:** hoy las rutas de eventos, catálogo e inventario responden sin token (el middleware `verificarToken` existe, pero no está aplicado). Con eso también se podrá registrar qué usuario hace cada movimiento.
- **Desplegar** la aplicación (propuesta: frontend y backend en Vercel, base de datos en Supabase).
- Editar los requerimientos y cambiar el estado de un evento ya creado.
