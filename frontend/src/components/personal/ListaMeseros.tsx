/**
 * Listado de los meseros registrados (HU-26 · RF-33) con la opción de eliminar (HU-27 · RF-34): nombre, datos de
 * contacto y un botón «Eliminar» que pide confirmación en la misma fila. No hay «editar»: los datos de un mesero no
 * se modifican; si hubo un error, se elimina y se registra de nuevo.
 */
import { LoaderCircle, Mail, Phone, Trash2, UserRound } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { Personal } from '@/types/personal'

interface ListaMeserosProps {
  meseros: Personal[]
  mensajeVacio: string
  // Id del mesero que se está eliminando (mientras espera al servidor)
  eliminandoId: number | null
  onEliminar: (mesero: Personal) => void
}

// Si el contacto trae un correo se ve con el ícono de correo; si no, con el de teléfono
const tieneCorreo = (contacto: string) => /[^\s@/]+@[^\s@/]+\.[^\s@/]{2,}/.test(contacto)

export function ListaMeseros({ meseros, mensajeVacio, eliminandoId, onEliminar }: ListaMeserosProps) {
  // Mesero al que se le pidió confirmar la eliminación (solo uno a la vez)
  const [confirmandoId, setConfirmandoId] = useState<number | null>(null)

  if (meseros.length === 0) {
    return <Card className="px-[18px] py-8 text-center text-sm text-subtle">{mensajeVacio}</Card>
  }
  return (
    <ul aria-label="Meseros registrados" className="flex flex-col gap-2.5">
      {meseros.map((mesero) => {
        const Icono = tieneCorreo(mesero.contacto) ? Mail : Phone
        const confirmando = confirmandoId === mesero.id
        const eliminando = eliminandoId === mesero.id
        return (
          <li key={mesero.id}>
            <Card className="flex flex-col gap-3 rounded-[14px] px-[18px] py-3.5">
              <div className="flex items-center gap-3.5">
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
                <span className="hidden rounded-full bg-chip px-2.5 py-1 text-[12.5px] font-bold text-subtle sm:inline">Mesero</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-9 text-muted-foreground"
                  disabled={eliminando}
                  onClick={() => setConfirmandoId(confirmando ? null : mesero.id)}
                  aria-label={`Eliminar a ${mesero.nombre_completo}`}
                  aria-expanded={confirmando}
                >
                  {eliminando ? <LoaderCircle aria-hidden="true" className="!size-4 animate-spin" /> : <Trash2 className="!size-4" />}
                </Button>
              </div>

              {confirmando && (
                <div role="group" aria-label={`Confirmar la eliminación de ${mesero.nombre_completo}`} className="flex flex-col gap-3 rounded-[10px] bg-destructive-soft px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[13px] leading-snug text-destructive-foreground">
                    <strong>¿Eliminar a {mesero.nombre_completo}?</strong> Dejará de aparecer en el listado. Si te equivocaste al registrarlo, elimínalo y regístralo de nuevo.
                  </p>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setConfirmandoId(null)
                        onEliminar(mesero)
                      }}
                    >
                      Sí, eliminar
                    </Button>
                    <Button type="button" variant="secondary" size="sm" onClick={() => setConfirmandoId(null)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </li>
        )
      })}
    </ul>
  )
}
