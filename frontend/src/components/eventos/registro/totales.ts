import { calcularProducto } from '@/lib/calculos'
import type { RequerimientosEvento } from '@/types/registro'

export function calcularTotales(requerimientos: RequerimientosEvento, asistentes: number) {
  const alimentos = requerimientos.alimentos.reduce(
    (suma, a) => suma + calcularProducto(a.producto, a.porcion, asistentes).costo,
    0,
  )
  return { alimentos, total: alimentos }
}
