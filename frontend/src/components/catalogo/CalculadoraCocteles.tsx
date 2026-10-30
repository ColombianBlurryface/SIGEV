import React, { useState } from 'react'
import { coctelesService, type ResultadoCalculoCocteles } from '@/services/coctelesService'
import type { Coctel } from '@/types/cocteles'
import { Calculator, Plus, Trash2 } from 'lucide-react'
import { ASISTENTES_MAX, ASISTENTES_MIN, errorAsistentesCalculo, errorPorPersona, POR_PERSONA_MAX } from '@/lib/reglasCoctel'

interface Props {
  coctelesDisponibles: Coctel[]
}

export const CalculadoraCocteles: React.FC<Props> = ({ coctelesDisponibles }) => {
  // Los números se guardan como texto mientras se escriben: así se puede borrar el campo y escribir de cero
  // (con un número, al borrar quedaba un «0» pegado)
  const [asistentes, setAsistentes] = useState('100')
  const [seleccionados, setSeleccionados] = useState<{ coctel_id: number; cocteles_por_persona: string }[]>([
    { coctel_id: coctelesDisponibles[0]?.id || 0, cocteles_por_persona: '2' },
  ])
  const [intento, setIntento] = useState(false)
  const [errorForm, setErrorForm] = useState<string | null>(null)
  const [resultado, setResultado] = useState<ResultadoCalculoCocteles | null>(null)
  const [calculando, setCalculando] = useState(false)

  const agregarFila = () => {
    setSeleccionados((prev) => [...prev, { coctel_id: coctelesDisponibles[0]?.id || 0, cocteles_por_persona: '1' }])
  }

  const eliminarFila = (index: number) => {
    if (seleccionados.length === 1) return
    setSeleccionados((prev) => prev.filter((_, i) => i !== index))
  }

  const actualizarFila = (index: number, campo: 'coctel_id' | 'cocteles_por_persona', valor: number | string) => {
    setErrorForm(null)
    setSeleccionados((prev) => {
      const copia = [...prev]
      copia[index] = { ...copia[index], [campo]: valor }
      return copia
    })
  }

  const ejecutarCalculo = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setIntento(true)
    setErrorForm(null)
    if (errorAsistentesCalculo(asistentes) || seleccionados.some((f) => errorPorPersona(f.cocteles_por_persona))) {
      return setErrorForm('Corrige los campos marcados antes de calcular.')
    }
    const ids = seleccionados.map((f) => f.coctel_id)
    if (new Set(ids).size !== ids.length) return setErrorForm('El mismo cóctel está repetido: cada cóctel se agrega una sola vez.')

    try {
      setCalculando(true)
      const data = await coctelesService.calcular(
        Number(asistentes),
        seleccionados.map((f) => ({ coctel_id: f.coctel_id, cocteles_por_persona: Number(f.cocteles_por_persona) })),
      )
      setResultado(data)
    } catch (err: unknown) {
      setErrorForm(err instanceof Error ? err.message : 'Error al calcular.')
    } finally {
      setCalculando(false)
    }
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-5">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary" />
            Calcular licor por cóctel (HU-45)
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Calcula las botellas a comprar con margen del 10% (RN-09, RN-19) y consolida licores comunes.
          </p>
        </div>
      </div>

      <form onSubmit={ejecutarCalculo} className="space-y-4">
        {/* Asistentes */}
        <div className="w-full sm:w-64">
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Número de Asistentes (40 a 600)
          </label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={4}
            value={asistentes}
            onChange={(e) => {
              setAsistentes(e.target.value)
              setErrorForm(null)
            }}
            aria-invalid={Boolean(errorAsistentesCalculo(asistentes, intento))}
            className={`w-full border rounded-lg p-2 text-sm bg-background text-foreground ${errorAsistentesCalculo(asistentes, intento) ? 'border-red-500' : 'border-border'}`}
            aria-label={`Número de asistentes (${ASISTENTES_MIN} a ${ASISTENTES_MAX})`}
          />
          {errorAsistentesCalculo(asistentes, intento) && (
            <p className="mt-1 text-[11.5px] leading-snug text-red-600 dark:text-red-400">{errorAsistentesCalculo(asistentes, intento)}</p>
          )}
        </div>

        {/* Lista de Cócteles */}
        <div className="space-y-3">
          <label className="block text-xs font-medium text-muted-foreground">Cócteles para el evento</label>
          {seleccionados.map((item, idx) => (
            <div key={idx} className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
              <select
                value={item.coctel_id}
                onChange={(e) => actualizarFila(idx, 'coctel_id', Number(e.target.value))}
                className="w-full min-w-0 sm:flex-1 border border-border rounded-lg p-2 text-sm bg-background text-foreground"
                required
              >
                {coctelesDisponibles.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>

              <div className="flex w-full flex-col gap-1 sm:w-44">
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={2}
                    value={item.cocteles_por_persona}
                    onChange={(e) => actualizarFila(idx, 'cocteles_por_persona', e.target.value)}
                    placeholder="Por persona"
                    className={`w-full border rounded-lg p-2 text-sm bg-background text-foreground ${errorPorPersona(item.cocteles_por_persona, intento) ? 'border-red-500' : 'border-border'}`}
                    title={`Entero de 1 a ${POR_PERSONA_MAX} (RN-15)`}
                    aria-label={`Cócteles por persona de la fila ${idx + 1}`}
                    aria-invalid={Boolean(errorPorPersona(item.cocteles_por_persona, intento))}
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">por persona</span>
                </div>
                {errorPorPersona(item.cocteles_por_persona, intento) && (
                  <p className="text-[11.5px] leading-snug text-red-600 dark:text-red-400">{errorPorPersona(item.cocteles_por_persona, intento)}</p>
                )}
              </div>

              {seleccionados.length > 1 && (
                <button
                  type="button"
                  onClick={() => eliminarFila(idx)}
                  className="self-end text-red-500 hover:text-red-700 p-2 cursor-pointer sm:self-auto"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={agregarFila}
            className="text-xs text-primary hover:underline flex items-center gap-1 font-medium cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Agregar otro cóctel al evento
          </button>
        </div>

        {errorForm && (
          <p role="alert" className="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {errorForm}
          </p>
        )}

        <button
          type="submit"
          disabled={calculando}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 cursor-pointer"
        >
          {calculando ? 'Calculando…' : 'Calcular Botellas Necesarias'}
        </button>
      </form>

      {/* Resultados del Cálculo */}
      {resultado && (
        <div className="mt-4 pt-4 border-t border-border space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="font-semibold text-sm text-foreground">
              Botellas consolidadas a comprar ({resultado.total_botellas} botellas en total)
            </h4>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="py-2">Licor Requerido</th>
                  <th className="py-2">Consumo Neto</th>
                  <th className="py-2">+10% Margen (RN-09)</th>
                  <th className="py-2">Presentación</th>
                  <th className="py-2 text-right">Botellas (RN-19)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground">
                {resultado.licores_calculados.map((lic) => (
                  <tr key={lic.licor_id}>
                    <td className="py-2 font-medium">{lic.nombre_licor}</td>
                    <td className="py-2">{lic.ml_netos.toLocaleString()} ml</td>
                    <td className="py-2 text-muted-foreground">{lic.ml_con_margen.toLocaleString()} ml</td>
                    <td className="py-2">{lic.volumen_botella_ml} ml</td>
                    <td className="py-2 text-right font-bold text-primary text-sm">
                      {lic.botellas_requeridas} {lic.botellas_requeridas === 1 ? 'botella' : 'botellas'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}