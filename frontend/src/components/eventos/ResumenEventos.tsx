import { Card } from '@/components/ui/card'
import { formatearFechaCorta, formatearNumero, hoyIso } from '@/lib/formato'
import type { EventoListado } from '@/types/evento'

export function ResumenEventos({ eventos }: { eventos: EventoListado[] }) {
  const hoy = hoyIso()
  const proximo = eventos.find((e) => e.estado !== 'cancelado' && e.fecha_evento.slice(0, 10) >= hoy)
  const enPlanificacion = eventos.filter((e) => e.estado === 'planificacion')
  const confirmados = eventos.filter((e) => e.estado === 'confirmado')
  const sumarAsistentes = (lista: EventoListado[]) => formatearNumero(lista.reduce((total, e) => total + e.asistentes, 0))

  const tarjetas = [
    {
      titulo: 'Próximo evento',
      valor: proximo ? formatearFechaCorta(proximo.fecha_evento) : 'Sin eventos',
      detalle: proximo ? proximo.nombre_evento : 'No hay eventos próximos',
    },
    {
      titulo: 'En planificación',
      valor: `${enPlanificacion.length} ${enPlanificacion.length === 1 ? 'evento' : 'eventos'}`,
      detalle: `${sumarAsistentes(enPlanificacion)} asistentes en total`,
    },
    {
      titulo: 'Confirmados',
      valor: `${confirmados.length} ${confirmados.length === 1 ? 'evento' : 'eventos'}`,
      detalle: `${sumarAsistentes(confirmados)} asistentes en total`,
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {tarjetas.map(({ titulo, valor, detalle }) => (
        <Card key={titulo} className="flex min-w-0 flex-col gap-1.5 rounded-[14px] px-[18px] py-4">
          <span className="text-[12.5px] font-semibold text-muted-foreground">{titulo}</span>
          <span className="font-display text-2xl font-bold">{valor}</span>
          <span className="truncate text-[13px] text-subtle">{detalle}</span>
        </Card>
      ))}
    </div>
  )
}
