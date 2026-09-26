import { Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { calcularProducto } from '@/lib/calculos'
import { CATEGORIAS } from '@/lib/categorias'
import { formatearFecha, formatearMoneda, formatearNumero } from '@/lib/formato'
import { validarAsistentes, type ValoresEvento } from '@/lib/reglasEvento'
import { cn } from '@/lib/utils'
import type { RequerimientosEvento } from '@/types/registro'
import type { Paso } from './PasosRegistro'
import { calcularTotales } from './totales'

interface PasoResumenProps {
  valores: ValoresEvento
  requerimientos: RequerimientosEvento
  onIrAPaso: (paso: Paso) => void
}

export function PasoResumen({ valores, requerimientos, onIrAPaso }: PasoResumenProps) {
  const asistentes = validarAsistentes(valores.asistentes)
  const cantidad = asistentes.cantidad ?? 0
  const totales = calcularTotales(requerimientos, cantidad)
  const alimentos = CATEGORIAS.alimentos

  const datos = [
    { etiqueta: 'Tipo', valor: valores.tipo },
    { etiqueta: 'Fecha', valor: formatearFecha(valores.fecha) },
    { etiqueta: 'Duración', valor: `${formatearNumero(valores.duracion)} horas` },
    { etiqueta: 'Asistentes', valor: formatearNumero(cantidad) },
    { etiqueta: 'Modalidad', valor: asistentes.esBuffet ? 'Buffet' : 'Servida a la mesa' },
    { etiqueta: 'Estado inicial', valor: 'Planificación' },
  ]

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex min-w-0 flex-col gap-4">
        <Card className="flex flex-col gap-4 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-[17px] font-bold">Datos del evento</h2>
            <Button variant="ghost" size="sm" onClick={() => onIrAPaso(1)}>
              Editar
            </Button>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">Nombre</span>
            <span className="font-display text-[22px] font-bold break-words">{valores.nombre}</span>
          </div>
          <dl className="grid gap-x-5 gap-y-3.5 sm:grid-cols-3">
            {datos.map(({ etiqueta, valor }) => (
              <div key={etiqueta} className="flex flex-col gap-0.5">
                <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
                <dd className="text-[14.5px] font-bold">{valor}</dd>
              </div>
            ))}
          </dl>
          {valores.observaciones.trim() && (
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Observaciones</span>
              <p className="text-sm text-subtle">{valores.observaciones}</p>
            </div>
          )}
        </Card>

        <Card className="flex flex-col gap-4 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-[17px] font-bold">Requerimientos</h2>
            <Button variant="ghost" size="sm" onClick={() => onIrAPaso(2)}>
              Editar
            </Button>
          </div>

          {requerimientos.alimentos.length === 0 ? (
            <p className="rounded-[10px] bg-background px-3.5 py-3 text-sm text-subtle">
              No agregaste requerimientos. Puedes guardar el evento así y completarlos después.
            </p>
          ) : (
            <section aria-label={alimentos.etiqueta} className="flex flex-col gap-2 rounded-xl border border-border bg-background p-4">
              <div className="flex items-center gap-2">
                <span aria-hidden="true" className={cn('flex size-[26px] items-center justify-center rounded-[7px]', alimentos.clases)}>
                  <alimentos.icono className="size-[15px]" />
                </span>
                <span className="flex-1 text-sm font-bold">{alimentos.etiqueta}</span>
                <span className="text-[13.5px] font-bold">{formatearMoneda(totales.alimentos)}</span>
              </div>
              <ul className="flex flex-col gap-1.5">
                {requerimientos.alimentos.map((a) => {
                  const calculo = calcularProducto(a.producto, a.porcion, cantidad)
                  return (
                    <li key={a.producto.id} className="flex justify-between gap-3 text-[13px]">
                      <span className="min-w-0">
                        {a.producto.nombre}
                        {a.componentes && <span className="block truncate text-xs text-muted-foreground">{a.componentes}</span>}
                      </span>
                      <span className="font-semibold whitespace-nowrap">
                        {formatearNumero(calculo.conMargen)} {calculo.unidad}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}
        </Card>
      </div>

      <Card className="flex flex-col gap-4 p-6 xl:sticky xl:top-0">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold tracking-[0.04em] text-muted-foreground uppercase">Costo estimado</span>
          <span className="font-display text-4xl font-extrabold tracking-tight">{formatearMoneda(totales.total)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-subtle">Alimentos</span>
          <span className="font-semibold">{formatearMoneda(totales.alimentos)}</span>
        </div>
        <div className="flex items-start gap-2.5 rounded-[10px] bg-accent px-3.5 py-3 text-[13px] leading-relaxed text-accent-foreground">
          <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          Las cantidades incluyen un margen del 10%. Unidades y botellas se redondean hacia arriba.
        </div>
      </Card>
    </div>
  )
}
