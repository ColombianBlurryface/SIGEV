/**
 * Campo de la hora de inicio del evento (HU-52 · RF-59): un texto con un ejemplo en gris («7:30 p. m.») y, al lado, la elección
 * a. m. o p. m. Reemplaza al campo de hora del navegador, que se veía como «--:-- -----» y no decía qué escribir. Lo que se escribe
 * se convierte a formato de 24 horas fuera de aquí (lib/horario.ts); la API y la base de datos siguen recibiendo «HH:MM».
 */
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { ETIQUETA_PERIODO, separarHoraPegada, type PeriodoHora } from '@/lib/horario'

interface CampoHoraProps {
  id: string
  texto: string
  periodo: PeriodoHora
  invalido: boolean
  idError?: string
  onTexto: (valor: string) => void
  onPeriodo: (valor: PeriodoHora) => void
}

export function CampoHora({ id, texto, periodo, invalido, idError, onTexto, onPeriodo }: CampoHoraProps) {
  const propsError = { 'aria-invalid': invalido, 'aria-describedby': invalido ? idError : undefined }

  function alEscribir(valor: string) {
    // Si se pega una hora completa («7:30 p. m.») se separa sola en la hora y el a. m./p. m.
    const pegada = separarHoraPegada(valor)
    if (pegada) {
      onTexto(pegada.texto)
      onPeriodo(pegada.periodo)
    } else {
      onTexto(valor)
    }
  }

  return (
    <div className="flex items-start gap-2">
      <Input
        id={id}
        type="text"
        autoComplete="off"
        maxLength={12}
        value={texto}
        onChange={(e) => alEscribir(e.target.value)}
        placeholder="7:30 p. m."
        className="min-w-0 flex-1"
        {...propsError}
      />
      <div className="w-[8.5rem] shrink-0">
        <Select id={`${id}-periodo`} aria-label="a. m. o p. m." value={periodo} onChange={(e) => onPeriodo(e.target.value as PeriodoHora)} {...propsError}>
          <option value="" disabled>
            a. m. / p. m.
          </option>
          <option value="am">{ETIQUETA_PERIODO.am}</option>
          <option value="pm">{ETIQUETA_PERIODO.pm}</option>
        </Select>
      </div>
    </div>
  )
}
