# SIGEV · Backend

API REST de SIGEV hecha con **Node.js + Express 5** y **PostgreSQL** (Supabase). Aplica las reglas de negocio del sistema: validaciones, cálculo de cantidades con margen del 10%, inicio de sesión con JWT e inventario con historial de movimientos.

---

## Puesta en marcha

> **Regla de oro: en tu computadora trabajas siempre contra la base de datos LOCAL.** Lo que crees mientras desarrollas se queda en tu computadora y nunca llega a QA ni a producción. El backend se niega a arrancar si `DB_HOST` apunta a una base remota (ver más abajo).

### 1. Levantar la base de datos local

Desde la **raíz del repositorio** (necesitas Docker):

```bash
docker compose up -d
```

La primera vez crea una base PostgreSQL en el puerto `5433` y le carga la estructura, el catálogo, el inventario base y un usuario de desarrollo (`dev` / `local1234`). Los datos que crees quedan en tu computadora.

| Comando | Qué hace |
| --- | --- |
| `docker compose up -d` | Levanta la base (conserva tus datos) |
| `docker compose down` | La apaga sin borrar nada |
| `docker compose down -v` | La borra por completo; al volver a levantar queda como nueva |

Si el puerto `5433` está ocupado: `SIGEV_DB_PORT=5434 docker compose up -d` y usa ese puerto en `DB_PORT`.

### 2. Instalar dependencias y configurar el `.env`

```bash
cd backend
npm install
cp .env.example .env
```

El `.env.example` ya apunta a la base local, así que solo tienes que cambiar `JWT_SECRET` por cualquier texto largo (por ejemplo `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`). **Nunca subas el `.env` al repositorio.**

| Variable | Descripción |
| --- | --- |
| `DB_HOST` | `localhost` (base local). Cualquier otro valor está bloqueado en tu computadora salvo con `PERMITIR_BASE_REMOTA=si` |
| `DB_PORT` | `5433` (la del `docker compose`) |
| `DB_NAME`, `DB_USER`, `DB_PASSWORD` | `sigev_dev`, `sigev`, `sigev` en la base local |
| `DB_SSL` | `false` en local; `true` en Supabase |
| `PORT` | Puerto del backend (por defecto `3000`) |
| `JWT_SECRET` | Clave larga y aleatoria para firmar los tokens de sesión |
| `MAX_OWNED_CAPACITY_THRESHOLD` | Umbral de asistentes a partir del cual se avisa que hay que alquilar mobiliario (P-05, RN-03). Opcional: por defecto `200`. Hay que reiniciar el servidor al cambiarlo |
| `PERMITIR_BASE_REMOTA` | `si` para permitir, a propósito, una base remota (por ejemplo el Supabase de QA) desde tu computadora |
| `CORS_ORIGIN` | Opcional (en Vercel). Sitios que pueden llamar a la API, separados por comas |
| `DB_POOL_MAX` | Opcional. Máximo de conexiones por instancia (por defecto `5`) |

### Qué base usa cada cosa

| Qué estás usando | Base de datos |
| --- | --- |
| Tu backend local (`node src/server.js`) con el `.env.example` | **Local** (Docker). No toca nada compartido |
| `sigev-qa.vercel.app` | Supabase de **QA** |
| `sigev-nine.vercel.app` | Supabase de **producción** |

Para usar el **Supabase de QA** desde tu computadora, escribe en el `.env` los datos de QA que te dé el equipo por privado y agrega `PERMITIR_BASE_REMOTA=si`. **Los datos de producción no van en el `.env` de nadie:** viven solo en las variables de entorno de Vercel.

> En Supabase usa la conexión del **pooler** (Connect → Transaction pooler). La conexión directa (`db.<ref>.supabase.co`) solo funciona con IPv6 y en muchas redes no resuelve.

### 3. Crear las tablas en una base remota (QA)

