import { RotateCw } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useEventoDetalle } from '@/hooks/useEventoDetalle'
import { CATEGORIAS, categoriaDe, type Categoria } from '@/lib/categorias'
import { capitalizar, formatearFecha, formatearMoneda, formatearNumero } from '@/lib/formato'
import { cn } from '@/lib/utils'
import type { EventoDetalle, EventoListado } from '@/types/evento'
import { BuffetBadge, EstadoBadge } from './EstadoBadge'

interface ItemRequerimiento {
  id: string
  nombre: string
  cantidad: string
  costo: string | null
}

function agruparRequerimientos(detalle: EventoDetalle) {
  const grupos: Record<Categoria, ItemRequerimiento[]> = { alimentos: [], bebidas: [], mobiliario: [], servicios: [] }

  for (const producto of detalle.productos_calculados) {
    grupos[categoriaDe(producto.clasificacion)].push({
      id: `p-${producto.id}`,
      nombre: producto.nombre,
      cantidad: `${formatearNumero(producto.cantidad_con_margen)} ${producto.unidad_entrega}`,
      costo: formatearMoneda(producto.costo_estimado),
    })
  }

  for (const servicio of detalle.servicios_adicionales) {
    grupos.servicios.push({
      id: `s-${servicio.id}`,
      nombre: servicio.descripcion || capitalizar(servicio.tipo),
      cantidad: servicio.cantidad === null ? '—' : formatearNumero(servicio.cantidad),
      costo: null,
    })
  }

  const total = detalle.productos_calculados.reduce((suma, p) => suma + Number(p.costo_estimado || 0), 0)
  return { grupos, total, vacio: detalle.productos_calculados.length + detalle.servicios_adicionales.length === 0 }
}

export function DetalleEvento({ evento }: { evento: EventoListado }) {
  const { detalle, cargando, error, recargar } = useEventoDetalle(evento.id)
  const requerimientos = detalle ? agruparRequerimientos(detalle) : null

  const datos = [
    { etiqueta: 'Fecha', valor: formatearFecha(evento.fecha_evento) },
    { etiqueta: 'Duración', valor: `${formatearNumero(evento.duracion_horas)} h` },
    { etiqueta: 'Asistentes', valor: formatearNumero(evento.asistentes) },
    { etiqueta: 'Modalidad', valor: evento.es_modalidad_buffet ? 'Buffet' : 'Servida a la mesa' },
  ]

  return (
    <Card aria-label="Detalle del evento" aria-live="polite" className="flex flex-col gap-5 p-6">
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center gap-2">
          <EstadoBadge estado={evento.estado} />
          {evento.es_modalidad_buffet && <BuffetBadge className="rounded-full px-2.5 py-1 text-[12.5px]" />}
        </div>
        <h2 className="font-display text-2xl leading-tight font-bold break-words">{evento.nombre_evento}</h2>
        <span className="text-sm text-subtle">{capitalizar(evento.tipo_evento)}</span>
      </div>

      <dl className="grid grid-cols-2 gap-3">
        {datos.map(({ etiqueta, valor }) => (
          <div key={etiqueta} className="flex flex-col gap-0.5 rounded-[10px] bg-background px-3 py-2.5">
            <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
            <dd className="text-sm font-bold">{valor}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-col gap-1">
        <span className="text-xs font-bold text-muted-foreground">Observaciones</span>
        <p className="text-[13.5px] leading-relaxed text-subtle">{evento.observaciones_generales || 'Sin observaciones.'}</p>
      </div>

      <div className="flex flex-col gap-3.5">
        <span className="text-xs font-bold tracking-[0.04em] text-muted-foreground uppercase">Requerimientos</span>

        {cargando && !requerimientos && (
          <div className="flex flex-col gap-2.5">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        )}

        {error && (
          <div className="flex flex-col items-start gap-3">
            <Alert variant="error">{error}</Alert>
            <Button variant="secondary" size="sm" onClick={recargar}>
              <RotateCw aria-hidden="true" />
              Reintentar
            </Button>
          </div>
        )}

        {requerimientos?.vacio && (
          <p className="rounded-[10px] bg-background px-3 py-3 text-[13.5px] text-subtle">
            Este evento aún no tiene requerimientos registrados.
          </p>
        )}

        {requerimientos &&
          !requerimientos.vacio &&
          (Object.keys(CATEGORIAS) as Categoria[])
            .filter((categoria) => requerimientos.grupos[categoria].length > 0)
            .map((categoria) => {
              const { etiqueta, icono: Icono, clases } = CATEGORIAS[categoria]
              return (
                <section key={categoria} aria-label={etiqueta} className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <span aria-hidden="true" className={cn('flex size-[26px] items-center justify-center rounded-[7px]', clases)}>
                      <Icono className="size-[15px]" />
                    </span>
                    <span className="text-[13.5px] font-bold">{etiqueta}</span>
                  </div>
                  <ul className="flex flex-col gap-1">
                    {requerimientos.grupos[categoria].map((item) => (
                      <li key={item.id} className="grid grid-cols-[minmax(0,1fr)_auto_88px] gap-2 text-[13px]">
                        <span className="truncate" title={item.nombre}>
                          {item.nombre}
                        </span>
                        <span className="text-right font-semibold whitespace-nowrap">{item.cantidad}</span>
                        <span className="text-right text-subtle">{item.costo ?? ''}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )
            })}
      </div>

      {requerimientos && !requerimientos.vacio && (
        <div className="flex items-baseline justify-between border-t border-border pt-3.5">
          <span className="text-[13px] text-subtle">Costo estimado · alimentos y bebidas</span>
          <span className="font-display text-[22px] font-bold">{formatearMoneda(requerimientos.total)}</span>
        </div>
      )}
    </Card>
  )
}
