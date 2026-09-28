import { Check, LoaderCircle, PackagePlus, Pencil, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { formatearNumero } from '@/lib/formato'
import { ESTILO_CATEGORIA_INVENTARIO } from '@/lib/inventario'
import { cn } from '@/lib/utils'
import { ApiError } from '@/services/api'
import { inventarioService } from '@/services/inventarioService'
import type { ElementoInventario } from '@/types/inventario'

const COLUMNAS = 'lg:grid lg:grid-cols-[minmax(0,1fr)_190px_auto] lg:items-center lg:gap-3'

interface TablaInventarioProps {
  elementos: ElementoInventario[]
  mensajeVacio: string
  onActualizado: (elemento: ElementoInventario) => void
  onAdquirir: (elemento: ElementoInventario) => void
}

export function TablaInventario({ elementos, mensajeVacio, onActualizado, onAdquirir }: TablaInventarioProps) {
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [valor, setValor] = useState('')
  const [motivo, setMotivo] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function empezarEdicion(elemento: ElementoInventario) {
    setEditandoId(elemento.id)
    setValor(String(elemento.cantidad_propia))
    setMotivo('')
    setError(null)
  }

  function cancelar() {
    setEditandoId(null)
    setError(null)
  }

  async function guardar(evento: FormEvent<HTMLFormElement>, elemento: ElementoInventario) {
    evento.preventDefault()
    const cantidad = Number(valor)
    if (valor.trim() === '' || !Number.isInteger(cantidad) || cantidad < 0) {
      setError('La cantidad debe ser un número entero mayor o igual a 0.')
      return
    }

    setGuardando(true)
    try {
      const actualizado = await inventarioService.actualizarCantidad(elemento.id, cantidad, motivo.trim() || undefined)
      onActualizado(actualizado)
      setEditandoId(null)
      setError(null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No fue posible actualizar la cantidad.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Card className="overflow-hidden rounded-[14px]">
      <div
        className={cn(
          COLUMNAS,
          'hidden border-b border-border bg-muted px-[18px] py-3 text-xs font-bold tracking-[0.04em] text-muted-foreground uppercase lg:grid',
        )}
      >
        <span>Elemento</span>
        <span>Categoría</span>
        <span className="text-right">Cantidad disponible</span>
      </div>

      {elementos.length === 0 ? (
        <p className="px-[18px] py-10 text-center text-sm text-subtle">{mensajeVacio}</p>
      ) : (
        <ul>
          {elementos.map((elemento) => {
            const { icono: Icono, clases } = ESTILO_CATEGORIA_INVENTARIO[elemento.categoria_inventario]
            const editando = editandoId === elemento.id
            return (
              <li key={elemento.id} className="border-b border-border px-[18px] py-3 last:border-b-0">
                <div className={cn(COLUMNAS, 'flex flex-col gap-2 text-sm')}>
                  <span className="font-bold break-words lg:truncate" title={elemento.nombre}>
                    {elemento.nombre}
                  </span>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 self-start rounded-md px-2 py-1 text-[12.5px] font-bold lg:justify-self-start',
                      clases,
                    )}
                  >
                    <Icono aria-hidden="true" className="size-3.5" />
                    {elemento.categoria_inventario}
                  </span>

                  {editando ? (
                    <form
                      onSubmit={(e) => guardar(e, elemento)}
                      noValidate
                      className="flex flex-wrap items-center gap-1.5 lg:justify-end"
                    >
                      <label htmlFor={`cantidad-${elemento.id}`} className="sr-only">
                        Nueva cantidad de {elemento.nombre}
                      </label>
                      <Input
                        id={`cantidad-${elemento.id}`}
                        type="number"
                        min={0}
                        step={1}
                        inputMode="numeric"
                        value={valor}
                        onChange={(e) => setValor(e.target.value)}
                        disabled={guardando}
                        autoFocus
                        className="h-9 w-24 text-right"
                      />
                      <label htmlFor={`motivo-${elemento.id}`} className="sr-only">
                        Motivo del ajuste (opcional)
                      </label>
                      <Input
                        id={`motivo-${elemento.id}`}
                        value={motivo}
                        onChange={(e) => setMotivo(e.target.value)}
                        placeholder="Motivo (opcional)"
                        maxLength={300}
                        disabled={guardando}
                        className="h-9 w-44 text-sm"
                      />
                      <Button type="submit" size="icon" disabled={guardando} aria-label="Guardar cantidad" className="size-9">
                        {guardando ? <LoaderCircle className="animate-spin" /> : <Check />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={cancelar} disabled={guardando} aria-label="Cancelar" className="size-9">
                        <X />
                      </Button>
                    </form>
                  ) : (
                    <span className="flex flex-wrap items-center gap-2 lg:justify-end">
                      <span className="font-display text-lg font-bold">{formatearNumero(elemento.cantidad_propia)}</span>
                      <span className="text-muted-foreground">und</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => empezarEdicion(elemento)}
                        aria-label={`Actualizar cantidad de ${elemento.nombre}`}
                      >
                        <Pencil aria-hidden="true" className="!size-4" />
                        Actualizar
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onAdquirir(elemento)}
                        aria-label={`Registrar adquisición de ${elemento.nombre}`}
                      >
                        <PackagePlus aria-hidden="true" className="!size-4" />
                        Adquisición
                      </Button>
                    </span>
                  )}
                </div>
                {editando && error && (
                  <Alert variant="error" className="mt-2.5">
                    {error}
                  </Alert>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
