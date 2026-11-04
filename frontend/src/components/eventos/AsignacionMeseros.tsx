/**
 * Meseros asignados a un evento (HU-28 · RF-35): cuántos hay frente a los que el evento requiere (1 por cada 20
 * asistentes, HU-21), quiénes son, y el selector para cambiar la asignación. Guardar sincroniza la lista completa:
 * los que se desmarcan se quitan y los marcados se agregan.
 */
import { LoaderCircle, Search, UserCheck, UserRound } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { usePersonal } from '@/hooks/usePersonal'
import { formatearNumero, normalizar } from '@/lib/formato'
import { cn } from '@/lib/utils'
import { ApiError } from '@/services/api'
import { eventosService } from '@/services/eventosService'
import type { AsignacionMeseros as Asignacion, EstadoEvento } from '@/types/evento'

// Lo que se le dice a la persona después de guardar. Vive en el componente padre porque al guardar el detalle se
// vuelve a cargar y este componente se vuelve a montar: si el mensaje viviera aquí, se perdería.
export interface MensajeAsignacion {
  exito: string
  advertencias: Asignacion['advertencias']
}

interface AsignacionMeserosProps {
  eventoId: number
  estadoEvento: EstadoEvento
  asignacion: Asignacion
  mensaje: MensajeAsignacion | null
  onMensaje: (mensaje: MensajeAsignacion | null) => void
  // Se llama después de guardar para que el detalle se vuelva a cargar
  onCambio: () => void
}

const ESTILO_ESTADO = {
  completo: 'bg-success-soft text-success-foreground',
  deficit: 'bg-warning-soft text-warning-foreground',
  excedente: 'bg-accent text-accent-foreground',
} as const

function etiquetaEstado(a: Asignacion) {
  if (a.estado === 'completo') return 'Completo'
  if (a.estado === 'deficit') return `Faltan ${formatearNumero(a.deficit)}`
  return `Sobran ${formatearNumero(a.excedente)}`
}

export function AsignacionMeseros({ eventoId, estadoEvento, asignacion, mensaje, onMensaje, onCambio }: AsignacionMeserosProps) {
  const [editando, setEditando] = useState(false)
  // A un evento realizado o cancelado ya no se le asigna personal
  const cerrado = estadoEvento === 'realizado' || estadoEvento === 'cancelado'

  return (
    <section aria-label="Meseros asignados" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span aria-hidden="true" className="flex size-[26px] items-center justify-center rounded-[7px] bg-accent text-accent-foreground">
          <UserCheck className="size-[15px]" />
        </span>
        <span className="text-[13.5px] font-bold">Meseros asignados</span>
        <span aria-label="Meseros asignados frente a los requeridos" className="ml-auto text-[13px] font-bold">
          {formatearNumero(asignacion.total_asignados)} de {formatearNumero(asignacion.meseros_requeridos)}
        </span>
        <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-bold', ESTILO_ESTADO[asignacion.estado])}>{etiquetaEstado(asignacion)}</span>
      </div>

      {mensaje && <Alert variant="success">{mensaje.exito}</Alert>}
      {mensaje?.advertencias && mensaje.advertencias.length > 0 && (
        <Alert variant="warning">
          <strong>Ojo con la disponibilidad.</strong>{' '}
          {mensaje.advertencias.map((a) => `${a.nombre_completo} también está en ${a.otros_eventos.map((e) => `«${e.nombre_evento}»`).join(', ')} ese mismo día`).join('; ')}.
        </Alert>
      )}

      {asignacion.meseros_asignados.length === 0 ? (
        <p className="rounded-[10px] bg-background px-3 py-3 text-[13.5px] text-subtle">Todavía no hay meseros asignados a este evento.</p>
      ) : (
        <ul aria-label="Meseros asignados al evento" className="flex flex-col gap-1">
          {asignacion.meseros_asignados.map((m) => (
            <li key={m.id} className="flex min-w-0 items-center gap-2 text-[13px]">
              <UserRound aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate font-semibold" title={m.nombre_completo}>
                {m.nombre_completo}
              </span>
              <span className="truncate text-xs text-muted-foreground" title={m.contacto}>
                {m.contacto}
              </span>
            </li>
          ))}
        </ul>
      )}

      {cerrado ? (
        <p className="text-xs text-muted-foreground">Este evento está {estadoEvento}: ya no se le asigna personal.</p>
      ) : editando ? (
        <EditorAsignacion
          eventoId={eventoId}
          requeridos={asignacion.meseros_requeridos}
          inicial={asignacion.meseros_asignados.map((m) => m.id)}
          onCancelar={() => setEditando(false)}
          onGuardado={(resultado) => {
            setEditando(false)
            onMensaje({
              exito: `Asignación guardada: ${formatearNumero(resultado.total_asignados)} de ${formatearNumero(resultado.meseros_requeridos)} meseros.`,
              advertencias: resultado.advertencias ?? [],
            })
            onCambio()
          }}
        />
      ) : (
        <div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              onMensaje(null)
              setEditando(true)
            }}
          >
            {asignacion.meseros_asignados.length === 0 ? 'Asignar meseros' : 'Cambiar asignación'}
          </Button>
        </div>
      )}
    </section>
  )
}

