/**
 * Estados posibles de un evento con su nombre visible y sus colores.
 */
import type { EstadoEvento } from '@/types/evento'

interface ConfigEstado {
  etiqueta: string
  clases: string
  punto: string
}

export const ESTADOS_EVENTO: Record<EstadoEvento, ConfigEstado> = {
  planificacion: { etiqueta: 'Planificación', clases: 'bg-accent text-accent-foreground', punto: 'bg-accent-foreground' },
  confirmado: { etiqueta: 'Confirmado', clases: 'bg-success-soft text-success-foreground', punto: 'bg-success-foreground' },
  realizado: { etiqueta: 'Realizado', clases: 'bg-chip text-subtle', punto: 'bg-subtle' },
  cancelado: { etiqueta: 'Cancelado', clases: 'bg-destructive-soft text-destructive-foreground', punto: 'bg-destructive-foreground' },
}

export const ORDEN_ESTADOS: EstadoEvento[] = ['planificacion', 'confirmado', 'realizado', 'cancelado']
