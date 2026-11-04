/**
 * Listado de los meseros registrados (HU-26 · RF-33): nombre y datos de contacto.
 */
import { Mail, Phone, UserRound } from 'lucide-react'
import { Card } from '@/components/ui/card'
import type { Personal } from '@/types/personal'

interface ListaMeserosProps {
  meseros: Personal[]
  mensajeVacio: string
}

// Si el contacto trae un correo se ve con el ícono de correo; si no, con el de teléfono
const tieneCorreo = (contacto: string) => /[^\s@/]+@[^\s@/]+\.[^\s@/]{2,}/.test(contacto)

export function ListaMeseros({ meseros, mensajeVacio }: ListaMeserosProps) {
  if (meseros.length === 0) {
    return <Card className="px-[18px] py-8 text-center text-sm text-subtle">{mensajeVacio}</Card>
  }
  return (
    <ul aria-label="Meseros registrados" className="flex flex-col gap-2.5">
      {meseros.map((mesero) => {
        const Icono = tieneCorreo(mesero.contacto) ? Mail : Phone
        return (
          <li key={mesero.id}>
            <Card className="flex items-center gap-3.5 rounded-[14px] px-[18px] py-3.5">
              <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-accent text-accent-foreground">
                <UserRound className="size-5" />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-[14.5px] font-bold" title={mesero.nombre_completo}>
                  {mesero.nombre_completo}
                </span>
                <span className="flex min-w-0 items-center gap-1.5 text-[13px] text-muted-foreground">
                  <Icono aria-hidden="true" className="size-3.5 shrink-0" />
                  <span className="truncate" title={mesero.contacto}>
                    {mesero.contacto}
                  </span>
                </span>
              </div>
              <span className="rounded-full bg-chip px-2.5 py-1 text-[12.5px] font-bold text-subtle">Mesero</span>
            </Card>
          </li>
        )
      })}
    </ul>
  )
}
