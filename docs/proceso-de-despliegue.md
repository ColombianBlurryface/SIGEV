# Proceso de desarrollo y despliegue de SIGEV

Esta guía explica cómo llevar un cambio desde la computadora de quien lo desarrolla hasta producción, de forma repetible y sin sorpresas. Está pensada para que cualquiera del equipo pueda seguirla sin depender de quién la hizo antes.

---

## 1. Qué problemas queremos evitar

Estos son los tropiezos reales que ya tuvimos y por qué existe cada regla de abajo:

| Lo que pasó | Regla que lo evita |
| --- | --- |
| Código que llegó a `develop` y **rompía el arranque del servidor** | Probar que el backend arranca antes de mergear (sección 5) |
| Cambios de base de datos que olvidamos aplicar en Supabase y daban error 500 | El SQL se aplica **antes** de mergear y va en la descripción del PR (sección 4) |
| Datos de prueba mezclados con los datos reales | Dos bases de datos: pruebas y producción (sección 2) |
| QA devolviendo historias por cosas que no estaban en el checklist | Checklist congelado y pruebas automáticas (sección 6) |
| Vercel conectado a una **copia** del repositorio, no al del equipo | Conectar Vercel al repositorio real (sección 8) |
| API pública sin pedir sesión | Rutas protegidas y revisión de seguridad antes de publicar (sección 7) |

---

## 2. Entornos

| Entorno | Para qué | Código | Base de datos | Datos |
| --- | --- | --- | --- | --- |
| **Local** | Desarrollar y probar a mano | Tu computadora | PostgreSQL en Docker | De ejemplo, se pueden borrar |
| **Pruebas** (recomendado) | QA y vistas previas | Ramas y PRs, despliegue de *preview* en Vercel | **Un segundo proyecto de Supabase** | De prueba, con prefijo `[QA]` |
| **Producción** | Uso real | Rama `main` | Supabase de producción | **Solo datos reales** |

Regla de oro: **en producción no se hacen pruebas.** Todo lo que sea «probar» ocurre en local o en el entorno de pruebas. Así producción nunca vuelve a necesitar una limpieza.

> Hoy usamos una sola base de Supabase para todo. Crear el segundo proyecto de Supabase (es gratis) es lo que más valor aporta.

---

## 3. Flujo de ramas

```text
feature/hu-XX-nombre  ──PR──►  develop  ──PR de release──►  main  ──►  Producción
        (trabajo)           (integración y QA)            (lo que está en vivo)
```

1. Cada historia o corrección va en su propia rama, creada desde `develop`: `feature/hu-XX-descripcion` o `fix/...`.
2. Los commits van en español, en infinitivo y en minúscula.
3. El PR va hacia `develop`. Lo revisa otra persona del equipo antes de mergear.
4. Cuando `develop` está estable y QA lo aprobó, se abre **un PR de `develop` a `main`** (el *release*). Mergearlo despliega producción.
5. Una corrección urgente en producción se hace desde `main` (`hotfix/...`), se mergea a `main` y se devuelve a `develop`.

Nunca se sube directamente a `main` ni a `develop`.

---

## 4. Cambios en la base de datos

La estructura vive en `backend/src/db/schema.sql` y debe poderse ejecutar varias veces sin error (`IF NOT EXISTS`, `DROP CONSTRAINT IF EXISTS`, etc.).

**Si tu PR cambia la base de datos:**

1. Edita `schema.sql` de forma que sea repetible.
2. Aplícalo primero en tu base local y luego en la de **pruebas**.
3. Pon en la descripción del PR el SQL exacto, en un bloque, con una nota «⚠️ Base de datos».
4. **Aplícalo en producción justo antes de mergear el PR de release a `main`**, no después. El código nuevo debe encontrar la estructura ya lista.
5. Verifica con una consulta de solo lectura que quedó aplicado.

**Datos de referencia** (catálogo, productos): van en `seeds.sql` o en un script versionado y repetible (`ON CONFLICT DO NOTHING`). **Nunca** incluyen datos de prueba ni sobrescriben precios que alguien ya escribió.

**Antes de cualquier operación que borre o modifique datos en producción:** guardar un respaldo (exportar las tablas afectadas) y ejecutar el script en una transacción (`BEGIN … COMMIT`).

---

## 5. Antes de abrir un PR

Lista de comprobación de quien desarrolla:

- [ ] `cd frontend && npm run build` y `npm run lint` pasan sin errores.
- [ ] El backend **arranca** (`cd backend && node src/server.js`) y `GET /api/health` responde.
- [ ] Lo nuevo se probó en la interfaz, no solo por API.
- [ ] Si hay cambios en la base de datos: `schema.sql` repetible y el SQL en la descripción del PR.
- [ ] Ningún secreto en el código: no se sube `.env`, contraseñas, tokens ni archivos de accesos.
- [ ] Se actualizaron los README afectados.
- [ ] La descripción del PR dice **qué cambia, cómo se probó y qué no se probó**.

---

## 6. Calidad: cómo se prueba

