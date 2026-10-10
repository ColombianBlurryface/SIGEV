/**
 * Página de Inventario (HU-08 y HU-09): formulario para registrar elementos o adquisiciones,
 * buscador, filtros por categoría, tabla de elementos e historial de movimientos.
 */
import { RotateCw, Search } from 'lucide-react'
import { useState } from 'react'
import { FormularioAdquisicion } from '@/components/inventario/FormularioAdquisicion'
import { FormularioElemento } from '@/components/inventario/FormularioElemento'
import { HistorialMovimientos } from '@/components/inventario/HistorialMovimientos'
import { TablaInventario } from '@/components/inventario/TablaInventario'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useInventario } from '@/hooks/useInventario'
import { useMovimientos } from '@/hooks/useMovimientos'
import { formatearNumero, normalizar } from '@/lib/formato'
import { cn } from '@/lib/utils'
import { CATEGORIAS_INVENTARIO, type CategoriaInventario, type ElementoInventario } from '@/types/inventario'

type Filtro = CategoriaInventario | 'todas'
type Modo = 'elemento' | 'adquisicion'

const MOVIMIENTOS_POR_PAGINA = 20
const MOVIMIENTOS_MAXIMOS = 200

export function InventarioPage() {
  const { elementos, cargando, error, recargar, guardarLocal } = useInventario()
  const [filtro, setFiltro] = useState<Filtro>('todas')
  // HU-12: segundo filtro, independiente de la categoría
  const [propiedadFiltro, setPropiedadFiltro] = useState<'todas' | 'propio' | 'alquilado'>('todas')
  const [busqueda, setBusqueda] = useState('')
  const [modo, setModo] = useState<Modo>('elemento')
  // Elemento elegido con el botón "Adquisición" de una fila. "version" cambia en cada clic para que
  // el formulario se reinicie aunque se elija el mismo elemento dos veces.
  const [preseleccion, setPreseleccion] = useState<{ id: number; version: number } | null>(null)
  const [elementoHistorial, setElementoHistorial] = useState<number | null>(null)
  const [limiteHistorial, setLimiteHistorial] = useState(MOVIMIENTOS_POR_PAGINA)
  const historial = useMovimientos(elementoHistorial, limiteHistorial)

  const termino = normalizar(busqueda.trim())
  const visibles = elementos.filter(
    (e) =>
      (filtro === 'todas' || e.categoria_inventario === filtro) &&
      (propiedadFiltro === 'todas' || e.es_propio === (propiedadFiltro === 'propio')) &&
      (termino === '' || normalizar(e.nombre).includes(termino)),
  )
  // Las unidades de elementos alquilados no son de la organización, por eso no se suman como propias
  const totalUnidades = elementos.filter((e) => e.es_propio).reduce((suma, e) => suma + e.cantidad_propia, 0)
  const totalAlquilados = elementos.filter((e) => !e.es_propio).length
  const opcionesPropiedad: { valor: 'todas' | 'propio' | 'alquilado'; etiqueta: string }[] = [
    { valor: 'todas', etiqueta: 'Toda propiedad' },
    { valor: 'propio', etiqueta: 'Propios' },
    { valor: 'alquilado', etiqueta: 'Alquilados' },
  ]
  const opciones: { valor: Filtro; etiqueta: string; cantidad: number }[] = [
    { valor: 'todas', etiqueta: 'Todas', cantidad: elementos.length },
    ...CATEGORIAS_INVENTARIO.map((c) => ({
      valor: c,
      etiqueta: c,
      cantidad: elementos.filter((e) => e.categoria_inventario === c).length,
    })),
  ]

  function adquirir(elemento: ElementoInventario) {
    setModo('adquisicion')
    setPreseleccion((anterior) => ({ id: elemento.id, version: (anterior?.version ?? 0) + 1 }))
    document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Después de registrar, ajustar o adquirir: se actualiza la fila en pantalla y se recarga el historial
  function cambioDeInventario(elemento: ElementoInventario) {
    guardarLocal(elemento)
    historial.recargar()
  }

  function filtrarHistorial(id: number | null) {
    setElementoHistorial(id)
    setLimiteHistorial(MOVIMIENTOS_POR_PAGINA)
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1.5">
        <h1 className="font-display text-4xl font-extrabold tracking-tight">Inventario</h1>
        <p className="text-[15px] text-subtle">
          {cargando
            ? 'Cargando inventario…'
            : `${elementos.length} ${elementos.length === 1 ? 'elemento' : 'elementos'} · ${formatearNumero(totalUnidades)} unidades propias${totalAlquilados > 0 ? ` · ${totalAlquilados} ${totalAlquilados === 1 ? 'alquilado' : 'alquilados'}` : ''}`}
        </p>
      </header>

      <div className="grid items-start gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="flex flex-col gap-6 xl:sticky xl:top-0">
          <Card className="flex flex-col gap-5 p-6">
            <div role="group" aria-label="Acción" className="flex rounded-[10px] bg-chip p-[3px]">
              {(
                [
                  ['elemento', 'Nuevo elemento'],
                  ['adquisicion', 'Adquisición'],
                ] as const
              ).map(([valor, etiqueta]) => (
                <button
                  key={valor}
                  type="button"
                  aria-pressed={modo === valor}
                  onClick={() => setModo(valor)}
                  className={cn(
                    'h-9 flex-1 cursor-pointer rounded-lg text-[13.5px] font-bold outline-none focus-visible:ring-[3px] focus-visible:ring-ring',
                    modo === valor ? 'bg-card text-foreground shadow-sm dark:bg-input' : 'text-subtle',
                  )}
                >
                  {etiqueta}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-bold">{modo === 'elemento' ? 'Registrar elemento' : 'Registrar adquisición'}</h2>
              <p className="text-[13.5px] text-subtle">
                {modo === 'elemento'
                  ? 'Agrega un recurso propio de la organización o uno alquilado a un proveedor.'
                  : 'Suma unidades compradas a un elemento que ya está en el inventario.'}
              </p>
            </div>

            {/* La "key" hace que React cree un formulario nuevo al cambiar la preselección */}
            {modo === 'elemento' ? (
              <FormularioElemento onRegistrado={cambioDeInventario} />
            ) : (
              <FormularioAdquisicion
                key={preseleccion ? `${preseleccion.id}-${preseleccion.version}` : 'sin-seleccion'}
                elementos={elementos}
                elementoInicialId={preseleccion?.id}
                onRegistrada={cambioDeInventario}
              />
            )}
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <div className="relative">
            <label htmlFor="buscar-inventario" className="sr-only">
              Buscar elemento
            </label>
            <Search aria-hidden="true" className="pointer-events-none absolute top-3 left-3.5 size-[18px] text-muted-foreground" />
            <Input
              id="buscar-inventario"
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar elemento por nombre"
              className="h-11 pl-10 text-[14.5px]"
            />
          </div>

          <div role="group" aria-label="Filtrar por categoría" className="flex flex-wrap gap-2">
            {opciones.map(({ valor, etiqueta, cantidad }) => {
              const activo = valor === filtro
              return (
                <button
                  key={valor}
                  type="button"
                  aria-pressed={activo}
                  onClick={() => setFiltro(valor)}
                  className={cn(
                    'h-[34px] cursor-pointer rounded-full border px-3.5 text-[13px] font-semibold outline-none focus-visible:ring-[3px] focus-visible:ring-ring',
                    activo
                      ? 'border-foreground bg-foreground text-background dark:border-primary dark:bg-primary dark:text-primary-foreground'
                      : 'border-border bg-card text-subtle hover:bg-muted',
                  )}
                >
                  {etiqueta} · {cantidad}
                </button>
              )
            })}
          </div>

          <div role="group" aria-label="Filtrar por propiedad" className="-mt-1 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold tracking-[0.04em] text-muted-foreground uppercase">Propiedad</span>
            {opcionesPropiedad.map(({ valor, etiqueta }) => (
              <button
                key={valor}
                type="button"
                aria-pressed={propiedadFiltro === valor}
                onClick={() => setPropiedadFiltro(valor)}
                className={cn(
                  'h-8 cursor-pointer rounded-full border px-3 text-[12.5px] font-semibold outline-none focus-visible:ring-[3px] focus-visible:ring-ring',
                  propiedadFiltro === valor
                    ? 'border-foreground bg-foreground text-background dark:border-primary dark:bg-primary dark:text-primary-foreground'
                    : 'border-border bg-card text-subtle hover:bg-muted',
                )}
              >
                {etiqueta}
              </button>
            ))}
          </div>

          {error && (
            <div className="flex flex-col items-start gap-3">
              <Alert variant="error">{error}</Alert>
              <Button variant="secondary" onClick={recargar}>
                <RotateCw aria-hidden="true" />
                Reintentar
              </Button>
            </div>
          )}

          {cargando && elementos.length === 0 ? (
            <Skeleton className="h-64 rounded-[14px]" />
          ) : (
            !error && (
              <TablaInventario
                elementos={visibles}
                mensajeVacio={
                  elementos.length === 0
                    ? 'Todavía no hay elementos en el inventario.'
                    : 'Ningún elemento coincide con la búsqueda o el filtro.'
                }
                onActualizado={cambioDeInventario}
                onAdquirir={adquirir}
              />
            )
          )}

          <HistorialMovimientos
            elementos={elementos}
            elementoId={elementoHistorial}
            onElemento={filtrarHistorial}
            movimientos={historial.movimientos}
            cargando={historial.cargando}
            error={historial.error}
            hayMas={historial.movimientos.length === limiteHistorial && limiteHistorial < MOVIMIENTOS_MAXIMOS}
            onVerMas={() => setLimiteHistorial((n) => Math.min(n + MOVIMIENTOS_POR_PAGINA, MOVIMIENTOS_MAXIMOS))}
            onReintentar={historial.recargar}
          />
        </div>
      </div>
    </div>
  )
}
