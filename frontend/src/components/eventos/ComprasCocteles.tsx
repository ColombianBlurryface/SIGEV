/**
 * Lista de botellas de licor a comprar para la coctelería de un evento (HU-45 · RF-53, RN-09, RN-15, RN-19):
 * botellas requeridas por cada licor, con el 10% de margen y redondeado hacia arriba, consolidando licores comunes.
 * Se usa en el detalle del evento y en el resumen del registro (Paso 3).
 */
import { Wine } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { formatearMoneda, formatearNumero } from '@/lib/formato'
import type { ComprasCocteles as Compras } from '@/types/evento'

interface Props {
  compras: Compras
  sinCocteles?: string
}

export function ComprasCocteles({
  compras,
  sinCocteles = 'Este evento no tiene bar de coctelería, así que no hay botellas de licor que calcular.',
}: Props) {
  const hayCocteles = compras.cocteles_con_receta + compras.cocteles_sin_receta.length > 0

  return (
    <section aria-label="Botellas a comprar para coctelería" className="flex flex-col gap-3">
      <div className="flex items-start gap-2">
        <span
          aria-hidden="true"
          className="flex size-[26px] shrink-0 items-center justify-center rounded-[7px] bg-bebidas-soft text-bebidas"
        >
          <Wine className="size-[15px]" />
        </span>
        <div className="flex min-w-0 flex-col">
          <div className="flex items-center gap-2">
            <span className="text-[13.5px] font-bold">Botellas a comprar para coctelería</span>
            {compras.total_botellas > 0 && (
              <span className="rounded-full bg-chip px-2 py-0.5 text-xs font-bold text-subtle">
                {compras.total_botellas} {compras.total_botellas === 1 ? 'botella' : 'botellas'}
              </span>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            Para {formatearNumero(compras.asistentes)} asistentes, con margen del {compras.margen_porcentaje}% y consolidación de licores.
          </span>
        </div>
      </div>

      {compras.cocteles_sin_receta.length > 0 && (
        <Alert variant="warning">
          <strong>
            {compras.cocteles_sin_receta.length === 1 ? 'Este cóctel no tiene receta' : 'Estos cócteles no tienen receta'}
          </strong>
          : {compras.cocteles_sin_receta.map((p) => p.nombre).join(', ')}. No se calcularon sus licores; regístralos en Catálogo → Recetas de Cóctel.
        </Alert>
      )}

      {compras.items.length === 0 ? (
        !hayCocteles && <p className="rounded-[10px] bg-background px-3 py-3 text-[13.5px] text-subtle">{sinCocteles}</p>
      ) : (
        <ul aria-label="Lista de botellas de coctelería a comprar" className="flex flex-col gap-1.5">
          {compras.items.map((item) => (
            <li key={item.licor_id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 text-[13px]">
              <span className="min-w-0 truncate font-semibold" title={item.nombre_licor}>
                {item.nombre_licor}
              </span>
              <span className="text-right font-bold whitespace-nowrap text-primary">
                {formatearNumero(item.botellas_requeridas)} {item.botellas_requeridas === 1 ? 'botella' : 'botellas'}
              </span>
              <span className="min-w-0 text-xs leading-snug text-muted-foreground">
                {item.cocteles.join(' · ')}
              </span>
              <span className="text-right text-xs whitespace-nowrap text-muted-foreground">
                {formatearNumero(item.ml_con_margen)} ml con margen ({formatearNumero(item.volumen_botella_ml)} ml/bot)
                {item.costo_estimado > 0 && ` · ${formatearMoneda(item.costo_estimado)}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
