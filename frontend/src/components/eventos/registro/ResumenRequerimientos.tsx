/**
 * Resumen lateral del paso 2: cuántos elementos hay en cada categoría y el costo estimado.
 */
import { Card } from '@/components/ui/card'
import { CATEGORIAS, type Categoria } from '@/lib/categorias'
import { formatearMoneda, formatearNumero } from '@/lib/formato'
import { cn } from '@/lib/utils'
import type { RequerimientosEvento } from '@/types/registro'
import { calcularTotales } from './totales'

interface ResumenRequerimientosProps {
  requerimientos: RequerimientosEvento
  asistentes: number
}

export function ResumenRequerimientos({ requerimientos, asistentes }: ResumenRequerimientosProps) {
  const totales = calcularTotales(requerimientos, asistentes)
  const unidadesMobiliario = requerimientos.mobiliario.reduce((suma, m) => suma + m.cantidad, 0)
  const filas: { categoria: Categoria; detalle: string; valor: string }[] = [
    {
      categoria: 'alimentos',
      detalle: `${requerimientos.alimentos.length} ${requerimientos.alimentos.length === 1 ? 'producto' : 'productos'}`,
      valor: formatearMoneda(totales.alimentos),
    },
    {
      categoria: 'bebidas',
      detalle: `${requerimientos.bebidas.length} ${requerimientos.bebidas.length === 1 ? 'producto' : 'productos'}`,
      valor: formatearMoneda(totales.bebidas),
    },
    {
      categoria: 'mobiliario',
      detalle: `${requerimientos.mobiliario.length} ${requerimientos.mobiliario.length === 1 ? 'elemento' : 'elementos'} · ${formatearNumero(unidadesMobiliario)} und`,
      valor: 'Aparte',
    },
    {
      categoria: 'servicios',
      detalle: `${requerimientos.servicios.length} ${requerimientos.servicios.length === 1 ? 'servicio' : 'servicios'}`,
      valor: 'Aparte',
    },
  ]

  return (
    <Card className="flex flex-col gap-4 p-[22px]">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-bold tracking-[0.04em] text-muted-foreground uppercase">Resumen</span>
        <span className="text-[13.5px] text-subtle">{formatearNumero(asistentes)} asistentes · margen de seguridad 10%</span>
      </div>
      <ul className="flex flex-col gap-3">
        {filas.map(({ categoria, detalle, valor }) => {
          const { etiqueta, icono: Icono, clases } = CATEGORIAS[categoria]
          return (
            <li key={categoria} className="flex items-center gap-2.5">
              <span aria-hidden="true" className={cn('flex size-7 items-center justify-center rounded-lg', clases)}>
                <Icono className="size-[15px]" />
              </span>
              <span className="flex flex-1 flex-col">
                <span className="text-sm font-bold">{etiqueta}</span>
                <span className="text-xs text-muted-foreground">{detalle}</span>
              </span>
              <span className={cn('text-sm', valor === 'Aparte' ? 'text-muted-foreground' : 'font-semibold')}>{valor}</span>
            </li>
          )
        })}
      </ul>
      <div className="flex flex-col gap-1 border-t border-border pt-3.5">
        <span className="text-[13px] text-subtle">Total estimado</span>
        <span className="font-display text-3xl font-extrabold tracking-tight">{formatearMoneda(totales.total)}</span>
        <span className="text-[12.5px] leading-relaxed text-muted-foreground">Alimentos y bebidas. El mobiliario y los servicios se cotizan aparte.</span>
      </div>
    </Card>
  )
}
