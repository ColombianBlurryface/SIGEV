/**
 * Paso 3 del registro: revisión final de los datos y requerimientos antes de guardar,
 * con botones para volver a editar cualquier paso. Incluye el aviso de alquiler (HU-12).
 * HU-48 (RF-56): desglose de costos de insumos y servicios adicionales en el presupuesto consolidado.
 */
import { Info } from 'lucide-react'
import { AvisoAlquiler } from '@/components/eventos/AlquilerMobiliario'
import { ComprasIngredientes } from '@/components/eventos/ComprasIngredientes'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useComprasPrevias } from '@/hooks/useComprasPrevias'
import { useUmbralAlquiler } from '@/hooks/useUmbralAlquiler'
import { describirReparto, repartirMobiliario, totalAlquilar } from '@/lib/alquiler'
import { calcularProducto } from '@/lib/calculos'
import { CATEGORIAS, etiquetaServicio, TIPOS_BEBIDA, type ConfigCategoria } from '@/lib/categorias'
import { describirHorario } from '@/lib/horario'
import { formatearFecha, formatearMoneda, formatearNumero } from '@/lib/formato'
import { calcularCocineros, calcularMeseros, relacionCocineros, relacionMeseros } from '@/lib/reglasPersonal'
import { describirHoras } from '@/lib/reglasServicios'
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
  costo?: number
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
  const umbral = useUmbralAlquiler()
  const asistentes = validarAsistentes(valores.asistentes)
  const cantidad = asistentes.cantidad ?? 0
  const totales = calcularTotales(requerimientos, cantidad)

  // HU-48 / RF-56: Subtotal económico de servicios adicionales
  const subtotalServicios = requerimientos.servicios.reduce((acumulado, sv) => {
    const tarifa = Number(sv.valor_unitario) || 0
    const costo =
      sv.costo_total != null
        ? Number(sv.costo_total)
        : sv.tipo_cobro === 'por_hora'
          ? tarifa * (Number(sv.horas) || 0)
          : tarifa * (Number(sv.cantidad) || 1)
    return acumulado + costo
  }, 0)

  // Costo total consolidado (Alimentos + Bebidas + Servicios)
  const costoTotalGeneral = totales.total + subtotalServicios

  // HU-47: ingredientes a comprar de los platos elegidos, antes de guardar
  const comprasPrevias = useComprasPrevias(
    asistentes.estado === 'valido' ? cantidad : null,
    requerimientos.alimentos.map((a) => a.producto.id),
  )
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
        lineas: requerimientos.servicios.map((sv, indice) => {
          const tarifa = Number(sv.valor_unitario) || 0
          const costoItem =
            sv.costo_total != null
              ? Number(sv.costo_total)
              : sv.tipo_cobro === 'por_hora'
                ? tarifa * (Number(sv.horas) || 0)
                : tarifa * (Number(sv.cantidad) || 1)

          const detalleCobro =
            sv.tipo_cobro === 'por_hora'
              ? `${describirHoras(sv.horas ?? 0)} · ${formatearMoneda(tarifa)}/h`
              : `${formatearMoneda(tarifa)} tarifa fija`

          return {
            id: indice,
            nombre: `${etiquetaServicio(sv.tipo)} · ${sv.descripcion}`,
            nota: [detalleCobro, sv.notas].filter(Boolean).join(' · '),
            cantidad: `${formatearNumero(sv.cantidad)} und`,
            costo: costoItem,
          }
        }),
        total: subtotalServicios,
      },
    ] satisfies SeccionResumen[]
  ).filter((s) => s.lineas.length > 0)

  const datos = [
    { etiqueta: 'Tipo', valor: valores.tipo },
    { etiqueta: 'Fecha', valor: formatearFecha(valores.fecha) },
    { etiqueta: 'Duración', valor: `${formatearNumero(valores.duracion)} horas` },
    { etiqueta: 'Horario', valor: describirHorario(valores.horaInicio, Number(valores.duracion)) ?? '—' },
    { etiqueta: 'Asistentes', valor: formatearNumero(cantidad) },
    { etiqueta: 'Modalidad', valor: asistentes.esBuffet ? 'Buffet' : 'Servida a la mesa' },
    { etiqueta: 'Meseros requeridos', valor: `${formatearNumero(calcularMeseros(cantidad))} (${relacionMeseros})` },
    { etiqueta: 'Cocineros requeridos', valor: `${formatearNumero(calcularCocineros(cantidad))} (${relacionCocineros})` },
    { etiqueta: 'Estado inicial', valor: 'Planificación' },
  ]

  // HU-48 / RF-56: Desglose completo de alimentos, bebidas y servicios
  const desglose = [
    { etiqueta: 'Alimentos', valor: totales.alimentos },
    { etiqueta: 'Bebidas generales', valor: totales.bebidasGenerales },
    { etiqueta: 'Bar de coctelería', valor: totales.barCocteleria },
    { etiqueta: 'Servicios adicionales', valor: subtotalServicios },
  ]

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex min-w-0 flex-col gap-4">
        <AvisoAlquiler
          superaUmbral={cantidad > umbral}
          umbral={umbral}
          unidadesAlquilar={totalAlquilar(repartos)}
          unidadesPedidas={requerimientos.mobiliario.reduce((suma, m) => suma + m.cantidad, 0)}
        />

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
                        <span className="text-[12.5px] text-muted-foreground">Inventario / Alquiler</span>
                      )}
                    </div>
                    <ul className="flex flex-col gap-1.5">
                      {lineas.map((linea) => (
                        <li key={linea.id} className="flex justify-between gap-3 text-[13px]">
                          <span className="min-w-0">
                            {linea.nombre}
                            {linea.nota && <span className="block truncate text-xs text-muted-foreground">{linea.nota}</span>}
                          </span>
                          <div className="flex flex-col items-end shrink-0">
                            <span className="font-semibold whitespace-nowrap">{linea.cantidad}</span>
                            {linea.costo !== undefined && (
                              <span className="text-[11.5px] font-medium text-muted-foreground">
                                {formatearMoneda(linea.costo)}
                              </span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                )
              })}
            </div>
          )}
        </Card>

        <Card className="flex flex-col gap-4 p-6">
          {comprasPrevias.compras ? (
            <ComprasIngredientes compras={comprasPrevias.compras} sinPlatos="Aún no agregaste alimentos: cuando los agregues, aquí verás cuánto comprar de cada ingrediente." />
          ) : comprasPrevias.error ? (
            <p className="text-[13.5px] text-destructive">{comprasPrevias.error}</p>
          ) : (
            <p className="text-[13.5px] text-subtle">Calculando los ingredientes a comprar…</p>
          )}
        </Card>
      </div>

      <Card className="flex flex-col gap-4 p-6 xl:sticky xl:top-0">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold tracking-[0.04em] text-muted-foreground uppercase">Costo estimado total</span>
          <span className="font-display text-4xl font-extrabold tracking-tight text-primary">
            {formatearMoneda(costoTotalGeneral)}
          </span>
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
          Incluye el total de insumos calculados (+10% margen) y los servicios adicionales registrados (HU-48).
        </div>
      </Card>
    </div>
  )
}