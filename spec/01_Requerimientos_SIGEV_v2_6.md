![][image1]

**REQUERIMIENTOS**

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
| 1.0 | 17 sep 2026 | Versión inicial. |
| 2.0 | 20 sep 2026 | Numeración de secciones, columnas de prioridad, aspectos pendientes y trazabilidad. |
| 2.1 | 30 sep 2026 | Se incorporan las decisiones P-01 a P-06 tomadas el 30 de septiembre, la nueva dedicación de Jhon (13 h/semana), el modelo de una sola persona por historia, el QA del Product Owner y el estado real del tablero. Se agrega RF-49 (servicio de comida) y RN-12 (redondeo del personal). RF-10 pasa a cuatro categorías de inventario y HU-25 se mueve al Sprint 4\. |
| 2.2 | 9 oct 2026 | Resultado del QA del Sprint 2: RF-12 se reescribe (el sistema descuenta la baja, no el usuario), RF-10 cambia los nombres de las categorías y se agrega RF-50 (administrar el catálogo con su valor unitario), ya implementado en la semana de integración. |
| 2.3 | 9 oct 2026 | Se agrega RNF-05: el acceso se controla con usuarios creados en la base de datos, sin módulo de registro. Queda registrada la decisión sobre la validación del MVP, que se hará con los datos de un evento real ya ejecutado. |
| 2.4 | 14 oct 2026 | Retroalimentación de la sustentación de la Entrega 1 (13 oct): hallazgos del profesor y del equipo. Se reescriben RF-02, RF-06, RF-10 a RF-14, RF-22, RF-47 y RF-48 con validaciones y límites. Nuevos RF-51 a RF-56 (máximo de eventos por fecha, recetas de cóctel, recetas de platos y costo de servicios) y RN-13 a RN-20. Se agrega la sección de lo que queda fuera de alcance. |
| 2.5 | 20 oct 2026 | Decisión del equipo del 20 de octubre: el cliente siempre elige qué comer, así que se elimina el tipo de servicio de comida (almuerzo, cena, buffet) como dato del evento y el personal de cocina se calcula con una sola regla general, ⌈asistentes ÷ 25⌉ × 2, que queda en el promedio de las tres reglas anteriores. RN-02 se conserva: más de 300 asistentes se atienden tipo buffet, y el sistema lo indica sin cambiar cálculos. Se eliminan RF-30, RF-31, RN-06 y RN-07; se reescriben RF-29, RF-49, RN-02 y RN-05. Se corrige una fila duplicada de RN-12 en la trazabilidad. |
| 2.6 | 12 nov 2026 | Hallazgos del QA del Sprint 4 (12 nov): nuevos RF-57 (editar todos los datos de un evento), RF-58 (cambiar el estado del evento: Planificación, Confirmado, Realizado o Cancelado; un evento cancelado puede volver a planificación y uno realizado ya no cambia de estado) y RN-21 (el estado "no puede" de un mesero lo deshabilita para los eventos de ese día, no para los demás días). La duración máxima del evento pasa de 12 a 8 horas (RF-02, RN-14). Se actualizan las decisiones y la trazabilidad. |

**Índice**

