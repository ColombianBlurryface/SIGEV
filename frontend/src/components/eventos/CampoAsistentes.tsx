/**
 * Campo de número de asistentes con la validación de la HU-07 (entre 40 y 600).
 * Incluye botones de -10/+10, una barra que muestra dónde cae el número y los avisos:
 * error si está fuera de rango y aviso de modalidad buffet desde 301 asistentes.
 */
import { Check, Minus, Plus } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { ASISTENTES_MAX, ASISTENTES_MIN, BUFFET_DESDE, validarAsistentes } from '@/lib/reglasEvento'
import { cn } from '@/lib/utils'

// La barra va de 0 a 700 asistentes para que se vean los dos lados del rango permitido (40–600)
const ESCALA_MAX = 700
const PASO = 10

// Convierte un número de asistentes en la posición (en %) dentro de la barra
const porcentaje = (valor: number) => `${(Math.min(Math.max(valor, 0), ESCALA_MAX) / ESCALA_MAX) * 100}%`

interface CampoAsistentesProps {
  id?: string
  valor: string
  onChange: (valor: string) => void
  mostrarVacio?: boolean
  disabled?: boolean
}

export function CampoAsistentes({ id = 'asistentes', valor, onChange, mostrarVacio = false, disabled }: CampoAsistentesProps) {
  const validacion = validarAsistentes(valor)
  const fueraDeRango = validacion.estado === 'bajo' || validacion.estado === 'alto'
  const mostrarError = fueraDeRango || (mostrarVacio && validacion.estado === 'vacio')
  const cantidadActual = validacion.cantidad ?? 0

  // Suma o resta con los botones -10 / +10, sin bajar de 0
  const ajustar = (delta: number) => onChange(String(Math.max(0, cantidadActual + delta)))

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-muted p-5">
      <div className="flex items-baseline justify-between gap-4">
        <Label htmlFor={id}>Número de asistentes</Label>
        <span id={`${id}-ayuda`} className="text-[13px] text-muted-foreground">
          Entre {ASISTENTES_MIN} y {ASISTENTES_MAX} personas
        </span>
      </div>

      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => ajustar(-PASO)}
            disabled={disabled || cantidadActual <= 0}
            aria-label={`Restar ${PASO} asistentes`}
            className="h-12 w-11"
          >
            <Minus />
          </Button>
          <input
            id={id}
            name="asistentes"
            type="number"
            inputMode="numeric"
            min={ASISTENTES_MIN}
            max={ASISTENTES_MAX}
            step={1}
            value={valor}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            aria-invalid={mostrarError}
            aria-describedby={mostrarError ? `${id}-ayuda ${id}-mensaje` : `${id}-ayuda`}
            className={cn(
              'h-12 w-32 rounded-[10px] border-2 bg-card text-center font-display text-[22px] font-bold text-foreground outline-none transition-[color,box-shadow]',
              'focus-visible:ring-[3px] focus-visible:ring-ring disabled:opacity-60',
              mostrarError ? 'border-destructive' : 'border-primary',
            )}
          />
          <Button
            variant="secondary"
            size="icon"
            onClick={() => ajustar(PASO)}
            disabled={disabled}
            aria-label={`Sumar ${PASO} asistentes`}
            className="h-12 w-11"
          >
            <Plus />
          </Button>
        </div>

        <div aria-hidden="true" className="flex flex-1 flex-col gap-2">
          <div className="relative h-2.5 rounded-full bg-range-out">
            <div
              className="absolute inset-y-0 bg-range-ok"
              style={{ left: porcentaje(ASISTENTES_MIN), width: `calc(${porcentaje(BUFFET_DESDE - 1)} - ${porcentaje(ASISTENTES_MIN)})` }}
            />
            <div
              className="absolute inset-y-0 bg-range-buffet"
              style={{ left: porcentaje(BUFFET_DESDE - 1), width: `calc(${porcentaje(ASISTENTES_MAX)} - ${porcentaje(BUFFET_DESDE - 1)})` }}
            />
            {validacion.cantidad !== null && (
              <div
                className={cn(
                  'absolute -top-1.5 -ml-[11px] size-[22px] rounded-full border-[5px] bg-card transition-[left]',
                  fueraDeRango ? 'border-destructive' : 'border-primary',
                )}
                style={{ left: porcentaje(cantidadActual) }}
              />
            )}
          </div>
          <div className="relative h-4 text-[11.5px] font-semibold text-muted-foreground">
            {[ASISTENTES_MIN, BUFFET_DESDE - 1, ASISTENTES_MAX].map((marca) => (
              <span key={marca} className="absolute -translate-x-1/2" style={{ left: porcentaje(marca) }}>
                {marca}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-subtle">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-[3px] bg-range-ok" />
              Servida ({ASISTENTES_MIN}–{BUFFET_DESDE - 1})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-[3px] bg-range-buffet" />
              Buffet ({BUFFET_DESDE}–{ASISTENTES_MAX})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-[3px] bg-range-out" />
              Fuera de rango
            </span>
          </div>
        </div>
      </div>

      <div id={`${id}-mensaje`}>
        {mostrarError && (
          <Alert variant="error">
            {fueraDeRango && <strong>Asistentes fuera de rango. </strong>}
            {validacion.mensaje}
          </Alert>
        )}
        {validacion.estado === 'valido' && (
          <div className="flex flex-col gap-3">
            <p className="flex items-center gap-2 text-[13.5px] font-semibold text-success-foreground">
              <Check aria-hidden="true" className="size-[18px]" />
              Dentro del rango permitido ({ASISTENTES_MIN} a {ASISTENTES_MAX})
            </p>
            {validacion.esBuffet && (
              <Alert variant="info">
                <strong>Más de {BUFFET_DESDE - 1} asistentes:</strong> el evento se planificará en modalidad buffet.
              </Alert>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
