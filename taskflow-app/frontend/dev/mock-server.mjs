// Servidor de desarrollo que imita el contrato REST del backend Spring Boot (mismas rutas, estados y reglas).
// Sirve para ejecutar y probar la interfaz React sin base de datos. NO es el backend de producción.
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const SECRET = 'dev-secret';
const PORT = Number(process.env.PORT || 8080);
const WEB = path.resolve(process.env.WEB_DIR || 'dist');
let seq = 100;
const nid = (p) => p + (++seq);
const hash = (s) => crypto.createHash('sha256').update('salt:' + s).digest('hex');

const db = { usuarios: [], proyectos: [], tareas: [], notifs: [] };
function seed() {
  db.usuarios = [
    { id: 'u1', nombre: 'Administrador', correo: 'admin@gmail.com', clave: hash('admin123'), cargo: 'Project Manager' },
    { id: 'u2', nombre: 'Ronald Alexander Sandoval', correo: 'ronald@unipamplona.edu.co', clave: hash('1234'), cargo: 'Desarrollador' },
    { id: 'u3', nombre: 'Juan Miguel Beltrán', correo: 'juan@unipamplona.edu.co', clave: hash('1234'), cargo: 'Diseñador' },
  ];
  db.proyectos = [
    { id: 'p1', nombre: 'Sistema Web Universidad', descripcion: 'Plataforma de gestión académica para la Universidad de Pamplona', fechaLimite: '2026-12-14', creadorId: 'u1', miembros: [{ usuarioId: 'u1', rol: 'CREADOR' }, { usuarioId: 'u2', rol: 'MIEMBRO' }, { usuarioId: 'u3', rol: 'MIEMBRO' }] },
    { id: 'p2', nombre: 'App Móvil de Tareas', descripcion: 'Aplicación para seguimiento de tareas del semillero', fechaLimite: '2026-11-30', creadorId: 'u1', miembros: [{ usuarioId: 'u1', rol: 'CREADOR' }, { usuarioId: 'u3', rol: 'MIEMBRO' }] },
  ];
  const t = (id, p, titulo, desc, pr, est, a, f) => ({ id, proyectoId: p, titulo, descripcion: desc, prioridad: pr, estado: est, asignadoId: a, fechaLimite: f, creadaEn: Date.now(), version: 0 });
  db.tareas = [
    t('t1', 'p1', 'Diseñar interfaz de login', 'Crear mockups del módulo de autenticación', 'ALTA', 'COMPLETADA', 'u3', '2026-10-01'),
    t('t2', 'p1', 'Implementar base de datos', 'Configurar PostgreSQL y crear esquemas', 'ALTA', 'EN_PROCESO', 'u2', '2026-11-15'),
    t('t3', 'p1', 'Desarrollar módulo de proyectos', 'CRUD completo de proyectos', 'MEDIA', 'PENDIENTE', 'u2', '2026-11-25'),
    t('t4', 'p1', 'Pruebas de usabilidad', 'Realizar tests con usuarios reales', 'BAJA', 'PENDIENTE', 'u1', '2026-12-10'),
    t('t5', 'p2', 'Wireframes de la app', 'Diseñar flujo principal de la aplicación', 'ALTA', 'EN_PROCESO', 'u3', '2026-11-20'),
    t('t6', 'p2', 'Configurar React Native', 'Inicializar proyecto y dependencias', 'MEDIA', 'COMPLETADA', 'u3', '2026-10-25'),
  ];
  db.notifs = [{ id: 'n1', destinatarioId: 'u1', mensaje: 'Bienvenido a TaskFlow', fecha: Date.now(), leida: false }];
}
seed();

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const sign = (u) => { const h = b64({ alg: 'HS256' }), p = b64({ sub: u.id, exp: Date.now() + 864e5 }); return `${h}.${p}.${crypto.createHmac('sha256', SECRET).update(h + '.' + p).digest('base64url')}`; };
function auth(req) {
  const m = (req.headers.authorization || '').match(/^Bearer (.+)$/); if (!m) return null;
  const [h, p, s] = m[1].split('.'); if (!s) return null;
  if (crypto.createHmac('sha256', SECRET).update(h + '.' + p).digest('base64url') !== s) return null;
  const c = JSON.parse(Buffer.from(p, 'base64url')); if (c.exp < Date.now()) return null;
  return db.usuarios.find((u) => u.id === c.sub) || null;
}
const pub = (u) => ({ id: u.id, nombre: u.nombre, correo: u.correo, cargo: u.cargo || '' });
const esMiembro = (p, uid) => p.miembros.some((m) => m.usuarioId === uid);
function notificar(destId, mensaje) { db.notifs.unshift({ id: nid('n'), destinatarioId: destId, mensaje, fecha: Date.now(), leida: false }); }
function vista(p) {
  const ts = db.tareas.filter((t) => t.proyectoId === p.id), c = ts.filter((t) => t.estado === 'COMPLETADA').length;
  return { ...p, miembros: p.miembros.map((m) => ({ ...m, nombre: db.usuarios.find((u) => u.id === m.usuarioId)?.nombre ?? '?' })), totalTareas: ts.length, completadas: c, avance: ts.length ? Math.round((c * 100) / ts.length) : 0 };
}
const err = (res, code, msg) => send(res, code, { error: msg });
const send = (res, code, body) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(body === undefined ? '' : JSON.stringify(body)); };
const body = (req) => new Promise((r) => { let d = ''; req.on('data', (c) => (d += c)); req.on('end', () => { try { r(d ? JSON.parse(d) : {}); } catch { r({}); } }); });
const ESTADOS = ['PENDIENTE', 'EN_PROCESO', 'COMPLETADA'];
const NOMBRE_ESTADO = { PENDIENTE: 'pendiente', EN_PROCESO: 'en proceso', COMPLETADA: 'completada' };