La base local se carga sola con `docker compose`. Para una base **remota nueva** (por ejemplo un Supabase de QA), pega en su SQL Editor el SQL de arranque que genera `src/scripts/generarSqlQA.js` (ver `docs/entorno-de-qa.md`). Todos los archivos SQL se pueden volver a ejecutar sin error.

### 4. Crear un usuario

No hay registro público: los usuarios se crean con este script. Escribe la contraseña entre comillas simples.

```bash
node src/scripts/crearUsuario.js <usuario> '<contraseña>' "<Nombre Completo>" admin
```

Si el usuario ya existe, solo cambia su contraseña. En la base local ya existe `dev` / `local1234`. Para crear usuarios en una base remota hay que tener `PERMITIR_BASE_REMOTA=si` en el entorno.

### 5. Iniciar el servidor

```bash
node src/server.js
```

Comprueba que responde en <http://localhost:3000/api/health>.

---

## Pruebas unitarias

```bash
npm test
```

Corre con el ejecutor de pruebas que trae Node (`node --test`) los cálculos puros de `test/`: hoy, los meseros de la HU-21. Las pruebas de punta a punta (API y pantalla) están en [`../qa`](../qa).

---

## Carga del catálogo y el inventario base

[`src/db/carga-catalogo-mercado-colombiano.sql`](src/db/carga-catalogo-mercado-colombiano.sql) carga de una vez, en el SQL Editor de Supabase:

- **77 productos del catálogo** con las marcas del mercado colombiano: cervezas nacionales, importadas y artesanales; gaseosas, aguas y maltas; vinos y espumosos; aguardientes, rones, whisky, vodka, ginebra y tequila; y acompañantes del bar.
- **34 elementos de inventario base** (mobiliario y vajilla) con cantidad 0, para registrar las cantidades reales con «Actualizar» o «Adquisición».
- Renombra productos que ya existían para no duplicarlos.

Se puede ejecutar varias veces: no duplica nada y no pisa precios escritos desde la pantalla Catálogo. **Todos los productos nuevos quedan sin precio**; las porciones y presentaciones son las habituales y se ajustan desde el Catálogo. Incluye, comentada, una limpieza opcional de los datos de prueba marcados con «(borrar)».

---

## Datos de prueba del entorno publicado

Para que ningún módulo se vea vacío al abrirlo en el entorno publicado (por ejemplo, en una sustentación), [`src/db/datos-de-prueba.sql`](src/db/datos-de-prueba.sql) carga, en el SQL Editor de Supabase (primero QA, luego producción):

- **Inventario de las cuatro categorías** (mobiliario, vajilla, bebidas generales y licores para cócteles) con cantidades de ejemplo y movimientos de cada tipo (registro inicial, adquisición y retiro), para que el historial tenga algo que mostrar.
- **6 eventos de ejemplo con mobiliario requerido**, con alimentos, bebidas y servicios, en los cuatro estados: uno de 250 asistentes que supera el umbral de alquiler (se ven las unidades propias y las que se alquilan), uno de 480 en modalidad buffet y confirmado, uno de 120 y uno de 90 que el inventario propio cubre completo, uno ya realizado y uno cancelado (para probar el filtro por estado). Los próximos van a «hoy + 30, 45, 60 y 75 días», así que siempre salen como próximos. El costo usa el precio del catálogo cuando ya lo tiene.
- Los productos del catálogo que esos eventos usan, solo si faltan.

**Se identifican como prueba:** los eventos empiezan por «[Demo] » y sus observaciones dicen «Datos de prueba»; cada cantidad de ejemplo del inventario deja un movimiento con la nota «Datos de prueba…» (se ve en el historial de `/inventario`), y los elementos de bebidas que crea el script terminan en « (demo)».

**Es seguro repetirlo:** no duplica nada y **no toca ningún elemento que ya tenga unidades**, así que no pisa inventario real. Solo agrega datos; no cambia la estructura de la base.

