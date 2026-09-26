import { CampoAsistentes } from '@/components/eventos/CampoAsistentes'
import { VistaPreviaEvento } from '@/components/eventos/VistaPreviaEvento'
import { Card } from '@/components/ui/card'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { ErroresEvento, ValoresEvento } from '@/lib/reglasEvento'
import { TIPOS_EVENTO } from '@/types/evento'

interface PasoDatosProps {
  valores: ValoresEvento
  errores: ErroresEvento
  mostrarVacio: boolean
  onCambio: (campo: keyof ValoresEvento, valor: string) => void
}

export function PasoDatos({ valores, errores, mostrarVacio, onCambio }: PasoDatosProps) {
  const propsError = (campo: keyof ValoresEvento) => ({
    'aria-invalid': Boolean(errores[campo]),
    'aria-describedby': errores[campo] ? `${campo}-error` : undefined,
  })

  return (
    <div className="flex flex-col items-start gap-6 xl:flex-row">
      <Card className="grid w-full flex-1 gap-x-6 gap-y-5 p-7 md:grid-cols-2">
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
            value={valores.fecha}
            onChange={(e) => onCambio('fecha', e.target.value)}
            {...propsError('fecha')}
          />
        </FormField>

        <FormField id="duracion" label="Duración" error={errores.duracion}>
          <div className="relative">
            <Input
              id="duracion"
              type="number"
              min={0.5}
              max={99}
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
          <span className="text-sm font-semibold">Estado inicial</span>
          <span className="mt-2.5 inline-flex items-center gap-1.5 self-start rounded-full bg-accent px-3 py-1 text-[13px] font-bold text-accent-foreground">
            <span className="size-1.5 rounded-full bg-accent-foreground" />
            Planificación
          </span>
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
