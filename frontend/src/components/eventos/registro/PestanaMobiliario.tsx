/**
 * Pestaña "Mobiliario" (HU-04 y HU-12).
 *
 * El mobiliario se elige de los elementos del inventario (categoría Mobiliario). Con la cantidad
 * disponible de cada uno se indica, línea por línea, cuántas unidades son propias y cuántas hay
 * que alquilar. Lo que no está en el inventario se agrega como "Otro" y va todo a alquiler.
 * No tiene costo automático; se guarda como requerimiento adicional de tipo "mobiliario".
 */
import { Info, Plus, RotateCw, Trash2, Users } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AvisoAlquiler, OrigenBadge } from '@/components/eventos/AlquilerMobiliario'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useInventario } from '@/hooks/useInventario'
import { useUmbralAlquiler } from '@/hooks/useUmbralAlquiler'
import { repartirMobiliario, totalAlquilar } from '@/lib/alquiler'
import { formatearNumero } from '@/lib/formato'
import type { MobiliarioAgregado } from '@/types/registro'

const COLUMNAS = 'grid grid-cols-[minmax(0,1fr)_84px_84px_96px_36px] items-center gap-2.5'

// Valor del <select> para lo que no está en el inventario
const OPCION_OTRO = 'otro'

interface PestanaMobiliarioProps {
  asistentes: number
  mobiliario: MobiliarioAgregado[]
  onAgregar: (item: MobiliarioAgregado) => void
  onQuitar: (id: string) => void
}

