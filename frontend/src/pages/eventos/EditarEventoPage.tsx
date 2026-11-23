/**
 * Página "Editar evento" (HU-50 · RF-57): permite modificar todos los datos
 * registrados de un evento (datos básicos, alimentos, bebidas, cócteles,
 * mobiliario y servicios adicionales), aplicando las mismas validaciones
 * y recalculando cantidades reactivamente.
 */
import { ArrowLeft, Check, ChevronRight, LoaderCircle, RotateCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PasoDatos } from '@/components/eventos/registro/PasoDatos'
import { PasoRequerimientos } from '@/components/eventos/registro/PasoRequerimientos'
import { PasoResumen } from '@/components/eventos/registro/PasoResumen'
import { PasosRegistro, type Paso } from '@/components/eventos/registro/PasosRegistro'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { etiquetaServicio, TIPO_MOBILIARIO } from '@/lib/categorias'
import { formatearFecha, formatearNumero } from '@/lib/formato'
import { de24Horas } from '@/lib/horario'
import { MAX_EVENTOS_POR_FECHA, horaInicio24, validarAsistentes, validarEvento, type ErroresEvento, type ValoresEvento } from '@/lib/reglasEvento'
import { describirHoras, serviciosFueraDeDuracion } from '@/lib/reglasServicios'
import { ApiError } from '@/services/api'
import { catalogoService } from '@/services/catalogoService'
import { eventosService } from '@/services/eventosService'
import type { ProductoCatalogo } from '@/types/catalogo'
import type { EstadoEvento } from '@/types/evento'
import { REQUERIMIENTOS_VACIOS, type RequerimientosEvento } from '@/types/registro'
import { useEventos } from '@/hooks/useEventos'

const VALORES_VACIOS: ValoresEvento = {
  nombre: '',
  tipo: '',
  fecha: '',
  horaTexto: '',
  horaPeriodo: '',
  duracion: '',
  asistentes: '',
  observaciones: '',
}

const TITULOS: Record<Paso, { titulo: string; descripcion: string }> = {
  1: {
    titulo: 'Editar evento',
    descripcion: 'Modifica los datos básicos del evento (asistentes, fecha, duración, etc.).',
  },
  2: {
    titulo: 'Editar requerimientos',
    descripcion: 'Modifica alimentos, bebidas, cócteles, mobiliario y servicios adicionales. Las cantidades se recalculan con los asistentes.',
  },
  3: {
    titulo: 'Revisa y actualiza',
    descripcion: 'Confirma que todo esté correcto antes de guardar los cambios del evento.',
  },
}