async function api(req, res, url) {
  const m = req.method, p = url.pathname, seg = p.split('/').filter(Boolean); // api, recurso, ...
  if (p === '/api/test/reset' && m === 'POST') { seed(); return send(res, 204); }
  if (p === '/api/auth/register' && m === 'POST') {
    const b = await body(req);
    if (!/^\S+@\S+\.\S+$/.test(b.correo || '')) return err(res, 400, 'Correo inválido');
    if ((b.clave || '').length < 6) return err(res, 400, 'La contraseña debe tener al menos 6 caracteres');
    if (db.usuarios.some((u) => u.correo.toLowerCase() === b.correo.toLowerCase())) return err(res, 409, 'El correo ya está registrado');
    const u = { id: nid('u'), nombre: b.nombre || b.correo.split('@')[0], correo: b.correo, clave: hash(b.clave), cargo: 'Miembro' };
    db.usuarios.push(u); return send(res, 201, { token: sign(u), usuario: pub(u) });
  }
  if (p === '/api/auth/login' && m === 'POST') {
    const b = await body(req); const u = db.usuarios.find((x) => x.correo.toLowerCase() === (b.correo || '').toLowerCase());
    if (!u || u.clave !== hash(b.clave || '')) return err(res, 401, 'Correo o contraseña incorrectos');
    return send(res, 200, { token: sign(u), usuario: pub(u) });
  }
  const me = auth(req); if (!me) return err(res, 401, 'No autenticado');
  if (p === '/api/usuarios' && m === 'GET') return send(res, 200, db.usuarios.map(pub));
  if (p === '/api/proyectos' && m === 'GET') return send(res, 200, db.proyectos.filter((x) => esMiembro(x, me.id)).map(vista));
  if (p === '/api/proyectos' && m === 'POST') {
    const b = await body(req); if (!b.nombre) return err(res, 400, 'El nombre es obligatorio');
    const ids = [...new Set([me.id, ...(b.miembrosIds || [])])].filter((id) => db.usuarios.some((u) => u.id === id));
    const pr = { id: nid('p'), nombre: b.nombre, descripcion: b.descripcion || '', fechaLimite: b.fechaLimite || '', creadorId: me.id, miembros: ids.map((id) => ({ usuarioId: id, rol: id === me.id ? 'CREADOR' : 'MIEMBRO' })) };
    db.proyectos.push(pr); return send(res, 201, vista(pr));
  }
  if (seg[1] === 'proyectos' && seg[2]) {
    const pr = db.proyectos.find((x) => x.id === seg[2]); if (!pr) return err(res, 404, 'Proyecto no encontrado');
    if (!esMiembro(pr, me.id)) return err(res, 403, 'No perteneces a este proyecto');
    const esCreador = pr.creadorId === me.id;
    if (seg.length === 3 && m === 'GET') return send(res, 200, vista(pr));
    if (seg.length === 3 && m === 'DELETE') {
      if (!esCreador) return err(res, 403, 'Solo el creador puede eliminar el proyecto');
      if (db.tareas.some((t) => t.proyectoId === pr.id && t.estado !== 'COMPLETADA')) return err(res, 409, 'No se puede eliminar un proyecto con tareas sin completar (RN-04)');
      db.tareas = db.tareas.filter((t) => t.proyectoId !== pr.id); db.proyectos = db.proyectos.filter((x) => x !== pr); return send(res, 204);
    }
    if (seg[3] === 'tareas' && m === 'GET') return send(res, 200, db.tareas.filter((t) => t.proyectoId === pr.id));
    if (seg[3] === 'tareas' && m === 'POST') {
      const b = await body(req); if (!b.titulo) return err(res, 400, 'El título es obligatorio');
      if (b.asignadoId && !esMiembro(pr, b.asignadoId)) return err(res, 400, 'Solo se puede asignar a un miembro del proyecto (RN-01)');
      const t = { id: nid('t'), proyectoId: pr.id, titulo: b.titulo, descripcion: b.descripcion || '', prioridad: b.prioridad || 'MEDIA', estado: 'PENDIENTE', asignadoId: b.asignadoId || null, fechaLimite: b.fechaLimite || '', creadaEn: Date.now(), version: 0 };
      db.tareas.push(t);
      if (t.asignadoId) notificar(t.asignadoId, `Se te asignó la tarea "${t.titulo}" en ${pr.nombre}`);
      return send(res, 201, t);
    }
    if (seg[3] === 'miembros' && m === 'POST') {
      if (!esCreador) return err(res, 403, 'Solo el creador gestiona miembros'); const b = await body(req);
      if (!db.usuarios.some((u) => u.id === b.usuarioId)) return err(res, 404, 'Usuario no encontrado');
      if (!esMiembro(pr, b.usuarioId)) { pr.miembros.push({ usuarioId: b.usuarioId, rol: 'MIEMBRO' }); notificar(b.usuarioId, `Fuiste añadido al proyecto ${pr.nombre}`); }
      return send(res, 200, vista(pr));
    }
    if (seg[3] === 'miembros' && seg[4] && m === 'DELETE') {
      if (!esCreador) return err(res, 403, 'Solo el creador gestiona miembros'); if (seg[4] === pr.creadorId) return err(res, 400, 'No se puede quitar al creador (RN-06)');
      pr.miembros = pr.miembros.filter((x) => x.usuarioId !== seg[4]); db.tareas.forEach((t) => { if (t.proyectoId === pr.id && t.asignadoId === seg[4]) t.asignadoId = null; });
      return send(res, 200, vista(pr));
    }
  }
  if (p === '/api/tareas' && m === 'GET') { const ids = db.proyectos.filter((x) => esMiembro(x, me.id)).map((x) => x.id); return send(res, 200, db.tareas.filter((t) => ids.includes(t.proyectoId))); }
  if (seg[1] === 'tareas' && seg[2]) {
    const t = db.tareas.find((x) => x.id === seg[2]); if (!t) return err(res, 404, 'Tarea no encontrada');
    const pr = db.proyectos.find((x) => x.id === t.proyectoId); if (!esMiembro(pr, me.id)) return err(res, 404, 'Tarea no encontrada');
    if (seg[3] === 'estado' && m === 'PATCH') {
      const b = await body(req);
      if (!ESTADOS.includes(b.estado)) return err(res, 400, 'Estado inválido');
      if (t.asignadoId !== me.id) return err(res, 403, 'Solo el usuario asignado puede cambiar el estado de la tarea (RN-02)');
      if (b.version !== undefined && b.version !== t.version) return err(res, 409, 'La tarea fue modificada por otra persona; recarga e intenta de nuevo');
      if (t.estado === b.estado) return send(res, 200, t);
      t.estado = b.estado; t.version++;
      if (pr.creadorId !== me.id) notificar(pr.creadorId, `${me.nombre} cambió "${t.titulo}" a ${NOMBRE_ESTADO[b.estado]}`);
      return send(res, 200, t);
    }
    if (seg.length === 3 && m === 'PUT') {
      if (pr.creadorId !== me.id) return err(res, 403, 'Solo el creador del proyecto puede editar tareas'); const b = await body(req);
      if (b.asignadoId && !esMiembro(pr, b.asignadoId)) return err(res, 400, 'Solo se puede asignar a un miembro del proyecto (RN-01)');
      const antes = t.asignadoId; Object.assign(t, { titulo: b.titulo ?? t.titulo, descripcion: b.descripcion ?? t.descripcion, prioridad: b.prioridad ?? t.prioridad, fechaLimite: b.fechaLimite ?? t.fechaLimite, asignadoId: b.asignadoId === undefined ? t.asignadoId : (b.asignadoId || null) }); t.version++;
      if (t.asignadoId && t.asignadoId !== antes) notificar(t.asignadoId, `Se te asignó la tarea "${t.titulo}" en ${pr.nombre}`);
      return send(res, 200, t);
    }
    if (seg.length === 3 && m === 'DELETE') { if (pr.creadorId !== me.id) return err(res, 403, 'Solo el creador del proyecto puede eliminar tareas'); db.tareas = db.tareas.filter((x) => x !== t); return send(res, 204); }
  }
  if (p === '/api/notificaciones' && m === 'GET') return send(res, 200, db.notifs.filter((n) => n.destinatarioId === me.id).slice(0, 20));
  if (seg[1] === 'notificaciones' && seg[3] === 'leer' && m === 'POST') { const n = db.notifs.find((x) => x.id === seg[2] && x.destinatarioId === me.id); if (!n) return err(res, 404, 'No encontrada'); n.leida = true; return send(res, 200, n); }
  return err(res, 404, 'Ruta no encontrada');
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'https://localhost'); // base ficticia: solo se usa para separar ruta y query
  try {
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    // Se resuelve dentro de WEB y se descarta cualquier ruta que salga de él; si no es un archivo servible, se entrega index.html (SPA)
    let f = path.resolve(WEB, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
    const dentro = f === WEB || f.startsWith(WEB + path.sep);
    if (!dentro) f = path.join(WEB, 'index.html');
    else { try { if (fs.statSync(f).isDirectory()) f = path.join(WEB, 'index.html'); } catch { f = path.join(WEB, 'index.html'); } }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
  } catch (e) { console.error(e); err(res, 500, 'Error interno'); }
}).listen(PORT, () => console.log(`mock TaskFlow en http://localhost:${PORT}`));
