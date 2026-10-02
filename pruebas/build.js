// "Build" de TaskFlow: como la aplicación es un solo archivo HTML sin compilación,
// construir significa comprobar que el archivo se puede cargar y que su JavaScript es válido.
//   node pruebas/build.js taskflow/pagina.html
const fs = require('fs');
const vm = require('vm');

const ruta = process.argv[2] || 'taskflow/pagina.html';
const errores = [];
let html = '';
try { html = fs.readFileSync(ruta, 'utf8'); } catch (e) { errores.push(`No se puede leer ${ruta}: ${e.message}`); }

if (html) {
  if (!/<!DOCTYPE html>/i.test(html)) errores.push('Falta <!DOCTYPE html>.');
  if (!/<title>[^<]+<\/title>/i.test(html)) errores.push('Falta un <title> con texto.');
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  if (scripts.length === 0) errores.push('No hay ningún <script> con la aplicación.');
  scripts.forEach((m, i) => {
    try { new vm.Script(m[1], { filename: `${ruta}#script${i + 1}` }); }
    catch (e) { errores.push(`Error de sintaxis en el <script> n.º ${i + 1}: ${e.message}`); }
  });
  if (errores.length === 0) console.log(`Build OK: ${ruta} (${(html.length / 1024).toFixed(0)} KB, ${scripts.length} bloques <script> con sintaxis válida)`);
}
errores.forEach(e => console.error('ERROR: ' + e));
process.exit(errores.length ? 1 : 0);
