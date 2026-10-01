// Pruebas de caracterización (snapshot) para TaskFlow (pagina.html).
// Ejecuta el JavaScript de la página en Node con un DOM simulado, recorre los
// flujos principales y guarda el HTML/estado resultante. El mismo guion se corre
// ANTES y DESPUÉS de refactorizar; si los resultados difieren, el refactoring
// cambió el comportamiento.
//   node pruebas/snapshot_test.js antes/pagina.html  --guardar base.json
//   node pruebas/snapshot_test.js despues/pagina.html --comparar base.json
const fs = require('fs');
const vm = require('vm');

const [, , rutaHtml, modo, rutaJson] = process.argv;

function extraerScript(html) {
  const bloques = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  return bloques[bloques.length - 1][1];          // el último <script> es la app
}

function crearEntorno() {
  const elementos = {};
  const manejadores = {};
  let reloj = 0;
  const FIJO = new Date('2026-10-01T12:00:00Z').getTime();
  const FechaReal = Date;
  class FechaFija extends FechaReal {
    constructor(...a) { a.length === 0 ? super(FIJO) : super(...a); }
    static now() { return FIJO + reloj++; }       // determinista y sin ids repetidos
  }
  class ClassList {
    constructor() { this.s = new Set(); }
    add(...c) { c.forEach(x => this.s.add(x)); }
    remove(...c) { c.forEach(x => this.s.delete(x)); }
    toggle(c, f) { const on = f === undefined ? !this.s.has(c) : !!f; on ? this.s.add(c) : this.s.delete(c); return on; }
    contains(c) { return this.s.has(c); }
    forEach(fn) { [...this.s].forEach(fn); }
  }
  class El {
    constructor(id) {
      this.id = id; this.innerHTML = ''; this.textContent = ''; this.value = '';
      this.className = ''; this.classList = new ClassList(); this.dataset = {}; this.style = {};
    }
    addEventListener(tipo, fn) { manejadores[this.id + ':' + tipo] = fn; }
    reset() { this.value = ''; }
    closest() { return null; }
    querySelector() { return null; }
  }
  const obtener = id => (elementos[id] = elementos[id] || new El(id));
  const lista = [];
  const documento = {
    getElementById: obtener,
    querySelector: () => obtener('__selector__'),
    querySelectorAll: () => lista,
    addEventListener: (t, fn) => { manejadores['document:' + t] = fn; },
    documentElement: obtener('__html__'),
  };
  const almacen = new Map();
  const localStorage = {
    getItem: k => (almacen.has(k) ? almacen.get(k) : null),
    setItem: (k, v) => almacen.set(k, String(v)),
  };
  const ctx = vm.createContext({
    document: documento, localStorage, console, Date: FechaFija, JSON, Math, Set,
    confirm: () => true, setTimeout: () => 0, window: { matchMedia: () => ({ matches: false }) },
  });
  return { ctx, elementos, manejadores };
}

