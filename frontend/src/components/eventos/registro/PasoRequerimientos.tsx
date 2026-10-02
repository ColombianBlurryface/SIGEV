/**
 * Paso 2 del registro de eventos: pestañas para agregar alimentos (HU-02), bebidas (HU-03),
 * mobiliario (HU-04, relacionado con el inventario en HU-12) y servicios adicionales (HU-05),
 * con un resumen lateral de costos.
 */
import { useState } from 'react'
import { CATEGORIAS, type Categoria } from '@/lib/categorias'
import { cn } from '@/lib/utils'
import type {
  AlimentoAgregado,
  BebidaAgregada,
  MobiliarioAgregado,
  RequerimientosEvento,
  ServicioAgregado,
} from '@/types/registro'
import { PestanaAlimentos } from './PestanaAlimentos'
import { PestanaBebidas } from './PestanaBebidas'
import { PestanaMobiliario } from './PestanaMobiliario'
import { PestanaServicios } from './PestanaServicios'
import { ResumenRequerimientos } from './ResumenRequerimientos'

const PESTANAS: Categoria[] = ['alimentos', 'bebidas', 'mobiliario', 'servicios']

const LINEA_ACTIVA: Record<Categoria, string> = {
  alimentos: 'border-alimentos',
  bebidas: 'border-bebidas',
  mobiliario: 'border-mobiliario',
  servicios: 'border-servicios',
}

interface PasoRequerimientosProps {
  asistentes: number
  requerimientos: RequerimientosEvento
  onCambio: (requerimientos: RequerimientosEvento) => void
}

export function PasoRequerimientos({ asistentes, requerimientos, onCambio }: PasoRequerimientosProps) {
  const [activa, setActiva] = useState<Categoria>('alimentos')
  const conteo: Record<Categoria, number> = {
    alimentos: requerimientos.alimentos.length,
    bebidas: requerimientos.bebidas.length,
    mobiliario: requerimientos.mobiliario.length,
    servicios: requerimientos.servicios.length,
  }

  const agregarAlimento = (alimento: AlimentoAgregado) =>
    onCambio({ ...requerimientos, alimentos: [...requerimientos.alimentos, alimento] })
  const quitarAlimento = (productoId: number) =>
    onCambio({ ...requerimientos, alimentos: requerimientos.alimentos.filter((a) => a.producto.id !== productoId) })
  const agregarBebida = (bebida: BebidaAgregada) => onCambio({ ...requerimientos, bebidas: [...requerimientos.bebidas, bebida] })
  const quitarBebida = (productoId: number) =>
    onCambio({ ...requerimientos, bebidas: requerimientos.bebidas.filter((b) => b.producto.id !== productoId) })
  // Un mismo elemento del inventario no se repite: si ya está, se suma la cantidad a la línea existente
  const agregarMobiliario = (item: MobiliarioAgregado) => {
    const existente = item.productoId !== null && requerimientos.mobiliario.find((m) => m.productoId === item.productoId)
    const mobiliario = existente
      ? requerimientos.mobiliario.map((m) =>
          m === existente ? { ...m, cantidad: m.cantidad + item.cantidad, referencia: item.referencia || m.referencia } : m,
        )
      : [...requerimientos.mobiliario, item]
    onCambio({ ...requerimientos, mobiliario })
  }
  const quitarMobiliario = (id: string) =>
    onCambio({ ...requerimientos, mobiliario: requerimientos.mobiliario.filter((m) => m.id !== id) })
  const agregarServicio = (servicio: ServicioAgregado) =>
    onCambio({ ...requerimientos, servicios: [...requerimientos.servicios, servicio] })
  const quitarServicio = (id: string) =>
    onCambio({ ...requerimientos, servicios: requerimientos.servicios.filter((s) => s.id !== id) })

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex min-w-0 flex-col gap-4">
        <div role="tablist" aria-label="Tipo de requerimiento" className="flex flex-wrap gap-1 border-b border-border">
          {PESTANAS.map((categoria) => {
            const { etiqueta, icono: Icono, clases } = CATEGORIAS[categoria]
            const seleccionada = categoria === activa
            return (
              <button
                key={categoria}
                type="button"
                role="tab"
                id={`pestana-${categoria}`}
                aria-selected={seleccionada}
                aria-controls={`panel-${categoria}`}
                onClick={() => setActiva(categoria)}
                className={cn(
                  '-mb-px flex h-[54px] cursor-pointer items-center gap-2.5 border-b-[3px] px-3.5 text-[15px] font-bold outline-none focus-visible:ring-[3px] focus-visible:ring-ring',
                  seleccionada ? cn('text-foreground', LINEA_ACTIVA[categoria]) : 'border-transparent text-subtle',
                )}
              >
                <span aria-hidden="true" className={cn('flex size-7 items-center justify-center rounded-lg', clases)}>
                  <Icono className="size-4" />
                </span>
                {etiqueta}
                <span className="flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-chip px-1.5 text-xs text-subtle">
                  {conteo[categoria]}
                </span>
              </button>
            )
          })}
        </div>

        <div role="tabpanel" id={`panel-${activa}`} aria-labelledby={`pestana-${activa}`}>
          {activa === 'alimentos' && (
            <PestanaAlimentos
              asistentes={asistentes}
              alimentos={requerimientos.alimentos}
              onAgregar={agregarAlimento}
              onQuitar={quitarAlimento}
            />
          )}
          {activa === 'bebidas' && (
            <PestanaBebidas
              asistentes={asistentes}
              bebidas={requerimientos.bebidas}
              onAgregar={agregarBebida}
              onQuitar={quitarBebida}
            />
          )}
          {activa === 'mobiliario' && (
            <PestanaMobiliario
              asistentes={asistentes}
              mobiliario={requerimientos.mobiliario}
              onAgregar={agregarMobiliario}
              onQuitar={quitarMobiliario}
            />
          )}
          {activa === 'servicios' && (
            <PestanaServicios servicios={requerimientos.servicios} onAgregar={agregarServicio} onQuitar={quitarServicio} />
          )}
        </div>
      </div>

      <div className="xl:sticky xl:top-0">
        <ResumenRequerimientos requerimientos={requerimientos} asistentes={asistentes} />
      </div>
    </div>
  )
}
