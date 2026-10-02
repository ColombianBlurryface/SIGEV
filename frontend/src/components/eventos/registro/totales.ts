/**
 * Suma los costos estimados de alimentos y bebidas del evento.
 * El mobiliario y los servicios no tienen costo calculado (se cotizan aparte).
 */
import { calcularProducto } from '@/lib/calculos'
import type { RequerimientosEvento } from '@/types/registro'
import type { ProductoCatalogo } from '@/types/catalogo'

const sumarCostos = (items: { producto: ProductoCatalogo; porcion: number }[], asistentes: number) =>
  items.reduce((suma, item) => suma + calcularProducto(item.producto, item.porcion, asistentes).costo, 0)

export function calcularTotales(requerimientos: RequerimientosEvento, asistentes: number) {
  const alimentos = sumarCostos(requerimientos.alimentos, asistentes)
  const bebidas = sumarCostos(requerimientos.bebidas, asistentes)
  return { alimentos, bebidas, total: alimentos + bebidas }
}
