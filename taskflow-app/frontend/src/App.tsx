import { useCallback, useEffect, useState } from 'react';
import { api, hasToken, setToken } from './api';
import { Login } from './Login';
import { Cronograma, Ctx, Dashboard, Detalle, Equipo, Proyectos, Tareas } from './Vistas';
import type { Notificacion, Proyecto, Tarea, Usuario } from './types';
import { Avatar, Logo } from './ui';

const MENU = [['dashboard', 'Dashboard', 'Resumen general de tu actividad'], ['proyectos', 'Proyectos', 'Gestiona tus proyectos'], ['tareas', 'Tareas', 'Todas tus tareas'], ['cronograma', 'Cronograma', 'Línea de tiempo de tareas y proyectos'], ['equipo', 'Equipo', 'Personas de la plataforma']] as const;

export function App() {
  const [yo, setYo] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(hasToken());
  const [usuarios, setUsuarios] = useState<Usuario[]>([]); const [proyectos, setProyectos] = useState<Proyecto[]>([]); const [tareas, setTareas] = useState<Tarea[]>([]);
  const [notifs, setNotifs] = useState<Notificacion[]>([]); const [verNotifs, setVerNotifs] = useState(false);
  const [vista, setVista] = useState<string>('dashboard'); const [detalle, setDetalle] = useState<string | null>(null);
  const [toast, setToast] = useState<{ m: string; error: boolean } | null>(null);

  const aviso = useCallback((m: string, error = false) => { setToast({ m, error }); setTimeout(() => setToast(null), 3500); }, []);
  const recargar = useCallback(async () => {
    const [u, p, t, n] = await Promise.all([api.usuarios(), api.proyectos(), api.tareas(), api.notificaciones()]);
    setUsuarios(u); setProyectos(p); setTareas(t); setNotifs(n);
  }, []);
  useEffect(() => { // restaurar sesión si hay token
    if (!hasToken()) return;
    api.usuarios().then(async (us) => { const mail = localStorage.getItem('tf_mail'); setYo(us.find((x) => x.correo === mail) ?? null); await recargar(); }).catch(() => setToken(null)).finally(() => setCargando(false));
  }, [recargar]);
  useEffect(() => { if (yo) { try { localStorage.setItem('tf_mail', yo.correo); } catch { /* ignorar */ } recargar().catch(() => {}); } }, [yo, recargar]);

  if (cargando) return <div className="p-10 text-gray-500">Cargando…</div>;
  if (!yo) return <Login onLogin={setYo} />;
  const ctx: Ctx = { yo, usuarios, proyectos, tareas, recargar, aviso, abrir: (id) => { setDetalle(id); setVista('detalle'); } };
  const sinLeer = notifs.filter((n) => !n.leida).length;
  const actual = vista === 'detalle' ? ['detalle', 'Detalle del Proyecto', 'Tablero Kanban de tareas'] : MENU.find((m) => m[0] === vista)!;
  const salir = () => { setToken(null); setYo(null); };

  return (
    <div className="min-h-screen flex">
      <aside className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col fixed h-full z-20">
        <div className="p-6 border-b border-gray-100 flex items-center gap-3"><Logo /><div><h1 className="font-bold">TaskFlow</h1><p className="text-xs text-gray-500">Gestión de Tareas</p></div></div>
        <nav className="p-4 space-y-1 flex-1" aria-label="Principal">
          {MENU.map(([id, nombre]) => (
            <button key={id} onClick={() => { setVista(id); setDetalle(null); }} aria-current={vista === id ? 'page' : undefined} className={`w-full text-left px-4 py-3 rounded-xl transition ${vista === id || (id === 'proyectos' && vista === 'detalle') ? 'bg-indigo-50 text-indigo-600 font-medium' : 'text-gray-700 hover:bg-indigo-50'}`}>{nombre}</button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100 flex items-center gap-3"><Avatar nombre={yo.nombre} size={38} /><div className="flex-1 min-w-0"><div className="text-sm font-medium truncate">{yo.nombre}</div><div className="text-xs text-gray-500 truncate">{yo.correo}</div></div><button onClick={salir} aria-label="Cerrar sesión" title="Cerrar sesión" className="text-gray-500 hover:text-red-600">⎋</button></div>
      </aside>
      <div className="flex-1 md:ml-64 min-w-0">
        <header className="bg-white border-b border-gray-200 px-4 md:px-8 py-3 md:py-4 flex items-center justify-between sticky top-0 z-10">
          <div><div className="flex items-center gap-2"><span className="md:hidden"><Logo /></span><div><h2 className="text-lg md:text-xl font-bold">{actual[1]}</h2><p className="text-xs md:text-sm text-gray-500 hidden sm:block">{actual[2]}</p></div></div></div>
          <div className="relative">
            <button onClick={() => setVerNotifs(!verNotifs)} aria-label="Notificaciones" className="relative p-2 rounded-lg hover:bg-gray-100">🔔{sinLeer > 0 && <span data-testid="badge-notifs" className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">{sinLeer}</span>}</button>
            {verNotifs && (
              <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-xl shadow-xl border p-2 z-30" role="region" aria-label="Lista de notificaciones">
                {notifs.length === 0 && <p className="p-3 text-sm text-gray-500">No tienes notificaciones.</p>}
                {notifs.map((n) => <button key={n.id} onClick={async () => { await api.leer(n.id); await recargar(); }} className={`w-full text-left p-3 rounded-lg text-sm hover:bg-gray-50 ${n.leida ? 'text-gray-400' : 'font-medium'}`}>{n.mensaje}</button>)}
              </div>)}
          </div>
        </header>
        <nav className="md:hidden flex gap-1 overflow-x-auto bg-white border-b border-gray-200 px-3 py-2 sticky top-16 z-10" aria-label="Principal móvil">
          {MENU.map(([id, nombre]) => (
            <button key={id} onClick={() => { setVista(id); setDetalle(null); }} className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-sm ${vista === id || (id === 'proyectos' && vista === 'detalle') ? 'bg-indigo-50 text-indigo-600 font-medium' : 'text-gray-600'}`}>{nombre}</button>
          ))}
          <button onClick={salir} className="whitespace-nowrap px-3 py-1.5 rounded-lg text-sm text-red-600">Salir</button>
        </nav>
        <main className="p-4 md:p-8">
          {vista === 'dashboard' && <Dashboard c={ctx} ir={setVista} />}
          {vista === 'proyectos' && <Proyectos c={ctx} />}
          {vista === 'detalle' && detalle && <Detalle c={ctx} id={detalle} volver={() => { setVista('proyectos'); setDetalle(null); }} />}
          {vista === 'tareas' && <Tareas c={ctx} />}
          {vista === 'cronograma' && <Cronograma c={ctx} />}
          {vista === 'equipo' && <Equipo c={ctx} />}
        </main>
      </div>
      {toast && <div role="status" className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl text-white shadow-lg z-50 ${toast.error ? 'bg-red-600' : 'bg-gray-900'}`}>{toast.m}</div>}
    </div>
  );
}
