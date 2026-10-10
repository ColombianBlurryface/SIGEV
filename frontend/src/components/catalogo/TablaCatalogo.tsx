/**
 * Lista de productos del catálogo agrupados por grupo (alimentos, bebidas generales y bar de
 * coctelería). Cada producto muestra cómo se calcula y su precio, y se puede editar o desactivar.
 */
import { LoaderCircle, Pencil, Power } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CONFIG_GRUPO, describirConsumo, esGrupoCatalogo, GRUPOS_CATALOGO } from '@/lib/catalogo'
import { formatearMoneda } from '@/lib/formato'
import { cn } from '@/lib/utils'
import type { ProductoCatalogo } from '@/types/catalogo'

interface TablaCatalogoProps {
  productos: ProductoCatalogo[]
  mensajeVacio: string
  cambiandoId: number | null
  onEditar: (producto: ProductoCatalogo) => void
  onCambiarEstado: (producto: ProductoCatalogo) => void
}

export function TablaCatalogo({ productos, mensajeVacio, cambiandoId, onEditar, onCambiarEstado }: TablaCatalogoProps) {
  if (productos.length === 0) {
    return (
      <Card className="rounded-[14px]">
        <p className="px-[18px] py-10 text-center text-sm text-subtle">{mensajeVacio}</p>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {GRUPOS_CATALOGO.map((grupo) => {
        const delGrupo = productos.filter((p) => p.clasificacion === grupo)
        if (delGrupo.length === 0) return null
        const { etiqueta, icono: Icono, clases } = CONFIG_GRUPO[grupo]
        return (
          <Card key={grupo} className="overflow-hidden rounded-[14px]">
            <div className="flex items-center gap-2.5 border-b border-border bg-muted px-[18px] py-3">
              <span aria-hidden="true" className={cn('flex size-[26px] items-center justify-center rounded-[7px]', clases)}>
                <Icono className="size-[15px]" />
              </span>
              <h2 className="text-sm font-bold">{etiqueta}</h2>
              <span className="text-xs text-muted-foreground">{delGrupo.length}</span>
            </div>
            <ul>
              {delGrupo.map((producto) => (
                <li
                  key={producto.id}
                  className={cn(
                    'flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border px-[18px] py-3 text-sm last:border-b-0',
                    !producto.activo && 'bg-background',
                  )}
                >
                  <div className="flex min-w-[220px] flex-1 flex-col gap-0.5">
                    <span className={cn('font-bold', !producto.activo && 'text-muted-foreground')}>{producto.nombre}</span>
                    <span className="text-[12.5px] text-subtle">{describirConsumo(producto)}</span>
                  </div>
                  <span className="w-28 text-right font-semibold">{formatearMoneda(producto.precio_unitario)}</span>
                  <span
                    className={cn(
                      'rounded-md px-2 py-0.5 text-[11px] font-bold',
                      producto.activo ? 'bg-success-soft text-success-foreground' : 'bg-chip text-subtle',
                    )}
                  >
                    {producto.activo ? 'Activo' : 'Inactivo'}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEditar(producto)}
                      disabled={!esGrupoCatalogo(producto.clasificacion)}
                      aria-label={`Editar ${producto.nombre}`}
                    >
                      <Pencil aria-hidden="true" className="!size-4" />
                      Editar
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onCambiarEstado(producto)}
                      disabled={cambiandoId === producto.id}
                      aria-label={`${producto.activo ? 'Desactivar' : 'Activar'} ${producto.nombre}`}
                    >
                      {cambiandoId === producto.id ? (
                        <LoaderCircle aria-hidden="true" className="!size-4 animate-spin" />
                      ) : (
                        <Power aria-hidden="true" className="!size-4" />
                      )}
                      {producto.activo ? 'Desactivar' : 'Activar'}
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )
      })}
    </div>
  )
}
