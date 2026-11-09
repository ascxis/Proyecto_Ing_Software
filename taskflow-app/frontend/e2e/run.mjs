// Pruebas de extremo a extremo: navegador real (Chromium) contra la interfaz React y la API (servidor de desarrollo).
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';

const PORT = 8099, BASE = `http://localhost:${PORT}`;
const srv = spawn(process.execPath, ['dev/mock-server.mjs'], { env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 800));
const api = async (m, p, body, tok) => { const r = await fetch(BASE + p, { method: m, headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: 'Bearer ' + tok } : {}) }, body: body && JSON.stringify(body) }); return { status: r.status, data: r.status === 204 ? null : await r.json().catch(() => null) }; };
const login = async (c, k) => (await api('POST', '/api/auth/login', { correo: c, clave: k })).data.token;

const browser = await chromium.launch();
const resultados = [];
async function caso(nombre, fn) {
  await api('POST', '/api/test/reset');
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 860 } }); const page = await ctx.newPage();
  try { await fn(page); resultados.push([nombre, true]); console.log('  ok  ', nombre); }
  catch (e) { resultados.push([nombre, false]); console.log('  FALLA', nombre, '\n       ', e.message.split('\n')[0]); }
  await ctx.close();
}
async function entrar(page, correo, clave) {
  await page.goto(BASE); await page.getByLabel('Correo electrónico').fill(correo); await page.getByLabel('Contraseña').fill(clave);
  await page.getByRole('button', { name: 'Iniciar sesión' }).last().click(); await page.getByRole('navigation').waitFor();
}
const abrirP1 = async (page) => { await page.getByRole('button', { name: 'Proyectos' }).click(); await page.getByText('Sistema Web Universidad').first().click(); await page.getByText('Tablero de tareas').waitFor(); };

