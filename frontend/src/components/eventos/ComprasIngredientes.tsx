/**
 * Lista de ingredientes a comprar de un evento (HU-47 · RF-55, RN-09, RN-20): cuánto de cada ingrediente, en la unidad
 * en que se compra, con el 10 % de margen y redondeado hacia arriba. Si varios platos usan el mismo ingrediente se
 * muestra un solo total. Se usa en el detalle del evento y en el resumen del registro.
 */
import { ShoppingBasket } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { formatearNumero } from '@/lib/formato'
import { unidadConCantidad } from '@/lib/reglasReceta'
import type { ComprasIngredientes as Compras } from '@/types/evento'

interface Props {
  compras: Compras
  // Cuando el evento todavía no tiene platos se explica distinto (antes de guardar vs. ya guardado)
  sinPlatos?: string
}

export function ComprasIngredientes({ compras, sinPlatos = 'Este evento no tiene alimentos, así que no hay ingredientes que calcular.' }: Props) {
  const hayPlatos = compras.platos_con_receta + compras.platos_sin_receta.length > 0
  return (
    <section aria-label="Ingredientes a comprar" className="flex flex-col gap-3">
      <div className="flex items-start gap-2">
        <span aria-hidden="true" className="flex size-[26px] shrink-0 items-center justify-center rounded-[7px] bg-success-soft text-success-foreground">
          <ShoppingBasket className="size-[15px]" />
        </span>
        <div className="flex min-w-0 flex-col">
          <span className="text-[13.5px] font-bold">Ingredientes a comprar</span>
          <span className="text-xs text-muted-foreground">
            Para {formatearNumero(compras.asistentes)} asistentes, con {compras.margen_porcentaje} % de margen, en la unidad de compra y redondeado hacia arriba.
          </span>
        </div>
      </div>

      {compras.platos_sin_receta.length > 0 && (
        <Alert variant="warning">
          <strong>
            {compras.platos_sin_receta.length === 1 ? 'Este plato no tiene receta' : 'Estos platos no tienen receta'}
          </strong>
          : {compras.platos_sin_receta.map((p) => p.nombre).join(', ')}. No se calcularon sus ingredientes; regístralos en Catálogo → Recetas de Platos.
        </Alert>
      )}

      {compras.items.length === 0 ? (
        !hayPlatos && <p className="rounded-[10px] bg-background px-3 py-3 text-[13.5px] text-subtle">{sinPlatos}</p>
      ) : (
        <ul aria-label="Lista de ingredientes a comprar" className="flex flex-col gap-1.5">
          {compras.items.map((item) => (
            <li key={item.ingrediente_id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 text-[13px]">
              <span className="min-w-0 truncate font-semibold" title={item.ingrediente}>
                {item.ingrediente}
              </span>
              <span className="text-right font-bold whitespace-nowrap" data-ingrediente={item.ingrediente}>
                {unidadConCantidad(item.cantidad_a_comprar, item.unidad_compra)}
              </span>
              <span className="min-w-0 text-xs leading-snug text-muted-foreground">
                {item.platos.join(' · ')}
              </span>
              <span className="text-right text-xs whitespace-nowrap text-muted-foreground">
                {formatearNumero(item.gramos_con_margen)} g con margen
                {Number.isInteger(item.cantidad_exacta) ? '' : ` · ${formatearNumero(item.cantidad_exacta)} exactos`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
