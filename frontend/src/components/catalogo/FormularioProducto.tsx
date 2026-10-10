/**
 * Formulario para crear o editar un producto del catálogo.
 *
 * El catálogo es lo que usa el registro de eventos para calcular cantidades y costos, por eso
 * cada producto lleva sus datos de cálculo: cuánto se consume por persona, o el tamaño de la
 * botella y de cada porción, y su precio. Mientras se escribe se muestra una vista previa con
 * 100 asistentes para comprobar que el cálculo da lo esperado.
 */
import { Calculator, LoaderCircle, Plus, Save, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { calcularProducto } from '@/lib/calculos'
import {
  CONFIG_GRUPO,
  ETIQUETA_PRECIO,
  ETIQUETA_TIPO,
  esGrupoCatalogo,
  GRUPOS_CATALOGO,
  TIPOS_POR_GRUPO,
  type TipoConsumo,
} from '@/lib/catalogo'
import { formatearMoneda, formatearNumero } from '@/lib/formato'
import { ApiError } from '@/services/api'
import { catalogoService } from '@/services/catalogoService'
import type { DatosProducto, GrupoCatalogo, ProductoCatalogo } from '@/types/catalogo'

const ASISTENTES_VISTA_PREVIA = 100

type Campo = 'nombre' | 'grupo' | 'porcion' | 'volumen' | 'tamano' | 'precio'
type Errores = Partial<Record<Campo, string>>

interface Valores {
  nombre: string
  grupo: GrupoCatalogo | ''
  tipo: TipoConsumo | ''
  porcion: string
  volumen: string
  tamano: string
  precio: string
}

const positivo = (texto: string) => texto.trim() !== '' && Number.isFinite(Number(texto)) && Number(texto) > 0

function validar(v: Valores): Errores {
  const errores: Errores = {}
  if (!v.nombre.trim()) errores.nombre = 'Escribe el nombre del producto.'
  else if (v.nombre.trim().length > 150) errores.nombre = 'El nombre admite máximo 150 caracteres.'
  if (!v.grupo) errores.grupo = 'Selecciona el grupo.'

  if (v.tipo === 'botella_compartida') {
    if (!positivo(v.volumen)) errores.volumen = 'Indica el volumen de la botella en ml.'
    if (!positivo(v.tamano)) errores.tamano = 'Indica el tamaño de cada porción en ml.'
    else if (positivo(v.volumen) && Number(v.tamano) > Number(v.volumen)) {
      errores.tamano = 'La porción no puede ser mayor que la botella.'
    }
  } else if (v.tipo && !positivo(v.porcion)) {
    errores.porcion = v.tipo === 'porcion_persona' ? 'Indica los gramos por persona.' : 'Indica las unidades por persona.'
  }

  if (v.precio.trim() === '' || !Number.isFinite(Number(v.precio)) || Number(v.precio) < 0) {
    errores.precio = 'Indica el precio (0 o más).'
  }
  return errores
}

function valoresIniciales(producto: ProductoCatalogo | null): Valores {
  if (!producto || !esGrupoCatalogo(producto.clasificacion)) {
    return { nombre: '', grupo: '', tipo: '', porcion: '', volumen: '', tamano: '', precio: '' }
  }
  const tipo = producto.tipo_calculo as TipoConsumo
  return {
    nombre: producto.nombre,
    grupo: producto.clasificacion,
    tipo,
    porcion: tipo === 'botella_compartida' ? '' : String(Number(producto.porcion_por_persona)),
    volumen: tipo === 'botella_compartida' ? String(Number(producto.volumen_botella_ml)) : '',
    tamano: tipo === 'botella_compartida' ? String(Number(producto.tamano_porcion_ml)) : '',
    precio: String(Number(producto.precio_unitario)),
  }
}

interface FormularioProductoProps {
  // Producto que se edita; null para crear uno nuevo
  producto: ProductoCatalogo | null
  onGuardado: (producto: ProductoCatalogo, editado: boolean) => void
  onCancelar: () => void
}

export function FormularioProducto({ producto, onGuardado, onCancelar }: FormularioProductoProps) {
  const [valores, setValores] = useState<Valores>(() => valoresIniciales(producto))
  const [intento, setIntento] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [errorServidor, setErrorServidor] = useState<string | null>(null)
  const [exito, setExito] = useState<string | null>(null)

  const editando = producto !== null
  const errores = intento ? validar(valores) : {}
  const cambiar = (campo: keyof Valores, valor: string) => setValores((v) => ({ ...v, [campo]: valor }))
  const propsError = (campo: Campo, id: string) => ({
    'aria-invalid': Boolean(errores[campo]),
    'aria-describedby': errores[campo] ? `${id}-error` : undefined,
  })

  // Al cambiar de grupo se deja un tipo de consumo válido para ese grupo
  function elegirGrupo(valor: string) {
    if (!esGrupoCatalogo(valor)) return
    setValores((v) => {
      const permitidos = TIPOS_POR_GRUPO[valor]
      return { ...v, grupo: valor, tipo: v.tipo && permitidos.includes(v.tipo) ? v.tipo : permitidos[0] }
    })
  }

  const tipo = valores.tipo
  const completo = Object.keys(validar(valores)).length === 0
  // Vista previa: se arma un producto con lo escrito y se calcula como lo haría un evento
  const vistaPrevia =
    completo && valores.grupo && tipo
      ? calcularProducto(
          {
            id: 0,
            nombre: valores.nombre,
            clasificacion: valores.grupo,
            tipo_calculo: tipo,
            porcion_por_persona: valores.porcion || '0',
            unidad_medida: tipo === 'porcion_persona' ? 'g' : tipo === 'unidad_persona' ? 'unidades' : 'botellas',
            volumen_botella_ml: valores.volumen || '0',
            tamano_porcion_ml: valores.tamano || '0',
            precio_unitario: valores.precio || '0',
            activo: true,
          },
          Number(valores.porcion || 0),
          ASISTENTES_VISTA_PREVIA,
        )
      : null

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setIntento(true)
    setErrorServidor(null)
    setExito(null)
    if (Object.keys(validar(valores)).length > 0 || !valores.grupo || !valores.tipo) return

    const datos: DatosProducto = {
      nombre: valores.nombre.trim(),
      clasificacion: valores.grupo,
      tipo_calculo: valores.tipo,
      precio_unitario: Number(valores.precio),
      ...(valores.tipo === 'botella_compartida'
        ? { volumen_botella_ml: Number(valores.volumen), tamano_porcion_ml: Number(valores.tamano) }
        : { porcion_por_persona: Number(valores.porcion) }),
    }

    setEnviando(true)
    try {
      const guardado = producto ? await catalogoService.actualizar(producto.id, datos) : await catalogoService.crear(datos)
      onGuardado(guardado, editando)
      if (!editando) {
        setExito(`«${guardado.nombre}» quedó en el catálogo y ya se puede usar en los eventos nuevos.`)
        setValores((v) => ({ ...valoresIniciales(null), grupo: v.grupo, tipo: v.tipo }))
        setIntento(false)
      }
    } catch (err) {
      setErrorServidor(err instanceof ApiError ? err.message : 'No fue posible guardar el producto. Intenta de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={guardar} noValidate className="flex flex-col gap-5">
      {errorServidor && <Alert variant="error">{errorServidor}</Alert>}
      {exito && <Alert variant="success">{exito}</Alert>}

      <FormField id="catalogo-nombre" label="Nombre del producto" error={errores.nombre}>
        <Input
          id="catalogo-nombre"
          value={valores.nombre}
          onChange={(e) => cambiar('nombre', e.target.value)}
          placeholder="Ej. Aguardiente Blanco del Valle 750 ml"
          maxLength={150}
          disabled={enviando}
          {...propsError('nombre', 'catalogo-nombre')}
        />
      </FormField>

      <FormField id="catalogo-grupo" label="Grupo" error={errores.grupo}>
        <Select
          id="catalogo-grupo"
          value={valores.grupo}
          onChange={(e) => elegirGrupo(e.target.value)}
          disabled={enviando}
          {...propsError('grupo', 'catalogo-grupo')}
        >
          <option value="" disabled>
            Selecciona un grupo
          </option>
          {GRUPOS_CATALOGO.map((g) => (
            <option key={g} value={g}>
              {CONFIG_GRUPO[g].etiqueta}
            </option>
          ))}
        </Select>
      </FormField>

      {valores.grupo && (
        <>
          <FormField id="catalogo-tipo" label="Cómo se consume">
            <Select
              id="catalogo-tipo"
              value={valores.tipo}
              onChange={(e) => cambiar('tipo', e.target.value)}
              disabled={enviando || TIPOS_POR_GRUPO[valores.grupo].length === 1}
            >
              {TIPOS_POR_GRUPO[valores.grupo].map((t) => (
                <option key={t} value={t}>
                  {ETIQUETA_TIPO[t]}
                </option>
              ))}
            </Select>
          </FormField>

          {tipo === 'botella_compartida' ? (
            <div className="grid gap-3.5 sm:grid-cols-2">
              <FormField id="catalogo-volumen" label="Botella (ml)" error={errores.volumen}>
                <Input
                  id="catalogo-volumen"
                  type="number"
                  min={0}
                  step="any"
                  inputMode="decimal"
                  value={valores.volumen}
                  onChange={(e) => cambiar('volumen', e.target.value)}
                  placeholder="750"
                  disabled={enviando}
                  {...propsError('volumen', 'catalogo-volumen')}
                />
              </FormField>
              <FormField id="catalogo-tamano" label="Porción (ml)" error={errores.tamano}>
                <Input
                  id="catalogo-tamano"
                  type="number"
                  min={0}
                  step="any"
                  inputMode="decimal"
                  value={valores.tamano}
                  onChange={(e) => cambiar('tamano', e.target.value)}
                  placeholder="50"
                  disabled={enviando}
                  {...propsError('tamano', 'catalogo-tamano')}
                />
              </FormField>
            </div>
          ) : (
            <FormField
              id="catalogo-porcion"
              label={tipo === 'porcion_persona' ? 'Gramos por persona' : 'Unidades por persona'}
              error={errores.porcion}
            >
              <Input
                id="catalogo-porcion"
                type="number"
                min={0}
                step="any"
                inputMode="decimal"
                value={valores.porcion}
                onChange={(e) => cambiar('porcion', e.target.value)}
                placeholder={tipo === 'porcion_persona' ? 'Ej. 200' : 'Ej. 2'}
                disabled={enviando}
                {...propsError('porcion', 'catalogo-porcion')}
              />
            </FormField>
          )}

          <FormField
            id="catalogo-precio"
            label={tipo ? ETIQUETA_PRECIO[tipo] : 'Precio'}
            error={errores.precio}
            hint={tipo === 'porcion_persona' ? 'Los alimentos se compran por kilo, por eso el precio es por kg.' : undefined}
          >
            <div className="relative">
              <span aria-hidden="true" className="pointer-events-none absolute top-3.5 left-3.5 text-sm text-muted-foreground">
                $
              </span>
              <Input
                id="catalogo-precio"
                type="number"
                min={0}
                step="any"
                inputMode="decimal"
                value={valores.precio}
                onChange={(e) => cambiar('precio', e.target.value)}
                placeholder="Ej. 60000"
                disabled={enviando}
                className="pl-8"
                {...propsError('precio', 'catalogo-precio')}
              />
            </div>
          </FormField>

          <div
            aria-live="polite"
            className="flex items-start gap-2.5 rounded-[10px] bg-accent px-3.5 py-3 text-[13px] font-semibold text-accent-foreground"
          >
            <Calculator aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {vistaPrevia
              ? `Con ${ASISTENTES_VISTA_PREVIA} asistentes: ${formatearNumero(vistaPrevia.conMargen)} ${vistaPrevia.unidad} (con margen del 10%) · ${formatearMoneda(vistaPrevia.costo)}`
              : `Completa los datos para ver cuánto se calcularía con ${ASISTENTES_VISTA_PREVIA} asistentes.`}
          </div>
        </>
      )}

      <div className="flex flex-col gap-2.5">
        <Button type="submit" size="lg" disabled={enviando}>
          {enviando ? (
            <LoaderCircle aria-hidden="true" className="animate-spin" />
          ) : editando ? (
            <Save aria-hidden="true" />
          ) : (
            <Plus aria-hidden="true" />
          )}
          {enviando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Crear producto'}
        </Button>
        {editando && (
          <Button variant="secondary" onClick={onCancelar} disabled={enviando}>
            <X aria-hidden="true" />
            Cancelar edición
          </Button>
        )}
      </div>
    </form>
  )
}
