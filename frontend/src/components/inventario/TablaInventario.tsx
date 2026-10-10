/**
 * Tabla de elementos del inventario. Permite actualizar la cantidad en la misma fila (HU-08),
 * marcar el elemento como propio o alquilado (HU-12) y abrir los formularios de adquisición (HU-09)
 * y de baja por daño (HU-10).
 * En pantallas medianas cada fila se muestra como tarjeta.
 */
import { Check, LoaderCircle, PackageMinus, PackagePlus, Pencil, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
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
  onDarDeBaja: (elemento: ElementoInventario) => void
}

export function TablaInventario({ elementos, mensajeVacio, onActualizado, onAdquirir, onDarDeBaja }: TablaInventarioProps) {
  // Solo una fila se edita a la vez: la del id guardado aquí
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [valor, setValor] = useState('')
  const [motivo, setMotivo] = useState('')
  const [propiedad, setPropiedad] = useState<'propio' | 'alquilado'>('propio')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function empezarEdicion(elemento: ElementoInventario) {
    setEditandoId(elemento.id)
    setValor(String(elemento.cantidad_propia))
    setPropiedad(elemento.es_propio ? 'propio' : 'alquilado')
    setMotivo('')
    setError(null)
  }

  function cancelar() {
    setEditandoId(null)
    setError(null)
  }

  // Guarda la nueva cantidad; el backend registra la diferencia como un "ajuste" en el historial
  async function guardar(evento: FormEvent<HTMLFormElement>, elemento: ElementoInventario) {
    evento.preventDefault()
    const cantidad = Number(valor)
    if (valor.trim() === '' || !Number.isInteger(cantidad) || cantidad < 0) {
      setError('La cantidad debe ser un número entero mayor o igual a 0.')
      return
    }

    setGuardando(true)
    try {
      // Primero la propiedad (si cambió) y luego la cantidad; cada llamada devuelve el elemento actualizado
      const esPropio = propiedad === 'propio'
      let actualizado = elemento
      if (esPropio !== elemento.es_propio) {
        actualizado = await inventarioService.actualizarPropiedad(elemento.id, esPropio)
        onActualizado(actualizado)
      }
      actualizado = await inventarioService.actualizarCantidad(elemento.id, cantidad, motivo.trim() || undefined)
      onActualizado(actualizado)
      setEditandoId(null)
      setError(null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No fue posible guardar los cambios.')
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
                  <span className="flex min-w-0 flex-col items-start gap-1">
                    <span className="max-w-full font-bold break-words lg:truncate" title={elemento.nombre}>
                      {elemento.nombre}
                    </span>
                    {/* HU-12: cada elemento dice si es propio o alquilado a un proveedor */}
                    <span
                      className={cn(
                        'rounded-md px-2 py-0.5 text-[11px] font-bold',
                        elemento.es_propio
                          ? 'bg-success-soft text-success-foreground'
                          : 'bg-warning-soft text-warning-foreground',
                      )}
                    >
                      {elemento.es_propio ? 'Propio' : 'Alquilado'}
                    </span>
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
                      <label htmlFor={`propiedad-${elemento.id}`} className="sr-only">
                        Propiedad de {elemento.nombre}
                      </label>
                      <Select
                        id={`propiedad-${elemento.id}`}
                        value={propiedad}
                        onChange={(e) => setPropiedad(e.target.value as 'propio' | 'alquilado')}
                        disabled={guardando}
                        className="h-9 w-32 text-sm"
                      >
                        <option value="propio">Propio</option>
                        <option value="alquilado">Alquilado</option>
                      </Select>
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
                      <Button type="submit" size="icon" disabled={guardando} aria-label="Guardar cambios" className="size-9">
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
                      {elemento.cantidad_danada > 0 && (
                        <span className="text-xs text-muted-foreground" title="Unidades dadas de baja por daño">
                          · {formatearNumero(elemento.cantidad_danada)} de baja
                        </span>
                      )}
                      {/* Solo ícono para dejar espacio al nombre; el texto va en el título y en el aria-label */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => empezarEdicion(elemento)}
                        aria-label={`Actualizar cantidad de ${elemento.nombre}`}
                        title="Actualizar cantidad"
                        className="px-2.5"
                      >
                        <Pencil aria-hidden="true" className="!size-4" />
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
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onDarDeBaja(elemento)}
                        disabled={elemento.cantidad_propia === 0}
                        aria-label={`Dar de baja unidades dañadas de ${elemento.nombre}`}
                      >
                        <PackageMinus aria-hidden="true" className="!size-4" />
                        Baja
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
