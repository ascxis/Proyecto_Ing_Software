export type Estado = 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADA';
export type Prioridad = 'ALTA' | 'MEDIA' | 'BAJA';
export interface Usuario { id: string; nombre: string; correo: string; cargo: string }
export interface Miembro { usuarioId: string; nombre: string; rol: 'CREADOR' | 'MIEMBRO' }
export interface Proyecto { id: string; nombre: string; descripcion: string; fechaLimite: string; creadorId: string; miembros: Miembro[]; totalTareas: number; completadas: number; avance: number }
export interface Tarea { id: string; proyectoId: string; titulo: string; descripcion: string; prioridad: Prioridad; estado: Estado; asignadoId: string | null; fechaLimite: string; version: number }
export interface Notificacion { id: string; mensaje: string; fecha: number; leida: boolean }
export const ESTADOS: { valor: Estado; etiqueta: string; punto: string }[] = [
  { valor: 'PENDIENTE', etiqueta: 'Pendiente', punto: 'bg-gray-400' },
  { valor: 'EN_PROCESO', etiqueta: 'En progreso', punto: 'bg-blue-500' },
  { valor: 'COMPLETADA', etiqueta: 'Completado', punto: 'bg-green-500' },
];
