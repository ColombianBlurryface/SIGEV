/**
 * Pestaña "Servicios adicionales" (HU-05, HU-48): DJ, música, sonido, animación, etc.
 * RN-18: cada servicio admite de 1 a 5 unidades, tarifa obligatoria > 0 y sus horas no superan la duración del evento.
 * HU-48 (RF-47, RF-56): modalidad por servicio o por hora, con valor unitario y costo total que suma al presupuesto del evento.
 */
import { DollarSign, Music, Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { etiquetaServicio, TIPOS_SERVICIO } from '@/lib/categorias'
import { formatearMoneda, formatearNumero } from '@/lib/formato'
import {
  describirHoras,
  errorHoras,
  errorUnidadesPorTipo,
  esUnidadesServicioValida,
  HORAS_SERVICIO_MIN,
  leerHoras,
  MAXIMO_UNIDADES_POR_TIPO,
  maximoHoras,
  unidadesDisponibles,
  MENSAJE_UNIDADES_SERVICIO,
  UNIDADES_SERVICIO_MAX,
  UNIDADES_SERVICIO_MIN,
} from '@/lib/reglasServicios'
import type { ServicioAgregado } from '@/types/registro'

interface PestanaServiciosProps {
  servicios: ServicioAgregado[]
  // Duración del evento en horas: tope de las horas de cada servicio
  duracionHoras: number
  onAgregar: (servicio: ServicioAgregado) => void
  onQuitar: (id: string) => void
}

export function PestanaServicios({ servicios, duracionHoras, onAgregar, onQuitar }: PestanaServiciosProps) {
  const [tipo, setTipo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [tipoCobro, setTipoCobro] = useState<'por_servicio' | 'por_hora'>('por_servicio')
  const [valorUnitario, setValorUnitario] = useState('')
  const [unidades, setUnidades] = useState('1')
  const [horas, setHoras] = useState('')
  const [notas, setNotas] = useState('')
  const [errorForm, setErrorForm] = useState<string | null>(null)

  // Validaciones reactivas en UI (RN-18)
  const errorUnidades =
    unidades.trim() !== '' && !esUnidadesServicioValida(unidades)
      ? MENSAJE_UNIDADES_SERVICIO
      : errorUnidadesPorTipo(tipo, unidades, servicios, etiquetaServicio(tipo))
  const topeTipo = tipo ? MAXIMO_UNIDADES_POR_TIPO[tipo] : undefined
  const errorDeHoras = tipoCobro === 'por_hora' && horas.trim() !== '' ? errorHoras(horas, duracionHoras, tipoCobro) : undefined

  // Cálculo de subtotal dinámico para vista previa en el formulario
  const tarifaNum = Number(valorUnitario) || 0
  const horasNum = Number(horas) || 0
  const unidadesNum = Number(unidades) || 1
  const subtotalEstimado = tipoCobro === 'por_hora' ? tarifaNum * horasNum : tarifaNum * unidadesNum

  function agregar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (!tipo) return setErrorForm('Selecciona el tipo de servicio.')
    if (!descripcion.trim()) return setErrorForm('Escribe una descripción del servicio.')

    // Validación tarifa obligatoria > 0 (HU-48 / RN-18)
    const valorNum = Number(valorUnitario)
    if (!valorUnitario.trim() || !Number.isFinite(valorNum) || valorNum <= 0) {
      return setErrorForm('La tarifa o valor unitario es obligatoria y debe ser mayor a 0.')
    }

    if (!esUnidadesServicioValida(unidades)) return setErrorForm(MENSAJE_UNIDADES_SERVICIO)
    const mensajeUnidades = errorUnidadesPorTipo(tipo, unidades, servicios, etiquetaServicio(tipo))
    if (mensajeUnidades) return setErrorForm(mensajeUnidades)

    if (tipoCobro === 'por_hora') {
      const mensajeHoras = errorHoras(horas, duracionHoras, tipoCobro)
      if (mensajeHoras) return setErrorForm(mensajeHoras)
    }

    const horasFinal = tipoCobro === 'por_hora' ? (leerHoras(horas) ?? undefined) : undefined
    const costoTotalCalculado =
      tipoCobro === 'por_hora'
        ? Number((valorNum * (horasFinal || 0)).toFixed(2))
        : Number((valorNum * Number(unidades)).toFixed(2))

    onAgregar({
      id: crypto.randomUUID(),
      tipo,
      descripcion: descripcion.trim(),
      tipo_cobro: tipoCobro,
      valor_unitario: valorNum,
      cantidad: Number(unidades),
      horas: horasFinal,
      costo_total: costoTotalCalculado,
      notas: notas.trim(),
    })

    // Resetear formulario
    setTipo('')
    setDescripcion('')
    setTipoCobro('por_servicio')
    setValorUnitario('')
    setUnidades('1')
    setHoras('')
    setNotas('')
    setErrorForm(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-5">
        <form onSubmit={agregar} noValidate className="flex flex-col gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-base font-bold">Agregar servicio adicional (HU-48)</h2>
            <span className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
              <DollarSign aria-hidden="true" className="size-3.5" />
              Suma al presupuesto del evento
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

            <FormField id="servicio-modalidad" label="Modalidad de cobro">
              <Select
                id="servicio-modalidad"
                value={tipoCobro}
                onChange={(e) => {
                  setTipoCobro(e.target.value as 'por_servicio' | 'por_hora')
                  setErrorForm(null)
                }}
              >
                <option value="por_servicio">Por servicio (fijo)</option>
                <option value="por_hora">Por hora</option>
              </Select>
            </FormField>

            <FormField
              id="servicio-valor"
              label="Tarifa / Valor unitario ($)"
              hint="Obligatorio y mayor a 0"
            >
              <Input
                id="servicio-valor"
                type="number"
                min="1"
                step="any"
                value={valorUnitario}
                placeholder="Ej. 150000"
                onChange={(e) => {
                  setValorUnitario(e.target.value)
                  setErrorForm(null)
                }}
              />
            </FormField>

            <FormField
              id="servicio-cantidad"
              label="Unidades"
              hint={
                topeTipo === undefined
                  ? `De ${UNIDADES_SERVICIO_MIN} a ${UNIDADES_SERVICIO_MAX}`
                  : `Máximo ${topeTipo} por evento · quedan ${unidadesDisponibles(tipo, servicios)}`
              }
              error={errorUnidades}
            >
              <Input
                id="servicio-cantidad"
                type="text"
                inputMode="numeric"
                maxLength={3}
                value={unidades}
                onChange={(e) => {
                  setUnidades(e.target.value)
                  setErrorForm(null)
                }}
                aria-invalid={Boolean(errorUnidades)}
              />
            </FormField>

            {tipoCobro === 'por_hora' ? (
              <FormField
                id="servicio-horas"
                label="Horas de servicio"
                hint={
                  Number.isFinite(duracionHoras)
                    ? `De ${HORAS_SERVICIO_MIN} a ${formatearNumero(maximoHoras(duracionHoras))} h${duracionHoras < 5 ? ': duración del evento' : ''}`
                    : 'Indica primero la duración del evento'
                }
                error={errorDeHoras}
              >
                <Input
                  id="servicio-horas"
                  type="text"
                  inputMode="decimal"
                  maxLength={5}
                  value={horas}
                  placeholder={Number.isFinite(duracionHoras) ? `Máx. ${formatearNumero(maximoHoras(duracionHoras))}` : ''}
                  onChange={(e) => {
                    setHoras(e.target.value)
                    setErrorForm(null)
                  }}
                  aria-invalid={Boolean(errorDeHoras)}
                />
              </FormField>
            ) : (
              <FormField id="servicio-notas" label="Notas" opcional>
                <Input
                  id="servicio-notas"
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Ej. incluye luces básicas"
                  maxLength={300}
                />
              </FormField>
            )}

            <div className="flex items-center justify-between gap-3 md:col-span-4 md:mt-2">
              <div className="text-sm font-medium text-muted-foreground">
                Subtotal estimado servicio:{' '}
                <span className="font-bold text-foreground">
                  {formatearMoneda ? formatearMoneda(subtotalEstimado) : `$${subtotalEstimado.toLocaleString('es-CO')}`}
                </span>
              </div>
              <Button type="submit">
                <Plus aria-hidden="true" />
                Agregar servicio
              </Button>
            </div>
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
          {servicios.map((servicio) => {
            const excede =
              servicio.tipo_cobro === 'por_hora' &&
              Number.isFinite(duracionHoras) &&
              Number(servicio.horas) > duracionHoras
            const costoItem =
              servicio.costo_total ??
              (servicio.tipo_cobro === 'por_hora'
                ? (Number(servicio.valor_unitario) || 0) * (Number(servicio.horas) || 0)
                : (Number(servicio.valor_unitario) || 0) * (Number(servicio.cantidad) || 1))

            return (
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
                    <span className="truncate text-[13px] text-muted-foreground">
                      {servicio.tipo_cobro === 'por_hora'
                        ? `Tarifa: $${(servicio.valor_unitario || 0).toLocaleString('es-CO')} / hora · ${describirHoras(servicio.horas || 0)}`
                        : `Tarifa: $${(servicio.valor_unitario || 0).toLocaleString('es-CO')} c/u · ${formatearNumero(servicio.cantidad)} und`}
                      {servicio.notas ? ` · ${servicio.notas}` : ''}
                    </span>
                    {excede && (
                      <span className="text-[12.5px] font-semibold text-destructive">
                        Dura más que el evento ({formatearNumero(duracionHoras)} h): corrige las horas o quita el servicio.
                      </span>
                    )}
                  </div>
                  <span className="rounded-full bg-chip px-3 py-1 text-[13px] font-bold whitespace-nowrap text-primary">
                    ${costoItem.toLocaleString('es-CO')}
                  </span>
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
            )
          })}
        </ul>
      )}
    </div>
  )
}