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
- [Despliegue en Vercel](#despliegue-en-vercel)
- [Pruebas y entorno de QA](#pruebas-y-entorno-de-qa)
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
| HU-03 | Agregar bebidas individuales (por persona) o compartidas (por botella). El catálogo trae las cervezas nacionales (Poker, Club Colombia, Águila, Águila Light, Costeña y Sol, 2 unidades por persona) y vinos y champaña (botella de 750 ml, porción de 125 ml). El valor unitario no viene precargado: se escribe al registrar el evento o en el Catálogo. | Nuevo evento · paso 2 |
| Catálogo | Crear, editar y activar o desactivar los alimentos y bebidas con los que se calculan los eventos, con sus datos de cálculo y su precio. Los productos nuevos aparecen enseguida al registrar un evento. | `/catalogo` |
| HU-13 | Registrar por separado las bebidas generales y las del bar de coctelería: cada grupo tiene sus productos, su tabla y su subtotal, también en el resumen y el detalle del evento. En el inventario, las dos categorías se registran y consultan sin mezclarse. | Nuevo evento · paso 2 y 3, detalle del evento, `/inventario` |
| HU-04 | Agregar el mobiliario del evento, elegido del inventario (o «Otro» si no está), con su cantidad. | Nuevo evento · paso 2 |
| HU-05 | Agregar servicios adicionales (DJ, música, sonido, entretenimiento...). | Nuevo evento · paso 2 |
| HU-06 | Consultar los eventos con búsqueda, filtro por estado y el detalle de sus requerimientos y costos. | `/eventos` |
| HU-08 | Registrar elementos del inventario propio, actualizar su cantidad y consultarlos. | `/inventario` |
| HU-09 | Registrar adquisiciones que suman al inventario, con historial de todos los movimientos. | `/inventario` |
| HU-09 · clasificación | Clasificar el inventario en cuatro categorías cerradas: Mobiliario, Bebidas Generales, Licores para Cócteles y Vajilla. No existe «Decoración». Se filtra por categoría y se puede cambiar la categoría de un elemento (por ahora solo en la API). | `/inventario` |
| HU-10 | Retirar unidades del inventario desde una sección aparte, «Retiro de elementos» (cubre daño, pérdida o devolución): se elige el elemento y se escribe solo la «Cantidad a retirar»; el sistema hace la resta, muestra el nuevo total y no deja retirar más de lo disponible. | `/inventario` · pestaña «Retiro» |
| HU-12 | Diferenciar lo propio de lo alquilado: cada elemento del inventario se registra como **Propio** o **Alquilado** (con filtro por propiedad), cada línea de mobiliario del evento dice cuántas unidades son propias y cuántas se alquilan, y se avisa de alquiler cuando el evento supera el umbral de asistentes (200 por defecto). | `/inventario`, nuevo evento · paso 2 y 3, detalle del evento |
| HU-21 | **Calcular los meseros** de cada evento: 1 por cada 20 asistentes, siempre redondeado hacia arriba (45 asistentes → 2,25 → 3 meseros; 60 → 3). Se muestra dentro del detalle del evento con la cuenta explicada, y también en la vista previa y en el resumen del registro. Es la primera historia del módulo de **personal de servicio**, que se construye una historia a la vez. | Detalle del evento, nuevo evento · paso 1 y 3 |
| HU-22 | **Calcular los cocineros** de cada evento con una sola regla general: 2 cocineros por cada 25 asistentes, con los grupos de 25 redondeados hacia arriba (100 asistentes → 8; 320 → 12,8 → 13 grupos → 26; 51 → 6). **No depende del tipo de evento ni de la comida** (cena, buffet, cóctel…): aplica igual a todos, también a los buffet de más de 300 asistentes. Se muestra en el detalle con la cuenta explicada, en la vista previa (cambia al escribir los asistentes) y en el resumen del registro. | Nuevo evento · paso 1 y 3, detalle del evento |
| HU-46 | **Registrar la receta de cada plato:** los ingredientes de un plato del catálogo (alimento), cada uno con la **cantidad que consume una persona** (mayor a 0), su **unidad** (gramos, kilos, libras o arrobas, únicas permitidas) y **cómo se compra** en el mercado (kilo, libra o arroba). La receta se edita y se guarda completa; el sistema trae tres platos de ejemplo marcados como **datos de prueba**: Arroz verde con almendras (arroz 80 g / kilo, almendras 15 g / libra, cilantro 10 g / libra), Pechuga a la plancha (pechuga de pollo 200 g / kilo) y Papa salada (papa 150 g / arroba). Es la base para que una historia futura calcule las compras. | Catálogo · pestaña «Recetas de Platos» |
| HU-47 | **Calcular los ingredientes a comprar** de un evento: con los asistentes y las recetas de los platos, la cantidad de cada ingrediente **en la unidad en que se compra** (kilo, libra o arroba), con el **10 % de margen** y **redondeada hacia arriba**. Si varios platos usan el mismo ingrediente se muestra **un solo total**. Ejemplos: 100 asistentes × 200 g de pechuga → 22 kilos; 50 asistentes con cilantro de dos platos (10 g y 5 g) → 825 g → 2 libras; 200 asistentes × 150 g de papa → 33.000 g → 3 arrobas. Se ve en el detalle del evento y en el resumen del registro (antes de guardar), y avisa de los platos que aún no tienen receta. | Detalle del evento · Nuevo evento (paso 3) |

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

**Meseros (HU-21).** El detalle muestra cuántos meseros hacen falta: 1 por cada 20 asistentes, siempre redondeado hacia arriba, con la cuenta a la vista. También se ve en la vista previa del paso 1 (cambia mientras se escriben los asistentes) y en el resumen del paso 3.

![Meseros requeridos en el detalle de un evento](docs/imagenes/meseros-detalle.png)

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

**Valor unitario de las bebidas.** Las bebidas del catálogo pueden venir sin precio; el campo «Valor unitario» (o «Valor por botella») se escribe en el evento y es lo que se usa para calcular el costo. Una bebida sin valor se muestra como «Sin valor» y suma $0.

![Bebidas con valor unitario escrito en el evento](docs/imagenes/registro-bebidas-valor.png)

**Mobiliario propio y alquilado (HU-12).** El mobiliario se elige del inventario. Cada línea indica cuántas unidades son propias y cuántas hay que alquilar; lo que no está en el inventario va todo a alquiler. Con más de 200 asistentes aparece el aviso de alquiler (RN-03).

![Pestaña de mobiliario con unidades propias y a alquilar](docs/imagenes/registro-paso2-mobiliario.png)

**Paso 3 · Resumen.** Revisión final con el costo estimado antes de guardar.

![Paso 3 del registro](docs/imagenes/registro-paso3-resumen.png)

### Catálogo

Aquí se mantienen los productos que se ofrecen al registrar un evento. Cada uno lleva cómo se calcula (gramos por persona, unidades por persona o botella compartida) y, opcionalmente, su precio; mientras se escribe, una vista previa muestra cuánto saldría con 100 asistentes. Los productos no se borran: se desactivan, y los eventos ya guardados conservan sus cantidades y costos.

![Pantalla de catálogo](docs/imagenes/catalogo.png)

**Recetas de platos (HU-46).** En la pestaña «Recetas de Platos» se elige un plato y se registran sus ingredientes: nombre, cantidad que consume **una persona**, unidad (gramos, kilos, libras o arrobas) y cómo se compra (kilo, libra o arroba). La cantidad debe ser mayor a 0 (máximo 3 decimales y 1 kg por persona) y no se repite un ingrediente en la misma receta. Un ingrediente nuevo se crea al escribirlo; si ya existe, se reutiliza y se compra igual que en las otras recetas (la unidad de compra es del ingrediente). Guardar reemplaza la receta completa, y las recetas de ejemplo se marcan como «Datos de prueba» hasta que se guarda la real.

**Ingredientes a comprar (HU-47).** El detalle del evento y el resumen del registro listan cuánto hay que comprar de cada ingrediente: `asistentes × cantidad por porción × 1,10`, convertido a la unidad de compra (1 kg = 1.000 g, 1 libra = 500 g, 1 arroba = 12,5 kg) y redondeado hacia arriba. Un ingrediente que usan varios platos se suma **antes** de aplicar el margen y redondear, así no se compra de más. El cálculo se hace al consultar (con enteros, para que 22.000 g sean exactamente 22 kilos y no 23), por eso siempre sigue a los asistentes y a la receta vigente. Los platos del evento sin receta se avisan aparte.

![Receta de un plato en el catálogo](docs/imagenes/recetas-platos.png)

### Inventario (HU-08 y HU-09)

Registro de elementos y adquisiciones, tabla con búsqueda y filtros por categoría, y el historial de movimientos (registros, adquisiciones y ajustes).

| Modo claro | Modo oscuro |
| --- | --- |
| ![Inventario en modo claro](docs/imagenes/inventario-claro.png) | ![Inventario en modo oscuro](docs/imagenes/inventario-oscuro.png) |

**Retiro de elementos (HU-10).** La pestaña «Retiro» (o el botón «Retiro» de cada fila) separa esta acción de actualizar la cantidad: solo se escribe la cantidad a retirar, por daño, pérdida o devolución, y el sistema resta. Lo retirado deja de contarse como disponible, también para los eventos.

![Sección de retiro de elementos](docs/imagenes/inventario-retiro.png)

Cada elemento es **propio** o **alquilado** a un proveedor (HU-12). Los alquilados se marcan con su etiqueta, se pueden filtrar y no suman a las unidades propias; en un evento, todo lo que se pida de ellos cuenta como «a alquilar».

![Inventario filtrado por elementos alquilados](docs/imagenes/inventario-propiedad.png)

Las categorías son un conjunto cerrado (Mobiliario, Bebidas Generales, Licores para Cócteles y Vajilla); el filtro de cada una muestra solo sus elementos:

![Inventario con los nombres de categoría](docs/imagenes/inventario-categorias.png)

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
│   ├── api/index.js         Entrada de la función serverless en Vercel
│   ├── src/
│   │   ├── server.js        Punto de entrada: configura Express y registra las rutas
│   │   ├── config/          Conexión a PostgreSQL (con el seguro contra bases remotas) y parámetros
│   │   ├── routes/          Rutas de cada módulo (auth, eventos, catálogo, inventario)
│   │   ├── controllers/     Lógica de cada ruta: validaciones, cálculos y consultas SQL
│   │   ├── middlewares/     Validaciones previas y verificación del token
│   │   ├── scripts/         Crear usuarios y generar el SQL del entorno de QA
│   │   └── db/              schema.sql, seeds.sql (incluye las recetas de ejemplo), catálogo del mercado colombiano y usuario local
│   ├── .env.example         Plantilla de variables de entorno (apunta a la base local)
│   ├── vercel.json          Configuración del despliegue de la API
│   └── README.md            Documentación de la API
├── frontend/                Aplicación web (React + Vite)
│   ├── src/                 Páginas, componentes, servicios, hooks y tipos
│   ├── vercel.json          Configuración del despliegue del frontend
│   └── README.md            Cómo levantarlo y cómo está organizado
├── qa/                      Pruebas automáticas (172 de regresión y 194 casos límite)
├── docs/
│   ├── imagenes/            Capturas usadas en la documentación
│   ├── proceso-de-despliegue.md   Guía del proceso: del código a producción
│   └── entorno-de-qa.md           Cómo montar y usar el entorno de QA compartido
└── docker-compose.yml       Base de datos PostgreSQL local para desarrollar
```

---

## Puesta en marcha

Requisitos: **Node.js 20.19 o superior** (o 22.12+) y **npm 10+**.

```bash
git clone https://github.com/ColombianBlurryface/SIGEV.git
cd SIGEV
git switch develop
```

1. **Base de datos local:** `docker compose up -d` (carga sola la estructura, el catálogo y un usuario `dev` / `local1234`). Lo que crees en tu computadora **no toca QA ni producción**.
2. **Backend:** sigue [`backend/README.md`](backend/README.md). En resumen: `cd backend`, `npm install`, `cp .env.example .env` (ya apunta a la base local) y `node src/server.js`.
3. **Frontend:** sigue [`frontend/README.md`](frontend/README.md). En resumen: `cd frontend`, `npm install`, copiar `.env.example` a `.env` y ejecutar `npm run dev`.
4. Abre <http://localhost:5173> e inicia sesión con `dev` / `local1234`.

> **Seguridad:** el backend se niega a arrancar en tu computadora si el `.env` apunta a una base remota (QA o producción). Para usar la de QA a propósito hay que definir `PERMITIR_BASE_REMOTA=si`.

---

## Despliegue en Vercel

Hay **tres entornos**, cada uno con su propia base de datos, para que lo que se pruebe nunca toque lo real:

| Entorno | Para qué | Base de datos | Cómo se actualiza |
| --- | --- | --- | --- |
| **Local** | Desarrollar en tu computadora | PostgreSQL en Docker (`docker compose up -d`) | Tú, con `git pull` |
| **QA** | Que todo el equipo pruebe antes de publicar | Supabase de QA | Solo con la rama `develop` |
| **Producción** | Lo que usa el cliente | Supabase de producción | Solo con la rama `main`, mediante un PR de `develop` a `main` |

El paso a paso del proceso está en [`docs/proceso-de-despliegue.md`](docs/proceso-de-despliegue.md) y el entorno de QA en [`docs/entorno-de-qa.md`](docs/entorno-de-qa.md).

Cada entorno publicado se compone de **dos proyectos de Vercel** que salen del mismo repositorio, con la base de datos en Supabase:

| Proyecto | Root Directory | Qué es | Archivo de configuración |
| --- | --- | --- | --- |
| `sigev` | `frontend` | La interfaz (Vite) | [`frontend/vercel.json`](frontend/vercel.json): redirige todas las rutas a `index.html` para que recargar una página interna no dé 404 |
| `sigev-api` | `backend` | La API (Express como función serverless) | [`backend/vercel.json`](backend/vercel.json) y [`backend/api/index.js`](backend/api/index.js) |

**Variables de entorno del proyecto `sigev-api`** (Settings → Environment Variables; los valores salen de `backend/.env`, nunca se suben al repositorio):

| Variable | Valor |
| --- | --- |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Datos del *pooler* de Supabase |
| `DB_SSL` | `true` |
| `JWT_SECRET` | La misma clave larga y aleatoria del `.env` |
| `CORS_ORIGIN` | La dirección del frontend, por ejemplo `https://sigev-nine.vercel.app` |
| `MAX_OWNED_CAPACITY_THRESHOLD` | Opcional (por defecto `200`) |

**Variable del proyecto `sigev`:** `VITE_API_URL` = la dirección del proyecto de la API terminada en `/api`, por ejemplo `https://sigev-api.vercel.app/api`. Vite la incorpora al construir, así que después de cambiarla hay que **volver a desplegar** (Redeploy).

**Comprobación rápida:** abrir `https://<proyecto-api>/api/health` debe responder `{"status":"ok",...}`; después, iniciar sesión desde el frontend.

> Todas las rutas de la API, excepto el inicio de sesión y `/api/health`, exigen el token de sesión. Si el token vence o es rechazado, la aplicación cierra la sesión y lleva al login.

---

## Pruebas y entorno de QA

El proyecto trae pruebas automáticas en [`qa/`](qa) (172 pruebas de los checklists y 194 casos límite de la API) y una guía para montar un **entorno de QA compartido**, con su propia base de datos, que se actualiza solo desde la rama `develop`:

- [`qa/README.md`](qa/README.md): cómo ejecutar las pruebas.
- [`docs/entorno-de-qa.md`](docs/entorno-de-qa.md): cómo montar y usar el entorno de QA.

Las pruebas se niegan a ejecutarse contra producción.

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
| `movimientos_inventario` | Historial de cada cambio de cantidad del inventario: registro inicial, adquisición, ajuste o retiro (por daño, pérdida o devolución; internamente el tipo se llama `baja`). |

> **Importante:** modificar `schema.sql` **no actualiza Supabase por sí solo**. Quien cambie una tabla debe ejecutar ese cambio en Supabase (SQL Editor) dentro del mismo PR y avisarlo en la descripción.

---

## Reglas de negocio

- Un evento debe tener **entre 40 y 600 asistentes** (RN-01 / HU-07).
- La **duración** de un evento va de **3 a 8 horas** y la **fecha** debe ser **hoy o posterior** (nunca el pasado) y no pasar de 5 años adelante; no puede haber más de **3 eventos activos el mismo día** (RN-13, RN-14).
- Cada **servicio adicional** (DJ, música en vivo, sonido, iluminación, entretenimiento) admite de **1 a 5 unidades** y sus **horas no pueden superar la duración del evento**: no hay «DJ ilimitados» ni 300 horas de DJ en un evento de 3. Si se acorta la duración del evento después de agregar servicios, el sistema avisa y no deja continuar hasta corregirlo (RN-18). Además (COR-06), las horas de un servicio van **de 1 a 5** aunque el evento dure más, y cada tipo tiene un **tope de unidades por evento, sumando todas sus líneas**: DJ 3, música en vivo 3, entretenimiento 3, sonido 2, iluminación 2 y otro 5 (no caben seis líneas de DJ). La pantalla muestra cuántas unidades quedan.
- Con **más de 300 asistentes** el evento es de modalidad **buffet** (RN-02).
- Los **meseros** requeridos son **1 por cada 20 asistentes**, siempre **redondeados hacia arriba** para que nunca falte personal (RN-04, RN-12). Se calculan al consultar el evento, no se guardan, así que siempre coinciden con los asistentes. Es la primera historia del módulo de personal de servicio (HU-21); las siguientes se suman una por una.
- Los **cocineros** requeridos son **(asistentes ÷ 25, redondeado hacia arriba) × 2**, igual para todos los eventos, sin depender del tipo de evento ni de la comida (RN-05, RN-12): 40 → 4, 100 → 8, 200 → 16, 320 → 26, 600 → 48; el techo va antes de multiplicar por 2 (50 → 4, 51 → 6). También se calculan al consultar el evento y no se guardan; el cliente no puede fijarlos.
- Con **más de 200 asistentes** (valor por defecto del umbral) se avisa que probablemente haya que **alquilar mobiliario** (RN-03 / P-05).
- **Solo se alquila mobiliario y vajilla** (RN-17): las bebidas (generales y licores) siempre son propias y no ofrecen la opción «Alquilado». Lo que se alquila en un evento es, como máximo, lo requerido menos lo propio disponible, y si no falta nada no se alquila nada. La cantidad que se pide de mobiliario es un entero de 1 a 2.000 (RF-14).
- El mobiliario de un evento se compara con el stock actual del inventario: lo que alcanza es **propio** y el resto se **alquila**. Lo que no está en el inventario, o está marcado como **alquilado**, se alquila completo (HU-12).
- El umbral de 200 asistentes no está escrito en el código: se define con la variable `MAX_OWNED_CAPACITY_THRESHOLD` del backend (P-05). Si el cliente compra más inventario y el límite sube, solo se cambia el `.env` y se reinicia el servidor.
- Las **bebidas generales** (cerveza, vino, champaña, gaseosa) y las del **bar de coctelería** (licores fuertes) se manejan por separado y un producto pertenece a un solo grupo (RN-08 / HU-13).
- **Límites de las medidas**, avisados en pantalla apenas se escriben y exigidos también por el servidor: un alimento va de 1 a **1.000 g** por persona; una botella, hasta **5.000 ml** (y la porción no puede ser mayor que la botella); un licor de una receta de cóctel, hasta **250 ml** con 2 decimales; los asistentes de la calculadora de licor, de 40 a 600; los cócteles por persona, un entero de 1 a 10 (RN-15); y un precio no pasa de $100.000.000. Los campos numéricos se pueden borrar y reescribir sin que se quede un «0» pegado.
- Todas las cantidades de alimentos y bebidas llevan un **margen de seguridad del 10%** (RN-09).
- Cómo se calcula cada producto:
  - **Por porción** (alimentos): asistentes × gramos por persona; si supera 1000 g se expresa en kg.
  - **Por unidad** (bebidas individuales): asistentes × unidades por persona, redondeado hacia arriba.
    Las unidades por persona son un **número entero de 1 a 10** (no se sirven 1,4 gaseosas por persona); se valida al registrar las bebidas del evento y al guardar el producto en el catálogo (RF-22 / RN-15).
  - **Por botella** (bebidas compartidas): porciones por botella = volumen ÷ tamaño de la porción; botellas = asistentes ÷ porciones por botella, redondeado hacia arriba.
- El costo estimado solo incluye alimentos y bebidas; el mobiliario y los servicios se cotizan aparte.
- Todo elemento del inventario tiene **una de cuatro categorías**: Mobiliario, Bebidas Generales, Licores para Cócteles o Vajilla. Cualquier otro valor (por ejemplo «Decoración») se rechaza, tanto en la API como en la base de datos (RF-10 / HU-09).
- Cada elemento del inventario tiene un **máximo de unidades según su categoría**: mobiliario 2.000, vajilla 6.000, bebidas generales y licores 4.000. Se aplica al registrar, al actualizar la cantidad y al adquirir; una adquisición que se pasa se rechaza y dice cuántas unidades se pueden adquirir como mucho (RF-11, RF-13 / RN-16).
- Un elemento nuevo se registra con **al menos 1 unidad** (no se puede registrar con 0) en todas las categorías; después, «Actualizar» sí puede dejarlo en 0 (COR-04).
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

- **Registrar qué usuario hace cada movimiento del inventario:** la API ya exige sesión y el token trae el usuario; falta guardarlo en el historial.
- **Diseño responsive:** la interfaz está pensada para escritorio; la adaptación a celular y tablet (menú de cajón y tablas en tarjetas) está lista en el PR #32, pendiente de mezclar.
- **Conectar Vercel directamente a este repositorio:** hoy se publica desde una copia y la sincronización es manual (ver la guía del proceso de despliegue).
- Editar los requerimientos y cambiar el estado de un evento ya creado.
