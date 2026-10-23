import React, { useState } from 'react'
import { coctelesService, type ResultadoCalculoCocteles } from '@/services/coctelesService'
import type { Coctel } from '@/types/cocteles'
import { Calculator, Plus, Trash2 } from 'lucide-react'

interface Props {
  coctelesDisponibles: Coctel[]
}

export const CalculadoraCocteles: React.FC<Props> = ({ coctelesDisponibles }) => {
  const [asistentes, setAsistentes] = useState<number>(100)
  const [seleccionados, setSeleccionados] = useState<{ coctel_id: number; cocteles_por_persona: number }[]>([
    { coctel_id: coctelesDisponibles[0]?.id || 0, cocteles_por_persona: 2 },
  ])
  const [resultado, setResultado] = useState<ResultadoCalculoCocteles | null>(null)
  const [calculando, setCalculando] = useState(false)

  const agregarFila = () => {
    setSeleccionados((prev) => [...prev, { coctel_id: coctelesDisponibles[0]?.id || 0, cocteles_por_persona: 1 }])
  }

  const eliminarFila = (index: number) => {
    if (seleccionados.length === 1) return
    setSeleccionados((prev) => prev.filter((_, i) => i !== index))
  }

  const actualizarFila = (index: number, campo: 'coctel_id' | 'cocteles_por_persona', valor: number) => {
    setSeleccionados((prev) => {
      const copia = [...prev]
      copia[index] = { ...copia[index], [campo]: valor }
      return copia
    })
  }

  const ejecutarCalculo = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (asistentes < 40 || asistentes > 600) {
      alert('La cantidad de asistentes debe estar entre 40 y 600.')
      return
    }

    try {
      setCalculando(true)
      const data = await coctelesService.calcular(asistentes, seleccionados)
      setResultado(data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al calcular.'
      alert(msg)
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
            type="number"
            min="40"
            max="600"
            value={asistentes}
            onChange={(e) => setAsistentes(Number(e.target.value))}
            className="w-full border border-border rounded-lg p-2 text-sm bg-background text-foreground"
            required
          />
        </div>

        {/* Lista de Cócteles */}
        <div className="space-y-3">
          <label className="block text-xs font-medium text-muted-foreground">Cócteles para el evento</label>
          {seleccionados.map((item, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <select
                value={item.coctel_id}
                onChange={(e) => actualizarFila(idx, 'coctel_id', Number(e.target.value))}
                className="flex-1 border border-border rounded-lg p-2 text-sm bg-background text-foreground"
                required
              >
                {coctelesDisponibles.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>

              <div className="w-44 flex items-center gap-1.5">
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={item.cocteles_por_persona}
                  onChange={(e) => actualizarFila(idx, 'cocteles_por_persona', Number(e.target.value))}
                  placeholder="Por persona"
                  className="w-full border border-border rounded-lg p-2 text-sm bg-background text-foreground"
                  title="Entero de 1 a 10 (RN-15)"
                  required
                />
                <span className="text-xs text-muted-foreground whitespace-nowrap">por persona</span>
              </div>

              {seleccionados.length > 1 && (
                <button
                  type="button"
                  onClick={() => eliminarFila(idx)}
                  className="text-red-500 hover:text-red-700 p-2 cursor-pointer"
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