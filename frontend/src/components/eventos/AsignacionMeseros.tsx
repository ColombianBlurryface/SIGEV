/**
 * Meseros asignados a un evento (HU-28 · RF-35): cuántos hay frente a los que el evento requiere (1 por cada 20
 * asistentes, HU-21), quiénes son, y el selector para cambiar la asignación. Guardar sincroniza la lista completa:
 * los que se desmarcan se quitan y los marcados se agregan.
 *
 * HU-29 (RF-36): cada mesero asignado tiene un estado (por confirmar, confirmado o no puede) que se cambia aquí mismo.
 * Quien «no puede» sigue en la lista pero no cuenta para el estándar: el «X de Y» y las alertas solo suman a los demás.
 */
import { LoaderCircle, Search, UserCheck, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatearNumero, normalizar } from '@/lib/formato'
import { cn } from '@/lib/utils'
import { ApiError } from '@/services/api'
import { eventosService } from '@/services/eventosService'
import type { AsignacionMeseros as Asignacion, EstadoEvento, EstadoMesero, MeseroCandidato } from '@/types/evento'

// Lo que se le dice a la persona después de guardar. Vive en el componente padre porque al guardar el detalle se
// vuelve a cargar y este componente se vuelve a montar: si el mensaje viviera aquí, se perdería.
export interface MensajeAsignacion {
  exito: string
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

const ETIQUETA_ESTADO_MESERO: Record<EstadoMesero, string> = {
  por_confirmar: 'Por confirmar',
  confirmado: 'Confirmado',
  no_puede: 'No puede',
}

const ESTILO_ESTADO_MESERO: Record<EstadoMesero, string> = {
  por_confirmar: 'border-border bg-muted text-muted-foreground',
  confirmado: 'border-transparent bg-success-soft text-success-foreground',
  no_puede: 'border-transparent bg-warning-soft text-warning-foreground',
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
  // HU-29: el mesero cuyo estado se está guardando, y el error del último intento
  const [cambiandoId, setCambiandoId] = useState<number | null>(null)
  const [errorEstado, setErrorEstado] = useState<string | null>(null)
  // A un evento realizado o cancelado ya no se le asigna personal
  const cerrado = estadoEvento === 'realizado' || estadoEvento === 'cancelado'

  async function cambiarEstado(id: number, nombre: string, estado: EstadoMesero) {
    setCambiandoId(id)
    setErrorEstado(null)
    onMensaje(null)
    try {
      await eventosService.cambiarEstadoMesero(eventoId, id, estado)
      onMensaje({ exito: `${nombre} quedó como «${ETIQUETA_ESTADO_MESERO[estado]}».` })
      onCambio()
    } catch (err) {
      setErrorEstado(err instanceof ApiError ? err.message : 'No fue posible cambiar el estado.')
    } finally {
      setCambiandoId(null)
    }
  }

  return (
    <section aria-label="Meseros asignados" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span aria-hidden="true" className="flex size-[26px] items-center justify-center rounded-[7px] bg-accent text-accent-foreground">
          <UserCheck className="size-[15px]" />
        </span>
        <span className="text-[13.5px] font-bold">Meseros asignados</span>
        <span aria-label="Meseros asignados frente a los requeridos" className="ml-auto text-[13px] font-bold">
          {formatearNumero(asignacion.total_utiles)} de {formatearNumero(asignacion.meseros_requeridos)}
        </span>
        <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-bold', ESTILO_ESTADO[asignacion.estado])}>{etiquetaEstado(asignacion)}</span>
      </div>

      {/* HU-25 (RF-32): Alerta visual explícita de desviación frente al estándar requerido */}
      {asignacion.estado === 'deficit' && (
        <Alert variant="warning">
          <span className="font-semibold">Alerta de personal: </span>
          {asignacion.alerta_personal?.mensaje ||
            `Faltan ${formatearNumero(asignacion.deficit)} ${asignacion.deficit === 1 ? 'mesero' : 'meseros'} para cumplir con el estándar requerido para este evento (1 por cada 20 asistentes).`}
        </Alert>
      )}

      {asignacion.estado === 'completo' && (
        <Alert variant="success">
          <span className="font-semibold">Dotación completa: </span>
          {asignacion.alerta_personal?.mensaje ||
            'La asignación de meseros cumple con el estándar requerido (1 por cada 20 asistentes).'}
        </Alert>
      )}

      {asignacion.estado === 'excedente' && (
        <Alert variant="info">
          <span className="font-semibold">Excedente de personal: </span>
          {asignacion.alerta_personal?.mensaje ||
            `Hay ${formatearNumero(asignacion.excedente)} ${asignacion.excedente === 1 ? 'mesero adicional asignado' : 'meseros adicionales asignados'} por encima del estándar requerido.`}
        </Alert>
      )}

      {mensaje && <Alert variant="success">{mensaje.exito}</Alert>}

      {asignacion.meseros_asignados.length === 0 ? (
        <p className="rounded-[10px] bg-background px-3 py-3 text-[13.5px] text-subtle">Todavía no hay meseros asignados a este evento.</p>
      ) : (
        <>
          <p className="text-xs text-muted-foreground" aria-label="Resumen de estados">
            {formatearNumero(asignacion.confirmados)} {asignacion.confirmados === 1 ? 'confirmado' : 'confirmados'} ·{' '}
            {formatearNumero(asignacion.por_confirmar)} por confirmar · {formatearNumero(asignacion.no_pueden)} {asignacion.no_pueden === 1 ? 'no puede' : 'no pueden'}
          </p>
          <ul aria-label="Meseros asignados al evento" className="flex flex-col gap-1.5">
            {asignacion.meseros_asignados.map((m) => (
              <li key={m.id} className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
                <UserRound aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
                <span className={cn('truncate font-semibold', m.estado === 'no_puede' && 'line-through opacity-70')} title={m.nombre_completo}>
                  {m.nombre_completo}
                </span>
                <span className="truncate text-xs text-muted-foreground" title={m.contacto}>
                  {m.contacto}
                </span>
                <span className="ml-auto flex items-center gap-2">
                  <span className={cn('rounded-full border px-2 py-0.5 text-xs font-bold', ESTILO_ESTADO_MESERO[m.estado])}>{ETIQUETA_ESTADO_MESERO[m.estado]}</span>
                  {!cerrado && (
                    <select
                      aria-label={`Estado de ${m.nombre_completo}`}
                      value={m.estado}
                      disabled={cambiandoId === m.id}
                      onChange={(e) => cambiarEstado(m.id, m.nombre_completo, e.target.value as EstadoMesero)}
                      className="h-8 rounded-[8px] border border-border bg-card px-2 text-xs"
                    >
                      {(Object.keys(ETIQUETA_ESTADO_MESERO) as EstadoMesero[]).map((estado) => (
                        <option key={estado} value={estado}>
                          {ETIQUETA_ESTADO_MESERO[estado]}
                        </option>
                      ))}
                    </select>
                  )}
                </span>
              </li>
            ))}
          </ul>
          {errorEstado && <Alert variant="error">{errorEstado}</Alert>}
        </>
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
              exito: `Asignación guardada: ${formatearNumero(resultado.total_utiles)} de ${formatearNumero(resultado.meseros_requeridos)} meseros.`,
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

// Lista de los meseros registrados y activos, con casillas. Los que ya están en otro evento que se cruza con este van
// bloqueados («Ocupado en…»), y al llegar al número de meseros que el evento requiere no se pueden marcar más. Se monta
// solo al abrir la edición.
function EditorAsignacion({ eventoId, requeridos, inicial, onCancelar, onGuardado }: EditorProps) {
  const [candidatos, setCandidatos] = useState<MeseroCandidato[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [marcados, setMarcados] = useState<Set<number>>(() => new Set(inicial))
  const [busqueda, setBusqueda] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [errorServidor, setErrorServidor] = useState<string | null>(null)

  useEffect(() => {
    let activo = true
    eventosService
      .meserosDisponibles(eventoId)
      .then((r) => {
        if (activo) setCandidatos(r.meseros)
      })
      .catch((err: unknown) => {
        if (activo) setError(err instanceof ApiError ? err.message : 'No fue posible cargar los meseros.')
      })
    return () => {
      activo = false
    }
  }, [eventoId])

  if (error) return <Alert variant="error">{error}</Alert>
  if (candidatos === null) return <p className="text-[13px] text-subtle">Cargando los meseros registrados…</p>
  if (candidatos.length === 0) {
    return (
      <p className="rounded-[10px] bg-background px-3 py-3 text-[13.5px] text-subtle">
        No hay meseros registrados. <Link to="/personal" className="font-semibold text-primary underline">Regístralos en Personal</Link> para poder asignarlos.
      </p>
    )
  }

  const termino = normalizar(busqueda.trim())
  const visibles = candidatos.filter((p) => termino === '' || normalizar(`${p.nombre_completo} ${p.contacto}`).includes(termino))
  // Quien está asignado como «no puede» no cuenta para el tope ni para el estándar (HU-29)
  const seleccionados = candidatos.filter((p) => marcados.has(p.id) && p.estado !== 'no_puede').length
  const topeAlcanzado = seleccionados >= requeridos

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
      const ids = (candidatos ?? []).filter((p) => marcados.has(p.id)).map((p) => p.id)
      onGuardado(await eventosService.asignarMeseros(eventoId, ids))
    } catch (err) {
      setErrorServidor(err instanceof ApiError ? err.message : 'No fue posible guardar la asignación.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-[12px] border border-border bg-background p-3">
      <div className="relative">
        <label htmlFor="buscar-asignacion" className="sr-only">
          Buscar mesero para asignar
        </label>
        <Search aria-hidden="true" className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground" />
        <Input id="buscar-asignacion" type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar mesero" className="h-10 pl-9 text-[13.5px]" />
      </div>

      <ul aria-label="Meseros disponibles para asignar" className="flex max-h-80 flex-col gap-1 overflow-y-auto pr-1">
        {visibles.length === 0 && <li className="px-1 py-2 text-[13px] text-subtle">Ningún mesero coincide con la búsqueda.</li>}
        {visibles.map((p) => {
          const marcado = marcados.has(p.id)
          const ocupado = !marcado && p.ocupado_en.length > 0
          const sinCupo = !marcado && topeAlcanzado
          const noPuede = marcado && p.estado === 'no_puede'
          const bloqueado = ocupado || sinCupo
          return (
            <li key={p.id}>
              <label className={cn('flex items-center gap-3 rounded-[8px] px-2 py-2', bloqueado ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-muted')}>
                <input
                  type="checkbox"
                  checked={marcado}
                  onChange={() => alternar(p.id)}
                  disabled={guardando || bloqueado}
                  className="size-4 accent-[var(--color-primary)]"
                />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-[13.5px] font-semibold">{p.nombre_completo}</span>
                  <span className="truncate text-xs text-muted-foreground">{p.contacto}</span>
                  {noPuede && <span className="text-xs font-semibold text-warning-foreground">Marcado como «No puede»: no cuenta para el estándar</span>}
                  {ocupado && (
                    <span className="text-xs font-semibold text-warning-foreground">
                      Ocupado en {p.ocupado_en.map((o) => `«${o.nombre_evento}» (${o.horario})`).join(', ')}
                    </span>
                  )}
                </span>
              </label>
            </li>
          )
        })}
      </ul>

      {seleccionados < requeridos ? (
        <Alert variant="warning" className="py-2 text-xs">
          <span className="font-semibold">Insuficiencia de personal: </span>
          Faltan {formatearNumero(requeridos - seleccionados)} {requeridos - seleccionados === 1 ? 'mesero' : 'meseros'} para cumplir con el estándar ({formatearNumero(seleccionados)} de {formatearNumero(requeridos)} seleccionados).
        </Alert>
      ) : seleccionados === requeridos ? (
        <Alert variant="success" className="py-2 text-xs">
          <span className="font-semibold">Dotación completa: </span>
          Se han seleccionado los {formatearNumero(requeridos)} meseros requeridos (1 por cada 20 asistentes).
        </Alert>
      ) : (
        <Alert variant="info" className="py-2 text-xs">
          <span className="font-semibold">Sobrecupo: </span>
          Hay {formatearNumero(seleccionados - requeridos)} {seleccionados - requeridos === 1 ? 'mesero adicional seleccionado' : 'meseros adicionales seleccionados'}.
        </Alert>
      )}

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
