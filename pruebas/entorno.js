// Entorno de pruebas para TaskFlow (taskflow/pagina.html).
// Ejecuta el JavaScript de la página en Node con un DOM simulado mínimo, de modo que
// las funciones se puedan probar sin navegador. Cada llamada a cargarApp() crea un
// entorno limpio (localStorage vacío, reloj controlable).
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const RUTA_POR_DEFECTO = path.join(__dirname, '..', 'taskflow', 'pagina.html');
const FIJO = new Date('2026-10-01T12:00:00Z').getTime();

function extraerScript(html) {
  const bloques = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  return bloques[bloques.length - 1][1];            // el último <script> es la aplicación
}

function cargarApp(rutaHtml = process.env.TASKFLOW_HTML || RUTA_POR_DEFECTO) {
  const elementos = {};
  const manejadores = {};
  const reloj = { ahora: FIJO, autoincremento: true };   // autoincremento evita ids repetidos

  class FechaFija extends Date {
    constructor(...a) { a.length === 0 ? super(reloj.ahora) : super(...a); }
    static now() { return reloj.autoincremento ? reloj.ahora++ : reloj.ahora; }
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
  const documento = {
    getElementById: obtener,
    querySelector: () => obtener('__selector__'),
    querySelectorAll: () => [],
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
    confirm: () => true, setTimeout: () => 0,
    window: { matchMedia: () => ({ matches: false }) },
  });
  vm.runInContext(extraerScript(fs.readFileSync(rutaHtml, 'utf8')), ctx);

  const ev = js => vm.runInContext(js, ctx);               // evalúa código dentro de la app
  return {
    ctx, elementos, manejadores, reloj, ev, almacen,
    state: ev('state'),                                    // el objeto de estado (se puede modificar)
    el: obtener,
    fijar: (id, valor) => { obtener(id).value = valor; },
    enviar: id => manejadores[id + ':submit']({ preventDefault() {} }),
    // Sustituye una función de la app por un doble (stub o mock)
    reemplazar: (nombre, doble) => { ctx[nombre] = doble; return doble; },
  };
}

module.exports = { cargarApp, FIJO };