await caso('E2E-01 inicio de sesión con clave incorrecta muestra error y no entra', async (page) => {
  await page.goto(BASE); await page.getByLabel('Correo electrónico').fill('admin@gmail.com'); await page.getByLabel('Contraseña').fill('mala');
  await page.getByRole('button', { name: 'Iniciar sesión' }).last().click();
  await page.getByRole('alert').waitFor(); assert.match(await page.getByRole('alert').innerText(), /incorrectos/);
});
await caso('E2E-02 registro con contraseña de 5 caracteres es rechazado (RN-08)', async (page) => {
  await page.goto(BASE); await page.getByRole('tab', { name: 'Registrarse' }).click();
  await page.getByLabel('Nombre').fill('Ana'); await page.getByLabel('Correo electrónico').fill('ana@x.co'); await page.getByLabel('Contraseña').fill('12345');
  await page.getByRole('button', { name: 'Crear cuenta' }).click(); await page.getByRole('alert').waitFor();
  assert.match(await page.getByRole('alert').innerText(), /6 caracteres/);
});
await caso('E2E-03 el panel muestra 2 proyectos y 6 tareas del usuario', async (page) => {
  await entrar(page, 'admin@gmail.com', 'admin123'); await page.getByText('Sistema Web Universidad').waitFor();
  assert.equal(await page.getByText('Proyectos totales').locator('..').getByText(/^\d+$/).innerText(), '2');
  assert.equal(await page.getByText('Tareas totales').locator('..').getByText(/^\d+$/).innerText(), '6');
});
await caso('E2E-04 el tablero reparte las tareas por estado (2 pendientes, 1 en progreso, 1 completada)', async (page) => {
  await entrar(page, 'admin@gmail.com', 'admin123'); await abrirP1(page);
  for (const [col, n] of [['Pendiente', 2], ['En progreso', 1], ['Completado', 1]]) assert.equal(await page.getByRole('region', { name: col }).getByTestId('tarea').count(), n, col);
});
await caso('E2E-05 RN-02: quien no es el asignado ve el cambio de estado deshabilitado', async (page) => {
  await entrar(page, 'admin@gmail.com', 'admin123'); await abrirP1(page);
  assert.equal(await page.getByLabel('Estado de Implementar base de datos').isDisabled(), true);   // asignada a Ronald
  assert.equal(await page.getByLabel('Estado de Pruebas de usabilidad').isDisabled(), false);       // asignada al admin
});
await caso('E2E-06 RN-02: la API rechaza con 403 el cambio hecho por un no asignado (acceso directo)', async () => {
  const tok = await login('admin@gmail.com', 'admin123');
  const r = await api('PATCH', '/api/tareas/t2/estado', { estado: 'COMPLETADA', version: 0 }, tok);
  assert.equal(r.status, 403); assert.match(r.data.error, /asignado/);
  assert.equal((await api('GET', '/api/tareas', null, tok)).data.find((t) => t.id === 't2').estado, 'EN_PROCESO');
});
await caso('E2E-07 el asignado completa su tarea y el avance del proyecto sube de 25 % a 50 %', async (page) => {
  await entrar(page, 'ronald@unipamplona.edu.co', '1234'); await abrirP1(page);
  await page.getByText('25% completado').waitFor();
  await page.getByLabel('Estado de Implementar base de datos').selectOption('COMPLETADA');
  await page.getByText('50% completado').waitFor();
  assert.equal(await page.getByRole('region', { name: 'Completado' }).getByTestId('tarea').count(), 2);
});
await caso('E2E-08 RN-05: el cambio de estado notifica al creador del proyecto', async (page) => {
  const tok = await login('ronald@unipamplona.edu.co', '1234');
  assert.equal((await api('PATCH', '/api/tareas/t2/estado', { estado: 'COMPLETADA', version: 0 }, tok)).status, 200);
  await entrar(page, 'admin@gmail.com', 'admin123');
  assert.equal(await page.getByTestId('badge-notifs').innerText(), '2');       // bienvenida + cambio de estado
  await page.getByRole('button', { name: 'Notificaciones' }).click();
  await page.getByText(/cambió "Implementar base de datos" a completada/).waitFor();
});
await caso('E2E-09 concurrencia: una escritura con versión obsoleta devuelve 409', async () => {
  const tok = await login('ronald@unipamplona.edu.co', '1234');
  assert.equal((await api('PATCH', '/api/tareas/t2/estado', { estado: 'COMPLETADA', version: 0 }, tok)).status, 200);
  const r = await api('PATCH', '/api/tareas/t2/estado', { estado: 'PENDIENTE', version: 0 }, tok);
  assert.equal(r.status, 409);
});
await caso('E2E-10 repetir el mismo estado no vuelve a notificar (contrato idempotente)', async () => {
  const tok = await login('ronald@unipamplona.edu.co', '1234'), adm = await login('admin@gmail.com', 'admin123');
  await api('PATCH', '/api/tareas/t2/estado', { estado: 'COMPLETADA', version: 0 }, tok);
  const antes = (await api('GET', '/api/notificaciones', null, adm)).data.length;
  const r = await api('PATCH', '/api/tareas/t2/estado', { estado: 'COMPLETADA', version: 1 }, tok);
  assert.equal(r.status, 200); assert.equal((await api('GET', '/api/notificaciones', null, adm)).data.length, antes);
});
await caso('E2E-11 RN-01: asignar una tarea a quien no es miembro devuelve 400', async () => {
  const tok = await login('admin@gmail.com', 'admin123');
  const r = await api('POST', '/api/proyectos/p2/tareas', { titulo: 'X', asignadoId: 'u2' }, tok);   // Ronald no está en p2
  assert.equal(r.status, 400);
});
await caso('E2E-12 RN-04: no se elimina un proyecto con tareas sin completar (409)', async () => {
  const tok = await login('admin@gmail.com', 'admin123');
  assert.equal((await api('DELETE', '/api/proyectos/p1', null, tok)).status, 409);
});
await caso('E2E-13 sin token la API responde 401', async () => { assert.equal((await api('GET', '/api/proyectos')).status, 401); });
await caso('E2E-14 el creador crea una tarea asignada desde la interfaz y aparece en Pendiente', async (page) => {
  await entrar(page, 'admin@gmail.com', 'admin123'); await abrirP1(page);
  await page.getByRole('button', { name: '+ Nueva tarea' }).click();
  await page.getByLabel('Título').fill('Redactar manual'); await page.getByLabel('Asignar a').selectOption('u3');
  await page.getByRole('button', { name: 'Crear tarea' }).click();
  await page.getByRole('region', { name: 'Pendiente' }).getByText('Redactar manual').waitFor();
});
await caso('E2E-15 XSS: un título con HTML malicioso se muestra como texto y no ejecuta código', async (page) => {
  const malicioso = '<img src=x onerror="window.__xss=1">';
  await entrar(page, 'admin@gmail.com', 'admin123'); await abrirP1(page);
  await page.getByRole('button', { name: '+ Nueva tarea' }).click();
  await page.getByLabel('Título').fill(malicioso);
  await page.getByRole('button', { name: 'Crear tarea' }).click();
  await page.getByRole('region', { name: 'Pendiente' }).getByText(malicioso, { exact: true }).waitFor();   // visible como texto literal
  await page.waitForTimeout(500);                                                                         // margen para que un onerror se ejecutara
  assert.equal(await page.evaluate(() => window.__xss), undefined, 'se ejecutó el código del título');
  assert.equal(await page.locator('img[src="x"]').count(), 0, 'el título se interpretó como HTML');
});

await caso('E2E-16 API dormida: el registro responde 500 tras crear la cuenta y la interfaz entra sin pedir repetirlo', async (page) => {
  await api('POST', '/api/test/frio');
  await page.goto(BASE); await page.getByRole('tab', { name: 'Registrarse' }).click();
  await page.getByLabel('Nombre').fill('Nueva Persona'); await page.getByLabel('Correo electrónico').fill('nueva@x.co'); await page.getByLabel('Contraseña').fill('clave123');
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  await page.getByRole('navigation').waitFor();   // entró con la cuenta creada en el primer intento
});
await caso('E2E-17 un correo ya registrado con otra contraseña informa «ya registrado» sin entrar', async (page) => {
  await page.goto(BASE); await page.getByRole('tab', { name: 'Registrarse' }).click();
  await page.getByLabel('Nombre').fill('Otra'); await page.getByLabel('Correo electrónico').fill('admin@gmail.com'); await page.getByLabel('Contraseña').fill('otraclave1');
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  await page.getByRole('alert').waitFor(); assert.match(await page.getByRole('alert').innerText(), /ya está registrado/);
  assert.equal(await page.getByRole('navigation').count(), 0, 'no debe entrar con una contraseña ajena');
});

await browser.close(); srv.kill();
const ok = resultados.filter((r) => r[1]).length;
console.log(`\nResultado: ${ok}/${resultados.length} pruebas de extremo a extremo aprobadas`);
process.exit(ok === resultados.length ? 0 : 1);
