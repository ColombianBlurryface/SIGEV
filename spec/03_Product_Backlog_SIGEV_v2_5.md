![][image1]

**PRODUCT BACKLOG**

**INTRODUCCIÓN A LA GESTIÓN DE PROYECTOS DE SOFTWARE**

Sistema SIGEV — Versión 2.5

***Oscar Eduardo Jimenez Morales \- 2264419***

***Javier Rubiales Ramos \- 24259462***

***Jhoon Suarez \- 202357574***

**DOCENTE**

**YUSTI TIJO GERMAN ALBERTO**

**Universidad del Valle**

**Tecnología en Desarrollo de Software**

**Tuluá, Valle del Cauca**

**20 de octubre de 2026**

# **Control de versiones**

| Versión | Fecha | Cambios |
| :---- | :---- | :---- |
| 1.0 | Sep 2026 | Versión inicial: 38 historias ordenadas y estimadas. |
| 2.0 | 20 sep 2026 | HU-05 incorporada, resumen corregido (39 historias) y estimación separada en backend y frontend. |
| 2.1 | 30 sep 2026 | Se agregan responsable, estado real, horas registradas y horas de QA. HU-25 pasa al Sprint 4\. Las columnas de backend y frontend se mantienen como referencia de estimación, aunque ahora una sola persona hace ambas partes. |
| 2.2 | 9 oct 2026 | HU-43 incorporada y terminada: el backlog pasa de 39 a 40 historias. Estado y horas reales de todo el Sprint 2 y de la semana de integración 1\. |
| 2.3 | 9 oct 2026 | El orden general de trabajo precisa el paso 9: la validación final se hace con los datos de un evento real ya ejecutado. |
| 2.4 | 14 oct 2026 | Retroalimentación de la sustentación de la Entrega 1 (13 oct): hallazgos del profesor y del equipo. El backlog pasa de 40 a 45 historias (HU-44 a HU-48, todas en el Sprint 3\) y se agregan nueve correcciones (COR-01 a COR-09). La definición de terminado suma dos criterios: probar casos límite y tener datos de prueba en el entorno de la demo. |
| 2.5 | 20 oct 2026 | Decisión del equipo del 20 de octubre: el cliente siempre elige qué comer, así que se elimina el tipo de servicio de comida (almuerzo, cena, buffet) como dato del evento y el personal de cocina se calcula con una sola regla general, ⌈asistentes ÷ 25⌉ × 2, que queda en el promedio de las tres reglas anteriores. RN-02 se conserva: más de 300 asistentes se atienden tipo buffet, y el sistema lo indica sin cambiar cálculos. El backlog pasa de 45 a 43 historias: HU-23 y HU-24 se eliminan y HU-22 queda como Calcular personal de cocina. |

**Índice**

