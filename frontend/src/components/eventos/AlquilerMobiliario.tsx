/**
 * Piezas visuales de la HU-12: la etiqueta que indica si un elemento de mobiliario es propio
 * o alquilado, y el aviso de alquiler que aparece en el registro y en el detalle del evento.
 */
import { Alert } from '@/components/ui/alert'
import { origenMobiliario, type OrigenMobiliario, type RepartoMobiliario } from '@/lib/alquiler'
import { formatearNumero } from '@/lib/formato'
import { cn } from '@/lib/utils'

const ESTILO_ORIGEN: Record<OrigenMobiliario, { etiqueta: string; clases: string }> = {
  propio: { etiqueta: 'Propio', clases: 'bg-success-soft text-success-foreground' },
  mixto: { etiqueta: 'Propio + alquiler', clases: 'bg-warning-soft text-warning-foreground' },
  alquiler: { etiqueta: 'Alquiler', clases: 'bg-warning-soft text-warning-foreground' },
}

export function OrigenBadge({ reparto, className }: { reparto: RepartoMobiliario; className?: string }) {
  const { etiqueta, clases } = ESTILO_ORIGEN[origenMobiliario(reparto)]
  return (
    <span className={cn('inline-flex w-fit items-center rounded-md px-2 py-0.5 text-[11.5px] font-bold whitespace-nowrap', clases, className)}>
      {etiqueta}
    </span>
  )
}

interface AvisoAlquilerProps {
  // true si los asistentes superan el umbral (RN-03); el umbral viene del backend (P-05)
  superaUmbral: boolean
  umbral: number
  unidadesAlquilar: number
  className?: string
}

/**
 * Aviso de alquiler (RN-03): sale siempre que el evento supera el umbral de asistentes (200 por
 * defecto) y, aunque no lo supere, cuando el inventario propio no alcanza para el mobiliario pedido.
 */
export function AvisoAlquiler({ superaUmbral, umbral, unidadesAlquilar, className }: AvisoAlquilerProps) {
  if (!superaUmbral && unidadesAlquilar === 0) return null

  const faltante =
    unidadesAlquilar > 0
      ? `Hay que alquilar ${formatearNumero(unidadesAlquilar)} ${unidadesAlquilar === 1 ? 'unidad' : 'unidades'} de mobiliario (no hay stock propio suficiente).`
      : 'Con el mobiliario agregado hasta ahora el inventario propio alcanza.'

  return (
    <Alert variant="warning" className={className}>
      {superaUmbral ? (
        <>
          <strong>Evento de más de {umbral} asistentes:</strong> es probable que se necesite alquilar
          mobiliario (RN-03). {faltante}
        </>
      ) : (
        <>
          <strong>El inventario no alcanza.</strong> {faltante}
        </>
      )}
    </Alert>
  )
}
