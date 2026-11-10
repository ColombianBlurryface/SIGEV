/**
 * Calcula las botellas de licor a comprar de unos cócteles y unos asistentes ANTES de guardar el evento (HU-45).
 * Se vuelve a calcular automáticamente cada vez que cambian los asistentes o los cócteles.
 */
import { useEffect, useState } from 'react'
import { ApiError } from '@/services/api'
import { eventosService } from '@/services/eventosService'
import type { ComprasCocteles } from '@/types/evento'

export interface ItemCoctelInput {
  producto_id?: number
  coctel_id?: number
  porcion_por_persona?: number
}

interface Resultado {
  clave: string
  compras: ComprasCocteles | null
  error: string | null
}

export function useComprasCoctelesPrevias(asistentes: number | null, items: ItemCoctelInput[]) {
  const [resultado, setResultado] = useState<Resultado | null>(null)

  const clave =
    asistentes === null
      ? null
      : `${asistentes}:${items
          .map((i) => `${i.producto_id ?? i.coctel_id}:${i.porcion_por_persona ?? 1}`)
          .sort()
          .join(',')}`

  useEffect(() => {
    if (asistentes === null || clave === null) return
    if (items.length === 0) {
      setResultado({
        clave,
        compras: {
          margen_porcentaje: 10,
          asistentes,
          items: [],
          total_botellas: 0,
          costo_total_licores: 0,
          cocteles_con_receta: 0,
          cocteles_sin_receta: [],
        },
        error: null,
      })
      return
    }

    let activo = true
    eventosService
      .calcularComprasCocteles(asistentes, items)
      .then((compras) => {
        if (activo) setResultado({ clave, compras, error: null })
      })
      .catch((err: unknown) => {
        if (activo) {
          setResultado({
            clave,
            compras: null,
            error: err instanceof ApiError ? err.message : 'No fue posible calcular las botellas de coctelería.',
          })
        }
      })

    return () => {
      activo = false
    }
    // items se resume en la clave: así no se recalcula por una lista nueva con los mismos elementos
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave])

  const listo = resultado !== null && resultado.clave === clave
  return {
    compras: listo ? resultado.compras : null,
    error: listo ? resultado.error : null,
    calculando: clave !== null && !listo,
  }
}