Los precios de referencia del catálogo están en [`src/db/precios-catalogo.sql`](src/db/precios-catalogo.sql): son estimaciones aproximadas del mercado colombiano, solo se aplican a productos que están en 0 y nunca pisan un precio ya escrito. Para empezar QA de cero está [`../../qa/reiniciar-datos-qa.sql`](../../qa/reiniciar-datos-qa.sql) (ver `docs/entorno-de-qa.md`).

Cuando empiecen los datos reales, [`src/db/datos-de-prueba-quitar.sql`](src/db/datos-de-prueba-quitar.sql) los quita: borra los eventos «[Demo]», devuelve cada elemento a la cantidad que tenía antes y borra los elementos « (demo)». Si ya hubo movimientos reales sobre un elemento de ejemplo, ese elemento se salta y el script lo avisa al final.

---

## Estructura

```text
backend/src/
├── server.js                    Punto de entrada: Express, CORS, JSON y registro de rutas
├── config/db.js                 Pool de conexiones a PostgreSQL
├── routes/                      Qué URL atiende cada función
│   ├── authRoutes.js
│   ├── eventosRoutes.js
│   ├── catalogoRoutes.js
│   └── inventarioRoutes.js
├── controllers/                 Lógica de cada endpoint (validaciones, cálculos y SQL)
│   ├── authController.js
│   ├── eventosController.js     Motor de cálculo de cantidades y costos
│   ├── catalogoController.js
│   └── inventarioController.js  Inventario y movimientos
├── middlewares/
│   ├── validarEvento.js         Valida los datos básicos antes de crear un evento
│   └── verificarToken.js        Verifica el token JWT (aún no se aplica a las rutas)
├── scripts/crearUsuario.js      Alta de usuarios desde la terminal
└── db/
    ├── schema.sql               Tablas, tipos y restricciones
    └── seeds.sql                Productos iniciales del catálogo
```

---

## API

Todas las rutas empiezan por `/api`. Los cuerpos se envían y reciben en JSON.

**Formato de error:** `{ "error": "mensaje", "detalle": "explicación opcional" }`

| Código | Cuándo ocurre |
| --- | --- |
| `400` | Datos inválidos (el motivo va en `detalle`) |
| `401` | Usuario o contraseña incorrectos |
| `404` | El recurso no existe |
| `409` | Nombre duplicado (inventario) |
| `500` | Error inesperado del servidor |

