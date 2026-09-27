import { Check } from 'lucide-react'
import { Fragment } from 'react'
import { cn } from '@/lib/utils'

export type Paso = 1 | 2 | 3

const PASOS: { numero: Paso; etiqueta: string }[] = [
  { numero: 1, etiqueta: 'Datos del evento' },
  { numero: 2, etiqueta: 'Requerimientos' },
  { numero: 3, etiqueta: 'Resumen' },
]

export function PasosRegistro({ actual }: { actual: Paso }) {
  return (
    <ol aria-label="Progreso del registro" className="flex flex-wrap items-center gap-3">
      {PASOS.map(({ numero, etiqueta }, indice) => {
        const hecho = numero < actual
        const activo = numero === actual
        return (
          <Fragment key={numero}>
            {indice > 0 && (
              <li aria-hidden="true" className={cn('h-0.5 w-10 sm:w-16', numero <= actual ? 'bg-primary' : 'bg-border')} />
            )}
            <li aria-current={activo ? 'step' : undefined} className="flex items-center gap-2.5">
              <span
                className={cn(
                  'flex size-8 items-center justify-center rounded-full text-sm font-bold',
                  hecho && 'bg-primary text-primary-foreground',
                  activo && 'bg-primary text-primary-foreground ring-4 ring-ring',
                  !hecho && !activo && 'border border-input bg-card text-muted-foreground',
                )}
              >
                {hecho ? <Check aria-hidden="true" className="size-4" strokeWidth={3} /> : numero}
              </span>
              <span className={cn('text-sm', activo ? 'font-bold' : 'font-semibold text-subtle')}>
                {etiqueta}
                {hecho && <span className="sr-only"> (completado)</span>}
              </span>
            </li>
          </Fragment>
        )
      })}
    </ol>
  )
}
