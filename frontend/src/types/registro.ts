import type { ProductoCatalogo } from './catalogo'

export interface AlimentoAgregado {
  producto: ProductoCatalogo
  porcion: number
  componentes: string
}

export interface BebidaAgregada {
  producto: ProductoCatalogo
  porcion: number
}

export interface RequerimientosEvento {
  alimentos: AlimentoAgregado[]
  bebidas: BebidaAgregada[]
}

export const REQUERIMIENTOS_VACIOS: RequerimientosEvento = { alimentos: [], bebidas: [] }
