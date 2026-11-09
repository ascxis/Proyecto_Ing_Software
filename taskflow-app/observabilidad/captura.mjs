// Toma la captura del dashboard de Grafana y FALLA si la interfaz no cargó (evita guardar una captura de error como evidencia).
import { chromium } from 'playwright';
const URL = process.argv[2], SALIDA = process.argv[3] || '/tmp/dashboard.png';
const navegador = await chromium.launch();
const page = await navegador.newPage({ viewport: { width: 1500, height: 900 }, locale: 'en-US', timezoneId: 'America/Bogota' });   // sin un locale válido Grafana lanza «Incorrect locale information provided»
const fallos = [];
page.on('requestfailed', (r) => fallos.push(`FALLÓ ${r.url()} ${r.failure()?.errorText}`));
page.on('response', (r) => { if (r.status() >= 400) fallos.push(`HTTP ${r.status()} ${r.url()}`); });
page.on('pageerror', (e) => fallos.push(`ERROR JS ${e.message}`));
let ok = false;
for (let intento = 1; intento <= 3 && !ok; intento++) {
  try {
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
    await page.getByText('Latencia p95').first().waitFor({ timeout: 60000 });
    await page.waitForTimeout(10000);   // deja que los paneles dibujen sus series
    const cuerpo = await page.locator('body').innerText();
    if (cuerpo.includes('failed to load its application files')) throw new Error('Grafana no cargó sus archivos');
    ok = true;
  } catch (e) { console.log(`Intento ${intento} falló: ${e.message}`); await page.waitForTimeout(5000); }
}
await page.screenshot({ path: SALIDA });
console.log(fallos.slice(0, 20).join('\n') || 'sin fallos de red');
await navegador.close();
if (!ok) { console.error('La captura NO es válida.'); process.exit(1); }
console.log('Captura válida:', SALIDA);
