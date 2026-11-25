/**
 * Componente de Balance Logístico (HU-31 a HU-35 · RF-39 a RF-44).
 *
 * Muestra el balance consolidado de recursos necesarios para el evento integrando:
 * personal, alimentos, bebidas, mobiliario y servicios, indicando la cantidad requerida,
 * el estado de disponibilidad, fecha límite y la vista filtrada de faltantes anticipados (HU-35).
 */
import {
  AlertCircle,
  Armchair,
  CheckCircle2,
  ChevronDown,
  Layers,
  RefreshCw,
  Sparkles,
  Users,
  Utensils,
  Wine,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FechaLimiteRecurso } from '@/components/eventos/FechaLimiteRecurso'
import { Skeleton } from '@/components/ui/skeleton'
import { formatearNumero } from '@/lib/formato'
import { cn } from '@/lib/utils'
import { balanceService } from '@/services/balanceService'
import type {
  BalanceLogisticoEvento,
  CategoriaBalance,
  EstadoRecursoBalance,
  ResourceStatus,
  ResumenBalanceLogistico,
} from '@/types/balance'

const MAPA_ESTADO_A_STATUS: Record<EstadoRecursoBalance, ResourceStatus> = {
  disponible: 'AVAILABLE',
  por_comprar: 'TO_BUY',
  por_conseguir: 'TO_PROCURE',
  pendiente: 'PENDING',
}

const CLAVE_RESUMEN: Record<
  EstadoRecursoBalance,
  keyof Omit<ResumenBalanceLogistico, 'total_recursos' | 'porcentaje_completitud'>
> = {
  disponible: 'disponibles',
  por_comprar: 'por_comprar',
  por_conseguir: 'por_conseguir',
  pendiente: 'pendientes',
}

interface BalanceLogisticoProps {
  eventoId: number
  refrescoKey?: unknown
  ocultarTitulo?: boolean
  /** Abre el componente directamente en la vista de solo faltantes (HU-35 · RF-44) */
  soloFaltantesInicial?: boolean
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
    etiqueta: 'Listo',
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

function EstadoRecursoSelector({
  estado,
  onChange,
  disabled = false,
}: {
  estado: EstadoRecursoBalance
  onChange: (nuevoEstado: EstadoRecursoBalance) => void
  disabled?: boolean
}) {
  const conf = CONFIG_ESTADOS[estado] ?? CONFIG_ESTADOS.pendiente
  return (
    <div className="relative inline-flex items-center">
      <span
        aria-hidden="true"
        className={cn('pointer-events-none absolute left-2.5 size-1.5 rounded-full z-10', conf.punto)}
      />
      <select
        value={estado}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as EstadoRecursoBalance)}
        title="Modificar estado del recurso"
        className={cn(
          'cursor-pointer appearance-none rounded-full pl-5 pr-6 py-1 text-[11.5px] font-bold transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 border-0 shadow-xs',
          conf.clases,
          disabled && 'opacity-60 cursor-not-allowed'
        )}
      >
        <option value="disponible">Listo</option>
        <option value="por_comprar">Por comprar</option>
        <option value="por_conseguir">Por conseguir</option>
        {/* «Pendiente» solo se muestra cuando el sistema lo calcula; no se elige a mano. Para volver al estado calculado está «Deshacer» (HU-34) */}
        {estado === 'pendiente' && (
          <option value="pendiente" disabled>
            Pendiente
          </option>
        )}
      </select>
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-2 size-3 opacity-60" />
    </div>
  )
}

