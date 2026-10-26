# Checklist de pruebas de SIGEV

Sirve para probar todo lo construido hasta ahora, en local o en QA. Cada punto dice qué hacer y qué debe pasar.

- 🤖 **Automático:** ya lo cubre la suite (`qa/`); se confirma corriéndola. Comando abajo.
- 👀 **A mano:** lo tiene que mirar una persona (cómo se ve, qué tan claro es un mensaje, cómo se siente en el celular).

**Local:** `http://localhost:5174`, usuario `dev`, contraseña `local1234`. La base trae precios en el catálogo y 6 eventos «[Demo]» (`backend/src/db/datos-de-prueba.sql`).
**QA:** `https://sigev-qa.vercel.app` con tu usuario de QA.

```bash
cd qa
QA_FRONT_URL=http://localhost:5174 QA_API_URL=http://localhost:3000/api QA_USUARIO=dev QA_PASSWORD=local1234 npm run todo
QA_VIEWPORT=390x844 npm run regresion      # lo mismo en pantalla de celular (768x1024 para tablet)
```

> Nota: la suite crea sus propios datos de prueba (los marca con «(QA-…)»). Para no mezclarlos con los datos de ejemplo, córrela contra otra base (ver `docs/entorno-de-qa.md`).

---

## 1. Registrar un evento

### Fecha (RN-14)
- [ ] 🤖👀 **Ayer no se puede.** Nuevo evento → en «Fecha» escribe a mano la fecha de ayer → *Siguiente*. → Sale «no se puede registrar un evento en el pasado» y no pasa al paso 2.
- [ ] 🤖 **Hoy sí; una fecha de hace un año y una de dentro de 10 años, no.**
- [ ] 🤖 Por la API: fecha de ayer, `2026-13-45`, «mañana» y el año 3000 responden 400.
- [ ] 🤖👀 **Máximo 3 eventos activos por día.** Con 3 eventos el mismo día, el 4.º se bloquea en el paso 1 con un mensaje. Los cancelados no cuentan.
- [ ] 🤖 30 registros simultáneos para la misma fecha: entran exactamente 3.

### Duración y asistentes
- [ ] 🤖👀 **Duración de 3 a 8 horas.** 0,5 h, 2,9 h, 8,1 h, 60 h y 0 se rechazan con «debe estar entre 3 y 8 horas»; 3 y 8 se aceptan. «4 horas» (texto) también se rechaza.
- [ ] 🤖 **Asistentes de 40 a 600.** 39 y 601 se rechazan; 40 y 600 pasan; 100,5 se rechaza.
- [ ] 🤖👀 **Más de 300 asistentes = buffet** (aparece la etiqueta «Buffet»); 300 no.
- [ ] 🤖 Tipo de evento inventado, nombre en blanco o de 151 caracteres, observaciones gigantes: 400.

---

## 2. Alimentos y bebidas

- [ ] 🤖 **Cálculo con 10 % de margen:** 250 asistentes × 120 g de arroz = 33 kg; 250 × 2 cervezas = 550 unidades.
- [ ] 🤖👀 **Unidades por persona de una bebida individual = entero de 1 a 10.** Escribe `1,4` en el evento → mensaje claro y no deja agregar. `0` y `11` se rechazan; `1` y `10` pasan.
- [ ] 🤖👀 Lo mismo en **Catálogo** al crear o editar una bebida por unidad.
- [ ] 🤖 Una porción de alimento de 0, negativa o de 50 kg por persona se rechaza (máximo 1.000 g).
- [ ] 🤖 El mismo producto dos veces en un evento y un producto que no existe: 400 (antes eran errores 500).
- [ ] 🤖👀 **Valor unitario de las bebidas:** viene con el precio del catálogo y se puede cambiar en el evento; una bebida sin precio muestra «Sin valor» y suma $0.
- [ ] 👀 En el **Catálogo** ya no queda ningún producto con «Sin precio» (se cargaron precios de referencia).

---

## 3. Mobiliario y alquiler

