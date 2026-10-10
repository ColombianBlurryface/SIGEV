/**
 * Carga el detalle de un evento (con sus requerimientos) cada vez que cambia el id seleccionado.
 */
import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '@/services/api'
import { eventosService } from '@/services/eventosService'
import type { EventoDetalle } from '@/types/evento'

interface Resultado {
  clave: string
  detalle: EventoDetalle | null
  error: string | null
}

export function useEventoDetalle(id: number | null) {
  const [intento, setIntento] = useState(0)
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const clave = id === null ? null : `${id}-${intento}`

  useEffect(() => {
    if (id === null) return
    let activo = true
    const claveActual = `${id}-${intento}`

    eventosService
      .obtener(id)
      .then((detalle) => {
        if (activo) setResultado({ clave: claveActual, detalle, error: null })
      })
      .catch((err: unknown) => {
        if (!activo) return
        const error = err instanceof ApiError ? err.message : 'No fue posible cargar el detalle del evento.'
        setResultado({ clave: claveActual, detalle: null, error })
      })

    return () => {
      activo = false
    }
  }, [id, intento])

  const recargar = useCallback(() => setIntento((n) => n + 1), [])
  const listo = resultado !== null && resultado.clave === clave

  return {
    detalle: listo ? resultado.detalle : null,
    cargando: clave !== null && !listo,
    error: listo ? resultado.error : null,
    recargar,
  }
}
