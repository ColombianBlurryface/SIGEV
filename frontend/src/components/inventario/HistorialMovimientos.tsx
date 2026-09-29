/**
 * Historial de movimientos del inventario (HU-09): registros iniciales, adquisiciones y ajustes,
 * con filtro por elemento y botón "Ver más".
 */
import { History, RotateCw } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { formatearFechaHora, formatearNumero } from '@/lib/formato'
import { cn } from '@/lib/utils'
import type { ElementoInventario, MovimientoInventario, TipoMovimiento } from '@/types/inventario'

const ESTILO_TIPO: Record<TipoMovimiento, { etiqueta: string; clases: string }> = {
  registro: { etiqueta: 'Registro', clases: 'bg-accent text-accent-foreground' },
  adquisicion: { etiqueta: 'Adquisición', clases: 'bg-success-soft text-success-foreground' },
  ajuste: { etiqueta: 'Ajuste', clases: 'bg-warning-soft text-warning-foreground' },
}

const conSigno = (cantidad: number) => `${cantidad > 0 ? '+' : '−'}${formatearNumero(Math.abs(cantidad))}`

interface HistorialMovimientosProps {
  elementos: ElementoInventario[]
  elementoId: number | null
  onElemento: (id: number | null) => void
  movimientos: MovimientoInventario[]
  cargando: boolean
  error: string | null
  hayMas: boolean
  onVerMas: () => void
  onReintentar: () => void
}

export function HistorialMovimientos({
  elementos,
  elementoId,
  onElemento,
  movimientos,
  cargando,
  error,
  hayMas,
  onVerMas,
  onReintentar,
}: HistorialMovimientosProps) {
  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span aria-hidden="true" className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <History className="size-4" />
          </span>
          <h2 className="text-base font-bold">Movimientos del inventario</h2>
        </div>
        <div className="w-full sm:w-64">
          <label htmlFor="movimientos-elemento" className="sr-only">
            Filtrar movimientos por elemento
          </label>
          <Select
            id="movimientos-elemento"
            value={elementoId ?? ''}
            onChange={(e) => onElemento(e.target.value ? Number(e.target.value) : null)}
            className="h-10 text-sm"
          >
            <option value="">Todos los elementos</option>
            {elementos.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {error && (
        <div className="flex flex-col items-start gap-3">
          <Alert variant="error">{error}</Alert>
          <Button variant="secondary" size="sm" onClick={onReintentar}>
            <RotateCw aria-hidden="true" />
            Reintentar
          </Button>
        </div>
      )}

      {cargando && movimientos.length === 0 ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-5 w-2/3" />
        </div>
      ) : (
        !error &&
        (movimientos.length === 0 ? (
          <p className="text-sm text-subtle">Todavía no hay movimientos registrados.</p>
        ) : (
          <>
            <ul className="flex flex-col divide-y divide-border">
              {movimientos.map((m) => {
                const estilo = ESTILO_TIPO[m.tipo]
                return (
                  <li key={m.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 py-2.5 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className={cn('shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-bold', estilo.clases)}>
                        {estilo.etiqueta}
                      </span>
                      <span className="truncate font-bold" title={m.nombre}>
                        {m.nombre}
                      </span>
                    </span>
                    <span
                      className={cn(
                        'text-right font-bold whitespace-nowrap',
                        m.cantidad > 0 ? 'text-success-foreground' : 'text-destructive',
                      )}
                    >
                      {conSigno(m.cantidad)} und
                    </span>
                    <span className="truncate text-[12.5px] text-muted-foreground">
                      {formatearFechaHora(m.creado_en)}
                      {m.notas ? ` · ${m.notas}` : m.tipo === 'ajuste' ? ' · Ajuste manual' : ''}
                    </span>
                    <span className="text-right text-[12.5px] whitespace-nowrap text-muted-foreground">
                      Quedó en {formatearNumero(m.cantidad_resultante)}
                    </span>
                  </li>
                )
              })}
            </ul>
            {hayMas && (
              <Button variant="secondary" size="sm" onClick={onVerMas} disabled={cargando} className="self-center">
                {cargando ? 'Cargando…' : 'Ver más'}
              </Button>
            )}
          </>
        ))
      )}
    </Card>
  )
}
