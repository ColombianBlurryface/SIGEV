export interface IngredienteReceta {
  licor_id: number;
  nombre_licor?: string;
  mililitros: number;
  volumen_botella_ml?: number;
  precio_unitario?: number;
}

export interface Coctel {
  id: number;
  nombre: string;
  descripcion?: string;
  activo: boolean;
  ingredientes: IngredienteReceta[];
}