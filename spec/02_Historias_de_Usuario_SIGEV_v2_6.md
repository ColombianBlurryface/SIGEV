![][image1]

**HISTORIAS DE USUARIO**

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
| 1.0 | Sep 2026 | Versión inicial: 42 historias en 9 épicas. |
| 2.0 | 20 sep 2026 | 39 historias funcionales, restricciones separadas y criterios de aceptación. |
| 2.1 | 30 sep 2026 | Cada historia indica responsable, estado real y horas de QA. Se actualizan los criterios de HU-09, HU-11, HU-12, HU-13, HU-21 a HU-25, HU-38 y HU-39 con las decisiones P-01 a P-06. HU-25 pasa al Sprint 4\. |
| 2.2 | 9 oct 2026 | HU-43 nueva, ya terminada. Criterios de HU-03, HU-09 y HU-10 actualizados con los hallazgos del QA del Sprint 2\. Estado y responsable reales de las historias del Sprint 2\. |
| 2.3 | 9 oct 2026 | Sin cambios en las historias. Se alinea con RNF-05 (control de acceso) del documento de Requerimientos. |
| 2.4 | 14 oct 2026 | Retroalimentación de la sustentación de la Entrega 1 (13 oct): hallazgos del profesor y del equipo. Historias nuevas HU-44 a HU-48 (recetas de cóctel, recetas de platos y costo de servicios). Criterios nuevos en HU-01, HU-03, HU-05, HU-08 a HU-12, HU-16, HU-39 y HU-43. HU-10 pasa a llamarse Retirar elementos del inventario. |
| 2.5 | 20 oct 2026 | Decisión del equipo del 20 de octubre: el cliente siempre elige qué comer, así que se elimina el tipo de servicio de comida (almuerzo, cena, buffet) como dato del evento y el personal de cocina se calcula con una sola regla general, ⌈asistentes ÷ 25⌉ × 2, que queda en el promedio de las tres reglas anteriores. RN-02 se conserva: más de 300 asistentes se atienden tipo buffet, y el sistema lo indica sin cambiar cálculos. HU-22 pasa a llamarse Calcular personal de cocina, con la regla general. HU-23 y HU-24 se eliminan. HU-01 suma un criterio: indicar el servicio tipo buffet en eventos de más de 300 asistentes. |
| 2.6 | 12 nov 2026 | Hallazgos del QA del Sprint 4 (12 nov): nuevas HU-50 (editar eventos) y HU-51 (cambiar el estado del evento), en la épica 1 y el Sprint 5\. HU-29 suma un criterio por el defecto DEF-02 (RN-21). La duración máxima del evento pasa a 8 horas. Se actualiza el estado de las historias aceptadas en los sprints 3 y 4 y quién las desarrolló. Se agregan DEF-01 y DEF-02 a las correcciones. |

**Índice**