export function PestanaMobiliario({ asistentes, mobiliario, onAgregar, onQuitar }: PestanaMobiliarioProps) {
  const inventario = useInventario()
  const umbral = useUmbralAlquiler()
  const [seleccion, setSeleccion] = useState('')
  const [referencia, setReferencia] = useState('')
  const [cantidad, setCantidad] = useState('')
  const [errorForm, setErrorForm] = useState<string | null>(null)

  const elementosMobiliario = inventario.elementos.filter((e) => e.categoria_inventario === 'Mobiliario')
  const esOtro = seleccion === OPCION_OTRO
  const elegido = elementosMobiliario.find((e) => String(e.id) === seleccion) ?? null

  // Reparto propio / alquiler de cada línea, calculado con el stock que había al agregarla
  const lineas = mobiliario.map((item) => ({ item, reparto: repartirMobiliario(item.cantidad, item.disponible) }))
  const totalUnidades = mobiliario.reduce((suma, m) => suma + m.cantidad, 0)
  const unidadesAlquilar = totalAlquilar(lineas.map((l) => l.reparto))

  function agregar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const cantidadNumero = Number(cantidad)

    if (!seleccion) return setErrorForm('Selecciona un elemento del inventario o «Otro».')
    if (esOtro && !referencia.trim()) return setErrorForm('Describe el elemento que no está en el inventario.')
    if (!Number.isInteger(cantidadNumero) || cantidadNumero < 1) return setErrorForm('La cantidad debe ser un número entero mayor a 0.')

    onAgregar({
      id: crypto.randomUUID(),
      productoId: elegido?.id ?? null,
      // Para "Otro" el nombre es la descripción escrita; para el inventario, el nombre del elemento
      elemento: elegido ? elegido.nombre : referencia.trim(),
      referencia: elegido ? referencia.trim() : '',
      cantidad: cantidadNumero,
      // Un elemento alquilado no suma stock propio: se registra con 0 disponibles y todo va a alquiler
      disponible: elegido ? (elegido.es_propio ? elegido.cantidad_propia : 0) : null,
      alquilado: elegido ? !elegido.es_propio : false,
    })
    setSeleccion('')
    setReferencia('')
    setCantidad('')
    setErrorForm(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <AvisoAlquiler superaUmbral={asistentes > umbral} umbral={umbral} unidadesAlquilar={unidadesAlquilar} />

      <Card className="p-5">
        <form onSubmit={agregar} noValidate className="flex flex-col gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-base font-bold">Agregar mobiliario</h2>
            <span className="text-[12.5px] text-muted-foreground">Se compara con el inventario propio, sin costo automático</span>
          </div>

          {inventario.error && (
            <div className="flex flex-wrap items-center gap-3">
              <Alert variant="error" className="flex-1">
                {inventario.error} Puedes agregar elementos como «Otro» (irán a alquiler).
              </Alert>
              <Button variant="secondary" size="sm" onClick={inventario.recargar}>
                <RotateCw aria-hidden="true" />
                Reintentar
              </Button>
            </div>
          )}

          {!inventario.cargando && !inventario.error && elementosMobiliario.length === 0 && (
            <Alert variant="info">
              No hay mobiliario registrado en el <Link to="/inventario" className="font-bold underline">inventario</Link>. Lo
              que agregues aquí irá todo a alquiler.
            </Alert>
          )}

          <div className="grid items-start gap-3.5 md:grid-cols-4">
            <FormField
              id="mobiliario-elemento"
              label="Elemento"
              hint={
                elegido
                  ? elegido.es_propio
                    ? `${formatearNumero(elegido.cantidad_propia)} unidades propias disponibles`
                    : 'Elemento alquilado a un proveedor: todo se cuenta como «a alquilar»'
                  : undefined
              }
              className="md:col-span-2"
            >
              <Select
                id="mobiliario-elemento"
                value={seleccion}
                onChange={(e) => setSeleccion(e.target.value)}
                disabled={inventario.cargando}
              >
                <option value="" disabled>
                  {inventario.cargando ? 'Cargando inventario…' : 'Selecciona un elemento'}
                </option>
                {elementosMobiliario.length > 0 && (
                  <optgroup label="Inventario propio">
                    {elementosMobiliario.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.nombre} · {e.es_propio ? `${formatearNumero(e.cantidad_propia)} disp.` : 'alquilado'}
                      </option>
                    ))}
                  </optgroup>
                )}
                <option value={OPCION_OTRO}>Otro (no está en el inventario)</option>
              </Select>
            </FormField>

            <FormField id="mobiliario-referencia" label={esOtro ? 'Descripción del elemento' : 'Notas'} opcional={!esOtro}>
              <Input
                id="mobiliario-referencia"
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                placeholder={esOtro ? 'Ej. carpa 10 × 20 m' : 'Ej. con funda blanca'}
                maxLength={200}
              />
            </FormField>

            <FormField id="mobiliario-cantidad" label="Cantidad requerida">
              <Input
                id="mobiliario-cantidad"
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
              />
            </FormField>
          </div>

          {errorForm && <Alert variant="error">{errorForm}</Alert>}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button variant="secondary" size="sm" onClick={() => setCantidad(String(asistentes))} className="rounded-full">
              <Users aria-hidden="true" />
              Igualar a asistentes ({formatearNumero(asistentes)})
            </Button>
            <Button type="submit" className="md:w-44">
              <Plus aria-hidden="true" />
              Agregar
            </Button>
          </div>
        </form>
      </Card>

      <Card className="overflow-x-auto rounded-[14px]">
        <div className="min-w-[560px]">
          <div
            className={`${COLUMNAS} border-b border-border bg-muted px-[18px] py-3 text-[11.5px] font-bold tracking-[0.04em] text-muted-foreground uppercase`}
          >
            <span>Elemento</span>
            <span className="text-right">Requerido</span>
            <span className="text-right">Propias</span>
            <span className="text-right">A alquilar</span>
            <span />
          </div>

          {mobiliario.length === 0 ? (
            <p className="px-[18px] py-8 text-center text-sm text-subtle">Todavía no has agregado mobiliario a este evento.</p>
          ) : (
            <ul>
              {lineas.map(({ item, reparto }) => (
                <li key={item.id} className={`${COLUMNAS} border-b border-border px-[18px] py-3 text-sm`}>
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-bold" title={item.elemento}>
                        {item.elemento}
                      </span>
                      <OrigenBadge reparto={reparto} />
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {item.productoId === null
                        ? 'No está en el inventario'
                        : item.alquilado
                          ? 'Elemento alquilado a un proveedor'
                          : `${formatearNumero(item.disponible ?? 0)} en inventario`}
                      {item.referencia && ` · ${item.referencia}`}
                    </span>
                  </span>
                  <span className="text-right font-bold">{formatearNumero(item.cantidad)}</span>
                  <span className="text-right text-subtle">{formatearNumero(reparto.propias)}</span>
                  <span className={reparto.alquilar > 0 ? 'text-right font-bold text-warning-foreground' : 'text-right text-subtle'}>
                    {formatearNumero(reparto.alquilar)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onQuitar(item.id)}
                    aria-label={`Quitar ${item.elemento}`}
                    className="size-8 text-muted-foreground"
                  >
                    <Trash2 className="!size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 px-[18px] py-3 text-sm">
            <span className="flex items-center gap-2 text-subtle">
              <Info aria-hidden="true" className="size-4" />
              El mobiliario se cotiza aparte
            </span>
            <span className="font-bold">
              {mobiliario.length} {mobiliario.length === 1 ? 'elemento' : 'elementos'} · {formatearNumero(totalUnidades)} und
              {unidadesAlquilar > 0 && ` · ${formatearNumero(unidadesAlquilar)} a alquilar`}
            </span>
          </div>
        </div>
      </Card>
    </div>
  )
}