[**Control de versiones	2**](#heading=)

[**1\. Requerimientos funcionales del sistema SIGEV	3**](#heading=)

[1.1. Gestión de eventos y requerimientos	3](#heading=)

[1.2. Gestión de inventario	3](#heading=)

[1.3. Gestión de bebidas	4](#heading=)

[1.4. Cálculo de alimentos y bebidas	4](#heading=)

[1.5. Cálculo automático de personal	5](#heading=)

[1.6. Gestión de meseros	6](#heading=)

[1.7. Balance logístico	6](#heading=)

[1.8. Calendario	7](#heading=)

[1.9. Servicios opcionales	7](#heading=)

[**2\. Requerimientos no funcionales	7**](#heading=)

[**3\. Reglas de negocio consolidadas	7**](#heading=)

[**4\. Decisiones tomadas (antes pendientes)	8**](#heading=)

[**5\. Lo que queda fuera de alcance	10**](#heading=)

[**6\. Trazabilidad: requerimientos, historias y sprints	10**](#heading=)

# **1\. Requerimientos funcionales del sistema SIGEV**

## **1.1. Gestión de eventos y requerimientos**

| ID | Descripción | Prioridad |
| :---- | :---- | :---- |
| **RF-01** | El sistema debe permitir registrar un evento. | Alta |
| **RF-02** | El sistema debe permitir registrar la fecha, tipo de evento, número de asistentes y duración. La fecha debe ser el día actual o posterior y la duración debe estar entre 3 y 8 horas (RN-14). El tipo de evento se elige de una lista: boda, corporativo, cumpleaños, quinceaños, gala u otro. | Alta |
| **RF-49** | El sistema debe indicar automáticamente que un evento de más de 300 asistentes se atiende tipo buffet (RN-02). Es informativo: no se registra un tipo de comida y no cambia ningún cálculo. | Alta |
| **RF-03** | El sistema debe permitir registrar los requerimientos de alimentos del evento. | Alta |
| **RF-04** | El sistema debe permitir registrar las bebidas generales del evento. | Alta |
| **RF-05** | El sistema debe permitir registrar los requerimientos de mobiliario. | Alta |
| **RF-06** | El sistema debe permitir registrar servicios adicionales solicitados para el evento, con una cantidad de 1 a 5 por servicio y unas horas de servicio que no superen la duración del evento (RN-18). | Media |
| **RF-07** | El sistema debe permitir consultar los eventos registrados. | Alta |
| **RF-08** | El sistema debe validar que el número de asistentes esté entre 40 y 600 personas. | Alta |
| **RF-51** | El sistema debe permitir como máximo 3 eventos en una misma fecha (RN-13). | Alta |
| **RF-57** | El sistema debe permitir editar todos los datos de un evento registrado. Al guardar se aplican las mismas validaciones del registro (RN-01, RN-13, RN-14, RN-18) y, si cambia el número de asistentes, se recalculan alimentos, bebidas, cócteles, ingredientes y personal. | Media |
| **RF-58** | El sistema debe permitir cambiar desde la interfaz el estado de un evento. Los estados son: Planificación, Confirmado, Realizado y Cancelado. Un evento Cancelado puede volver a Planificación; un evento Realizado ya no puede cambiar a ningún otro estado. | Alta |

*Desde la versión 2.4 el registro del evento valida la fecha (día actual o posterior), la duración (3 a 8 horas desde la versión 2.6; antes 3 a 12\) y el número de eventos por fecha (máximo 3). Estas validaciones salieron de las pruebas del equipo y de la sustentación de la Entrega 1\.*

*Desde la versión 2.5 no se registra el tipo de servicio de comida: el cliente siempre elige qué comer y el cálculo de cocina es uno solo para todos los eventos (RN-05). El tipo de evento (boda, corporativo, cumpleaños, quinceaños, gala, otro) sigue siendo informativo. RF-49 queda para indicar el servicio tipo buffet en eventos de más de 300 asistentes (RN-02).*

*Desde la versión 2.6 un evento registrado se puede editar completo (RF-57) y su estado se cambia desde la pantalla (RF-58). Las dos son necesidades nuevas encontradas en el QA del Sprint 4; un evento cancelado puede volver a planificación, pero uno realizado ya no puede cambiar a ningún otro estado.*

## **1.2. Gestión de inventario**

| ID | Descripción | Prioridad |
| :---- | :---- | :---- |
| **RF-09** | El sistema debe permitir registrar elementos del inventario. | Alta |
| **RF-10** | El sistema debe organizar el inventario en las categorías de mobiliario, bebidas generales, licores para cócteles y vajilla. Cada elemento se elige de una lista de tipos de su categoría; se pueden crear tipos nuevos, pero siempre dentro de su categoría. | Alta |
| **RF-11** | El sistema debe permitir registrar y actualizar las cantidades disponibles de los elementos del inventario, sin superar el máximo de su categoría (RN-16). | Alta |
| **RF-12** | El sistema debe permitir retirar elementos del inventario indicando únicamente la cantidad a retirar, sea por daño, pérdida o devolución. El sistema descuenta esa cantidad de la disponible; el usuario no hace el cálculo. | Media |
| **RF-13** | El sistema debe permitir registrar nuevas adquisiciones de elementos del inventario. Si el elemento no existe, la adquisición puede crearlo. La cantidad total después de la adquisición no puede superar el máximo de su categoría (RN-16). | Media |
| **RF-14** | El sistema debe diferenciar los elementos propios de los elementos que deben ser alquilados, e indicar la necesidad de alquiler cuando el evento supera los 200 asistentes. Solo se alquilan mobiliario y vajilla, y como máximo la cantidad que falta para el evento (RN-17). | Alta |

*El inventario maneja cuatro categorías: mobiliario, bebidas generales, licores para cócteles y vajilla. No existe categoría de decoración, porque esta se adquiere específicamente para cada evento. El inventario propio cubre aproximadamente hasta 200 personas (RN-03). Desde la versión 2.4 cada categoría tiene una cantidad máxima por elemento (RN-16), los elementos se eligen de una lista de tipos de su categoría, solo se alquila mobiliario y vajilla (RN-17) y lo que sale del inventario se registra como retiro.*

## **1.3. Gestión de bebidas**

| ID | Descripción | Prioridad |
| :---- | :---- | :---- |
| **RF-15** | El sistema debe diferenciar las bebidas del bar de coctelería de las bebidas generales del evento. | Alta |
| **RF-16** | El sistema debe permitir registrar las bebidas fuertes utilizadas para la preparación de cócteles. | Media |
| **RF-17** | El sistema debe permitir registrar las bebidas generales del evento, como cerveza, vino y champaña. | Alta |
| **RF-18** | El sistema debe permitir registrar para cada bebida su valor unitario y la cantidad o información necesaria para calcularla. | Alta |
| **RF-52** | El sistema debe permitir registrar recetas de cóctel, indicando el licor y los mililitros que lleva cada cóctel. | Alta |

## **1.4. Cálculo de alimentos y bebidas**

| ID | Descripción | Prioridad |
| :---- | :---- | :---- |
| **RF-19** | El sistema debe permitir registrar los diferentes componentes de alimentos que conforman el menú de un evento. | Alta |
| **RF-20** | El sistema debe permitir definir para cada alimento la cantidad o porción requerida por persona y su valor unitario. | Alta |
| **RF-21** | El sistema debe calcular la cantidad total de cada alimento según el número de asistentes y la porción definida por persona. | Alta |
| **RF-22** | El sistema debe permitir calcular bebidas de consumo individual utilizando una cantidad entera de unidades por persona, entre 1 y 10 (RN-15). | Alta |
| **RF-23** | El sistema debe permitir calcular bebidas compartidas por botella utilizando el volumen de la botella y el tamaño de la porción. | Alta |
| **RF-24** | El sistema debe calcular la cantidad de botellas necesarias para bebidas compartidas según las porciones que proporciona cada botella. | Alta |
| **RF-25** | El sistema debe aplicar un margen estándar del 10 % a las cantidades calculadas de alimentos y bebidas. | Alta |
| **RF-26** | El sistema debe redondear hacia arriba las cantidades que requieran unidades completas, como botellas o unidades individuales. | Alta |
| **RF-27** | El sistema debe calcular el valor total estimado de los alimentos y bebidas a partir de las cantidades calculadas y sus valores unitarios. | Alta |
| **RF-50** | El responsable de logística debe poder agregar y editar los productos del catálogo de alimentos y bebidas, con sus parámetros de cálculo y su valor unitario obligatorio. | Media |
| **RF-53** | El sistema debe calcular las botellas de cada licor de coctelería a partir de los asistentes, los cócteles por persona, la receta y el volumen de la botella, con el 10 % de margen y redondeo hacia arriba (RN-19). | Alta |
| **RF-54** | El sistema debe permitir registrar la receta de cada plato: sus ingredientes, la cantidad por porción y la unidad (gramos, kilos, libras o arrobas). | Alta |
| **RF-55** | El sistema debe calcular la cantidad de cada ingrediente que hay que comprar según los asistentes y la receta, con el 10 % de margen, expresada en la unidad de compra y redondeada hacia arriba (RN-20). | Alta |

### **Regla de cálculo del 10 %**

Se utilizará un **10 % de margen** sobre la cantidad calculada de alimentos y bebidas para contemplar porciones adicionales, desperdicios, derrames o variaciones en el consumo.

| Caso | Cálculo | Con 10 % de margen |
| :---- | :---- | :---- |
| Bebida individual | 200 asistentes × 1 unidad por persona \= 200 unidades | **220 unidades** |
| Bebida compartida | Botella de 1.000 ml, porción de 100 ml → 10 porciones por botella; 200 ÷ 10 \= 20 botellas | **22 botellas** |
| Alimento | 100 asistentes × 200 g de carne \= 20 kg | **22 kg** |

Los valores de porción, volumen, unidades por persona y precio corresponden a los datos definidos para cada alimento o bebida; los ejemplos anteriores no constituyen valores obligatorios para todos los productos.

### **Coctelería e ingredientes (nuevo en la versión 2.4)**

| Caso | Cálculo | Resultado |
| :---- | :---- | :---- |
| Licor de coctelería (RN-19) | 100 asistentes × 2 Gin Tonic por persona × 50 ml de ginebra × 1,10 \= 11.000 ml; ÷ botella de 750 ml \= 14,67 | **15 botellas** |
| Ingrediente (RN-20) | 40 asistentes × 150 g de papa por porción × 1,10 \= 6.600 g \= 6,6 kg; unidad de compra: arroba de 12,5 kg | **1 arroba** |
| Ingrediente (RN-20) | 40 asistentes × 15 g de almendras × 1,10 \= 660 g; unidad de compra: libra de 500 g | **2 libras** |

*Las recetas de los ejemplos (cócteles y platos) son datos de prueba propuestos el 14 de octubre de 2026\. El equipo los reemplaza por recetas reales antes de la Entrega 2\.*

## **1.5. Cálculo automático de personal**

| ID | Descripción | Prioridad |
| :---- | :---- | :---- |
| **RF-28** | El sistema debe calcular automáticamente la cantidad de meseros requerida según el número de asistentes. | Alta |
| **RF-29** | El sistema debe calcular automáticamente la cantidad de personal de cocina requerida para cualquier evento, con una regla general que no depende del tipo de evento ni de la comida que se sirva (RN-05). | Alta |
| **RF-32** | El sistema debe indicar cuando la cantidad de personal asignada para un evento se encuentre por debajo o se desvíe del estándar establecido. | Alta |

### **Reglas de personal**

| Caso | Fórmula | Mínimo | Ejemplo |
| :---- | :---- | :---- | :---- |
| Meseros | asistentes ÷ 20, redondeado hacia arriba | — | 45 asistentes → 3 meseros |
| Cocineros (todos los eventos) | (asistentes ÷ 25, redondeado hacia arriba) × 2 | 4 cocineros (40 asistentes) | 320 asistentes → 26 cocineros |

*La regla general de cocina se definió el 20 de octubre de 2026 y reemplaza las tres reglas por tipo de comida (cena, almuerzo y buffet) definidas el 30 de septiembre. Se eligió porque queda en el promedio de las tres: con 40, 100, 200, 300 y 600 asistentes da 4, 8, 16, 24 y 48 cocineros, frente a un promedio de 4, 9, 16, 25 y 48\. El redondeo hacia arriba se mantiene (RN-12): es preferible que sobre personal a que falte.*

## **1.6. Gestión de meseros**

| ID | Descripción | Prioridad |
| :---- | :---- | :---- |
| **RF-33** | El sistema debe permitir registrar meseros con nombre y datos de contacto. | Alta |
| **RF-34** | El sistema debe permitir eliminar registros de meseros. | Media |
| **RF-35** | El sistema debe permitir asignar meseros registrados a un evento específico. | Alta |
| **RF-36** | El sistema debe permitir establecer el estado de asignación de cada mesero: confirmado, por confirmar o no puede. El estado "no puede" aplica solo a la fecha de ese evento (RN-21). | Alta |
| **RF-37** | El sistema debe generar una lista de meseros programados para cada evento. | Alta |
| **RF-38** | El sistema no debe mantener un historial de asignaciones de meseros entre eventos. | Alta |

*Aclaración: los registros de meseros se pueden agregar y eliminar, pero no se contempla una funcionalidad para modificar sus datos.*

## **1.7. Balance logístico**

| ID | Descripción | Prioridad |
| :---- | :---- | :---- |
| **RF-39** | El sistema debe generar automáticamente un balance logístico del evento. | Alta |
| **RF-40** | El balance debe integrar personal, alimentos, bebidas, mobiliario y demás recursos requeridos. | Alta |
| **RF-41** | El sistema debe mostrar el estado de cada elemento del balance: disponible, por comprar, por conseguir o pendiente. | Alta |
| **RF-42** | El sistema debe permitir establecer una fecha límite para cada elemento pendiente del balance. | Alta |
| **RF-43** | El responsable de logística debe poder actualizar manualmente el estado de un elemento cuando este ya esté disponible. | Alta |
| **RF-44** | El balance debe permitir visualizar anticipadamente los recursos que hacen falta antes del evento. | Alta |

*Aclaración: "comprado" no constituye un estado adicional. Cuando un elemento ha sido adquirido y está disponible, su estado pasa a ser "disponible". El sistema no debe manejar facturas, comprobantes ni un registro detallado de gastos o compras.*

## **1.8. Calendario**

| ID | Descripción | Prioridad |
| :---- | :---- | :---- |
| **RF-45** | El sistema debe proporcionar una vista de calendario con los eventos programados. | Media |
| **RF-46** | El calendario debe mostrar información asociada al evento, como tipo de evento, cantidad de asistentes y estado del balance logístico. | Media |

## **1.9. Servicios opcionales**

| ID | Descripción | Prioridad |
| :---- | :---- | :---- |
| **RF-47** | El sistema debe permitir registrar servicios opcionales como DJ, música o entretenimiento, con su valor por hora o por servicio. | Media |
| **RF-48** | Los servicios opcionales no generan cálculos automáticos de recursos. Su valor sí se suma al costo total estimado del evento (RF-56). | Media |
| **RF-56** | El sistema debe sumar el valor de los servicios adicionales al costo total estimado del evento, mostrado por separado del valor de alimentos y bebidas. | Alta |

*Los servicios adicionales (RF-06) y los servicios opcionales (RF-47, RF-48) son lo mismo: servicios acordados con el cliente que no generan cálculo automático de recursos (P-04). Desde la versión 2.4 su cantidad y sus horas tienen límites (RN-18) y su valor se suma al costo total estimado del evento (RF-56). Esto es un estimado para planear, no un registro de gastos.*

# **2\. Requerimientos no funcionales**

| ID | Descripción | Prioridad |
| :---- | :---- | :---- |
| **RNF-01** | El sistema debe implementarse como una aplicación web. | Alta |
| **RNF-02** | El sistema debe soportar eventos de entre 40 y 600 asistentes. | Alta |
| **RNF-03** | La gestión de meseros debe mantenerse como una base de datos sencilla, sin historial entre eventos. | Media |
| **RNF-04** | El sistema no debe depender de integraciones externas complejas. | Alta |
| **RNF-05** | El acceso al sistema se controla con usuarios y contraseñas creados directamente en la base de datos. No se contempla un módulo de registro ni de administración de usuarios, porque el sistema lo usa un grupo reducido de personas conocidas. | Alta |

# **3\. Reglas de negocio consolidadas**

| ID | Descripción | Prioridad |
| :---- | :---- | :---- |
| **RN-01** | Los eventos gestionados deben tener entre 40 y 600 asistentes. | Alta |
| **RN-02** | Los eventos con más de 300 asistentes se atienden tipo buffet: no hay servicio a la mesa, cada invitado toma su plato y se acerca a la zona donde se sirve la comida. El menú puede ser el mismo de un evento más pequeño. El sistema lo indica automáticamente; es informativo y no cambia ningún cálculo. | Alta |
| **RN-03** | El inventario propio cubre aproximadamente hasta 200 personas. El sistema indica la necesidad de alquiler cuando el evento supera los 200 asistentes. | Alta |
| **RN-04** | La cantidad estándar de meseros es de 1 por cada 20 asistentes. | Alta |
| **RN-05** | Cocineros \= (asistentes ÷ 25, redondeado hacia arriba) × 2, igual para todos los eventos. Ejemplos: 40 asistentes → 4; 100 → 8; 200 → 16; 300 → 24; 320 (buffet) → 26; 600 → 48\. | Alta |
| **RN-08** | Las bebidas de coctelería y las bebidas generales del evento deben manejarse de forma independiente. | Alta |
| **RN-09** | A los cálculos de alimentos y bebidas se les aplica un margen estándar del 10 %. | Alta |
| **RN-10** | Las cantidades de alimentos y bebidas se calculan utilizando los parámetros definidos para cada producto, como porción por persona, unidades por persona, volumen de botella y tamaño de porción. | Alta |
| **RN-11** | Las cantidades que requieran unidades completas deben redondearse hacia arriba. | Alta |
| **RN-12** | Las cantidades de personal (meseros y cocineros) se redondean hacia arriba. Es preferible que sobre personal a que falte. | Alta |
| **RN-13** | Se permiten como máximo 3 eventos en una misma fecha. | Alta |
| **RN-14** | La fecha del evento debe ser el día actual o posterior, al crearlo y al cambiar su fecha. Un evento ya pasado se puede consultar, pero no se puede reprogramar a una fecha pasada. La duración del evento va de 3 a 8 horas. | Alta |
| **RN-15** | Las unidades por persona de las bebidas individuales y los cócteles por persona son números enteros entre 1 y 10\. No se aceptan decimales (por ejemplo, 1,4 gaseosas por persona). | Alta |
| **RN-16** | Cantidad máxima por elemento del inventario: mobiliario 2.000, vajilla 6.000, bebidas generales y licores 4.000. Aplica al registrar, al actualizar y al adquirir. Base: 600 asistentes × 3 eventos al día \= 1.800 personas, por las piezas que usa cada persona, más 10 %. | Alta |
| **RN-17** | Solo se alquilan elementos de mobiliario y vajilla; las bebidas nunca se alquilan. La cantidad a alquilar no puede superar lo que falta para el evento: lo requerido menos lo propio disponible. | Alta |
| **RN-18** | Cada servicio adicional admite una cantidad de 1 a 5, unas horas de servicio que no superen la duración del evento y un valor obligatorio mayor que 0, por hora o por servicio. | Alta |
| **RN-19** | Licor de coctelería: botellas \= (asistentes × cócteles por persona × mililitros por cóctel × 1,10) ÷ volumen de la botella, redondeado hacia arriba. Si varios cócteles usan el mismo licor, se suma en un solo total. | Alta |
| **RN-20** | Ingredientes: cantidad \= asistentes × cantidad por porción × 1,10, convertida a la unidad de compra y redondeada hacia arriba. Equivalencias: 1 kg \= 1.000 g; 1 libra \= 500 g; 1 arroba \= 12,5 kg. Si varios platos usan el mismo ingrediente, se suma en un solo total. | Alta |
| **RN-21** | Un mesero marcado "no puede" queda no disponible para todos los eventos de esa fecha; en las demás fechas sigue disponible para asignarlo. | Alta |

# **4\. Decisiones tomadas (antes pendientes)**

Los seis aspectos que la versión 2.0 dejó abiertos quedaron definidos el 30 de septiembre de 2026\. Los hallazgos del QA del Sprint 2 se resolvieron el 9 de octubre, los de la sustentación de la Entrega 1 el 14 de octubre, el cálculo general de cocina el 20 de octubre y los hallazgos del QA del Sprint 4 el 12 de noviembre. No queda ningún requerimiento pendiente de definición.

| ID | Aspecto | Decisión | Fecha |
| :---- | :---- | :---- | :---- |
| **P-01** | Divisor de las reglas de cocina. | Se divide entre 30 en cena y entre 40 en almuerzo (RN-05, RN-06). Reemplazada el 20 oct 2026 por la regla general RN-05. | 30 sep 2026 |
| **P-02** | Redondeo del personal calculado. | Se redondea hacia arriba (RN-12): es preferible que sobre a que falte. | 30 sep 2026 |
| **P-03** | Tipos de evento y regla de cocina. | El tipo de evento (boda, corporativo, cumpleaños, quinceaños, gala, otro) es informativo. Se agrega el campo servicio de comida (almuerzo, cena, buffet), que es el que determina la regla de cocina (RF-49). Reemplazada el 20 oct 2026: ya no se registra el servicio de comida. | 30 sep 2026 |
| **P-04** | Relación entre servicios adicionales y opcionales. | Son lo mismo: los servicios adicionales del evento son también los opcionales. HU-38 y HU-39 quedan como una verificación en el Sprint 6, no como desarrollo nuevo. | 30 sep 2026 |
| **P-05** | Criterio para indicar alquiler. | Se usa el umbral de 200 asistentes (RN-03, RF-14). | 30 sep 2026 |
| **P-06** | Adquisición de un elemento nuevo. | Una adquisición puede crear un elemento que aún no existe en el inventario (RF-13). Ya está implementado. | 30 sep 2026 |
| **QA-02** | Baja de elementos dañados. | El usuario registra solo la cantidad dañada y el sistema hace la resta. RF-12 reescrito. | 9 oct 2026 |
| **QA-03** | Nombres de las categorías del inventario. | Mobiliario, Bebidas Generales, Licores para Cócteles y Vajilla (RF-10). | 9 oct 2026 |
| **QA-04** | Parámetros de las bebidas. | Individuales: 2 unidades por persona. Compartidas: botella de 750 ml y porción de 125 ml. El valor unitario no se precarga. | 9 oct 2026 |
| **RF-50** | Administración del catálogo. | La encargada puede agregar y editar productos con su precio (HU-43). Desarrollada en la semana de integración 1\. | 9 oct 2026 |
| **RNF-05** | Control de acceso al sistema. | Usuario y contraseña creados en la base de datos, sin módulo de registro. Decisión de alcance por el tamaño del grupo de usuarios. | 9 oct 2026 |
| **VAL** | Validación del MVP (objetivo 9). | No habrá validación con la encargada de logística. El MVP se valida con los datos de un evento real ya ejecutado, comparando lo que el sistema calcula contra lo que realmente se usó. | 9 oct 2026 |
| **E1 · P4** | Fecha y duración del evento. | Fecha del día actual o posterior; duración de 3 a 12 horas (RN-14). | 14 oct 2026 |
| **E2** | Eventos por día. | Máximo 3 eventos en una misma fecha (RN-13, RF-51). | 14 oct 2026 |
| **E3** | Bebidas con decimales. | Unidades por persona enteras, de 1 a 10 (RN-15). | 14 oct 2026 |
| **P5 · P6** | Cantidades absurdas en inventario y adquisición. | Máximos por categoría (RN-16) y lista de tipos por categoría (RF-10). | 14 oct 2026 |
| **P7** | Alquiler y devolución. | Solo se alquila mobiliario y vajilla, hasta lo que falta (RN-17). No se crea un flujo de devolución: la sección de baja pasa a llamarse retiro y cubre daño, pérdida o devolución (RF-12). | 14 oct 2026 |
| **P3 · P9** | Servicios sin límites y sin costo. | Cantidad de 1 a 5, horas hasta la duración del evento y valor obligatorio que suma al costo total (RN-18, RF-56). | 14 oct 2026 |
| **P1** | Coctelería. | Entra al MVP: recetas de cóctel y cálculo de botellas por cócteles por persona (RF-52, RF-53, RN-19). | 14 oct 2026 |
| **P8** | Ingredientes por plato. | Entra al MVP: recetas de platos y cálculo de ingredientes en unidad de compra (RF-54, RF-55, RN-20). | 14 oct 2026 |
| **P10** | Turnos de meseros. | Queda fuera de alcance, declarado de forma explícita (RNF-03). | 14 oct 2026 |
| **P2** | Mobiliario sin datos. | La funcionalidad existe; faltó cargar los datos de prueba en el entorno de la demo. Se corrige con COR-07. | 14 oct 2026 |
| **COC** | Servicio de comida y cálculo de cocina. | Se elimina el tipo de servicio de comida y las tres reglas de cocina. Cocineros \= ⌈asistentes ÷ 25⌉ × 2 para todos (RN-05). RN-02 se conserva: más de 300 asistentes \= buffet, indicado por el sistema sin cambiar cálculos (RF-49). | 20 oct 2026 |
| **DUR** | Duración máxima del evento. | Pasa de 12 a 8 horas; el mínimo sigue en 3 (RN-14). Cambio del equipo confirmado por el PO. | 12 nov 2026 |
| **QA4-1** | Editar eventos. | Necesidad nueva del QA del Sprint 4 (gravedad media): se pueden editar todos los datos del evento (RF-57, HU-50). Entra al Sprint 5\. | 12 nov 2026 |
| **QA4-2** | Estado del evento. | Necesidad nueva del QA del Sprint 4 (gravedad alta): el estado se cambia desde la interfaz entre Planificación, Confirmado, Realizado y Cancelado (RF-58, HU-51). Un evento Cancelado puede volver a Planificación; un evento Realizado ya no puede cambiar a ningún otro estado. Entra al Sprint 5\. | 12 nov 2026 |
| **QA4-3** | Mesero "no puede" en varios días. | Es un defecto (crítico): el "no puede" bloqueaba al mesero en los días siguientes. Se corrige con DEF-02 en el Sprint 5 y queda la regla RN-21: el "no puede" lo deshabilita para los eventos de ese día, no para los demás días. | 12 nov 2026 |

# **5\. Lo que queda fuera de alcance**

El profesor pidió en la sustentación declarar de forma explícita lo que el sistema no va a hacer, en lugar de dejarlo abierto. Esta es la lista vigente:

| Fuera de alcance | Motivo |
| :---- | :---- |
| Turnos u horarios de meseros | La gestión de meseros se mantiene sencilla (RNF-03). Decisión del equipo del 14 de octubre de 2026\. |
| Flujo de devolución de alquileres | Lo que sale del inventario, sea por daño, pérdida o devolución, se registra como retiro (RF-12). Decisión del 14 de octubre de 2026\. |
| Pagos en línea, facturación y registro de gastos reales | El sistema estima costos (alimentos, bebidas y servicios) para planear; no registra pagos ni comprobantes. |
| Proveedores, contratos y negociación con clientes | La negociación y el precio final con el cliente los maneja la organizadora fuera del sistema. |
| Control de asistencia el día del evento | El sistema planea antes del evento; no opera durante él. |
| Montaje y desmontaje | Se contrata por evento. |
| Historial de asignaciones de meseros entre eventos | RF-38 y RNF-03. |
| Registro y administración de usuarios | Los usuarios se crean en la base de datos (RNF-05). |

# **6\. Trazabilidad: requerimientos, historias y sprints**

Todos los requerimientos funcionales y reglas de negocio están cubiertos por al menos una historia de usuario. RF-38 se cubre como restricción (RNF-03). Las reglas nuevas de la versión 2.4 que tocan historias ya finalizadas se implementan en el Sprint 3 con las correcciones COR-01 a COR-09. Lo nuevo de la versión 2.6 entra al Sprint 5: RF-57 con HU-50, RF-58 con HU-51 y RN-21 con la corrección DEF-02 de HU-29.

| Requerimiento / Regla | Historias de usuario | Sprint |
| :---- | :---- | :---- |
| RF-01 | HU-01 | 1 |
| RF-02 | HU-01 | 1 |
| RF-49 | HU-01 | 1 (ajuste en el 3\) |
| RF-03 | HU-02 | 1 |
| RF-04 | HU-03 | 1 |
| RF-05 | HU-04 | 1 |
| RF-06 | HU-05 | 1 |
| RF-07 | HU-06 | 1 |
| RF-08 | HU-07 | 1 |
| RF-09 | HU-08 | 2 |
| RF-10 | HU-09 | 2 |
| RF-11 | HU-08 | 2 |
| RF-12 | HU-10 | 2 |
| RF-13 | HU-11 | 2 |
| RF-14 | HU-12 | 2 |
| RF-15 | HU-13 | 2 |
| RF-16 | HU-13 | 2 |
| RF-17 | HU-03, HU-13 | 1, 2 |
| RF-18 | HU-03, HU-14 | 1, 3 |
| RF-19 | HU-02 | 1 |
| RF-20 | HU-02, HU-14, HU-15 | 1, 3 |
| RF-21 | HU-15 | 3 |
| RF-22 | HU-16 | 3 |
| RF-23 | HU-17 | 3 |
| RF-24 | HU-17 | 3 |
| RF-25 | HU-18 | 3 |
| RF-26 | HU-19 | 3 |
| RF-27 | HU-20 | 3 |
| RF-28 | HU-21 | 3 |
| RF-29 | HU-22 | 3 |
| RF-32 | HU-25 | 4 |
| RF-33 | HU-26 | 4 |
| RF-34 | HU-27 | 4 |
| RF-35 | HU-28 | 4 |
| RF-36 | HU-29 | 4 (corrección en el 5, DEF-02) |
| RF-37 | HU-30 | 4 |
| RF-38 | Restricción RNF-03 | Todos |
| RF-39 | HU-31 | 5 |
| RF-40 | HU-31 | 5 |
| RF-41 | HU-32 | 5 |
| RF-42 | HU-33 | 5 |
| RF-43 | HU-34 | 5 |
| RF-44 | HU-35 | 5 |
| RF-45 | HU-36 | 6 |
| RF-46 | HU-37 | 6 |
| RF-47 | HU-38, HU-48 | 6, 3 |
| RF-48 | HU-39, HU-48 | 6, 3 |
| RF-50 | HU-43 | Int. 1 |
| RF-51 | HU-01 | 1 |
| RF-52 | HU-44 | 3 |
| RF-53 | HU-45 | 3 |
| RF-54 | HU-46 | 3 |
| RF-55 | HU-47 | 3 |
| RF-56 | HU-48 | 3 |
| RF-57 | HU-50 | 5 |
| RF-58 | HU-51 | 5 |
| RN-01 | HU-07, HU-50 | 1, 5 |
| RN-02 | HU-01 | 1 (ajuste en el 3\) |
| RN-03 | HU-12 | 2 |
| RN-04 | HU-21 | 3 |
| RN-05 | HU-22 | 3 |
| RN-08 | HU-13 | 2 |
| RN-09 | HU-18, HU-45, HU-47 | 3 |
| RN-10 | HU-15, HU-16, HU-17 | 3 |
| RN-11 | HU-19 | 3 |
| RN-13 | HU-01, HU-50 | 1, 5 |
| RN-14 | HU-01, HU-50 | 1, 5 |
| RN-15 | HU-03, HU-16, HU-43, HU-45 | 1, 3, Int. 1 |
| RN-16 | HU-08, HU-11 | 2 |
| RN-17 | HU-12 | 2 |
| RN-18 | HU-05, HU-48 | 1, 3 |
| RN-19 | HU-45 | 3 |
| RN-20 | HU-47 | 3 |
| RN-21 | HU-29 (DEF-02) | 5 |
| RN-12 | HU-21, HU-22 | 3 |

[image1]: <data:image/png;base64,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>
