![][image1]

**PLAN DE ENTREGAS Y SPRINTS**

**INTRODUCCIÓN A LA GESTIÓN DE PROYECTOS DE SOFTWARE**

Sistema SIGEV — Versión 2.6

***Oscar Eduardo Jimenez Morales \- 2264419***

***Javier Rubiales Ramos \- 24259462***

***Jhoon Suarez \- 202357574***

**DOCENTE**

**YUSTI TIJO GERMAN ALBERTO**

**Universidad del Valle**

**Tecnología en Desarrollo de Software**

**Tuluá, Valle del Cauca**

**12 de noviembre de 2026**

# **Control de versiones**

| Versión | Fecha | Cambios |
| :---- | :---- | :---- |
| 1.0 | 08 sep 2026 | Versión inicial. |
| 2.0 | 20 sep 2026 | Cierre del Sprint 1, historias por sprint, frontend visible y riesgos. |
| 2.1 | 30 sep 2026 | Capacidad de 18 h/semana, una persona por historia, QA estimado y HU-25 movida al Sprint 4\. |
| 2.2 | 9 oct 2026 | Cierre del Sprint 2 y de la semana de integración 1 con horas reales, correcciones del QA, HU-43 terminada como trabajo adelantado, reparto del Sprint 4 aligerado y dos observaciones nuevas sobre carga y estimaciones. |
| 2.3 | 9 oct 2026 | Se registra cómo trabajó el equipo de verdad: no hubo reuniones diarias y la coordinación fue asíncrona. Se agrega el proceso técnico y el despliegue ya en funcionamiento, la causa del Sprint 1 corto, y tres riesgos nuevos (dependencia de personas, validación sin usuario final y verificación pendiente movida al Sprint 3). |
| 2.4 | 14 oct 2026 | Retroalimentación de la sustentación de la Entrega 1 (13 oct): hallazgos del profesor y del equipo. Por decisión del equipo, todo el trabajo nuevo entra al Sprint 3, que queda al 221 % de la capacidad; se define el orden de trabajo (primero las correcciones) y se agregan tres riesgos. |
| 2.5 | 20 oct 2026 | Decisión del equipo del 20 de octubre: el cliente siempre elige qué comer, así que se elimina el tipo de servicio de comida (almuerzo, cena, buffet) como dato del evento y el personal de cocina se calcula con una sola regla general, ⌈asistentes ÷ 25⌉ × 2, que queda en el promedio de las tres reglas anteriores. RN-02 se conserva: más de 300 asistentes se atienden tipo buffet, y el sistema lo indica sin cambiar cálculos. HU-23 y HU-24 salen del Sprint 3 y la tarea RF-49 pasa de agregar el campo de servicio de comida (2 h) a indicar el buffet (1 h). El Sprint 3 baja de 79,5 h a 72,5 h (201 % de la capacidad). |
| 2.6 | 12 nov 2026 | Cierre de los sprints 3 y 4 con datos reales del historial de ClickUp (3.6 a 3.9). Al Sprint 5 entran HU-50, HU-51 y DEF-02, hallazgos del QA del Sprint 4; las fechas del plan no cambian. La duración máxima del evento pasa a 8 horas. El registro de riesgos se rehace con el método de la sesión 8 (R-A a R-F, issues y cerrados). Nuevas secciones: interesados y RACI (12), indicadores de control (13\) y pronóstico al MVP (14). |

**Índice**