### Resumen de endpoints

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/health` | Estado del servidor |
| GET | `/configuracion` | Parámetros del sistema (umbral de alquiler) |
| POST | `/auth/login` | Iniciar sesión |
| GET | `/catalogo` | Productos del catálogo (filtros `?clasificacion=` e `?incluir_inactivos=true`) |
| GET | `/catalogo/:id` | Un producto del catálogo |
| POST | `/catalogo` | Crear un producto del catálogo |
| PUT | `/catalogo/:id` | Editar un producto del catálogo |
| PATCH | `/catalogo/:id/estado` | Activar o desactivar un producto |
| POST | `/eventos` | Registrar un evento con sus requerimientos |
| GET | `/eventos` | Lista de eventos ordenada por fecha |
| GET | `/eventos/:id` | Detalle de un evento con sus requerimientos |
| POST | `/inventario` | Registrar un elemento del inventario |
| GET | `/inventario` | Elementos del inventario (filtro `?categoria=`) |
| PATCH | `/inventario/:id/categoria` | Cambiar la categoría de un elemento |
| PATCH | `/inventario/:id/propiedad` | Marcar un elemento como propio o alquilado |
| PATCH | `/inventario/:id/cantidad` | Fijar la cantidad disponible (queda como ajuste) |
| POST | `/inventario/:id/adquisiciones` | Registrar una adquisición (suma a la cantidad) |
| POST | `/inventario/:id/retiro` | Retirar unidades por daño, pérdida o devolución (resta de la cantidad). `/inventario/:id/baja` es el nombre anterior y sigue funcionando |
| GET | `/inventario/movimientos` | Historial de movimientos del inventario |

### Autenticación

#### `POST /api/auth/login`

```json
{ "usuario": "lmendez", "password": "••••••••" }
```

Respuesta `200`:

```json
{
  "token": "eyJhbGciOi...",
  "usuario": { "id": 1, "nombre_completo": "Laura Méndez", "usuario": "lmendez", "rol": "admin" }
}
```

El token vence a las 8 horas. El frontend lo envía en la cabecera `Authorization: Bearer <token>`.

**Todas las rutas, excepto `POST /api/auth/login` y `GET /api/health`, exigen ese token.** Sin token, o con uno inválido, vencido o firmado con otra clave, responden `401`. Cuando el frontend recibe un `401` teniendo sesión, la cierra y lleva al login.

### Configuración

#### `GET /api/configuracion`

```json
{ "umbral_alquiler": 200 }
```

Parámetros del sistema que necesita la pantalla. El umbral sale de `MAX_OWNED_CAPACITY_THRESHOLD`; si no está definida o no es un entero positivo, vale `200`.

### Catálogo

#### `GET /api/catalogo?clasificacion=alimento`

Devuelve los productos activos del catálogo. Los elementos de inventario no aparecen aquí. Clasificaciones: `alimento`, `bebida_general`, `bar_cocteleria`, `mobiliario`.

Las bebidas generales (`bebida_general`) y las del bar de coctelería (`bar_cocteleria`) se consultan por separado (HU-13). Cada producto tiene una sola clasificación, así que nunca aparece en las dos.

```json
[
  {
    "id": 1, "nombre": "Medallones de Lomo de Res", "clasificacion": "alimento",
    "tipo_calculo": "porcion_persona", "porcion_por_persona": "200.00", "unidad_medida": "g",
    "volumen_botella_ml": "0.00", "tamano_porcion_ml": "0.00", "precio_unitario": "45000.00"
  }
]
```

> Los valores `NUMERIC` de PostgreSQL llegan como texto (`"200.00"`).

Con `?incluir_inactivos=true` también llegan los productos desactivados (lo usa la pantalla de Catálogo; el registro de eventos pide solo los activos). Cada producto trae `activo`.

#### `POST /api/catalogo`

Crea un producto. `precio_unitario` es opcional: sin precio queda en `0` y se escribe después (en la pantalla de Catálogo o al registrar el evento). Los datos dependen de cómo se consume:

```json
{ "nombre": "Cerveza Águila 330 ml", "clasificacion": "bebida_general",
  "tipo_calculo": "unidad_persona", "porcion_por_persona": 2, "precio_unitario": 3500 }
```

```json
{ "nombre": "Aguardiente Blanco del Valle 750 ml", "clasificacion": "bar_cocteleria",
  "tipo_calculo": "botella_compartida", "volumen_botella_ml": 750, "tamano_porcion_ml": 50, "precio_unitario": 60000 }