1. **Checklist de la historia.** Es lo que QA valida. Lo que está en el documento técnico pero no en el checklist se trata como mejora, no como defecto.
2. **Pruebas automáticas de regresión** (recomendado agregarlas al repositorio): recorren los checklists de todas las historias contra una base limpia. Hoy se corrieron como suite de 72 pruebas; llevarlas al repositorio permite correrlas antes de cada release.
3. **Pruebas de casos límite en la API** (valores negativos, fechas inválidas, ids inexistentes): la API debe responder 400 con un mensaje claro, nunca 500.
4. **Datos de QA:** en el entorno de pruebas y con un prefijo `[QA]` en el nombre, para poder limpiarlos con una consulta.

---

## 7. Seguridad antes de publicar

- Todas las rutas de la API, excepto `POST /api/auth/login` y `GET /api/health`, exigen el token de sesión. Se comprueba que sin token responden `401`.
- `CORS_ORIGIN` debe contener **solo** la dirección del frontend de producción.
- Los secretos (`DB_PASSWORD`, `JWT_SECRET`) viven únicamente en las variables de entorno de Vercel y en el `.env` local. Si alguna se filtra, se **rota** (cambiarla en Supabase y en Vercel). Cambiar `JWT_SECRET` cierra todas las sesiones, y es lo esperado.
- Las cuentas las crea el administrador con `crearUsuario.js`; no hay registro público. Las contraseñas se entregan por un canal privado.

---

## 8. Despliegue en Vercel

### Cómo está montado

| Proyecto de Vercel | Root Directory | Variables de entorno |
| --- | --- | --- |
| **Frontend** (`sigev`) | `frontend` | `VITE_API_URL` = dirección de la API terminada en `/api` |
| **API** (`sigev-api`) | `backend` | `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_SSL=true`, `JWT_SECRET`, `CORS_ORIGIN` |

`VITE_API_URL` se incorpora **al construir**: si se cambia, hay que volver a desplegar el frontend.

### Pasos de un despliegue (release)

1. En el entorno de pruebas: el PR integrado en `develop` pasa el checklist y las pruebas de regresión.
2. Aplicar en producción los cambios de base de datos del release (sección 4), con respaldo previo.
3. Abrir el PR `develop → main` y mergearlo. Vercel construye solo.
4. **Prueba de humo** inmediatamente después:
   ```bash
   curl https://<api>/api/health                 # → {"status":"ok",...}
   curl -i https://<api>/api/eventos             # → 401 (sin token)
   ```
   y entrar a la aplicación con un usuario real: iniciar sesión, abrir Eventos e Inventario, crear y borrar un dato **de prueba mínimo** solo si es indispensable.
5. Si algo falla: en Vercel, **Deployments → el anterior → Promote to Production** (vuelve a la versión previa al instante). Si el cambio incluía base de datos, evaluar si el cambio de estructura es compatible hacia atrás antes de revertir.

### Estado actual y la forma correcta

Hoy Vercel está conectado a una **copia** del repositorio en la cuenta personal de quien lo creó, porque Vercel copia el repositorio cuando se importa uno ajeno. Cada cambio en `main` del equipo exige sincronizar esa copia a mano.

**Forma correcta:** conectar el proyecto de Vercel directamente a `ColombianBlurryface/SIGEV`. Para eso el dueño de esa cuenta de GitHub debe instalar la aplicación de Vercel y darle acceso a ese repositorio. Con eso, cada merge a `main` despliega solo y desaparece la copia. Mientras tanto, la sincronización es:

```bash
git fetch origin && git switch espejo-vercel && git merge origin/main && git push vercel espejo-vercel:main
```

---

## 9. Datos reales: cómo empezar y mantener limpio

1. **Una sola vez**, al pasar a datos reales: respaldar y ejecutar el script de limpieza (borra eventos, inventario y movimientos; conserva usuarios y catálogo).
2. Cargar el catálogo real con `carga-catalogo-mercado-colombiano.sql` y ajustar precios y presentaciones desde la pantalla **Catálogo**.
3. Registrar el inventario real con **Nuevo** y **Adquisición**.
4. A partir de ahí, **no se prueba en producción**. Cualquier prueba va al entorno de pruebas.
5. Los respaldos de Supabase deben activarse o exportarse con regularidad.

---

## 10. Lo que falta para tener un proceso completo

Ordenado por valor:

1. **Segundo proyecto de Supabase** para pruebas y variables de entorno separadas por entorno en Vercel (*Production* y *Preview*).
2. **Conectar Vercel al repositorio del equipo** (sección 8) y quitar la copia.
3. **Integración continua** (GitHub Actions): que cada PR ejecute `build`, `lint` y las pruebas de regresión automáticamente, y que no se pueda mergear si fallan.
4. **Migraciones versionadas** de la base de datos (un archivo por cambio, aplicado en orden) en lugar de un único `schema.sql`.
5. **Validaciones de entrada en la API** de eventos (hoy algunos datos inválidos responden 500 o se aceptan).
6. **Registrar qué usuario hace cada movimiento** del inventario.
7. **Protección de la rama `main`** en GitHub: exigir PR y al menos una revisión.
