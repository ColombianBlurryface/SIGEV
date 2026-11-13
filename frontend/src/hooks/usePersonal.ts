/**
 * Carga el personal activo (hoy, los meseros) y permite recargarlo después de registrar o eliminar a alguien.
 */
import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '@/services/api'
import { personalService } from '@/services/personalService'
import type { Personal } from '@/types/personal'

interface Resultado {
  clave: number
  personal: Personal[]
  error: string | null
}

export function usePersonal() {
  const [intento, setIntento] = useState(0)
  const [resultado, setResultado] = useState<Resultado | null>(null)

  useEffect(() => {
    let activo = true
    personalService
      .listar('mesero')
      .then((personal) => {
        if (activo) setResultado({ clave: intento, personal, error: null })
      })
      .catch((err: unknown) => {
        if (activo) setResultado({ clave: intento, personal: [], error: err instanceof ApiError ? err.message : 'No fue posible cargar el personal.' })
      })
    return () => {
      activo = false
    }
  }, [intento])

  const recargar = useCallback(() => setIntento((n) => n + 1), [])
  const listo = resultado !== null && resultado.clave === intento
  // Mientras recarga se conserva la lista anterior para que no parpadee
  return { personal: resultado?.personal ?? [], cargando: !listo && resultado === null, error: listo ? resultado.error : null, recargar }
}