export function BalanceLogistico({
  eventoId,
  refrescoKey,
  ocultarTitulo = false,
  soloFaltantesInicial = false,
  className,
}: BalanceLogisticoProps) {
  const [balance, setBalance] = useState<BalanceLogisticoEvento | null>(null)
  const [cargando, setCargando] = useState(true)
  const [sincronizando, setSincronizando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [soloFaltantes, setSoloFaltantes] = useState(soloFaltantesInicial)
  const [categoriaFiltro, setCategoriaFiltro] = useState<CategoriaBalance | 'todas'>('todas')
  const [actualizandoRecursoId, setActualizandoRecursoId] = useState<number | null>(null)
  const [errorAccion, setErrorAccion] = useState<string | null>(null)
  const solicitudRef = useRef(0)

  const manejarCambioEstadoRecurso = async (recursoId: number, nuevoEstado: EstadoRecursoBalance) => {
    if (!balance) return
    setErrorAccion(null)
    setActualizandoRecursoId(recursoId)

    const balanceAnterior = balance
    const recursoObjetivo = balance.recursos.find((r) => r.id === recursoId)
    const statusEnum = MAPA_ESTADO_A_STATUS[nuevoEstado]

    const actualizarItem = (r: (typeof balance.recursos)[number]) =>
      r.id === recursoId
        ? {
            ...r,
            estado: nuevoEstado,
            status: statusEnum,
            deficit_quantity:
              nuevoEstado === 'disponible'
                ? 0
                : Math.max(0, Number(r.cantidad_requerida) - Number(r.cantidad_disponible)),
          }
        : r

    const recursosActualizados = balance.recursos
      .map(actualizarItem)
      .filter((r) => !soloFaltantes || r.estado !== 'disponible')

    const porCat = { ...balance.recursos_por_categoria }
    for (const k of Object.keys(porCat) as CategoriaBalance[]) {
      porCat[k] = porCat[k]
        .map(actualizarItem)
        .filter((r) => !soloFaltantes || r.estado !== 'disponible')
    }

    const nuevoResumen = { ...balance.resumen }
    if (recursoObjetivo && recursoObjetivo.estado !== nuevoEstado) {
      const claveVieja = CLAVE_RESUMEN[recursoObjetivo.estado]
      const claveNueva = CLAVE_RESUMEN[nuevoEstado]
      nuevoResumen[claveVieja] = Math.max(0, nuevoResumen[claveVieja] - 1)
      nuevoResumen[claveNueva] += 1
    }
    nuevoResumen.porcentaje_completitud =
      nuevoResumen.total_recursos > 0
        ? Math.round((nuevoResumen.disponibles / nuevoResumen.total_recursos) * 100)
        : 100

    // Actualización optimista inmediata
    setBalance({
      ...balance,
      recursos: recursosActualizados,
      recursos_por_categoria: porCat,
      resumen: nuevoResumen,
    })

    try {
      const resp = await balanceService.cambiarEstado(eventoId, recursoId, nuevoEstado, soloFaltantes)
      if (resp && resp.balance) {
        setBalance(resp.balance)
      }
    } catch (err) {
      setBalance(balanceAnterior)
      setErrorAccion(err instanceof Error ? err.message : 'Error al modificar el estado del recurso.')
    } finally {
      setActualizandoRecursoId(null)
    }
  }

  // HU-33 (RF-42): fija o quita la fecha límite de un recurso. Si el servidor la rechaza (por ejemplo, posterior al evento),
  // el error sube hasta el campo de esa fila, que muestra el motivo; si sale bien, el balance trae ya la fecha nueva.
  const manejarFechaLimite = async (recursoId: number, fecha: string | null) => {
    const resp = await balanceService.establecerFechaLimite(eventoId, recursoId, fecha, soloFaltantes)
    setBalance(resp.balance)
  }

  const cargarBalance = useCallback(
    async (sincronizar = false) => {
      const seq = ++solicitudRef.current
      if (sincronizar) setSincronizando(true)
      else setCargando(true)
      setError(null)
      try {
        const data = sincronizar
          ? await balanceService.sincronizar(eventoId, soloFaltantes)
          : await balanceService.obtener(eventoId, { onlyMissing: soloFaltantes })
        if (seq === solicitudRef.current) {
          setBalance(data)
        }
      } catch (err) {
        if (seq === solicitudRef.current) {
          setError(err instanceof Error ? err.message : 'Error al cargar el balance logístico.')
        }
      } finally {
        if (seq === solicitudRef.current) {
          setCargando(false)
          setSincronizando(false)
        }
      }
    },
    [eventoId, soloFaltantes]
  )

  useEffect(() => {
    cargarBalance()
  }, [cargarBalance, refrescoKey])

  const categoriaActiva: CategoriaBalance | 'todas' =
    soloFaltantes &&
    categoriaFiltro !== 'todas' &&
    (balance?.recursos_por_categoria[categoriaFiltro]?.length ?? 0) === 0
      ? 'todas'
      : categoriaFiltro

  const recursosFiltrados = useMemo(() => {
    if (!balance) return []
    const base =
      categoriaActiva === 'todas' ? balance.recursos : balance.recursos_por_categoria[categoriaActiva] || []
    return soloFaltantes ? base.filter((r) => r.estado !== 'disponible' && r.status !== 'AVAILABLE') : base
  }, [balance, categoriaActiva, soloFaltantes])

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
  const totalFaltantes = Math.max(0, resumen.total_recursos - resumen.disponibles)

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
      {errorAccion && <Alert variant="error">{errorAccion}</Alert>}

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
        <div className="flex flex-col gap-0.5 rounded-[10px] bg-background px-3 py-2">
          <span className="text-[11.5px] font-semibold text-muted-foreground">Total Recursos</span>
          <span className="font-display text-xl font-bold">{resumen.total_recursos}</span>
        </div>
        <div className="flex flex-col gap-0.5 rounded-[10px] bg-success-soft/60 px-3 py-2 text-success-foreground">
          <span className="text-[11.5px] font-semibold">Listos</span>
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

      {/* Selector de vista (HU-31 balance completo vs HU-35 solo faltantes) y filtro por categorías */}
      <div className="flex flex-col gap-2.5 border-t border-border pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div role="group" aria-label="Vista del balance" className="inline-flex rounded-[10px] bg-muted p-1">
            <button
              type="button"
              aria-pressed={!soloFaltantes}
              onClick={() => setSoloFaltantes(false)}
              className={cn(
                'cursor-pointer rounded-[8px] px-3 py-1 text-xs font-bold transition-colors',
                !soloFaltantes
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Todos ({resumen.total_recursos})
            </button>
            <button
              type="button"
              aria-pressed={soloFaltantes}
              onClick={() => setSoloFaltantes(true)}
              className={cn(
                'flex cursor-pointer items-center gap-1.5 rounded-[8px] px-3 py-1 text-xs font-bold transition-colors',
                soloFaltantes
                  ? 'bg-warning-soft text-warning-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <AlertCircle aria-hidden="true" className="size-3.5" />
              Solo faltantes ({totalFaltantes})
            </button>
          </div>
          {soloFaltantes && (
            <span className="text-[11.5px] font-medium text-muted-foreground">
              Mostrando únicamente recursos pendientes, por comprar o por conseguir
            </span>
          )}
        </div>

        {(!soloFaltantes || totalFaltantes > 0) && (
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setCategoriaFiltro('todas')}
              className={cn(
                'cursor-pointer rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                categoriaActiva === 'todas'
                  ? 'bg-foreground text-background'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              Todas ({soloFaltantes ? totalFaltantes : resumen.total_recursos})
            </button>
            {(['personal', 'alimento', 'bebida', 'mobiliario', 'servicio'] as CategoriaBalance[]).map(
              (cat) => {
                const conf = CONFIG_CATEGORIAS[cat]
                const totalCat = balance.recursos_por_categoria[cat]?.length || 0
                if (soloFaltantes && totalCat === 0) return null
                const activo = categoriaActiva === cat
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
        )}
      </div>

      {/* Lista de Recursos Requeridos */}
      {recursosFiltrados.length === 0 ? (
        soloFaltantes && totalFaltantes === 0 && resumen.total_recursos > 0 ? (
          <div className="flex items-center justify-center gap-2 rounded-[10px] border border-border bg-success-soft/40 px-4 py-5 text-center text-xs font-semibold text-success-foreground">
            <CheckCircle2 aria-hidden="true" className="size-4 shrink-0" />
            <span>¡Todo listo! No hay recursos faltantes para este evento.</span>
          </div>
        ) : (
          <p className="rounded-[10px] bg-background px-3 py-4 text-center text-xs text-muted-foreground">
            {soloFaltantes ? 'No hay recursos faltantes en esta categoría.' : 'No hay recursos requeridos en esta categoría.'}
          </p>
        )
      ) : (
        <div className="flex flex-col divide-y divide-border rounded-[10px] border border-border bg-card">
          {recursosFiltrados.map((rec) => {
            const confCat = CONFIG_CATEGORIAS[rec.categoria]
            const IconoCat = confCat.icono
            const faltan =
              rec.deficit_quantity !== undefined
                ? rec.deficit_quantity
                : Math.max(0, Number(rec.cantidad_requerida) - Number(rec.cantidad_disponible))
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
                    {rec.estado_manual && (
                      <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[12px] text-muted-foreground">
                        {rec.is_manually_fulfilled ? 'Marcado como listo a mano' : 'Estado cambiado a mano'}
                        <button
                          type="button"
                          disabled={actualizandoRecursoId === rec.id}
                          onClick={() => manejarCambioEstadoRecurso(rec.id, 'pendiente')}
                          aria-label={`Deshacer el cambio manual de ${rec.recurso_nombre}`}
                          title="Quita la marca y vuelve al estado que calcula el sistema"
                          className="cursor-pointer font-bold text-primary underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Deshacer
                        </button>
                      </span>
                    )}
                    <FechaLimiteRecurso
                      recurso={rec}
                      fechaEvento={balance.fecha_evento}
                      onGuardar={(fecha) => manejarFechaLimite(rec.id, fecha)}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  {/* Cantidad requerida (Criterio central de la HU-31) */}
                  <div className="flex flex-col text-right">
                    <span className="text-[13px] font-extrabold text-foreground">
                      {formatearNumero(rec.cantidad_requerida)} {rec.unidad_medida}
                    </span>
                    {rec.categoria !== 'servicio' && rec.categoria !== 'alimento' && (
                      <span className="text-[11px] text-muted-foreground">
                        Disp: {formatearNumero(rec.cantidad_disponible)} {rec.unidad_medida}
                      </span>
                    )}
                    {rec.estado !== 'disponible' && faltan > 0 && (
                      <span className="text-[11px] font-semibold text-warning-foreground">
                        Faltan: {formatearNumero(faltan)} {rec.unidad_medida}
                      </span>
                    )}
                  </div>

                  <EstadoRecursoSelector
                    estado={rec.estado}
                    onChange={(nuevo) => manejarCambioEstadoRecurso(rec.id, nuevo)}
                    disabled={actualizandoRecursoId === rec.id}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
