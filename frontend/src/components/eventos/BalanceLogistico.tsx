/**
 * Componente de Balance Logístico (HU-31 · RF-39, RF-40).
 *
 * Muestra el balance consolidado de recursos necesarios para el evento integrando:
 * personal, alimentos, bebidas, mobiliario y servicios, indicando la cantidad requerida
 * y el estado de disponibilidad de cada elemento.
 */
import {
  Armchair,
  Layers,
  RefreshCw,
  Sparkles,
  Users,
  Utensils,
  Wine,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatearNumero } from '@/lib/formato'
import { cn } from '@/lib/utils'
import { balanceService } from '@/services/balanceService'
import type {
  BalanceLogisticoEvento,
  CategoriaBalance,
  EstadoRecursoBalance,
} from '@/types/balance'

interface BalanceLogisticoProps {
  eventoId: number
  refrescoKey?: unknown
  ocultarTitulo?: boolean
  className?: string
}

const CONFIG_CATEGORIAS: Record<
  CategoriaBalance,
  { etiqueta: string; icono: typeof Users; clases: string }
> = {
  personal: { etiqueta: 'Personal', icono: Users, clases: 'bg-accent text-accent-foreground' },
  alimento: { etiqueta: 'Alimentos', icono: Utensils, clases: 'bg-alimentos-soft text-alimentos' },
  bebida: { etiqueta: 'Bebidas', icono: Wine, clases: 'bg-bebidas-soft text-bebidas' },
  mobiliario: { etiqueta: 'Mobiliario', icono: Armchair, clases: 'bg-mobiliario-soft text-mobiliario' },
  servicio: { etiqueta: 'Servicios', icono: Sparkles, clases: 'bg-servicios-soft text-servicios' },
}

const CONFIG_ESTADOS: Record<
  EstadoRecursoBalance,
  { etiqueta: string; clases: string; punto: string }
> = {
  disponible: {
    etiqueta: 'Disponible',
    clases: 'bg-success-soft text-success-foreground',
    punto: 'bg-success-foreground',
  },
  por_comprar: {
    etiqueta: 'Por comprar',
    clases: 'bg-warning-soft text-warning-foreground',
    punto: 'bg-warning-foreground',
  },
  por_conseguir: {
    etiqueta: 'Por conseguir',
    clases: 'bg-accent text-accent-foreground',
    punto: 'bg-accent-foreground',
  },
  pendiente: {
    etiqueta: 'Pendiente',
    clases: 'bg-destructive-soft text-destructive-foreground',
    punto: 'bg-destructive-foreground',
  },
}

function EstadoRecursoBadge({ estado }: { estado: EstadoRecursoBalance }) {
  const conf = CONFIG_ESTADOS[estado] ?? CONFIG_ESTADOS.pendiente
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-bold whitespace-nowrap',
        conf.clases
      )}
    >
      <span aria-hidden="true" className={cn('size-1.5 rounded-full', conf.punto)} />
      {conf.etiqueta}
    </span>
  )
}

