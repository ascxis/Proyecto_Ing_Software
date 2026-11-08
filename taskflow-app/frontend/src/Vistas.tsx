import { FormEvent, useState } from 'react';
import { api } from './api';
import { ESTADOS, Estado, Prioridad, Proyecto, Tarea, Usuario } from './types';
import { Avatar, boton, campo, colorPrioridad, Etiqueta, fmt, Modal, textoPrioridad } from './ui';

export interface Ctx {
  yo: Usuario; usuarios: Usuario[]; proyectos: Proyecto[]; tareas: Tarea[];
  recargar: () => Promise<void>; aviso: (m: string, error?: boolean) => void; abrir: (id: string) => void;
}
const nombreDe = (c: Ctx, id: string | null) => c.usuarios.find((u) => u.id === id)?.nombre ?? 'Sin asignar';

/* ---------- Dashboard ---------- */
export function Dashboard({ c, ir }: { c: Ctx; ir: (v: string) => void }) {
  const completadas = c.tareas.filter((t) => t.estado === 'COMPLETADA').length;
  const stats = [['Proyectos totales', c.proyectos.length], ['Tareas totales', c.tareas.length], ['Tareas completadas', completadas], ['Tareas pendientes', c.tareas.length - completadas]];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{stats.map(([t, n]) => <div key={t} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"><div className="text-3xl font-bold">{n}</div><div className="text-xs text-gray-500 mt-1">{t}</div></div>)}</div>
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex justify-between mb-4"><h3 className="font-bold">Progreso de proyectos</h3><button onClick={() => ir('proyectos')} className="text-sm text-indigo-600 hover:underline">Ver todos →</button></div>
        {c.proyectos.length === 0 && <p className="text-gray-500 text-sm">Aún no tienes proyectos.</p>}
        {c.proyectos.map((p) => (
          <button key={p.id} onClick={() => c.abrir(p.id)} className="w-full text-left mb-4 last:mb-0">
            <div className="flex justify-between text-sm mb-1"><span className="font-medium">{p.nombre}</span><span className="text-gray-500">{p.avance}%</span></div>
            <div className="h-2 bg-gray-100 rounded-full"><div className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600" style={{ width: `${p.avance}%` }} /></div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------- Proyectos ---------- */
export function Proyectos({ c }: { c: Ctx }) {
  const [abierto, setAbierto] = useState(false);
  const [f, setF] = useState({ nombre: '', descripcion: '', fechaLimite: '', miembrosIds: [] as string[] });
  async function crear(e: FormEvent) {
    e.preventDefault();
    try { await api.crearProyecto(f); setAbierto(false); setF({ nombre: '', descripcion: '', fechaLimite: '', miembrosIds: [] }); await c.recargar(); c.aviso('Proyecto creado'); }
    catch (err) { c.aviso((err as Error).message, true); }
  }
  return (
    <div>
      <div className="flex justify-between items-center mb-5"><h3 className="font-bold text-lg">Mis proyectos</h3><button className={boton} onClick={() => setAbierto(true)}>+ Nuevo proyecto</button></div>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {c.proyectos.map((p) => (
          <button key={p.id} onClick={() => c.abrir(p.id)} className="text-left bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition" data-testid="tarjeta-proyecto">
            <div className="flex items-center gap-3 mb-2"><div className="w-10 h-10 rounded-xl bg-indigo-500 text-white font-bold flex items-center justify-center">{p.nombre[0]}</div><div><div className="font-semibold">{p.nombre}</div><div className="text-xs text-gray-500">{p.miembros.length} miembro(s) · {p.completadas}/{p.totalTareas} tareas</div></div></div>
            <p className="text-sm text-gray-600 line-clamp-2 mb-3">{p.descripcion}</p>
            <div className="h-2 bg-gray-100 rounded-full"><div className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600" style={{ width: `${p.avance}%` }} /></div>
          </button>
        ))}
      </div>
      {abierto && (
        <Modal titulo="Nuevo proyecto" onClose={() => setAbierto(false)}>
          <form onSubmit={crear} className="space-y-3">
            <div><label htmlFor="pn" className="text-sm font-medium">Nombre</label><input id="pn" className={campo} value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} required /></div>
            <div><label htmlFor="pd" className="text-sm font-medium">Descripción</label><textarea id="pd" className={campo} value={f.descripcion} onChange={(e) => setF({ ...f, descripcion: e.target.value })} /></div>
            <div><label htmlFor="pf" className="text-sm font-medium">Fecha límite</label><input id="pf" type="date" className={campo} value={f.fechaLimite} onChange={(e) => setF({ ...f, fechaLimite: e.target.value })} /></div>
            <fieldset><legend className="text-sm font-medium mb-1">Miembros</legend>
              {c.usuarios.filter((u) => u.id !== c.yo.id).map((u) => (
                <label key={u.id} className="flex items-center gap-2 text-sm py-0.5"><input type="checkbox" checked={f.miembrosIds.includes(u.id)} onChange={(e) => setF({ ...f, miembrosIds: e.target.checked ? [...f.miembrosIds, u.id] : f.miembrosIds.filter((x) => x !== u.id) })} />{u.nombre}</label>
              ))}
            </fieldset>
            <button className={`${boton} w-full`}>Crear proyecto</button>
          </form>
        </Modal>
      )}
    </div>
  );
}

/* ---------- Detalle del proyecto (tablero) ---------- */
export function Detalle({ c, id, volver }: { c: Ctx; id: string; volver: () => void }) {
  const p = c.proyectos.find((x) => x.id === id);
  const [nueva, setNueva] = useState(false);
  const [f, setF] = useState({ titulo: '', descripcion: '', prioridad: 'MEDIA' as Prioridad, fechaLimite: '', asignadoId: '' });
  if (!p) return <p>Proyecto no encontrado.</p>;
  const esCreador = p.creadorId === c.yo.id;
  const tareas = c.tareas.filter((t) => t.proyectoId === p.id);
  const fueraDelProyecto = c.usuarios.filter((u) => !p.miembros.some((m) => m.usuarioId === u.id));

  async function cambiar(t: Tarea, estado: Estado) {
    try { await api.cambiarEstado(t.id, estado, t.version); await c.recargar(); c.aviso('Estado actualizado'); }
    catch (err) { c.aviso((err as Error).message, true); await c.recargar(); }
  }
  async function crear(e: FormEvent) {
    e.preventDefault();
    try { await api.crearTarea(p!.id, { ...f, asignadoId: f.asignadoId || null }); setNueva(false); setF({ titulo: '', descripcion: '', prioridad: 'MEDIA', fechaLimite: '', asignadoId: '' }); await c.recargar(); c.aviso('Tarea creada'); }
    catch (err) { c.aviso((err as Error).message, true); }
  }
  async function eliminarTarea(t: Tarea) { try { await api.eliminarTarea(t.id); await c.recargar(); c.aviso('Tarea eliminada'); } catch (err) { c.aviso((err as Error).message, true); } }
  async function eliminarProyecto() { try { await api.eliminarProyecto(p!.id); await c.recargar(); volver(); c.aviso('Proyecto eliminado'); } catch (err) { c.aviso((err as Error).message, true); } }
  async function miembro(accion: 'add' | 'del', uid: string) { try { await (accion === 'add' ? api.agregarMiembro(p!.id, uid) : api.quitarMiembro(p!.id, uid)); await c.recargar(); } catch (err) { c.aviso((err as Error).message, true); } }

  return (
    <div className="space-y-6">
      <button onClick={volver} className="text-gray-600 hover:text-indigo-600">‹ Volver a proyectos</button>
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex justify-between items-start">
        <div className="flex gap-4"><div className="w-14 h-14 rounded-xl bg-indigo-500 text-white text-xl font-bold flex items-center justify-center">{p.nombre[0]}</div>
          <div><h2 className="text-2xl font-bold">{p.nombre}</h2><p className="text-gray-500">{p.descripcion}</p><p className="text-sm text-gray-500 mt-1">📅 {fmt(p.fechaLimite)} · 📊 {p.avance}% completado · ✅ {p.completadas}/{p.totalTareas} tareas</p></div></div>
        {esCreador && <button onClick={eliminarProyecto} className="text-sm text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg" aria-label="Eliminar proyecto">Eliminar</button>}
      </div>
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-bold">Participantes del equipo</h3><p className="text-xs text-gray-500 mb-3">Miembros asignados a este proyecto</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {p.miembros.map((m) => (
            <div key={m.usuarioId} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"><Avatar nombre={m.nombre} /><div className="flex-1 min-w-0"><div className="font-medium text-sm truncate">{m.nombre}</div><div className="text-xs text-gray-500">{c.usuarios.find((u) => u.id === m.usuarioId)?.cargo}</div></div>
              {m.rol === 'CREADOR' ? <Etiqueta texto="Creador" clase="bg-indigo-100 text-indigo-700" /> : esCreador && <button onClick={() => miembro('del', m.usuarioId)} aria-label={`Quitar a ${m.nombre}`} className="text-gray-400 hover:text-red-600">×</button>}</div>
          ))}
        </div>
        {esCreador && fueraDelProyecto.length > 0 && (
          <div className="mt-3 flex gap-2 items-center text-sm"><label htmlFor="addm">Añadir miembro:</label>
            <select id="addm" className="border rounded-lg px-2 py-1" defaultValue="" onChange={(e) => { if (e.target.value) { miembro('add', e.target.value); e.target.value = ''; } }}><option value="">Elegir…</option>{fueraDelProyecto.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}</select></div>
        )}
      </div>
      <div className="flex justify-between items-center"><h3 className="text-xl font-bold">Tablero de tareas</h3><button className={boton} onClick={() => setNueva(true)}>+ Nueva tarea</button></div>
      <div className="grid md:grid-cols-3 gap-4">
        {ESTADOS.map((col) => {
          const lista = tareas.filter((t) => t.estado === col.valor);
          return (
            <section key={col.valor} className="bg-gray-100/70 rounded-2xl p-3" aria-label={col.etiqueta}>
              <h4 className="font-semibold text-sm flex items-center gap-2 mb-3 px-1"><span className={`w-3 h-3 rounded-full ${col.punto}`} />{col.etiqueta}<span className="bg-white text-xs rounded-full px-2">{lista.length}</span></h4>
              <div className="space-y-3">
                {lista.map((t) => {
                  const mia = t.asignadoId === c.yo.id;
                  return (
                    <article key={t.id} className="bg-white rounded-xl p-4 shadow-sm" data-testid="tarea" data-id={t.id}>
                      <div className="flex justify-between"><Etiqueta texto={textoPrioridad[t.prioridad]} clase={colorPrioridad[t.prioridad]} />{esCreador && <button onClick={() => eliminarTarea(t)} aria-label={`Eliminar ${t.titulo}`} className="text-gray-400 hover:text-red-600">×</button>}</div>
                      <h5 className="font-semibold mt-2">{t.titulo}</h5><p className="text-xs text-gray-500">{t.descripcion}</p>
                      <div className="flex justify-between items-center mt-3 text-xs text-gray-600"><span className="flex items-center gap-1.5">{t.asignadoId && <Avatar nombre={nombreDe(c, t.asignadoId)} size={22} />}{nombreDe(c, t.asignadoId).split(' ')[0]}</span><span>📅 {fmt(t.fechaLimite)}</span></div>
                      <select aria-label={`Estado de ${t.titulo}`} value={t.estado} disabled={!mia} title={mia ? 'Cambiar estado' : 'Solo el usuario asignado puede cambiar el estado'} onChange={(e) => cambiar(t, e.target.value as Estado)} className="mt-3 w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 disabled:bg-gray-50 disabled:text-gray-400">
                        {ESTADOS.map((e) => <option key={e.valor} value={e.valor}>{e.etiqueta}</option>)}
                      </select>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
      {nueva && (
        <Modal titulo="Nueva tarea" onClose={() => setNueva(false)}>
          <form onSubmit={crear} className="space-y-3">
            <div><label htmlFor="tt" className="text-sm font-medium">Título</label><input id="tt" className={campo} value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} required /></div>
            <div><label htmlFor="td" className="text-sm font-medium">Descripción</label><textarea id="td" className={campo} value={f.descripcion} onChange={(e) => setF({ ...f, descripcion: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label htmlFor="tp" className="text-sm font-medium">Prioridad</label><select id="tp" className={campo} value={f.prioridad} onChange={(e) => setF({ ...f, prioridad: e.target.value as Prioridad })}><option value="ALTA">Alta</option><option value="MEDIA">Media</option><option value="BAJA">Baja</option></select></div>
              <div><label htmlFor="tf" className="text-sm font-medium">Fecha límite</label><input id="tf" type="date" className={campo} value={f.fechaLimite} onChange={(e) => setF({ ...f, fechaLimite: e.target.value })} /></div>
            </div>
            <div><label htmlFor="ta" className="text-sm font-medium">Asignar a</label><select id="ta" className={campo} value={f.asignadoId} onChange={(e) => setF({ ...f, asignadoId: e.target.value })}><option value="">Sin asignar</option>{p.miembros.map((m) => <option key={m.usuarioId} value={m.usuarioId}>{m.nombre}</option>)}</select></div>
            <button className={`${boton} w-full`}>Crear tarea</button>
          </form>
        </Modal>
      )}
    </div>
  );
}

/* ---------- Todas las tareas ---------- */
export function Tareas({ c }: { c: Ctx }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 overflow-x-auto">
      <table className="w-full text-sm"><thead><tr className="text-left text-gray-500 border-b"><th className="py-2">Tarea</th><th>Proyecto</th><th>Asignado</th><th>Prioridad</th><th>Estado</th><th>Fecha límite</th></tr></thead>
        <tbody>{c.tareas.map((t) => (
          <tr key={t.id} className="border-b border-gray-50"><td className="py-3 font-medium">{t.titulo}</td><td>{c.proyectos.find((p) => p.id === t.proyectoId)?.nombre}</td><td>{nombreDe(c, t.asignadoId)}</td>
            <td><Etiqueta texto={textoPrioridad[t.prioridad]} clase={colorPrioridad[t.prioridad]} /></td><td>{ESTADOS.find((e) => e.valor === t.estado)?.etiqueta}</td><td>{fmt(t.fechaLimite)}</td></tr>))}</tbody></table>
      {c.tareas.length === 0 && <p className="text-gray-500 py-6 text-center">No hay tareas todavía</p>}
    </div>
  );
}

/* ---------- Cronograma ---------- */
export function Cronograma({ c }: { c: Ctx }) {
  const conFecha = c.tareas.filter((t) => t.fechaLimite);
  const ts = conFecha.map((t) => new Date(t.fechaLimite + 'T00:00:00').getTime());
  const min = Math.min(...ts, Date.now()), max = Math.max(...ts, Date.now() + 864e5 * 7), rango = max - min || 1;
  const hoy = ((Date.now() - min) / rango) * 100;
  const color = { PENDIENTE: 'bg-gray-400', EN_PROCESO: 'bg-blue-500', COMPLETADA: 'bg-green-500' } as const;
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h3 className="font-bold mb-1">Línea de tiempo de tareas</h3><p className="text-xs text-gray-500 mb-5">Cada barra termina en la fecha límite. Las tareas se agrupan por proyecto (id), no por nombre.</p>
      {c.proyectos.map((p) => (
        <div key={p.id} className="mb-5"><div className="font-semibold text-sm mb-2">{p.nombre}</div>
          {conFecha.filter((t) => t.proyectoId === p.id).map((t) => { const fin = ((new Date(t.fechaLimite + 'T00:00:00').getTime() - min) / rango) * 100; return (
            <div key={t.id} className="flex items-center gap-3 mb-1.5"><div className="w-48 text-xs truncate">{t.titulo}</div>
              <div className="relative flex-1 h-4 bg-gray-50 rounded"><div className="absolute top-0 bottom-0 w-px bg-red-400" style={{ left: `${hoy}%` }} title="Hoy" /><div className={`absolute top-0.5 bottom-0.5 rounded ${color[t.estado]}`} style={{ left: `${Math.max(0, Math.min(fin, 100) - 12)}%`, width: '12%' }} title={`${t.titulo}: ${fmt(t.fechaLimite)}`} /></div>
              <div className="w-24 text-xs text-gray-500">{fmt(t.fechaLimite)}</div></div>); })}
        </div>))}
    </div>
  );
}

/* ---------- Equipo ---------- */
export function Equipo({ c }: { c: Ctx }) {
  return (
    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
      {c.usuarios.map((u) => {
        const mias = c.tareas.filter((t) => t.asignadoId === u.id), ok = mias.filter((t) => t.estado === 'COMPLETADA').length;
        return <div key={u.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex gap-3"><Avatar nombre={u.nombre} size={44} /><div><div className="font-semibold">{u.nombre}</div><div className="text-xs text-gray-500">{u.cargo} · {u.correo}</div><div className="text-xs mt-2">{ok}/{mias.length} tareas completadas</div></div></div>;
      })}
    </div>
  );
}