- [ ] 🤖 El mobiliario se elige del inventario; muestra cuántas unidades son **propias** y cuántas se **alquilan**.
- [ ] 🤖👀 **Cantidad de mobiliario: entero de 1 a 2.000.** 0, −5, 1,5, 2.001 y 1 millón se rechazan; 2.000 pasa.
- [ ] 🤖 **250 asistentes:** 250 sillas pedidas con 150 propias → «150 propias · 100 a alquilar».
- [ ] 🤖 **150 asistentes** con todo cubierto → no se alquila nada y no sale aviso.
- [ ] 🤖 Lo que se alquila nunca pasa de «lo requerido menos lo propio»; un elemento alquilado y un «Otro» alquilan exactamente lo pedido.
- [ ] 🤖👀 **Las bebidas no se alquilan:** en Inventario, al elegir «Bebidas Generales» o «Licores para Cócteles», el botón «Alquilado» queda deshabilitado con la explicación. Por la API, registrar o marcar un licor como alquilado responde 400.
- [ ] 👀 **El aviso de alquiler se entiende** (tres casos):
  - 600 asistentes sin mobiliario → «Evento de más de 200 asistentes. Todavía no tiene mobiliario: con tantas personas conviene revisar si hay que alquilar.» (azul)
  - Falta inventario → «Hay que alquilar N unidades de mobiliario. El inventario propio no alcanza…» (amarillo)
  - Inventario alcanza → «El inventario propio cubre el mobiliario pedido, así que por ahora no hay nada que alquilar.» (azul)
  - No aparece «RN-03» ni «hasta ahora» en ningún lado.

---

## 4. Servicios adicionales (RN-18)

- [ ] 🤖👀 **Unidades de 1 a 5.** Prueba 0, 1, 5 y 6 (también 2,5 y −1): 0, 6, 2,5 y −1 dan «Las unidades deben ser un número entero de 1 a 5».
- [ ] 🤖👀 **Las horas no pueden superar la duración del evento.** En un evento de 5 h: 6 y 300 se rechazan con «no pueden superar la duración del evento (5 h)»; 5 pasa; 3,5 pasa; 3,25 no.
- [ ] 🤖👀 **Si reduces la duración después de agregar un servicio:** Atrás → cambia la duración a 3 → sale una alerta amarilla «La duración no alcanza para los servicios agregados»; en el paso 2 hay otra alerta y *Siguiente: Resumen* no avanza («No se puede continuar»). Quitando el servicio, ya avanza.
- [ ] 🤖👀 **COR-06 · Horas de 1 a 5:** en un evento de 8 h, un servicio de 6 h o de 0,5 h se rechaza («Las horas de un servicio van de 1 a 5»); 1, 1,5 y 5 pasan. El formulario propone 5 h (no 8).
- [ ] 🤖👀 **COR-06 · Tope de unidades por tipo en todo el evento:** DJ 3, música en vivo 3, entretenimiento 3, sonido 2, iluminación 2, otro 5. Probar: 4 DJs en una línea → «Un evento admite máximo 3 de «DJ»»; 2 + 2 DJs en dos líneas → la segunda dice «solo puedes agregar 1 más»; con los 3 ya agregados → «Ya agregaste el máximo». La API rechaza seis líneas de un DJ (el caso de la captura del PO).
- [ ] 🤖 El tipo de servicio inventado y la descripción en blanco se rechazan.
- [ ] 👀 El resumen y el detalle del evento muestran «2 und · 4 horas».

---

## 5. Eventos: lista y detalle

- [ ] 🤖👀 La lista muestra los 6 eventos de ejemplo; **buscar** por nombre y **filtrar por estado** (Planificación, Confirmado, Realizado, Cancelado) funcionan.
- [ ] 👀 El detalle de «[Demo] Boda Martínez & Gómez» muestra costos con los precios del catálogo y el aviso «Hay que alquilar 82 unidades…».
- [ ] 🤖 Un evento que no existe o un id con texto: 404 / 400, nunca 500.

---

## 6. Inventario

- [ ] 🤖👀 **Máximo por elemento según la categoría:** Mobiliario 2.000, Vajilla 6.000, Bebidas Generales y Licores 4.000. Se aplica al registrar, al actualizar la cantidad y al adquirir. El valor exacto pasa; uno más se rechaza.
- [ ] 🤖👀 **Adquisición que se pasa:** el mensaje dice cuánto se puede adquirir como mucho («Como mucho se pueden adquirir 200…»).
- [ ] 🤖 Cantidades negativas, decimales o texto: 400. 1 millón de sillas: 400.
- [ ] 🤖👀 **COR-04 · No se registra un elemento con cantidad 0** en ninguna de las 4 categorías: el formulario dice «Debe ser un número entero mayor o igual a 1» y la API responde 400. Con 1 sí se registra. Un elemento ya registrado sí puede quedar en 0 con «Actualizar».
- [ ] 🤖 Dos adquisiciones simultáneas no pasan juntas del máximo.
- [ ] 🤖👀 **«Retiro de elementos»** (antes «Baja»): pestaña «Retiro», campos «Elemento a retirar» y «Cantidad a retirar», botón «Retirar». **No queda ningún texto de «baja» ni «dañada»** en esa pantalla.
- [ ] 🤖 El retiro resta igual que antes, no deja retirar más de lo disponible y la suma de movimientos siempre es igual a la cantidad.
- [ ] 🤖 Las cuatro categorías existen con sus nombres de pantalla (Mobiliario, Bebidas Generales, Licores para Cócteles, Vajilla); «Decoración» se rechaza.
- [ ] 👀 Los cuatro módulos (Eventos, Inventario, Catálogo, Nuevo evento) muestran datos al abrirlos; ninguno se ve vacío.

