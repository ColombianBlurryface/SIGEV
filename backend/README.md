# SIGEV · Backend

API REST de SIGEV hecha con **Node.js + Express 5** y **PostgreSQL** (Supabase). Aplica las reglas de negocio del sistema: validaciones, cálculo de cantidades con margen del 10%, inicio de sesión con JWT e inventario con historial de movimientos.

---

## Puesta en marcha

### 1. Instalar dependencias

```bash
cd backend
npm install
```

### 2. Configurar las variables de entorno

```bash
cp .env.example .env
```

Completa `backend/.env` (pide los valores reales al equipo; **nunca subas este archivo al repositorio**):

| Variable | Descripción |
| --- | --- |
| `DB_HOST` | Host del *pooler* de Supabase (`aws-0-<region>.pooler.supabase.com`) o `localhost` |
| `DB_PORT` | `6543` (Supabase, *transaction pooler*) o el puerto de tu Postgres local |
| `DB_NAME` | Nombre de la base (`postgres` en Supabase) |
| `DB_USER` | Usuario (`postgres.<project-ref>` en Supabase) |
| `DB_PASSWORD` | Contraseña de la base de datos |
| `DB_SSL` | `true` para Supabase, `false` para un Postgres local |
| `PORT` | Puerto del backend (por defecto `3000`) |
| `MAX_OWNED_CAPACITY_THRESHOLD` | Umbral de asistentes a partir del cual se avisa que hay que alquilar mobiliario (P-05, RN-03). Opcional: por defecto `200`. Hay que reiniciar el servidor al cambiarlo |
| `JWT_SECRET` | Clave larga y aleatoria para firmar los tokens de sesión |
| `CORS_ORIGIN` | Opcional. Sitios que pueden llamar a la API, separados por comas (por ejemplo la dirección del frontend). Sin definirla acepta cualquiera |
| `DB_POOL_MAX` | Opcional. Máximo de conexiones por instancia (por defecto `5`) |

> En Supabase usa la conexión del **pooler** (Connect → Direct → *Session/Transaction pooler*). La conexión directa (`db.<ref>.supabase.co`) solo funciona con IPv6 y en muchas redes no resuelve.

### 3. Crear las tablas (solo si la base está vacía)

Ejecuta en orden `src/db/schema.sql` y `src/db/seeds.sql`, en el SQL Editor de Supabase o con `psql`:

```bash
psql -d sigev_db -f src/db/schema.sql
```

```bash
psql -d sigev_db -f src/db/seeds.sql
```

Los dos archivos se pueden volver a ejecutar sin error.

### 4. Crear un usuario

No hay registro público: los usuarios se crean con este script. Escribe la contraseña entre comillas simples.

```bash
node src/scripts/crearUsuario.js <usuario> '<contraseña>' "<Nombre Completo>" admin
```

Si el usuario ya existe, solo cambia su contraseña.

### 5. Iniciar el servidor

```bash
node src/server.js
```

Comprueba que responde en <http://localhost:3000/api/health>.

---

## Carga del catálogo y el inventario base

[`src/db/carga-catalogo-mercado-colombiano.sql`](src/db/carga-catalogo-mercado-colombiano.sql) carga de una vez, en el SQL Editor de Supabase:

- **77 productos del catálogo** con las marcas del mercado colombiano: cervezas nacionales, importadas y artesanales; gaseosas, aguas y maltas; vinos y espumosos; aguardientes, rones, whisky, vodka, ginebra y tequila; y acompañantes del bar.
- **34 elementos de inventario base** (mobiliario y vajilla) con cantidad 0, para registrar las cantidades reales con «Actualizar» o «Adquisición».
- Renombra productos que ya existían para no duplicarlos.

Se puede ejecutar varias veces: no duplica nada y no pisa precios escritos desde la pantalla Catálogo. **Todos los productos nuevos quedan sin precio**; las porciones y presentaciones son las habituales y se ajustan desde el Catálogo. Incluye, comentada, una limpieza opcional de los datos de prueba marcados con «(borrar)».

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
| POST | `/inventario/:id/baja` | Retirar unidades dañadas (resta de la cantidad) |
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
| `bebida_general`, `bar_cocteleria` | `unidad_persona` | `porcion_por_persona` en unidades; el precio es por unidad |
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
    { "tipo": "dj", "descripcion": "DJ para recepción y fiesta", "cantidad": 6 }
  ]
}
```

- `productos` y `servicios_adicionales` son opcionales.
- `porcion_por_persona` es opcional: si no se envía, se usa la del catálogo.
- `precio_unitario` es opcional: es el valor unitario (por unidad, por botella o por kg) escrito en el evento. Si no se envía, se usa el del catálogo. Debe ser un número mayor o igual a 0 (`400` si no). El costo guardado se calcula con ese valor, y el detalle del evento lo devuelve como el precio realmente usado.
- El mobiliario se envía como servicio adicional con `tipo: "mobiliario"`. Con `producto_id` se relaciona con un elemento del inventario de categoría `Mobiliario` (HU-12); en ese caso la descripción se toma del inventario. Sin `producto_id`, el elemento no está en el inventario y todo se alquila.
- Un mismo elemento del inventario no puede repetirse en el evento (`400`).
- Todo se guarda en una transacción: si algo falla, no queda nada a medias.

Respuesta `201`: `{ "mensaje": "...", "evento": { "id": 4, "estado": "planificacion", ... } }`

Validaciones (`400`): campos obligatorios, asistentes entre 40 y 600, duración mayor a 0 y `producto_id` de mobiliario existente y sin repetir.

#### `GET /api/eventos`

Lista de eventos ordenada por fecha. Cada evento incluye `es_modalidad_buffet` (más de 300 asistentes) y `aviso_alquiler` (más de 200 asistentes, RN-03).

#### `GET /api/eventos/:id`

Datos del evento más:

- `productos_calculados`: nombre, clasificación, porción, `cantidad_neta`, `cantidad_con_margen`, `unidad_entrega`, `precio_unitario`, `costo_estimado` y `componentes_menu`.
- `servicios_adicionales`: `tipo`, `descripcion`, `cantidad` y `notas` (incluye el mobiliario).
- En el mobiliario, además (HU-12): `producto_id`, `disponible_inventario` (stock actual), `unidades_propias` y `unidades_alquilar`. En los demás servicios esos campos llegan en `null`.
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

#### `POST /api/inventario`

```json
{ "nombre": "Sillas Tiffany doradas", "categoria_inventario": "Mobiliario", "cantidad_propia": 300 }
```

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

Suma la cantidad al elemento (entero de 1 a 100.000) y registra un movimiento de tipo `adquisicion`. Solo aplica a elementos que ya existen. Respuesta `201`: `{ "elemento": { ... }, "movimiento": { ... } }`.

#### `POST /api/inventario/:id/baja`

```json
{ "cantidad": 5, "motivo": "Manchas de vino que no salieron" }
```

Retira unidades dañadas (HU-10): las resta de `cantidad_propia`, las suma a `cantidad_danada` y registra un movimiento de tipo `baja` con la cantidad en negativo. Basta con la cantidad: el `motivo` es opcional (máximo 300 caracteres) y, si no se envía, el historial guarda «Baja por daño». No se puede retirar más de lo disponible (`400`). Como se resta de `cantidad_propia`, lo dado de baja deja de contarse como disponible en los eventos. Respuesta `201`: `{ "elemento": { ... }, "movimiento": { ... } }`.

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
