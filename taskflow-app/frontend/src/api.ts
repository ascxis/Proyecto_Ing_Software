import type { Estado, Notificacion, Prioridad, Proyecto, Tarea, Usuario } from './types';

export class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }
let token: string | null = null;
try { token = localStorage.getItem('tf_token'); } catch { /* almacenamiento no disponible */ }
export const setToken = (t: string | null) => { token = t; try { t ? localStorage.setItem('tf_token', t) : localStorage.removeItem('tf_token'); } catch { /* ignorar */ } };
export const hasToken = () => !!token;

async function req<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error || `Error ${res.status}`);
  return data as T;
}
export interface Sesion { token: string; usuario: Usuario }
export const api = {
  login: (correo: string, clave: string) => req<Sesion>('POST', '/api/auth/login', { correo, clave }),
  register: (nombre: string, correo: string, clave: string) => req<Sesion>('POST', '/api/auth/register', { nombre, correo, clave }),
  usuarios: () => req<Usuario[]>('GET', '/api/usuarios'),
  proyectos: () => req<Proyecto[]>('GET', '/api/proyectos'),
  crearProyecto: (d: { nombre: string; descripcion: string; fechaLimite: string; miembrosIds: string[] }) => req<Proyecto>('POST', '/api/proyectos', d),
  eliminarProyecto: (id: string) => req<void>('DELETE', `/api/proyectos/${id}`),
  agregarMiembro: (id: string, usuarioId: string) => req<Proyecto>('POST', `/api/proyectos/${id}/miembros`, { usuarioId }),
  quitarMiembro: (id: string, usuarioId: string) => req<Proyecto>('DELETE', `/api/proyectos/${id}/miembros/${usuarioId}`),
  tareas: () => req<Tarea[]>('GET', '/api/tareas'),
  crearTarea: (pid: string, d: { titulo: string; descripcion: string; prioridad: Prioridad; fechaLimite: string; asignadoId: string | null }) => req<Tarea>('POST', `/api/proyectos/${pid}/tareas`, d),
  eliminarTarea: (id: string) => req<void>('DELETE', `/api/tareas/${id}`),
  cambiarEstado: (id: string, estado: Estado, version: number) => req<Tarea>('PATCH', `/api/tareas/${id}/estado`, { estado, version }),
  notificaciones: () => req<Notificacion[]>('GET', '/api/notificaciones'),
  leer: (id: string) => req<Notificacion>('POST', `/api/notificaciones/${id}/leer`),
};
