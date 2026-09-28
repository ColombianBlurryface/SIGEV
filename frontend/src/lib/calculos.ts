/**
 * Cálculo de cantidades y costos de un producto para un evento.
 * Replica exactamente las fórmulas del backend (eventosController.js) para mostrar una vista previa
 * antes de guardar: lo que ve el usuario es lo mismo que guardará el servidor.
 */
import type { ProductoCatalogo } from '@/types/catalogo'

// Margen de seguridad del 10% que se aplica a todas las cantidades (RN-09)
export const MARGEN_SEGURIDAD = 1.1

// Mismo criterio que el backend: sin el toFixed, 50 * 1.1 = 55.00000000000001 y el ceil daría 56.
const redondearArriba = (valor: number) => Math.ceil(Number(valor.toFixed(6)))

// neto: lo que se necesita exactamente; conMargen: lo que se debe comprar (neto + 10%)
export interface ResultadoCalculo {
  neto: number
  conMargen: number
  unidad: string
  costo: number
}

export function calcularProducto(producto: ProductoCatalogo, porcion: number, asistentes: number): ResultadoCalculo {
  const precio = Number(producto.precio_unitario)

  // Alimentos por gramos: asistentes × gramos por persona. Si pasa de 1000 g se expresa en kg.
  if (producto.tipo_calculo === 'porcion_persona') {
    const totalGramos = asistentes * porcion
    const enKilos = totalGramos >= 1000
    const neto = enKilos ? totalGramos / 1000 : totalGramos
    const conMargen = Number((neto * MARGEN_SEGURIDAD).toFixed(2))
    return { neto, conMargen, unidad: enKilos ? 'kg' : 'g', costo: conMargen * precio }
  }

  // Unidades por persona (ej. 2 cervezas por persona). Se redondea hacia arriba: no se compran medias unidades.
  if (producto.tipo_calculo === 'unidad_persona') {
    const neto = asistentes * porcion
    const conMargen = redondearArriba(neto * MARGEN_SEGURIDAD)
    return { neto, conMargen, unidad: producto.unidad_medida, costo: conMargen * precio }
  }

  // Botellas compartidas: cuántas porciones salen por botella (750 ml / copa de 150 ml = 5)
  // y cuántas botellas hacen falta para todos los asistentes, redondeando hacia arriba.
  if (producto.tipo_calculo === 'botella_compartida') {
    const porcionesPorBotella = Number(producto.volumen_botella_ml) / Number(producto.tamano_porcion_ml)
    const neto = asistentes / porcionesPorBotella
    const conMargen = redondearArriba(neto * MARGEN_SEGURIDAD)
    return { neto, conMargen, unidad: 'botellas', costo: conMargen * precio }
  }

  // cantidad_fija (inventario) no se calcula por asistentes
  return { neto: 0, conMargen: 0, unidad: producto.unidad_medida, costo: 0 }
}
