# Entorno de QA compartido

Un entorno propio, igual al de producción pero con **su propia base de datos**, para que el equipo y QA prueben sin tocar datos reales. Se actualiza solo con lo que hay en la rama `develop`.

```text
              rama develop ───────────►  Vercel «sigev-qa» + «sigev-api-qa»  ──►  Supabase de QA
              rama main    ───────────►  Vercel «sigev»    + «sigev-api»     ──►  Supabase de producción
```

| | QA | Producción |
| --- | --- | --- |
| Rama que lo despliega | `develop` | `main` |
| Frontend | `sigev-qa.vercel.app` | `sigev-nine.vercel.app` |
| API | `sigev-api-qa.vercel.app` | `sigev-api.vercel.app` |
| Base de datos | Supabase **de QA** (proyecto aparte) | Supabase de producción |
| Datos | De prueba; se pueden borrar | Solo reales |

---

## A. Montarlo (una sola vez)

### 1. Base de datos de QA (Supabase)

1. En Supabase: **New project** → nombre `sigev-qa`, la misma región que producción (`ca-central-1`) y una contraseña de base de datos **distinta** a la de producción.
2. Cuando esté lista: **Connect → Transaction pooler** y anotar `host`, `puerto`, `usuario` (`postgres.<ref>`) y `base` (`postgres`).
3. Generar el SQL de arranque (estructura, catálogo, inventario base y usuarios de QA) desde la carpeta `backend`:
   ```bash
   cd backend
   node src/scripts/generarSqlQA.js ../qa/entorno-qa.generado.sql \
     "qa:<clave-del-usuario-qa>:QA Automático" \
     "javier:<clave>:Javier (QA)" "jhon:<clave>:Jhon (QA)" "oscar:<clave>:Oscar (QA)"
   ```
4. Pegar `qa/entorno-qa.generado.sql` completo en el **SQL Editor** del Supabase de QA y ejecutar. Contiene solo el *hash* de las contraseñas y no se sube al repositorio.

### 2. API de QA (Vercel)

1. **Add New → Project**, mismo repositorio, nombre `sigev-api-qa`, **Root Directory** `backend`.
2. Variables de entorno (valores de la base de **QA**):

   | Variable | Valor |
   | --- | --- |
   | `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Datos del pooler del Supabase de QA |
   | `DB_SSL` | `true` |
   | `JWT_SECRET` | Una clave larga y aleatoria **distinta** a la de producción |
   | `CORS_ORIGIN` | `https://sigev-qa.vercel.app` |

3. En **Settings → Git → Production Branch**, escribir `develop`. Así cada cambio en `develop` actualiza QA.

### 3. Frontend de QA (Vercel)

1. **Add New → Project**, mismo repositorio, nombre `sigev-qa`, **Root Directory** `frontend`.
2. Variable `VITE_API_URL` = `https://sigev-api-qa.vercel.app/api`.
3. **Settings → Git → Production Branch** = `develop`.
4. **Redeploy** (la variable se incorpora al construir).

> **Nota sobre la copia del repositorio:** mientras Vercel siga conectado a la copia personal del repositorio (ver `docs/proceso-de-despliegue.md`, sección 8), esa copia necesita tener la rama `develop`. Se sube con `git push vercel origin/develop:refs/heads/develop`, y se mantiene con el mismo comando.

### 4. Comprobar

```bash
curl https://sigev-api-qa.vercel.app/api/health            # {"status":"ok",...}
curl -i https://sigev-api-qa.vercel.app/api/eventos        # 401 (sin token)
```

y entrar a `https://sigev-qa.vercel.app` con un usuario de QA.

---

## B. Usarlo

**Quien desarrolla:** al terminar una historia, abre el PR hacia `develop`. Mezclar a `develop` **no actualiza QA por sí solo** mientras Vercel siga conectado a la copia personal del repositorio (ver el recuadro de arriba): hay que sincronizar la copia, y ahí QA se redespliega. Con la cuenta de GitHub de la copia (`javier-r-ramos`) activa:

```bash
git fetch origin && git push vercel origin/develop:refs/heads/develop
```

Eso sube todo lo que se haya mezclado a `develop` de una vez (no hace falta hacerlo PR por PR). El script `scripts/desplegar-qa.sh` lo hace con verificación, y la lista de SQL pendiente de QA y de producción está en `docs/despliegue-y-sql-pendiente.md`. Los cambios de base de datos **no** se aplican solos: cada PR que los traiga lo dice y el SQL se ejecuta a mano en el SQL Editor de Supabase de QA (ver la sección «Para ejecutar en Supabase» del PR).

**Empezar QA de cero** (borra eventos e inventario, conserva usuarios y catálogo, y deja datos de prueba con precios). Confirma que el Reference ID del Supabase empiece por `uvvluaho` y ejecuta, en este orden, en el SQL Editor:

1. `qa/reiniciar-datos-qa.sql`: borra eventos, inventario y movimientos. Tiene un candado: solo corre si existe el usuario `qa`, así que en producción no hace nada.
2. `backend/src/db/precios-catalogo.sql`: pone precios de referencia a los productos del catálogo que estén en 0 (nunca pisa un precio ya escrito).
3. `backend/src/db/datos-de-prueba.sql`: inventario de las cuatro categorías y seis eventos «[Demo]» en los cuatro estados, con mobiliario.

Los tres se pueden repetir sin problema.

**QA:** prueba en `sigev-qa.vercel.app` con su usuario. Los hallazgos se validan contra el checklist de la historia.

**Pruebas automáticas** (ver `qa/README.md`):

```bash
cd qa
QA_FRONT_URL=https://sigev-qa.vercel.app \
QA_API_URL=https://sigev-api-qa.vercel.app/api \
QA_PASSWORD='<clave del usuario qa>' \
npm run todo
```

**Limpiar los datos de prueba:** ejecutar `qa/limpiar-datos-qa.sql` en el SQL Editor de Supabase de QA.

**Datos de ejemplo para mostrar el sistema** (inventario de las cuatro categorías y eventos «[Demo]» con mobiliario): `backend/src/db/datos-de-prueba.sql`, y `backend/src/db/datos-de-prueba-quitar.sql` para quitarlos. Ver la sección «Datos de prueba del entorno publicado» de `backend/README.md`.

## C. Reglas del entorno de QA

1. **Producción nunca se prueba.** Todo lo que sea «probar» va a QA.
2. **Cambios de base de datos:** se aplican primero en QA, se prueban, y recién entonces en producción antes del release.
3. **Los secretos de QA son distintos a los de producción** (contraseña de la base y `JWT_SECRET`). Así, una filtración de QA no afecta a producción.
4. **Los datos de QA no se copian a producción**, ni al revés. Si se necesita un catálogo igual, se vuelve a cargar con el script.
5. Para dejar QA como nuevo: ejecutar de nuevo el SQL generado (es repetible) y `limpiar-datos-qa.sql`.
