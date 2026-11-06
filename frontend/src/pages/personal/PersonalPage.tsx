/**
 * Página de Personal (HU-26 · RF-33 y HU-27 · RF-34): a la izquierda el formulario para registrar un mesero (nombre y
 * datos de contacto) y a la derecha el listado de los meseros registrados, con buscador y la opción de eliminar.
 * No hay «editar»: si hubo un error al registrar a alguien, se elimina y se vuelve a registrar.
 */
import { RotateCw, Search } from 'lucide-react'
import { useState } from 'react'
import { FormularioMesero } from '@/components/personal/FormularioMesero'
import { ListaMeseros } from '@/components/personal/ListaMeseros'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { usePersonal } from '@/hooks/usePersonal'
import { normalizar } from '@/lib/formato'
import { ApiError } from '@/services/api'
import { personalService } from '@/services/personalService'
import type { Personal } from '@/types/personal'

export function PersonalPage() {
  const { personal, cargando, error, recargar } = usePersonal()
  const [busqueda, setBusqueda] = useState('')
  const [eliminandoId, setEliminandoId] = useState<number | null>(null)
  const [aviso, setAviso] = useState<{ tipo: 'success' | 'error' | 'info'; texto: string } | null>(null)
  const termino = normalizar(busqueda.trim())
  const visibles = personal.filter((p) => termino === '' || normalizar(`${p.nombre_completo} ${p.contacto}`).includes(termino))

  async function eliminar(mesero: Personal) {
    setEliminandoId(mesero.id)
    setAviso(null)
    try {
      await personalService.eliminar(mesero.id)
      setAviso({ tipo: 'success', texto: `«${mesero.nombre_completo}» fue eliminado y ya no aparece en el listado.` })
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        // Alguien más ya lo eliminó: se actualiza el listado y se explica
        setAviso({ tipo: 'info', texto: `«${mesero.nombre_completo}» ya no existe o ya había sido eliminado.` })
      } else {
        setAviso({ tipo: 'error', texto: err instanceof ApiError ? err.message : 'No fue posible eliminar al mesero.' })
      }
    } finally {
      setEliminandoId(null)
      recargar()
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1.5">
        <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Personal</h1>
        <p className="text-[15px] text-subtle">
          {cargando
            ? 'Cargando el personal…'
            : `${personal.length} ${personal.length === 1 ? 'mesero registrado' : 'meseros registrados'}. Es el personal que se podrá asignar a los eventos.`}
        </p>
      </header>

      <div className="grid items-start gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="flex flex-col gap-5 p-6 xl:sticky xl:top-0">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-bold">Registrar mesero</h2>
            <p className="text-[13.5px] text-subtle">Agrega un mesero con su nombre completo y cómo contactarlo.</p>
          </div>
          <FormularioMesero
            onRegistrado={() => {
              setAviso(null)
              recargar()
            }}
          />
        </Card>

        <div className="flex min-w-0 flex-col gap-4">
          <div className="relative">
            <label htmlFor="buscar-personal" className="sr-only">
              Buscar mesero
            </label>
            <Search aria-hidden="true" className="pointer-events-none absolute top-3 left-3.5 size-[18px] text-muted-foreground" />
            <Input
              id="buscar-personal"
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre o contacto"
              className="h-11 pl-10 text-[14.5px]"
            />
          </div>

          {aviso && <Alert variant={aviso.tipo}>{aviso.texto}</Alert>}

          {error && (
            <div className="flex flex-col items-start gap-3">
              <Alert variant="error">{error}</Alert>
              <Button variant="secondary" onClick={recargar}>
                <RotateCw aria-hidden="true" />
                Reintentar
              </Button>
            </div>
          )}

          {cargando ? (
            <Card className="flex flex-col gap-3 p-5">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </Card>
          ) : (
            !error && (
              <ListaMeseros
                meseros={visibles}
                mensajeVacio={personal.length === 0 ? 'Todavía no hay meseros registrados.' : 'Ningún mesero coincide con la búsqueda.'}
                eliminandoId={eliminandoId}
                onEliminar={eliminar}
              />
            )
          )}
        </div>
      </div>
    </div>
  )
}
