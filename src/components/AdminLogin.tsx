import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Lock, User, KeyRound, AlertCircle, Database, HelpCircle } from 'lucide-react';

interface AdminLoginProps {
  onLogin: (username: string, password: string) => Promise<boolean>;
}

export default function AdminLogin({ onLogin }: AdminLoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState<{ connected: boolean; mode: string; uri: string | null; error: string | null } | null>(null);

  useEffect(() => {
    fetch('/api/db/status')
      .then(res => res.json())
      .then(data => setDbStatus(data))
      .catch(err => console.error('Error fetching DB status in Login:', err));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;

    setLoading(true);
    setError('');

    try {
      const success = await onLogin(username, password);
      if (!success) {
        setError('Credenciales de administrador inválidas. Intente de nuevo.');
      }
    } catch (err) {
      setError('Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[420px] p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm bg-gradient-to-b from-white to-slate-50 dark:from-[#0C152B]/90 dark:to-[#040810]/95 border border-slate-200 dark:border-blue-500/20 p-8 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.7)] backdrop-blur-xl relative"
      >
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#E6C280]/30 to-transparent" />
        <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 w-20 h-20 bg-amber-500/10 rounded-full blur-xl" />

        <div className="text-center space-y-2 mb-6">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#E6C280] to-amber-600 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/10">
            <Lock className="w-5 h-5 text-slate-950" />
          </div>
          <h2 className="text-slate-800 dark:text-white text-lg font-bold uppercase tracking-wider font-sans">Panel Privado</h2>
          <p className="text-slate-500 dark:text-gray-400 text-xs">Acceso reservado para administradores del evento</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-slate-500 dark:text-gray-400 text-[10px] uppercase tracking-wider font-mono">Usuario Administrador</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-gray-500" />
              <input
                type="text"
                required
                value={username}
                placeholder="Ej. admin"
                onChange={e => setUsername(e.target.value)}
                className="w-full bg-slate-100 dark:bg-[#050B17] border border-slate-200 dark:border-blue-500/20 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-gray-600 focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-slate-500 dark:text-gray-400 text-[10px] uppercase tracking-wider font-mono">Clave de Seguridad</label>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-gray-500" />
              <input
                type="password"
                required
                value={password}
                placeholder="Ej. admin123"
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-slate-100 dark:bg-[#050B17] border border-slate-200 dark:border-blue-500/20 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-gray-600 focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 text-xs bg-rose-500/10 border border-rose-500/25 p-2.5 rounded-xl">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs py-3 rounded-xl shadow-lg shadow-amber-500/15 cursor-pointer transition-all"
          >
            {loading ? 'Validando Firma JWT...' : 'Ingresar al SorteoSOS'}
          </button>
        </form>

        {dbStatus ? (
          <div className="mt-5 pt-4 border-t border-slate-200 dark:border-white/5 space-y-2">
            {dbStatus.connected ? (
              <div className="flex items-center gap-1.5 justify-center text-emerald-600 dark:text-emerald-400 text-[10px] font-mono bg-emerald-500/5 border border-emerald-500/10 py-1 px-2.5 rounded-full w-fit mx-auto">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span>MongoDB Atlas: Conexión Estable</span>
              </div>
            ) : (
              <div className="border border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-950/20 rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 text-[11px] font-bold font-mono">
                  <Database className="w-3.5 h-3.5 animate-pulse" />
                  <span>MongoDB Atlas: Desconectado</span>
                </div>
                <p className="text-slate-500 dark:text-gray-400 text-[10px] leading-relaxed">
                  El servidor no se pudo conectar a Atlas y ha activado el almacenamiento local temporal.
                </p>
                {dbStatus.error && (
                  <div className="bg-slate-100 dark:bg-slate-950/60 p-2 rounded-lg border border-rose-200 dark:border-rose-500/10 font-mono text-[9px] text-rose-600 dark:text-rose-300 break-words select-all max-h-[60px] overflow-y-auto">
                    <strong>Error:</strong> {dbStatus.error}
                  </div>
                )}
                <div className="text-slate-600 dark:text-gray-400 text-[10px] bg-amber-500/5 border border-amber-500/10 p-2.5 rounded-lg space-y-1">
                  <p className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                    <HelpCircle className="w-3 h-3 text-amber-700 dark:text-amber-400" />
                    ¿Cómo resolverlo?
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-slate-500 dark:text-gray-400 text-[9px]">
                    <li>En el panel de <strong className="text-amber-700 dark:text-amber-400 font-medium">MongoDB Atlas</strong>, ve a <strong>Network Access</strong> y añade la IP <strong className="text-amber-700 dark:text-amber-400 font-medium">0.0.0.0/0</strong> (acceso desde cualquier lugar) para permitir conexiones desde Vercel.</li>
                    <li>Verifica que configuraste la variable de entorno <strong className="text-amber-700 dark:text-amber-400 font-medium">MONGODB_URI</strong> en el panel de Vercel y reinstalaste o redesplegaste para aplicar.</li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-5 pt-4 border-t border-slate-200 dark:border-white/5 flex items-center gap-1.5 justify-center text-slate-500 dark:text-gray-500 text-[10px] font-mono bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 py-1.5 px-3 rounded-full w-fit mx-auto">
            <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-ping" />
            <span>Verificando conexión de base de datos...</span>
          </div>
        )}
      </motion.div>
    </div>
  );
}
