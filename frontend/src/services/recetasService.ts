/**
 * Llamadas a la API de las recetas de los platos (HU-46): resumen, maestro de ingredientes y receta de un plato.
 */
import type { IngredienteMaestro, LineaRecetaPayload, RecetaPlato, ResumenReceta } from '@/types/recetas'
import { apiRequest } from './api'

export const recetasService = {
  resumen: () => apiRequest<ResumenReceta[]>('/catalogo/recetas'),

  ingredientes: () => apiRequest<IngredienteMaestro[]>('/catalogo/ingredientes'),

  obtener: (platoId: number) => apiRequest<RecetaPlato>(`/catalogo/${platoId}/receta`),

  // Reemplaza la receta completa del plato
  guardar: (platoId: number, ingredientes: LineaRecetaPayload[]) =>
    apiRequest<RecetaPlato>(`/catalogo/${platoId}/receta`, { method: 'PUT', body: { ingredientes } }),
}
