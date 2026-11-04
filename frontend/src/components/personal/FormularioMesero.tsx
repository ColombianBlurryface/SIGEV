/**
 * Formulario para registrar un mesero (HU-26 · RF-33): nombre completo y datos de contacto. Los errores se avisan
 * junto al campo mientras se escribe; el servidor vuelve a revisar todo.
 */
import { LoaderCircle, UserPlus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { CONTACTO_MAX, errorContacto, errorNombre, limpiarEspacios, NOMBRE_MAX } from '@/lib/reglasRegistroPersonal'
import { ApiError } from '@/services/api'
import { personalService } from '@/services/personalService'
import type { Personal } from '@/types/personal'

interface FormularioMeseroProps {
  onRegistrado: (mesero: Personal) => void
}

export function FormularioMesero({ onRegistrado }: FormularioMeseroProps) {
  const [nombre, setNombre] = useState('')
  const [contacto, setContacto] = useState('')
  const [intento, setIntento] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [errorServidor, setErrorServidor] = useState<string | null>(null)
  const [exito, setExito] = useState<string | null>(null)

  const errores = { nombre: errorNombre(nombre, intento), contacto: errorContacto(contacto, intento) }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (enviando) return
    setIntento(true)
    setExito(null)
    setErrorServidor(null)
    if (errorNombre(nombre) || errorContacto(contacto)) return
    setEnviando(true)
    try {
      const mesero = await personalService.crear({ nombre_completo: limpiarEspacios(nombre), contacto: limpiarEspacios(contacto), rol: 'mesero' })
      setNombre('')
      setContacto('')
      setIntento(false)
      setExito(`«${mesero.nombre_completo}» quedó registrado como mesero.`)
      onRegistrado(mesero)
    } catch (err) {
      setErrorServidor(err instanceof ApiError ? err.message : 'No fue posible registrar al mesero.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={enviar} noValidate className="flex flex-col gap-5">
      <FormField id="mesero-nombre" label="Nombre completo" error={errores.nombre}>
        <Input
          id="mesero-nombre"
          value={nombre}
          maxLength={NOMBRE_MAX}
          placeholder="Ej. Carlos Rodríguez"
          disabled={enviando}
          onChange={(e) => {
            setNombre(e.target.value)
            setExito(null)
            setErrorServidor(null)
          }}
          aria-invalid={Boolean(errores.nombre)}
        />
      </FormField>

      <FormField
        id="mesero-contacto"
        label="Datos de contacto"
        error={errores.contacto}
        hint="Un teléfono, un correo o ambos. Ej. 3001234567 o carlos.r@email.com"
      >
        <Input
          id="mesero-contacto"
          value={contacto}
          maxLength={CONTACTO_MAX}
          placeholder="Ej. 300 123 4567"
          disabled={enviando}
          onChange={(e) => {
            setContacto(e.target.value)
            setExito(null)
            setErrorServidor(null)
          }}
          aria-invalid={Boolean(errores.contacto)}
        />
      </FormField>

      {errorServidor && <Alert variant="error">{errorServidor}</Alert>}
      {exito && <Alert variant="success">{exito}</Alert>}

      <Button type="submit" size="lg" disabled={enviando}>
        {enviando ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <UserPlus aria-hidden="true" />}
        Registrar mesero
      </Button>
    </form>
  )
}