[**Control de versiones	2**](#heading=)

[**1\. Cómo leer este documento	3**](#heading=)

[**2\. Resumen de épicas	3**](#heading=)

[**Épica 1\. Gestión de eventos	3**](#heading=)

[HU-01 — Registrar evento	3](#heading=)

[HU-02 — Registrar requerimientos de alimentos	4](#heading=)

[HU-03 — Registrar bebidas del evento	4](#heading=)

[HU-04 — Registrar mobiliario requerido	4](#heading=)

[HU-05 — Registrar servicios adicionales	5](#heading=)

[HU-06 — Consultar eventos	5](#heading=)

[HU-07 — Validar cantidad de asistentes	5](#heading=)

[HU-50 — Editar eventos	6](#heading=)

[HU-51 — Cambiar el estado del evento	6](#heading=)

[**Épica 2\. Gestión de inventario	6**](#heading=)

[HU-08 — Registrar elementos de inventario	6](#heading=)

[HU-09 — Clasificar inventario	7](#heading=)

[HU-10 — Retirar elementos del inventario	7](#heading=)

[HU-11 — Registrar nuevas adquisiciones	7](#heading=)

[HU-12 — Diferenciar elementos propios y alquilados	7](#heading=)

[**Épica 3\. Gestión y cálculo de alimentos y bebidas	8**](#heading=)

[HU-13 — Separar bebidas de coctelería y bebidas generales	8](#heading=)

[HU-14 — Registrar valores de alimentos y bebidas	8](#heading=)

[HU-15 — Calcular alimentos por persona	8](#heading=)

[HU-16 — Calcular bebidas individuales	9](#heading=)

[HU-17 — Calcular bebidas por botella	9](#heading=)

[HU-18 — Aplicar margen de pérdida	9](#heading=)

[HU-19 — Redondear cantidades	9](#heading=)

[HU-20 — Calcular valor estimado	10](#heading=)

[HU-43 — Administrar el catálogo de bebidas y alimentos	10](#heading=)

[HU-44 — Registrar recetas de cóctel	10](#heading=)

[HU-45 — Calcular el licor por cóctel	11](#heading=)

[HU-46 — Registrar recetas de platos	11](#heading=)

[HU-47 — Calcular los ingredientes a comprar	11](#heading=)

[**Épica 4\. Cálculo de personal	12**](#heading=)

[HU-21 — Calcular meseros	12](#heading=)

[HU-22 — Calcular personal de cocina	12](#heading=)

[HU-25 — Alertar desviaciones de personal	12](#heading=)

[**Épica 5\. Gestión de meseros	13**](#heading=)

[HU-26 — Registrar meseros	13](#heading=)

[HU-27 — Eliminar meseros	13](#heading=)

[HU-28 — Asignar meseros a un evento	13](#heading=)

[HU-29 — Gestionar estado de asignación	13](#heading=)

[HU-30 — Consultar lista de meseros programados	14](#heading=)

[**Épica 6\. Balance logístico	14**](#heading=)

[HU-31 — Generar balance logístico	14](#heading=)

[HU-32 — Consultar estado de los recursos	14](#heading=)

[HU-33 — Establecer fechas límite	14](#heading=)

[HU-34 — Actualizar estado de un recurso	15](#heading=)

[HU-35 — Visualizar anticipadamente los faltantes	15](#heading=)

[**Épica 7\. Calendario	15**](#heading=)

[HU-36 — Consultar eventos en calendario	15](#heading=)

[HU-37 — Consultar información del evento desde el calendario	15](#heading=)

[**Épica 8\. Servicios opcionales	16**](#heading=)

[HU-38 — Registrar servicios opcionales	16](#heading=)

[HU-39 — Gestionar servicios sin cálculo automático	16](#heading=)

[HU-48 — Sumar el costo de los servicios al evento	16](#heading=)

[**Correcciones y defectos (no son historias nuevas)	16**](#heading=)

[**Historias eliminadas	17**](#heading=)

[**Restricciones del sistema (no son historias de usuario)	17**](#heading=)

# **1\. Cómo leer este documento**

Todas las historias tienen como usuario al **responsable de logística**. Cada historia indica prioridad, los requerimientos y reglas que cubre, el sprint, la persona que la desarrolla, su estado actual, las horas estimadas de QA y sus criterios de aceptación.

* **Una persona por historia:** desde el Sprint 2 cada historia la desarrolla una sola persona, que hace tanto el backend como la pantalla.

* **QA:** Oscar prueba cada historia contra su checklist antes de darla por finalizada. El tiempo estimado depende del tamaño: 1,5 h para historias de 5 h o más, 1 h para las de 3 a 4 h y 30 min para las de 2 h o menos.

* **Criterios aprobados:** los del Sprint 1\. **Criterios en borrador:** salen de los requerimientos y reglas aprobados y se validan en el Sprint Planning correspondiente.

# **2\. Resumen de épicas**

| Épica | Historias | Cantidad | Sprint |
| :---- | :---- | :---- | :---- |
| 1\. Gestión de eventos | HU-01 a HU-07, HU-50 y HU-51 | 9 | 1 y 5 |
| 2\. Gestión de inventario | HU-08 a HU-12 | 5 | 2 |
| 3\. Gestión y cálculo de alimentos y bebidas | HU-13 a HU-20, HU-43 a HU-47 | 13 | 2 y 3 y Int. 1 |
| 4\. Cálculo de personal | HU-21, HU-22 y HU-25 | 3 | 3 y 4 |
| 5\. Gestión de meseros | HU-26 a HU-30 | 5 | 4 (corrección en el 5\) |
| 6\. Balance logístico | HU-31 a HU-35 | 5 | 5 |
| 7\. Calendario | HU-36 a HU-37 | 2 | 6 |
| 8\. Servicios opcionales | HU-38, HU-39 y HU-48 | 3 | 3 y 6 |
| **Total** |  | **45** |  |

# **Épica 1\. Gestión de eventos**

## **HU-01 — Registrar evento**

**Como** responsable de logística, **quiero** registrar un nuevo evento con su información básica, **para** tener centralizados los datos necesarios para su planificación.

| Prioridad | Requerimientos | Sprint | Desarrolla | Estado | QA |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Alta | RF-01, RF-02, RF-49, RF-51, RN-02, RN-13, RN-14 | 1 | Jhon | Finalizada; con corrección en el Sprint 3 (COR-01, COR-02 y RF-49) | 1.5 h |

**Criterios de aceptación** (aprobados por el equipo (Sprint 1)):

* Se puede crear un nuevo evento y queda registrado como un registro único.

* Se registran fecha, tipo de evento, número de asistentes y duración.

* No se permite guardar si faltan datos obligatorios.

* Los demás requisitos (alimentos, bebidas, mobiliario, servicios) se asocian al evento correcto.

* El sistema confirma que el evento fue registrado.

* Nuevo en v2.4 (COR-01): la fecha del evento debe ser el día actual o posterior, al crear y al cambiar la fecha.

* Nuevo en v2.4 (COR-01): la duración debe estar entre 3 y 8 horas (desde la v2.6; antes era de 3 a 12).

* Nuevo en v2.4 (COR-02): no se permite registrar un cuarto evento en una fecha que ya tiene 3\.

* Nuevo en v2.5 (RF-49): un evento de más de 300 asistentes queda indicado como servicio tipo buffet. Es informativo: no se pide un tipo de comida y no cambia ningún cálculo.

## **HU-02 — Registrar requerimientos de alimentos**

**Como** responsable de logística, **quiero** registrar los alimentos requeridos para un evento, **para** definir los recursos de alimentación necesarios para su realización.

| Prioridad | Requerimientos | Sprint | Desarrolla | Estado | QA |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Alta | RF-03, RF-19, RF-20 | 1 | Jhon | Finalizada (aprobada por el PO) | 1.5 h |

**Criterios de aceptación** (aprobados por el equipo (Sprint 1)):

* Se pueden registrar uno o varios alimentos para un evento.

* Cada alimento maneja nombre, porción o cantidad por persona, unidad de medida y valor unitario.

* Cada componente del menú (carne, arroz, ensalada, acompañamientos, etc.) tiene su propia información.

* Los alimentos quedan asociados al evento y pueden consultarse dentro de él.

## **HU-03 — Registrar bebidas del evento**

**Como** responsable de logística, **quiero** registrar las bebidas generales requeridas para un evento, **para** determinar las cantidades necesarias según los asistentes y las características de cada bebida.

| Prioridad | Requerimientos | Sprint | Desarrolla | Estado | QA |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Alta | RF-04, RF-17, RF-18, RN-15 | 1 | Jhon | Finalizada; con corrección en el Sprint 3 (COR-03) | 1 h |

**Criterios de aceptación** (aprobados por el equipo (Sprint 1)):

* Se pueden registrar una o varias bebidas generales para un evento.

* Para bebidas individuales se registran las unidades por persona. El catálogo trae 2 por persona en Poker, Club Colombia, Águila, Águila Light, Costeña y Sol.

* Para bebidas compartidas se registran el volumen de la botella y el tamaño de la porción. El catálogo trae 750 ml y 125 ml en vinos y champaña.

* Se registra el valor unitario de cada bebida, que no viene precargado porque cambia con cada marca y proveedor.

* Las bebidas quedan asociadas al evento.

* Nuevo en v2.4 (COR-03): las unidades por persona de una bebida individual son un entero de 1 a 10; el sistema rechaza decimales como 1,4.

## **HU-04 — Registrar mobiliario requerido**

**Como** responsable de logística, **quiero** registrar el mobiliario necesario para un evento, **para** conocer los elementos que debo disponer o conseguir.

| Prioridad | Requerimientos | Sprint | Desarrolla | Estado | QA |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Alta | RF-05 | 1 | Jhon | Finalizada (aprobada por el PO) | 1 h |

**Criterios de aceptación** (aprobados por el equipo (Sprint 1)):

* Se pueden registrar uno o varios elementos de mobiliario para un evento.

* Se registra el tipo de elemento y la cantidad requerida.

* Los elementos quedan asociados al evento y pueden consultarse dentro de él.

## **HU-05 — Registrar servicios adicionales**

**Como** responsable de logística, **quiero** registrar servicios adicionales solicitados para el evento, **para** tener toda la información logística del evento centralizada.

| Prioridad | Requerimientos | Sprint | Desarrolla | Estado | QA |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Media | RF-06, RN-18 | 1 | Jhon | Finalizada; con corrección en el Sprint 3 (COR-06) | 0.5 h |

**Criterios de aceptación** (aprobados por el equipo (Sprint 1)):

* Se pueden registrar servicios adicionales asociados al evento.

* Los servicios pueden incluir DJ, música o entretenimiento.

* No se realiza cálculo automático de recursos para estos servicios.

* Nuevo en v2.4 (COR-06): cada servicio admite una cantidad de 1 a 5\.

* Nuevo en v2.4 (COR-06): las horas de un servicio no pueden superar la duración del evento.

## **HU-06 — Consultar eventos**

**Como** responsable de logística, **quiero** consultar los eventos registrados, **para** revisar la información y realizar su seguimiento.

| Prioridad | Requerimientos | Sprint | Desarrolla | Estado | QA |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Alta | RF-07 | 1 | Jhon | Finalizada (aprobada por el PO) | 1 h |

**Criterios de aceptación** (aprobados por el equipo (Sprint 1)):

* Se pueden consultar los eventos registrados.

* La consulta muestra la información básica de cada evento.

* Se puede seleccionar un evento y revisar sus requisitos registrados.

## **HU-07 — Validar cantidad de asistentes**

**Como** responsable de logística, **quiero** que el sistema valide la cantidad de asistentes registrada, **para** asegurar que el evento se encuentre dentro del rango soportado por SIGEV.

| Prioridad | Requerimientos | Sprint | Desarrolla | Estado | QA |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Alta | RF-08, RN-01 | 1 | Jhon | Finalizada (aprobada por el PO) | 0.5 h |

**Criterios de aceptación** (aprobados por el equipo (Sprint 1)):

* Se aceptan eventos de 40 a 600 asistentes.

* Se rechazan cantidades inferiores a 40 y superiores a 600\.

* El sistema informa el rango permitido cuando rechaza un valor.

## **HU-50 — Editar eventos**

**Como** responsable de logística, **quiero** editar todos los datos de un evento ya registrado, **para** corregir o actualizar el evento sin tener que borrarlo y crearlo de nuevo.

| Prioridad | Requerimientos | Sprint | Desarrolla | Estado | QA |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Media | RF-57, RN-01, RN-13, RN-14, RN-18 | 5 | Jhon | Por hacer | 1 h |

**Criterios de aceptación** (propuestos el 12 de noviembre de 2026; se validan con el PO al iniciar la historia):

* Se pueden modificar todos los datos que se registran al crear el evento.

* Al guardar se aplican las mismas validaciones del registro: 40 a 600 asistentes, fecha de hoy en adelante, duración de 3 a 8 horas y máximo 3 eventos por fecha (RN-01, RN-13, RN-14).

* Si cambia el número de asistentes, se recalculan alimentos, bebidas, cócteles, ingredientes y personal.

* Las horas de los servicios adicionales siguen sin poder superar la duración del evento (RN-18).

* Necesidad nueva encontrada en el QA del Sprint 4 (gravedad media).

## **HU-51 — Cambiar el estado del evento**

**Como** responsable de logística, **quiero** cambiar desde la pantalla el estado de un evento, **para** saber en qué punto está cada evento.

| Prioridad | Requerimientos | Sprint | Desarrolla | Estado | QA |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Alta | RF-58 | 5 | Jhon | Por hacer | 0.5 h |

**Criterios de aceptación** (propuestos el 12 de noviembre de 2026; se validan con el PO al iniciar la historia):

* El estado se elige entre Planificación, Confirmado, Realizado y Cancelado.

* El cambio se hace desde la interfaz, sin tocar la base de datos.

* El estado nuevo queda guardado y se ve al consultar el evento.

* Un evento Cancelado puede volver a Planificación.

* Un evento Realizado ya no puede cambiar a ningún otro estado.

* Necesidad nueva encontrada en el QA del Sprint 4 (gravedad alta).

# **Épica 2\. Gestión de inventario**

## **HU-08 — Registrar elementos de inventario**

**Como** responsable de logística, **quiero** registrar los elementos disponibles en el inventario, **para** conocer los recursos propios con los que cuenta la organización.

| Prioridad | Requerimientos | Sprint | Desarrolla | Estado | QA |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Alta | RF-09, RF-11, RN-16 | 2 | Jhon | Finalizada; con corrección en el Sprint 3 (COR-04) | 1.5 h |

**Criterios de aceptación** (borrador: se validan en el Sprint Planning correspondiente):

* Se puede registrar un elemento con nombre, categoría y cantidad disponible.

* Se puede actualizar la cantidad disponible de un elemento.

* Los elementos registrados se pueden consultar.

* Nuevo en v2.4 (COR-04): la cantidad no puede superar el máximo de su categoría: mobiliario 2.000, vajilla 6.000, bebidas 4.000.

## **HU-09 — Clasificar inventario**

**Como** responsable de logística, **quiero** organizar los elementos del inventario en las categorías establecidas, **para** facilitar su gestión y consulta.

| Prioridad | Requerimientos | Sprint | Desarrolla | Estado | QA |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Alta | RF-10 | 2 | Jhon | Finalizada; con corrección en el Sprint 3 (COR-05) | 0.5 h |

**Criterios de aceptación** (borrador: se validan en el Sprint Planning correspondiente):

* Cada elemento pertenece a una de cuatro categorías: Mobiliario, Bebidas Generales, Licores para Cócteles o Vajilla.

* No existe categoría de decoración.

* El inventario se puede consultar filtrado por categoría.

* Nuevo en v2.4 (COR-05): el elemento se elige de una lista de tipos de su categoría; una silla no se puede registrar como licor.

* Nuevo en v2.4 (COR-05): se pueden crear tipos nuevos, pero dentro de su categoría.

## **HU-10 — Retirar elementos del inventario**

**Como** responsable de logística, **quiero** retirar elementos dañados del inventario, **para** evitar que sean considerados como recursos disponibles.

| Prioridad | Requerimientos | Sprint | Desarrolla | Estado | QA |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Media | RF-12 | 2 | Jhon | Finalizada; con corrección en el Sprint 3 (COR-09) | 1 h |

**Criterios de aceptación** (borrador: se validan en el Sprint Planning correspondiente):

* Existe una sección de baja de elementos, separada de la edición del inventario.

* La persona selecciona el elemento y escribe solo la cantidad dañada; el sistema resta esa cantidad del total.

* No se permite dar de baja más unidades de las disponibles.

* Lo dado de baja deja de contarse como disponible para los eventos.

* Nuevo en v2.4 (COR-09): la sección se llama "Retiro de elementos" y el campo "Cantidad a retirar". Cubre daño, pérdida o devolución.

## **HU-11 — Registrar nuevas adquisiciones**

**Como** responsable de logística, **quiero** registrar nuevos elementos adquiridos para el inventario, **para** mantener actualizadas las cantidades disponibles.

| Prioridad | Requerimientos | Sprint | Desarrolla | Estado | QA |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Media | RF-13, RN-16 | 2 | Javier | Finalizada; con corrección en el Sprint 3 (COR-04) | 1 h |

**Criterios de aceptación** (borrador: se validan en el Sprint Planning correspondiente):

* Registrar una adquisición aumenta la cantidad disponible del elemento.

* Si el elemento no existe en el inventario, la adquisición puede crearlo (P-06).

* No se registran facturas, comprobantes ni costos de compra.

* Nuevo en v2.4 (COR-04): la cantidad total después de la adquisición no puede superar el máximo de su categoría.

## **HU-12 — Diferenciar elementos propios y alquilados**

**Como** responsable de logística, **quiero** diferenciar los elementos propios de los que deben ser alquilados, **para** identificar cuándo el inventario disponible no es suficiente para el evento.

| Prioridad | Requerimientos | Sprint | Desarrolla | Estado | QA |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Alta | RF-14, RN-03, RN-17 | 2 | Javier | Finalizada; con corrección en el Sprint 3 (COR-08) | 1 h |

**Criterios de aceptación** (borrador: se validan en el Sprint Planning correspondiente):

* Cada elemento indica si es propio o alquilado.

* El mobiliario requerido por un evento (HU-04) se relaciona con los elementos del inventario.

* El sistema indica la necesidad de alquiler cuando el evento supera los 200 asistentes (P-05, RN-03).

* Nuevo en v2.4 (COR-08): solo se pueden alquilar elementos de mobiliario y vajilla.

* Nuevo en v2.4 (COR-08): la cantidad a alquilar no puede superar lo requerido menos lo propio disponible.

# **Épica 3\. Gestión y cálculo de alimentos y bebidas**

## **HU-13 — Separar bebidas de coctelería y bebidas generales**

**Como** responsable de logística, **quiero** registrar de manera independiente las bebidas del bar de coctelería y las bebidas generales del evento, **para** manejar correctamente los diferentes tipos de bebidas requeridos.

| Prioridad | Requerimientos | Sprint | Desarrolla | Estado | QA |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Alta | RF-15, RF-16, RF-17, RN-08 | 2 | Javier | Finalizada (aprobada por el PO) | 1 h |

**Criterios de aceptación** (borrador: se validan en el Sprint Planning correspondiente):

* Cada bebida se registra como bar de coctelería (licores fuertes para cócteles) o como bebida general (por ejemplo cerveza, vino o champaña).

* Las dos clases de bebida se consultan y se manejan por separado.

* La categoría "Bebidas de Coctelería" del inventario ya existe: en el Sprint Planning se revisa qué parte de esta historia queda pendiente.

## **HU-14 — Registrar valores de alimentos y bebidas**

**Como** responsable de logística, **quiero** registrar el valor unitario de los alimentos y bebidas, **para** que el sistema pueda calcular el valor estimado de las cantidades requeridas.

| Prioridad | Requerimientos | Sprint | Desarrolla | Estado | QA |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Alta | RF-18, RF-20 | 3 | Jhon | Finalizada (aprobada por el PO) | 1 h |

**Criterios de aceptación** (borrador: se validan en el Sprint Planning correspondiente):

* Cada alimento y cada bebida tiene un valor unitario registrado.

* El valor unitario se usa en el cálculo del valor estimado (HU-20).

## **HU-15 — Calcular alimentos por persona**

**Como** responsable de logística, **quiero** definir la porción de cada alimento por persona y que el sistema calcule la cantidad total requerida, **para** conocer cuánto alimento necesito preparar o adquirir.

| Prioridad | Requerimientos | Sprint | Desarrolla | Estado | QA |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Alta | RF-20, RF-21, RN-10 | 3 | Jhon | Finalizada (aprobada por el PO) | 1.5 h |

**Criterios de aceptación** (borrador: se validan en el Sprint Planning correspondiente):

* Para cada alimento, cantidad total \= asistentes × porción por persona.

* Ejemplo de verificación: 100 asistentes × 200 g \= 20 kg (antes del margen).

## **HU-16 — Calcular bebidas individuales**

**Como** responsable de logística, **quiero** calcular las bebidas de consumo individual según las unidades requeridas por persona, **para** conocer la cantidad total de unidades necesarias para el evento.

| Prioridad | Requerimientos | Sprint | Desarrolla | Estado | QA |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Alta | RF-22, RN-10, RN-15 | 3 | Jhon | Finalizada (aprobada por el PO) | 1 h |

**Criterios de aceptación** (borrador: se validan en el Sprint Planning correspondiente):

* Cantidad total \= asistentes × unidades por persona.

* Ejemplo de verificación: 200 asistentes × 1 unidad \= 200 unidades (antes del margen).

* Las unidades por persona son un entero de 1 a 10 (RN-15).

## **HU-17 — Calcular bebidas por botella**

**Como** responsable de logística, **quiero** calcular las bebidas compartidas utilizando el volumen de la botella y el tamaño de la porción, **para** determinar cuántas botellas necesito para cubrir el consumo del evento.

| Prioridad | Requerimientos | Sprint | Desarrolla | Estado | QA |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Alta | RF-23, RF-24, RN-10 | 3 | Jhon | Finalizada (aprobada por el PO) | 1.5 h |

**Criterios de aceptación** (borrador: se validan en el Sprint Planning correspondiente):

* Porciones por botella \= volumen de la botella ÷ tamaño de la porción.

* Botellas \= asistentes ÷ porciones por botella.

* Ejemplo de verificación: 1.000 ml ÷ 100 ml \= 10 porciones; 200 ÷ 10 \= 20 botellas (antes del margen).

## **HU-18 — Aplicar margen de pérdida**

**Como** responsable de logística, **quiero** que el sistema aplique automáticamente un margen del 10 % a las cantidades calculadas de alimentos y bebidas, **para** contemplar desperdicios, derrames, porciones adicionales y variaciones en el consumo.

| Prioridad | Requerimientos | Sprint | Desarrolla | Estado | QA |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Alta | RF-25, RN-09 | 3 | Jhon | Finalizada (aprobada por el PO) | 0.5 h |

**Criterios de aceptación** (borrador: se validan en el Sprint Planning correspondiente):

* El 10 % se aplica a todas las cantidades calculadas de alimentos y bebidas.

* Ejemplos de verificación: 200 → 220 unidades; 20 → 22 botellas; 20 kg → 22 kg.

## **HU-19 — Redondear cantidades**

**Como** responsable de logística, **quiero** que las cantidades que requieran unidades completas sean redondeadas hacia arriba, **para** evitar resultados que no puedan ser adquiridos físicamente.

| Prioridad | Requerimientos | Sprint | Desarrolla | Estado | QA |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Alta | RF-26, RN-11 | 3 | Jhon | Finalizada (aprobada por el PO) | 0.5 h |

**Criterios de aceptación** (borrador: se validan en el Sprint Planning correspondiente):

* Las cantidades en unidades completas (botellas, unidades individuales) se redondean hacia arriba.

* El redondeo se aplica sobre la cantidad final, con el margen del 10 % incluido.

## **HU-20 — Calcular valor estimado**

**Como** responsable de logística, **quiero** que el sistema calcule el valor total estimado de los alimentos y bebidas, **para** conocer el valor asociado a los recursos requeridos.

| Prioridad | Requerimientos | Sprint | Desarrolla | Estado | QA |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Alta | RF-27 | 3 | Jhon | Finalizada (aprobada por el PO) | 1 h |

**Criterios de aceptación** (borrador: se validan en el Sprint Planning correspondiente):

* Valor de cada elemento \= cantidad final × valor unitario.

* El valor total del evento es la suma de los valores de alimentos y bebidas.

* El valor estimado se puede consultar dentro del evento.

## **HU-43 — Administrar el catálogo de bebidas y alimentos**

**Como** responsable de logística, **quiero** agregar y editar las bebidas y alimentos del catálogo, con su precio, **para** no depender del equipo de desarrollo cuando cambie un producto, una presentación o un costo.

| Prioridad | Requerimientos | Sprint | Desarrolla | Estado | QA |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Media | RF-50, RN-15 | Int. 1 | Javier | Finalizada; con corrección en el Sprint 3 (COR-03) | 1.5 h |

**Criterios de aceptación** (aprobados por el Product Owner (QA del 9 de octubre de 2026)):

* Se puede agregar un producto al catálogo con nombre, tipo (alimento o bebida), parámetros de cálculo y valor unitario.

* El valor unitario es obligatorio al crear o editar un producto, porque de él sale el valor estimado del evento.

* Se puede editar el valor unitario y los parámetros de un producto existente.

* Los eventos ya registrados conservan los valores con los que fueron calculados.

* El catálogo se puede consultar desde la aplicación.

* Nuevo en v2.4 (COR-03): en el catálogo, las unidades por persona de una bebida individual son un entero de 1 a 10\.

## **HU-44 — Registrar recetas de cóctel**

**Como** responsable de logística, **quiero** registrar los cócteles con su receta, es decir, qué licor lleva cada uno y cuántos mililitros, **para** que el bartender tenga claro cuánto licor necesita cada cóctel.

| Prioridad | Requerimientos | Sprint | Desarrolla | Estado | QA |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Alta | RF-52 | 3 | Jhon | Finalizada en el Sprint 4 (aprobada por el PO) | 1 h |

**Criterios de aceptación** (propuestos el 14 de octubre de 2026; se validan con el PO al iniciar la historia):

* Se puede crear un cóctel con su nombre y uno o más licores, cada uno con sus mililitros por cóctel.

* El licor se elige de los licores para cócteles del catálogo.

* Los mililitros son un número mayor que 0\.

* Se puede editar la receta de un cóctel.

* El sistema trae tres cócteles de ejemplo marcados como datos de prueba: Gin Tonic, Whisky Sour y Mojito.

## **HU-45 — Calcular el licor por cóctel**

**Como** responsable de logística, **quiero** elegir los cócteles del evento, indicar cuántos por persona y que el sistema calcule las botellas de cada licor, **para** comprar el licor que realmente se necesita y no hacerlo a ojo.

| Prioridad | Requerimientos | Sprint | Desarrolla | Estado | QA |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Alta | RF-53, RN-09, RN-15, RN-19 | 3 | Jhon | Finalizada en el Sprint 4 (aprobada por el PO) | 1.5 h |

**Criterios de aceptación** (propuestos el 14 de octubre de 2026; se validan con el PO al iniciar la historia):

* Para cada cóctel elegido se indica cuántos por persona, en enteros de 1 a 10\.

* Botellas \= (asistentes × cócteles por persona × ml por cóctel × 1,10) ÷ volumen de la botella, redondeado hacia arriba.

* Si varios cócteles usan el mismo licor, el sistema muestra un solo total de botellas para ese licor.

* Ejemplo: 100 asistentes, 2 Gin Tonic por persona, 50 ml de ginebra, botella de 750 ml → 14,67 → 15 botellas.

* Si cambia el número de asistentes, el cálculo se actualiza.

## **HU-46 — Registrar recetas de platos**

**Como** responsable de logística, **quiero** registrar los ingredientes de cada plato con su cantidad por porción y su unidad, **para** saber qué hay que comprar para preparar cada plato.

| Prioridad | Requerimientos | Sprint | Desarrolla | Estado | QA |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Alta | RF-54 | 3 | Javier | Finalizada en el Sprint 4 (aprobada por el PO) | 1 h |

**Criterios de aceptación** (propuestos el 14 de octubre de 2026; se validan con el PO al iniciar la historia):

* Un plato tiene uno o más ingredientes, cada uno con su cantidad por porción y su unidad: gramos, kilos, libras o arrobas.

* Cada ingrediente tiene una unidad de compra: kilo, libra o arroba.

* La cantidad por porción es un número mayor que 0\.

* Se puede editar la receta de un plato.

* El sistema trae tres platos de ejemplo marcados como datos de prueba: Arroz verde con almendras, Pechuga a la plancha y Papa salada.

## **HU-47 — Calcular los ingredientes a comprar**

**Como** responsable de logística, **quiero** ver cuánto de cada ingrediente hay que comprar para los platos del evento, en la unidad en que se compra, **para** dejar de comprar a última hora por un cálculo mal hecho.

| Prioridad | Requerimientos | Sprint | Desarrolla | Estado | QA |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Alta | RF-55, RN-09, RN-20 | 3 | Javier | Finalizada en el Sprint 4 (aprobada por el PO) | 1.5 h |

**Criterios de aceptación** (propuestos el 14 de octubre de 2026; se validan con el PO al iniciar la historia):

* Cantidad \= asistentes × cantidad por porción × 1,10, convertida a la unidad de compra y redondeada hacia arriba.

* Equivalencias: 1 kg \= 1.000 g; 1 libra \= 500 g; 1 arroba \= 12,5 kg.

* Si varios platos usan el mismo ingrediente, el sistema muestra un solo total.

* Ejemplo: 40 asistentes, 150 g de papa por porción → 6.600 g \= 6,6 kg → 1 arroba.

* Si cambia el número de asistentes, el cálculo se actualiza.

# **Épica 4\. Cálculo de personal**

## **HU-21 — Calcular meseros**

**Como** responsable de logística, **quiero** que el sistema calcule automáticamente la cantidad de meseros requerida según los asistentes, **para** conocer la cantidad de personal necesaria para atender el evento.

| Prioridad | Requerimientos | Sprint | Desarrolla | Estado | QA |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Alta | RF-28, RN-04 | 3 | Javier | Finalizada (aprobada por el PO) | 1 h |

**Criterios de aceptación** (borrador: se validan en el Sprint Planning correspondiente):

* El sistema calcula 1 mesero por cada 20 asistentes.

* El resultado se redondea hacia arriba (RN-12). Ejemplo: 45 asistentes → 3 meseros.

* El resultado se muestra dentro del evento.

## **HU-22 — Calcular personal de cocina**

**Como** responsable de logística, **quiero** que el sistema calcule automáticamente los cocineros necesarios para cualquier evento con una sola regla general, **para** contar con el personal de cocina suficiente sin depender de qué comida elija el cliente.

| Prioridad | Requerimientos | Sprint | Desarrolla | Estado | QA |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Alta | RF-29, RN-05, RN-12 | 3 | Javier | Finalizada (aprobada por el PO) | 1 h |

**Criterios de aceptación** (propuestos el 20 de octubre de 2026; se validan con el PO al iniciar la historia):

* Cocineros \= (asistentes ÷ 25, redondeado hacia arriba) × 2, igual para todos los eventos (RN-05).

* El cálculo no depende del tipo de evento ni de la comida que se sirva, y aplica también a los eventos buffet de más de 300 asistentes.

* Ejemplos de verificación: 40 asistentes → 4; 100 → 8; 200 → 16; 320 → 26; 600 → 48\.

* Casos límite: 50 asistentes → 4 y 51 → 6\.

* Si cambia el número de asistentes, el cálculo se actualiza.

## **HU-25 — Alertar desviaciones de personal**

**Como** responsable de logística, **quiero** que el sistema me indique cuando el personal asignado se desvíe del estándar establecido, **para** identificar oportunamente posibles insuficiencias de personal.

| Prioridad | Requerimientos | Sprint | Desarrolla | Estado | QA |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Alta | RF-32 | 4 | Jhon | Finalizada (aprobada por el PO) | 1.5 h |

**Criterios de aceptación** (borrador: se validan en el Sprint Planning correspondiente):

* El sistema compara el personal asignado con el estándar calculado.

* Si el personal asignado está por debajo o se desvía del estándar, se muestra una alerta con la diferencia.

* Se conecta con los meseros asignados al evento (HU-28), por eso se desarrolla en el Sprint 4\.

# **Épica 5\. Gestión de meseros**

## **HU-26 — Registrar meseros**

**Como** responsable de logística, **quiero** registrar meseros con su nombre y datos de contacto, **para** disponer de un listado de personal que pueda ser asignado a los eventos.

| Prioridad | Requerimientos | Sprint | Desarrolla | Estado | QA |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Alta | RF-33 | 4 | Javier | Finalizada (aprobada por el PO) | 1 h |

**Criterios de aceptación** (borrador: se validan en el Sprint Planning correspondiente):

* Se registra un mesero con nombre y datos de contacto.

* Los meseros registrados aparecen en un listado.

## **HU-27 — Eliminar meseros**

**Como** responsable de logística, **quiero** eliminar registros de meseros, **para** mantener actualizada la información del personal disponible.

| Prioridad | Requerimientos | Sprint | Desarrolla | Estado | QA |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Media | RF-34 | 4 | Javier | Finalizada (aprobada por el PO) | 0.5 h |

**Criterios de aceptación** (borrador: se validan en el Sprint Planning correspondiente):

* Se puede eliminar un mesero del listado.

* No existe opción para modificar los datos de un mesero (aclaración de RF-38).

## **HU-28 — Asignar meseros a un evento**

**Como** responsable de logística, **quiero** asignar meseros registrados a un evento específico, **para** organizar el personal encargado del servicio.

| Prioridad | Requerimientos | Sprint | Desarrolla | Estado | QA |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Alta | RF-35 | 4 | Javier | Finalizada (aprobada por el PO) | 1.5 h |

**Criterios de aceptación** (borrador: se validan en el Sprint Planning correspondiente):

* Se pueden asignar uno o varios meseros registrados a un evento.

* La cantidad de meseros asignados se compara con el estándar (HU-25).

## **HU-29 — Gestionar estado de asignación**

**Como** responsable de logística, **quiero** establecer si un mesero está confirmado, por confirmar o no puede asistir, **para** conocer el estado de disponibilidad del personal asignado.

| Prioridad | Requerimientos | Sprint | Desarrolla | Estado | QA |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Alta | RF-36, RN-21 | 4 | Javier | Finalizada; con corrección en el Sprint 5 (DEF-02) | 1 h |

**Criterios de aceptación** (borrador: se validan en el Sprint Planning correspondiente):

* Cada asignación tiene uno de tres estados: confirmado, por confirmar o no puede.

* El estado de una asignación se puede cambiar.

* Nuevo en v2.6 (DEF-02): el estado "no puede" deshabilita al mesero para todos los eventos de ese día; en los demás días sigue disponible (RN-21).

## **HU-30 — Consultar lista de meseros programados**

**Como** responsable de logística, **quiero** visualizar la lista de meseros programados para cada evento, **para** realizar el seguimiento del personal requerido.

| Prioridad | Requerimientos | Sprint | Desarrolla | Estado | QA |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Alta | RF-37 | 4 | Javier | Finalizada (aprobada por el PO) | 1 h |

**Criterios de aceptación** (borrador: se validan en el Sprint Planning correspondiente):

* Cada evento muestra una lista tipo checklist con los meseros asignados y su estado.

* No se guarda historial de asignaciones entre eventos (RF-38).

# **Épica 6\. Balance logístico**

## **HU-31 — Generar balance logístico**

**Como** responsable de logística, **quiero** que el sistema genere un balance de los recursos necesarios para el evento, **para** identificar qué recursos están disponibles y cuáles debo conseguir.

| Prioridad | Requerimientos | Sprint | Desarrolla | Estado | QA |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Alta | RF-39, RF-40 | 5 | Jhon | Por hacer | 1.5 h |

**Criterios de aceptación** (borrador: se validan en el Sprint Planning correspondiente):

* El balance se genera automáticamente a partir de la información del evento.

* Integra personal, alimentos, bebidas, mobiliario y demás recursos requeridos.

* Cada elemento muestra la cantidad requerida.

## **HU-32 — Consultar estado de los recursos**

**Como** responsable de logística, **quiero** visualizar el estado de cada recurso del balance, **para** conocer cuáles están disponibles, por comprar, por conseguir o pendientes.

| Prioridad | Requerimientos | Sprint | Desarrolla | Estado | QA |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Alta | RF-41 | 5 | Jhon | Por hacer | 1 h |

**Criterios de aceptación** (borrador: se validan en el Sprint Planning correspondiente):

* Cada elemento del balance tiene uno de cuatro estados: disponible, por comprar, por conseguir o pendiente.

* No existe un estado "comprado": lo adquirido y disponible pasa a "disponible".

## **HU-33 — Establecer fechas límite**

**Como** responsable de logística, **quiero** establecer una fecha límite para conseguir cada recurso pendiente, **para** organizar oportunamente las actividades de compra o contratación.

| Prioridad | Requerimientos | Sprint | Desarrolla | Estado | QA |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Alta | RF-42 | 5 | Javier | Por hacer | 1 h |

**Criterios de aceptación** (borrador: se validan en el Sprint Planning correspondiente):

* Se puede asignar una fecha límite a cada elemento pendiente del balance.

* La fecha límite se muestra junto al elemento.

## **HU-34 — Actualizar estado de un recurso**

**Como** responsable de logística, **quiero** actualizar manualmente el estado de un recurso cuando ya esté disponible, **para** mantener actualizado el balance logístico.

| Prioridad | Requerimientos | Sprint | Desarrolla | Estado | QA |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Alta | RF-43 | 5 | Javier | Por hacer | 1 h |

**Criterios de aceptación** (borrador: se validan en el Sprint Planning correspondiente):

* El responsable de logística puede cambiar manualmente el estado de un elemento a "disponible".

* No se registran facturas, comprobantes ni gastos.

## **HU-35 — Visualizar anticipadamente los faltantes**

**Como** responsable de logística, **quiero** visualizar con anticipación los recursos que hacen falta para un evento, **para** evitar compras o contrataciones de último momento.

| Prioridad | Requerimientos | Sprint | Desarrolla | Estado | QA |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Alta | RF-44 | 5 | Jhon | Por hacer | 1 h |

**Criterios de aceptación** (borrador: se validan en el Sprint Planning correspondiente):

* Se muestra la lista de elementos que aún no están disponibles, con su estado y fecha límite.

* La lista se puede consultar en cualquier momento antes del evento.

# **Épica 7\. Calendario**

## **HU-36 — Consultar eventos en calendario**

**Como** responsable de logística, **quiero** visualizar los eventos programados en un calendario, **para** organizar y hacer seguimiento a los eventos según su fecha.

| Prioridad | Requerimientos | Sprint | Desarrolla | Estado | QA |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Media | RF-45 | 6 | Jhon | Por hacer | 1.5 h |

**Criterios de aceptación** (borrador: se validan en el Sprint Planning correspondiente):

* Los eventos registrados aparecen en una vista de calendario según su fecha.

## **HU-37 — Consultar información del evento desde el calendario**

**Como** responsable de logística, **quiero** visualizar desde el calendario información relevante del evento, **para** conocer rápidamente su tipo, cantidad de asistentes y estado del balance logístico.

| Prioridad | Requerimientos | Sprint | Desarrolla | Estado | QA |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Media | RF-46 | 6 | Javier | Por hacer | 1.5 h |

**Criterios de aceptación** (borrador: se validan en el Sprint Planning correspondiente):

* Al seleccionar un evento en el calendario se muestran su tipo, su cantidad de asistentes y el estado de su balance logístico.

# **Épica 8\. Servicios opcionales**

## **HU-38 — Registrar servicios opcionales**

**Como** responsable de logística, **quiero** registrar servicios como DJ, música o entretenimiento, **para** mantener dentro del sistema la información complementaria del evento.

| Prioridad | Requerimientos | Sprint | Desarrolla | Estado | QA |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Media | RF-47 | 6 | Javier | Por hacer | 1 h |

**Criterios de aceptación** (borrador: se validan en el Sprint Planning correspondiente):

* Verificación: los servicios (DJ, música, entretenimiento) se registran y se consultan dentro del evento.

* Esta funcionalidad se implementó junto con HU-05 (P-04), así que en el Sprint 6 solo se verifica.

## **HU-39 — Gestionar servicios sin cálculo automático**

**Como** responsable de logística, **quiero** registrar los servicios opcionales sin que el sistema realice cálculos automáticos de recursos, **para** mantener estos servicios definidos directamente según lo acordado con el cliente.

| Prioridad | Requerimientos | Sprint | Desarrolla | Estado | QA |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Media | RF-48 | 6 | Javier | Por hacer | 0.5 h |

**Criterios de aceptación** (borrador: se validan en el Sprint Planning correspondiente):

* Verificación: los servicios opcionales no generan cálculos de personal, alimentos, bebidas ni mobiliario.

* Verificación: no afectan el balance logístico calculado.

* Su valor sí se suma al costo total estimado del evento (HU-48).

## **HU-48 — Sumar el costo de los servicios al evento**

**Como** responsable de logística, **quiero** registrar el valor de cada servicio adicional, por hora o por servicio, y verlo sumado al costo total del evento, **para** conocer el costo completo del evento y no solo el de alimentos y bebidas.

| Prioridad | Requerimientos | Sprint | Desarrolla | Estado | QA |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Alta | RF-47, RF-48, RF-56, RN-18 | 3 | Jhon | Finalizada en el Sprint 4 (aprobada por el PO) | 1 h |

**Criterios de aceptación** (propuestos el 14 de octubre de 2026; se validan con el PO al iniciar la historia):

* Cada servicio tiene un valor obligatorio mayor que 0, por hora o por servicio.

* Costo del servicio \= valor × horas (si es por hora) o valor × cantidad (si es por servicio).

* El costo total estimado del evento \= alimentos y bebidas \+ servicios, y se muestra desglosado.

* Ejemplo: DJ a \$100.000 la hora por 5 horas → \$500.000 en el costo total.

# **Correcciones y defectos (no son historias nuevas)**

Son ajustes sobre historias ya finalizadas, para cumplir los criterios nuevos de la versión 2.4. La historia sigue finalizada; la corrección es una tarjeta aparte en el Sprint 3\. COR-03 y COR-06 las desarrolló Javier. Los defectos (DEF) salen del QA del Sprint 4: DEF-01 se corrigió en ese sprint y DEF-02 entra al Sprint 5\.

| ID | Corrección | Historia | Desarrolla | Horas | QA |
| :---- | :---- | :---- | :---- | :---- | :---- |
| **COR-01** | Validar fecha y duración del evento | HU-01 | Jhon | 1,5 | 0,5 |
| **COR-02** | Limitar a 3 eventos por fecha | HU-01 | Jhon | 2 | 0,5 |
| **COR-03** | Bebidas individuales solo en unidades enteras | HU-03 y HU-43 | Javier | 1 | 0,5 |
| **COR-04** | Topes de cantidad en inventario y adquisiciones | HU-08 y HU-11 | Javier | 2 | 0,5 |
| **COR-05** | Tipos de elemento por categoría | HU-09 | Javier | 4 | 1 |
| **COR-06** | Validar cantidad y horas de los servicios | HU-05 | Javier | 3 | 1 |
| **COR-07** | Cargar datos de prueba en el entorno de la demo | HU-04 | Javier | 1 | 0,5 |
| **COR-08** | Restringir el alquiler a mobiliario y vajilla | HU-12 | Javier | 2,5 | 0,5 |
| **COR-09** | Renombrar "baja" por "retiro" | HU-10 | Javier | 0,5 | 0,5 |
| **DEF-01** | Error al actualizar un cóctel (corregido en el Sprint 4; real 0:15\) | HU-44 y HU-45 | Jhon | — | — |
| **DEF-02** | El mesero marcado "no puede" queda bloqueado también en los días siguientes (crítico; Sprint 5\) | HU-29 | Javier | 3 | 1 |

# **Historias eliminadas**

**HU-23** (Calcular personal de cocina para almuerzo) y **HU-24** (Calcular personal de cocina para buffet) se eliminaron el 20 de octubre de 2026\. Ya no se registra el tipo de servicio de comida y el personal de cocina se calcula con una sola regla, que quedó en **HU-22**. Lo que cubrían pasa así: RF-30 y RF-31 se eliminan; RN-02 (buffet en más de 300 asistentes) se conserva como dato informativo en HU-01.

# **Restricciones del sistema (no son historias de usuario)**

| ID original | Elemento | Descripción | Se maneja como |
| :---- | :---- | :---- | :---- |
| HU-40 | Aplicación web | Como responsable de logística, quiero acceder a SIGEV como una aplicación web, para utilizar el sistema para la planificación de los eventos. | RNF-01 |
| HU-41 | Gestión sencilla de meseros | Como responsable de logística, quiero disponer de una gestión sencilla de meseros sin historial de asignaciones entre eventos, para mantener el alcance del sistema enfocado en la planificación actual de cada evento. | RNF-03 / RF-38 |
| HU-42 | Operación sin integraciones externas complejas | Como responsable de logística, quiero que SIGEV funcione sin depender de integraciones externas complejas, para mantener el sistema dentro del alcance y las restricciones del proyecto. | RNF-04 |

[image1]: <data:image/png;base64,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>
