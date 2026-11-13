import { apiRequest } from './api'
import type { Coctel } from '@/types/cocteles'

// 1. Interfaces y Tipos para la HU-45 (van AFUERA del objeto)
export interface CalculoLicorItem {
  licor_id: number
  nombre_licor: string
  ml_netos: number
  ml_con_margen: number
  volumen_botella_ml: number
  botellas_requeridas: number
  precio_unitario: number
  costo_estimado: number
}

export interface ResultadoCalculoCocteles {
  asistentes: number
  licores_calculados: CalculoLicorItem[]
  total_botellas: number
  costo_total_licores: number
}

// 2. Objeto del servicio con todos los métodos (HU-44 y HU-45)
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

  // Método para la HU-45 (Calcular botellas según asistentes)
  calcular: (asistentes: number, cocteles: { coctel_id: number; cocteles_por_persona: number }[]) =>
    apiRequest<ResultadoCalculoCocteles>('/cocteles/calcular', {
      method: 'POST',
      body: { asistentes, cocteles },
    }),
}