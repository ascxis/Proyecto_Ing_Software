// Pruebas unitarias de TaskFlow (Caja Blanca) con dobles de prueba.
// Ejecutar desde la raíz del repositorio:  node --test pruebas/unitarias.test.js
const { test, mock, describe } = require('node:test');
const assert = require('node:assert/strict');
const { cargarApp, FIJO } = require('./entorno');

const usuario = (id, name, extra = {}) => ({ id, name, email: id + '@t.com', password: 'x', role: 'Dev', ...extra });
const tarea = (id, projectId, status, assigneeId = '') => ({ id, projectId, title: 'T' + id, priority: 'Media', status, assigneeId });

// ---------------------------------------------------------------- getInitials
describe('getInitials (sin dobles: función pura)', () => {
  const { ev } = cargarApp();
  const ini = n => ev(`getInitials(${JSON.stringify(n)})`);
  test('dos palabras -> dos iniciales en mayúscula', () => assert.equal(ini('juan beltrán'), 'JB'));
  test('una palabra -> una inicial', () => assert.equal(ini('Administrador'), 'A'));
  test('tres palabras -> solo las dos primeras', () => assert.equal(ini('Ronald Alexander Sandoval'), 'RA'));
  // BUG-01 (antes D1): con dos espacios seguidos se perdía la segunda inicial. Corregido en v0.1.1.
  test('BUG-01: nombre con doble espacio conserva ambas iniciales', () => assert.equal(ini('Ana  Pérez'), 'AP'));
  test('regresión BUG-01: espacios al inicio y al final se ignoran', () => assert.equal(ini('  Ana Pérez  '), 'AP'));
  test('regresión BUG-01: separadores que no son espacio (tabulación) también separan', () => assert.equal(ini('Ana\tPérez'), 'AP'));
  test('regresión BUG-01: cadena vacía -> sin iniciales', () => assert.equal(ini(''), ''));
});

// ------------------------------------------------------------ getProjectStats
describe('getProjectStats (stub: state.tasks con datos fijos)', () => {
  const stats = (tareas, id = 'p1') => {
    const app = cargarApp();
    app.state.tasks = tareas;
    return app.ev(`getProjectStats('${id}')`);
  };
  test('proyecto sin tareas -> 0 %', () => assert.deepEqual(
    (({ completed, pct }) => ({ completed, pct }))(stats([])), { completed: 0, pct: 0 }));
  test('1 de 3 completadas -> 33 % (redondeo)', () => assert.equal(stats([
    tarea('a', 'p1', 'completed'), tarea('b', 'p1', 'pending'), tarea('c', 'p1', 'progress')]).pct, 33));
  test('2 de 3 completadas -> 67 % (redondeo hacia arriba)', () => assert.equal(stats([
    tarea('a', 'p1', 'completed'), tarea('b', 'p1', 'completed'), tarea('c', 'p1', 'pending')]).pct, 67));
  test('todas completadas -> 100 %', () => assert.equal(stats([tarea('a', 'p1', 'completed')]).pct, 100));
  test('ignora las tareas de otros proyectos', () => {
    const r = stats([tarea('a', 'p1', 'completed'), tarea('b', 'p2', 'pending'), tarea('c', 'p2', 'pending')]);
    assert.equal(r.tasks.length, 1);
    assert.equal(r.pct, 100);
  });
});

// -------------------------------------------------------------------- timeAgo
describe('timeAgo (stub: reloj fijo en lugar de Date.now real)', () => {
  const MIN = 60000, H = 60 * MIN, D = 24 * H;
  const hace = ms => { const app = cargarApp(); app.reloj.autoincremento = false; return app.ev(`timeAgo(${FIJO - ms})`); };
  test('menos de 1 minuto -> "Ahora"', () => assert.equal(hace(59 * 1000), 'Ahora'));
  test('límite: exactamente 1 minuto -> "Hace 1 min"', () => assert.equal(hace(MIN), 'Hace 1 min'));
  test('59 minutos -> "Hace 59 min"', () => assert.equal(hace(59 * MIN), 'Hace 59 min'));
  test('límite: 60 minutos -> "Hace 1h"', () => assert.equal(hace(60 * MIN), 'Hace 1h'));
  test('23 horas -> "Hace 23h"', () => assert.equal(hace(23 * H), 'Hace 23h'));
  test('límite: 24 horas -> "Hace 1d"', () => assert.equal(hace(24 * H), 'Hace 1d'));
  test('fecha futura (reloj desajustado) -> "Ahora"', () => assert.equal(hace(-5 * MIN), 'Ahora'));
});

