/**
 * Pestaña "Servicios adicionales" (HU-05): DJ, música, sonido, etc.
 * Sin cálculo automático; se guardan como requerimientos adicionales.
 *
 * RN-18: cada servicio admite de 1 a 5 unidades y sus horas no pueden superar la duración del evento.
 * COR-06: las horas van de 1 a 5 y cada tipo tiene un tope de unidades por evento (3 DJs, 2 de sonido...).
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
  // Duración del evento en horas (NaN si todavía no es válida): tope de las horas de cada servicio
  duracionHoras: number
  onAgregar: (servicio: ServicioAgregado) => void
  onQuitar: (id: string) => void
}

export function PestanaServicios({ servicios, duracionHoras, onAgregar, onQuitar }: PestanaServiciosProps) {
  // Por defecto el servicio dura todo el evento (hasta 5 horas); se puede bajar
  const horasPorDefecto = Number.isFinite(duracionHoras) ? String(maximoHoras(duracionHoras)) : ''
  const [tipo, setTipo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [unidades, setUnidades] = useState('1')
  const [horas, setHoras] = useState('')
  const [notas, setNotas] = useState('')
  const [errorForm, setErrorForm] = useState<string | null>(null)

  // Los errores de unidades y horas se avisan apenas se escriben, sin esperar a «Agregar»
  const errorUnidades =
    unidades.trim() !== '' && !esUnidadesServicioValida(unidades)
      ? MENSAJE_UNIDADES_SERVICIO
      : errorUnidadesPorTipo(tipo, unidades, servicios, etiquetaServicio(tipo))
  const topeTipo = tipo ? MAXIMO_UNIDADES_POR_TIPO[tipo] : undefined
  const horasMostradas = horas === '' ? horasPorDefecto : horas
  const errorDeHoras = horas.trim() !== '' ? errorHoras(horas, duracionHoras) : undefined

  function agregar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (!tipo) return setErrorForm('Selecciona el tipo de servicio.')
    if (!descripcion.trim()) return setErrorForm('Escribe una descripción del servicio.')
    if (!esUnidadesServicioValida(unidades)) return setErrorForm(MENSAJE_UNIDADES_SERVICIO)
    const mensajeUnidades = errorUnidadesPorTipo(tipo, unidades, servicios, etiquetaServicio(tipo))
    if (mensajeUnidades) return setErrorForm(mensajeUnidades)
    const mensajeHoras = errorHoras(horasMostradas, duracionHoras)
    if (mensajeHoras) return setErrorForm(mensajeHoras)

    onAgregar({
      id: crypto.randomUUID(),
      tipo,
      descripcion: descripcion.trim(),
      cantidad: Number(unidades),
      horas: leerHoras(horasMostradas) as number,
      notas: notas.trim(),
    })
    setTipo('')
    setDescripcion('')
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

            <FormField
              id="servicio-horas"
              label="Horas de servicio"
              hint={
                Number.isFinite(duracionHoras)
                  ? `De ${HORAS_SERVICIO_MIN} a ${formatearNumero(maximoHoras(duracionHoras))} h${duracionHoras < 5 ? ': lo que dura el evento' : ''}`
                  : 'Indica primero la duración del evento'
              }
              error={errorDeHoras}
            >
              <Input
                id="servicio-horas"
                type="text"
                inputMode="decimal"
                maxLength={5}
                value={horasMostradas}
                onChange={(e) => {
                  setHoras(e.target.value)
                  setErrorForm(null)
                }}
                aria-invalid={Boolean(errorDeHoras)}
              />
            </FormField>

            <FormField id="servicio-notas" label="Notas" opcional className="md:col-span-2">
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
          {servicios.map((servicio) => {
            const excede = Number.isFinite(duracionHoras) && servicio.horas > duracionHoras
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
                    <span className="truncate text-[13px] text-muted-foreground">{servicio.notas || 'Sin notas'}</span>
                    {excede && (
                      <span className="text-[12.5px] font-semibold text-destructive">
                        Dura más que el evento ({formatearNumero(duracionHoras)} h): corrige las horas o quita el servicio.
                      </span>
                    )}
                  </div>
                  <span className="rounded-full bg-chip px-2.5 py-1 text-[12.5px] font-bold whitespace-nowrap text-subtle">
                    {formatearNumero(servicio.cantidad)} und · {describirHoras(servicio.horas)}
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
