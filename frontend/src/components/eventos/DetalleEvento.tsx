/**
 * Detalle de un evento (HU-06) en una ventana grande sobre la lista de eventos (HU-53 · RF-60): datos generales y requerimientos
 * agrupados por categoría, con cantidades y el costo estimado total. El mobiliario indica cuánto es propio y cuánto hay que alquilar
 * según el inventario actual (HU-12). Las bebidas generales y las de coctelería se muestran en secciones separadas, cada una con su
 * costo (HU-13). Arriba van el nombre, la fecha, el estado y la X para cerrar; el resto está en pestañas: Datos · Alimentos y
 * bebidas · Mobiliario · Servicios · Personal · Costo. Son los mismos bloques de antes: solo cambia dónde y cómo se muestran.
 */
import { describirHorario } from '@/lib/horario'
import { ChefHat, Layers, LoaderCircle, Pencil, RotateCw, Users, X } from 'lucide-react'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { Modal } from '@/components/ui/modal'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { AsignacionMeseros, type MensajeAsignacion } from '@/components/eventos/AsignacionMeseros'
import { ComprasIngredientes } from '@/components/eventos/ComprasIngredientes'
import { ComprasCocteles } from '@/components/eventos/ComprasCocteles'
import { ModalBalanceLogistico } from '@/components/eventos/ModalBalanceLogistico'
import { useEventoDetalle } from '@/hooks/useEventoDetalle'
import { describirReparto, type RepartoMobiliario } from '@/lib/alquiler'
import {
  CATEGORIAS,
  categoriaDe,
  esTipoBebida,
  etiquetaServicio,
  TIPO_MOBILIARIO,
  TIPOS_BEBIDA,
  type ConfigCategoria,
  type TipoBebida,
} from '@/lib/categorias'
import { ESTADOS_EVENTO } from '@/lib/estadosEvento'
import { capitalizar, formatearFecha, formatearMoneda, formatearNumero } from '@/lib/formato'
import {
  calcularCocineros,
  calcularMeseros,
  explicarCocineros,
  explicarMeseros,
  relacionCocineros,
  relacionMeseros,
} from '@/lib/reglasPersonal'
import { describirHoras } from '@/lib/reglasServicios'
import { cn } from '@/lib/utils'
import { ApiError } from '@/services/api'
import { eventosService } from '@/services/eventosService'
import type { EstadoEvento, EventoDetalle, EventoListado } from '@/types/evento'
import { AvisoAlquiler, OrigenBadge } from './AlquilerMobiliario'
import { BuffetBadge, EstadoBadge } from './EstadoBadge'

interface ItemRequerimiento {
  id: string
  nombre: string
  nota?: string
  cantidad: string
  costo: string | null
  reparto?: RepartoMobiliario // Solo mobiliario: unidades propias y a alquilar
}

// Secciones del detalle, en orden. Las bebidas se dividen en generales y bar de coctelería (HU-13).
type Seccion = 'alimentos' | TipoBebida | 'mobiliario' | 'servicios'

const SECCIONES: Record<Seccion, ConfigCategoria> = {
  alimentos: CATEGORIAS.alimentos,
  bebida_general: TIPOS_BEBIDA.bebida_general,
  bar_cocteleria: TIPOS_BEBIDA.bar_cocteleria,
  mobiliario: CATEGORIAS.mobiliario,
  servicios: CATEGORIAS.servicios,
}

/**
 * Ordena los requerimientos del evento en las secciones que se muestran en pantalla.
 * - Los productos del catálogo van a Alimentos, Bebidas generales o Bar de coctelería según su clasificación.
 * - Los requerimientos adicionales van a Mobiliario (tipo "mobiliario") o a Servicios.
 */
