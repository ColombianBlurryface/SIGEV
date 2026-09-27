export interface Usuario {
  id: number
  nombre_completo: string
  usuario: string
  rol: string
}

export interface Credenciales {
  usuario: string
  password: string
}

export interface LoginResponse {
  token: string
  usuario: Usuario
}

export type Sesion = LoginResponse
