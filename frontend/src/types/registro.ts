import type { ProductoCatalogo } from './catalogo'

export interface AlimentoAgregado {
  producto: ProductoCatalogo
  porcion: number
  componentes: string
}

export interface RequerimientosEvento {
  alimentos: AlimentoAgregado[]
}