[**Control de versiones	2**](#heading=)

[**1\. Criterio de prioridad	3**](#heading=)

[**2\. Product Backlog	3**](#heading=)

[**3\. Resumen del Product Backlog	4**](#heading=)

[3.1. Por sprint y responsable	4](#heading=)

[3.2. Correcciones del Sprint 3	5](#heading=)

[3.3. Por prioridad	5](#heading=)

[3.4. Por área	5](#heading=)

[**4\. Estado del proyecto al 14 de octubre de 2026	6**](#heading=)

[**5\. Elementos que no son historias del backlog	6**](#heading=)

[**6\. Criterio para considerar una historia terminada	6**](#heading=)

# **1\. Criterio de prioridad**

* **Alta:** funcionalidad necesaria para el funcionamiento principal del MVP.

* **Media:** funcionalidad importante, pero no central para el funcionamiento básico.

# **2\. Product Backlog**

*Las horas estimadas son preliminares y se recalibran en cada Sprint Planning. Las historias HU-44 a HU-48 y las correcciones COR-01 a COR-09 se estimaron el 14 de octubre de 2026 y el equipo aprobó las horas. El 20 de octubre se eliminaron HU-23 y HU-24 (6 h) y HU-22 conservó sus 3 h con la regla general de cocina.*

| \# | ID | Historia de usuario | Prior. | Sprint | Desarrolla | Back (h) | Front (h) | QA (h) | Reales | Estado |
| :---- | :---- | :---- | :---- | ----- | :---- | ----- | ----- | ----- | ----- | :---- |
| 1 | **HU-01** | Registrar evento | Alta | 1 | Jhon | 3 | 2 | 1.5 | 2:00 | Finalizada; con corrección en el Sprint 3 (COR-01, COR-02 y RF-49) |
| 2 | **HU-02** | Registrar requerimientos de alimentos | Alta | 1 | Jhon | 4 | 2 | 1.5 | 1:30 | Finalizada (aprobada por el PO) |
| 3 | **HU-03** | Registrar bebidas del evento | Alta | 1 | Jhon | 3 | 1 | 1 | 2:12 | Finalizada; con corrección en el Sprint 3 (COR-03) |
| 4 | **HU-04** | Registrar mobiliario requerido | Alta | 1 | Jhon | 2 | 1 | 1 | 2:30 | Finalizada (aprobada por el PO) |
| 5 | **HU-05** | Registrar servicios adicionales | Media | 1 | Jhon | — | 1 | 0.5 | 1:00 | Finalizada; con corrección en el Sprint 3 (COR-06) |
| 6 | **HU-07** | Validar cantidad de asistentes | Alta | 1 | Jhon | 1 | 0 | 0.5 | 1:30 | Finalizada (aprobada por el PO) |
| 7 | **HU-06** | Consultar eventos | Alta | 1 | Jhon | 3 | 1 | 1 | 2:48 | Finalizada (aprobada por el PO) |
| 8 | **HU-08** | Registrar elementos de inventario | Alta | 2 | Jhon | 4 | 2 | 1.5 | 3:00 | Finalizada; con corrección en el Sprint 3 (COR-04) |
| 9 | **HU-09** | Clasificar inventario | Alta | 2 | Jhon | 2 | 0 | 0.5 | 0:15 | Finalizada; con corrección en el Sprint 3 (COR-05) |
| 10 | **HU-11** | Registrar nuevas adquisiciones | Media | 2 | Javier | 2 | 1 | 1 | 2:00 | Finalizada; con corrección en el Sprint 3 (COR-04) |
| 11 | **HU-12** | Diferenciar elementos propios y alquilados | Alta | 2 | Javier | 3 | 1 | 1 | 3:30 | Finalizada; con corrección en el Sprint 3 (COR-08) |
| 12 | **HU-10** | Retirar elementos del inventario | Media | 2 | Jhon | 2 | 1 | 1 | 2:00 | Finalizada; con corrección en el Sprint 3 (COR-09) |
| 13 | **HU-13** | Separar bebidas de coctelería y bebidas generales | Alta | 2 | Javier | 3 | 1 | 1 | 3:15 | Finalizada (aprobada por el PO) |
| 14 | **HU-14** | Registrar valores de alimentos y bebidas | Alta | 3 | Jhon | 3 | 1 | 1 | — | Por hacer |
| 15 | **HU-15** | Calcular alimentos por persona | Alta | 3 | Jhon | 5 | 1 | 1.5 | — | Por hacer |
| 16 | **HU-16** | Calcular bebidas individuales | Alta | 3 | Jhon | 4 | 0 | 1 | — | Por hacer |
| 17 | **HU-17** | Calcular bebidas por botella | Alta | 3 | Jhon | 5 | 0 | 1.5 | — | Por hacer |
| 18 | **HU-18** | Aplicar margen de pérdida | Alta | 3 | Jhon | 2 | 0 | 0.5 | — | Por hacer |
| 19 | **HU-19** | Redondear cantidades | Alta | 3 | Jhon | 1 | 0 | 0.5 | — | Por hacer |
| 20 | **HU-20** | Calcular valor estimado | Alta | 3 | Jhon | 3 | 1 | 1 | — | Por hacer |
| 21 | **HU-21** | Calcular meseros | Alta | 3 | Javier | 3 | 1 | 1 | — | Por hacer |
| 22 | **HU-22** | Calcular personal de cocina | Alta | 3 | Javier | 3 | 0 | 1 | — | Por hacer |
| 23 | **HU-44** | Registrar recetas de cóctel | Alta | 3 | Jhon | 2 | 1 | 1 | — | Por hacer |
| 24 | **HU-45** | Calcular el licor por cóctel | Alta | 3 | Jhon | 4 | 1 | 1.5 | — | Por hacer |
| 25 | **HU-46** | Registrar recetas de platos | Alta | 3 | Jhon | 2 | 2 | 1 | — | Por hacer |
| 26 | **HU-47** | Calcular los ingredientes a comprar | Alta | 3 | Jhon | 5 | 1 | 1.5 | — | Por hacer |
| 27 | **HU-48** | Sumar el costo de los servicios al evento | Alta | 3 | Jhon | 2 | 1 | 1 | — | Por hacer |
| 28 | **HU-25** | Alertar desviaciones de personal | Alta | 4 | Jhon | 3 | 2 | 1.5 | — | Por hacer |
| 29 | **HU-26** | Registrar meseros | Alta | 4 | Jhon | 3 | 1 | 1 | — | Por hacer |
| 30 | **HU-27** | Eliminar meseros | Media | 4 | Javier | 1 | 0 | 0.5 | — | Por hacer |
| 31 | **HU-28** | Asignar meseros a un evento | Alta | 4 | Jhon | 4 | 2 | 1.5 | — | Por hacer |
| 32 | **HU-29** | Gestionar estado de asignación | Alta | 4 | Javier | 3 | 1 | 1 | — | Por hacer |
| 33 | **HU-30** | Consultar lista de meseros programados | Alta | 4 | Javier | 3 | 1 | 1 | — | Por hacer |
| 34 | **HU-31** | Generar balance logístico | Alta | 5 | Jhon | 6 | 2 | 1.5 | — | Por hacer |
| 35 | **HU-32** | Consultar estado de los recursos | Alta | 5 | Jhon | 3 | 1 | 1 | — | Por hacer |
| 36 | **HU-33** | Establecer fechas límite | Alta | 5 | Javier | 3 | 1 | 1 | — | Por hacer |
| 37 | **HU-34** | Actualizar estado de un recurso | Alta | 5 | Javier | 2 | 1 | 1 | — | Por hacer |
| 38 | **HU-35** | Visualizar anticipadamente los faltantes | Alta | 5 | Jhon | 3 | 1 | 1 | — | Por hacer |
| 39 | **HU-36** | Consultar eventos en calendario | Media | 6 | Jhon | 4 | 3 | 1.5 | — | Por hacer |
| 40 | **HU-37** | Consultar información del evento desde el calendario | Media | 6 | Javier | 3 | 2 | 1.5 | — | Por hacer |
| 41 | **HU-38** | Registrar servicios opcionales | Media | 6 | Javier | 2 | 1 | 1 | — | Por hacer |
| 42 | **HU-39** | Gestionar servicios sin cálculo automático | Media | 6 | Javier | 1 | 0 | 0.5 | — | Por hacer |
| 43 | **HU-43** | Administrar el catálogo de bebidas y alimentos | Media | Int. 1 | Javier | 4 | 1 | 1.5 | 0:40 | Finalizada; con corrección en el Sprint 3 (COR-03) |
|  |  | **Total** |  |  |  | **124** | **44** | **46** |  |  |

# **3\. Resumen del Product Backlog**

## **3.1. Por sprint y responsable**

| Sprint | Historias | Jhon | Javier | QA Oscar |
| :---- | :---- | :---- | :---- | :---- |
| Sprint 1 | 7 | HU-01, HU-02, HU-03, HU-04, HU-05, HU-06, HU-07 (24 h) | — (0 h) | 7 h |
| Sprint 2 | 6 | HU-08, HU-09, HU-10 (11 h) | HU-11, HU-12, HU-13 (11 h) | 6 h |
| Sprint 3 | 14 | HU-14, HU-15, HU-16, HU-17, HU-18, HU-19, HU-20, HU-44, HU-45, HU-46, HU-47, HU-48 (47 h) | HU-21, HU-22 (7 h) | 15 h |
| Sprint 4 | 6 | HU-25, HU-26, HU-28 (15 h) | HU-27, HU-29, HU-30 (9 h) | 6.5 h |
| Sprint 5 | 5 | HU-31, HU-32, HU-35 (16 h) | HU-33, HU-34 (7 h) | 5.5 h |
| Sprint 6 | 4 | HU-36 (7 h) | HU-37, HU-38, HU-39 (9 h) | 4.5 h |

A las horas de QA por historia se suman 2 h de QA de cierre en cada sprint. Las horas de capacidad están en el Plan de Entregas y Sprints.

## **3.2. Correcciones del Sprint 3**

| ID | Corrección | Historia | Desarrolla | Horas | QA |
| :---- | :---- | :---- | :---- | :---- | :---- |
| COR-01 | Validar fecha y duración del evento | HU-01 | Jhon | 1,5 | 0,5 |
| COR-02 | Limitar a 3 eventos por fecha | HU-01 | Jhon | 2 | 0,5 |
| COR-03 | Bebidas individuales solo en unidades enteras | HU-03 y HU-43 | Jhon | 1 | 0,5 |
| COR-04 | Topes de cantidad en inventario y adquisiciones | HU-08 y HU-11 | Javier | 2 | 0,5 |
| COR-05 | Tipos de elemento por categoría | HU-09 | Javier | 4 | 1 |
| COR-06 | Validar cantidad y horas de los servicios | HU-05 | Jhon | 3 | 1 |
| COR-07 | Cargar datos de prueba en el entorno de la demo | HU-04 | Javier | 1 | 0,5 |
| COR-08 | Restringir el alquiler a mobiliario y vajilla | HU-12 | Javier | 2,5 | 0,5 |
| COR-09 | Renombrar "baja" por "retiro" | HU-10 | Javier | 0,5 | 0,5 |
|  | **Total** |  |  | **17,5** | **5,5** |

## **3.3. Por prioridad**

| Prioridad | Cantidad |
| :---- | :---- |
| Alta | 34 |
| Media | 9 |
| **Total** | **43** |

## **3.4. Por área**

| Área | Historias |
| :---- | :---- |
| Gestión de eventos | 7 |
| Gestión de inventario | 5 |
| Gestión y cálculo de alimentos y bebidas | 13 |
| Cálculo de personal | 3 |
| Gestión de meseros | 5 |
| Balance logístico | 5 |
| Calendario | 2 |
| Servicios opcionales | 3 |
| **Total** | **43** |

# **4\. Estado del proyecto al 14 de octubre de 2026**

| Estado | Historias | Cantidad |
| :---- | :---- | :---- |
| Finalizadas (aprobadas por el PO) | HU-01, HU-02, HU-03, HU-04, HU-05, HU-06, HU-07, HU-08, HU-09, HU-10, HU-11, HU-12, HU-13, HU-43 | 14 |
|    de las cuales tienen corrección en el Sprint 3 | HU-01, HU-03, HU-05, HU-08, HU-09, HU-10, HU-11, HU-12, HU-43 | 9 |
| En revisión (pendientes de QA) |  | 0 |
| En progreso |  | 0 |
| Por hacer | Las historias de los sprints 3 a 6 | 29 |

Horas registradas hasta el cierre de la semana de integración 1: **13 h 30 en el Sprint 1** (Jhon) y **22 h en el Sprint 2 y la integración** (Jhon 5 h 15, Javier 16 h 45, incluidas las 8 h de las interfaces de la Épica 1, las correcciones del QA y HU-43).

# **5\. Elementos que no son historias del backlog**

| ID | Elemento | Tratamiento |
| :---- | :---- | :---- |
| HU-40 | Aplicación web | RNF-01 |
| HU-41 | Gestión sencilla de meseros | RNF-03 / RF-38 |
| HU-42 | Operación sin integraciones externas complejas | RNF-04 |

# **6\. Criterio para considerar una historia terminada**

1. La funcionalidad está implementada.

2. Cumple los requerimientos asociados.

3. Se aplicaron las reglas de negocio correspondientes.

4. Fue probada por quien la desarrolló.

5. No presenta errores conocidos que impidan su funcionamiento.

6. El responsable de logística puede usarla desde la interfaz web del sistema (RNF-01), no solo desde la API.

7. Se probó con casos límite y datos inválidos, no solo con la ruta feliz: valores en el borde, fuera de rango, decimales y cantidades absurdas.

8. Tiene datos de prueba cargados en el entorno publicado, para que se pueda mostrar sin preparar nada.

9. El Product Owner la probó contra sus criterios de aceptación y la aprobó. Solo el Product Owner mueve una historia a Finalizada.

[image1]: <data:image/png;base64,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>