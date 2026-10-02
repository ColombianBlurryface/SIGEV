/**
 * Panel con el detalle de un evento (HU-06): datos generales y requerimientos agrupados
 * por categoría, con cantidades y el costo estimado total. El mobiliario indica cuánto es
 * propio y cuánto hay que alquilar según el inventario actual (HU-12). Las bebidas generales
 * y las de coctelería se muestran en secciones separadas, cada una con su costo (HU-13).
 */
import { RotateCw } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useEventoDetalle } from '@/hooks/useEventoDetalle'
import { describirReparto, type RepartoMobiliario } from '@/lib/alquiler'
import {
  CATEGORIAS,
  categoriaDe,
  esTipoBebida,
  etiquetaServicio,
  TIPO_MOBILIARIO,
  TIPOS_BEBIDA,
  type ConfigCategoria,
  type TipoBebida,
} from '@/lib/categorias'
import { capitalizar, formatearFecha, formatearMoneda, formatearNumero } from '@/lib/formato'
import { cn } from '@/lib/utils'
import type { EventoDetalle, EventoListado } from '@/types/evento'
import { AvisoAlquiler, OrigenBadge } from './AlquilerMobiliario'
import { BuffetBadge, EstadoBadge } from './EstadoBadge'

interface ItemRequerimiento {
  id: string
  nombre: string
  nota?: string
  cantidad: string
  costo: string | null
  reparto?: RepartoMobiliario // Solo mobiliario: unidades propias y a alquilar
}

// Secciones del detalle, en orden. Las bebidas se dividen en generales y bar de coctelería (HU-13).
type Seccion = 'alimentos' | TipoBebida | 'mobiliario' | 'servicios'

const SECCIONES: Record<Seccion, ConfigCategoria> = {
  alimentos: CATEGORIAS.alimentos,
  bebida_general: TIPOS_BEBIDA.bebida_general,
  bar_cocteleria: TIPOS_BEBIDA.bar_cocteleria,
  mobiliario: CATEGORIAS.mobiliario,
  servicios: CATEGORIAS.servicios,
}

/**
 * Ordena los requerimientos del evento en las secciones que se muestran en pantalla.
 * - Los productos del catálogo van a Alimentos, Bebidas generales o Bar de coctelería según su clasificación.
 * - Los requerimientos adicionales van a Mobiliario (tipo "mobiliario") o a Servicios.
 */
function agruparRequerimientos(detalle: EventoDetalle) {
  const grupos: Record<Seccion, ItemRequerimiento[]> = {
    alimentos: [],
    bebida_general: [],
    bar_cocteleria: [],
    mobiliario: [],
    servicios: [],
  }
  const costos: Partial<Record<Seccion, number>> = {}

  for (const producto of detalle.productos_calculados) {
    const seccion: Seccion = esTipoBebida(producto.clasificacion)
      ? producto.clasificacion
      : categoriaDe(producto.clasificacion) === 'alimentos'
        ? 'alimentos'
        : 'mobiliario'
    costos[seccion] = (costos[seccion] ?? 0) + Number(producto.costo_estimado || 0)
    grupos[seccion].push({
      id: `p-${producto.id}`,
      nombre: producto.nombre,
      nota: producto.componentes_menu ?? undefined,
      cantidad: `${formatearNumero(producto.cantidad_con_margen)} ${producto.unidad_entrega}`,
      costo: formatearMoneda(producto.costo_estimado),
    })
  }

  for (const servicio of detalle.servicios_adicionales) {
    const esMobiliario = servicio.tipo === TIPO_MOBILIARIO
    // El backend ya compara el mobiliario con el stock actual del inventario
    const reparto = esMobiliario
      ? { propias: servicio.unidades_propias ?? 0, alquilar: servicio.unidades_alquilar ?? servicio.cantidad ?? 0 }
      : undefined
    const origen = reparto
      ? `${servicio.producto_id === null ? 'No está en el inventario · ' : ''}${describirReparto(reparto)}`
      : null
    grupos[esMobiliario ? 'mobiliario' : 'servicios'].push({
      id: `s-${servicio.id}`,
      nombre: esMobiliario
        ? servicio.descripcion
        : `${etiquetaServicio(servicio.tipo)}${servicio.descripcion ? ` · ${servicio.descripcion}` : ''}`,
      nota: [origen, servicio.notas].filter(Boolean).join(' · ') || undefined,
      reparto,
      cantidad:
        servicio.cantidad === null ? '—' : `${formatearNumero(servicio.cantidad)}${esMobiliario ? ' und' : ''}`,
      costo: null,
    })
  }

  // El costo estimado solo incluye alimentos y bebidas; mobiliario y servicios se cotizan aparte
  const total = detalle.productos_calculados.reduce((suma, p) => suma + Number(p.costo_estimado || 0), 0)
  const unidadesAlquilar = grupos.mobiliario.reduce((suma, item) => suma + (item.reparto?.alquilar ?? 0), 0)
  return {
    grupos,
    costos,
    total,
    unidadesAlquilar,
    vacio: detalle.productos_calculados.length + detalle.servicios_adicionales.length === 0,
  }
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

        {requerimientos && (
          <AvisoAlquiler asistentes={evento.asistentes} unidadesAlquilar={requerimientos.unidadesAlquilar} className="text-[13px]" />
        )}

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
          (Object.keys(SECCIONES) as Seccion[])
            .filter((seccion) => requerimientos.grupos[seccion].length > 0)
            .map((seccion) => {
              const { etiqueta, icono: Icono, clases } = SECCIONES[seccion]
              const costo = requerimientos.costos[seccion]
              return (
                <section key={seccion} aria-label={etiqueta} className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <span aria-hidden="true" className={cn('flex size-[26px] items-center justify-center rounded-[7px]', clases)}>
                      <Icono className="size-[15px]" />
                    </span>
                    <span className="text-[13.5px] font-bold">{etiqueta}</span>
                    {costo !== undefined && (
                      <span className="ml-auto text-[12.5px] font-semibold text-subtle">{formatearMoneda(costo)}</span>
                    )}
                  </div>
                  <ul className="flex flex-col gap-1">
                    {requerimientos.grupos[seccion].map((item) => (
                      <li key={item.id} className="grid grid-cols-[minmax(0,1fr)_auto_88px] gap-2 text-[13px]">
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate" title={item.nombre}>
                            {item.nombre}
                          </span>
                          {(item.reparto || item.nota) && (
                            <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
                              {item.reparto && <OrigenBadge reparto={item.reparto} />}
                              {item.nota && (
                                // En el mobiliario la nota dice cuánto alquilar: se deja bajar de línea en vez de cortarla
                                <span
                                  className={cn('text-xs text-muted-foreground', item.reparto ? 'leading-snug' : 'truncate')}
                                  title={item.nota}
                                >
                                  {item.nota}
                                </span>
                              )}
                            </span>
                          )}
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
