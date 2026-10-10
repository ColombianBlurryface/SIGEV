/**
 * Tarjeta de "Vista previa" del paso 1 del registro: muestra en vivo lo que se va escribiendo.
 */
import { Card } from '@/components/ui/card'
import { formatearFecha } from '@/lib/formato'
import { validarAsistentes, type ValoresEvento } from '@/lib/reglasEvento'

export function VistaPreviaEvento({ valores }: { valores: ValoresEvento }) {
  const asistentes = validarAsistentes(valores.asistentes)
  const valido = asistentes.estado === 'valido'
  const modalidad = valido ? (asistentes.esBuffet ? 'Buffet' : 'Servida a la mesa') : '—'

  const filas = [
    { etiqueta: 'Tipo', valor: valores.tipo || '—' },
    { etiqueta: 'Fecha', valor: formatearFecha(valores.fecha) },
    { etiqueta: 'Duración', valor: valores.duracion ? `${valores.duracion} h` : '—' },
    { etiqueta: 'Asistentes', valor: asistentes.cantidad ?? '—' },
    { etiqueta: 'Modalidad', valor: modalidad },
  ]

  return (
    <Card className="flex flex-col gap-4 p-6">
      <span className="text-xs font-bold tracking-[0.04em] text-muted-foreground uppercase">Vista previa</span>
      <span className="font-display text-[22px] leading-tight font-bold break-words">
        {valores.nombre.trim() || 'Evento sin nombre'}
      </span>
      <dl className="flex flex-col gap-2.5 text-sm">
        {filas.map(({ etiqueta, valor }) => (
          <div key={etiqueta} className="flex justify-between gap-4">
            <dt className="text-muted-foreground">{etiqueta}</dt>
            <dd className="text-right font-semibold">{valor}</dd>
          </div>
        ))}
      </dl>
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="text-muted-foreground">Estado inicial</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-[13px] font-bold text-accent-foreground">
          <span className="size-1.5 rounded-full bg-accent-foreground" />
          Planificación
        </span>
      </div>
    </Card>
  )
}
