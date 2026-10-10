/**
 * Pestaña "Alimentos" (HU-02): se elige un producto del catálogo, se ajusta la porción por persona
 * y se escriben los componentes del menú. Muestra en vivo la cantidad y el costo calculados.
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
import type { AlimentoAgregado } from '@/types/registro'

const COLUMNAS = 'grid grid-cols-[minmax(0,1fr)_76px_84px_96px_108px_36px] items-center gap-2.5'

interface PestanaAlimentosProps {
  asistentes: number
  alimentos: AlimentoAgregado[]
  onAgregar: (alimento: AlimentoAgregado) => void
  onQuitar: (productoId: number) => void
}

export function PestanaAlimentos({ asistentes, alimentos, onAgregar, onQuitar }: PestanaAlimentosProps) {
  const { productos, cargando, error, recargar } = useCatalogo('alimento')
  const [productoId, setProductoId] = useState('')
  const [porcion, setPorcion] = useState('')
  const [componentes, setComponentes] = useState('')
  const [errorForm, setErrorForm] = useState<string | null>(null)

  // Un producto solo se puede agregar una vez por evento, así que se quita de la lista al agregarlo
  const agregados = new Set(alimentos.map((a) => a.producto.id))
  const disponibles = productos.filter((p) => !agregados.has(p.id))
  const producto = productos.find((p) => p.id === Number(productoId)) ?? null
  const porcionNumero = Number(porcion)
  const porcionValida = porcion.trim() !== '' && Number.isFinite(porcionNumero) && porcionNumero > 0
  // Cálculo en vivo mientras el usuario escribe (mismas fórmulas que el backend)
  const vistaPrevia = producto && porcionValida ? calcularProducto(producto, porcionNumero, asistentes) : null
  const subtotal = alimentos.reduce((suma, a) => suma + calcularProducto(a.producto, a.porcion, asistentes).costo, 0)

  // Al elegir un producto se propone la porción por persona que trae el catálogo
  function elegirProducto(id: string) {
    setProductoId(id)
    setErrorForm(null)
    const elegido = productos.find((p) => p.id === Number(id))
    setPorcion(elegido ? String(Number(elegido.porcion_por_persona)) : '')
  }

  function agregar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (!producto) return setErrorForm('Selecciona un alimento del catálogo.')
    if (!porcionValida) return setErrorForm('La porción por persona debe ser mayor a 0.')

    onAgregar({ producto, porcion: porcionNumero, componentes: componentes.trim() })
    setProductoId('')
    setPorcion('')
    setComponentes('')
    setErrorForm(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-5">
        <form onSubmit={agregar} noValidate className="flex flex-col gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-base font-bold">Agregar alimento</h2>
            <span className="text-[12.5px] text-muted-foreground">Productos del catálogo · valores por persona</span>
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
                  <FormField id="alimento-producto" label="Producto" className="md:col-span-2">
                    <Select id="alimento-producto" value={productoId} onChange={(e) => elegirProducto(e.target.value)}>
                      <option value="" disabled>
                        {disponibles.length ? 'Selecciona un alimento' : 'Ya agregaste todo el catálogo'}
                      </option>
                      {disponibles.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre}
                        </option>
                      ))}
                    </Select>
                  </FormField>

                  <FormField id="alimento-porcion" label="Porción por persona">
                    <div className="relative">
                      <Input
                        id="alimento-porcion"
                        type="number"
                        min={0}
                        step="any"
                        inputMode="decimal"
                        value={porcion}
                        onChange={(e) => setPorcion(e.target.value)}
                        disabled={!producto}
                        className="pr-14"
                      />
                      <span aria-hidden="true" className="pointer-events-none absolute top-3.5 right-3.5 text-sm text-muted-foreground">
                        {producto?.unidad_medida ?? ''}
                      </span>
                    </div>
                  </FormField>

                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-semibold">Valor unitario</span>
                    <span className="flex h-12 items-center rounded-[10px] bg-muted px-3.5 text-[15px] font-semibold text-subtle">
                      {producto ? formatearMoneda(producto.precio_unitario) : '—'}
                    </span>
                  </div>

                  <FormField id="alimento-componentes" label="Componentes del menú" opcional className="md:col-span-3">
                    <Input
                      id="alimento-componentes"
                      value={componentes}
                      onChange={(e) => setComponentes(e.target.value)}
                      placeholder="Ej. salsa de champiñones, papas al romero"
                      maxLength={500}
                    />
                  </FormField>

                  <Button type="submit" className="md:mt-7" disabled={!disponibles.length}>
                    <Plus aria-hidden="true" />
                    Agregar
                  </Button>
                </div>

                {errorForm && <Alert variant="error">{errorForm}</Alert>}

                <div
                  aria-live="polite"
                  className="flex items-center gap-2.5 rounded-[10px] bg-alimentos-soft px-3.5 py-2.5 text-[13.5px] font-semibold text-alimentos"
                >
                  <Calculator aria-hidden="true" className="size-[17px] shrink-0" />
                  {vistaPrevia
                    ? `Para ${formatearNumero(asistentes)} asistentes: ${formatearNumero(vistaPrevia.neto)} ${vistaPrevia.unidad} netos → ${formatearNumero(vistaPrevia.conMargen)} ${vistaPrevia.unidad} con margen · ${formatearMoneda(vistaPrevia.costo)}`
                    : 'Elige un producto y su porción para ver la cantidad calculada con el margen del 10%.'}
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
          <span>Producto</span>
          <span className="text-right">Porción</span>
          <span className="text-right">Neto</span>
          <span className="text-right">Con margen</span>
          <span className="text-right">Costo</span>
          <span />
        </div>

        {alimentos.length === 0 ? (
          <p className="px-[18px] py-8 text-center text-sm text-subtle">Todavía no has agregado alimentos a este evento.</p>
        ) : (
          <ul>
            {alimentos.map((alimento) => {
              const calculo = calcularProducto(alimento.producto, alimento.porcion, asistentes)
              return (
                <li key={alimento.producto.id} className={`${COLUMNAS} border-b border-border px-[18px] py-3 text-sm`}>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate font-bold">{alimento.producto.nombre}</span>
                    {alimento.componentes && (
                      <span className="truncate text-[12.5px] text-muted-foreground" title={alimento.componentes}>
                        {alimento.componentes}
                      </span>
                    )}
                  </span>
                  <span className="text-right">
                    {formatearNumero(alimento.porcion)} {alimento.producto.unidad_medida}
                  </span>
                  <span className="text-right">
                    {formatearNumero(calculo.neto)} {calculo.unidad}
                  </span>
                  <span className="text-right font-bold">
                    {formatearNumero(calculo.conMargen)} {calculo.unidad}
                  </span>
                  <span className="text-right">{formatearMoneda(calculo.costo)}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onQuitar(alimento.producto.id)}
                    aria-label={`Quitar ${alimento.producto.nombre}`}
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
          <span className="text-subtle">Subtotal alimentos · margen del 10% incluido</span>
          <span className="font-bold">{formatearMoneda(subtotal)}</span>
        </div>
      </Card>
    </div>
  )
}
