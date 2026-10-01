// Pruebas de Caja Negra de TaskFlow: se diseñan solo con entradas y salidas esperadas
// (criterios de aceptación), usando los formularios de la aplicación como un usuario.
// Ejecutar desde la raíz del repositorio:  node --test pruebas/caja_negra.test.js
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { cargarApp } = require('./entorno');

const visible = (app, id) => !app.el(id).classList.contains('hidden');
const registrar = (app, correo, clave) => { app.fijar('regEmail', correo); app.fijar('regPassword', clave); app.enviar('registerForm'); };
const iniciar = (app, correo, clave) => { app.fijar('loginEmail', correo); app.fijar('loginPassword', clave); app.enviar('loginForm'); };

// ---------------------------------------------------------------- CN-01 (RF01)
describe('CN-01 Registro de usuarios (RF01): particiones de equivalencia y valores límite', () => {
  test('CN-01a correo válido y contraseña de 6 caracteres (límite válido) -> cuenta creada y sesión iniciada', () => {
    const app = cargarApp();
    const antes = app.state.users.length;
    registrar(app, 'maria.lopez@correo.com', '123456');
    assert.equal(app.state.users.length, antes + 1);
    assert.equal(app.state.currentUser.email, 'maria.lopez@correo.com');
    assert.equal(app.state.currentUser.name, 'Maria Lopez');
  });
  test('CN-01b contraseña de 5 caracteres (límite inválido) -> error y no se crea la cuenta', () => {
    const app = cargarApp();
    const antes = app.state.users.length;
    registrar(app, 'nuevo@correo.com', '12345');
    assert.equal(app.el('registerError').textContent, 'La contraseña debe tener al menos 6 caracteres.');
    assert.equal(visible(app, 'registerError'), true);
    assert.equal(app.state.users.length, antes);
  });
  test('CN-01c correo sin arroba (clase inválida) -> error', () => {
    const app = cargarApp();
    registrar(app, 'correo-sin-arroba', '123456');
    assert.equal(app.el('registerError').textContent, 'Ingresa un correo electrónico válido.');
  });
  test('CN-01d correo ya registrado, aunque cambien las mayúsculas -> error', () => {
    const app = cargarApp();
    registrar(app, 'ADMIN@gmail.com', '123456');          // existe admin@gmail.com
    assert.equal(app.el('registerError').textContent, 'Este correo ya está registrado. Inicia sesión.');
  });
});

// ---------------------------------------------------------------- CN-02 (RF02)
describe('CN-02 Inicio de sesión (RF02)', () => {
  test('CN-02a credenciales correctas -> accede al sistema', () => {
    const app = cargarApp();
    iniciar(app, 'admin@gmail.com', 'admin123');
    assert.equal(app.state.currentUser.id, 'u1');
    assert.equal(visible(app, 'appScreen'), true);
  });
  test('CN-02b contraseña incorrecta -> mensaje de error y sin sesión', () => {
    const app = cargarApp();
    iniciar(app, 'admin@gmail.com', 'otra');
    assert.equal(app.el('loginError').textContent, 'Credenciales incorrectas. Verifica tu correo y contraseña.');
    assert.equal(app.state.currentUser, null);
  });
  test('CN-02c correo inexistente -> mismo mensaje de error', () => {
    const app = cargarApp();
    iniciar(app, 'nadie@correo.com', 'admin123');
    assert.equal(app.el('loginError').textContent, 'Credenciales incorrectas. Verifica tu correo y contraseña.');
  });
  test('CN-02d cerrar sesión -> vuelve a la pantalla de acceso', () => {
    const app = cargarApp();
    iniciar(app, 'admin@gmail.com', 'admin123');
    app.ev('logout()');
    assert.equal(app.state.currentUser, null);
    assert.equal(visible(app, 'loginScreen'), true);
  });
});

