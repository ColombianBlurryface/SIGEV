/**
 * Paso 3 del registro: revisión final de los datos y requerimientos antes de guardar,
 * con botones para volver a editar cualquier paso. Incluye el aviso de alquiler (HU-12).
 */
import { Info } from 'lucide-react'
import { AvisoAlquiler } from '@/components/eventos/AlquilerMobiliario'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { describirReparto, repartirMobiliario, totalAlquilar } from '@/lib/alquiler'
import { calcularProducto } from '@/lib/calculos'
import { CATEGORIAS, etiquetaServicio, TIPOS_BEBIDA, type ConfigCategoria } from '@/lib/categorias'
import { formatearFecha, formatearMoneda, formatearNumero } from '@/lib/formato'
import { validarAsistentes, type ValoresEvento } from '@/lib/reglasEvento'
import { cn } from '@/lib/utils'
import type { ProductoCatalogo } from '@/types/catalogo'
import type { RequerimientosEvento } from '@/types/registro'
import type { Paso } from './PasosRegistro'
import { calcularTotales } from './totales'

interface LineaResumen {
  id: number
  nombre: string
  nota?: string
  cantidad: string
}

interface SeccionResumen {
  clave: string
  config: ConfigCategoria
  lineas: LineaResumen[]
  total?: number
}

interface PasoResumenProps {
  valores: ValoresEvento
  requerimientos: RequerimientosEvento
  onIrAPaso: (paso: Paso) => void
}

export function PasoResumen({ valores, requerimientos, onIrAPaso }: PasoResumenProps) {
  const asistentes = validarAsistentes(valores.asistentes)
  const cantidad = asistentes.cantidad ?? 0
  const totales = calcularTotales(requerimientos, cantidad)
  const repartos = requerimientos.mobiliario.map((m) => repartirMobiliario(m.cantidad, m.disponible))

  const lineaProducto = (item: { producto: ProductoCatalogo; porcion: number }, nota?: string): LineaResumen => {
    const calculo = calcularProducto(item.producto, item.porcion, cantidad)
    return {
      id: item.producto.id,
      nombre: item.producto.nombre,
      nota,
      cantidad: `${formatearNumero(calculo.conMargen)} ${calculo.unidad}`,
    }
  }

  const secciones: SeccionResumen[] = (
    [
      {
        clave: 'alimentos',
        config: CATEGORIAS.alimentos,
        lineas: requerimientos.alimentos.map((a) => lineaProducto(a, a.componentes || undefined)),
        total: totales.alimentos,
      },
      // HU-13: las bebidas generales y las de coctelería van en secciones separadas
      {
        clave: 'bebida_general',
        config: TIPOS_BEBIDA.bebida_general,
        lineas: requerimientos.bebidas.filter((b) => b.producto.clasificacion === 'bebida_general').map((b) => lineaProducto(b)),
        total: totales.bebidasGenerales,
      },
      {
        clave: 'bar_cocteleria',
        config: TIPOS_BEBIDA.bar_cocteleria,
        lineas: requerimientos.bebidas.filter((b) => b.producto.clasificacion === 'bar_cocteleria').map((b) => lineaProducto(b)),
        total: totales.barCocteleria,
      },
      {
        clave: 'mobiliario',
        config: CATEGORIAS.mobiliario,
        lineas: requerimientos.mobiliario.map((m, indice) => ({
          id: indice,
          nombre: m.elemento,
          nota: [describirReparto(repartos[indice]), m.referencia].filter(Boolean).join(' · '),
          cantidad: `${formatearNumero(m.cantidad)} und`,
        })),
      },
      {
        clave: 'servicios',
        config: CATEGORIAS.servicios,
        lineas: requerimientos.servicios.map((sv, indice) => ({
          id: indice,
          nombre: `${etiquetaServicio(sv.tipo)} · ${sv.descripcion}`,
          nota: sv.notas || undefined,
          cantidad: sv.cantidad === null ? '—' : formatearNumero(sv.cantidad),
        })),
      },
    ] satisfies SeccionResumen[]
  ).filter((s) => s.lineas.length > 0)

  const datos = [
    { etiqueta: 'Tipo', valor: valores.tipo },
    { etiqueta: 'Fecha', valor: formatearFecha(valores.fecha) },
    { etiqueta: 'Duración', valor: `${formatearNumero(valores.duracion)} horas` },
    { etiqueta: 'Asistentes', valor: formatearNumero(cantidad) },
    { etiqueta: 'Modalidad', valor: asistentes.esBuffet ? 'Buffet' : 'Servida a la mesa' },
    { etiqueta: 'Estado inicial', valor: 'Planificación' },
  ]

  const desglose = [
    { etiqueta: 'Alimentos', valor: totales.alimentos },
    { etiqueta: 'Bebidas generales', valor: totales.bebidasGenerales },
    { etiqueta: 'Bar de coctelería', valor: totales.barCocteleria },
  ]

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex min-w-0 flex-col gap-4">
        <AvisoAlquiler asistentes={cantidad} unidadesAlquilar={totalAlquilar(repartos)} />

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

          {secciones.length === 0 ? (
            <p className="rounded-[10px] bg-background px-3.5 py-3 text-sm text-subtle">
              No agregaste requerimientos. Puedes guardar el evento así y completarlos después.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {secciones.map(({ clave, config, lineas, total }) => {
                const { etiqueta, icono: Icono, clases } = config
                return (
                  <section key={clave} aria-label={etiqueta} className="flex flex-col gap-2 rounded-xl border border-border bg-background p-4">
                    <div className="flex items-center gap-2">
                      <span aria-hidden="true" className={cn('flex size-[26px] items-center justify-center rounded-[7px]', clases)}>
                        <Icono className="size-[15px]" />
                      </span>
                      <span className="flex-1 text-sm font-bold">{etiqueta}</span>
                      {total !== undefined ? (
                        <span className="text-[13.5px] font-bold">{formatearMoneda(total)}</span>
                      ) : (
                        <span className="text-[12.5px] text-muted-foreground">Cotización aparte</span>
                      )}
                    </div>
                    <ul className="flex flex-col gap-1.5">
                      {lineas.map((linea) => (
                        <li key={linea.id} className="flex justify-between gap-3 text-[13px]">
                          <span className="min-w-0">
                            {linea.nombre}
                            {linea.nota && <span className="block truncate text-xs text-muted-foreground">{linea.nota}</span>}
                          </span>
                          <span className="font-semibold whitespace-nowrap">{linea.cantidad}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      <Card className="flex flex-col gap-4 p-6 xl:sticky xl:top-0">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold tracking-[0.04em] text-muted-foreground uppercase">Costo estimado</span>
          <span className="font-display text-4xl font-extrabold tracking-tight">{formatearMoneda(totales.total)}</span>
        </div>
        <div className="flex flex-col gap-2.5">
          {desglose.map(({ etiqueta, valor }) => (
            <div key={etiqueta} className="flex justify-between text-sm">
              <span className="text-subtle">{etiqueta}</span>
              <span className="font-semibold">{formatearMoneda(valor)}</span>
            </div>
          ))}
        </div>
        <div className="flex items-start gap-2.5 rounded-[10px] bg-accent px-3.5 py-3 text-[13px] leading-relaxed text-accent-foreground">
          <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          Las cantidades incluyen un margen del 10%. Unidades y botellas se redondean hacia arriba.
        </div>
      </Card>
    </div>
  )
}