```

| Grupo (`clasificacion`) | Tipos de cálculo permitidos | Datos |
| --- | --- | --- |
| `alimento` | `porcion_persona` | `porcion_por_persona` en gramos; el precio es por kg |
| `bebida_general`, `bar_cocteleria` | `unidad_persona` | `porcion_por_persona` en unidades: un **entero de 1 a 10** (RF-22 / RN-15); el precio es por unidad |
| `bebida_general`, `bar_cocteleria` | `botella_compartida` | `volumen_botella_ml` y `tamano_porcion_ml` (la porción no puede superar la botella); el precio es por botella |

La unidad de medida se deduce del tipo. Los números deben enviarse como número (no como texto). Responde `201` con el producto, `400` si algo no cumple las reglas y `409` si ya hay otro producto del catálogo con ese nombre. El mobiliario no se crea aquí: vive en el inventario.

#### `PUT /api/catalogo/:id`

Edita un producto; se envían todos los campos, igual que al crearlo. Si el producto **ya se usó en algún evento**, no se puede cambiar su `clasificacion` ni su `tipo_calculo` (`409`); sí el nombre, las porciones y el precio. Los eventos ya guardados conservan sus cantidades y costos.

#### `PATCH /api/catalogo/:id/estado`

```json
{ "activo": false }
```

Activa o desactiva un producto. Un producto desactivado deja de ofrecerse en los eventos nuevos, pero los eventos guardados lo conservan. Los productos no se borran.

### Eventos

#### `POST /api/eventos`

```json
{
  "nombre_evento": "Boda Martínez & Gómez",
  "fecha_evento": "2026-11-14",
  "tipo_evento": "Boda",
  "duracion_horas": 6,
  "asistentes": 250,
  "observaciones_generales": "Menú sin mariscos.",
  "productos": [
    { "producto_id": 1, "componentes_menu": "Salsa de vino tinto, puré rústico" },
    { "producto_id": 5, "porcion_por_persona": 2 }
  ],
  "servicios_adicionales": [
    { "tipo": "mobiliario", "descripcion": "Sillas Tiffany doradas", "cantidad": 250, "producto_id": 10 },
    { "tipo": "mobiliario", "descripcion": "Carpa 10 × 20 m", "cantidad": 1 },
    { "tipo": "dj", "descripcion": "DJ para recepción y fiesta", "cantidad": 1, "horas": 6 }
  ]
}
```

- `productos` y `servicios_adicionales` son opcionales.
- `porcion_por_persona` es opcional: si no se envía, se usa la del catálogo.
- En una bebida de tipo `unidad_persona`, la porción (la enviada o la del catálogo) debe ser un entero de 1 a 10; si no, responde `400` con «Las unidades por persona de «…» deben ser un número entero de 1 a 10» y no se guarda nada (RF-22 / RN-15).
- `precio_unitario` es opcional: es el valor unitario (por unidad, por botella o por kg) escrito en el evento. Si no se envía, se usa el del catálogo. Debe ser un número mayor o igual a 0 (`400` si no). El costo guardado se calcula con ese valor, y el detalle del evento lo devuelve como el precio realmente usado.
- El mobiliario se envía como servicio adicional con `tipo: "mobiliario"`. Con `producto_id` se relaciona con un elemento del inventario de categoría `Mobiliario` (HU-12); en ese caso la descripción se toma del inventario. Sin `producto_id`, el elemento no está en el inventario y todo se alquila.
- Un mismo elemento del inventario no puede repetirse en el evento (`400`).
- Todo se guarda en una transacción: si algo falla, no queda nada a medias.

Respuesta `201`: `{ "mensaje": "...", "evento": { "id": 4, "estado": "planificacion", ... } }`

**Validaciones.** Todo lo que no cumple responde `400` con el motivo y **no se guarda nada** (antes varios casos daban un error 500). Las reglas viven en `src/config/reglasEvento.js` y se revisan en `src/middlewares/validarEvento.js`:

| Dato | Regla |
| --- | --- |
| Nombre | Texto con contenido, máximo 150 caracteres |
| Tipo de evento | Uno de: Boda, Corporativo, Quinceañero, Gala, Cumpleaños, Otro |
| Fecha | Día real `AAAA-MM-DD`, desde hoy (hora de Colombia) hasta 5 años adelante, y máximo 3 eventos activos por día (RN-13) |
| Duración | Número de 3 a 8 horas (RN-14); un texto como «4 horas» no vale |
| Asistentes | Entero de 40 a 600 (RN-01) |
| Observaciones | Texto de máximo 2.000 caracteres |
| Productos | Lista de máximo 100; `producto_id` entero que exista y esté activo; sin repetir un producto; alimentos de 1 a 1.000 g por persona; bebidas individuales de 1 a 10 unidades por persona (RN-15); el valor unitario, mayor o igual a 0 |
| Mobiliario | Entero de 1 a 2.000 por línea (RN-17); «Otro» exige descripción |
| Servicios (DJ, música en vivo, sonido, iluminación, entretenimiento, otro) | **RN-18:** `cantidad` (unidades) entera de 1 a 5 y `horas` en horas completas o medias horas, **de 1 a 5** y **sin superar la duración del evento**; **COR-06:** tope de unidades por tipo en todo el evento, sumando las líneas (`dj` 3, `musica_en_vivo` 3, `entretenimiento` 3, `sonido` 2, `iluminacion` 2, `otro` 5); tipo de la lista; descripción obligatoria (máximo 300 caracteres); notas de máximo 300 |

El registro de un evento toma un candado por fecha dentro de la transacción: con varias peticiones simultáneas para el mismo día entran 3 como máximo, no más. Las horas de cada servicio se guardan en la columna `horas` de `requerimientos_adicionales` (opcional, por eso los servicios guardados antes de esta regla no la tienen). Si se crea la base de cero con `schema.sql` ya viene incluida; en una base existente hay que agregarla (ver `docs/despliegue-y-sql-pendiente.md`).

También devuelven `400` (antes `500`): un `id` que no es un número entero en `GET /api/eventos/:id` y `GET /api/catalogo/:id`, y un `?clasificacion=` que no existe en `GET /api/catalogo`. En el catálogo, los gramos por persona de un alimento van de 1 a 1.000 y la botella de una bebida compartida no pasa de 5.000 ml.

#### `GET /api/eventos`

Lista de eventos ordenada por fecha. Cada evento incluye `es_modalidad_buffet` (más de 300 asistentes) y `aviso_alquiler` (más de 200 asistentes, RN-03).

#### `GET /api/eventos/:id`

Datos del evento más:

- `productos_calculados`: nombre, clasificación, porción, `cantidad_neta`, `cantidad_con_margen`, `unidad_entrega`, `precio_unitario`, `costo_estimado` y `componentes_menu`.
- `servicios_adicionales`: `tipo`, `descripcion`, `cantidad` y `notas` (incluye el mobiliario).
- En el mobiliario, además (HU-12): `producto_id`, `disponible_inventario` (stock actual), `unidades_propias` y `unidades_alquilar`. En los demás servicios esos campos llegan en `null`.
- `logistica` (HU-21 · RF-28, RN-04, RN-12): el personal de servicio, calculado al consultar (no se guarda). Hoy solo trae los meseros:

```json
{ "meseros_requeridos": 3, "asistentes_por_mesero": 20, "relacion_meseros": "1 por cada 20 asistentes" }
```

  `meseros_requeridos` es el techo de asistentes ÷ 20: 45 → 2,25 → **3**; 60 → **3**; 12 → 0,6 → **1**; 0 → **0**. El cálculo vive en [`src/config/reglasPersonal.js`](src/config/reglasPersonal.js) y se prueba con `npm test` (los cuatro escenarios de la historia; los de 12 y 0 asistentes solo se pueden probar ahí porque un evento real exige 40 a 600, RN-01).
- `aviso_alquiler`: `true` si el evento supera el umbral de asistentes (200 por defecto).
- `estado_alquiler` (RN-03):

```json
{ "requiere_alquiler": true, "umbral_superado": true, "umbral": 200,
  "inventario_insuficiente": true, "unidades_alquilar": 100,
  "motivo": "La cantidad de asistentes (250) supera la capacidad propia (200)." }
