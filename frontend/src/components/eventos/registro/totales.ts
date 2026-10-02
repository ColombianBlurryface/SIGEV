/**
 * Suma los costos estimados de alimentos y bebidas del evento. Las bebidas se suman también
 * por separado: generales y bar de coctelería (HU-13).
 * El mobiliario y los servicios no tienen costo calculado (se cotizan aparte).
 */
import { calcularProducto } from '@/lib/calculos'
import type { RequerimientosEvento } from '@/types/registro'
import type { ProductoCatalogo } from '@/types/catalogo'

const sumarCostos = (items: { producto: ProductoCatalogo; porcion: number }[], asistentes: number) =>
  items.reduce((suma, item) => suma + calcularProducto(item.producto, item.porcion, asistentes).costo, 0)

export function calcularTotales(requerimientos: RequerimientosEvento, asistentes: number) {
  const alimentos = sumarCostos(requerimientos.alimentos, asistentes)
  const bebidasGenerales = sumarCostos(
    requerimientos.bebidas.filter((b) => b.producto.clasificacion === 'bebida_general'),
    asistentes,
  )
  const barCocteleria = sumarCostos(
    requerimientos.bebidas.filter((b) => b.producto.clasificacion === 'bar_cocteleria'),
    asistentes,
  )
  const bebidas = bebidasGenerales + barCocteleria
  return { alimentos, bebidas, bebidasGenerales, barCocteleria, total: alimentos + bebidas }
}