function agruparRequerimientos(detalle: EventoDetalle) {
  const grupos: Record<Seccion, ItemRequerimiento[]> = {
    alimentos: [],
    bebida_general: [],
    bar_cocteleria: [],
    mobiliario: [],
    servicios: [],
  }
  const costos: Partial<Record<Seccion, number>> = {}

  for (const producto of detalle.productos_calculados) {
    const seccion: Seccion = esTipoBebida(producto.clasificacion)
      ? producto.clasificacion
      : categoriaDe(producto.clasificacion) === 'alimentos'
        ? 'alimentos'
        : 'mobiliario'
    costos[seccion] = (costos[seccion] ?? 0) + Number(producto.costo_estimado || 0)
    grupos[seccion].push({
      id: `p-${producto.id}`,
      nombre: producto.nombre,
      nota: producto.componentes_menu ?? undefined,
      cantidad: `${formatearNumero(producto.cantidad_con_margen)} ${producto.unidad_entrega}`,
      costo: formatearMoneda(producto.costo_estimado),
    })
  }

  for (const servicio of detalle.servicios_adicionales) {
    const esMobiliario = servicio.tipo === TIPO_MOBILIARIO
    // El backend ya compara el mobiliario con el stock actual del inventario
    const reparto = esMobiliario
      ? { propias: servicio.unidades_propias ?? 0, alquilar: servicio.unidades_alquilar ?? servicio.cantidad ?? 0 }
      : undefined
    const prefijoOrigen =
      servicio.producto_id === null
        ? 'No está en el inventario · '
        : servicio.inventario_es_propio === false
          ? 'Elemento alquilado · '
          : ''
    const origen = reparto ? `${prefijoOrigen}${describirReparto(reparto)}` : null

    // HU-48: Costo individual del servicio
    let costoServicioNum: number | null = null
    if (!esMobiliario) {
      if (servicio.costo_total != null) {
        costoServicioNum = Number(servicio.costo_total)
      } else if (servicio.valor_unitario != null) {
        const vu = Number(servicio.valor_unitario)
        costoServicioNum = servicio.tipo_cobro === 'por_hora'
          ? vu * Number(servicio.horas || 0)
          : vu * Number(servicio.cantidad || 1)
      }
      if (costoServicioNum !== null && Number.isFinite(costoServicioNum)) {
        costos.servicios = (costos.servicios ?? 0) + costoServicioNum
      }
    }

    grupos[esMobiliario ? 'mobiliario' : 'servicios'].push({
      id: `s-${servicio.id}`,
      nombre: esMobiliario
        ? servicio.descripcion
        : `${etiquetaServicio(servicio.tipo)}${servicio.descripcion ? ` · ${servicio.descripcion}` : ''}`,
      nota:
        [origen, servicio.horas !== null && servicio.horas !== undefined ? describirHoras(Number(servicio.horas)) : null, servicio.notas]
          .filter(Boolean)
          .join(' · ') || undefined,
      reparto,
      cantidad:
        servicio.cantidad === null
          ? '—'
          : `${formatearNumero(servicio.cantidad)}${esMobiliario || (servicio.horas !== null && servicio.horas !== undefined) ? ' und' : ''}`,
      costo: costoServicioNum !== null && Number.isFinite(costoServicioNum) ? formatearMoneda(costoServicioNum) : null,
    })
  }

  // HU-48: Total consolidado del servidor (alimentos, bebidas y servicios) o sumatoria
  const costoAlimentosBebidas = detalle.productos_calculados.reduce((suma, p) => suma + Number(p.costo_estimado || 0), 0)
  const costoServicios = costos.servicios ?? 0
  const total =
    detalle.resumen_presupuesto?.costo_total_estimado != null
      ? Number(detalle.resumen_presupuesto.costo_total_estimado)
      : costoAlimentosBebidas + costoServicios
  const unidadesAlquilar = grupos.mobiliario.reduce((suma, item) => suma + (item.reparto?.alquilar ?? 0), 0)
  const unidadesPedidas = grupos.mobiliario.reduce((suma, item) => suma + (item.reparto ? item.reparto.propias + item.reparto.alquilar : 0), 0)
  return {
    grupos,
    costos,
    estadoAlquiler: detalle.estado_alquiler,
    total,
    unidadesAlquilar,
    unidadesPedidas,
    compras: detalle.compras_ingredientes,
    comprasCocteles: detalle.compras_cocteles,
    asignacion: detalle.asignacion_meseros,
    desviaciones: detalle.desviaciones_personal,
    vacio: detalle.productos_calculados.length + detalle.servicios_adicionales.length === 0,
  }
}