export function BalanceLogistico({
  eventoId,
  refrescoKey,
  ocultarTitulo = false,
  className,
}: BalanceLogisticoProps) {
  const [balance, setBalance] = useState<BalanceLogisticoEvento | null>(null)
  const [cargando, setCargando] = useState(true)
  const [sincronizando, setSincronizando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [categoriaFiltro, setCategoriaFiltro] = useState<CategoriaBalance | 'todas'>('todas')

  const cargarBalance = useCallback(
    async (sincronizar = false) => {
      if (sincronizar) setSincronizando(true)
      else setCargando(true)
      setError(null)
      try {
        const data = sincronizar
          ? await balanceService.sincronizar(eventoId)
          : await balanceService.obtener(eventoId)
        setBalance(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar el balance logístico.')
      } finally {
        setCargando(false)
        setSincronizando(false)
      }
    },
    [eventoId]
  )

  useEffect(() => {
    cargarBalance()
  }, [cargarBalance, refrescoKey])

  const recursosFiltrados = useMemo(() => {
    if (!balance) return []
    if (categoriaFiltro === 'todas') return balance.recursos
    return balance.recursos_por_categoria[categoriaFiltro] || []
  }, [balance, categoriaFiltro])

  if (cargando && !balance) {
    return (
      <Card className={cn('flex flex-col gap-4 p-5', className)}>
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Skeleton className="h-16 rounded-[10px]" />
          <Skeleton className="h-16 rounded-[10px]" />
          <Skeleton className="h-16 rounded-[10px]" />
          <Skeleton className="h-16 rounded-[10px]" />
        </div>
        <Skeleton className="h-32 rounded-[10px]" />
      </Card>
    )
  }

  if (error && !balance) {
    return (
      <Card className={cn('flex flex-col gap-3 p-5', className)}>
        <Alert variant="error">{error}</Alert>
        <Button variant="secondary" size="sm" onClick={() => cargarBalance()} className="self-start">
          <RefreshCw aria-hidden="true" className="size-3.5" />
          Reintentar
        </Button>
      </Card>
    )
  }

  if (!balance) return null

  const { resumen } = balance

  return (
    <section aria-label="Balance Logístico del Evento" className={cn('flex flex-col gap-4 rounded-[12px] border border-border bg-background p-4 sm:p-5', className)}>
      {/* Encabezado */}
      <div className={cn('flex flex-wrap items-center justify-between gap-3', ocultarTitulo && 'justify-end')}>
        {!ocultarTitulo && (
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-[8px] bg-primary text-primary-foreground">
              <Layers className="size-4" />
            </span>
            <div>
              <h3 className="font-display text-base font-bold">Balance Logístico</h3>
              <p className="text-xs text-muted-foreground">
                Consolidado de recursos necesarios para el evento
              </p>
            </div>
          </div>
        )}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => cargarBalance(true)}
          disabled={sincronizando}
          className="gap-1.5"
          title="Actualiza y sincroniza el balance con los datos más recientes del evento"
        >
          <RefreshCw aria-hidden="true" className={cn('size-3.5', sincronizando && 'animate-spin')} />
          {sincronizando ? 'Sincronizando…' : 'Sincronizar'}
        </Button>
      </div>

      {/* Indicadores de Resumen */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
        <div className="flex flex-col gap-0.5 rounded-[10px] bg-background px-3 py-2">
          <span className="text-[11.5px] font-semibold text-muted-foreground">Total Recursos</span>
          <span className="font-display text-xl font-bold">{resumen.total_recursos}</span>
        </div>
        <div className="flex flex-col gap-0.5 rounded-[10px] bg-success-soft/60 px-3 py-2 text-success-foreground">
          <span className="text-[11.5px] font-semibold">Disponibles</span>
          <span className="font-display text-xl font-bold">{resumen.disponibles}</span>
        </div>
        <div className="flex flex-col gap-0.5 rounded-[10px] bg-warning-soft/60 px-3 py-2 text-warning-foreground">
          <span className="text-[11.5px] font-semibold">Por comprar</span>
          <span className="font-display text-xl font-bold">{resumen.por_comprar}</span>
        </div>
        <div className="flex flex-col gap-0.5 rounded-[10px] bg-accent/60 px-3 py-2 text-accent-foreground">
          <span className="text-[11.5px] font-semibold">Por conseguir</span>
          <span className="font-display text-xl font-bold">{resumen.por_conseguir}</span>
        </div>
        <div className="col-span-2 flex flex-col gap-0.5 rounded-[10px] bg-destructive-soft/60 px-3 py-2 text-destructive-foreground sm:col-span-1">
          <span className="text-[11.5px] font-semibold">Pendientes</span>
          <span className="font-display text-xl font-bold">{resumen.pendientes}</span>
        </div>
      </div>

      {/* Barra de progreso de completitud */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-muted-foreground">Completitud del balance</span>
          <span className="text-foreground">{resumen.porcentaje_completitud}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${resumen.porcentaje_completitud}%` }}
          />
        </div>
      </div>

      {/* Filtro por Categorías */}
      <div className="flex flex-wrap gap-1.5 border-t border-border pt-3">
        <button
          type="button"
          onClick={() => setCategoriaFiltro('todas')}
          className={cn(
            'cursor-pointer rounded-full px-3 py-1 text-xs font-semibold transition-colors',
            categoriaFiltro === 'todas'
              ? 'bg-foreground text-background'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          )}
        >
          Todas ({resumen.total_recursos})
        </button>
        {(['personal', 'alimento', 'bebida', 'mobiliario', 'servicio'] as CategoriaBalance[]).map(
          (cat) => {
            const conf = CONFIG_CATEGORIAS[cat]
            const totalCat = balance.recursos_por_categoria[cat]?.length || 0
            const activo = categoriaFiltro === cat
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoriaFiltro(cat)}
                className={cn(
                  'flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                  activo
                    ? 'bg-foreground text-background'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                <span>{conf.etiqueta}</span>
                <span className="opacity-75">({totalCat})</span>
              </button>
            )
          }
        )}
      </div>

      {/* Lista de Recursos Requeridos */}
      {recursosFiltrados.length === 0 ? (
        <p className="rounded-[10px] bg-background px-3 py-4 text-center text-xs text-muted-foreground">
          No hay recursos requeridos en esta categoría.
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-border rounded-[10px] border border-border bg-card">
          {recursosFiltrados.map((rec) => {
            const confCat = CONFIG_CATEGORIAS[rec.categoria]
            const IconoCat = confCat.icono
            return (
              <div
                key={rec.id}
                className="flex flex-col gap-1.5 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-2.5">
                  <span
                    aria-hidden="true"
                    className={cn(
                      'flex size-7 shrink-0 items-center justify-center rounded-[7px] text-xs',
                      confCat.clases
                    )}
                  >
                    <IconoCat className="size-3.5" />
                  </span>
                  <div className="flex flex-col">
                    <span className="text-[13.5px] font-bold text-foreground">
                      {rec.recurso_nombre}
                    </span>
                    {rec.notas && (
                      <span className="text-[12px] text-muted-foreground">{rec.notas}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  {/* Cantidad requerida (Criterio central de la HU-31) */}
                  <div className="flex flex-col text-right">
                    <span className="text-[13px] font-extrabold text-foreground">
                      {formatearNumero(rec.cantidad_requerida)} {rec.unidad_medida}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Disp: {formatearNumero(rec.cantidad_disponible)} {rec.unidad_medida}
                    </span>
                  </div>

                  <EstadoRecursoBadge estado={rec.estado} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