function correr(rutaHtml) {
  const { ctx, elementos, manejadores } = crearEntorno();
  vm.runInContext(extraerScript(fs.readFileSync(rutaHtml, 'utf8')), ctx);
  const ejecutar = js => vm.runInContext(js, ctx);
  const fijar = (id, v) => { elementos[id] = elementos[id] || ejecutar(`document.getElementById('${id}')`); elementos[id].value = v; };
  const enviar = id => manejadores[id + ':submit']({ preventDefault() {} });
  const pasos = {};
  const captura = nombre => {
    const dom = {};
    Object.keys(elementos).sort().forEach(id => {
      const e = elementos[id];
      dom[id] = { html: e.innerHTML, txt: e.textContent, val: e.value, cls: e.className, lc: [...e.classList.s].sort() };
    });
    pasos[nombre] = { dom, state: JSON.parse(ejecutar('JSON.stringify({u:state.users,p:state.projects,t:state.tasks,n:state.notifications,cu:state.currentUser,cp:state.currentProject})')) };
  };

  captura('00_carga_inicial');
  fijar('loginEmail', 'admin@gmail.com'); fijar('loginPassword', 'admin123'); enviar('loginForm');
  captura('01_login_admin');
  ['dashboard', 'projects', 'tasks', 'cronograma', 'team'].forEach(v => { ejecutar(`showView('${v}')`); captura('02_vista_' + v); });
  ['week', 'day', 'month'].forEach(m => { ejecutar(`setChronogramMode('${m}')`); captura('03_cronograma_' + m); });
  ['p1', 'p2'].forEach(p => { ejecutar(`openProjectDetail('${p}')`); captura('04_detalle_' + p); });
  ejecutar(`openProjectDetail('p1')`); ejecutar('openProjectMembersModal()'); captura('05_modal_miembros_p1');

  // Tareas: crear asignada, crear sin asignar, editar estado, eliminar
  ejecutar('openTaskModal()'); captura('06_modal_tarea_nueva');
  fijar('taskId', ''); fijar('taskTitle', 'Tarea de prueba A'); fijar('taskDesc', 'Descripción A');
  fijar('taskPriority', 'Alta'); fijar('taskStatus', 'pending'); fijar('taskAssignee', 'u2'); fijar('taskDeadline', '2026-11-20');
  enviar('taskForm'); captura('07_tarea_creada_asignada');
  fijar('taskId', ''); fijar('taskTitle', 'Tarea de prueba B'); fijar('taskAssignee', ''); fijar('taskPriority', 'Baja');
  enviar('taskForm'); captura('08_tarea_creada_sin_asignar');
  ejecutar(`openTaskModal('t2')`); captura('09_modal_tarea_editar');
  fijar('taskId', 't2'); fijar('taskStatus', 'completed'); enviar('taskForm'); captura('10_tarea_estado_completada');
  ejecutar(`deleteTask('t3')`); captura('11_tarea_eliminada');
  ejecutar('showView("tasks")'); captura('12_todas_las_tareas');

  // Proyectos: crear, editar, eliminar
  ejecutar('openProjectModal()');
  fijar('projectId', ''); fijar('projectName', 'Proyecto de prueba'); fijar('projectDesc', 'Desc'); fijar('projectDeadline', '2026-12-31');
  enviar('projectForm'); captura('13_proyecto_creado');
  ejecutar(`openProjectModal('p2')`); fijar('projectId', 'p2'); fijar('projectName', 'App Móvil v2'); enviar('projectForm'); captura('14_proyecto_editado');
  ejecutar(`deleteProject('p2')`); captura('15_proyecto_eliminado');

  // Equipo y miembros
  ejecutar('showView("team")'); ['__none__', 'p1', ''].forEach(f => { ejecutar(`filterTeamByProject('${f}')`); captura('16_equipo_filtro_' + (f || 'todos')); });
  ejecutar(`openEditMemberProfile('u2')`); captura('17_modal_editar_perfil');
  fijar('teamModalDummy', ''); fijar('editMemberId', 'u2'); fijar('editMemberRole', 'Tester'); ejecutar('saveEditMemberProfile()'); captura('18_perfil_guardado');
  fijar('memberName', 'Nuevo Miembro'); fijar('memberEmail', 'nuevo@taskflow.com'); fijar('memberRole', 'Analista'); enviar('teamForm'); captura('19_miembro_agregado');
  ejecutar(`state.currentProject = 'p1'`); fijar('projectMemberSelect', ejecutar('state.users[state.users.length-1].id')); ejecutar('addProjectMember()'); captura('20_miembro_en_proyecto');
  ejecutar(`removeProjectMember('u2')`); captura('21_miembro_quitado');
  ejecutar(`deleteTeamMember('u3')`); captura('22_miembro_eliminado');

  // Notificaciones, registro, tema, cierre de sesión
  ejecutar('toggleNotifications()'); captura('23_notificaciones_abiertas');
  ejecutar('clearNotifications()'); captura('24_notificaciones_vaciadas');
  ejecutar('toggleTheme()'); captura('25_tema_oscuro');
  ejecutar('logout()'); fijar('regEmail', 'maria.lopez@correo.com'); fijar('regPassword', 'secreto1'); enviar('registerForm'); captura('26_registro');
  ejecutar('showView("dashboard")'); captura('27_dashboard_usuario_nuevo');
  return pasos;
}

const resultado = correr(rutaHtml);
const texto = JSON.stringify(resultado, null, 1);
if (modo === '--guardar') {
  fs.writeFileSync(rutaJson, texto);
  console.log(`Guardados ${Object.keys(resultado).length} pasos en ${rutaJson}`);
} else if (modo === '--comparar') {
  const base = JSON.parse(fs.readFileSync(rutaJson, 'utf8'));
  let fallos = 0;
  Object.keys(base).forEach(p => {
    const igual = JSON.stringify(base[p]) === JSON.stringify(resultado[p]);
    console.log(`  ${igual ? 'ok  ' : 'FAIL'}  ${p}`);
    if (!igual) fallos++;
  });
  console.log(fallos === 0 ? `Resultado: OK (${Object.keys(base).length} pasos idénticos)` : `Resultado: FALLÓ (${fallos} pasos difieren)`);
  process.exit(fallos === 0 ? 0 : 1);
}
