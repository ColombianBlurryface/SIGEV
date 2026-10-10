/**
 * Formulario de baja de elementos dañados (HU-10, RF-12).
 *
 * Es una acción aparte de «Actualizar» cantidad: la persona elige el elemento y escribe solo
 * cuántas unidades se dañaron. El sistema hace la resta y muestra cómo queda el total, sin que
 * nadie tenga que calcular la cantidad resultante. No deja dar de baja más de lo disponible.
 */
import { ArrowRight, LoaderCircle, PackageMinus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { formatearNumero } from '@/lib/formato'
import { ApiError } from '@/services/api'
import { inventarioService } from '@/services/inventarioService'
import { CATEGORIAS_INVENTARIO, type ElementoInventario } from '@/types/inventario'

type Errores = Partial<Record<'elemento' | 'cantidad', string>>

function validar(elemento: ElementoInventario | null, cantidad: string): Errores {
  const errores: Errores = {}
  if (!elemento) errores.elemento = 'Selecciona el elemento dañado.'
  const numero = Number(cantidad)
  if (cantidad.trim() === '') errores.cantidad = 'Indica cuántas unidades se dañaron.'
  else if (!Number.isInteger(numero) || numero < 1) errores.cantidad = 'Debe ser un número entero mayor a 0.'
  else if (elemento && numero > elemento.cantidad_propia) {
    errores.cantidad = `No puedes dar de baja más de las ${formatearNumero(elemento.cantidad_propia)} unidades disponibles.`
  }
  return errores
}

interface FormularioBajaProps {
  elementos: ElementoInventario[]
  elementoInicialId?: number
  onRegistrada: (elemento: ElementoInventario) => void
}

export function FormularioBaja({ elementos, elementoInicialId, onRegistrada }: FormularioBajaProps) {
  const [elementoId, setElementoId] = useState(elementoInicialId ? String(elementoInicialId) : '')
  const [cantidad, setCantidad] = useState('')
  const [motivo, setMotivo] = useState('')
  const [intento, setIntento] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [errorServidor, setErrorServidor] = useState<string | null>(null)
  const [exito, setExito] = useState<string | null>(null)

  // Solo se puede dar de baja lo que tiene unidades disponibles
  const conStock = elementos.filter((e) => e.cantidad_propia > 0)
  const elemento = elementos.find((e) => e.id === Number(elementoId)) ?? null
  const cantidadNumero = Number(cantidad)
  const cantidadValida = cantidad.trim() !== '' && Number.isInteger(cantidadNumero) && cantidadNumero >= 1
  const excede = elemento !== null && cantidadValida && cantidadNumero > elemento.cantidad_propia
  // El error de la cantidad "excede" se muestra apenas se escribe, sin esperar al envío
  const errores = intento || excede ? validar(elemento, cantidad) : {}
  const propsError = (campo: keyof Errores, id: string) => ({
    'aria-invalid': Boolean(errores[campo]),
    'aria-describedby': errores[campo] ? `${id}-error` : undefined,
  })

  async function registrar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setIntento(true)
    setErrorServidor(null)
    setExito(null)
    if (Object.keys(validar(elemento, cantidad)).length > 0 || !elemento) return

    setEnviando(true)
    try {
      const { elemento: actualizado } = await inventarioService.registrarBaja(
        elemento.id,
        cantidadNumero,
        motivo.trim() || undefined,
      )
      onRegistrada(actualizado)
      setExito(
        `Se dieron de baja ${formatearNumero(cantidadNumero)} unidades de «${actualizado.nombre}». Quedan ${formatearNumero(actualizado.cantidad_propia)} disponibles.`,
      )
      setCantidad('')
      setMotivo('')
      setIntento(false)
    } catch (err) {
      setErrorServidor(err instanceof ApiError ? err.message : 'No fue posible registrar la baja. Intenta de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  if (elementos.length === 0) {
    return (
      <p className="rounded-[10px] bg-background px-3.5 py-3 text-sm text-subtle">
        Todavía no hay elementos en el inventario para dar de baja.
      </p>
    )
  }

  return (
    <form onSubmit={registrar} noValidate className="flex flex-col gap-5">
      {errorServidor && <Alert variant="error">{errorServidor}</Alert>}
      {exito && <Alert variant="success">{exito}</Alert>}

      <FormField id="baja-elemento" label="Elemento dañado" error={errores.elemento}>
        <Select
          id="baja-elemento"
          value={elementoId}
          onChange={(e) => setElementoId(e.target.value)}
          disabled={enviando}
          {...propsError('elemento', 'baja-elemento')}
        >
          <option value="" disabled>
            Selecciona un elemento
          </option>
          {CATEGORIAS_INVENTARIO.map((categoria) => {
            const deCategoria = conStock.filter((e) => e.categoria_inventario === categoria)
            if (deCategoria.length === 0) return null
            return (
              <optgroup key={categoria} label={categoria}>
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

      <FormField id="baja-cantidad" label="Cantidad dañada" error={errores.cantidad}>
        <div className="relative">
          <Input
            id="baja-cantidad"
            type="number"
            min={1}
            max={elemento?.cantidad_propia}
            step={1}
            inputMode="numeric"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            placeholder="Ej. 5"
            disabled={enviando}
            className="pr-24"
            {...propsError('cantidad', 'baja-cantidad')}
          />
          <span aria-hidden="true" className="pointer-events-none absolute top-3.5 right-3.5 text-sm text-muted-foreground">
            unidades
          </span>
        </div>
      </FormField>

      <FormField id="baja-motivo" label="Motivo" opcional>
        <Input
          id="baja-motivo"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Ej. rotura durante el evento"
          maxLength={300}
          disabled={enviando}
        />
      </FormField>

      {/* Vista previa: cantidad disponible actual -> cantidad que quedará después de la baja */}
      {elemento && (
        <div aria-live="polite" className="flex items-center justify-between gap-3 rounded-[10px] bg-destructive-soft px-3.5 py-3 text-sm text-destructive-foreground">
          <span className="font-semibold">Disponible</span>
          <span className="flex items-center gap-2 font-display text-lg font-bold">
            {formatearNumero(elemento.cantidad_propia)}
            <ArrowRight aria-hidden="true" className="size-4" />
            {cantidadValida && !excede ? formatearNumero(elemento.cantidad_propia - cantidadNumero) : '—'}
            <span className="font-sans text-xs font-semibold">und</span>
          </span>
        </div>
      )}

      <Button type="submit" size="lg" variant="destructive" disabled={enviando || excede}>
        {enviando ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <PackageMinus aria-hidden="true" />}
        {enviando ? 'Registrando…' : 'Dar de baja'}
      </Button>
    </form>
  )
}
