/**
 * Pestaña "Servicios adicionales" (HU-05): DJ, música, sonido, etc.
 * Sin cálculo automático; se guardan como requerimientos adicionales.
 */
import { Info, Music, Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { etiquetaServicio, TIPOS_SERVICIO } from '@/lib/categorias'
import { formatearNumero } from '@/lib/formato'
import type { ServicioAgregado } from '@/types/registro'

interface PestanaServiciosProps {
  servicios: ServicioAgregado[]
  onAgregar: (servicio: ServicioAgregado) => void
  onQuitar: (id: string) => void
}

export function PestanaServicios({ servicios, onAgregar, onQuitar }: PestanaServiciosProps) {
  const [tipo, setTipo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [cantidad, setCantidad] = useState('')
  const [notas, setNotas] = useState('')
  const [errorForm, setErrorForm] = useState<string | null>(null)

  function agregar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const cantidadNumero = cantidad.trim() === '' ? null : Number(cantidad)

    if (!tipo) return setErrorForm('Selecciona el tipo de servicio.')
    if (!descripcion.trim()) return setErrorForm('Escribe una descripción del servicio.')
    if (cantidadNumero !== null && (!Number.isInteger(cantidadNumero) || cantidadNumero < 1)) {
      return setErrorForm('La cantidad u horas debe ser un número entero mayor a 0, o dejarse vacía.')
    }

    onAgregar({ id: crypto.randomUUID(), tipo, descripcion: descripcion.trim(), cantidad: cantidadNumero, notas: notas.trim() })
    setTipo('')
    setDescripcion('')
    setCantidad('')
    setNotas('')
    setErrorForm(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-5">
        <form onSubmit={agregar} noValidate className="flex flex-col gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-base font-bold">Agregar servicio adicional</h2>
            <span className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
              <Info aria-hidden="true" className="size-3.5" />
              Sin cálculo automático
            </span>
          </div>

          <div className="grid items-start gap-3.5 md:grid-cols-4">
            <FormField id="servicio-tipo" label="Tipo de servicio">
              <Select id="servicio-tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
                <option value="" disabled>
                  Selecciona un tipo
                </option>
                {TIPOS_SERVICIO.map(({ valor, etiqueta }) => (
                  <option key={valor} value={valor}>
                    {etiqueta}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField id="servicio-descripcion" label="Descripción" className="md:col-span-2">
              <Input
                id="servicio-descripcion"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Ej. DJ para recepción y fiesta"
                maxLength={300}
              />
            </FormField>

            <FormField id="servicio-cantidad" label="Cantidad u horas" opcional>
              <Input
                id="servicio-cantidad"
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
              />
            </FormField>

            <FormField id="servicio-notas" label="Notas" opcional className="md:col-span-3">
              <Input
                id="servicio-notas"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Ej. incluye luces básicas"
                maxLength={300}
              />
            </FormField>

            <Button type="submit" className="md:mt-7">
              <Plus aria-hidden="true" />
              Agregar
            </Button>
          </div>

          {errorForm && <Alert variant="error">{errorForm}</Alert>}
        </form>
      </Card>

      {servicios.length === 0 ? (
        <Card className="px-[18px] py-8 text-center text-sm text-subtle">
          Todavía no has agregado servicios adicionales a este evento.
        </Card>
      ) : (
        <ul aria-label="Servicios agregados" className="flex flex-col gap-2.5">
          {servicios.map((servicio) => (
            <li key={servicio.id}>
              <Card className="flex items-center gap-3.5 rounded-[14px] px-[18px] py-3.5">
                <span
                  aria-hidden="true"
                  className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-servicios-soft text-servicios"
                >
                  <Music className="size-5" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-[14.5px] font-bold">
                    {etiquetaServicio(servicio.tipo)} · {servicio.descripcion}
                  </span>
                  <span className="truncate text-[13px] text-muted-foreground">{servicio.notas || 'Sin notas'}</span>
                </div>
                {servicio.cantidad !== null && (
                  <span className="rounded-full bg-chip px-2.5 py-1 text-[12.5px] font-bold text-subtle">
                    {formatearNumero(servicio.cantidad)}
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onQuitar(servicio.id)}
                  aria-label={`Quitar ${etiquetaServicio(servicio.tipo)}: ${servicio.descripcion}`}
                  className="size-8 text-muted-foreground"
                >
                  <Trash2 className="!size-4" />
                </Button>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
