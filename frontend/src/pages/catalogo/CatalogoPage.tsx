/**
 * Página de Catálogo: aquí se crean y se mantienen los alimentos y las bebidas con los que el
 * registro de eventos calcula cantidades y costos. A la izquierda el formulario (crear o editar)
 * y a la derecha la lista con buscador y filtros por grupo.
 *
 * Los productos no se borran: se desactivan, así los eventos ya guardados no pierden su referencia.
 */
import { RotateCw, Search } from 'lucide-react'
import { useState } from 'react'
import { FormularioProducto } from '@/components/catalogo/FormularioProducto'
import { TablaCatalogo } from '@/components/catalogo/TablaCatalogo'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useCatalogo } from '@/hooks/useCatalogo'
import { CONFIG_GRUPO, GRUPOS_CATALOGO } from '@/lib/catalogo'
import { normalizar } from '@/lib/formato'
import { cn } from '@/lib/utils'
import { ApiError } from '@/services/api'
import { catalogoService } from '@/services/catalogoService'
import type { GrupoCatalogo, ProductoCatalogo } from '@/types/catalogo'

type Filtro = GrupoCatalogo | 'todos'

export function CatalogoPage() {
  // Se piden también los desactivados para poder volver a activarlos
  const { productos, cargando, error, recargar } = useCatalogo(undefined, true)
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [busqueda, setBusqueda] = useState('')
  const [editando, setEditando] = useState<ProductoCatalogo | null>(null)
  const [cambiandoId, setCambiandoId] = useState<number | null>(null)
  const [aviso, setAviso] = useState<{ tipo: 'success' | 'error'; texto: string } | null>(null)

  const termino = normalizar(busqueda.trim())
  const visibles = productos.filter(
    (p) => (filtro === 'todos' || p.clasificacion === filtro) && (termino === '' || normalizar(p.nombre).includes(termino)),
  )
  const activos = productos.filter((p) => p.activo).length
  const opciones: { valor: Filtro; etiqueta: string; cantidad: number }[] = [
    { valor: 'todos', etiqueta: 'Todos', cantidad: productos.length },
    ...GRUPOS_CATALOGO.map((g) => ({
      valor: g,
      etiqueta: CONFIG_GRUPO[g].etiqueta,
      cantidad: productos.filter((p) => p.clasificacion === g).length,
    })),
  ]

  function guardado(producto: ProductoCatalogo, fueEdicion: boolean) {
    recargar()
    if (fueEdicion) {
      setEditando(null)
      setAviso({ tipo: 'success', texto: `«${producto.nombre}» actualizado.` })
    } else {
      setAviso(null)
    }
  }

  function editar(producto: ProductoCatalogo) {
    setAviso(null)
    setEditando(producto)
    document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function cambiarEstado(producto: ProductoCatalogo) {
    setCambiandoId(producto.id)
    setAviso(null)
    try {
      const actualizado = await catalogoService.cambiarEstado(producto.id, !producto.activo)
      recargar()
      setAviso({
        tipo: 'success',
        texto: actualizado.activo
          ? `«${actualizado.nombre}» activado: ya se ofrece en los eventos nuevos.`
          : `«${actualizado.nombre}» desactivado: no se ofrecerá en los eventos nuevos. Los eventos ya guardados lo conservan.`,
      })
    } catch (err) {
      setAviso({ tipo: 'error', texto: err instanceof ApiError ? err.message : 'No fue posible cambiar el estado.' })
    } finally {
      setCambiandoId(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1.5">
        <h1 className="font-display text-4xl font-extrabold tracking-tight">Catálogo</h1>
        <p className="text-[15px] text-subtle">
          {cargando
            ? 'Cargando catálogo…'
            : `${productos.length} ${productos.length === 1 ? 'producto' : 'productos'} · ${activos} ${activos === 1 ? 'activo' : 'activos'}. Son los alimentos y bebidas que se ofrecen al registrar un evento.`}
        </p>
      </header>

      <div className="grid items-start gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="flex flex-col gap-5 p-6 xl:sticky xl:top-0">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-bold">{editando ? 'Editar producto' : 'Crear producto'}</h2>
            <p className="text-[13.5px] text-subtle">
              {editando
                ? 'Los eventos ya guardados conservan sus cantidades y costos; los nuevos usan estos datos.'
                : 'Agrega un alimento o una bebida con sus datos de cálculo y su precio.'}
            </p>
          </div>
          {/* La "key" crea un formulario nuevo al cambiar de producto o al volver a crear */}
          <FormularioProducto
            key={editando ? `editar-${editando.id}` : 'crear'}
            producto={editando}
            onGuardado={guardado}
            onCancelar={() => setEditando(null)}
          />
        </Card>

        <div className="flex min-w-0 flex-col gap-4">
          <div className="relative">
            <label htmlFor="buscar-catalogo" className="sr-only">
              Buscar producto
            </label>
            <Search aria-hidden="true" className="pointer-events-none absolute top-3 left-3.5 size-[18px] text-muted-foreground" />
            <Input
              id="buscar-catalogo"
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar producto por nombre"
              className="h-11 pl-10 text-[14.5px]"
            />
          </div>

          <div role="group" aria-label="Filtrar por grupo" className="flex flex-wrap gap-2">
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

          {aviso && <Alert variant={aviso.tipo}>{aviso.texto}</Alert>}

          {error && (
            <div className="flex flex-col items-start gap-3">
              <Alert variant="error">{error}</Alert>
              <Button variant="secondary" onClick={recargar}>
                <RotateCw aria-hidden="true" />
                Reintentar
              </Button>
            </div>
          )}

          {cargando ? (
            <Card className="flex flex-col gap-3 p-5">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </Card>
          ) : (
            !error && (
              <TablaCatalogo
                productos={visibles}
                mensajeVacio={productos.length === 0 ? 'Todavía no hay productos en el catálogo.' : 'Ningún producto coincide con la búsqueda.'}
                cambiandoId={cambiandoId}
                onEditar={editar}
                onCambiarEstado={cambiarEstado}
              />
            )
          )}
        </div>
      </div>
    </div>
  )
}
