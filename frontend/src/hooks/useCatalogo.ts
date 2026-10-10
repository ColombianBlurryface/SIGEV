/**
 * Carga los productos del catálogo, opcionalmente filtrados por clasificación.
 * Con incluirInactivos también trae los desactivados (solo para la pantalla de administración).
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

export function useCatalogo(clasificacion?: ClasificacionProducto, incluirInactivos = false) {
  const [intento, setIntento] = useState(0)
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const clave = `${clasificacion ?? 'todos'}-${incluirInactivos}-${intento}`

  useEffect(() => {
    let activo = true
    const claveActual = `${clasificacion ?? 'todos'}-${incluirInactivos}-${intento}`

    catalogoService
      .listar(clasificacion, incluirInactivos)
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
  }, [clasificacion, incluirInactivos, intento])

  const recargar = useCallback(() => setIntento((n) => n + 1), [])
  const listo = resultado?.clave === clave

  return {
    productos: listo ? resultado.productos : [],
    cargando: !listo,
    error: listo ? resultado.error : null,
    recargar,
  }
}