// ------------------------------------------- funciones del cronograma (puras)
describe('funciones de fecha del cronograma (sin dobles)', () => {
  const { ev } = cargarApp();
  test('shortDate -> día/mes sin ceros', () => assert.equal(ev(`shortDate(new Date(2026, 9, 5))`), '5/10'));
  test('tickLabel modo mes: enero incluye el año', () => assert.equal(ev(`tickLabel(new Date(2027, 0, 1), 'month')`), "ene '27"));
  test('tickLabel modo mes: otro mes -> solo el mes', () => assert.equal(ev(`tickLabel(new Date(2026, 9, 1), 'month')`), 'oct'));
  test('tickLabel modo semana -> día y mes', () => assert.equal(ev(`tickLabel(new Date(2026, 9, 5), 'week')`), '5 oct'));
  test('tickLabel modo día: el día 1 muestra el mes', () => assert.equal(ev(`tickLabel(new Date(2026, 9, 1), 'day')`), 'oct 1'));
  test('tickLabel modo día: otro día -> solo el número', () => assert.equal(ev(`tickLabel(new Date(2026, 9, 7), 'day')`), '7'));
  test('thinTicks no recorta si hay pocas marcas', () => assert.equal(ev(`thinTicks([1,2,3], 5).length`), 3));
  test('thinTicks recorta a un máximo razonable', () => assert.equal(ev(`thinTicks(Array.from({length: 30}, (_, i) => i), 10).length`), 10));
  test('buildTicks modo día: una marca por día', () => assert.equal(
    ev(`buildTicks(new Date(2026, 9, 1), new Date(2026, 9, 5), 'day').length`), 5));
  test('buildTicks modo mes: una marca por mes que empieza', () => assert.equal(
    ev(`buildTicks(new Date(2026, 8, 1), new Date(2026, 11, 31), 'month').length`), 4));
  test('buildTicks: los porcentajes quedan entre 0 y 100', () => assert.equal(
    ev(`buildTicks(new Date(2026, 9, 1), new Date(2026, 9, 11), 'day').every(t => t.pct >= 0 && t.pct <= 100)`), true));
  test('priorityDot: Baja -> verde; otras -> vacío', () => {
    assert.equal(ev(`priorityDot('Baja')`), 'bg-green-500');
    assert.equal(ev(`priorityDot('Alta')`), '');
  });
  test('getChronogramRange amplía 2 días a cada lado del rango de datos', () => {
    const r = ev(`(() => { const now = new Date(2026, 9, 10);
      const it = [{ start: new Date(2026, 9, 5), end: new Date(2026, 9, 20) }];
      const { min, max } = getChronogramRange(it, [], now);
      return [min.getDate(), max.getDate()]; })()`);
    assert.deepEqual([...r], [3, 22]);
  });
});

// ---------------------------------------------------------- getTeamColleagues
describe('getTeamColleagues (stub: usuarios y proyectos fijos)', () => {
  const colegas = (proyectos, actual = 'u1') => {
    const app = cargarApp();
    app.state.users = [usuario('u1', 'Ana'), usuario('u2', 'Beto'), usuario('u3', 'Cami')];
    app.state.projects = proyectos;
    app.state.currentUser = app.state.users.find(u => u.id === actual);
    return [...app.ev('getTeamColleagues()')].map(u => u.id).sort();
  };
  test('sin proyectos en equipo -> solo yo', () => assert.deepEqual(colegas([]), ['u1']));
  test('proyecto en equipo compartido -> incluye a los miembros', () => assert.deepEqual(
    colegas([{ id: 'p1', team: true, members: ['u1', 'u2'] }]), ['u1', 'u2']));
  test('proyecto en equipo donde no estoy -> no veo a sus miembros', () => assert.deepEqual(
    colegas([{ id: 'p1', team: true, members: ['u2', 'u3'] }]), ['u1']));
  test('proyecto individual no cuenta como equipo', () => assert.deepEqual(
    colegas([{ id: 'p1', team: false, members: ['u1', 'u2'] }]), ['u1']));
});

