/**
 * Datos de apoyo de la pantalla Catálogo: los grupos en los que se crea un producto, cómo se puede
 * consumir cada grupo y cómo se describe un producto en la lista.
 *
 * Las reglas son las mismas que valida el backend (catalogoController.js): los alimentos van por
 * gramos por persona y las bebidas por unidades por persona o por botella compartida.
 */
import { CATEGORIAS, TIPOS_BEBIDA, type ConfigCategoria } from '@/lib/categorias'
import { formatearNumero } from '@/lib/formato'
import type { DatosProducto, GrupoCatalogo, ProductoCatalogo } from '@/types/catalogo'

export type TipoConsumo = DatosProducto['tipo_calculo']

export const GRUPOS_CATALOGO: GrupoCatalogo[] = ['alimento', 'bebida_general', 'bar_cocteleria']

// Mismos nombres que usa el registro de eventos para estos grupos
export const CONFIG_GRUPO: Record<GrupoCatalogo, ConfigCategoria> = {
  alimento: CATEGORIAS.alimentos,
  bebida_general: TIPOS_BEBIDA.bebida_general,
  bar_cocteleria: TIPOS_BEBIDA.bar_cocteleria,
}

export const TIPOS_POR_GRUPO: Record<GrupoCatalogo, TipoConsumo[]> = {
  alimento: ['porcion_persona'],
  bebida_general: ['unidad_persona', 'botella_compartida'],
  bar_cocteleria: ['unidad_persona', 'botella_compartida'],
}

export const ETIQUETA_TIPO: Record<TipoConsumo, string> = {
  porcion_persona: 'Por porción (gramos por persona)',
  unidad_persona: 'Por unidad (unidades por persona)',
  botella_compartida: 'Botella compartida (por porciones)',
}

// A qué se refiere el precio según el tipo de consumo
export const ETIQUETA_PRECIO: Record<TipoConsumo, string> = {
  porcion_persona: 'Precio por kg',
  unidad_persona: 'Precio por unidad',
  botella_compartida: 'Precio por botella',
}

export const esGrupoCatalogo = (valor: string): valor is GrupoCatalogo => GRUPOS_CATALOGO.includes(valor as GrupoCatalogo)

/** Resume cómo se calcula un producto, por ejemplo «2 unidades por persona» o «750 ml · trago de 50 ml». */
export function describirConsumo(producto: ProductoCatalogo) {
  if (producto.tipo_calculo === 'porcion_persona') {
    return `${formatearNumero(producto.porcion_por_persona)} g por persona`
  }
  if (producto.tipo_calculo === 'unidad_persona') {
    const cantidad = Number(producto.porcion_por_persona)
    return `${formatearNumero(cantidad)} ${cantidad === 1 ? 'unidad' : 'unidades'} por persona`
  }
  const porciones = Number(producto.volumen_botella_ml) / Number(producto.tamano_porcion_ml)
  return `${formatearNumero(producto.volumen_botella_ml)} ml · porción de ${formatearNumero(producto.tamano_porcion_ml)} ml (${formatearNumero(porciones)} por botella)`
}
