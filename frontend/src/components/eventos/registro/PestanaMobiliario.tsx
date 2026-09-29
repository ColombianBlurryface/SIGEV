/**
 * Pestaña "Mobiliario" (HU-04): tipo de elemento, referencia y cantidad.
 * No tiene cálculo automático de costo; se guarda como requerimiento adicional de tipo "mobiliario".
 */
import { Info, Plus, Trash2, Users } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { formatearNumero } from '@/lib/formato'
import { TIPOS_MOBILIARIO, type MobiliarioAgregado } from '@/types/registro'

const COLUMNAS = 'grid grid-cols-[180px_minmax(0,1fr)_110px_36px] items-center gap-2.5'

interface PestanaMobiliarioProps {
  asistentes: number
  mobiliario: MobiliarioAgregado[]
  onAgregar: (item: MobiliarioAgregado) => void
  onQuitar: (id: string) => void
}

export function PestanaMobiliario({ asistentes, mobiliario, onAgregar, onQuitar }: PestanaMobiliarioProps) {
  const [elemento, setElemento] = useState('')
  const [referencia, setReferencia] = useState('')
  const [cantidad, setCantidad] = useState('')
  const [errorForm, setErrorForm] = useState<string | null>(null)

  const totalUnidades = mobiliario.reduce((suma, m) => suma + m.cantidad, 0)

  function agregar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const cantidadNumero = Number(cantidad)

    if (!elemento) return setErrorForm('Selecciona el tipo de elemento.')
    if (elemento === 'Otro' && !referencia.trim()) return setErrorForm('Describe el elemento en «Referencia o descripción».')
    if (!Number.isInteger(cantidadNumero) || cantidadNumero < 1) return setErrorForm('La cantidad debe ser un número entero mayor a 0.')

    onAgregar({ id: crypto.randomUUID(), elemento, referencia: referencia.trim(), cantidad: cantidadNumero })
    setElemento('')
    setReferencia('')
    setCantidad('')
    setErrorForm(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-5">
        <form onSubmit={agregar} noValidate className="flex flex-col gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-base font-bold">Agregar mobiliario</h2>
            <span className="text-[12.5px] text-muted-foreground">Se registra por cantidad, sin costo automático</span>
          </div>

          <div className="grid items-start gap-3.5 md:grid-cols-4">
            <FormField id="mobiliario-elemento" label="Tipo de elemento">
              <Select id="mobiliario-elemento" value={elemento} onChange={(e) => setElemento(e.target.value)}>
                <option value="" disabled>
                  Selecciona un elemento
                </option>
                {TIPOS_MOBILIARIO.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField id="mobiliario-referencia" label="Referencia o descripción" opcional={elemento !== 'Otro'} className="md:col-span-2">
              <Input
                id="mobiliario-referencia"
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                placeholder="Ej. sillas Tiffany doradas"
                maxLength={200}
              />
            </FormField>

            <FormField id="mobiliario-cantidad" label="Cantidad requerida">
              <Input
                id="mobiliario-cantidad"
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
              />
            </FormField>
          </div>

          {errorForm && <Alert variant="error">{errorForm}</Alert>}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button variant="secondary" size="sm" onClick={() => setCantidad(String(asistentes))} className="rounded-full">
              <Users aria-hidden="true" />
              Igualar a asistentes ({formatearNumero(asistentes)})
            </Button>
            <Button type="submit" className="md:w-44">
              <Plus aria-hidden="true" />
              Agregar
            </Button>
          </div>
        </form>
      </Card>

      <Card className="overflow-hidden rounded-[14px]">
        <div
          className={`${COLUMNAS} border-b border-border bg-muted px-[18px] py-3 text-[11.5px] font-bold tracking-[0.04em] text-muted-foreground uppercase`}
        >
          <span>Elemento</span>
          <span>Referencia</span>
          <span className="text-right">Cantidad</span>
          <span />
        </div>

        {mobiliario.length === 0 ? (
          <p className="px-[18px] py-8 text-center text-sm text-subtle">Todavía no has agregado mobiliario a este evento.</p>
        ) : (
          <ul>
            {mobiliario.map((item) => (
              <li key={item.id} className={`${COLUMNAS} border-b border-border px-[18px] py-3 text-sm`}>
                <span className="font-bold">{item.elemento}</span>
                <span className="truncate text-subtle" title={item.referencia}>
                  {item.referencia || '—'}
                </span>
                <span className="text-right font-bold">{formatearNumero(item.cantidad)} und</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onQuitar(item.id)}
                  aria-label={`Quitar ${item.elemento}${item.referencia ? ` (${item.referencia})` : ''}`}
                  className="size-8 text-muted-foreground"
                >
                  <Trash2 className="!size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center justify-between gap-3 px-[18px] py-3 text-sm">
          <span className="flex items-center gap-2 text-subtle">
            <Info aria-hidden="true" className="size-4" />
            El mobiliario se cotiza aparte
          </span>
          <span className="font-bold">
            {mobiliario.length} {mobiliario.length === 1 ? 'elemento' : 'elementos'} · {formatearNumero(totalUnidades)} und
          </span>
        </div>
      </Card>
    </div>
  )
}
