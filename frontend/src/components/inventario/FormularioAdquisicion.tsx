/**
 * Formulario para registrar una adquisición (HU-09): suma unidades compradas a un elemento
 * que ya existe y muestra cómo queda la cantidad disponible antes de guardar.
 */
import { ArrowRight, LoaderCircle, PackagePlus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { formatearNumero } from '@/lib/formato'
import { etiquetaCategoria, maximoCategoria } from '@/lib/inventario'
import { ApiError } from '@/services/api'
import { inventarioService } from '@/services/inventarioService'
import { CATEGORIAS_INVENTARIO, type ElementoInventario } from '@/types/inventario'

type Errores = Partial<Record<'elemento' | 'cantidad', string>>

// Cuántas unidades más caben en el elemento sin pasar el máximo de su categoría (RN-16)
const unidadesQueCaben = (elemento: ElementoInventario) =>
  Math.max(maximoCategoria(elemento.categoria_inventario) - elemento.cantidad_propia, 0)

function errorCantidad(cantidad: string, elemento: ElementoInventario | null): string | undefined {
  const numero = Number(cantidad)
  if (cantidad.trim() === '') return 'Indica cuántas unidades se adquirieron.'
  if (!Number.isInteger(numero) || numero < 1) return 'Debe ser un número entero mayor o igual a 1.'
  if (elemento && numero > unidadesQueCaben(elemento)) {
    const cabe = unidadesQueCaben(elemento)
    const maximo = maximoCategoria(elemento.categoria_inventario)
    return cabe === 0
      ? `Este elemento ya tiene el máximo de ${formatearNumero(maximo)} unidades; no se pueden adquirir más.`
      : `Como mucho se pueden adquirir ${formatearNumero(cabe)}: el máximo de ${etiquetaCategoria(elemento.categoria_inventario)} es ${formatearNumero(maximo)} por elemento y ya hay ${formatearNumero(elemento.cantidad_propia)}.`
  }
  return undefined
}

function validar(elementoId: string, cantidad: string, elemento: ElementoInventario | null): Errores {
  const errores: Errores = {}
  if (!elementoId) errores.elemento = 'Selecciona el elemento adquirido.'
  const error = errorCantidad(cantidad, elemento)
  if (error) errores.cantidad = error
  return errores
}

interface FormularioAdquisicionProps {
  elementos: ElementoInventario[]
  elementoInicialId?: number
  onRegistrada: (elemento: ElementoInventario) => void
}

export function FormularioAdquisicion({ elementos, elementoInicialId, onRegistrada }: FormularioAdquisicionProps) {
  const [elementoId, setElementoId] = useState(elementoInicialId ? String(elementoInicialId) : '')
  const [cantidad, setCantidad] = useState('')
  const [notas, setNotas] = useState('')
  const [intento, setIntento] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [errorServidor, setErrorServidor] = useState<string | null>(null)
  const [exito, setExito] = useState<string | null>(null)

  const elemento = elementos.find((e) => e.id === Number(elementoId)) ?? null
  const errores = intento ? validar(elementoId, cantidad, elemento) : {}
  // El máximo se avisa apenas se escribe una cantidad que lo pasa, sin esperar a «Registrar»
  if (!errores.cantidad && cantidad.trim() !== '') {
    const aviso = errorCantidad(cantidad, elemento)
    if (aviso) errores.cantidad = aviso
  }
  const cantidadNumero = Number(cantidad)
  const cantidadValida = cantidad.trim() !== '' && errorCantidad(cantidad, elemento) === undefined
  const propsError = (campo: keyof Errores, id: string) => ({
    'aria-invalid': Boolean(errores[campo]),
    'aria-describedby': errores[campo] ? `${id}-error` : undefined,
  })

  async function registrar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setIntento(true)
    setErrorServidor(null)
    setExito(null)
    if (Object.keys(validar(elementoId, cantidad, elemento)).length > 0 || !elemento) return

    setEnviando(true)
    try {
      const { elemento: actualizado } = await inventarioService.registrarAdquisicion(
        elemento.id,
        cantidadNumero,
        notas.trim() || undefined,
      )
      onRegistrada(actualizado)
      setExito(
        `Se sumaron ${formatearNumero(cantidadNumero)} unidades a «${actualizado.nombre}». Ahora hay ${formatearNumero(actualizado.cantidad_propia)} disponibles.`,
      )
      setCantidad('')
      setNotas('')
      setIntento(false)
    } catch (err) {
      setErrorServidor(err instanceof ApiError ? err.message : 'No fue posible registrar la adquisición. Intenta de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  if (elementos.length === 0) {
    return (
      <p className="rounded-[10px] bg-background px-3.5 py-3 text-sm text-subtle">
        Primero registra un elemento en el inventario; las adquisiciones se suman a elementos existentes.
      </p>
    )
  }

  return (
    <form onSubmit={registrar} noValidate className="flex flex-col gap-5">
      {errorServidor && <Alert variant="error">{errorServidor}</Alert>}
      {exito && <Alert variant="success">{exito}</Alert>}

      <FormField id="adquisicion-elemento" label="Elemento adquirido" error={errores.elemento}>
        <Select
          id="adquisicion-elemento"
          value={elementoId}
          onChange={(e) => setElementoId(e.target.value)}
          disabled={enviando}
          {...propsError('elemento', 'adquisicion-elemento')}
        >
          <option value="" disabled>
            Selecciona un elemento
          </option>
          {CATEGORIAS_INVENTARIO.map((categoria) => {
            const deCategoria = elementos.filter((e) => e.categoria_inventario === categoria)
            if (deCategoria.length === 0) return null
            return (
              <optgroup key={categoria} label={etiquetaCategoria(categoria)}>
                {deCategoria.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre} ({formatearNumero(e.cantidad_propia)} und)
                  </option>
                ))}
              </optgroup>
            )
          })}
        </Select>
      </FormField>

      <FormField
        id="adquisicion-cantidad"
        label="Cantidad adquirida"
        error={errores.cantidad}
        hint={
          elemento
            ? unidadesQueCaben(elemento) > 0
              ? `Como mucho puedes adquirir ${formatearNumero(unidadesQueCaben(elemento))} unidades más (máximo ${formatearNumero(maximoCategoria(elemento.categoria_inventario))} por elemento).`
              : `Este elemento ya tiene el máximo de ${formatearNumero(maximoCategoria(elemento.categoria_inventario))} unidades.`
            : undefined
        }
      >
        <div className="relative">
          <Input
            id="adquisicion-cantidad"
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            placeholder="Ej. 30"
            disabled={enviando}
            className="pr-24"
            {...propsError('cantidad', 'adquisicion-cantidad')}
          />
          <span aria-hidden="true" className="pointer-events-none absolute top-3.5 right-3.5 text-sm text-muted-foreground">
            unidades
          </span>
        </div>
      </FormField>

      <FormField id="adquisicion-notas" label="Notas" opcional>
        <Input
          id="adquisicion-notas"
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          placeholder="Ej. reposición para temporada de bodas"
          maxLength={300}
          disabled={enviando}
        />
      </FormField>

      {/* Vista previa: cantidad disponible actual -> cantidad después de la adquisición */}
      {elemento && (
        <div aria-live="polite" className="flex items-center justify-between gap-3 rounded-[10px] bg-accent px-3.5 py-3 text-sm text-accent-foreground">
          <span className="font-semibold">Disponible</span>
          <span className="flex items-center gap-2 font-display text-lg font-bold">
            {formatearNumero(elemento.cantidad_propia)}
            <ArrowRight aria-hidden="true" className="size-4" />
            {cantidadValida ? formatearNumero(elemento.cantidad_propia + cantidadNumero) : '—'}
            <span className="font-sans text-xs font-semibold">und</span>
          </span>
        </div>
      )}

      <Button type="submit" size="lg" disabled={enviando}>
        {enviando ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <PackagePlus aria-hidden="true" />}
        {enviando ? 'Registrando…' : 'Registrar adquisición'}
      </Button>
    </form>
  )
}
