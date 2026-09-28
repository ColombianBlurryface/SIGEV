import { RotateCw } from 'lucide-react'
import { useState } from 'react'
import { FormularioElemento } from '@/components/inventario/FormularioElemento'
import { TablaInventario } from '@/components/inventario/TablaInventario'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useInventario } from '@/hooks/useInventario'
import { formatearNumero } from '@/lib/formato'
import { cn } from '@/lib/utils'
import { CATEGORIAS_INVENTARIO, type CategoriaInventario } from '@/types/inventario'

type Filtro = CategoriaInventario | 'todas'

export function InventarioPage() {
  const { elementos, cargando, error, recargar, guardarLocal } = useInventario()
  const [filtro, setFiltro] = useState<Filtro>('todas')

  const visibles = filtro === 'todas' ? elementos : elementos.filter((e) => e.categoria_inventario === filtro)
  const totalUnidades = elementos.reduce((suma, e) => suma + e.cantidad_propia, 0)
  const opciones: { valor: Filtro; etiqueta: string; cantidad: number }[] = [
    { valor: 'todas', etiqueta: 'Todas', cantidad: elementos.length },
    ...CATEGORIAS_INVENTARIO.map((c) => ({
      valor: c,
      etiqueta: c,
      cantidad: elementos.filter((e) => e.categoria_inventario === c).length,
    })),
  ]

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1.5">
        <h1 className="font-display text-4xl font-extrabold tracking-tight">Inventario</h1>
        <p className="text-[15px] text-subtle">
          {cargando
            ? 'Cargando inventario…'
            : `${elementos.length} ${elementos.length === 1 ? 'elemento' : 'elementos'} · ${formatearNumero(totalUnidades)} unidades propias`}
        </p>
      </header>

      <div className="grid items-start gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="xl:sticky xl:top-0">
          <FormularioElemento onRegistrado={guardarLocal} />
        </div>

        <div className="flex min-w-0 flex-col gap-4">
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
            !error && <TablaInventario elementos={visibles} onActualizado={guardarLocal} />
          )}
        </div>
      </div>
    </div>
  )
}
