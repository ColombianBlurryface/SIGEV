/**
 * HU-45 (RF-53, RN-09, RN-15, RN-19):
 * Muestra automáticamente las botellas consolidadas a comprar a partir de los cócteles
 * agregados al evento en Bar de Coctelería y el número de asistentes.
 */
import React, { useMemo } from 'react'
import { Wine } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { formatearNumero } from '@/lib/formato'
import { useComprasCoctelesPrevias } from '@/hooks/useComprasCoctelesPrevias'
import type { BebidaAgregada } from '@/types/registro'

interface Props {
  asistentes: number
  bebidas: BebidaAgregada[]
}

export const CalculadoraCocteles: React.FC<Props> = ({ asistentes, bebidas }) => {
  const items = useMemo(() => {
    return bebidas
      .filter((b) => b.producto.clasificacion === 'bar_cocteleria')
      .map((b) => ({
        producto_id: b.producto.id,
        porcion_por_persona: b.porcion,
      }))
  }, [bebidas])

  const { compras, calculando, error } = useComprasCoctelesPrevias(asistentes, items)

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex flex-col gap-1 border-b border-border pb-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Wine className="w-5 h-5 text-primary" />
            Botellas consolidadas a comprar
            {compras && compras.total_botellas > 0 && (
              <span className="text-xs font-normal text-muted-foreground">
                ({formatearNumero(compras.total_botellas)} {compras.total_botellas === 1 ? 'botella' : 'botellas'} en total)
              </span>
            )}
          </h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Calcula las botellas a comprar con margen del 10% y consolida licores comunes a partir de los cócteles seleccionados.
        </p>
      </div>

      {compras?.cocteles_sin_receta && compras.cocteles_sin_receta.length > 0 && (
        <Alert variant="warning">
          <strong>
            {compras.cocteles_sin_receta.length === 1 ? 'Este cóctel no tiene receta' : 'Estos cócteles no tienen receta'}
          </strong>
          : {compras.cocteles_sin_receta.map((p) => p.nombre).join(', ')}. No se calcularon sus licores; regístralos en Catálogo → Recetas de Cóctel.
        </Alert>
      )}

      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2 text-center">
          Aún no has agregado bebidas de bar de coctelería a este evento. Al agregarlas arriba, aquí verás las botellas consolidadas a comprar.
        </p>
      ) : calculando && !compras ? (
        <p className="text-xs text-muted-foreground py-2 text-center">
          Calculando botellas necesarias…
        </p>
      ) : error ? (
        <p className="text-xs text-destructive py-2 text-center">{error}</p>
      ) : compras && compras.items.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="py-2 font-semibold">Licor Requerido</th>
                <th className="py-2 font-semibold">Consumo Neto</th>
                <th className="py-2 font-semibold">+10% Margen (RN-09)</th>
                <th className="py-2 font-semibold">Presentación</th>
                <th className="py-2 text-right font-semibold">Botellas (RN-19)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-foreground">
              {compras.items.map((lic) => (
                <tr key={lic.licor_id}>
                  <td className="py-2.5 font-medium">
                    <div>{lic.nombre_licor}</div>
                    {lic.cocteles.length > 0 && (
                      <div className="text-[11px] text-muted-foreground">{lic.cocteles.join(' · ')}</div>
                    )}
                  </td>
                  <td className="py-2.5">{formatearNumero(lic.ml_netos)} ml</td>
                  <td className="py-2.5 text-muted-foreground">{formatearNumero(lic.ml_con_margen)} ml</td>
                  <td className="py-2.5">{formatearNumero(lic.volumen_botella_ml)} ml</td>
                  <td className="py-2.5 text-right font-bold text-primary text-sm">
                    {formatearNumero(lic.botellas_requeridas)} {lic.botellas_requeridas === 1 ? 'botella' : 'botellas'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground py-2 text-center">
          Las bebidas agregadas no requieren botellas adicionales de licor.
        </p>
      )}
    </div>
  )
}
