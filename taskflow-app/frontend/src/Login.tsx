import { FormEvent, useState } from 'react';
import { api, setToken } from './api';
import type { Usuario } from './types';
import { boton, campo, Logo } from './ui';

export function Login({ onLogin }: { onLogin: (u: Usuario) => void }) {
  const [registro, setRegistro] = useState(false);
  const [nombre, setNombre] = useState(''); const [correo, setCorreo] = useState(''); const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  async function enviar(e: FormEvent) {
    e.preventDefault(); setError('');
    try {
      const s = registro ? await api.register(nombre, correo, clave) : await api.login(correo, clave);
      setToken(s.token); onLogin(s.usuario);
    } catch (err) { setError((err as Error).message); }
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
          <button className={`${boton} w-full`}>{registro ? 'Crear cuenta' : 'Iniciar sesión'}</button>
        </form>
      </div>
    </div>
  );
}