[**Control de versiones	2**](#heading=)

[**1\. Capacidad del equipo	3**](#heading=)

[**2\. Fechas de entrega (definidas por el profesor)	3**](#heading=)

[**3\. Avance real	3**](#heading=)

[3.1. Sprint 1 (16–21 sep) — cerrado	3](#heading=)

[3.2. Sprint 2 (22 sep–5 oct) — cerrado	3](#heading=)

[3.3. Semana de integración 1 (6–12 oct)	3](#heading=)

[3.4. Entrega 1 y su retroalimentación (13 oct)	4](#heading=)

[3.5. Decisión del 20 de octubre: un solo cálculo de cocina	4](#heading=)

[3.6. Sprint 3 (13–26 oct) — cerrado	5](#heading=)

[3.7. Sprint 4 (27 oct–9 nov) — cerrado	5](#heading=)

[3.8. Hallazgos del QA de los sprints 3 y 4	6](#heading=)

[3.9. Semana de integración 2 (10–17 nov) y Entrega 2	6](#heading=)

[**4\. Dos observaciones para la retrospectiva	7**](#heading=)

[4.1. La carga quedó muy desbalanceada	7](#heading=)

[4.2. Las estimaciones no apuntan parejo	7](#heading=)

[4.3. Por qué el Sprint 1 duró una semana y fue solo backend	7](#heading=)

[**5\. Reparto de historias por sprint	7**](#heading=)

[**6\. Carga contra capacidad de lo que falta	8**](#heading=)

[6.1. Orden de trabajo dentro del Sprint 3	8](#heading=)

[**7\. QA del Product Owner	9**](#heading=)

[**8\. Trabajo adicional planeado	9**](#heading=)

[**9\. Riesgos y mitigación	9**](#heading=)

[**10\. Ceremonias y seguimiento	10**](#heading=)

[**11\. Proceso técnico y despliegue	11**](#heading=)

[**12\. Interesados y responsabilidades	11**](#heading=)

[**13\. Indicadores de control	12**](#heading=)

[**14\. Pronóstico al MVP	12**](#heading=)

# **1\. Capacidad del equipo**

| Integrante | Rol | Responsabilidad | Dedicación |
| :---- | :---- | :---- | :---- |
| Oscar Eduardo Jimenez Morales | Product Owner / QA | Documentación, gestión del backlog, criterios de aceptación y pruebas de aceptación | 8 h/semana |
| Jhoon Suarez | Desarrollador | Historias completas: base de datos, API, lógica, reglas e interfaz | 13 h/semana |
| Javier Rubiales Ramos | Scrum Master | Historias completas e integración; facilitación Scrum | 5 h/semana |
| **Capacidad de desarrollo** |  | **Jhon \+ Javier** | **18 h/semana** |

En un sprint de 2 semanas: Jhon 26 h y Javier 10 h. En un sprint de 1 semana: Jhon 13 h y Javier 5 h. Cada historia la desarrolla una sola persona, que hace el backend y la pantalla.

# **2\. Fechas de entrega (definidas por el profesor)**

* **Entrega 1:** 13 de octubre de 2026\.

* **Entrega 2:** 17 de noviembre de 2026\.

* **Entrega 3 (final, MVP):** 15 de diciembre de 2026\.

# **3\. Avance real**

## **3.1. Sprint 1 (16–21 sep) — cerrado**

| Historia | Desarrolla | Estimado | Real |
| :---- | :---- | :---- | :---- |
| HU-01 a HU-07 | Jhon | 16 h | 13 h 30 |

## **3.2. Sprint 2 (22 sep–5 oct) — cerrado**

| Tarea | Desarrolla | Estimado | Real | Estado |
| :---- | :---- | :---- | :---- | :---- |
| Interfaces de HU-01 a HU-07 | Javier | 8 h | 8:00 | Finalizada |
| HU-08 Registrar elementos de inventario | Jhon | 6 h | 3:00 | Finalizada |
| HU-09 Clasificar inventario | Jhon | 2 h | 0:15 | Finalizada |
| HU-10 Retirar elementos dañados | Jhon | 3 h | 2:00 | Finalizada |
| HU-11 Registrar nuevas adquisiciones | Javier | 3 h | 2:00 | Finalizada |
| HU-12 Diferenciar propios y alquilados | Javier | 4 h | 3:30 | Finalizada (se devolvió una vez) |
| HU-13 Separar coctelería y bebidas generales | Javier | 4 h | 3:15 | Finalizada |
| **Total** |  | **30 h** | **22 h** |  |

*HU-13 estaba asignada a Jhon en el plan y la desarrolló Javier. HU-12 se devolvió en el QA del 9 de octubre por no cumplir su criterio y se corrigió en la semana de integración.*

## **3.3. Semana de integración 1 (6–12 oct)**

| Tarea | Desarrolla | Estimado | Real |
| :---- | :---- | :---- | :---- |
| QA-02 Baja de elementos dañados en sección aparte | Javier | 3 h | 0:35 |
| QA-03 Renombrar las categorías del inventario | Javier | 30 min | 0:30 |
| QA-04 Precargar las bebidas del catálogo | Javier | 1 h | 0:30 |
| HU-43 Administrar el catálogo de bebidas y alimentos | Javier | 5 h | 0:40 |
| **Total** |  | **9 h 30** | **2 h 15** |

Los cuatro hallazgos del QA quedaron corregidos y aprobados antes de la Entrega 1\. HU-43 era alcance nuevo planeado para el Sprint 4 y se adelantó aquí: libera 5 h de Javier en ese sprint.

## **3.4. Entrega 1 y su retroalimentación (13 oct)**

En la sustentación el profesor hizo el papel de cliente y probó el sistema con casos límite. Su conclusión: la primera versión tiene pocas validaciones y todavía no muestra la promesa de valor, que es calcular y controlar cuánta comida, bebida, mobiliario y horas necesita un evento. Valoró la sinceridad de la presentación y aceptó el cálculo de botellas compartidas.

| Hallazgo | Origen | Qué se decidió el 14 de octubre | Tarjeta |
| :---- | :---- | :---- | :---- |
| Fecha del evento en el pasado | Equipo | Fecha del día actual o posterior (RN-14) | COR-01 |
| Evento de 60 horas | Profesor | Duración de 3 a 12 horas (RN-14); desde el 12 de noviembre, de 3 a 8 | COR-01 |
| Eventos ilimitados por día | Equipo | Máximo 3 por fecha (RN-13) | COR-02 |
| 1,4 gaseosas por persona | Equipo | Unidades enteras de 1 a 10 (RN-15) | COR-03 |
| 1 millón de sillas; 100.000 unidades adquiridas | Profesor | Máximos por categoría (RN-16) | COR-04 |
| Sillas en licores; "basura" en vajilla | Profesor | Lista de tipos por categoría (RF-10) | COR-05 |
| DJ ilimitados y 300 h de DJ | Profesor | Cantidad de 1 a 5 y horas hasta la duración del evento (RN-18) | COR-06 |
| El mobiliario no mostraba nada | Profesor | Funcionaba, pero faltaban datos de prueba en la demo | COR-07 |
| 1 millón de bebidas alquiladas | Profesor | Solo mobiliario y vajilla, hasta lo que falta (RN-17) | COR-08 |
| "Dar de baja" no es "devolver" | Profesor | Se renombra a retiro, que cubre todo lo que sale del inventario | COR-09 |
| Coctelería poco clara | Profesor | Entra al MVP: recetas de cóctel y cálculo de botellas | HU-44, HU-45 |
| Platos sin ingredientes | Profesor | Entra al MVP: recetas de platos y cálculo en unidad de compra | HU-46, HU-47 |
| El costo del DJ no suma | Profesor | Entra al MVP: el valor de los servicios suma al costo total | HU-48 |
| No hay turnos de meseros | Profesor | Fuera de alcance, declarado de forma explícita (RNF-03) | — |
| Carga desbalanceada | Profesor | Reparto del Sprint 3 en proporción a la capacidad | R2 |

*Lección para el equipo: el QA y la demo probaron la ruta feliz. Desde la versión 2.4 la definición de terminado exige probar casos límite y tener datos de prueba cargados en el entorno publicado.*

## **3.5. Decisión del 20 de octubre: un solo cálculo de cocina**

Hablando con el equipo, y considerando que el cliente siempre elige qué comer, se eliminó el tipo de servicio de comida (almuerzo, cena o buffet) como dato del evento. Con eso desaparecen las tres reglas de cocina y queda una sola: **cocineros \= ⌈asistentes ÷ 25⌉ × 2**, que da 4, 8, 16, 24 y 48 cocineros para 40, 100, 200, 300 y 600 asistentes y queda en el promedio de las tres reglas anteriores.

La regla de buffet (RN-02) se conserva: en eventos de más de 300 asistentes no hay servicio a la mesa, cada invitado toma su plato y va a la zona de comida. El sistema lo indica, pero no cambia ningún cálculo. Los meseros siguen con 1 por cada 20 asistentes.

Efecto en el Sprint 3: se eliminan HU-23 y HU-24 (6 h de Javier) y la tarea RF-49 pasa de 2 h a 1 h. El sprint baja de 79,5 h a 72,5 h. No se había desarrollado nada de lo eliminado.

## **3.6. Sprint 3 (13–26 oct) — cerrado**

Cumplimiento medido con la fecha de aprobación de cada tarjeta, tomada de su historial en ClickUp: **14 de 25 tarjetas (56 %)**. Siete tarjetas pasaron al Sprint 4 como deuda técnica y otras cuatro se aprobaron el 1 de noviembre, después del cierre.

| Tarea | Desarrolla | Estimado | Real | Aprobada | Observación |
| :---- | :---- | :---- | :---- | :---- | :---- |
| COR-01 Validar fecha y duración | Jhon | 1,5 h | 3:00 | 1 nov | Devuelta 1 vez; fuera del sprint |
| COR-02 Máximo 3 eventos por fecha | Jhon | 2 h | 3:00 | 19 oct |  |
| COR-03 Bebidas en unidades enteras | Javier | 1 h | 0:10 | 19 oct |  |
| COR-04 Topes de inventario | Javier | 2 h | 0:25 | 1 nov | Devuelta 1 vez; fuera del sprint |
| COR-05 Tipos por categoría | Javier | 4 h | 0:30 | 19 oct |  |
| COR-07 Datos de prueba | Javier | 1 h | 0:24 | 19 oct |  |
| COR-08 Alquiler solo mobiliario y vajilla | Javier | 2,5 h | 1:00 | 19 oct |  |
| COR-09 Baja → retiro | Javier | 0,5 h | 0:25 | 19 oct |  |
| Verificar el backend de HU-14 a HU-20 | Jhon | 1 h | 2:00 | 20 oct | Confirmó que el backend existía |
| HU-14 a HU-20 (cálculos de alimentos y bebidas) | Jhon | 26 h | 2:00 | 19–20 oct | El backend ya estaba hecho |
| HU-21 Calcular meseros | Javier | 4 h | 2:00 | 1 nov | Fuera del sprint |
| HU-22 Calcular personal de cocina | Javier | 3 h | 1:27 | 1 nov | Fuera del sprint |
| **Total en la lista del Sprint 3** |  | **48,5 h** | **16:21** |  |  |

Pasaron al Sprint 4: COR-06, RF-49 (buffet; en el tablero se llama HU-49) y HU-44 a HU-48. COR-03 y COR-06 las desarrolló Javier, aunque el plan las asignaba a Jhon.

## **3.7. Sprint 4 (27 oct–9 nov) — cerrado**

Cumplimiento de lo comprometido para el sprint: **5 de 8 tarjetas (62,5 %)**. Además absorbió las siete tarjetas heredadas del Sprint 3\.

| Tarea | Desarrolla | Estimado | Real | Aprobada | Observación |
| :---- | :---- | :---- | :---- | :---- | :---- |
| COR-06 Cantidad y horas de servicios | Javier | 3 h | 0:35 | 8 nov | Heredada; devuelta 2 veces |
| RF-49 Indicar buffet (HU-49) | Jhon | 1 h | 0:16 | 2 nov | Heredada |
| HU-44 Recetas de cóctel | Jhon | 3 h | 3:00 | 8 nov | Heredada; devuelta 1 vez |
| HU-45 Licor por cóctel | Jhon | 5 h | 3:00 | 11 nov | Heredada; devuelta 2 veces |
| HU-46 Recetas de platos | Javier | 4 h | 3:00 | 3 nov | Heredada |
| HU-47 Ingredientes a comprar | Javier | 6 h | 3:00 | 2 nov | Heredada; asignada a Jhon, la hizo Javier |
| HU-48 Costo de servicios | Jhon | 3 h | 3:00 | 8 nov | Heredada |
| Conectar HU-25 y modelo de datos del balance | Jhon | 2 h | 1:30 | 8 nov |  |
| HU-25 Alertar desviaciones de personal | Jhon | 5 h | 5:00 | 8 nov |  |
| HU-26 Registrar meseros | Javier | 4 h | 1:00 | 9 nov | Devuelta 1 vez |
| HU-27 Eliminar meseros | Javier | 1 h | 1:00 | 9 nov |  |
| HU-28 Asignar meseros | Javier | 6 h | 1:00 | 9 nov |  |
| HU-29 Estado de asignación | Javier | 4 h | 1:30 | 11 nov | Fuera del sprint |
| HU-30 Lista de meseros programados | Javier | 4 h | 2:00 | 11 nov | Fuera del sprint |
| DEF-01 Error al actualizar cóctel | Jhon | — | 0:15 | 11 nov | Defecto encontrado en el sprint |
| **Total** |  | **51 h** | **29:06** |  |  |

*Desde que se acabó el plan gratuito de ClickUp las horas se registran en los comentarios de cada tarjeta; están todas sumadas. La tarjeta "Integración frontend-backend y corrección de errores" de la Integración 1 no tiene horas propias porque ese trabajo se hizo dentro de otras tarjetas. HU-46 tiene un registro erróneo de 92 h 24 m (temporizador abierto); las horas válidas son 3\.*

## **3.8. Hallazgos del QA de los sprints 3 y 4**

| Gravedad | Hallazgo | Tarjeta | Estado |
| :---- | :---- | :---- | :---- |
| Crítico | Escribiendo la fecha a mano se aceptaban fechas anteriores | COR-01 | Corregido |
| Crítico | Un cóctel creado desde el catálogo no aparecía al crear el evento | HU-45 | Corregido |
| Crítico | Un mesero marcado "no puede" queda bloqueado también en los días siguientes | DEF-02 | Abierto; Sprint 5 |
| Alto | COR-06 no cumplía al probar con un evento de 5 horas | COR-06 | Corregido |
| Alto | El cálculo del licor se mostraba en otro apartado | HU-45 | Corregido |
| Alto | Error al actualizar un cóctel | DEF-01 | Corregido |
| Alto | Las horas de un servicio tomaban toda la duración del evento y no se podían cambiar (hallazgo interno) | COR-06 | Corregido |
| Medio | Se podía agregar un elemento con cantidad 0 | COR-04 | Corregido |
| Medio | Validación de número al registrar un mesero | HU-26 | Corregido |
| Bajo | Faltaban datos de prueba en las recetas de cóctel | HU-44 | Corregido |

Además salieron dos **necesidades nuevas**, que no son defectos porque no estaban en ningún requerimiento: editar eventos (gravedad media, HU-50) y cambiar el estado del evento desde la interfaz (gravedad alta, HU-51). Las tres cosas pendientes entran al Sprint 5\.

## **3.9. Semana de integración 2 (10–17 nov) y Entrega 2**

| Tarea | Responsable | Estimado |
| :---- | :---- | :---- |
| Integración de interfaces y ajustes | Javier | 5 h |
| Integración y despliegue en el servidor de pruebas | Jhon | 8 h |
| Prueba de aceptación de HU-14 a HU-30 y documento de la Entrega 2 | Oscar | 8 h |

La Entrega 2 se sustenta el 17 de noviembre de 2026\. Exponen Oscar y Jhon; Javier está ausente. La demo muestra todo lo aceptado hasta el Sprint 4\. Repositorio: 156 commits al 12 de noviembre.

# **4\. Dos observaciones para la retrospectiva**

## **4.1. La carga quedó muy desbalanceada**

| Persona | Capacidad del Sprint 2 \+ integración | Horas registradas | Uso |
| :---- | :---- | :---- | :---- |
| Jhon | 39 h | 5 h 15 | 13 % |
| Javier | 15 h | 16 h 45 | 112 % |

Javier desarrolló 6 de las 7 tareas de la segunda mitad del sprint y toda la semana de integración, incluida una historia que estaba asignada a Jhon. Esto hay que conversarlo en la retrospectiva antes del Sprint 3, porque el plan de ese sprint le asigna a Jhon 28 h de trabajo: siete historias de cálculo más el campo de servicio de comida.

## **4.2. Las estimaciones no apuntan parejo**

| Tipo de trabajo | Estimado | Real | Observación |
| :---- | :---- | :---- | :---- |
| Historias nuevas del Sprint 2 | 30 h | 22 h | Se estima alto: el trabajo rindió un 27 % más de lo previsto. |
| Correcciones del QA y HU-43 | 9 h 30 | 2 h 15 | Se estima muy alto cuando se construye sobre algo que ya existe. |
| Corrección de un defecto (HU-12) | 2 h | 3 h 30 | Se estima corto: corregir código ya entregado cuesta más de lo que parece. |

*Propuesta para el Sprint Planning del 13 de octubre: bajar las estimaciones de las historias que se construyen sobre funcionalidad existente y reservar un margen fijo para correcciones. Las estimaciones del backlog siguen siendo preliminares.*

## **4.3. Por qué el Sprint 1 duró una semana y fue solo backend**

La causa la asume el Product Owner: no se contemplaron las horas de diseño y construcción del frontend, y se repartió trabajo antes de tener el alcance asentado. El sprint terminó con el backend de HU-01 a HU-07 y sin ninguna pantalla.

Qué se corrigió: desde la versión 2.1 del plan el frontend se estima aparte, desde el Sprint 2 cada historia incluye backend y pantalla con una sola persona responsable, y las interfaces pendientes de la Épica 1 se planearon como trabajo explícito del Sprint 2 en vez de quedar como deuda invisible.

# **5\. Reparto de historias por sprint**

| Sprint | Fechas | Jhon | Javier | QA Oscar |
| :---- | :---- | :---- | :---- | :---- |
| 1 (cerrado) | 16–21 sep | HU-01 a HU-07 | — | Hecho |
| 2 (cerrado) | 22 sep–5 oct | HU-08, HU-09, HU-10 | Interfaces Épica 1, HU-11, HU-12, HU-13 | Hecho |
| Integración 1 | 6–12 oct | Integración y Entrega 1 | QA-02, QA-03, QA-04, HU-43 | Hecho |
| 3 (cerrado) | 13–26 oct | HU-14 a HU-20, RF-49 (indicar buffet), COR-01, COR-02, COR-03, COR-06, HU-44 a HU-48 | HU-21, HU-22, COR-04, COR-05, COR-07, COR-08, COR-09 | Hecho |
| 4 (cerrado) | 27 oct–9 nov | HU-25 \+ modelo del balance; deuda del Sprint 3: RF-49, HU-44, HU-45, HU-48 | HU-26 a HU-30; deuda del Sprint 3: COR-06, HU-46, HU-47 | Hecho |
| Integración 2 | 10–17 nov | Integración y despliegue en el servidor de pruebas | Integración de interfaces y ajustes | Aceptación de HU-14 a HU-30 y Entrega 2 |
| 5 | 18 nov–1 dic | HU-31, HU-32, HU-35, HU-50, HU-51 | HU-33, HU-34, adelanto de la interfaz del calendario (HU-36), DEF-02 | 9,5 h |
| 6 | 2–8 dic | HU-36 | HU-37 \+ verificación de HU-38 y HU-39 | 5 h |
| 7 | 9–15 dic | Corrección de hallazgos | Corrección de hallazgos | Validación con los datos de un evento ya ejecutado |

*En el Sprint 3, COR-03, COR-06, HU-46 y HU-47 las desarrolló Javier, aunque el plan las asignaba a Jhon; en el Sprint 4 también HU-26 y HU-28. La fila del Sprint 4 muestra lo que de verdad se hizo, incluida la deuda que llegó del Sprint 3\.*

# **6\. Carga contra capacidad de lo que falta**

| Sprint | Jhon (carga / capacidad) | Javier (carga / capacidad) | Observación |
| :---- | :---- | :---- | :---- |
| 3 | 55,5 h / 26 h | 17 h / 10 h | Decisión del equipo del 14 de octubre: todo el trabajo nuevo entra al Sprint 3\. Con el cambio del 20 de octubre queda en 72,5 h contra 36 h de capacidad (201 %). Ver el orden de trabajo en 6.1 y el riesgo R3. Real: 16,4 h de desarrollo y 14 de 25 tarjetas aprobadas dentro del sprint (3.6). |
| 4 | 17 h / 26 h | 9 h / 10 h | HU-43 ya está hecha, así que Javier tiene 5 h libres más de las previstas. Real: 29,1 h de desarrollo, con la deuda del Sprint 3 incluida; 5 de 8 tarjetas aprobadas dentro del sprint (3.7). |
| 5 | 22 h / 26 h | 13 h / 10 h | Sprint crítico: no tiene semana de integración después. Incluye HU-50, HU-51 y DEF-02 (hallazgos del Sprint 4\) y el adelanto del calendario. Javier queda por encima de su capacidad: riesgo R-E. |
| 6 | 7 h / 13 h | 6 h / 5 h | Sprint de una semana. |

## **6.1. Orden de trabajo dentro del Sprint 3**

Por decisión del Product Owner, primero se corrige lo que está mal y después se agrega lo nuevo. El orden también respeta las dependencias: las recetas usan el motor de cálculo de HU-14 a HU-20.

| Orden | Bloque | Tarjetas | Horas |
| :---- | :---- | :---- | :---- |
| 1 | Correcciones de la retroalimentación | COR-01 a COR-09 | 17,5 h |
| 2 | Lo que ya estaba planeado | RF-49 (indicar buffet), HU-14 a HU-22 | 34 h |
| 3 | Funcionalidades nuevas | HU-44 a HU-48 | 21 h |
|  | **Total del Sprint 3** |  | **72,5 h** |

| Persona | Ya planeado | Nuevo | Total | Capacidad | Uso |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Jhon | 27 h | 28,5 h | 55,5 h | 26 h | 213 % |
| Javier | 7 h | 10 h | 17 h | 10 h | 170 % |
| Oscar (QA) | 9,5 h \+ 2 h de cierre | 11,5 h | 23 h | 16 h | 144 % |

*El reparto de lo nuevo sigue la proporción de capacidad de cada uno (13 h de Jhon por 5 h de Javier). Javier toma las correcciones del inventario, que conoce del Sprint 2; Jhon toma eventos, servicios y lo nuevo, que depende del motor de cálculo que él desarrolla.*

# **7\. QA del Product Owner**

| Tamaño de la historia | QA estimado |
| :---- | :---- |
| 5 h o más | 1,5 h |
| 3 a 4 h | 1 h |
| 2 h o menos | 30 min |
| Cierre de sprint (prueba completa antes de la entrega) | 2 h por sprint |

El QA del Sprint 2 encontró cuatro hallazgos: un defecto (HU-12, devuelta), dos mejoras de uso (HU-10 y HU-09) y una necesidad nueva (el catálogo de bebidas, que dio origen a HU-43). Están documentados en el Informe de QA del Sprint 2\.  
**Cambio desde la versión 2.4:** el QA del Sprint 2 probó la ruta feliz y por eso no vio lo que el profesor encontró en cinco minutos. Desde el Sprint 3, cada checklist incluye casos límite: el valor exacto del límite, uno más, cero, negativos, decimales y cantidades absurdas.

# **8\. Trabajo adicional planeado**

| Tarea | Sprint | Responsable | Estimado |
| :---- | :---- | :---- | :---- |
| Indicar el servicio tipo buffet en eventos de más de 300 asistentes — RF-49 (reemplaza al campo de servicio de comida) | 3 | Jhon | 1 h |
| Verificar el backend adelantado de HU-14 a HU-20 | 3 | Jhon | 1 h |
| Conectar HU-25 con los meseros asignados y diseñar el modelo de datos del balance | 4 | Jhon | 2 h |
| Integración, ajustes de despliegue y Entrega 2 (la aplicación ya está publicada) | 10–17 nov | Jhon y Javier | 18 h |
| Adelanto de la interfaz del calendario (HU-36) | 5 | Javier | 3 h |
| Editar eventos — HU-50 (necesidad nueva del QA del Sprint 4\) | 5 | Jhon | 4 h |
| Cambiar el estado del evento — HU-51 (necesidad nueva del QA del Sprint 4\) | 5 | Jhon | 2 h |
| Disponibilidad del mesero por día — DEF-02 (defecto crítico del QA del Sprint 4\) | 5 | Javier | 3 h |

# **9\. Riesgos y mitigación**

El 12 de noviembre el registro se reorganizó con el método de la sesión 8: cada riesgo se escribe como causa → evento → impacto; probabilidad (P) e impacto (I) en escala de 1 a 5; dueño, respuesta, señal de alarma (trigger), contingencia y riesgo residual. Nivel: alto 15 o más, medio 8 a 12, bajo 6 o menos.

| ID | Causa → evento → impacto | P×I | Dueño | Respuesta | Trigger | Contingencia | Residual |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| R-A | El balance (HU-31) y 3 hallazgos caen en el Sprint 5, sin integración después → el balance no se aprueba a tiempo → el MVP sale sin su función central | 3×5 \= 15 alto | Jhon | Mitigar: HU-31 desde el primer día y QA por historia | HU-31 sin entrar a revisión el 25 nov | Calendario (prioridad media) después del MVP | 2×5 |
| R-B | Un solo probador con 8 h/semana; el QA del Sprint 3 cerró 6 días tarde → historias en revisión al cierre → baja el cumplimiento | 4×3 \= 12 medio | Oscar | Mitigar: probar cada tarjeta en menos de 48 h | Tarjeta con más de 2 días en revisión | Prueba cruzada Jhon–Javier; Oscar solo aprueba | 2×3 |
| R-C | 10 defectos, 8 devoluciones y 2 necesidades nuevas → el retrabajo consume la capacidad → no alcanza para el balance y el calendario | 3×4 \= 12 medio | Oscar | Mitigar: casos límite antes de entregar | Correcciones sobre el 20 % de las horas del sprint | Aplazar HU-36 y HU-37 | 2×4 |
| R-D | El evento real no está definido y nadie externo ha usado el sistema → no hay datos reales a tiempo → el MVP no demuestra su valor | 3×4 \= 12 medio | Oscar | Mitigar: definir el evento y reunir datos antes del 1 dic | 1 dic sin datos | Validar con el evento reconstruido y declararlo como limitación | 2×4 |
| R-E | Dos desarrolladores con pocas horas; Javier en 13 h de 10 en el Sprint 5 → si uno falta → se frena lo suyo | 3×4 \= 12 medio | Javier | Mitigar: cada uno conoce el código del otro | Un desarrollador 4 días sin avance | Recortar prioridad media | 2×4 |
| R-F | Las recetas son reales pero privadas y no se han cargado → la demo usa ejemplos → el cálculo de ingredientes no se muestra con datos reales | 3×2 \= 6 bajo | Oscar | Aceptar: cargarlas antes del 17 nov | 16 nov sin recetas | Mostrar los ejemplos marcados como prueba | 1×2 |

| Ya ocurrieron (issues) | Qué se hizo |
| :---- | :---- |
| I-1. El Sprint 3 se sobrecargó (era el riesgo R3): 56 % de cumplimiento | 7 tarjetas pasaron al Sprint 4 como deuda técnica y se cerraron allí. |
| I-2. Defecto crítico abierto: un mesero marcado "no puede" queda bloqueado en días siguientes | Entra al Sprint 5 como DEF-02, con Javier (3 h). |
| I-3. Se acabó el plan gratuito de ClickUp | Las horas se siguen registrando, ahora en los comentarios de cada tarjeta. |

*Cerrados: el backend de HU-14 a HU-20 sí estaba hecho (verificado el 19 y 20 de octubre; era R1) y los entornos de pruebas y producción ya están separados. Los riesgos R2 (desbalance), R4 (Sprint 5 sin integración), R5 y R8 (evento real y usuario final), R6 (alcance nuevo), R7 (dependencia de personas), R9 (recetas) y R10 (QA) del registro anterior quedaron dentro de R-A a R-F.*

*Riesgo cerrado en la versión 2.3: el mobiliario del evento quedó relacionado con el inventario al corregir HU-12. En la sustentación se vio vacío por falta de datos de prueba, no por un defecto (COR-07).*

# **10\. Ceremonias y seguimiento**

Así se trabajó de verdad en los sprints 1 a 4, no como estaba previsto en el plan inicial.

| Ceremonia | Cómo se hizo | Propósito |
| :---- | :---- | :---- |
| Sprint Planning | Al inicio de cada sprint | Verificar criterios, estimar, repartir historias y asignar en ClickUp. |
| Reunión diaria | **No se hizo.** La disponibilidad del equipo (5 y 13 h semanales) no daba para una reunión diaria. | Se reemplazó por coordinación asíncrona: el tablero notifica cada cambio de estado, WhatsApp se usa para puntos clave y dudas, y el Product Owner revisa el avance en el tablero. |
| Sprint Review | Al cierre del sprint. La de la Entrega 1 fue la sustentación del 13 de octubre. | Mostrar lo terminado desde la interfaz. El PO acepta o devuelve cada historia. |
| Retrospectiva | Después de la Review | Qué mejorar. En la del Sprint 2: el balance de carga, la precisión de las estimaciones y volver a intentar las reuniones diarias. |

*Lo que funcionó de la coordinación asíncrona: nadie quedó sin saber qué estaba hecho, porque el tablero avisa. Lo que falló: el equipo no siempre supo si alguien estaba bloqueado, y el desbalance de carga del Sprint 2 se detectó al cerrarlo, no durante. Por eso el Scrum Master propone retomar las reuniones cortas en el Sprint 3\.*

*Sprints 3 y 4: se hicieron reuniones cortas de coordinación, pero no hubo Sprint Review ni retrospectiva formales. La aceptación se hizo tarjeta por tarjeta en el tablero.*

Flujo del tablero: POR HACER → EN PROGRESO → EN REVISIÓN → FINALIZADO. Los desarrolladores llegan hasta EN REVISIÓN y solo el Product Owner mueve una historia a FINALIZADO, después de probarla contra el checklist.

# **11\. Proceso técnico y despliegue**

| Aspecto | Cómo está |
| :---- | :---- |
| Aplicación | Frontend en React y backend en Node.js con Express, sobre PostgreSQL (RNF-01). |
| Despliegue | Frontend y backend publicados en Vercel; la base de datos en Supabase. La aplicación está en línea y se puede usar. |
| Entorno de pruebas | Los entornos de pruebas y de producción están separados. Además, cada desarrollador ejecuta el backend y la base de datos en local. |
| Ramas | Dos: main y develop. Todo cambio entra a develop; cuando está probado por el desarrollador y por el QA, se despliega. |
| Responsable del despliegue | Javier. |
| Control de acceso | Usuario y contraseña creados en la base de datos, sin módulo de registro (RNF-05). |
| Pruebas | Manuales, repartidas por rol: cada desarrollador prueba lo suyo y el Product Owner prueba cada historia contra su checklist antes de aprobarla. |
| Avance del repositorio | 156 commits al 12 de noviembre de 2026\. |

*No hay pruebas automatizadas. Con un equipo de dos desarrolladores y 18 h semanales se optó por pruebas manuales por rol más la prueba de aceptación del Product Owner, que devolvió una historia (HU-12) en el Sprint 2 y 8 tarjetas en los sprints 3 y 4\.*

# **12\. Interesados y responsabilidades**

Mapa de poder × impacto de la sesión 9\. El sistema solo lo usa quien gestiona el evento, y nadie fuera del equipo lo ha visto.

| Grupo | Poder | Impacto | Tratamiento |
| :---- | :---- | :---- | :---- |
| Equipo SIGEV: Oscar, Javier y Jhon | Alto | Alto | Deciden y responden por el resultado |
| Profesor Germán Alberto Yusti Tijo | Alto | Bajo | Informado en cada entrega; aprueba la evaluación |
| Mercedes Erazo, encargada de logística de Martin Eventos (usuaria) | Medio | Alto | Hoy no participa: riesgo R-D |
| Meseros y cocineros (afectados) | Bajo | Alto | No usan el sistema, pero su número sale del cálculo |
| Proveedores: Vercel, Supabase y ClickUp | Medio | Bajo | Dependencia; ClickUp ya limitó el plan gratuito |

Matriz RACI (R ejecuta · A responde · C consultado · I informado):

| Actividad | Oscar | Javier | Jhon | Profesor |
| :---- | :---- | :---- | :---- | :---- |
| Priorizar el backlog y aceptar alcance nuevo | A/R | C | C | I |
| Estimar historias | A/R | C | C | — |
| Desarrollar una historia | I | A/R \* | A/R \* | — |
| Probar y aprobar (QA) | A/R | C | C | — |
| Desplegar y mantener los entornos | I | A/R | C | — |
| Gestionar riesgos y escalar | A | R | C | I |
| Validar con el evento real | A/R | R | C | I |
| Presentar las entregas | A/R | C | R | I |

*\* Quien tiene asignada la historia la ejecuta y responde por ella.*

# **13\. Indicadores de control**

Indicadores de la sesión 10, con corte al 9 de noviembre (fin del Sprint 4). Las fechas de cada tarjeta salen de su historial en ClickUp (documento 10).

| Indicador | Fórmula | Resultado |
| :---- | :---- | :---- |
| Aceptación | Historias aprobadas ÷ historias del backlog | 34 ÷ 43 \= 79 % |
| Cumplimiento del Sprint 3 | Aprobadas antes del cierre ÷ comprometidas | 14 ÷ 25 \= 56 % |
| Cumplimiento del Sprint 4 | Aprobadas antes del cierre ÷ comprometidas | 5 ÷ 8 \= 62,5 % |
| Throughput | Historias aceptadas dentro de la ventana del sprint | Sprint 3: 7 · Sprint 4: 10 |
| Cycle time | FINALIZADO − EN PROGRESO (33 tarjetas) | Mediana 3 días · media 5,9 días |
| Espera en QA | FINALIZADO − EN REVISIÓN | Mediana 2 días |
| Devoluciones | Veces que QA regresó una tarjeta | 8 (7 en el Sprint 3\) |
| Defectos | Hallazgos de QA por gravedad | 10: 3 críticos, 4 altos, 2 medios, 1 bajo; 9 corregidos |
| Valor ganado (horas de desarrollo) | BAC · PV · EV · AC | 222 · 157 · 144 · 86,5 h |
| SPI | EV ÷ PV | 0,92: un poco detrás del plan |
| CPI | EV ÷ AC | 1,66: no es eficiencia; se estimó alto lo construido sobre código existente |

*HU-17 a HU-20 y RF-49 no tienen registrado el paso a EN PROGRESO; se tomó el primer trabajo registrado. La tarjeta de integración de la Entrega 1 (8 h estimadas) no entra al valor ganado porque ese trabajo quedó dentro de otras tarjetas.*

# **14\. Pronóstico al MVP**

Quedan 83 h estimadas (74 h del plan más las 9 h de HU-50, HU-51 y DEF-02). Pronóstico \= trabajo restante × proporción real ÷ ritmo observado (14,5 h registradas por semana en el Sprint 4). **Las fechas del plan no cambian.**

| Escenario | Supuesto | Resultado |
| :---- | :---- | :---- |
| Favorable | Lo pendiente cuesta el 34 % de lo estimado, como en el Sprint 3 (unas 28 h) | Termina dentro del Sprint 5 |
| Base | Cuesta el 57 %, el promedio real del proyecto (unas 47 h) | Termina en el Sprint 6; el Sprint 7 queda para la validación |
| Adverso | Cuesta el 100 % (83 h) | No alcanza al 15 de diciembre: se recorta lo de prioridad media (calendario y servicios opcionales); el balance no se toca |

[image1]: <data:image/png;base64,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>