---

## 7. Catálogo

- [ ] 🤖 Crear un producto sin precio, editarlo, ponerle precio, desactivarlo y volverlo a activar.
- [ ] 🤖 Un producto ya usado en un evento no cambia de grupo ni de tipo (409).
- [ ] 🤖 Nombre repetido: 409. Porción mayor que la botella: se rechaza.
- [ ] 🤖 Un alimento de 90 kg por persona o una botella de 100 litros se rechazan.
- [ ] 👀 «Hielo (bolsa)» (0,1 por persona) se ve en el catálogo; para usarlo en un evento hay que escribir un entero de 1 a 10 *(pendiente de decisión del equipo)*.

---

## 8. Pantallas, colores y celular

- [ ] 👀 **Celular** (en el navegador: herramientas de desarrollo → vista de dispositivo, 390 px): menú de hamburguesa que abre un cajón, se cierra al tocar fuera o al elegir una opción; nada se corta ni hay scroll lateral.
- [ ] 👀 En celular, las tablas del registro (Alimentos, Bebidas, Mobiliario) se ven como tarjetas con sus datos etiquetados.
- [ ] 👀 **Modo oscuro:** actívalo y recorre Eventos, Nuevo evento, Inventario y Catálogo; todo se lee bien.
- [ ] 🤖 Suite completa en 1440, 390 y 768 px: sin diferencias.
- [ ] 🤖 Sin errores de JavaScript en la consola durante todo el recorrido; cerrar sesión devuelve al login; una ruta inexistente muestra la página 404.

---

## 9. Seguridad de la API

- [ ] 🤖 Todas las rutas, salvo el login y `/api/health`, responden 401 sin sesión; un token inválido, 401.
- [ ] 🤖 Login con datos falsos: 401; con un usuario de 10.000 caracteres o JSON roto: 400/401, nunca 500.
- [ ] 🤖 Inyección SQL en filtros (por ejemplo, `?tipo=baja' OR 1=1`): 400.

---

## 10. Scripts de base de datos y despliegue

- [ ] 🤖 `qa/reiniciar-datos-qa.sql` **se bloquea** si no existe el usuario `qa` (así no corre en producción) y, con él, deja 0 eventos, elementos y movimientos y conserva catálogo y usuarios.
- [ ] 🤖 `backend/src/db/precios-catalogo.sql`: deja 0 productos sin precio y **no pisa** los precios que ya estaban.
- [ ] 🤖 `backend/src/db/datos-de-prueba.sql`: se puede ejecutar dos veces con el mismo resultado; la suma de movimientos coincide con la cantidad; ningún servicio pasa de 1–5 unidades ni de la duración. `datos-de-prueba-quitar.sql` lo deja limpio.
- [ ] 🤖 `scripts/desplegar-qa.sh` y `scripts/desplegar-produccion.sh` sin `--confirmar` solo muestran el plan.
- [ ] 👀 Antes de desplegar de verdad: revisar `docs/despliegue-y-sql-pendiente.md` (el SQL de la columna `horas` va **antes** del código).

---

## 11. Personal de servicio · meseros (HU-21) y cocineros (HU-22)

> Módulo nuevo que se construye **una historia a la vez**; esta sección crece con cada una.

- [ ] 🤖 **1 mesero por cada 20 asistentes, redondeado hacia arriba (RN-04, RN-12).** 45 → 3; 60 → 3; 40 → 2; 41 → 3; 100 → 5; 300 → 15; 301 → 16; 600 → 30.
- [ ] 🤖 Escenarios 3 y 4 de la historia (12 asistentes → 1; 0 → 0): solo a nivel de cálculo, porque un evento real exige 40 a 600 asistentes. Se prueban con `cd backend && npm test`.
- [ ] 🤖👀 **Se muestra dentro del evento:** en el detalle, el recuadro «Meseros requeridos · 1 por cada 20 asistentes» con el número grande y la cuenta («45 ÷ 20 = 2,25 → se redondea hacia arriba a 3»; en un múltiplo exacto, «60 ÷ 20 = 3»).
- [ ] 🤖👀 **También antes de guardar:** en el paso 1 la vista previa cambia en vivo al escribir los asistentes (45 → 3, 61 → 4) y muestra «—» con asistentes fuera de rango; el resumen del paso 3 dice «Meseros requeridos: 3 (1 por cada 20 asistentes)».
- [ ] 🤖 La API trae `logistica.meseros_requeridos`, `asistentes_por_mesero` y `relacion_meseros`; el número de la pantalla coincide con el de la API.

