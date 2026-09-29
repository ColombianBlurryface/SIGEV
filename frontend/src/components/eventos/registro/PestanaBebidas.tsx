/**
 * Pestaña "Bebidas" (HU-03). Hay dos formas de consumo:
 * - Individual por persona: se indican las unidades por persona (ej. 2 cervezas).
 * - Compartida por botella: se calcula con el volumen de la botella y el tamaño de cada porción.
 */
import { Calculator, Plus, RotateCw, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useCatalogo } from '@/hooks/useCatalogo'
import { calcularProducto } from '@/lib/calculos'
import { formatearMoneda, formatearNumero } from '@/lib/formato'
import { cn } from '@/lib/utils'
import type { ProductoCatalogo } from '@/types/catalogo'
import type { BebidaAgregada } from '@/types/registro'

type ModoConsumo = 'individual' | 'compartida'

const COLUMNAS = 'grid grid-cols-[minmax(0,1fr)_92px_104px_80px_92px_104px_36px] items-center gap-2.5'

// Las bebidas del catálogo pueden ser generales o de bar/coctelería
const esBebida = (p: ProductoCatalogo) => p.clasificacion === 'bebida_general' || p.clasificacion === 'bar_cocteleria'
const modoDe = (p: ProductoCatalogo): ModoConsumo => (p.tipo_calculo === 'botella_compartida' ? 'compartida' : 'individual')
const porcionesPorBotella = (p: ProductoCatalogo) => Number(p.volumen_botella_ml) / Number(p.tamano_porcion_ml)

function describirConsumo(bebida: BebidaAgregada) {
  return modoDe(bebida.producto) === 'compartida'
    ? `Porción ${formatearNumero(bebida.producto.tamano_porcion_ml)} ml`
    : `${formatearNumero(bebida.porcion)} und/persona`
}

interface PestanaBebidasProps {
  asistentes: number
  bebidas: BebidaAgregada[]
  onAgregar: (bebida: BebidaAgregada) => void
  onQuitar: (productoId: number) => void
}

