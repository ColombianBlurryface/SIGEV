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
              <span className="text-sm font-semibold">{valor}</span>
            </li>
          )
        })}
      </ul>
      <div className="flex flex-col gap-1 border-t border-border pt-3.5">
        <span className="text-[13px] text-subtle">Total estimado</span>
        <span className="font-display text-3xl font-extrabold tracking-tight">{formatearMoneda(totales.total)}</span>
      </div>
    </Card>
  )
}
