// Métricas simples por función (líneas, parámetros y complejidad ciclomática aproximada).
// node pruebas/metricas.js pagina.html [funcion1 funcion2 ...]
const fs = require('fs');
const [, , ruta, ...nombres] = process.argv;
const html = fs.readFileSync(ruta, 'utf8').replace(/\r/g, '');
const bloques = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
const js = bloques[bloques.length - 1][1];
const lineas = js.split('\n');
const funciones = [];
for (let i = 0; i < lineas.length; i++) {
  const m = lineas[i].match(/^function (\w+)\(([^)]*)\) \{/);
  if (!m) continue;
  let j = i; while (j < lineas.length && lineas[j] !== '}') j++;
  const cuerpo = lineas.slice(i, j + 1).join('\n');
  const ramas = (cuerpo.match(/\bif\b|\bfor\b|\bwhile\b|\bcase\b|\bcatch\b|&&|\|\||\s\?\s/g) || []).length;
  funciones.push({ nombre: m[1], lineas: j - i + 1, params: m[2].trim() ? m[2].split(',').length : 0, cc: 1 + ramas });
}
const pedidas = nombres.length ? funciones.filter(f => nombres.includes(f.nombre)) : funciones;
pedidas.forEach(f => console.log(`${f.nombre.padEnd(34)} líneas=${String(f.lineas).padEnd(4)} params=${f.params} cc≈${f.cc}`));
const mayor = [...funciones].sort((a, b) => b.lineas - a.lineas)[0];
console.log(`-- funciones: ${funciones.length} | la más larga: ${mayor.nombre} (${mayor.lineas} líneas)`);
