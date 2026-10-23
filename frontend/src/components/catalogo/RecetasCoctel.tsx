import React, { useState, useEffect, useCallback } from 'react'
import { coctelesService } from '@/services/coctelesService'
import { catalogoService } from '@/services/catalogoService'
import type { Coctel } from '@/types/cocteles'
import type { ProductoCatalogo } from '@/types/catalogo'
import { Plus, Trash2, Edit2, Wine } from 'lucide-react'
const MAX_LICORES_POR_COCTEL = 6

export const RecetasCoctel: React.FC = () => {
  const [cocteles, setCocteles] = useState<Coctel[]>([])
  const [licoresDisponibles, setLicoresDisponibles] = useState<ProductoCatalogo[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  // Estado del formulario
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [ingredientes, setIngredientes] = useState<{ licor_id: number; mililitros: number }[]>([
    { licor_id: 0, mililitros: 50 },
  ])

  // Patrón estándar de SIGEV: promesas con .then() y bandera activo para evitar set-state-in-effect
  useEffect(() => {
    let activo = true

    Promise.all([
      coctelesService.listar(),
      catalogoService.listar('bar_cocteleria'),
    ])
      .then(([dataCocteles, dataCatalogo]) => {
        if (!activo) return
        setCocteles(dataCocteles)
        setLicoresDisponibles(dataCatalogo)
        setError(null)
        setCargando(false)
      })
      .catch((err: unknown) => {
        if (!activo) return
        const mensaje = err instanceof Error ? err.message : 'Error al cargar los cócteles.'
        setError(mensaje)
        setCargando(false)
      })

    return () => {
      activo = false
    }
  }, [version])

  const recargar = useCallback(() => {
    setCargando(true)
    setVersion((v) => v + 1)
  }, [])

  const agregarIngrediente = () => {
    if (ingredientes.length >= MAX_LICORES_POR_COCTEL) {
      alert(`Una receta de cóctel admite como máximo ${MAX_LICORES_POR_COCTEL} licores.`)
      return
    }
    setIngredientes((prev) => [...prev, { licor_id: 0, mililitros: 50 }])
  }

  const eliminarIngrediente = (index: number) => {
    if (ingredientes.length === 1) return
    setIngredientes((prev) => prev.filter((_, i) => i !== index))
  }

  const actualizarIngrediente = (index: number, campo: 'licor_id' | 'mililitros', valor: number) => {
    setIngredientes((prev) => {
      const nuevos = [...prev]
      nuevos[index] = { ...nuevos[index], [campo]: valor }
      return nuevos
    })
  }

  const iniciarEdicion = (c: Coctel) => {
    setEditandoId(c.id)
    setNombre(c.nombre)
    setDescripcion(c.descripcion || '')
    setIngredientes(c.ingredientes.map((i) => ({ licor_id: i.licor_id, mililitros: Number(i.mililitros) })))
  }

  const limpiarFormulario = () => {
    setEditandoId(null)
    setNombre('')
    setDescripcion('')
    setIngredientes([{ licor_id: 0, mililitros: 50 }])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 1. Validar nombre
    if (!nombre.trim()) return alert('El nombre del cóctel es obligatorio.')

    // 2. Validar que tenga al menos un licor y máximo 6
    if (ingredientes.length === 0) return alert('Debes agregar al menos un licor a la receta.')
    if (ingredientes.length > 6) return alert('Una receta de cóctel admite como máximo 6 licores.')

    // 3. Validar licores duplicados en el mismo cóctel (para no romper la restricción UNIQUE de la BD)
    const idsLicores = ingredientes.map((i) => i.licor_id)
    if (new Set(idsLicores).size !== idsLicores.length) {
      return alert('No puedes seleccionar el mismo licor más de una vez en la receta.')
    }

    // 4. Validar mililitros razonables (entre 1 y 250 ml por trago)
    for (const ing of ingredientes) {
      if (!ing.licor_id || ing.mililitros <= 0 || ing.mililitros > 250) {
        return alert('Selecciona un licor y especifica mililitros mayores a 0 y máximo 250 ml.')
      }
    }

    try {
      const payload = { nombre: nombre.trim(), descripcion: descripcion.trim(), ingredientes }
      if (editandoId) {
        await coctelesService.editar(editandoId, payload)
      } else {
        await coctelesService.crear(payload)
      }
      limpiarFormulario()
      recargar()
    } catch (err: unknown) {
      const mensaje = err instanceof Error ? err.message : 'Error al guardar la receta.'
      alert(mensaje)
    }
  }
  const handleEliminar = async (id: number, nombreCoctel: string) => {
    const confirmar = window.confirm(`¿Estás seguro de que deseas eliminar el cóctel "${nombreCoctel}"? Esta acción no se puede deshacer.`)
    if (!confirmar) return

    try {
      await coctelesService.eliminar(id)
      if (editandoId === id) {
        limpiarFormulario()
      }
      recargar()
    } catch (err: unknown) {
      const mensaje = err instanceof Error ? err.message : 'Error al eliminar el cóctel.'
      alert(mensaje)
    }
  }
  if (cargando) return <p className="p-4 text-muted-foreground text-sm">Cargando recetas de cócteles…</p>

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Formulario de Creación / Edición */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
        <h3 className="text-lg font-semibold mb-2 text-foreground flex items-center gap-2">
          <Wine className="w-5 h-5 text-primary" />
          {editandoId ? 'Editar Receta de Cóctel' : 'Crear Receta de Cóctel'}
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Define qué licores del catálogo requiere el cóctel y los mililitros exactos por trago (HU-44).
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Nombre del Cóctel</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Mojito, Gin Tonic"
                className="w-full border border-border rounded-lg p-2 text-sm bg-background text-foreground"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Descripción / Notas (Opcional)</label>
              <input
                type="text"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Ej. Servir con hielo frappé y hierbabuena"
                className="w-full border border-border rounded-lg p-2 text-sm bg-background text-foreground"
              />
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <label className="block text-xs font-medium text-muted-foreground">Licores requeridos y dosificación</label>
            {ingredientes.map((ing, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <select
                  value={ing.licor_id}
                  onChange={(e) => actualizarIngrediente(idx, 'licor_id', Number(e.target.value))}
                  className="flex-1 border border-border rounded-lg p-2 text-sm bg-background text-foreground"
                  required
                >
                  <option value={0}>-- Selecciona un licor de coctelería --</option>
                  {licoresDisponibles.map((lic) => (
                    <option key={lic.id} value={lic.id}>
                      {lic.nombre} ({lic.volumen_botella_ml || 750} ml)
                    </option>
                  ))}
                </select>

                <div className="w-32 flex items-center gap-1.5">
                  <input
                    type="number"
                    min="1"
                    max="250"
                    value={ing.mililitros}
                    onChange={(e) => actualizarIngrediente(idx, 'mililitros', Number(e.target.value))}
                    placeholder="ml"
                    className="w-full border border-border rounded-lg p-2 text-sm bg-background text-foreground"
                    required
                  />
                  <span className="text-xs font-medium text-muted-foreground">ml</span>
                </div>

                {ingredientes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => eliminarIngrediente(idx)}
                    className="text-red-500 hover:text-red-700 p-2 cursor-pointer"
                    title="Quitar licor"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}

                    {ingredientes.length < MAX_LICORES_POR_COCTEL ? (
            <button
              type="button"
              onClick={agregarIngrediente}
              className="text-xs text-primary hover:underline flex items-center gap-1 font-medium cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Agregar otro licor a la receta ({ingredientes.length}/{MAX_LICORES_POR_COCTEL})
            </button>
            ) : (
            <span className="text-xs text-muted-foreground italic">
              Límite máximo alcanzado ({MAX_LICORES_POR_COCTEL} licores por cóctel)
            </span>
            )}
          </div>

          <div className="flex gap-2 pt-3">
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 cursor-pointer"
            >
              {editandoId ? 'Guardar Cambios' : 'Crear Cóctel'}
            </button>
            {editandoId && (
              <button
                type="button"
                onClick={limpiarFormulario}
                className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted text-foreground cursor-pointer"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Listado de Cócteles */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
        <h3 className="text-lg font-semibold mb-4 text-foreground">Cócteles y Recetas Registradas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cocteles.map((c) => (
            <div key={c.id} className="border border-border rounded-lg p-4 bg-background flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start">
                  <h4 className="font-semibold text-foreground">{c.nombre}</h4>
                  <button
                    onClick={() => iniciarEdicion(c)}
                    className="text-muted-foreground hover:text-primary p-1 cursor-pointer"
                    title="Editar receta"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                  onClick={() => handleEliminar(c.id, c.nombre)}
                  className="text-muted-foreground hover:text-red-600 p-1 cursor-pointer transition-colors"
                  title="Eliminar cóctel"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                </div>
                {c.descripcion && <p className="text-xs text-muted-foreground mt-1">{c.descripcion}</p>}

                <div className="mt-3 pt-3 border-t border-border space-y-1.5">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Receta por trago:
                  </span>
                  {c.ingredientes && c.ingredientes.length > 0 ? (
                    c.ingredientes.map((ing, i) => (
                      <div key={i} className="flex justify-between text-xs text-foreground">
                        <span>• {ing.nombre_licor}</span>
                        <span className="font-semibold text-primary">{ing.mililitros} ml</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Sin licores asignados</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}