/**
 * Buscador y botones para filtrar la lista de eventos por estado.
 */
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { ESTADOS_EVENTO, ORDEN_ESTADOS } from '@/lib/estadosEvento'
import { cn } from '@/lib/utils'
import type { EstadoEvento, EventoListado } from '@/types/evento'

export type FiltroEstado = EstadoEvento | 'todos'

interface FiltrosEventosProps {
  eventos: EventoListado[]
  busqueda: string
  onBusqueda: (valor: string) => void
  estado: FiltroEstado
  onEstado: (estado: FiltroEstado) => void
}

export function FiltrosEventos({ eventos, busqueda, onBusqueda, estado, onEstado }: FiltrosEventosProps) {
  const opciones: { valor: FiltroEstado; etiqueta: string; cantidad: number }[] = [
    { valor: 'todos', etiqueta: 'Todos', cantidad: eventos.length },
    ...ORDEN_ESTADOS.map((e) => ({
      valor: e,
      etiqueta: ESTADOS_EVENTO[e].etiqueta,
      cantidad: eventos.filter((ev) => ev.estado === e).length,
    })),
  ]

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <label htmlFor="buscar-evento" className="sr-only">
          Buscar evento
        </label>
        <Search aria-hidden="true" className="pointer-events-none absolute top-3 left-3.5 size-[18px] text-muted-foreground" />
        <Input
          id="buscar-evento"
          type="search"
          value={busqueda}
          onChange={(e) => onBusqueda(e.target.value)}
          placeholder="Buscar por nombre o tipo de evento"
          className="h-11 pl-10 text-[14.5px]"
        />
      </div>
      <div role="group" aria-label="Filtrar por estado" className="flex flex-wrap gap-2">
        {opciones.map(({ valor, etiqueta, cantidad }) => {
          const activo = valor === estado
          return (
            <button
              key={valor}
              type="button"
              aria-pressed={activo}
              onClick={() => onEstado(valor)}
              className={cn(
                'h-[34px] cursor-pointer rounded-full border px-3.5 text-[13px] font-semibold outline-none focus-visible:ring-[3px] focus-visible:ring-ring',
                activo ? 'border-foreground bg-foreground text-background dark:border-primary dark:bg-primary dark:text-primary-foreground' : 'border-border bg-card text-subtle hover:bg-muted',
              )}
            >
              {etiqueta} · {cantidad}
            </button>
          )
        })}
      </div>
    </div>
  )
}