export function PestanaBebidas({ asistentes, bebidas, onAgregar, onQuitar }: PestanaBebidasProps) {
  const { productos, cargando, error, recargar } = useCatalogo()
  const [modo, setModo] = useState<ModoConsumo>('individual')
  const [productoId, setProductoId] = useState('')
  const [unidades, setUnidades] = useState('')
  const [errorForm, setErrorForm] = useState<string | null>(null)

  const agregadas = new Set(bebidas.map((b) => b.producto.id))
  const disponibles = productos.filter((p) => esBebida(p) && modoDe(p) === modo && !agregadas.has(p.id))
  const producto = productos.find((p) => p.id === Number(productoId)) ?? null
  const unidadesNumero = Number(unidades)
  const unidadesValidas = unidades.trim() !== '' && Number.isFinite(unidadesNumero) && unidadesNumero > 0
  const listo = producto !== null && (modo === 'compartida' || unidadesValidas)
  // En las compartidas la porción viene del catálogo (tamaño de la copa); en las individuales la escribe el usuario
  const porcionEnvio = modo === 'compartida' ? Number(producto?.porcion_por_persona ?? 0) : unidadesNumero
  const vistaPrevia = listo && producto ? calcularProducto(producto, porcionEnvio, asistentes) : null
  const subtotal = bebidas.reduce((suma, b) => suma + calcularProducto(b.producto, b.porcion, asistentes).costo, 0)

  function cambiarModo(nuevo: ModoConsumo) {
    setModo(nuevo)
    setProductoId('')
    setUnidades('')
    setErrorForm(null)
  }

  function elegirProducto(id: string) {
    setProductoId(id)
    setErrorForm(null)
    const elegido = productos.find((p) => p.id === Number(id))
    setUnidades(elegido && modoDe(elegido) === 'individual' ? String(Number(elegido.porcion_por_persona)) : '')
  }

  function agregar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (!producto) return setErrorForm('Selecciona una bebida del catálogo.')
    if (modo === 'individual' && !unidadesValidas) return setErrorForm('Las unidades por persona deben ser mayores a 0.')

    onAgregar({ producto, porcion: porcionEnvio })
    setProductoId('')
    setUnidades('')
    setErrorForm(null)
  }

  let textoCalculo = 'Elige una bebida para ver la cantidad calculada con el margen del 10%.'
  if (vistaPrevia && producto) {
    const base =
      modo === 'compartida'
        ? `${formatearNumero(porcionesPorBotella(producto))} porciones por botella → ${formatearNumero(vistaPrevia.neto)} botellas netas`
        : `${formatearNumero(asistentes)} asistentes × ${formatearNumero(unidadesNumero)} = ${formatearNumero(vistaPrevia.neto)} und netas`
    textoCalculo = `${base} · ${formatearNumero(vistaPrevia.conMargen)} ${vistaPrevia.unidad} con margen · ${formatearMoneda(vistaPrevia.costo)}`
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-5">
        <form onSubmit={agregar} noValidate className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-bold">Agregar bebida</h2>
            <div role="group" aria-label="Forma de consumo" className="flex rounded-[10px] bg-chip p-[3px]">
              {(
                [
                  ['individual', 'Individual por persona'],
                  ['compartida', 'Compartida por botella'],
                ] as const
              ).map(([valor, etiqueta]) => (
                <button
                  key={valor}
                  type="button"
                  aria-pressed={modo === valor}
                  onClick={() => cambiarModo(valor)}
                  className={cn(
                    'h-[34px] cursor-pointer rounded-lg px-3.5 text-[13px] font-bold outline-none focus-visible:ring-[3px] focus-visible:ring-ring',
                    modo === valor ? 'bg-card text-foreground shadow-sm dark:bg-input' : 'text-subtle',
                  )}
                >
                  {etiqueta}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex flex-col items-start gap-3">
              <Alert variant="error">{error}</Alert>
              <Button variant="secondary" size="sm" onClick={recargar}>
                <RotateCw aria-hidden="true" />
                Reintentar
              </Button>
            </div>
          )}

          {cargando ? (
            <div className="grid gap-3.5 md:grid-cols-4">
              <Skeleton className="h-12 md:col-span-2" />
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : (
            !error && (
              <>
                <div className="grid items-start gap-3.5 md:grid-cols-4">
                  <FormField id="bebida-producto" label="Producto" className="md:col-span-2">
                    <Select id="bebida-producto" value={productoId} onChange={(e) => elegirProducto(e.target.value)}>
                      <option value="" disabled>
                        {disponibles.length ? 'Selecciona una bebida' : 'No hay más bebidas de este tipo'}
                      </option>
                      {disponibles.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre}
                        </option>
                      ))}
                    </Select>
                  </FormField>

                  {modo === 'individual' ? (
                    <FormField id="bebida-unidades" label="Unidades por persona">
                      <Input
                        id="bebida-unidades"
                        type="number"
                        min={0}
                        step="any"
                        inputMode="decimal"
                        value={unidades}
                        onChange={(e) => setUnidades(e.target.value)}
                        disabled={!producto}
                      />
                    </FormField>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <span className="text-sm font-semibold">Botella / porción</span>
                      <span className="flex h-12 items-center rounded-[10px] bg-muted px-3.5 text-[15px] font-semibold text-subtle">
                        {producto
                          ? `${formatearNumero(producto.volumen_botella_ml)} ml / ${formatearNumero(producto.tamano_porcion_ml)} ml`
                          : '—'}
                      </span>
                    </div>
                  )}

                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-semibold">{modo === 'compartida' ? 'Valor por botella' : 'Valor unitario'}</span>
                    <span className="flex h-12 items-center rounded-[10px] bg-muted px-3.5 text-[15px] font-semibold text-subtle">
                      {producto ? formatearMoneda(producto.precio_unitario) : '—'}
                    </span>
                  </div>
                </div>

                {errorForm && <Alert variant="error">{errorForm}</Alert>}

                <div className="flex flex-col gap-3.5 md:flex-row md:items-center">
                  <div
                    aria-live="polite"
                    className="flex flex-1 items-center gap-2.5 rounded-[10px] bg-bebidas-soft px-3.5 py-2.5 text-[13.5px] font-semibold text-bebidas"
                  >
                    <Calculator aria-hidden="true" className="size-[17px] shrink-0" />
                    {textoCalculo}
                  </div>
                  <Button type="submit" className="md:w-44" disabled={disponibles.length === 0}>
                    <Plus aria-hidden="true" />
                    Agregar
                  </Button>
                </div>
              </>
            )
          )}
        </form>
      </Card>

      <Card className="overflow-hidden rounded-[14px]">
        <div
          className={`${COLUMNAS} border-b border-border bg-muted px-[18px] py-3 text-[11.5px] font-bold tracking-[0.04em] text-muted-foreground uppercase`}
        >
          <span>Bebida</span>
          <span>Tipo</span>
          <span>Consumo</span>
          <span className="text-right">Neto</span>
          <span className="text-right">Con margen</span>
          <span className="text-right">Costo</span>
          <span />
        </div>

        {bebidas.length === 0 ? (
          <p className="px-[18px] py-8 text-center text-sm text-subtle">Todavía no has agregado bebidas a este evento.</p>
        ) : (
          <ul>
            {bebidas.map((bebida) => {
              const calculo = calcularProducto(bebida.producto, bebida.porcion, asistentes)
              const unidadCorta = calculo.unidad === 'botellas' ? 'bot.' : 'und'
              return (
                <li key={bebida.producto.id} className={`${COLUMNAS} border-b border-border px-[18px] py-3 text-sm`}>
                  <span className="truncate font-bold" title={bebida.producto.nombre}>
                    {bebida.producto.nombre}
                  </span>
                  <span className="text-subtle">{modoDe(bebida.producto) === 'compartida' ? 'Compartida' : 'Individual'}</span>
                  <span className="text-subtle">{describirConsumo(bebida)}</span>
                  <span className="text-right">
                    {formatearNumero(calculo.neto)} {unidadCorta}
                  </span>
                  <span className="text-right font-bold">
                    {formatearNumero(calculo.conMargen)} {unidadCorta}
                  </span>
                  <span className="text-right">{formatearMoneda(calculo.costo)}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onQuitar(bebida.producto.id)}
                    aria-label={`Quitar ${bebida.producto.nombre}`}
                    className="size-8 text-muted-foreground"
                  >
                    <Trash2 className="!size-4" />
                  </Button>
                </li>
              )
            })}
          </ul>
        )}

        <div className="flex justify-between px-[18px] py-3 text-sm">
          <span className="text-subtle">Subtotal bebidas · redondeo hacia arriba</span>
          <span className="font-bold">{formatearMoneda(subtotal)}</span>
        </div>
      </Card>
    </div>
  )
}
