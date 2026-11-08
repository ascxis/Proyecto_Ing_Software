// Prueba de carga del endpoint más crítico: PATCH /api/tareas/{id}/estado (RN-02 + control de versión).
// Rampa de máximo 50 usuarios virtuales. SOLO contra entornos locales/de CI (guarda anti-producción).
import http from 'k6/http';
import { check } from 'k6';

const BASE = __ENV.BASE_URL || 'http://localhost:8080';
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE)) {
  throw new Error(`BASE_URL ${BASE} no es local: la prueba de carga nunca debe apuntar a producción`);
}
const H = { 'Content-Type': 'application/json' };
const auth = (t) => ({ headers: { ...H, Authorization: `Bearer ${t}` } });
const ESTADOS = ['EN_PROCESO', 'COMPLETADA', 'PENDIENTE'];
const VUS = 50;

export const options = {
  stages: [
    { duration: '20s', target: VUS },   // rampa de subida hasta 50 VU
    { duration: '30s', target: VUS },   // sostenido
    { duration: '10s', target: 0 },     // bajada
  ],
  thresholds: {
    http_req_duration: ['p(95)<800'],   // p95 < 800 ms (escenario S-4)
    http_req_failed: ['rate<0.01'],     // < 1 % de errores
    checks: ['rate>0.99'],
  },
};

function registrar(nombre) {
  const correo = `${nombre}-${Math.random().toString(36).slice(2)}@k6.test`;
  const j = http.post(`${BASE}/api/auth/register`, JSON.stringify({ nombre, correo, clave: 'secreto1' }), { headers: H }).json();
  return { id: String(j.usuario.id), token: j.token };
}

export function setup() {
  const ana = registrar('Ana'), beto = registrar('Beto');
  const p = http.post(`${BASE}/api/proyectos`, JSON.stringify({ nombre: 'rampa', descripcion: 'k6', fechaLimite: '2026-12-31', miembrosIds: [beto.id] }), auth(ana.token)).json();
  const tareas = [];
  for (let i = 0; i < VUS; i++) {
    const t = http.post(`${BASE}/api/proyectos/${p.id}/tareas`, JSON.stringify({ titulo: `r${i}`, descripcion: 'x', prioridad: 'ALTA', fechaLimite: '2026-12-01', asignadoId: beto.id }), auth(ana.token)).json();
    tareas.push({ id: t.id, version: t.version });
  }
  return { beto, tareas };
}

const estado = {};   // versión y paso por VU (cada VU usa su propia tarea: sin conflictos artificiales)
export default function (d) {
  const mi = d.tareas[(__VU - 1) % d.tareas.length];
  const s = (estado[__VU] ||= { v: mi.version, paso: 0 });
  const r = http.patch(`${BASE}/api/tareas/${mi.id}/estado`, JSON.stringify({ estado: ESTADOS[s.paso % 3], version: s.v }), auth(d.beto.token));
  const ok = check(r, { 'estado cambiado (200)': (x) => x.status === 200 });
  if (ok) { s.v = r.json().version; s.paso++; }
}