// ---------------------------------------------------- CN-03 (HU-02 / CU06 / RF06 / RF11)
describe('CN-03 Asignar tarea y notificar (HU-02, RF06, RF11)', () => {
  const crear = (app, titulo, asignado) => {
    iniciar(app, 'admin@gmail.com', 'admin123');
    app.ev(`openProjectDetail('p1')`);
    ['taskId', 'taskDesc', 'taskDeadline'].forEach(c => app.fijar(c, ''));
    app.fijar('taskTitle', titulo); app.fijar('taskPriority', 'Alta'); app.fijar('taskStatus', 'pending');
    app.fijar('taskAssignee', asignado);
    app.enviar('taskForm');
  };
  test('CN-03a tarea asignada a un usuario -> se guarda con ese responsable y se notifica con su nombre', () => {
    const app = cargarApp();
    crear(app, 'Probar API', 'u2');
    const t = app.state.tasks.at(-1);
    assert.equal(t.title, 'Probar API');
    assert.equal(t.assigneeId, 'u2');
    assert.equal(app.state.notifications[0].message, 'Tarea "Probar API" asignada a Ronald Alexander Sandoval');
  });
  test('CN-03b tarea sin asignar -> se guarda sin responsable y la notificación lo indica', () => {
    const app = cargarApp();
    crear(app, 'Sin dueño', '');
    assert.equal(app.state.tasks.at(-1).assigneeId, '');
    assert.equal(app.state.notifications[0].message, 'Nueva tarea creada: Sin dueño');
  });
  test('CN-03c cambiar el estado a completada -> el progreso del proyecto sube', () => {
    const app = cargarApp();
    iniciar(app, 'admin@gmail.com', 'admin123');
    app.ev(`openProjectDetail('p1')`);
    const antes = app.ev(`getProjectStats('p1').pct`);           // 1 de 4 completadas = 25 %
    app.ev(`openTaskModal('t2')`); app.fijar('taskId', 't2'); app.fijar('taskStatus', 'completed');
    app.fijar('taskTitle', 'Implementar base de datos'); app.fijar('taskPriority', 'Alta'); app.fijar('taskAssignee', 'u2');
    app.enviar('taskForm');
    assert.equal(antes, 25);
    assert.equal(app.ev(`getProjectStats('p1').pct`), 50);
  });
});

// ---------------------------------------------------------------- CN-04 (HU01)
describe('CN-04 Gestión de proyectos (HU01: crear, editar, eliminar, guardar cambios)', () => {
  const guardarProyecto = (app, id, nombre) => {
    app.fijar('projectId', id); app.fijar('projectName', nombre); app.fijar('projectDesc', 'Desc'); app.fijar('projectDeadline', '2026-12-31');
    app.enviar('projectForm');
  };
  const sesion = () => { const app = cargarApp(); iniciar(app, 'admin@gmail.com', 'admin123'); return app; };
  test('CN-04a crear proyecto -> aparece en la lista y se guarda en el almacenamiento', () => {
    const app = sesion();
    const antes = app.state.projects.length;
    guardarProyecto(app, '', 'Proyecto nuevo');
    assert.equal(app.state.projects.length, antes + 1);
    assert.match(app.almacen.get('taskflow_state'), /Proyecto nuevo/);
  });
  test('CN-04b editar proyecto -> el nombre cambia y no se duplica', () => {
    const app = sesion();
    const antes = app.state.projects.length;
    guardarProyecto(app, 'p2', 'App Móvil v2');
    assert.equal(app.state.projects.length, antes);
    assert.equal(app.state.projects.find(p => p.id === 'p2').name, 'App Móvil v2');
  });
  test('CN-04c eliminar proyecto -> desaparece junto con sus tareas', () => {
    const app = sesion();
    app.ev(`deleteProject('p2')`);
    assert.equal(app.state.projects.some(p => p.id === 'p2'), false);
    assert.equal(app.state.tasks.some(t => t.projectId === 'p2'), false);
    assert.equal(app.state.tasks.some(t => t.projectId === 'p1'), true);     // las de otros proyectos se conservan
  });
});

// ---------------------------------------------------------------- CN-05 (RF08)
describe('CN-05 Visualizar progreso (RF08): 0 %, intermedio y 100 %', () => {
  const progreso = (estados) => {
    const app = cargarApp();
    app.state.projects = [{ id: 'px', name: 'X', color: 'indigo', members: [] }];
    app.state.tasks = estados.map((s, i) => ({ id: 't' + i, projectId: 'px', title: 'T', priority: 'Media', status: s, assigneeId: '' }));
    return app.ev(`getProjectStats('px').pct`);
  };
  test('CN-05a sin tareas -> 0 %', () => assert.equal(progreso([]), 0));
  test('CN-05b 1 de 2 completadas -> 50 %', () => assert.equal(progreso(['completed', 'pending']), 50));
  test('CN-05c todas completadas -> 100 %', () => assert.equal(progreso(['completed', 'completed']), 100));
});
