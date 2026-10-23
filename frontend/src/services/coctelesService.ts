import { apiRequest } from './api'
import type { Coctel } from '@/types/cocteles'

export const coctelesService = {
  listar: () => apiRequest<Coctel[]>('/cocteles'),

  obtenerPorId: (id: number) => apiRequest<Coctel>(`/cocteles/${id}`),

  crear: (data: { nombre: string; descripcion?: string; ingredientes: { licor_id: number; mililitros: number }[] }) =>
    apiRequest<Coctel>('/cocteles', {
      method: 'POST',
      body: data,
    }),

  editar: (id: number, data: { nombre: string; descripcion?: string; ingredientes: { licor_id: number; mililitros: number }[] }) =>
    apiRequest<{ mensaje: string }>(`/cocteles/${id}`, {
      method: 'PUT',
      body: data,
    }),
    eliminar: (id: number) =>
    apiRequest<{ mensaje: string }>(`/cocteles/${id}`, {
      method: 'DELETE',
    }),
}