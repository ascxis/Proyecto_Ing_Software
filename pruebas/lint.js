// Lint de TaskFlow: reglas estáticas sobre el JavaScript de la aplicación (último <script>).
// Los ERRORES hacen fallar el pipeline; las ADVERTENCIAS son deuda técnica ya registrada
// (issues con la etiqueta deuda-tecnica) y no lo bloquean.
//   node pruebas/lint.js taskflow/pagina.html
const fs = require('fs');

const ruta = process.argv[2] || 'taskflow/pagina.html';
const html = fs.readFileSync(ruta, 'utf8').replace(/\r/g, '');
const bloques = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
const js = bloques[bloques.length - 1][1];
const lineas = js.split('\n');

const reglas = [   // [id, descripción, patrón]
  ['no-debugger', 'Quitar la sentencia debugger', /\bdebugger\b/],
  ['no-eval', 'No usar eval() ni new Function()', /\beval\s*\(|new Function\s*\(/],
  ['no-console-log', 'Quitar console.log de depuración', /console\.log\s*\(/],
  ['no-alert', 'No usar alert(): usar showToast()', /\balert\s*\(/],
  ['no-var', 'Usar const o let en lugar de var', /^\s*var\s/],
  ['eqeqeq', 'Usar === y !== en lugar de == y !=', /[^=!<>]==[^=]|!=[^=]/],
  ['no-document-write', 'No usar document.write', /document\.write\s*\(/],
  ['no-secretos', 'Posible secreto o token en texto plano', /ghp_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----|xox[baprs]-[A-Za-z0-9-]{10,}/],
];
const advertencias = [
  ['contrasena-en-texto-plano', 'Contraseña literal en el código (deuda técnica 1)', /password:\s*'[^']+'/],
];

const errores = []; const avisos = {};
lineas.forEach((l, i) => {
  const sinComentario = l.replace(/\/\/.*$/, '');
  reglas.forEach(([id, desc, re]) => { if (re.test(sinComentario)) errores.push(`  línea ${i + 1} [${id}] ${desc}`); });
  advertencias.forEach(([id, desc, re]) => { if (re.test(sinComentario)) (avisos[id + '|' + desc] = avisos[id + '|' + desc] || []).push(i + 1); });
});
const innerHTML = lineas.filter(l => /\.innerHTML\s*=/.test(l)).length;
if (innerHTML) avisos['innerhtml-sin-escapar|Asignaciones a innerHTML sin escapar (deuda técnica 2, XSS)'] = Array(innerHTML).fill(0);

Object.entries(avisos).forEach(([k, v]) => console.warn(`ADVERTENCIA [${k.split('|')[0]}] ${k.split('|')[1]}: ${v.length} ocurrencia(s)`));
if (errores.length) {
  console.error(`Lint FALLÓ: ${errores.length} error(es)`);
  errores.forEach(e => console.error(e));
  process.exit(1);
}
console.log(`Lint OK: ${lineas.length} líneas revisadas, 0 errores, ${Object.keys(avisos).length} tipo(s) de advertencia (deuda registrada)`);
