# Desplegar a QA y a producción · SQL pendiente

Esta es la hoja de ruta para publicar. Sirve para juntar varios cambios y desplegar de una vez (lo recomendado: no desplegar PR por PR) y para no olvidar ningún SQL.

> **Estado al 18 de octubre de 2026** (actualízalo cuando despliegues)
> - **QA** está en `47460dd` (todo lo mezclado hasta el PR #39).
> - **Producción** está en `b6110c7` (PR #26): va **35 commits atrás** de `develop`.

## Las reglas

1. **QA antes que producción.** Nada llega a producción sin haberse probado en QA con la suite automática y a mano.
2. **El SQL va primero cuando el código lo necesita.** Si el código nuevo usa una columna que todavía no existe en la base, falla con un error 500. En esos casos (se marcan abajo con ⚠️) se corre el SQL **antes** de desplegar.
3. **Nada se despliega solo.** Mezclar a `develop` no actualiza QA, y mezclar a `main` no actualiza producción: Vercel está conectado a una copia del repositorio y se sincroniza con los scripts de abajo (ver `docs/proceso-de-despliegue.md`, sección 8).
4. **Confirma el proyecto de Supabase antes de ejecutar SQL:** QA empieza por `uvvluaho…` y producción por `geezvrmb…`.
5. **No desplegar justo antes de una entrega o presentación.**

## Desplegar QA

Con la cuenta de GitHub dueña de la copia activa (`gh auth switch --hostname github.com --user javier-r-ramos`):

```bash
scripts/desplegar-qa.sh               # muestra qué se va a desplegar; no cambia nada
scripts/desplegar-qa.sh --confirmar   # despliega y verifica
```

Hace un avance limpio (nunca fuerza nada): sube `develop` a la copia de Vercel, espera a que se publique el frontend y comprueba la API (`health` 200; sin sesión 401). Después se corre el SQL pendiente de QA y se prueba en `https://sigev-qa.vercel.app`. La suite automática contra QA:

```bash
cd qa
QA_FRONT_URL=https://sigev-qa.vercel.app QA_API_URL=https://sigev-api-qa.vercel.app/api \
QA_PASSWORD='<clave del usuario qa>' npm run todo
```

## Desplegar producción

Tiene dos fases porque en el medio se mezcla un PR (el «release», de `develop` a `main`):

```bash
scripts/desplegar-produccion.sh preparar --confirmar   # abre el PR develop → main
# … se revisa y se MEZCLA ese PR en GitHub; antes de publicar se corre el SQL pendiente de producción …
scripts/desplegar-produccion.sh publicar --confirmar   # sincroniza main con la copia de Vercel y verifica
```

Sin `--confirmar` los dos solo muestran el plan. El segundo necesita la cuenta `javier-r-ramos` activa.

## SQL pendiente

Marca ✅ cuando lo ejecutes en cada entorno. Se ejecutan en el SQL Editor de Supabase, en el orden de la tabla.

### QA

| Orden | Qué | Archivo o SQL | ¿Antes del código? | Estado |
| --- | --- | --- | --- | --- |
| 1 | *(Opcional)* Empezar de cero: borra eventos e inventario, conserva usuarios y catálogo | `qa/reiniciar-datos-qa.sql` | No | ⬜ |
| 2 | Revisar y quitar eventos con duración fuera de 3 a 8 horas (sin esto el paso 3 falla) | `SELECT id, nombre_evento, duracion_horas FROM eventos WHERE duracion_horas < 3 OR duracion_horas > 8;` y luego, si son de prueba, `DELETE FROM eventos WHERE duracion_horas < 3 OR duracion_horas > 8;` | No | ⬜ |
| 3 | Restricción de duración (COR-01) | las 4 sentencias `ALTER TABLE eventos …` que están al final de `eventos` en `backend/src/db/schema.sql` | No | ⬜ |
| 4 ⚠️ | Columna de horas de los servicios (RN-18) | `ALTER TABLE requerimientos_adicionales ADD COLUMN IF NOT EXISTS horas NUMERIC(4, 2);` | **Sí: antes de desplegar el código de RN-18** | ⬜ |
| 5 | Bebidas marcadas como alquiladas (COR-08). Innecesario si hiciste el paso 1 | `backend/src/db/cor-08-bebidas-no-alquilables.sql` | No | ⬜ |
| 6 | *(Opcional)* Precios de referencia del catálogo | `backend/src/db/precios-catalogo.sql` | No | ⬜ |
| 7 | *(Opcional)* Datos de prueba (inventario + 6 eventos «[Demo]») | `backend/src/db/datos-de-prueba.sql` | No | ⬜ |
| 8 ⚠️ | Recetas de platos (HU-46): tablas `ingredientes` y `plato_ingredientes` + tres recetas de ejemplo | [`docs/sql-hu-46-recetas-de-platos.sql`](sql-hu-46-recetas-de-platos.sql) (la parte 2, datos de prueba, es opcional) | **Sí: antes de desplegar el código de la HU-46** (sin las tablas, la pestaña «Recetas de Platos» da 500) | ⬜ |

### Producción

| Orden | Qué | Archivo o SQL | ¿Antes del código? | Estado |
| --- | --- | --- | --- | --- |
| 1 | Revisar eventos con duración fuera de 3 a 8 horas; corregirlos o borrarlos si son de prueba | el `SELECT` del paso 2 de QA | No | ⬜ |
| 2 | Restricción de duración (COR-01) | las 4 sentencias `ALTER TABLE eventos …` de `schema.sql` | No | ⬜ |
| 3 ⚠️ | Columna de horas de los servicios (RN-18) | `ALTER TABLE requerimientos_adicionales ADD COLUMN IF NOT EXISTS horas NUMERIC(4, 2);` | **Sí: antes de publicar** | ⬜ |
| 4 | Bebidas marcadas como alquiladas, si las hay | `backend/src/db/cor-08-bebidas-no-alquilables.sql` | No | ⬜ |
| 5 | *(Si el Product Owner lo pide)* Datos de prueba para que ningún módulo se vea vacío | `backend/src/db/datos-de-prueba.sql` (y `datos-de-prueba-quitar.sql` para quitarlos) | No | ⬜ |
| 6 ⚠️ | Recetas de platos (HU-46): tablas `ingredientes` y `plato_ingredientes` (la parte 2 del archivo, datos de prueba, solo si el PO lo pide) | [`docs/sql-hu-46-recetas-de-platos.sql`](sql-hu-46-recetas-de-platos.sql) | **Sí: antes de publicar** | ⬜ |

**Nunca se corre en producción:** `qa/reiniciar-datos-qa.sql` (tiene un candado que lo impide: solo funciona donde existe el usuario `qa`) ni `qa/limpiar-datos-qa.sql`.

### Cómo se agrega un SQL nuevo a esta lista
Quien abra un PR que necesite SQL lo agrega a las dos tablas con su orden y si va antes del código. Un cambio que **solo agrega** (columna opcional, índice, datos) es seguro de correr antes. Uno que **quita o cambia** algo se piensa aparte y se consulta con el líder técnico.

## Después de desplegar

- [ ] `https://<frontend>/` abre y se puede iniciar sesión.
- [ ] Un recorrido corto: registrar un evento con un servicio, abrir inventario y catálogo.
- [ ] En QA: la suite automática completa pasa (comando arriba).
- [ ] Anotar arriba, en «Estado», el commit en el que quedó cada entorno.

## Si algo sale mal

- **Frontend o API:** en Vercel, abrir el proyecto → *Deployments* → el despliegue anterior → *Promote to Production* (o *Redeploy*). Es inmediato y no toca la base de datos.
- **Base de datos:** los cambios de esta lista solo agregan (una columna opcional) o relajan/ajustan una restricción; si hubiera que revertir una columna no se borra, simplemente se deja sin usar. Cualquier caso más serio se consulta con el líder técnico antes de tocar nada.
