/**
 * Calcula los ingredientes a comprar de unos platos y unos asistentes ANTES de guardar el evento (HU-47). Se vuelve a
 * calcular cada vez que cambian los asistentes o los platos. Sin asistentes válidos no pregunta nada.
 */
import { useEffect, useState } from 'react'
import { ApiError } from '@/services/api'
import { eventosService } from '@/services/eventosService'
import type { ComprasIngredientes } from '@/types/evento'

interface Resultado {
  clave: string
  compras: ComprasIngredientes | null
  error: string | null
}

export function useComprasPrevias(asistentes: number | null, platoIds: number[]) {
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const clave = asistentes === null ? null : `${asistentes}:${[...platoIds].sort((a, b) => a - b).join(',')}`

  useEffect(() => {
    if (asistentes === null || clave === null) return
    let activo = true
    eventosService
      .calcularCompras(asistentes, platoIds)
      .then((compras) => {
        if (activo) setResultado({ clave, compras, error: null })
      })
      .catch((err: unknown) => {
        if (activo) setResultado({ clave, compras: null, error: err instanceof ApiError ? err.message : 'No fue posible calcular los ingredientes.' })
      })
    return () => {
      activo = false
    }
    // platoIds se resume en la clave: así no se recalcula por una lista nueva con los mismos platos
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave])

  const listo = resultado !== null && resultado.clave === clave
  return { compras: listo ? resultado.compras : null, error: listo ? resultado.error : null, calculando: clave !== null && !listo }
}
