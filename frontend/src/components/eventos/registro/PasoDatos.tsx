/**
 * Paso 1 del registro de eventos (HU-01): datos básicos del evento y número de asistentes.
 */
import { CampoAsistentes } from '@/components/eventos/CampoAsistentes'
import { VistaPreviaEvento } from '@/components/eventos/VistaPreviaEvento'
import { CampoHora } from '@/components/eventos/CampoHora'
import { Alert } from '@/components/ui/alert'
import { Card } from '@/components/ui/card'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { PeriodoHora } from '@/lib/horario'
import { fechaMaxima, type ErroresEvento, type ValoresEvento } from '@/lib/reglasEvento'
import { TIPOS_EVENTO, type EstadoEvento } from '@/types/evento'
import { hoyIso } from '@/lib/formato'
interface PasoDatosProps {
  valores: ValoresEvento
  errores: ErroresEvento
  mostrarVacio: boolean
  // Aviso cuando la duración escrita es menor que las horas de algún servicio ya agregado (RN-18)
  avisoDuracion?: string | null
  esEdicion?: boolean
  estado?: EstadoEvento
  onEstadoChange?: (estado: EstadoEvento) => void
  onCambio: (campo: keyof ValoresEvento, valor: string) => void
}

export function PasoDatos({
  valores,
  errores,
  mostrarVacio,
  avisoDuracion,
  esEdicion,
  estado,
  onEstadoChange,
  onCambio
}: PasoDatosProps) {
  const propsError = (campo: keyof ValoresEvento) => ({
    'aria-invalid': Boolean(errores[campo]),
    'aria-describedby': errores[campo] ? `${campo}-error` : undefined,
  })

  return (
    <div className="flex flex-col items-start gap-6 xl:flex-row">
      <Card className="grid w-full flex-1 gap-x-6 gap-y-5 p-7 md:grid-cols-2">
        {avisoDuracion && (
          <Alert variant="warning" className="md:col-span-2">
            <strong>La duración no alcanza para los servicios agregados.</strong> {avisoDuracion}
          </Alert>
        )}
        <FormField id="nombre" label="Nombre del evento" error={errores.nombre} className="md:col-span-2">
          <Input
            id="nombre"
            value={valores.nombre}
            onChange={(e) => onCambio('nombre', e.target.value)}
            placeholder="Ej. Boda Martínez & Gómez"
            maxLength={150}
            {...propsError('nombre')}
          />
        </FormField>

        <FormField id="tipo" label="Tipo de evento" error={errores.tipo}>
          <Select id="tipo" value={valores.tipo} onChange={(e) => onCambio('tipo', e.target.value)} {...propsError('tipo')}>
            <option value="" disabled>
              Selecciona un tipo
            </option>
            {TIPOS_EVENTO.map((tipo) => (
              <option key={tipo} value={tipo}>
                {tipo}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField id="fecha" label="Fecha del evento" error={errores.fecha}>
          <Input
            id="fecha"
            type="date"
            min={hoyIso()}
            max={fechaMaxima()}
            value={valores.fecha}
            onChange={(e) => onCambio('fecha', e.target.value)}
            {...propsError('fecha')}
          />
        </FormField>

        <FormField
          id="horaInicio"
          label="Hora de inicio"
          error={errores.horaTexto}
          hint="Horario permitido: 8:00 a. m. a 9:00 p. m. Escríbela con horas y minutos y elige a. m. o p. m. 12:00 p. m. es mediodía y 12:00 a. m. es medianoche."
        >
          <CampoHora
            id="horaInicio"
            texto={valores.horaTexto}
            periodo={valores.horaPeriodo}
            invalido={Boolean(errores.horaTexto)}
            idError="horaInicio-error"
            onTexto={(v) => onCambio('horaTexto', v)}
            onPeriodo={(v: PeriodoHora) => onCambio('horaPeriodo', v)}
          />
        </FormField>

        <FormField id="duracion" label="Duración" error={errores.duracion}>
          <div className="relative">
            <Input
              id="duracion"
              type="number"
              min={3}
              max={8}
              step={0.5}
              inputMode="decimal"
              value={valores.duracion}
              onChange={(e) => onCambio('duracion', e.target.value)}
              placeholder="Ej. 6"
              className="pr-16"
              {...propsError('duracion')}
            />
            <span aria-hidden="true" className="pointer-events-none absolute top-3.5 right-3.5 text-sm text-muted-foreground">
              horas
            </span>
          </div>
        </FormField>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold">{esEdicion ? 'Estado del evento' : 'Estado inicial'}</span>
          {esEdicion ? (
            <div className="flex flex-col gap-1.5">
              <Select
                id="estado"
                value={estado || 'planificacion'}
                onChange={(e) => onEstadoChange?.(e.target.value as EstadoEvento)}
              >
                <option value="planificacion">Planificación</option>
                <option value="confirmado">Confirmado</option>
                <option value="realizado">Realizado</option>
                <option value="cancelado">Cancelado</option>
              </Select>
              {estado === 'realizado' && (
                <span className="text-[12px] text-muted-foreground">Un evento Realizado ya no puede cambiar a ningún otro estado.</span>
              )}
              {estado === 'cancelado' && (
                <span className="text-[12px] text-muted-foreground">Un evento Cancelado puede volver a Planificación.</span>
              )}
            </div>
          ) : (
            <span className="mt-2.5 inline-flex items-center gap-1.5 self-start rounded-full bg-accent px-3 py-1 text-[13px] font-bold text-accent-foreground">
              <span className="size-1.5 rounded-full bg-accent-foreground" />
              Planificación
            </span>
          )}
        </div>

        <div className="md:col-span-2">
          <CampoAsistentes valor={valores.asistentes} onChange={(v) => onCambio('asistentes', v)} mostrarVacio={mostrarVacio} />
        </div>

        <FormField id="observaciones" label="Observaciones generales" opcional className="md:col-span-2">
          <Textarea
            id="observaciones"
            rows={3}
            value={valores.observaciones}
            onChange={(e) => onCambio('observaciones', e.target.value)}
            maxLength={2000}
            placeholder="Ej. Ceremonia y recepción en el mismo salón."
          />
        </FormField>
      </Card>

      <div className="w-full xl:sticky xl:top-8 xl:w-80">
        <VistaPreviaEvento valores={valores} />
      </div>
    </div>
  )
}
