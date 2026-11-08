// Compila la interfaz: esbuild (React/TypeScript) + Tailwind CSS (solo las clases usadas).
import { build } from 'esbuild';
import { compile } from 'tailwindcss';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const dist = path.resolve('dist');
fs.rmSync(dist, { recursive: true, force: true }); fs.mkdirSync(dist, { recursive: true });

await build({ entryPoints: ['src/main.tsx'], bundle: true, minify: true, sourcemap: false, outfile: 'dist/app.js', jsx: 'automatic', target: 'es2020', define: { 'process.env.NODE_ENV': '"production"' } });

const twRoot = path.dirname(require.resolve('tailwindcss/package.json'));
const fuentes = ['index.html', ...fs.readdirSync('src').map((f) => 'src/' + f)].map((f) => fs.readFileSync(f, 'utf8')).join('\n');
const candidatos = [...new Set(fuentes.match(/[^\s"'`<>=(){};,]+/g))];
const c = await compile('@import "tailwindcss";', { base: twRoot, loadStylesheet: async (id, base) => { const p = id === 'tailwindcss' ? path.join(twRoot, 'index.css') : path.resolve(base, id); return { path: p, base: path.dirname(p), content: fs.readFileSync(p, 'utf8') }; } });
fs.writeFileSync('dist/app.css', c.build(candidatos));
fs.copyFileSync('index.html', 'dist/index.html'); fs.copyFileSync('public-favicon.svg', 'dist/favicon.svg');
console.log('Build listo en dist/ (', fs.statSync('dist/app.js').size, 'bytes JS )');
