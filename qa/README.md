# SIGEV · Pruebas de QA

Pruebas automáticas que recorren los checklists de todas las historias contra la **interfaz** (Playwright) y la **API**. Sirven para comprobar un release antes de llevarlo a producción.

> **Se ejecutan solo contra un entorno de QA o local.** Crean y modifican datos. Si la dirección de la API no parece de pruebas (que no sea `localhost` ni tenga «qa» en el nombre), las pruebas se niegan a correr.

## Qué hay

| Comando | Qué prueba | Duración |
| --- | --- | --- |
| `npm run regresion` | **72 pruebas** de los checklists: acceso, datos y asistentes, alimentos, bebidas, mobiliario y alquiler, servicios, consulta de eventos, inventario, adquisiciones, categorías, baja de dañados, catálogo y transversales | ~3 min |
| `npm run casos-limite` | **36 casos** de la API: datos inválidos, inyección SQL, acceso sin sesión y concurrencia | segundos |
| `npm run todo` | Las dos | ~3 min |

Terminan con código de salida `0` si todo pasa y `1` si algo falla, así que sirven también para integración continua. Los resultados de cada corrida quedan en `qa/resultados/` (no se suben al repositorio).

`casos-limite` tiene una lista de **defectos conocidos** (`DEFECTOS_CONOCIDOS` en el archivo) que hoy fallan y están pendientes de corregir: se muestran como `[defecto conocido]` y no hacen fallar la corrida. Cuando se corrija uno, hay que sacarlo de la lista.

## Cómo ejecutarlas

La primera vez, desde la carpeta `qa`:

```bash
cd qa
npm install
npm run instalar-navegador
```

Después, indicando contra qué entorno corren:

```bash
QA_FRONT_URL=https://sigev-qa.vercel.app \
QA_API_URL=https://sigev-api-qa.vercel.app/api \
QA_USUARIO=qa \
QA_PASSWORD='la-clave-del-usuario-qa' \
npm run todo
```

| Variable | Qué es | Por defecto |
| --- | --- | --- |
| `QA_FRONT_URL` | Dirección del frontend | `http://localhost:5175` |
| `QA_API_URL` | Dirección de la API, terminada en `/api` | `http://localhost:3011/api` |
| `QA_USUARIO` | Usuario de QA | `qa` |
| `QA_PASSWORD` | Contraseña de ese usuario (**obligatoria**) | — |

En local, con el backend y el frontend corriendo contra una base de pruebas, basta con `QA_PASSWORD`.

## Datos que dejan las pruebas

Cada corrida nombra lo que crea con un sufijo único, `(QA-xxxxx)`, así se puede repetir sin chocar con corridas anteriores. Para limpiar esos datos del entorno de QA, ejecutar [`limpiar-datos-qa.sql`](limpiar-datos-qa.sql) en el SQL Editor de Supabase de QA: borra solo lo que lleva ese sufijo y no toca el catálogo, el inventario base ni los usuarios.

## Cuándo correrlas

- Antes de abrir el PR de release `develop → main`.
- Después de cambios que toquen la API, el cálculo de cantidades o la base de datos.
- Tras desplegar a QA, para confirmar que el entorno quedó sano.
