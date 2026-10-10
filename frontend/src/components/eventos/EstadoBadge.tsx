/**
 * Etiquetas de color para el estado de un evento y para la modalidad buffet.
 */
import { ESTADOS_EVENTO } from '@/lib/estadosEvento'
import { cn } from '@/lib/utils'
import type { EstadoEvento } from '@/types/evento'

export function EstadoBadge({ estado, className }: { estado: EstadoEvento; className?: string }) {
  const config = ESTADOS_EVENTO[estado] ?? ESTADOS_EVENTO.planificacion
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12.5px] font-bold whitespace-nowrap',
        config.clases,
        className,
      )}
    >
      <span aria-hidden="true" className={cn('size-1.5 rounded-full', config.punto)} />
      {config.etiqueta}
    </span>
  )
}

export function BuffetBadge({ className }: { className?: string }) {
  return (
    <span className={cn('rounded-md bg-warning-soft px-1.5 py-0.5 text-[11px] font-bold text-warning-foreground', className)}>
      Buffet
    </span>
  )
}
