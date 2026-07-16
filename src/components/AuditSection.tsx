import React from 'react';
import { AuditLog } from '../types';
import { ShieldAlert, Terminal, Trash2, Database, KeyRound, Globe } from 'lucide-react';

interface AuditSectionProps {
  logs: AuditLog[];
  onClearLogs: () => Promise<void>;
  token: string | null;
  isDbLocal: boolean;
}

export default function AuditSection({ logs, onClearLogs, token, isDbLocal }: AuditSectionProps) {
  return (
    <div className="space-y-6">
      {/* Telemetry Indicator Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white dark:bg-[#070D19]/60 backdrop-blur-xl border border-slate-200 dark:border-blue-500/10 p-5 rounded-2xl flex items-center justify-between shadow-xl">
          <div className="space-y-1">
            <span className="text-slate-500 dark:text-gray-400 text-[10px] font-mono uppercase tracking-wider block">Estado del Servidor</span>
            <span className="text-emerald-600 dark:text-emerald-400 text-sm font-bold flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
              ONLINE / OPERATIVO
            </span>
          </div>
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <Globe className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#070D19]/60 backdrop-blur-xl border border-slate-200 dark:border-blue-500/10 p-5 rounded-2xl flex items-center justify-between shadow-xl">
          <div className="space-y-1">
            <span className="text-slate-500 dark:text-gray-400 text-[10px] font-mono uppercase tracking-wider block">Motor de Persistencia</span>
            <span className={`text-sm font-bold flex items-center gap-1.5 ${isDbLocal ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'}`}>
              <Database className="w-4 h-4" />
              {isDbLocal ? 'Local JSON Storage' : 'MongoDB Cluster0'}
            </span>
          </div>
          <div className={`p-2.5 rounded-xl border ${isDbLocal ? 'bg-amber-500/10 border-amber-500/20' : 'bg-blue-500/10 border-blue-500/20'}`}>
            <Database className={`w-5 h-5 ${isDbLocal ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'}`} />
          </div>
        </div>

        <div className="bg-white dark:bg-[#070D19]/60 backdrop-blur-xl border border-slate-200 dark:border-blue-500/10 p-5 rounded-2xl flex items-center justify-between shadow-xl">
          <div className="space-y-1">
            <span className="text-slate-500 dark:text-gray-400 text-[10px] font-mono uppercase tracking-wider block">Nivel de Seguridad</span>
            <span className="text-amber-600 dark:text-amber-400 text-sm font-bold flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              JWT Firmado Activado
            </span>
          </div>
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
        </div>
      </div>

      {/* Main Logs Table */}
      <div className="bg-white dark:bg-[#070D19]/80 border border-slate-200 dark:border-blue-500/10 rounded-2xl overflow-hidden shadow-2xl relative">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/10 to-transparent" />
        
        <div className="flex items-center justify-between p-5 border-b border-slate-150 dark:border-white/5 bg-slate-50 dark:bg-[#0B1528]/50">
          <div className="flex items-center gap-3">
            <Terminal className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <div>
              <h2 className="text-slate-800 dark:text-white text-sm font-bold uppercase tracking-wider font-sans">
                Historial de Auditoría de Seguridad
              </h2>
              <p className="text-slate-500 dark:text-gray-400 text-xs">Registro cronológico auditable e inmutable</p>
            </div>
          </div>

          {token && logs.length > 0 && (
            <button
              onClick={onClearLogs}
              className="bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Limpiar Logs
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-[#0B1528] text-slate-500 dark:text-gray-400 text-[10px] uppercase tracking-wider border-b border-slate-200 dark:border-blue-500/10">
                <th className="py-4 px-6 font-mono font-bold">Fecha / Hora</th>
                <th className="py-4 px-4 font-mono font-bold">Operación</th>
                <th className="py-4 px-6 font-mono font-bold">Detalles / Auditoría</th>
                <th className="py-4 px-4 font-mono font-bold">Operador</th>
                <th className="py-4 px-6 font-mono font-bold text-right">Dirección IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 dark:divide-white/5 text-xs text-slate-700 dark:text-gray-300">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 dark:text-gray-500 italic">
                    No existen registros en el historial de auditoría.
                  </td>
                </tr>
              ) : (
                logs.map((log, idx) => (
                  <tr key={log._id || log.id || idx} className="hover:bg-blue-50/50 dark:hover:bg-blue-500/5 transition-colors">
                    <td className="py-3.5 px-6 font-mono text-slate-500 dark:text-gray-400">
                      {new Date(log.fecha).toLocaleString('es-ES')}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border
                        ${log.accion === 'INICIO' || log.accion === 'LOGIN'
                          ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-600 dark:text-emerald-400'
                          : log.accion === 'NUMERO_CONFIRMADO' || log.accion === 'ASIGNACION_AUTOMATICA'
                            ? 'bg-amber-500/15 border-amber-500/35 text-amber-700 dark:text-amber-400 shadow-[0_0_8px_rgba(230,194,128,0.15)]'
                            : log.accion === 'RELANZAMIENTO' || log.accion === 'REINICIO'
                              ? 'bg-rose-500/15 border-rose-500/35 text-rose-600 dark:text-rose-400'
                              : 'bg-blue-500/15 border-blue-500/35 text-blue-600 dark:text-blue-300'
                        }
                      `}>
                        {log.accion}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-slate-800 dark:text-white font-medium">
                      {log.detalles}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 dark:text-gray-400 font-mono">
                      {log.usuario}
                    </td>
                    <td className="py-3.5 px-6 text-right text-slate-400 dark:text-gray-500 font-mono">
                      {log.ip || '127.0.0.1'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
