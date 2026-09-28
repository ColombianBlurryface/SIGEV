import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '@/services/api'
import { inventarioService } from '@/services/inventarioService'
import type { MovimientoInventario } from '@/types/inventario'

interface Resultado {
  clave: string
  movimientos: MovimientoInventario[]
  error: string | null
}

export function useMovimientos(elementoId: number | null, limite: number) {
  const [intento, setIntento] = useState(0)
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const clave = `${elementoId ?? 'todos'}-${limite}-${intento}`

  useEffect(() => {
    let activo = true
    const claveActual = `${elementoId ?? 'todos'}-${limite}-${intento}`

    inventarioService
      .listarMovimientos({ elementoId: elementoId ?? undefined, limite })
      .then((movimientos) => {
        if (activo) setResultado({ clave: claveActual, movimientos, error: null })
      })
      .catch((err: unknown) => {
        if (!activo) return
        const error = err instanceof ApiError ? err.message : 'No fue posible cargar los movimientos del inventario.'
        setResultado((anterior) => ({ clave: claveActual, movimientos: anterior?.movimientos ?? [], error }))
      })

    return () => {
      activo = false
    }
  }, [elementoId, limite, intento])

  const recargar = useCallback(() => setIntento((n) => n + 1), [])
  const cargando = resultado?.clave !== clave

  return {
    movimientos: resultado?.movimientos ?? [],
    cargando,
    error: cargando ? null : (resultado?.error ?? null),
    recargar,
  }
}
