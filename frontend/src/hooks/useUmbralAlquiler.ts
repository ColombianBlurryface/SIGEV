/**
 * Umbral de asistentes a partir del cual se avisa que hay que alquilar mobiliario (RN-03, P-05).
 *
 * El valor lo define el backend (MAX_OWNED_CAPACITY_THRESHOLD), así no queda escrito en la pantalla.
 * Se pide una sola vez y se guarda en memoria. Mientras llega, o si la consulta falla, se usa el
 * valor por defecto (200) para que el aviso no desaparezca.
 */
import { useEffect, useState } from 'react'
import { configuracionService } from '@/services/configuracionService'

const UMBRAL_POR_DEFECTO = 200

let umbralEnMemoria: number | null = null

export function useUmbralAlquiler() {
  const [umbral, setUmbral] = useState(umbralEnMemoria ?? UMBRAL_POR_DEFECTO)

  useEffect(() => {
    if (umbralEnMemoria !== null) return
    let activo = true
    configuracionService
      .obtener()
      .then(({ umbral_alquiler }) => {
        umbralEnMemoria = umbral_alquiler
        if (activo) setUmbral(umbral_alquiler)
      })
      .catch(() => {
        // Sin conexión con la configuración: se queda el valor por defecto
      })
    return () => {
      activo = false
    }
  }, [])

  return umbral
}
