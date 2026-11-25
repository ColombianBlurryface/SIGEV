/**
 * Fecha límite para conseguir un recurso del balance logístico (HU-33 · RF-42).
 *
 * En un recurso que todavía falta (pendiente, por comprar o por conseguir) se muestra un campo de fecha con su botón para
 * guardarla o quitarla. En uno que ya está listo solo se muestra la fecha, si la tenía. La fecha no puede ser posterior a la
 * del evento: el calendario no ofrece esos días y, si se escribe a mano, el servidor la rechaza y aquí se muestra el motivo.
 *
 * Se guarda con un botón (y no en cada cambio del campo) porque el navegador avisa de cada letra que se escribe en el año
 * («0002», «0020», «0202», «2026») y eso mandaría fechas sin sentido al servidor.
 */
import { CalendarClock, X } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { formatearFecha } from '@/lib/formato'
import type { RecursoBalance } from '@/types/balance'

interface FechaLimiteRecursoProps {
  recurso: RecursoBalance
  /** Fecha del evento (AAAA-MM-DD): el último día que se puede elegir */
  fechaEvento?: string | null
  /** Guarda la fecha (AAAA-MM-DD) o la quita (null). Si falla, lanza el error con el mensaje del servidor */
  onGuardar: (fecha: string | null) => Promise<void>
}

export function FechaLimiteRecurso({ recurso, fechaEvento, onGuardar }: FechaLimiteRecursoProps) {
  const idCampo = useId()
  const guardada = recurso.fecha_limite ?? ''
  const [borrador, setBorrador] = useState(guardada)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  // Si la fecha guardada cambia desde fuera (se sincronizó el balance, se guardó o se quitó), el campo la sigue
  useEffect(() => {
    setBorrador(guardada)
  }, [guardada])

  // Un recurso que ya está listo no necesita fecha: solo se muestra la que se había puesto
  if (recurso.estado === 'disponible') {
    if (!guardada) return null
    return (
      <span className="flex items-center gap-1 text-[12px] text-muted-foreground">
        <CalendarClock aria-hidden="true" className="size-3.5" />
        Fecha límite: {formatearFecha(guardada)}
      </span>
    )
  }

  const hayCambio = borrador !== '' && borrador !== guardada

  async function ejecutar(fecha: string | null) {
    setError(null)
    setAviso(null)
    setGuardando(true)
    try {
      await onGuardar(fecha)
      setAviso(fecha ? 'Fecha límite guardada.' : 'Fecha límite quitada.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la fecha límite.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form
      // Sin la validación nativa del navegador: si la fecha pasa del evento, el mensaje lo da el servidor, igual en todos los navegadores
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        if (hayCambio && !guardando) void ejecutar(borrador)
      }}
      className="mt-1 flex flex-col gap-1"
    >
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={idCampo} className="flex items-center gap-1 text-[11.5px] font-semibold text-muted-foreground">
          <CalendarClock aria-hidden="true" className="size-3.5" />
          Fecha límite
        </label>
        <input
          id={idCampo}
          type="date"
          aria-label={`Fecha límite de ${recurso.recurso_nombre}`}
          aria-invalid={error ? true : undefined}
          value={borrador}
          max={fechaEvento ?? undefined}
          disabled={guardando}
          onChange={(e) => {
            setBorrador(e.target.value)
            setError(null)
            setAviso(null)
          }}
          className="h-8 rounded-[8px] border border-input bg-card px-2 text-[12.5px] text-foreground outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring aria-invalid:border-destructive disabled:opacity-60"
        />
        {hayCambio ? (
          <Button type="submit" variant="secondary" size="sm" disabled={guardando} className="h-8 px-3 text-[12.5px]">
            {guardando ? 'Guardando…' : 'Guardar'}
          </Button>
        ) : guardada ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={guardando}
            onClick={() => void ejecutar(null)}
            aria-label={`Quitar la fecha de ${recurso.recurso_nombre}`}
            className="h-8 gap-1 px-2 text-[12.5px]"
          >
            <X aria-hidden="true" className="size-3.5" />
            Quitar
          </Button>
        ) : null}
      </div>
      {error && (
        <p role="alert" className="text-[12px] font-semibold text-destructive-foreground">
          {error}
        </p>
      )}
      {aviso && !error && (
        <p role="status" className="text-[12px] text-success-foreground">
          {aviso}
        </p>
      )}
    </form>
  )
}