// Pestañas de la ventana, en orden
type Pestana = 'datos' | 'alimentos' | 'mobiliario' | 'servicios' | 'personal' | 'costo'

const PESTANAS: { id: Pestana; etiqueta: string }[] = [
  { id: 'datos', etiqueta: 'Datos' },
  { id: 'alimentos', etiqueta: 'Alimentos y bebidas' },
  { id: 'mobiliario', etiqueta: 'Mobiliario' },
  { id: 'servicios', etiqueta: 'Servicios' },
  { id: 'personal', etiqueta: 'Personal' },
  { id: 'costo', etiqueta: 'Costo' },
]

// Secciones de requerimientos que muestra cada pestaña (las bebidas se dividen en generales y bar de coctelería, HU-13)
const SECCIONES_DE: Partial<Record<Pestana, Seccion[]>> = {
  alimentos: ['alimentos', 'bebida_general', 'bar_cocteleria'],
  mobiliario: ['mobiliario'],
  servicios: ['servicios'],
}

type Requerimientos = ReturnType<typeof agruparRequerimientos>

/** Una sección de requerimientos (Alimentos, Bebidas generales, Mobiliario…) con sus ítems, cantidades y costos */
function SeccionRequerimientos({ seccion, requerimientos }: { seccion: Seccion; requerimientos: Requerimientos }) {
  const { etiqueta, icono: Icono, clases } = SECCIONES[seccion]
  const costo = requerimientos.costos[seccion]
  return (
    <section aria-label={etiqueta} className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className={cn('flex size-[26px] items-center justify-center rounded-[7px]', clases)}>
          <Icono className="size-[15px]" />
        </span>
        <span className="text-[13.5px] font-bold">{etiqueta}</span>
        {costo !== undefined && <span className="ml-auto text-[12.5px] font-semibold text-subtle">{formatearMoneda(costo)}</span>}
      </div>
      <ul className="flex flex-col gap-1">
        {requerimientos.grupos[seccion].map((item) => (
          <li key={item.id} className="grid grid-cols-[minmax(0,1fr)_auto_88px] gap-2 text-[13px]">
            <span className="flex min-w-0 flex-col">
              <span className="truncate" title={item.nombre}>
                {item.nombre}
              </span>
              {(item.reparto || item.nota) && (
                <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
                  {item.reparto && <OrigenBadge reparto={item.reparto} />}
                  {item.nota && (
                    // En el mobiliario la nota dice cuánto alquilar: se deja bajar de línea en vez de cortarla
                    <span className={cn('text-xs text-muted-foreground', item.reparto ? 'leading-snug' : 'truncate')} title={item.nota}>
                      {item.nota}
                    </span>
                  )}
                </span>
              )}
            </span>
            <span className="text-right font-semibold whitespace-nowrap">{item.cantidad}</span>
            <span className="text-right text-subtle">{item.costo ?? ''}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function DetalleEvento({ evento, onCerrar, onCambio }: { evento: EventoListado; onCerrar: () => void; onCambio?: () => void }) {
  // El detalle se vuelve a pedir cuando cambian los datos del evento que vienen de la lista (HU-31)
  const claveDetalle = `${evento.id}-${evento.asistentes}-${evento.estado}-${evento.fecha_evento}`
  const { detalle, cargando, error, recargar } = useEventoDetalle(evento.id, claveDetalle)
  const requerimientos = detalle ? agruparRequerimientos(detalle) : null
  const [activa, setActiva] = useState<Pestana>('datos')
  // Ventana del balance logístico (HU-31): se abre encima de esta ventana
  const [modalBalanceAbierto, setModalBalanceAbierto] = useState(false)
  const refsPestanas = useRef<Partial<Record<Pestana, HTMLButtonElement | null>>>({})
  // Mensaje de la asignación de meseros: se guarda aquí (y con el id del evento) porque el detalle se recarga al guardar
  const [mensajeAsignacion, setMensajeAsignacion] = useState<{ eventoId: number; mensaje: MensajeAsignacion } | null>(null)

  // Estado del evento (HU-51 · RF-58)
  const [estadoLocal, setEstadoLocal] = useState<EstadoEvento>(evento.estado)
  const [guardandoEstado, setGuardandoEstado] = useState(false)
  const [errorEstado, setErrorEstado] = useState<string | null>(null)
  const [exitoEstado, setExitoEstado] = useState<string | null>(null)

  useEffect(() => {
    setEstadoLocal(evento.estado)
    setErrorEstado(null)
    setExitoEstado(null)
  }, [evento.id, evento.estado])

  async function manejarCambioEstado(nuevo: EstadoEvento) {
    if (nuevo === estadoLocal) return
    setErrorEstado(null)
    setExitoEstado(null)
    setGuardandoEstado(true)
    try {
      await eventosService.cambiarEstado(evento.id, nuevo)
      setEstadoLocal(nuevo)
      setExitoEstado(`Estado actualizado a «${ESTADOS_EVENTO[nuevo]?.etiqueta ?? nuevo}».`)
      recargar()
      onCambio?.()
    } catch (err) {
      const mensaje = err instanceof ApiError ? err.message : 'Error al cambiar el estado del evento.'
      setErrorEstado(mensaje)
      setEstadoLocal(evento.estado)
    } finally {
      setGuardandoEstado(false)
    }
  }

  const datos = [
    { etiqueta: 'Fecha', valor: formatearFecha(evento.fecha_evento) },
    { etiqueta: 'Duración', valor: `${formatearNumero(evento.duracion_horas)} h` },
    { etiqueta: 'Horario', valor: describirHorario(evento.hora_inicio, Number(evento.duracion_horas)) ?? 'Sin hora de inicio' },
    { etiqueta: 'Asistentes', valor: formatearNumero(evento.asistentes) },
    { etiqueta: 'Modalidad', valor: evento.es_modalidad_buffet ? 'Buffet' : 'Servida a la mesa' },
  ]

  // Cuántos ítems tiene cada pestaña de requerimientos (se ve en la pestaña como una pequeña cifra)
  const conteo = (pestana: Pestana) =>
    requerimientos ? (SECCIONES_DE[pestana] ?? []).reduce((suma, seccion) => suma + requerimientos.grupos[seccion].length, 0) : null

  // Flechas, Inicio y Fin para moverse entre pestañas con el teclado
  function moverPestana(e: KeyboardEvent<HTMLButtonElement>, indice: number) {
    const ultimo = PESTANAS.length - 1
    const destino =
      e.key === 'ArrowRight' ? (indice + 1) % PESTANAS.length : e.key === 'ArrowLeft' ? (indice + ultimo) % PESTANAS.length : e.key === 'Home' ? 0 : e.key === 'End' ? ultimo : null
    if (destino === null) return
    e.preventDefault()
    const pestana = PESTANAS[destino].id
    setActiva(pestana)
    refsPestanas.current[pestana]?.focus()
  }

  // Lo que se muestra mientras el detalle (los requerimientos) carga o si falló. Los datos del evento ya vienen de la lista.
  const estadoCarga = (
    <>
      {cargando && !requerimientos && (
        <div className="flex flex-col gap-2.5" aria-label="Cargando el detalle del evento">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      )}
      {error && (
        <div className="flex flex-col items-start gap-3">
          <Alert variant="error">{error}</Alert>
          <Button variant="secondary" size="sm" onClick={recargar}>
            <RotateCw aria-hidden="true" />
            Reintentar
          </Button>
        </div>
      )}
    </>
  )

  const sinRequerimientos = (texto: string) => (
    <p className="rounded-[10px] bg-background px-3 py-3 text-[13.5px] text-subtle">{texto}</p>
  )

  return (
    <Modal
      etiqueta="Detalle del evento"
      onCerrar={onCerrar}
      className="h-[calc(100dvh-1.5rem)] w-[calc(100vw-1.5rem)] max-w-[1600px] sm:h-[calc(100dvh-3rem)] sm:w-[calc(100vw-3rem)]"
    >
      {/* Arriba: nombre, fecha, estado, la acción de editar y la X para cerrar */}
      <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4 sm:px-6 sm:py-5">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <EstadoBadge estado={estadoLocal} />
            {evento.es_modalidad_buffet && <BuffetBadge className="rounded-full px-2.5 py-1 text-[12.5px]" />}
          </div>
          <h2 className="font-display text-2xl leading-tight font-bold break-words">{evento.nombre_evento}</h2>
          <span className="text-sm text-subtle">
            {formatearFecha(evento.fecha_evento)} · {capitalizar(evento.tipo_evento)}
          </span>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setModalBalanceAbierto(true)}
            className="gap-1.5"
            title="Ver balance logístico del evento"
          >
            <Layers aria-hidden="true" className="size-3.5" />
            Balance logístico
          </Button>
          <Link to={`/eventos/${evento.id}/editar`} className={buttonVariants({ variant: 'secondary', size: 'sm', className: 'gap-1.5' })}>
            <Pencil aria-hidden="true" className="size-3.5" />
            Editar evento
          </Link>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar el detalle del evento"
            className="flex size-9 cursor-pointer items-center justify-center rounded-[10px] text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>
      </header>

      <div role="tablist" aria-label="Secciones del evento" className="flex shrink-0 gap-1 overflow-x-auto border-b border-border px-3 sm:px-5">
        {PESTANAS.map(({ id, etiqueta }, indice) => {
          const seleccionada = id === activa
          const cantidad = conteo(id)
          return (
            <button
              key={id}
              ref={(el) => {
                refsPestanas.current[id] = el
              }}
              type="button"
              role="tab"
              id={`detalle-pestana-${id}`}
              aria-selected={seleccionada}
              aria-controls={`detalle-panel-${id}`}
              tabIndex={seleccionada ? 0 : -1}
              onClick={() => setActiva(id)}
              onKeyDown={(e) => moverPestana(e, indice)}
              className={cn(
                '-mb-px flex h-12 shrink-0 cursor-pointer items-center gap-2 border-b-[3px] px-3 text-[14.5px] font-bold whitespace-nowrap outline-none focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-inset',
                seleccionada ? 'border-primary text-foreground' : 'border-transparent text-subtle hover:text-foreground',
              )}
            >
              {etiqueta}
              {cantidad !== null && cantidad > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-chip px-1.5 text-xs text-subtle">{cantidad}</span>
              )}
            </button>
          )
        })}
      </div>

      <div
        role="tabpanel"
        id={`detalle-panel-${activa}`}
        aria-labelledby={`detalle-pestana-${activa}`}
        aria-live="polite"
        className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-5 sm:px-6"
      >
        {activa === 'datos' && (
          <>
            <dl className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
              {datos.map(({ etiqueta, valor }) => (
                <div key={etiqueta} className="flex flex-col gap-0.5 rounded-[10px] bg-background px-3 py-2.5">
                  <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
                  <dd className="text-sm font-bold">{valor}</dd>
                </div>
              ))}
            </dl>

            {/* HU-51 · Cambiar el estado del evento (RF-58) */}
            <div className="flex max-w-md flex-col gap-2.5 rounded-[10px] bg-background p-3.5">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="cambiar-estado-evento" className="text-xs font-bold tracking-[0.04em] text-muted-foreground uppercase">
                  Estado del evento
                </label>
                {guardandoEstado && (
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
                    Guardando…
                  </span>
                )}
              </div>
              <Select
                id="cambiar-estado-evento"
                value={estadoLocal}
                disabled={guardandoEstado}
                onChange={(e) => manejarCambioEstado(e.target.value as EstadoEvento)}
                className="h-10 text-[13.5px]"
              >
                <option value="planificacion">Planificación</option>
                <option value="confirmado">Confirmado</option>
                <option value="realizado">Realizado</option>
                <option value="cancelado">Cancelado</option>
              </Select>

              {estadoLocal === 'realizado' && (
                <p className="text-[12px] text-muted-foreground">Un evento Realizado ya no puede cambiar a ningún otro estado.</p>
              )}
              {estadoLocal === 'cancelado' && <p className="text-[12px] text-muted-foreground">Un evento Cancelado puede volver a Planificación.</p>}

              {errorEstado && (
                <Alert variant="error" className="py-2 text-xs">
                  {errorEstado}
                </Alert>
              )}
              {exitoEstado && (
                <Alert variant="success" className="py-2 text-xs">
                  {exitoEstado}
                </Alert>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold text-muted-foreground">Observaciones</span>
              <p className="text-[13.5px] leading-relaxed text-subtle">{evento.observaciones_generales || 'Sin observaciones.'}</p>
            </div>
          </>
        )}

        {/* Alimentos y bebidas: los platos, las bebidas generales, el bar de coctelería y lo que hay que comprar (HU-47 y HU-45) */}
        {activa === 'alimentos' && (
          <>
            {estadoCarga}
            {requerimientos && conteo('alimentos') === 0 && sinRequerimientos('Este evento aún no tiene alimentos ni bebidas registrados.')}
            {requerimientos && (SECCIONES_DE.alimentos ?? []).filter((s) => requerimientos.grupos[s].length > 0).map((s) => <SeccionRequerimientos key={s} seccion={s} requerimientos={requerimientos} />)}
            {/* HU-47: lo que hay que comprar de cada ingrediente, según los asistentes y las recetas de los platos */}
            {requerimientos && <ComprasIngredientes compras={requerimientos.compras} />}
            {/* HU-45: botellas de licor para coctelería a comprar, según los asistentes y recetas de cócteles */}
            {requerimientos?.comprasCocteles && <ComprasCocteles compras={requerimientos.comprasCocteles} />}
          </>
        )}

        {activa === 'mobiliario' && (
          <>
            {estadoCarga}
            {requerimientos && (
              <AvisoAlquiler
                superaUmbral={requerimientos.estadoAlquiler.umbral_superado}
                umbral={requerimientos.estadoAlquiler.umbral}
                unidadesAlquilar={requerimientos.unidadesAlquilar}
                unidadesPedidas={requerimientos.unidadesPedidas}
                className="text-[13px]"
              />
            )}
            {requerimientos && conteo('mobiliario') === 0 && sinRequerimientos('Este evento aún no tiene mobiliario registrado.')}
            {requerimientos && requerimientos.grupos.mobiliario.length > 0 && <SeccionRequerimientos seccion="mobiliario" requerimientos={requerimientos} />}
          </>
        )}

        {activa === 'servicios' && (
          <>
            {estadoCarga}
            {requerimientos && conteo('servicios') === 0 && sinRequerimientos('Este evento aún no tiene servicios adicionales registrados.')}
            {requerimientos && requerimientos.grupos.servicios.length > 0 && <SeccionRequerimientos seccion="servicios" requerimientos={requerimientos} />}
          </>
        )}

        {/* Personal: los requeridos por regla (HU-21 y HU-22) y la asignación de meseros (HU-28 a HU-30) */}
        {activa === 'personal' && (
          <>
            <div className="grid gap-3 md:grid-cols-2">
              {/* HU-21: personal de servicio. Se calcula con los asistentes (1 por cada 20, redondeado hacia arriba) */}
              <div className="flex items-center gap-3.5 rounded-[10px] bg-accent px-3.5 py-3 text-accent-foreground">
                <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-card">
                  <Users className="size-5" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-xs font-semibold">Meseros requeridos · {relacionMeseros}</span>
                  <span className="text-[12.5px] opacity-80">{explicarMeseros(evento.asistentes)}</span>
                </div>
                <span aria-label="Meseros requeridos" className="font-display text-3xl leading-none font-extrabold">
                  {formatearNumero(calcularMeseros(evento.asistentes))}
                </span>
              </div>

              {/* HU-22: cocineros. Una sola regla para todos los eventos, sin depender de la comida (2 por cada 25, hacia arriba) */}
              <div className="flex items-center gap-3.5 rounded-[10px] bg-accent px-3.5 py-3 text-accent-foreground">
                <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-card">
                  <ChefHat className="size-5" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-xs font-semibold">Cocineros requeridos · {relacionCocineros}</span>
                  <span className="text-[12.5px] opacity-80">{explicarCocineros(evento.asistentes)}</span>
                </div>
                <span aria-label="Cocineros requeridos" className="font-display text-3xl leading-none font-extrabold">
                  {formatearNumero(calcularCocineros(evento.asistentes))}
                </span>
              </div>
            </div>

            {estadoCarga}
            {/* HU-28: los meseros asignados frente a los requeridos, y el selector para asignarlos */}
            {requerimientos && (
              <AsignacionMeseros
                eventoId={evento.id}
                estadoEvento={evento.estado}
                asignacion={requerimientos.asignacion}
                mensaje={mensajeAsignacion?.eventoId === evento.id ? mensajeAsignacion.mensaje : null}
                onMensaje={(mensaje) => setMensajeAsignacion(mensaje ? { eventoId: evento.id, mensaje } : null)}
                onCambio={recargar}
              />
            )}
          </>
        )}

        {/* Costo: lo que cuesta cada grupo de requerimientos y el total estimado */}
        {activa === 'costo' && (
          <>
            {estadoCarga}
            {requerimientos?.vacio && sinRequerimientos('Este evento aún no tiene requerimientos registrados.')}
            {requerimientos && !requerimientos.vacio && (
              <section aria-label="Costo estimado" className="flex max-w-xl flex-col gap-2">
                {(Object.keys(SECCIONES) as Seccion[])
                  .filter((s) => requerimientos.costos[s] !== undefined)
                  .map((s) => (
                    <div key={s} className="flex items-baseline justify-between gap-3 text-[13.5px]">
                      <span className="text-subtle">{SECCIONES[s].etiqueta}</span>
                      <span className="font-semibold">{formatearMoneda(requerimientos.costos[s] ?? 0)}</span>
                    </div>
                  ))}
                <div className="mt-1 flex items-baseline justify-between border-t border-border pt-3.5">
                  <span className="text-[13px] text-subtle">Costo total estimado</span>
                  <span className="font-display text-[22px] font-bold">{formatearMoneda(requerimientos.total)}</span>
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {/* HU-31 (RF-39, RF-40): el balance se abre dentro de esta ventana para quedar por encima de ella */}
      <ModalBalanceLogistico
        abierto={modalBalanceAbierto}
        onCerrar={() => setModalBalanceAbierto(false)}
        eventoId={evento.id}
        refrescoKey={`${requerimientos?.asignacion?.meseros_asignados}-${requerimientos?.asignacion?.confirmados}-${requerimientos?.asignacion?.por_confirmar}-${requerimientos?.asignacion?.estado}`}
      />
    </Modal>
  )
}
