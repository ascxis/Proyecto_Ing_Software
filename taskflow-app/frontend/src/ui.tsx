import { ReactNode } from 'react';

export const Logo = ({ size = 40 }: { size?: number }) => (
  <div style={{ width: size, height: size }} className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shrink-0">
    <svg style={{ width: size * 0.6, height: size * 0.6 }} fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
  </div>
);
export const iniciales = (n: string) => n.split(/\s+/).filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
export const Avatar = ({ nombre, size = 32 }: { nombre: string; size?: number }) => (
  <div style={{ width: size, height: size, fontSize: size * 0.4 }} className="rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold flex items-center justify-center shrink-0" aria-hidden="true">{iniciales(nombre)}</div>
);
export const Modal = ({ titulo, onClose, children }: { titulo: string; onClose: () => void; children: ReactNode }) => (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-label={titulo}>
    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
      <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-bold">{titulo}</h3><button onClick={onClose} aria-label="Cerrar" className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button></div>
      {children}
    </div>
  </div>
);
export const campo = 'w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white';
export const boton = 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:shadow-lg transition';
export const Etiqueta = ({ texto, clase }: { texto: string; clase: string }) => <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${clase}`}>{texto}</span>;
export const colorPrioridad = { ALTA: 'bg-red-100 text-red-700', MEDIA: 'bg-yellow-100 text-yellow-800', BAJA: 'bg-green-100 text-green-700' } as const;
export const textoPrioridad = { ALTA: 'Alta', MEDIA: 'Media', BAJA: 'Baja' } as const;
export const fmt = (f: string) => (f ? new Date(f + 'T00:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }) : '-');
