/**
 * Formulario para registrar un elemento nuevo en el inventario (HU-08):
 * nombre, categoría, si es propio o alquilado (HU-12) y cantidad disponible.
 */
import { LoaderCircle, Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { formatearNumero } from '@/lib/formato'
import { etiquetaCategoria } from '@/lib/inventario'
import { cn } from '@/lib/utils'
import { ApiError } from '@/services/api'
import { inventarioService } from '@/services/inventarioService'
import { CATEGORIAS_INVENTARIO, type CategoriaInventario, type ElementoInventario } from '@/types/inventario'

type Errores = Partial<Record<'nombre' | 'categoria' | 'cantidad', string>>

function validar(nombre: string, categoria: string, cantidad: string): Errores {
  const errores: Errores = {}
  if (!nombre.trim()) errores.nombre = 'Escribe el nombre del elemento.'
  else if (nombre.trim().length > 150) errores.nombre = 'El nombre admite máximo 150 caracteres.'
  if (!categoria) errores.categoria = 'Selecciona la categoría.'
  const numero = Number(cantidad)
  if (cantidad.trim() === '') errores.cantidad = 'Indica la cantidad disponible.'
  else if (!Number.isInteger(numero) || numero < 0) errores.cantidad = 'Debe ser un número entero mayor o igual a 0.'
  return errores
}

export function FormularioElemento({ onRegistrado }: { onRegistrado: (elemento: ElementoInventario) => void }) {
  const [nombre, setNombre] = useState('')
  const [categoria, setCategoria] = useState('')
  const [cantidad, setCantidad] = useState('')
  // HU-12: por defecto el elemento es propio; también se puede registrar uno alquilado a un proveedor
  const [esPropio, setEsPropio] = useState(true)
  const [intento, setIntento] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [errorServidor, setErrorServidor] = useState<string | null>(null)
  const [exito, setExito] = useState<string | null>(null)

  const errores = intento ? validar(nombre, categoria, cantidad) : {}
  const propsError = (campo: keyof Errores, id: string) => ({
    'aria-invalid': Boolean(errores[campo]),
    'aria-describedby': errores[campo] ? `${id}-error` : undefined,
  })

  async function registrar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setIntento(true)
    setErrorServidor(null)
    setExito(null)
    if (Object.keys(validar(nombre, categoria, cantidad)).length > 0) return

    setEnviando(true)
    try {
      const elemento = await inventarioService.registrar({
        nombre: nombre.trim(),
        categoria_inventario: categoria as CategoriaInventario,
        cantidad_propia: Number(cantidad),
        es_propio: esPropio,
      })
      onRegistrado(elemento)
      setExito(
        `«${elemento.nombre}» registrado como ${elemento.es_propio ? 'propio' : 'alquilado'} con ${formatearNumero(elemento.cantidad_propia)} unidades disponibles.`,
      )
      setNombre('')
      setCantidad('')
      setIntento(false)
    } catch (err) {
      setErrorServidor(err instanceof ApiError ? err.message : 'No fue posible registrar el elemento. Intenta de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={registrar} noValidate className="flex flex-col gap-5">
      {errorServidor && <Alert variant="error">{errorServidor}</Alert>}
      {exito && <Alert variant="success">{exito}</Alert>}

      <FormField id="inventario-nombre" label="Nombre del elemento" error={errores.nombre}>
        <Input
          id="inventario-nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej. Sillas Tiffany doradas"
          maxLength={150}
          disabled={enviando}
          {...propsError('nombre', 'inventario-nombre')}
        />
      </FormField>

      <FormField id="inventario-categoria" label="Categoría" error={errores.categoria}>
        <Select
          id="inventario-categoria"
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          disabled={enviando}
          {...propsError('categoria', 'inventario-categoria')}
        >
          <option value="" disabled>
            Selecciona una categoría
          </option>
          {CATEGORIAS_INVENTARIO.map((c) => (
            <option key={c} value={c}>
              {etiquetaCategoria(c)}
            </option>
          ))}
        </Select>
      </FormField>

      <div className="flex flex-col gap-2">
        <span id="inventario-propiedad-etiqueta" className="text-sm font-semibold">
          Propiedad
        </span>
        <div role="group" aria-labelledby="inventario-propiedad-etiqueta" className="flex rounded-[10px] bg-chip p-[3px]">
          {(
            [
              [true, 'Propio'],
              [false, 'Alquilado'],
            ] as const
          ).map(([valor, etiqueta]) => (
            <button
              key={etiqueta}
              type="button"
              aria-pressed={esPropio === valor}
              onClick={() => setEsPropio(valor)}
              disabled={enviando}
              className={cn(
                'h-9 flex-1 cursor-pointer rounded-lg text-[13.5px] font-bold outline-none focus-visible:ring-[3px] focus-visible:ring-ring',
                esPropio === valor ? 'bg-card text-foreground shadow-sm dark:bg-input' : 'text-subtle',
              )}
            >
              {etiqueta}
            </button>
          ))}
        </div>
        <span className="text-[12.5px] text-muted-foreground">
          {esPropio ? 'Pertenece a la organización.' : 'Se alquila a un proveedor: en un evento siempre cuenta como «a alquilar».'}
        </span>
      </div>

      <FormField id="inventario-cantidad" label="Cantidad disponible" error={errores.cantidad}>
        <div className="relative">
          <Input
            id="inventario-cantidad"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            placeholder="Ej. 120"
            disabled={enviando}
            className="pr-24"
            {...propsError('cantidad', 'inventario-cantidad')}
          />
          <span aria-hidden="true" className="pointer-events-none absolute top-3.5 right-3.5 text-sm text-muted-foreground">
            unidades
          </span>
        </div>
      </FormField>

      <Button type="submit" size="lg" disabled={enviando}>
        {enviando ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <Plus aria-hidden="true" />}
        {enviando ? 'Registrando…' : 'Registrar elemento'}
      </Button>
    </form>
  )
}