### HU-22 · Cocineros (RF-29, RN-05, RN-12) — una sola regla para todos los eventos

- [ ] 🤖 **Cocineros = (asistentes ÷ 25, hacia arriba) × 2.** 40 → 4; 100 → 8; 200 → 16; 300 → 24; 320 → 26; 600 → 48.
- [ ] 🤖 **Casos límite:** 50 → 4 y 51 → 6 (el techo va antes de multiplicar por 2: no sale 5).
- [ ] 🤖 **No depende del tipo de evento ni de la comida:** dos eventos de 40 asistentes, uno con alimentos «Buffet» y otro con «Snacks ligeros» (y de tipo Boda, Corporativo, Gala…), dan 4 cocineros cada uno. Un buffet de más de 300 (320) también: 26. Ya no existe el campo «Servicio de comida».
- [ ] 🤖👀 **Se muestra dentro del evento:** en el detalle, el recuadro «Cocineros requeridos · 2 por cada 25 asistentes» con el número grande y la cuenta («45 ÷ 25 = 1,8 → se redondea hacia arriba a 2 grupos × 2 = 4 cocineros»; en un múltiplo exacto, «100 ÷ 25 = 4 grupos × 2 = 8 cocineros»).
- [ ] 🤖👀 **Si cambia el número de asistentes, el cálculo se actualiza:** en el paso 1 la vista previa cambia en vivo (45 → 4, 51 → 6, 100 → 8) y muestra «—» fuera de rango; el resumen del paso 3 dice «Cocineros requeridos: 4 (2 por cada 25 asistentes)».
- [ ] 🤖 La API trae `logistica.cocineros_requeridos` y la relación; el número de la pantalla coincide con el de la API. El cliente no puede fijarlo (se ignora `cocineros_requeridos` en el cuerpo) y los asistentes fuera de 40–600 o decimales se rechazan (400).
- [ ] 🤖 Los escenarios con menos de 40 asistentes y 0 solo se prueban a nivel de cálculo: `cd backend && npm test`.


---

## 12. Recetas de platos (HU-46)

> Requiere haber cargado las recetas de ejemplo (`backend/src/db/recetas-de-prueba.sql`) y, en QA, el SQL de las dos tablas nuevas.

- [ ] 🤖👀 **Catálogo → pestaña «Recetas de Platos»** lista los platos (alimentos) con su estado: «3 ingredientes», «1 ingrediente», «Sin receta» y la marca «Datos de prueba» en los de ejemplo.
- [ ] 🤖 **Datos de prueba (escenario 3):** «Arroz verde con almendras» trae exactamente tres ingredientes: arroz 80 g (se compra por kilo), almendras 15 g (libra) y cilantro 10 g (libra). «Pechuga a la plancha»: pechuga de pollo 200 g (kilo). «Papa salada»: papa 150 g (arroba).
- [ ] 🤖👀 **Registrar la receta (escenario 1):** en un plato sin receta, agregar ingrediente, cantidad por porción, unidad y cómo se compra; «Guardar receta» confirma («Receta de … guardada: 2 ingredientes») y al volver a abrir el plato está igual. La API responde 200 con cantidad, unidad de porción y unidad de compra.
- [ ] 🤖👀 **Editar la receta:** cambiar una cantidad o quitar un ingrediente muestra «Cambios sin guardar»; guardar reemplaza la receta anterior; «Descartar cambios» vuelve a lo guardado. Una receta de ejemplo deja de decir «Datos de prueba» cuando se guarda la real.
- [ ] 🤖👀 **Unidades (escenario 2):** solo gramos, kilos, libras y arrobas (en la pantalla son listas cerradas). Por la API, `LITROS`, `PAQUETES` u otra unidad dan 400 con «Las unidades permitidas son solo gramos, kilos, libras o arrobas.».
- [ ] 🤖👀 **Cantidad mayor a 0:** 0, negativos, texto o vacío se rechazan («Debe ser un número mayor a 0»); más de 3 decimales y más de 1 kg por persona (también en kilos, libras o arrobas) también; escribir «120,5» con coma funciona.
- [ ] 🤖👀 **Ingrediente repetido** en la misma receta (aunque cambien mayúsculas o tildes) y **sin nombre** se rechazan; no se puede dejar la receta sin ingredientes ni pasar de 30.
- [ ] 🤖👀 **Unidad de compra compartida:** al escribir un ingrediente que otra receta ya compra (p. ej. «arroz»), se rellena con su unidad de compra («Kilos») y no se puede cambiar; por la API, una unidad distinta da 409.
- [ ] 🤖 **Todo o nada:** un guardado con una línea inválida no cambia nada (la receta anterior queda intacta y no se crean ingredientes sueltos). 12 guardados simultáneos terminan con una receta completa, y el mismo ingrediente nuevo desde varios platos queda una sola vez.
- [ ] 🤖 Sin sesión: 401. Plato inexistente: 404; id con texto: 400; una bebida: 400; un elemento del inventario: 404.


