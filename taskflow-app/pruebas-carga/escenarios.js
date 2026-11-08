// Verificación de los escenarios de calidad S-1, S-3 y S-4 (FPI-18) contra la API real con PostgreSQL.
import http from 'k6/http';
import { check } from 'k6';
import { Counter, Trend } from 'k6/metrics';

const BASE = __ENV.BASE_URL || 'http://localhost:8080';
const JSON_H = { 'Content-Type': 'application/json' };

const s1_rechazos = new Counter('s1_rechazos_403');
const s1_fallos   = new Counter('s1_fallos');
const s3_pares    = new Counter('s3_pares');
const s3_perdidas = new Counter('s3_actualizaciones_perdidas'); // pares con dos 200 o ningún 200
const s1_latencia = new Trend('s1_latencia_ms', true);

export const options = {
  scenarios: {
    s3_concurrencia: { executor: 'shared-iterations', vus: 1, iterations: 1, exec: 's3', startTime: '0s' },
    s1_seguridad:    { executor: 'shared-iterations', vus: 1, iterations: 1, exec: 's1', startTime: '20s' },
    s4_carga:        { executor: 'constant-vus', vus: 20, duration: '30s', exec: 's4', startTime: '30s' },
  },
  thresholds: {
    's3_actualizaciones_perdidas': ['count==0'],
    's3_pares': ['count==100'],
    's1_fallos': ['count==0'],
    's1_rechazos_403': ['count==40'],
    's1_latencia_ms': ['p(100)<300'],
    'http_req_duration{scenario:s4_carga}': ['p(95)<800'],
    'http_req_failed{scenario:s4_carga}': ['rate<0.01'],
  },
};

function registrar(nombre) {
  const correo = `${nombre}-${Math.random().toString(36).slice(2)}@k6.test`;
  const r = http.post(`${BASE}/api/auth/register`, JSON.stringify({ nombre, correo, clave: 'secreto1' }), { headers: JSON_H });
  const j = r.json();
  return { id: String(j.usuario.id), token: j.token };
}
const auth = (t) => ({ headers: { ...JSON_H, Authorization: `Bearer ${t}` } });

export function setup() {
  const ana = registrar('Ana'), beto = registrar('Beto');
  const p = http.post(`${BASE}/api/proyectos`, JSON.stringify({ nombre: 'k6', descripcion: 'carga', fechaLimite: '2026-12-31', miembrosIds: [beto.id] }), auth(ana.token)).json();
  const tareas = [];
  for (let i = 0; i < 100; i++) {
    const t = http.post(`${BASE}/api/proyectos/${p.id}/tareas`, JSON.stringify({ titulo: `t${i}`, descripcion: 'x', prioridad: 'ALTA', fechaLimite: '2026-12-01', asignadoId: beto.id }), auth(ana.token)).json();
    tareas.push(t.id);
  }
  return { ana, beto, tareas };
}

// S-3: dos cambios simultáneos con la misma versión sobre la misma tarea: exactamente uno debe ganar (200) y el otro recibir 409.
export function s3(d) {
  for (const id of d.tareas) {
    const url = `${BASE}/api/tareas/${id}/estado`;
    const rs = http.batch([
      ['PATCH', url, JSON.stringify({ estado: 'EN_PROCESO', version: 0 }), auth(d.beto.token)],
      ['PATCH', url, JSON.stringify({ estado: 'COMPLETADA', version: 0 }), auth(d.beto.token)],
    ]);
    const ok = rs.filter((r) => r.status === 200).length, conf = rs.filter((r) => r.status === 409).length;
    s3_pares.add(1);
    if (!(ok === 1 && conf === 1)) s3_perdidas.add(1);
  }
}

// S-1: quien NO es el asignado (Ana) intenta cambiar el estado: 403 y la tarea no cambia.
export function s1(d) {
  for (let i = 0; i < 40; i++) {
    const r = http.patch(`${BASE}/api/tareas/${d.tareas[i]}/estado`, JSON.stringify({ estado: 'COMPLETADA', version: 5 }), auth(d.ana.token));
    s1_latencia.add(r.timings.duration);
    if (r.status === 403) s1_rechazos.add(1); else s1_fallos.add(1);
  }
}

// S-4: 20 usuarios concurrentes listan sus tareas.
export function s4(d) {
  const r = http.get(`${BASE}/api/tareas`, auth(d.beto.token));
  check(r, { 'lista 200': (x) => x.status === 200 });
}
