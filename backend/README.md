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
| `JWT_SECRET` | Clave larga y aleatoria para firmar los tokens de sesión |

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
| POST | `/auth/login` | Iniciar sesión |
| GET | `/catalogo` | Productos del catálogo (filtro `?clasificacion=`) |
| GET | `/catalogo/:id` | Un producto del catálogo |
| POST | `/eventos` | Registrar un evento con sus requerimientos |
| GET | `/eventos` | Lista de eventos ordenada por fecha |
| GET | `/eventos/:id` | Detalle de un evento con sus requerimientos |
| POST | `/inventario` | Registrar un elemento del inventario |
| GET | `/inventario` | Elementos del inventario (filtro `?categoria=`) |
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

### Catálogo

#### `GET /api/catalogo?clasificacion=alimento`

Devuelve los productos activos del catálogo. Los elementos de inventario no aparecen aquí. Clasificaciones: `alimento`, `bebida_general`, `bar_cocteleria`, `mobiliario`.

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
- `aviso_alquiler`: `true` si el evento tiene más de 200 asistentes.

```json
{ "tipo": "mobiliario", "descripcion": "Sillas Tiffany doradas", "cantidad": 410, "producto_id": 10,
  "disponible_inventario": 350, "unidades_propias": 350, "unidades_alquilar": 60 }
```

Las unidades propias se calculan con el inventario **al momento de consultar**, así que cambian si se compran o se retiran unidades.

### Inventario

Categorías válidas: `Mobiliario`, `Bar/Bebidas`, `Bebidas de Coctelería`.

#### `POST /api/inventario`

```json
{ "nombre": "Sillas Tiffany doradas", "categoria_inventario": "Mobiliario", "cantidad_propia": 300 }
```

Respuesta `201` con el elemento creado. Registra un movimiento de tipo `registro` con la cantidad inicial. Si el nombre ya existe responde `409`.

#### `GET /api/inventario?categoria=Mobiliario`

```json
[
  {
    "id": 12, "nombre": "Sillas Tiffany doradas", "categoria_inventario": "Mobiliario",
    "cantidad_propia": 350, "cantidad_danada": 0, "es_propio": true, "unidad_medida": "unidades"
  }
]
```

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

Retira unidades dañadas (HU-10): las resta de `cantidad_propia`, las suma a `cantidad_danada` y registra un movimiento de tipo `baja` con la cantidad en negativo. El motivo es obligatorio (máximo 300 caracteres) y no se puede retirar más de lo disponible. Respuesta `201`: `{ "elemento": { ... }, "movimiento": { ... } }`.

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