interface EditorProps {
  eventoId: number
  requeridos: number
  inicial: number[]
  onCancelar: () => void
  onGuardado: (resultado: Asignacion) => void
}

// Lista de los meseros registrados y activos, con casillas. Se monta solo al abrir la edición.
function EditorAsignacion({ eventoId, requeridos, inicial, onCancelar, onGuardado }: EditorProps) {
  const { personal, cargando, error } = usePersonal()
  const [marcados, setMarcados] = useState<Set<number>>(() => new Set(inicial))
  const [busqueda, setBusqueda] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [errorServidor, setErrorServidor] = useState<string | null>(null)
  const termino = normalizar(busqueda.trim())
  const visibles = personal.filter((p) => termino === '' || normalizar(`${p.nombre_completo} ${p.contacto}`).includes(termino))

  function alternar(id: number) {
    setErrorServidor(null)
    setMarcados((prev) => {
      const siguiente = new Set(prev)
      if (siguiente.has(id)) siguiente.delete(id)
      else siguiente.add(id)
      return siguiente
    })
  }

  async function guardar() {
    setGuardando(true)
    setErrorServidor(null)
    try {
      // Solo se envían los que siguen activos: un mesero eliminado mientras tanto se descarta
      const ids = personal.filter((p) => marcados.has(p.id)).map((p) => p.id)
      onGuardado(await eventosService.asignarMeseros(eventoId, ids))
    } catch (err) {
      setErrorServidor(err instanceof ApiError ? err.message : 'No fue posible guardar la asignación.')
    } finally {
      setGuardando(false)
    }
  }

  if (cargando) return <p className="text-[13px] text-subtle">Cargando los meseros registrados…</p>
  if (error) return <Alert variant="error">{error}</Alert>
  if (personal.length === 0) {
    return (
      <p className="rounded-[10px] bg-background px-3 py-3 text-[13.5px] text-subtle">
        No hay meseros registrados. <Link to="/personal" className="font-semibold text-primary underline">Regístralos en Personal</Link> para poder asignarlos.
      </p>
    )
  }

  const seleccionados = personal.filter((p) => marcados.has(p.id)).length
  return (
    <div className="flex flex-col gap-3 rounded-[12px] border border-border bg-background p-3">
      <div className="relative">
        <label htmlFor="buscar-asignacion" className="sr-only">
          Buscar mesero para asignar
        </label>
        <Search aria-hidden="true" className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground" />
        <Input id="buscar-asignacion" type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar mesero" className="h-10 pl-9 text-[13.5px]" />
      </div>

      <ul aria-label="Meseros disponibles para asignar" className="flex max-h-64 flex-col gap-1 overflow-y-auto pr-1">
        {visibles.length === 0 && <li className="px-1 py-2 text-[13px] text-subtle">Ningún mesero coincide con la búsqueda.</li>}
        {visibles.map((p) => (
          <li key={p.id}>
            <label className="flex cursor-pointer items-center gap-3 rounded-[8px] px-2 py-2 hover:bg-muted">
              <input type="checkbox" checked={marcados.has(p.id)} onChange={() => alternar(p.id)} disabled={guardando} className="size-4 accent-[var(--color-primary)]" />
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-[13.5px] font-semibold">{p.nombre_completo}</span>
                <span className="truncate text-xs text-muted-foreground">{p.contacto}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>

      <p aria-live="polite" className="text-xs text-muted-foreground">
        {formatearNumero(seleccionados)} {seleccionados === 1 ? 'seleccionado' : 'seleccionados'} · el evento requiere {formatearNumero(requeridos)}
      </p>

      {errorServidor && <Alert variant="error">{errorServidor}</Alert>}

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={guardar} disabled={guardando}>
          {guardando && <LoaderCircle aria-hidden="true" className="animate-spin" />}
          Guardar asignación
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={onCancelar} disabled={guardando}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}
