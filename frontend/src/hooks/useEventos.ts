/**
 * Carga la lista de eventos desde la API y expone { eventos, cargando, error, recargar }.
 */
import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '@/services/api'
import { eventosService } from '@/services/eventosService'
import type { EventoListado } from '@/types/evento'

interface Resultado {
  intento: number
  eventos: EventoListado[]
  error: string | null
}

/*
 * Cómo funcionan los hooks de carga de datos (useEventos, useCatalogo, useInventario, etc.):
 * - "intento" es un contador; recargar() lo aumenta y eso vuelve a ejecutar la petición.
 * - "resultado" guarda a qué intento corresponde la respuesta. Si no coincide con el
 *   intento actual, significa que todavía está cargando.
 * - "activo" evita guardar una respuesta que llegó tarde, cuando el componente ya cambió o se cerró.
 */
export function useEventos() {
  const [intento, setIntento] = useState(0)
  const [resultado, setResultado] = useState<Resultado | null>(null)

  useEffect(() => {
    let activo = true

    eventosService
      .listar()
      .then((eventos) => {
        if (activo) setResultado({ intento, eventos, error: null })
      })
      .catch((err: unknown) => {
        if (!activo) return
        const error = err instanceof ApiError ? err.message : 'No fue posible cargar los eventos.'
        setResultado((anterior) => ({ intento, eventos: anterior?.eventos ?? [], error }))
      })

    return () => {
      activo = false
    }
  }, [intento])

  const recargar = useCallback(() => setIntento((n) => n + 1), [])
  const cargando = resultado?.intento !== intento

  return {
    eventos: resultado?.eventos ?? [],
    cargando,
    error: cargando ? null : (resultado?.error ?? null),
    recargar,
  }
}
