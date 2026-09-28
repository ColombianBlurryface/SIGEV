import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '@/services/api'
import { inventarioService } from '@/services/inventarioService'
import type { ElementoInventario } from '@/types/inventario'

interface Resultado {
  intento: number
  elementos: ElementoInventario[]
  error: string | null
}

const ordenar = (lista: ElementoInventario[]) =>
  [...lista].sort(
    (a, b) => a.categoria_inventario.localeCompare(b.categoria_inventario) || a.nombre.localeCompare(b.nombre),
  )

export function useInventario() {
  const [intento, setIntento] = useState(0)
  const [resultado, setResultado] = useState<Resultado | null>(null)

  useEffect(() => {
    let activo = true

    inventarioService
      .listar()
      .then((elementos) => {
        if (activo) setResultado({ intento, elementos, error: null })
      })
      .catch((err: unknown) => {
        if (!activo) return
        const error = err instanceof ApiError ? err.message : 'No fue posible cargar el inventario.'
        setResultado((anterior) => ({ intento, elementos: anterior?.elementos ?? [], error }))
      })

    return () => {
      activo = false
    }
  }, [intento])

  const recargar = useCallback(() => setIntento((n) => n + 1), [])

  const guardarLocal = useCallback((elemento: ElementoInventario) => {
    setResultado((anterior) => {
      if (!anterior) return anterior
      const sinElemento = anterior.elementos.filter((e) => e.id !== elemento.id)
      return { ...anterior, elementos: ordenar([...sinElemento, elemento]) }
    })
  }, [])

  const cargando = resultado?.intento !== intento

  return {
    elementos: resultado?.elementos ?? [],
    cargando,
    error: cargando ? null : (resultado?.error ?? null),
    recargar,
    guardarLocal,
  }
}
