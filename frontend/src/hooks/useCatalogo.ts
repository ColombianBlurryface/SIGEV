/**
 * Carga los productos del catálogo, opcionalmente filtrados por clasificación.
 */
import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '@/services/api'
import { catalogoService } from '@/services/catalogoService'
import type { ProductoCatalogo } from '@/types/catalogo'
import type { ClasificacionProducto } from '@/types/evento'

interface Resultado {
  clave: string
  productos: ProductoCatalogo[]
  error: string | null
}

export function useCatalogo(clasificacion?: ClasificacionProducto) {
  const [intento, setIntento] = useState(0)
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const clave = `${clasificacion ?? 'todos'}-${intento}`

  useEffect(() => {
    let activo = true
    const claveActual = `${clasificacion ?? 'todos'}-${intento}`

    catalogoService
      .listar(clasificacion)
      .then((productos) => {
        if (activo) setResultado({ clave: claveActual, productos, error: null })
      })
      .catch((err: unknown) => {
        if (!activo) return
        const error = err instanceof ApiError ? err.message : 'No fue posible cargar el catálogo.'
        setResultado({ clave: claveActual, productos: [], error })
      })

    return () => {
      activo = false
    }
  }, [clasificacion, intento])

  const recargar = useCallback(() => setIntento((n) => n + 1), [])
  const listo = resultado?.clave === clave

  return {
    productos: listo ? resultado.productos : [],
    cargando: !listo,
    error: listo ? resultado.error : null,
    recargar,
  }
}
