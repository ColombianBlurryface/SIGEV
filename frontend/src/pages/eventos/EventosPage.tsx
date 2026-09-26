import { CalendarDays, Plus, RotateCw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { DetalleEvento } from '@/components/eventos/DetalleEvento'
import { FiltrosEventos, type FiltroEstado } from '@/components/eventos/FiltrosEventos'
import { ResumenEventos } from '@/components/eventos/ResumenEventos'
import { TablaEventos } from '@/components/eventos/TablaEventos'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useEventos } from '@/hooks/useEventos'
import { hoyIso, normalizar } from '@/lib/formato'

export function EventosPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { eventos, cargando, error, recargar } = useEventos()

  const [aviso] = useState(() => (location.state as { aviso?: string } | null)?.aviso)
  const [busqueda, setBusqueda] = useState('')
  const [estado, setEstado] = useState<FiltroEstado>('todos')

  useEffect(() => {
    if (aviso) navigate({ pathname: location.pathname, search: location.search }, { replace: true, state: null })
  }, [aviso, location.pathname, location.search, navigate])

  const filtrados = useMemo(() => {
    const termino = normalizar(busqueda.trim())
    return eventos.filter(
      (e) =>
        (estado === 'todos' || e.estado === estado) &&
        (termino === '' || normalizar(e.nombre_evento).includes(termino) || normalizar(e.tipo_evento).includes(termino)),
    )
  }, [eventos, busqueda, estado])

  const idEnUrl = Number(searchParams.get('evento'))
  const hoy = hoyIso()
  const seleccionado =
    eventos.find((e) => e.id === idEnUrl) ??
    eventos.find((e) => e.estado !== 'cancelado' && e.fecha_evento.slice(0, 10) >= hoy) ??
    eventos[0] ??
    null

  const seleccionar = (id: number) => setSearchParams({ evento: String(id) }, { replace: true })

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-display text-4xl font-extrabold tracking-tight">Eventos</h1>
          <p className="text-[15px] text-subtle">
            {cargando
              ? 'Cargando eventos…'
              : `${eventos.length} ${eventos.length === 1 ? 'evento registrado' : 'eventos registrados'} · ordenados por fecha`}
          </p>
        </div>
        <Link to="/eventos/nuevo" className={buttonVariants()}>
          <Plus aria-hidden="true" />
          Nuevo evento
        </Link>
      </header>

      {aviso && <Alert variant="success">{aviso}</Alert>}

      {cargando && eventos.length === 0 && (
        <div className="flex flex-col gap-4" aria-label="Cargando eventos">
          <div className="grid gap-4 sm:grid-cols-3">
            <Skeleton className="h-[104px] rounded-[14px]" />
            <Skeleton className="h-[104px] rounded-[14px]" />
            <Skeleton className="h-[104px] rounded-[14px]" />
          </div>
          <Skeleton className="h-11" />
          <Skeleton className="h-72 rounded-[14px]" />
        </div>
      )}

      {error && (
        <div className="flex flex-col items-start gap-3">
          <Alert variant="error">{error}</Alert>
          <Button variant="secondary" onClick={recargar}>
            <RotateCw aria-hidden="true" />
            Reintentar
          </Button>
        </div>
      )}

      {!cargando && !error && eventos.length === 0 && (
        <Card className="flex flex-col items-center gap-3 px-6 py-16 text-center">
          <span className="flex size-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <CalendarDays aria-hidden="true" className="size-6" />
          </span>
          <h2 className="text-lg font-bold">Todavía no hay eventos registrados</h2>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            Registra el primero y aquí verás su estado, asistentes y requerimientos.
          </p>
          <Link to="/eventos/nuevo" className={buttonVariants({ className: 'mt-2' })}>
            <Plus aria-hidden="true" />
            Registrar evento
          </Link>
        </Card>
      )}

      {eventos.length > 0 && (
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="flex min-w-0 flex-col gap-6">
            <ResumenEventos eventos={eventos} />
            <FiltrosEventos
              eventos={eventos}
              busqueda={busqueda}
              onBusqueda={setBusqueda}
              estado={estado}
              onEstado={setEstado}
            />
            <TablaEventos eventos={filtrados} seleccionadoId={seleccionado?.id ?? null} onSeleccionar={seleccionar} />
          </div>
          {seleccionado && (
            <div className="xl:sticky xl:top-0">
              <DetalleEvento evento={seleccionado} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
