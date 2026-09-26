import { useState } from 'react'
import { CATEGORIAS, type Categoria } from '@/lib/categorias'
import { cn } from '@/lib/utils'
import type { AlimentoAgregado, BebidaAgregada, MobiliarioAgregado, RequerimientosEvento } from '@/types/registro'
import { PestanaAlimentos } from './PestanaAlimentos'
import { PestanaBebidas } from './PestanaBebidas'
import { PestanaMobiliario } from './PestanaMobiliario'
import { ResumenRequerimientos } from './ResumenRequerimientos'

const PESTANAS: { categoria: Categoria; disponible: boolean }[] = [
  { categoria: 'alimentos', disponible: true },
  { categoria: 'bebidas', disponible: true },
  { categoria: 'mobiliario', disponible: true },
  { categoria: 'servicios', disponible: false },
]

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
    servicios: 0,
  }

  const agregarAlimento = (alimento: AlimentoAgregado) =>
    onCambio({ ...requerimientos, alimentos: [...requerimientos.alimentos, alimento] })
  const quitarAlimento = (productoId: number) =>
    onCambio({ ...requerimientos, alimentos: requerimientos.alimentos.filter((a) => a.producto.id !== productoId) })
  const agregarBebida = (bebida: BebidaAgregada) => onCambio({ ...requerimientos, bebidas: [...requerimientos.bebidas, bebida] })
  const quitarBebida = (productoId: number) =>
    onCambio({ ...requerimientos, bebidas: requerimientos.bebidas.filter((b) => b.producto.id !== productoId) })
  const agregarMobiliario = (item: MobiliarioAgregado) =>
    onCambio({ ...requerimientos, mobiliario: [...requerimientos.mobiliario, item] })
  const quitarMobiliario = (id: string) =>
    onCambio({ ...requerimientos, mobiliario: requerimientos.mobiliario.filter((m) => m.id !== id) })

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex min-w-0 flex-col gap-4">
        <div role="tablist" aria-label="Tipo de requerimiento" className="flex flex-wrap gap-1 border-b border-border">
          {PESTANAS.map(({ categoria, disponible }) => {
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
                disabled={!disponible}
                onClick={() => setActiva(categoria)}
                className={cn(
                  '-mb-px flex h-[54px] cursor-pointer items-center gap-2.5 border-b-[3px] px-3.5 text-[15px] font-bold outline-none focus-visible:ring-[3px] focus-visible:ring-ring disabled:cursor-not-allowed',
                  seleccionada ? cn('text-foreground', LINEA_ACTIVA[categoria]) : 'border-transparent text-subtle',
                  !disponible && 'opacity-60',
                )}
              >
                <span aria-hidden="true" className={cn('flex size-7 items-center justify-center rounded-lg', clases)}>
                  <Icono className="size-4" />
                </span>
                {etiqueta}
                {disponible ? (
                  <span className="flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-chip px-1.5 text-xs text-subtle">
                    {conteo[categoria]}
                  </span>
                ) : (
                  <span className="rounded-full bg-chip px-1.5 py-0.5 text-[10.5px] text-subtle">Pronto</span>
                )}
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
        </div>
      </div>

      <div className="xl:sticky xl:top-0">
        <ResumenRequerimientos requerimientos={requerimientos} asistentes={asistentes} />
      </div>
    </div>
  )
}