// ------------------------------------------------------------ addNotification
describe('addNotification (stub de save y updateNotifBadge; mock donde la interacción importa)', () => {
  const preparar = () => {
    const app = cargarApp();
    app.state.notifications = [];
    const save = app.reemplazar('save', mock.fn());                 // MOCK: debe persistir
    app.reemplazar('updateNotifBadge', () => {});                   // STUB: no importa cómo se actualice
    return { app, save };
  };
  test('agrega la notificación al inicio, sin leer, y persiste exactamente una vez', () => {
    const { app, save } = preparar();
    app.ev(`addNotification('Primera')`); app.ev(`addNotification('Segunda')`);
    assert.equal(app.state.notifications[0].message, 'Segunda');
    assert.equal(app.state.notifications[0].read, false);
    assert.equal(save.mock.callCount(), 2);                        // una por cada llamada
  });
  test('conserva como máximo las últimas 20 (límite)', () => {
    const { app } = preparar();
    for (let i = 1; i <= 21; i++) app.ev(`addNotification('N${i}')`);
    assert.equal(app.state.notifications.length, 20);
    assert.equal(app.state.notifications[0].message, 'N21');
    assert.equal(app.state.notifications.at(-1).message, 'N2');    // la N1 se descartó
  });
  test('con exactamente 20 no descarta ninguna', () => {
    const { app } = preparar();
    for (let i = 1; i <= 20; i++) app.ev(`addNotification('N${i}')`);
    assert.equal(app.state.notifications.length, 20);
  });
});

// ----------------------------------------------------------------- deleteTask
describe('deleteTask (stub de confirm; mock de save y showToast)', () => {
  const preparar = (confirmacion) => {
    const app = cargarApp();
    app.state.tasks = [tarea('t1', 'p1', 'pending'), tarea('t2', 'p1', 'pending')];
    app.reemplazar('confirm', () => confirmacion);                 // STUB: respuesta fija del usuario
    app.reemplazar('renderProjectDetail', () => {});               // STUB
    app.reemplazar('renderDashboard', () => {});                   // STUB
    const save = app.reemplazar('save', mock.fn());                // MOCK: persistencia
    const toast = app.reemplazar('showToast', mock.fn());          // MOCK: mensaje al usuario
    return { app, save, toast };
  };
  test('si el usuario confirma: elimina solo esa tarea, guarda una vez y avisa', () => {
    const { app, save, toast } = preparar(true);
    app.ev(`deleteTask('t1')`);
    assert.deepEqual(app.state.tasks.map(t => t.id), ['t2']);
    assert.equal(save.mock.callCount(), 1);
    assert.equal(toast.mock.calls[0].arguments[0], 'Tarea eliminada');
  });
  test('si el usuario cancela: no cambia nada, no guarda y no avisa', () => {
    const { app, save, toast } = preparar(false);
    app.ev(`deleteTask('t1')`);
    assert.equal(app.state.tasks.length, 2);
    assert.equal(save.mock.callCount(), 0);
    assert.equal(toast.mock.callCount(), 0);
  });
  test('un id inexistente no elimina nada', () => {
    const { app } = preparar(true);
    app.ev(`deleteTask('zzz')`);
    assert.equal(app.state.tasks.length, 2);
  });
});

