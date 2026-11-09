import { FormEvent, useState } from 'react';
import { api, ApiError, setToken } from './api';
import type { Sesion } from './api';
import type { Usuario } from './types';
import { boton, campo, Logo } from './ui';

const MSG_FRIO = 'El servidor no respondió bien. Si acaba de despertar (plan gratuito) puede tardar hasta un minuto: espera unos segundos e inténtalo de nuevo.';
const MSG_DUPLICADO = 'Ese correo ya está registrado. Si es tuyo, usa «Iniciar sesión» con tu contraseña.';
function mensajeDe(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status >= 500) return MSG_FRIO;
    if (err.status === 409) return MSG_DUPLICADO;
    return err.message;
  }
  return MSG_FRIO;   // sin respuesta de red
}

export function Login({ onLogin }: { onLogin: (u: Usuario) => void }) {
  const [registro, setRegistro] = useState(false);
  const [nombre, setNombre] = useState(''); const [correo, setCorreo] = useState(''); const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false); const [lento, setLento] = useState(false);
  // La API gratuita se duerme: el primer registro puede devolver 5xx (o no responder) aunque la cuenta ya se haya creado,
  // y repetirlo daría «ya registrado». Se intenta entrar con los mismos datos; solo funciona si la contraseña es la correcta.
  async function registrar(): Promise<Sesion> {
    try { return await api.register(nombre, correo, clave); }
    catch (err) {
      const incierto = !(err instanceof ApiError) || err.status >= 500 || err.status === 409;
      if (incierto) { try { return await api.login(correo, clave); } catch { /* se informa el error original */ } }
      throw err;
    }
  }
  async function enviar(e: FormEvent) {
    e.preventDefault(); if (enviando) return;
    setError(''); setEnviando(true); setLento(false);
    const aviso = setTimeout(() => setLento(true), 3000);
    try {
      const s = registro ? await registrar() : await api.login(correo, clave);
      setToken(s.token); onLogin(s.usuario);
    } catch (err) { setError(mensajeDe(err)); }
    finally { clearTimeout(aviso); setEnviando(false); setLento(false); }
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
        <div className="flex flex-col items-center mb-6"><Logo size={56} /><h1 className="text-2xl font-bold mt-3">TaskFlow</h1><p className="text-gray-500 text-sm">Sistema de Gestión de Tareas</p></div>
        <div className="flex bg-gray-100 rounded-xl p-1 mb-5" role="tablist">
          {[['Iniciar sesión', false], ['Registrarse', true]].map(([t, v]) => (
            <button key={String(t)} role="tab" aria-selected={registro === v} onClick={() => { setRegistro(v as boolean); setError(''); }} className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${registro === v ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}>{t as string}</button>
          ))}
        </div>
        <form onSubmit={enviar} className="space-y-4">
          {registro && <div><label htmlFor="nombre" className="block text-sm font-medium mb-1">Nombre</label><input id="nombre" className={campo} value={nombre} onChange={(e) => setNombre(e.target.value)} required /></div>}
          <div><label htmlFor="correo" className="block text-sm font-medium mb-1">Correo electrónico</label><input id="correo" type="email" className={campo} value={correo} onChange={(e) => setCorreo(e.target.value)} placeholder="tu@correo.com" required /></div>
          <div><label htmlFor="clave" className="block text-sm font-medium mb-1">Contraseña</label><input id="clave" type="password" className={campo} value={clave} onChange={(e) => setClave(e.target.value)} placeholder="Mínimo 6 caracteres" required /></div>
          {error && <div role="alert" className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</div>}
          {lento && <div role="status" className="text-indigo-700 text-sm bg-indigo-50 p-3 rounded-lg">El servidor está despertando; puede tardar hasta un minuto. Espera sin repetir el envío.</div>}
          <button disabled={enviando} aria-busy={enviando} className={`${boton} w-full disabled:opacity-60`}>{enviando ? (registro ? 'Creando cuenta…' : 'Entrando…') : (registro ? 'Crear cuenta' : 'Iniciar sesión')}</button>
        </form>
      </div>
    </div>
  );
}
