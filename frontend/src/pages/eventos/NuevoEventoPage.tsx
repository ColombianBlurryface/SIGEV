/**
 * Página "Registrar evento": asistente de 3 pasos (datos, requerimientos y resumen).
 * Todo se guarda en el navegador mientras se avanza y se envía al servidor en un solo POST al final.
 */
import { ArrowLeft, Check, ChevronRight, LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PasoDatos } from '@/components/eventos/registro/PasoDatos'
import { PasoRequerimientos } from '@/components/eventos/registro/PasoRequerimientos'
import { PasoResumen } from '@/components/eventos/registro/PasoResumen'
import { PasosRegistro, type Paso } from '@/components/eventos/registro/PasosRegistro'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { TIPO_MOBILIARIO } from '@/lib/categorias'
import { formatearFecha, formatearNumero } from '@/lib/formato'
import { validarAsistentes, validarEvento, type ErroresEvento, type ValoresEvento } from '@/lib/reglasEvento'
import { ApiError } from '@/services/api'
import { eventosService } from '@/services/eventosService'
import { REQUERIMIENTOS_VACIOS, type RequerimientosEvento } from '@/types/registro'

const VALORES_INICIALES: ValoresEvento = {
  nombre: '',
  tipo: '',
  fecha: '',
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
  const [paso, setPaso] = useState<Paso>(1)
  const [valores, setValores] = useState<ValoresEvento>(VALORES_INICIALES)
  const [requerimientos, setRequerimientos] = useState<RequerimientosEvento>(REQUERIMIENTOS_VACIOS)
  const [intentoAvanzar, setIntentoAvanzar] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [errorServidor, setErrorServidor] = useState<string | null>(null)

  // Los errores del paso 1 solo se muestran después del primer intento de avanzar,
  // para no llenar de rojo el formulario mientras el usuario apenas empieza a escribir.
  const errores: ErroresEvento = intentoAvanzar ? validarEvento(valores) : {}
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
    if (Object.keys(validarEvento(valores)).length === 0) irAPaso(2)
  }

  // Envía todo el evento en una sola petición: datos, productos (alimentos y bebidas)
  // y requerimientos adicionales (mobiliario y servicios). El backend calcula y guarda todo junto.
  async function guardar() {
    setEnviando(true)
    setErrorServidor(null)
    try {
      const { evento } = await eventosService.crear({
        nombre_evento: valores.nombre.trim(),
        tipo_evento: valores.tipo,
        fecha_evento: valores.fecha,
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
            // El valor unitario puede haberse escrito en el evento (QA-04); queda guardado con el costo
            precio_unitario: Number(b.producto.precio_unitario),
          })),
        ],
        servicios_adicionales: [
          ...requerimientos.mobiliario.map((m) => ({
            tipo: TIPO_MOBILIARIO,
            descripcion: m.elemento,
            cantidad: m.cantidad,
            notas: m.referencia || undefined,
            producto_id: m.productoId ?? undefined, // HU-12: elemento del inventario (si no hay, va a alquiler)
          })),
          ...requerimientos.servicios.map((s) => ({
            tipo: s.tipo,
            descripcion: s.descripcion,
            cantidad: s.cantidad ?? undefined,
            notas: s.notas || undefined,
          })),
        ],
      })
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
          <h1 className="font-display text-4xl font-extrabold tracking-tight">{titulo}</h1>
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
        <PasoDatos valores={valores} errores={errores} mostrarVacio={intentoAvanzar} onCambio={cambiarValor} />
      )}
      {paso === 2 && (
        <PasoRequerimientos
          asistentes={asistentes.cantidad ?? 0}
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
              Siguiente: Requerimientos
              <ChevronRight aria-hidden="true" />
            </Button>
          )}
          {paso === 2 && (
            <Button size="lg" onClick={() => irAPaso(3)}>
              Siguiente: Resumen
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
    </div>
  )
}