```

`requiere_alquiler` sigue solo la regla de asistentes. `inventario_insuficiente` avisa además cuando el mobiliario pedido no alcanza con el stock propio, aunque el evento no supere el umbral. Un elemento marcado como alquilado cuenta siempre como «a alquilar» (`unidades_propias` en `0`).

```json
{ "tipo": "mobiliario", "descripcion": "Sillas Tiffany doradas", "cantidad": 410, "producto_id": 10,
  "disponible_inventario": 350, "unidades_propias": 350, "unidades_alquilar": 60 }
```

Las unidades propias se calculan con el inventario **al momento de consultar**, así que cambian si se compran o se retiran unidades.

### Inventario

Categorías válidas (conjunto cerrado, HU-09 / RF-10): `Mobiliario`, `Bar/Bebidas` (bebidas de consumo directo), `Bebidas de Coctelería` (licores fuertes) y `Vajilla`. Esos son los valores de la API y de la base; en la pantalla se muestran como «Bebidas Generales» y «Licores para Cócteles» (ver el README del frontend). Hay que escribirlas exactamente así. Cada elemento tiene una sola categoría y el filtro `?categoria=` devuelve solo esa (HU-13). Cualquier otro valor, como `Decoración`, `null` o un texto en minúsculas, responde `400`: `La categoría «Decoración» no es válida. Debe ser una de: ...`. La base de datos también lo rechaza con una restricción, y hay un índice sobre la categoría porque se filtra muy seguido.

Máximo de unidades **por elemento** según su categoría (RF-11, RF-13, RN-16). Se aplica al registrar, al actualizar la cantidad, al adquirir y al cambiar la categoría de un elemento; pasarse responde `400` con el motivo. Los límites viven en [`src/config/limitesInventario.js`](src/config/limitesInventario.js) y en `frontend/src/lib/inventario.ts`.

| Categoría | Máximo por elemento |
| --- | --- |
| `Mobiliario` | 2.000 |
| `Vajilla` | 6.000 |
| `Bar/Bebidas` (Bebidas Generales) | 4.000 |
| `Bebidas de Coctelería` (Licores para Cócteles) | 4.000 |

**Alquiler (RF-14, RN-17):** solo se alquila mobiliario y vajilla. Marcar un elemento de bebidas como alquilado (`es_propio: false`) responde `400` al registrarlo y al cambiar su propiedad, y un elemento alquilado no puede pasar a una categoría de bebidas. En los eventos, lo que se pide de mobiliario (`servicios_adicionales[].cantidad` con `tipo: "mobiliario"`) debe ser un entero de 1 a 2.000 (`400` si no); lo que se alquila se calcula al consultar el evento y es, como máximo, lo requerido menos lo propio disponible. Si ya había bebidas alquiladas en la base, [`src/db/cor-08-bebidas-no-alquilables.sql`](src/db/cor-08-bebidas-no-alquilables.sql) las revisa y las pasa a propias.

Las cantidades deben ser enteros: no se aceptan negativos, decimales ni texto. Una adquisición que haría pasar el máximo se rechaza y el mensaje dice cuánto se puede adquirir como mucho (por ejemplo, con 1.800 sillas y 2.000 de máximo: «como mucho se pueden adquirir 200»).

#### `POST /api/inventario`

```json
{ "nombre": "Sillas Tiffany doradas", "categoria_inventario": "Mobiliario", "cantidad_propia": 300 }
```

`cantidad_propia` es la cantidad inicial: entero de **1** hasta el máximo de la categoría (COR-04: no se registra un elemento con 0; `400` con «La cantidad inicial debe ser un número entero mayor o igual a 1»). Más adelante, «Actualizar» sí puede dejarlo en 0.

`es_propio` es opcional: `true` (valor por defecto) para un elemento de la organización y `false` para uno alquilado a un proveedor (HU-12). Debe ser booleano; un texto como `"false"` responde `400`.

Respuesta `201` con el elemento creado. Registra un movimiento de tipo `registro` con la cantidad inicial. Si ya hay **otro elemento del inventario** con ese nombre responde `409`; un producto del catálogo sí puede llamarse igual.

#### `GET /api/inventario?categoria=Mobiliario&propiedad=alquilado`

Los dos filtros son opcionales y se pueden combinar. `propiedad` acepta `propio` o `alquilado` (HU-12); cualquier otro valor responde `400`.


```json
[
  {
    "id": 12, "nombre": "Sillas Tiffany doradas", "categoria_inventario": "Mobiliario",
    "cantidad_propia": 350, "cantidad_danada": 0, "es_propio": true, "unidad_medida": "unidades"
  }
]
```

#### `PATCH /api/inventario/:id/propiedad`

```json
{ "es_propio": false }
```

Marca un elemento como propio (`true`) o alquilado (`false`). `400` si no es booleano, `404` si no existe. No cambia la cantidad, así que no deja movimiento en el historial.

#### `PATCH /api/inventario/:id/categoria`

```json
{ "categoria_inventario": "Vajilla" }
```

Cambia la categoría de un elemento (HU-09). Se valida igual que al crearlo (`400` si no es una de las cuatro) y responde `200` con el elemento actualizado, o `404` si no existe. No cambia la cantidad, así que no deja movimiento en el historial.

#### `PATCH /api/inventario/:id/cantidad`

```json
{ "cantidad_propia": 238, "motivo": "Rotura en el evento del 12 de septiembre" }
```

Fija la cantidad disponible. La diferencia con la cantidad anterior queda como un movimiento de tipo `ajuste`; si la cantidad no cambia, no se registra nada.

#### `POST /api/inventario/:id/adquisiciones`

```json
{ "cantidad": 50, "notas": "Reposición para temporada de bodas" }
```

Suma la cantidad al elemento (entero mayor o igual a 1) y registra un movimiento de tipo `adquisicion`. La cantidad no puede dejar el elemento por encima del **máximo de su categoría** (ver abajo): si se pasa, responde `400` y dice cuántas unidades se pueden adquirir como mucho. Solo aplica a elementos que ya existen. Respuesta `201`: `{ "elemento": { ... }, "movimiento": { ... } }`.

#### `POST /api/inventario/:id/retiro`

```json
{ "cantidad": 5, "motivo": "Manchas de vino que no salieron" }
```

Retira unidades (HU-10, COR-09), por daño, pérdida o devolución: las resta de `cantidad_propia`, las suma a `cantidad_danada` y registra un movimiento de tipo `baja` con la cantidad en negativo (en pantalla se llama «retiro»; el nombre interno no cambió). Basta con la cantidad: el `motivo` es opcional (máximo 300 caracteres) y, si no se envía, el historial guarda «Retiro de elementos». No se puede retirar más de lo disponible (`400`). Como se resta de `cantidad_propia`, lo retirado deja de contarse como disponible en los eventos. La ruta anterior `POST /api/inventario/:id/baja` hace lo mismo. Respuesta `201`: `{ "elemento": { ... }, "movimiento": { ... } }`.

#### `GET /api/inventario/movimientos?elemento_id=12&tipo=adquisicion&limite=20`

Historial del más reciente al más antiguo. Todos los filtros son opcionales. `tipo` puede ser `registro`, `adquisicion`, `ajuste` o `baja`, y `limite` va de 1 a 200 (por defecto 20).

```json
[
  {
    "id": 9, "producto_id": 12, "nombre": "Sillas Tiffany doradas", "categoria_inventario": "Mobiliario",
    "tipo": "adquisicion", "cantidad": 50, "cantidad_resultante": 350,
    "notas": "Reposición para temporada de bodas", "creado_en": "2026-09-28T18:33:10.000Z"
  }
]
```

---

## Cálculo de cantidades

Lo hace `crearEvento` en [`controllers/eventosController.js`](src/controllers/eventosController.js). El frontend replica las mismas fórmulas en `frontend/src/lib/calculos.ts` para mostrar la vista previa.

| Tipo de cálculo | Fórmula | Ejemplo (250 asistentes) |
| --- | --- | --- |
| `porcion_persona` | asistentes × gramos por persona (en kg si supera 1000 g) + 10% | Lomo 200 g → 50 kg → **55 kg** |
| `unidad_persona` | asistentes × unidades por persona + 10%, hacia arriba | Cerveza 2 und → 500 → **550 und** |
| `botella_compartida` | asistentes ÷ (volumen ÷ porción) + 10%, hacia arriba | Vino 750 ml / copa 150 ml → 50 → **55 botellas** |

Costo estimado = cantidad con margen × precio unitario del catálogo.
