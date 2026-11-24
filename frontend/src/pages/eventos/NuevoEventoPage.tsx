/**
 * Página "Registrar evento": asistente de 3 pasos (datos, requerimientos y resumen).
 * Todo se guarda en el navegador mientras se avanza y se envía al servidor en un solo POST al final.
 */
import { AlertTriangle, ArrowLeft, Check, ChevronRight, LoaderCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useBlocker } from 'react-router-dom'
import { PasoDatos } from '@/components/eventos/registro/PasoDatos'
import { PasoRequerimientos } from '@/components/eventos/registro/PasoRequerimientos'
import { PasoResumen } from '@/components/eventos/registro/PasoResumen'
import { PasosRegistro, type Paso } from '@/components/eventos/registro/PasosRegistro'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { Modal } from '@/components/ui/modal'
import { etiquetaServicio, TIPO_MOBILIARIO } from '@/lib/categorias'
import { formatearFecha, formatearNumero } from '@/lib/formato'
import { MAX_EVENTOS_POR_FECHA, horaInicio24, validarAsistentes, validarEvento, type ErroresEvento, type ValoresEvento } from '@/lib/reglasEvento'
import { describirHoras, serviciosFueraDeDuracion } from '@/lib/reglasServicios'
import { ApiError } from '@/services/api'
import { eventosService } from '@/services/eventosService'
import { REQUERIMIENTOS_VACIOS, type RequerimientosEvento } from '@/types/registro'
import { useEventos } from '@/hooks/useEventos'

const VALORES_INICIALES: ValoresEvento = {
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
    titulo: 'Registrar evento',
    descripcion: 'Completa los datos básicos. Después agregarás los requerimientos del evento.',
  },
  2: {
    titulo: 'Requerimientos del evento',
    descripcion: 'Agrega lo que necesita el evento. Las cantidades se calculan con los asistentes y un margen del 10%.',
  },
  3: { titulo: 'Revisa y guarda', descripcion: 'Confirma que todo esté correcto antes de registrar el evento.' },
}

export function NuevoEventoPage() {
  const navigate = useNavigate()
  const { eventos } = useEventos()
  const [paso, setPaso] = useState<Paso>(1)
  const [valores, setValores] = useState<ValoresEvento>(VALORES_INICIALES)
  const [requerimientos, setRequerimientos] = useState<RequerimientosEvento>(REQUERIMIENTOS_VACIOS)
  const [intentoAvanzar, setIntentoAvanzar] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [errorServidor, setErrorServidor] = useState<string | null>(null)
  const permitirNavegacionRef = useRef(false)

  // Bloquea cualquier navegación hacia otra ruta mientras se crea el evento
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !permitirNavegacionRef.current && currentLocation.pathname !== nextLocation.pathname,
  )

  // Previene cierre o recarga accidental de la pestaña en el navegador
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!permitirNavegacionRef.current) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [])

  // Cuenta cuántos eventos hay ya registrados en esa misma fecha
  const eventosEnFecha = valores.fecha
    ? eventos.filter((e) => e.fecha_evento.slice(0, 10) === valores.fecha && e.estado !== 'cancelado').length
    : 0

  // Los errores del paso 1 solo se muestran después del primer intento de avanzar,
  // para no llenar de rojo el formulario mientras el usuario apenas empieza a escribir.
  const errores: ErroresEvento = intentoAvanzar
    ? validarEvento(valores, eventosEnFecha)
    : eventosEnFecha >= MAX_EVENTOS_POR_FECHA
      ? { fecha: `Ya no se puede registrar más. Esta fecha ya tiene el límite máximo de ${MAX_EVENTOS_POR_FECHA} eventos programados.` }
      : {}

  // RN-18 / HU-48: Validar horas ÚNICAMENTE en servicios cuya modalidad sea 'por_hora'.
  // Los servicios de tarifa fija ('por_servicio') no tienen horas y no deben evaluarse aquí.
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

  // Cambia de paso y vuelve arriba de la página (el scroll está en <main>, no en la ventana)
  function irAPaso(destino: Paso) {
    setErrorServidor(null)
    setPaso(destino)
    document.querySelector('main')?.scrollTo({ top: 0 })
  }

  function avanzarDesdeDatos() {
    setIntentoAvanzar(true)
    if (Object.keys(validarEvento(valores, eventosEnFecha)).length === 0) irAPaso(2)
  }

  // Pasa al resumen solo si los servicios por hora caben en la duración del evento (RN-18)
  function irAlResumen() {
    if (serviciosPasados.length > 0) {
      setErrorServidor(
        `No se puede continuar: ${descripcionPasados} dura${serviciosPasados.length === 1 ? '' : 'n'} más que el evento (${formatearNumero(duracionNumero)} h). Corrige las horas o quita el servicio.`,
      )
      return
    }
    irAPaso(3)
  }

  // Envía todo el evento en una sola petición: datos, productos (alimentos y bebidas)
  // y requerimientos adicionales (mobiliario y servicios con modalidad y tarifa HU-48).
  async function guardar() {
    setEnviando(true)
    setErrorServidor(null)
    try {
      const { evento } = await eventosService.crear({
        nombre_evento: valores.nombre.trim(),
        tipo_evento: valores.tipo,
        fecha_evento: valores.fecha,
        hora_inicio: horaInicio24(valores),
        duracion_horas: Number(valores.duracion),
        asistentes: Number(valores.asistentes),
        observaciones_generales: valores.observaciones.trim() || undefined,
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
      permitirNavegacionRef.current = true
      navigate(`/eventos?evento=${evento.id}`, {
        state: { aviso: `Evento «${evento.nombre_evento}» registrado en planificación.` },
      })
    } catch (err) {
      setErrorServidor(err instanceof ApiError ? err.message : 'No fue posible registrar el evento. Intenta de nuevo.')
      setEnviando(false)
    }
  }

  const { titulo, descripcion } = TITULOS[paso]

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Ruta" className="flex gap-2 text-[13.5px] text-muted-foreground">
        <Link to="/eventos" className="font-semibold text-primary hover:underline">
          Eventos
        </Link>
        <span aria-hidden="true">/</span>
        <span>Nuevo evento</span>
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
          <Link to="/eventos" className={buttonVariants({ variant: 'ghost' })}>
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
              {enviando ? 'Guardando…' : 'Guardar evento'}
            </Button>
          )}
        </div>
      </div>

      {blocker.state === 'blocked' && (
        <Modal
          etiqueta="Confirmar salida de la creación del evento"
          onCerrar={() => blocker.reset?.()}
          className="w-full max-w-md p-6"
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3.5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="size-5" />
              </span>
              <div className="flex flex-col gap-1.5">
                <h2 className="text-base font-bold text-foreground">
                  ¿Ya no deseas continuar con la creación del evento?
                </h2>
                <p className="text-sm text-subtle leading-relaxed">
                  Estás en el proceso de creación de un evento. Si sales a otro apartado, los datos y requerimientos ingresados no se guardarán.
                </p>
              </div>
            </div>

            <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="secondary"
                onClick={() => blocker.reset?.()}
              >
                Continuar con el evento
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  permitirNavegacionRef.current = true
                  blocker.proceed?.()
                }}
              >
                Sí, salir
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}