// ------------------------------------------------- removeProjectMember (V(G) = 8)
// Un caso de prueba por cada camino independiente del método (ver FPI-14, sección C.2).
describe('removeProjectMember: 8 caminos independientes (Camino Básico)', () => {
  function preparar({ proyecto, tareas = [], confirmacion = true }) {
    const app = cargarApp();
    app.state.users = [usuario('u1', 'Ana'), usuario('u2', 'Beto'), usuario('u3', 'Cami')];
    app.state.projects = proyecto ? [proyecto] : [];
    app.state.tasks = tareas;
    app.state.currentProject = 'p1';
    app.reemplazar('confirm', () => confirmacion);                       // STUB
    ['renderProjectMembersList', 'renderProjectDetail', 'renderTeam'].forEach(f => app.reemplazar(f, () => {}));   // STUBS
    const save = app.reemplazar('save', mock.fn());                      // MOCK
    const toast = app.reemplazar('showToast', mock.fn());                // MOCK
    return { app, save, toast };
  }
  const equipo = (extra = {}) => ({ id: 'p1', name: 'P', team: true, ownerId: 'u1', members: ['u1', 'u2', 'u3'], ...extra });

  test('C1: no hay proyecto actual -> no hace nada', () => {
    const { app, save } = preparar({ proyecto: null });
    app.ev(`removeProjectMember('u2')`);
    assert.equal(save.mock.callCount(), 0);
  });
  test('C2: intentar quitar al creador -> avisa y no cambia', () => {
    const { app, save, toast } = preparar({ proyecto: equipo() });
    app.ev(`removeProjectMember('u1')`);
    assert.deepEqual([...app.state.projects[0].members], ['u1', 'u2', 'u3']);
    assert.equal(save.mock.callCount(), 0);
    assert.equal(toast.mock.calls[0].arguments[0], 'No puedes eliminar al creador del proyecto');
  });
  test('C3: el usuario cancela la confirmación -> no cambia', () => {
    const { app, save } = preparar({ proyecto: equipo(), confirmacion: false });
    app.ev(`removeProjectMember('u2')`);
    assert.equal(app.state.projects[0].members.length, 3);
    assert.equal(save.mock.callCount(), 0);
  });
  test('C4: el proyecto no tiene lista de miembros (undefined) -> queda vacía y guarda', () => {
    const { app, save } = preparar({ proyecto: equipo({ members: undefined }) });
    app.ev(`removeProjectMember('u2')`);
    assert.deepEqual([...app.state.projects[0].members], []);
    assert.equal(save.mock.callCount(), 1);
  });
  test('C5: confirma y no hay tareas (el bucle no se ejecuta) -> quita al miembro', () => {
    const { app, save } = preparar({ proyecto: equipo() });
    app.ev(`removeProjectMember('u2')`);
    assert.deepEqual([...app.state.projects[0].members], ['u1', 'u3']);
    assert.equal(save.mock.callCount(), 1);
  });
  test('C6: tarea de OTRO proyecto asignada al miembro -> no se toca', () => {
    const { app } = preparar({ proyecto: equipo(), tareas: [tarea('t1', 'p2', 'pending', 'u2')] });
    app.ev(`removeProjectMember('u2')`);
    assert.equal(app.state.tasks[0].assigneeId, 'u2');
  });
  test('C7: tarea del proyecto asignada a OTRO usuario -> no se toca', () => {
    const { app } = preparar({ proyecto: equipo(), tareas: [tarea('t1', 'p1', 'pending', 'u3')] });
    app.ev(`removeProjectMember('u2')`);
    assert.equal(app.state.tasks[0].assigneeId, 'u3');
  });
  test('C8: tarea del proyecto asignada al miembro quitado -> queda sin asignar', () => {
    const { app } = preparar({ proyecto: equipo(), tareas: [tarea('t1', 'p1', 'pending', 'u2'), tarea('t2', 'p1', 'pending', 'u3')] });
    app.ev(`removeProjectMember('u2')`);
    assert.equal(app.state.tasks[0].assigneeId, '');
    assert.equal(app.state.tasks[1].assigneeId, 'u3');
  });
});
