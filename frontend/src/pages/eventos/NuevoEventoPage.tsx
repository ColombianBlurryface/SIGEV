import { LoaderCircle } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CampoAsistentes } from '@/components/eventos/CampoAsistentes'
import { VistaPreviaEvento } from '@/components/eventos/VistaPreviaEvento'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { Card } from '@/components/ui/card'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { validarAsistentes, validarEvento, type ErroresEvento, type ValoresEvento } from '@/lib/reglasEvento'
import { ApiError } from '@/services/api'
import { eventosService } from '@/services/eventosService'
import { TIPOS_EVENTO } from '@/types/evento'

const VALORES_INICIALES: ValoresEvento = {
  nombre: '',
  tipo: '',
  fecha: '',
  duracion: '',
  asistentes: '',
  observaciones: '',
}

export function NuevoEventoPage() {
  const navigate = useNavigate()
  const [valores, setValores] = useState<ValoresEvento>(VALORES_INICIALES)
  const [intentoEnviar, setIntentoEnviar] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [errorServidor, setErrorServidor] = useState<string | null>(null)

  const errores: ErroresEvento = intentoEnviar ? validarEvento(valores) : {}
  const estadoAsistentes = validarAsistentes(valores.asistentes).estado
  const asistentesFueraDeRango = estadoAsistentes === 'bajo' || estadoAsistentes === 'alto'

  const actualizar = (campo: keyof ValoresEvento) => (valor: string) => setValores((prev) => ({ ...prev, [campo]: valor }))

  const propsError = (campo: keyof ValoresEvento) => ({
    'aria-invalid': Boolean(errores[campo]),
    'aria-describedby': errores[campo] ? `${campo}-error` : undefined,
  })

  async function handleSubmit(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setIntentoEnviar(true)
    setErrorServidor(null)

    if (Object.keys(validarEvento(valores)).length > 0) return

    setEnviando(true)
    try {
      const { evento: creado } = await eventosService.crear({
        nombre_evento: valores.nombre.trim(),
        tipo_evento: valores.tipo,
        fecha_evento: valores.fecha,
        duracion_horas: Number(valores.duracion),
        asistentes: Number(valores.asistentes),
        observaciones_generales: valores.observaciones.trim() || undefined,
      })
      navigate('/eventos', { state: { aviso: `Evento «${creado.nombre_evento}» registrado en planificación.` } })
    } catch (err) {
      setErrorServidor(err instanceof ApiError ? err.message : 'No fue posible registrar el evento. Intenta de nuevo.')
      setEnviando(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Ruta" className="flex gap-2 text-[13.5px] text-muted-foreground">
        <Link to="/eventos" className="font-semibold text-primary hover:underline">
          Eventos
        </Link>
        <span aria-hidden="true">/</span>
        <span>Nuevo evento</span>
      </nav>

      <header className="flex flex-col gap-1.5">
        <h1 className="font-display text-4xl font-extrabold tracking-tight">Registrar evento</h1>
        <p className="text-[15px] text-subtle">Completa los datos básicos del evento. Todos los campos son obligatorios salvo las observaciones.</p>
      </header>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
        {errorServidor && <Alert variant="error">{errorServidor}</Alert>}

        <div className="flex flex-col items-start gap-6 xl:flex-row">
          <Card className="grid w-full flex-1 gap-x-6 gap-y-5 p-7 md:grid-cols-2">
            <FormField id="nombre" label="Nombre del evento" error={errores.nombre} className="md:col-span-2">
              <Input
                id="nombre"
                value={valores.nombre}
                onChange={(e) => actualizar('nombre')(e.target.value)}
                placeholder="Ej. Boda Martínez & Gómez"
                maxLength={150}
                disabled={enviando}
                {...propsError('nombre')}
              />
            </FormField>

            <FormField id="tipo" label="Tipo de evento" error={errores.tipo}>
              <Select
                id="tipo"
                value={valores.tipo}
                onChange={(e) => actualizar('tipo')(e.target.value)}
                disabled={enviando}
                {...propsError('tipo')}
              >
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
                onChange={(e) => actualizar('fecha')(e.target.value)}
                disabled={enviando}
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
                  onChange={(e) => actualizar('duracion')(e.target.value)}
                  placeholder="Ej. 6"
                  disabled={enviando}
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
              <CampoAsistentes
                valor={valores.asistentes}
                onChange={actualizar('asistentes')}
                mostrarVacio={intentoEnviar}
                disabled={enviando}
              />
            </div>

            <FormField id="observaciones" label="Observaciones generales" opcional className="md:col-span-2">
              <Textarea
                id="observaciones"
                rows={3}
                value={valores.observaciones}
                onChange={(e) => actualizar('observaciones')(e.target.value)}
                placeholder="Ej. Ceremonia y recepción en el mismo salón."
                disabled={enviando}
              />
            </FormField>
          </Card>

          <div className="w-full xl:sticky xl:top-8 xl:w-80">
            <VistaPreviaEvento valores={valores} />
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <Link to="/eventos" className={buttonVariants({ variant: 'ghost' })}>
            Cancelar
          </Link>
          <div className="flex items-center gap-4">
            {asistentesFueraDeRango && (
              <span className="hidden text-[13px] text-muted-foreground sm:inline">Corrige el número de asistentes para continuar</span>
            )}
            <Button type="submit" size="lg" disabled={enviando || asistentesFueraDeRango}>
              {enviando && <LoaderCircle aria-hidden="true" className="animate-spin" />}
              {enviando ? 'Registrando…' : 'Registrar evento'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