---

## 13. Ingredientes a comprar (HU-47)

> Requiere las recetas de la HU-46 (las de ejemplo sirven: `backend/src/db/recetas-de-prueba.sql`). No necesita SQL propio.

- [ ] 🤖👀 **Escenario 1 · kilos con margen:** un evento de 100 asistentes con «Pechuga a la plancha» (pechuga de pollo 200 g, se compra por kilo) muestra **22 kilos** de pechuga de pollo (20.000 g → 22.000 g con margen).
- [ ] 🤖👀 **Escenario 2 · un solo total y libras:** 50 asistentes con dos platos que usan cilantro (10 g y 5 g, por libra) muestran **un solo renglón**: 750 g → 825 g (1,65 libras exactas) → **2 libras**, con los dos platos nombrados.
- [ ] 🤖👀 **Escenario 3 · arrobas:** 200 asistentes con «Papa salada» (150 g, por arroba) → 33.000 g con margen → **3 arrobas**. Con 40 asistentes: 6.600 g → **1 arroba**.
- [ ] 🤖 **Equivalencias:** 1 kg = 1.000 g, 1 libra = 500 g, 1 arroba = 12,5 kg; las porciones escritas en kilos, libras o arrobas se convierten a gramos antes de calcular. El redondeo es siempre hacia arriba y nunca cae en un número de más por decimales (20.000 g × 1,10 = 22 kilos exactos, no 23).
- [ ] 🤖 **El margen del 10 % se aplica una sola vez** sobre el total sumado (3 platos de 3 g con 50 asistentes: 495 g → 1 libra, no 3).
- [ ] 🤖👀 **Si cambia el número de asistentes, el cálculo se actualiza** (40 a 600: siempre alcanza y no sobra una unidad entera); y si se edita la receta de un plato, el evento ya guardado muestra la compra con la receta nueva.
- [ ] 🤖👀 **Donde se ve:** en el detalle del evento («Ingredientes a comprar», con «N g con margen» y los platos que lo usan) y en el paso 3 del registro, **antes de guardar**.
- [ ] 🤖👀 **Platos sin receta:** el evento avisa «Este plato no tiene receta: … No se calcularon sus ingredientes» y no inventa números. Un evento sin alimentos dice que no hay ingredientes que calcular. Las bebidas y el mobiliario no cuentan.
- [ ] 🤖 **API:** `GET /api/eventos/:id` trae `compras_ingredientes`; `POST /api/eventos/calcular-compras` da lo mismo antes de guardar y rechaza (400) asistentes fuera de 40–600, decimales o texto, ids inválidos, bebidas o platos que no existen; sin sesión, 401. Un cliente no puede fijar el resultado.

---

## Resultado de la ejecución del 18 de octubre de 2026 (local, sobre `develop` en el PR #43)

| Parte | Resultado |
| --- | --- |
| 🤖 Suite de regresión en 1440, 390 y 768 px | **111/111** en las tres |
| 🤖 Casos límite de la API | **76/76**, 0 defectos conocidos |
| 🤖 Scripts SQL (candado, reinicio, precios, datos de prueba dos veces, quitar) | todos correctos |
| 🤖 Scripts de despliegue en simulación | muestran el plan y no cambian nada |
| 👀 Revisión visual asistida (20 comprobaciones sobre la base de ejemplo) | 20/20; el único «fallo» fue de la propia comprobación |
| Hallazgo | La carpa de los datos de ejemplo debía figurar como **alquilada** y no lo hacía (el elemento ya existía como propio): corregido en `datos-de-prueba.sql` y en `datos-de-prueba-quitar.sql`; ahora el evento de 250 asistentes alquila **82** unidades |

Queda para una persona: los puntos 👀 de juicio (claridad de los mensajes, sensación en un celular real, recorrido completo en modo oscuro) y la decisión pendiente sobre «Hielo (bolsa)».
