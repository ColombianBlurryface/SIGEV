/**
 * Tabla de eventos. Cada fila es un botón: al hacer clic se selecciona el evento
 * y se muestra su detalle en el panel lateral.
 */
import { ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { ESTADOS_EVENTO } from '@/lib/estadosEvento'
import { capitalizar, formatearFecha, formatearNumero } from '@/lib/formato'
import { cn } from '@/lib/utils'
import type { EventoListado } from '@/types/evento'
import { BuffetBadge, EstadoBadge } from './EstadoBadge'

const COLUMNAS = 'grid grid-cols-[minmax(0,1fr)_128px_104px_128px_20px] items-center gap-3'

interface TablaEventosProps {
  eventos: EventoListado[]
  seleccionadoId: number | null
  onSeleccionar: (id: number) => void
}

export function TablaEventos({ eventos, seleccionadoId, onSeleccionar }: TablaEventosProps) {
  return (
    <Card className="overflow-hidden rounded-[14px]">
      <div
        className={cn(
          COLUMNAS,
          'border-b border-border bg-muted px-[18px] py-3 text-xs font-bold tracking-[0.04em] text-muted-foreground uppercase',
        )}
      >
        <span>Evento</span>
        <span>Fecha</span>
        <span>Asistentes</span>
        <span>Estado</span>
        <span />
      </div>

      {eventos.length === 0 ? (
        <p className="px-[18px] py-10 text-center text-sm text-subtle">No hay eventos que coincidan con la búsqueda o el filtro.</p>
      ) : (
        <ul>
          {eventos.map((evento) => {
            const seleccionado = evento.id === seleccionadoId
            return (
              <li key={evento.id} className="border-b border-border last:border-b-0">
                <button
                  type="button"
                  aria-pressed={seleccionado}
                  aria-label={`${evento.nombre_evento}, ${formatearFecha(evento.fecha_evento)}, ${evento.asistentes} asistentes, ${ESTADOS_EVENTO[evento.estado]?.etiqueta ?? evento.estado}`}
                  onClick={() => onSeleccionar(evento.id)}
                  className={cn(
                    COLUMNAS,
                    'w-full cursor-pointer px-[18px] py-3.5 text-left text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-inset',
                    seleccionado ? 'bg-accent/60 shadow-[inset_3px_0_0_var(--primary)]' : 'hover:bg-muted',
                  )}
                >
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate font-bold">{evento.nombre_evento}</span>
                    <span className="text-[12.5px] text-muted-foreground">
                      {capitalizar(evento.tipo_evento)} · {formatearNumero(evento.duracion_horas)} h
                    </span>
                  </span>
                  <span className="text-subtle">{formatearFecha(evento.fecha_evento)}</span>
                  <span className="flex items-center gap-1.5">
                    <span className="font-semibold">{formatearNumero(evento.asistentes)}</span>
                    {evento.es_modalidad_buffet && <BuffetBadge />}
                  </span>
                  <span>
                    <EstadoBadge estado={evento.estado} />
                  </span>
                  <ChevronRight aria-hidden="true" className="size-[18px] text-faint" />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