export function EditarEventoPage() {
  const { id } = useParams<{ id: string }>()
  const eventoId = Number(id)
  const navigate = useNavigate()
  const { eventos } = useEventos()

  const [cargandoInicial, setCargandoInicial] = useState(true)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [intentoCarga, setIntentoCarga] = useState(0)

  const [paso, setPaso] = useState<Paso>(1)
  const [valores, setValores] = useState<ValoresEvento>(VALORES_VACIOS)
  const [estado, setEstado] = useState<EstadoEvento>('planificacion')
  const [requerimientos, setRequerimientos] = useState<RequerimientosEvento>(REQUERIMIENTOS_VACIOS)
  const [intentoAvanzar, setIntentoAvanzar] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [errorServidor, setErrorServidor] = useState<string | null>(null)

  useEffect(() => {
    if (!Number.isInteger(eventoId) || eventoId <= 0) {
      setErrorCarga('El identificador del evento no es válido.')
      setCargandoInicial(false)
      return
    }

    let activo = true
    setCargandoInicial(true)
    setErrorCarga(null)

    Promise.all([
      eventosService.obtener(eventoId),
      catalogoService.listar(undefined, true),
    ])
      .then(([detalle, catalogo]) => {
        if (!activo) return

        setValores({
          nombre: detalle.nombre_evento,
          tipo: detalle.tipo_evento,
          fecha: detalle.fecha_evento.slice(0, 10),
          horaTexto: de24Horas(detalle.hora_inicio).texto,
          horaPeriodo: de24Horas(detalle.hora_inicio).periodo,
          duracion: String(Number(detalle.duracion_horas)),
          asistentes: String(detalle.asistentes),
          observaciones: detalle.observaciones_generales || '',
        })
        setEstado(detalle.estado)

        // Reconstruir requerimientos desde los productos y servicios guardados
        const alimentos = detalle.productos_calculados
          .filter((p) => p.clasificacion === 'alimento')
          .map((p) => {
            const cat = catalogo.find((c) => c.id === (p.producto_id || p.id))
            const producto: ProductoCatalogo = cat ?? {
              id: p.producto_id || p.id,
              nombre: p.nombre,
              clasificacion: 'alimento',
              porcion_por_persona: p.porcion_por_persona,
              unidad_medida: p.unidad_entrega,
              volumen_botella_ml: '',
              tamano_porcion_ml: '',
              tipo_calculo: 'porcion_persona',
              precio_unitario: p.precio_unitario,
              activo: true,
            }
            return {
              producto,
              porcion: Number(p.porcion_por_persona),
              componentes: p.componentes_menu || '',
            }
          })

        const bebidas = detalle.productos_calculados
          .filter((p) => p.clasificacion !== 'alimento')
          .map((p) => {
            const cat = catalogo.find((c) => c.id === (p.producto_id || p.id))
            const producto: ProductoCatalogo = cat
              ? { ...cat, precio_unitario: p.precio_unitario }
              : {
                  id: p.producto_id || p.id,
                  nombre: p.nombre,
                  clasificacion: p.clasificacion,
                  porcion_por_persona: p.porcion_por_persona,
                  unidad_medida: p.unidad_entrega,
                  volumen_botella_ml: '',
                  tamano_porcion_ml: '',
                  tipo_calculo: 'unidad_persona',
                  precio_unitario: p.precio_unitario,
                  activo: true,
                }
            return {
              producto,
              porcion: Number(p.porcion_por_persona),
            }
          })

        const mobiliario = detalle.servicios_adicionales
          .filter((s) => s.tipo === 'mobiliario')
          .map((s) => ({
            id: `mob-${s.id}`,
            productoId: s.producto_id,
            elemento: s.descripcion,
            referencia: s.notas || '',
            cantidad: Number(s.cantidad) || 0,
            disponible: s.disponible_inventario,
            alquilado: s.inventario_es_propio === false,
          }))

        const servicios = detalle.servicios_adicionales
          .filter((s) => s.tipo !== 'mobiliario')
          .map((s) => ({
            id: `serv-${s.id}`,
            tipo: s.tipo,
            descripcion: s.descripcion,
            cantidad: Number(s.cantidad) || 1,
            horas: s.horas != null ? Number(s.horas) : undefined,
            tipo_cobro: (s.tipo_cobro || (s.horas != null ? 'por_hora' : 'por_servicio')) as 'por_hora' | 'por_servicio',
            valor_unitario: Number(s.valor_unitario) || 0,
            costo_total: Number(s.costo_total) || 0,
            notas: s.notas || undefined,
          }))

        setRequerimientos({
          alimentos,
          bebidas,
          mobiliario,
          servicios,
        })
        setCargandoInicial(false)
      })
      .catch((err) => {
        if (!activo) return
        setErrorCarga(err instanceof ApiError ? err.message : 'No fue posible cargar el evento para editar.')
        setCargandoInicial(false)
      })

    return () => {
      activo = false
    }
  }, [eventoId, intentoCarga])

  // Al editar, se cuentan cuántos OTROS eventos no cancelados hay en la fecha seleccionada
  const eventosEnFecha = valores.fecha
    ? eventos.filter((e) => e.fecha_evento.slice(0, 10) === valores.fecha && e.estado !== 'cancelado' && e.id !== eventoId).length
    : 0

  const errores: ErroresEvento = intentoAvanzar
    ? validarEvento(valores, eventosEnFecha)
    : eventosEnFecha >= MAX_EVENTOS_POR_FECHA
      ? { fecha: `Ya no se puede registrar más. Esta fecha ya tiene el límite máximo de ${MAX_EVENTOS_POR_FECHA} eventos programados.` }
      : {}

  // RN-18 / HU-48: Validar horas en servicios por_hora frente a la nueva duración
  const duracionNumero = valores.duracion.trim() === '' ? Number.NaN : Number(valores.duracion)
  const serviciosPorHora = requerimientos.servicios.filter((s) => s.tipo_cobro === 'por_hora' && typeof s.horas === 'number')
  const serviciosPasados = serviciosFueraDeDuracion(serviciosPorHora, duracionNumero)
  const descripcionPasados = serviciosPasados
    .map((s) => `${etiquetaServicio(s.tipo)} (${describirHoras(s.horas ?? 0)})`)
    .join(', ')
  const avisoDuracion =
    serviciosPasados.length > 0
      ? `Con ${formatearNumero(duracionNumero)} h de duración, estos servicios ya no caben: ${descripcionPasados}. Corrige sus horas en el paso 2.`
      : null

  const asistentes = validarAsistentes(valores.asistentes)
  const asistentesFueraDeRango = asistentes.estado === 'bajo' || asistentes.estado === 'alto'

  const cambiarValor = (campo: keyof ValoresEvento, valor: string) => setValores((prev) => ({ ...prev, [campo]: valor }))

  function irAPaso(destino: Paso) {
    setErrorServidor(null)
    setPaso(destino)
    document.querySelector('main')?.scrollTo({ top: 0 })
  }

  function avanzarDesdeDatos() {
    setIntentoAvanzar(true)
    if (Object.keys(validarEvento(valores, eventosEnFecha)).length === 0) irAPaso(2)
  }

  function irAlResumen() {
    if (serviciosPasados.length > 0) {
      setErrorServidor(
        `No se puede continuar: ${descripcionPasados} dura${serviciosPasados.length === 1 ? '' : 'n'} más que el evento (${formatearNumero(duracionNumero)} h). Corrige las horas o quita el servicio.`,
      )
      return
    }
    irAPaso(3)
  }

  async function guardar() {
    setEnviando(true)
    setErrorServidor(null)
    try {
      const { evento } = await eventosService.actualizar(eventoId, {
        nombre_evento: valores.nombre.trim(),
        tipo_evento: valores.tipo,
        fecha_evento: valores.fecha,
        hora_inicio: horaInicio24(valores) || undefined,
        duracion_horas: Number(valores.duracion),
        asistentes: Number(valores.asistentes),
        observaciones_generales: valores.observaciones.trim() || undefined,
        estado,
        productos: [
          ...requerimientos.alimentos.map((a) => ({
            producto_id: a.producto.id,
            porcion_por_persona: a.porcion,
            componentes_menu: a.componentes || undefined,
          })),
          ...requerimientos.bebidas.map((b) => ({
            producto_id: b.producto.id,
            porcion_por_persona: b.porcion,
            precio_unitario: Number(b.producto.precio_unitario),
          })),
        ],
        servicios_adicionales: [
          ...requerimientos.mobiliario.map((m) => ({
            tipo: TIPO_MOBILIARIO,
            descripcion: m.elemento,
            cantidad: m.cantidad,
            notas: m.referencia || undefined,
            producto_id: m.productoId ?? undefined,
          })),
          ...requerimientos.servicios.map((s) => ({
            tipo: s.tipo,
            descripcion: s.descripcion,
            tipo_cobro: s.tipo_cobro || 'por_servicio',
            valor_unitario: Number(s.valor_unitario) || 0,
            cantidad: Number(s.cantidad || 1),
            horas: s.tipo_cobro === 'por_hora' ? (s.horas !== undefined ? Number(s.horas) : null) : null,
            notas: s.notas || undefined,
          })),
        ],
      })

      navigate(`/eventos?evento=${evento.id}`, {
        state: { aviso: `Evento «${evento.nombre_evento}» actualizado exitosamente.` },
      })
    } catch (err) {
      setErrorServidor(err instanceof ApiError ? err.message : 'No fue posible actualizar el evento. Intenta de nuevo.')
      setEnviando(false)
    }
  }

  if (cargandoInicial) {
    return (
      <div className="flex flex-col gap-6">
        <nav aria-label="Ruta" className="flex gap-2 text-[13.5px] text-muted-foreground">
          <Link to="/eventos" className="font-semibold text-primary hover:underline">
            Eventos
          </Link>
          <span aria-hidden="true">/</span>
          <span>Editar evento</span>
        </nav>
        <Card className="flex flex-col gap-4 p-8 items-center text-center">
          <LoaderCircle className="size-8 animate-spin text-primary" />
          <p className="text-sm text-subtle">Cargando datos del evento para editar…</p>
          <Skeleton className="h-6 w-48" />
        </Card>
      </div>
    )
  }

  if (errorCarga) {
    return (
      <div className="flex flex-col gap-6">
        <nav aria-label="Ruta" className="flex gap-2 text-[13.5px] text-muted-foreground">
          <Link to="/eventos" className="font-semibold text-primary hover:underline">
            Eventos
          </Link>
          <span aria-hidden="true">/</span>
          <span>Editar evento</span>
        </nav>
        <Alert variant="error">{errorCarga}</Alert>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setIntentoCarga((n) => n + 1)}>
            <RotateCw aria-hidden="true" />
            Reintentar
          </Button>
          <Link to="/eventos" className={buttonVariants({ variant: 'secondary' })}>
            Volver a eventos
          </Link>
        </div>
      </div>
    )
  }

  const { titulo, descripcion } = TITULOS[paso]

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Ruta" className="flex gap-2 text-[13.5px] text-muted-foreground">
        <Link to="/eventos" className="font-semibold text-primary hover:underline">
          Eventos
        </Link>
        <span aria-hidden="true">/</span>
        <Link to={`/eventos?evento=${eventoId}`} className="font-semibold text-primary hover:underline">
          Detalle #{eventoId}
        </Link>
        <span aria-hidden="true">/</span>
        <span>Editar evento</span>
      </nav>

      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">{titulo}</h1>
          <p className="text-[15px] text-subtle">
            {paso === 1
              ? descripcion
              : `${valores.nombre.trim()} · ${formatearFecha(valores.fecha)} · ${formatearNumero(asistentes.cantidad ?? 0)} asistentes`}
          </p>
          {paso !== 1 && <p className="text-[13.5px] text-muted-foreground">{descripcion}</p>}
        </div>
        <PasosRegistro actual={paso} />
      </header>

      {errorServidor && <Alert variant="error">{errorServidor}</Alert>}

      {paso === 1 && (
        <PasoDatos
          valores={valores}
          errores={errores}
          mostrarVacio={intentoAvanzar}
          avisoDuracion={avisoDuracion}
          esEdicion={true}
          estado={estado}
          onEstadoChange={setEstado}
          onCambio={cambiarValor}
        />
      )}
      {paso === 2 && (
        <PasoRequerimientos
          asistentes={asistentes.cantidad ?? 0}
          duracionHoras={duracionNumero}
          requerimientos={requerimientos}
          onCambio={setRequerimientos}
        />
      )}
      {paso === 3 && <PasoResumen valores={valores} requerimientos={requerimientos} onIrAPaso={irAPaso} />}

      <div className="flex items-center justify-between gap-4 border-t border-border pt-5">
        {paso === 1 ? (
          <Link to={`/eventos?evento=${eventoId}`} className={buttonVariants({ variant: 'ghost' })}>
            Cancelar
          </Link>
        ) : (
          <Button variant="secondary" onClick={() => irAPaso(paso === 3 ? 2 : 1)} disabled={enviando}>
            <ArrowLeft aria-hidden="true" />
            Atrás
          </Button>
        )}

        <div className="flex items-center gap-4">
          {paso === 1 && asistentesFueraDeRango && (
            <span className="hidden text-[13px] text-muted-foreground sm:inline">
              Corrige el número de asistentes para continuar
            </span>
          )}
          {paso === 1 && (
            <Button size="lg" onClick={avanzarDesdeDatos} disabled={asistentesFueraDeRango}>
              <span>
                Siguiente<span className="hidden sm:inline">: Requerimientos</span>
              </span>
              <ChevronRight aria-hidden="true" />
            </Button>
          )}
          {paso === 2 && (
            <Button size="lg" onClick={irAlResumen}>
              <span>
                Siguiente<span className="hidden sm:inline">: Resumen</span>
              </span>
              <ChevronRight aria-hidden="true" />
            </Button>
          )}
          {paso === 3 && (
            <Button size="lg" onClick={guardar} disabled={enviando}>
              {enviando ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <Check aria-hidden="true" />}
              {enviando ? 'Guardando cambios…' : 'Guardar cambios'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
