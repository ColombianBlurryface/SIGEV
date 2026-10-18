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
  // Unidades de mobiliario pedidas en total (0 = el evento todavía no tiene mobiliario)
  unidadesPedidas: number
  className?: string
}

/**
 * Aviso de alquiler (RN-03). Tiene tres casos, cada uno con su propio mensaje:
 * - Falta inventario (en cualquier evento): «Hay que alquilar N unidades…», en amarillo.
 * - Evento grande (más asistentes que el umbral) sin faltante: aviso informativo. Si todavía no tiene
 *   mobiliario, pide revisarlo; si lo tiene, dice que el inventario propio lo cubre.
 * - Evento pequeño sin faltante: no se muestra nada.
 */
export function AvisoAlquiler({ superaUmbral, umbral, unidadesAlquilar, unidadesPedidas, className }: AvisoAlquilerProps) {
  if (!superaUmbral && unidadesAlquilar === 0) return null

  if (unidadesAlquilar > 0) {
    return (
      <Alert variant="warning" className={className}>
        <strong>
          Hay que alquilar {formatearNumero(unidadesAlquilar)} {unidadesAlquilar === 1 ? 'unidad' : 'unidades'} de mobiliario.
        </strong>{' '}
        El inventario propio no alcanza para este evento.
        {superaUmbral && ` Además, tiene más de ${formatearNumero(umbral)} asistentes.`}
      </Alert>
    )
  }

  return (
    <Alert variant="info" className={className}>
      <strong>Evento de más de {formatearNumero(umbral)} asistentes.</strong>{' '}
      {unidadesPedidas === 0
        ? 'Todavía no tiene mobiliario: con tantas personas conviene revisar si hay que alquilar.'
        : 'El inventario propio cubre el mobiliario pedido, así que por ahora no hay nada que alquilar.'}
    </Alert>
  )
}
