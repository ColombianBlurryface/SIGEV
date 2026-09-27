import type { ProductoCatalogo } from '@/types/catalogo'

export const MARGEN_SEGURIDAD = 1.1

// Mismo criterio que el backend: sin el toFixed, 50 * 1.1 = 55.00000000000001 y el ceil daría 56.
const redondearArriba = (valor: number) => Math.ceil(Number(valor.toFixed(6)))

export interface ResultadoCalculo {
  neto: number
  conMargen: number
  unidad: string
  costo: number
}

export function calcularProducto(producto: ProductoCatalogo, porcion: number, asistentes: number): ResultadoCalculo {
  const precio = Number(producto.precio_unitario)

  if (producto.tipo_calculo === 'porcion_persona') {
    const totalGramos = asistentes * porcion
    const enKilos = totalGramos >= 1000
    const neto = enKilos ? totalGramos / 1000 : totalGramos
    const conMargen = Number((neto * MARGEN_SEGURIDAD).toFixed(2))
    return { neto, conMargen, unidad: enKilos ? 'kg' : 'g', costo: conMargen * precio }
  }

  if (producto.tipo_calculo === 'unidad_persona') {
    const neto = asistentes * porcion
    const conMargen = redondearArriba(neto * MARGEN_SEGURIDAD)
    return { neto, conMargen, unidad: producto.unidad_medida, costo: conMargen * precio }
  }

  if (producto.tipo_calculo === 'botella_compartida') {
    const porcionesPorBotella = Number(producto.volumen_botella_ml) / Number(producto.tamano_porcion_ml)
    const neto = asistentes / porcionesPorBotella
    const conMargen = redondearArriba(neto * MARGEN_SEGURIDAD)
    return { neto, conMargen, unidad: 'botellas', costo: conMargen * precio }
  }

  return { neto: 0, conMargen: 0, unidad: producto.unidad_medida, costo: 0 }
}
