import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Participant } from '../types';
import { 
  Shield, Sparkles, HelpCircle, CheckCircle, 
  LayoutGrid, List, ArrowUpDown, Search, DollarSign, Filter
} from 'lucide-react';

interface BoardSectionProps {
  participants: Participant[];
  currentProposedNumber: string | null;
}

export default function BoardSection({ participants, currentProposedNumber }: BoardSectionProps) {
  const [hoveredNumber, setHoveredNumber] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'tablero' | 'lista'>('tablero');
  const [sortOrder, setSortOrder] = useState<'a-z' | 'z-a' | 'num'>('num');
  const [searchQuery, setSearchQuery] = useState('');

  // Map numbers "01"-"99" to their participant if assigned
  const assignmentsMap = React.useMemo(() => {
    const map = new Map<string, Participant>();
    participants.forEach(p => {
      if (p.numeroAsignado) {
        map.set(p.numeroAsignado.padStart(2, '0'), p);
      }
    });
    return map;
  }, [participants]);

  // Generate all numbers from 01 to 99
  const numbers = Array.from({ length: 99 }, (_, i) => String(i + 1).padStart(2, '0'));

  const assignedCount = assignmentsMap.size;
  const totalParticipantsCount = participants.length;
  const pendingCount = totalParticipantsCount - assignedCount;

  // Process & Sort list of assigned participants or all participants
  const processedParticipants = React.useMemo(() => {
    // Only show participants who have an assigned number in this summary list
    const list = participants.filter(p => p.numeroAsignado);
    
    // Filter by search query
    const filtered = list.filter(p => {
      const fullname = `${p.nombre} ${p.apellido}`.toLowerCase();
      const num = p.numeroAsignado || '';
      const team = (p.equipo || '').toLowerCase();
      const area = (p.area || '').toLowerCase();
      const query = searchQuery.toLowerCase();
      return fullname.includes(query) || num.includes(query) || team.includes(query) || area.includes(query);
    });

    // Sort accordingly
    return filtered.sort((a, b) => {
      if (sortOrder === 'a-z') {
        const nameA = `${a.nombre} ${a.apellido}`.toLowerCase();
        const nameB = `${b.nombre} ${b.apellido}`.toLowerCase();
        return nameA.localeCompare(nameB);
      } else if (sortOrder === 'z-a') {
        const nameA = `${a.nombre} ${a.apellido}`.toLowerCase();
        const nameB = `${b.nombre} ${b.apellido}`.toLowerCase();
        return nameB.localeCompare(nameA);
      } else {
        // Sort by Assigned Number
        const numA = Number(a.numeroAsignado) || 0;
        const numB = Number(b.numeroAsignado) || 0;
        return numA - numB;
      }
    });
  }, [participants, sortOrder, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header Info HUD */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#0C152B]/60 backdrop-blur-xl border border-slate-200 dark:border-blue-500/20 p-4 rounded-xl flex items-center justify-between shadow-lg shadow-blue-950/5 dark:shadow-blue-950/20">
          <div>
            <p className="text-slate-500 dark:text-gray-400 text-[10px] font-mono uppercase tracking-widest font-bold">Cupos Pendientes</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 font-sans mt-1">
              {pendingCount} 
              <span className="text-sm font-normal text-slate-400 dark:text-gray-500 ml-1">/ {totalParticipantsCount}</span>
            </p>
          </div>
          <div className="h-10 w-10 rounded-full bg-blue-500/5 dark:bg-blue-500/10 flex items-center justify-center border border-blue-500/10 dark:border-blue-500/20">
            <HelpCircle className="w-5 h-5 text-blue-500 dark:text-blue-400" />
          </div>
        </div>

        <div className="bg-amber-50/60 dark:bg-[#1C160B]/60 backdrop-blur-xl border border-amber-500/15 dark:border-amber-500/20 p-4 rounded-xl flex items-center justify-between shadow-lg shadow-amber-950/5 dark:shadow-amber-950/20">
          <div>
            <p className="text-amber-800/60 dark:text-amber-200/60 text-[10px] font-mono uppercase tracking-widest font-bold">Cupos Confirmados</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 font-sans mt-1">
              {assignedCount} 
              <span className="text-sm font-normal text-slate-400 dark:text-gray-500 ml-1">/ {totalParticipantsCount}</span>
            </p>
          </div>
          <div className="h-10 w-10 rounded-full bg-amber-500/5 dark:bg-amber-500/10 flex items-center justify-center border border-amber-500/10 dark:border-amber-500/20">
            <CheckCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-700/30 p-4 rounded-xl flex items-center justify-between shadow-lg">
          <div>
            <p className="text-slate-500 dark:text-gray-400 text-[10px] font-mono uppercase tracking-widest font-bold">Progreso Total</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">
              {totalParticipantsCount > 0 ? ((assignedCount / totalParticipantsCount) * 100).toFixed(1) : '0.0'}%
            </p>
          </div>
          <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-700/20 flex items-center justify-center border border-slate-200 dark:border-slate-700/30">
            <Sparkles className="w-5 h-5 text-amber-500 dark:text-yellow-300" />
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white dark:bg-[#070D19]/80 backdrop-blur-xl border border-slate-200 dark:border-blue-500/10 rounded-2xl p-6 relative overflow-hidden shadow-2xl space-y-6">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-amber-500/15 to-transparent" />

        {/* Section Header Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <h2 className="text-lg font-bold text-slate-800 dark:text-white tracking-wide uppercase font-sans">
              Visor de Resultados SorteoSOS
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input for List View */}
            {viewMode === 'lista' && (
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar en resultados..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-[#0B1528] border border-slate-200 dark:border-blue-500/20 rounded-xl py-1.5 pl-9 pr-4 text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            )}

            {/* Sorting Toggles */}
            {viewMode === 'lista' && (
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-[#0B1528] px-2.5 py-1.5 border border-slate-200 dark:border-blue-500/15 rounded-xl">
                <ArrowUpDown className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <select
                  value={sortOrder}
                  onChange={(e: any) => setSortOrder(e.target.value)}
                  className="bg-slate-100 dark:bg-[#0B1528] border-none text-xs text-slate-700 dark:text-gray-300 focus:outline-none cursor-pointer font-sans"
                >
                  <option value="num" className="bg-slate-100 dark:bg-[#0B1528] text-slate-800 dark:text-white">Orden: Por Número</option>
                  <option value="a-z" className="bg-slate-100 dark:bg-[#0B1528] text-slate-800 dark:text-white">Orden: A a Z (Nombre)</option>
                  <option value="z-a" className="bg-slate-100 dark:bg-[#0B1528] text-slate-800 dark:text-white">Orden: Z a A (Nombre)</option>
                </select>
              </div>
            )}

            {/* View Mode Switcher buttons */}
            <div className="flex items-center bg-slate-100 dark:bg-[#0B1528] p-1 border border-slate-200 dark:border-blue-500/15 rounded-xl">
              <button
                onClick={() => setViewMode('tablero')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all ${viewMode === 'tablero' ? 'bg-[#E6C280] text-slate-950 font-bold' : 'text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white'}`}
                title="Vista de Tablero"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Tablero</span>
              </button>
              <button
                onClick={() => setViewMode('lista')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all ${viewMode === 'lista' ? 'bg-[#E6C280] text-slate-950 font-bold' : 'text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white'}`}
                title="Vista de Lista"
              >
                <List className="w-3.5 h-3.5" />
                <span>Lista Ordenada</span>
              </button>
            </div>
          </div>
        </div>

        {/* View Mode: TABLERO (Grid of 01 - 99) */}
        {viewMode === 'tablero' && (          <div className="space-y-6">
            <div className="flex items-center justify-between text-xs font-mono bg-slate-50 dark:bg-[#0B1528]/40 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/5">
              <span className="text-slate-500 dark:text-gray-400">Pasa el cursor sobre un número para ver los detalles del participante asignado.</span>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-blue-900/90 dark:to-blue-950 border border-slate-300 dark:border-blue-500/40" />
                  <span className="text-slate-500 dark:text-gray-400 text-[11px]">Disponible</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 border border-amber-400/80" />
                  <span className="text-amber-600 dark:text-amber-400 text-[11px]">Asignado</span>
                </div>
                {currentProposedNumber && (
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 border border-emerald-300 animate-pulse" />
                    <span className="text-emerald-500 dark:text-emerald-400 text-[11px]">Girando...</span>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-11 xl:grid-cols-12 gap-3.5 justify-center">
              {numbers.map((num) => {
                const assignedParticipant = assignmentsMap.get(num);
                const isAssigned = !!assignedParticipant;
                const isRollingActive = currentProposedNumber === num;

                return (
                  <div
                    key={num}
                    className="relative group flex justify-center items-center w-12 h-12"
                    onMouseEnter={() => setHoveredNumber(num)}
                    onMouseLeave={() => setHoveredNumber(null)}
                  >
                    <div
                      className={`
                        w-full h-full rounded-full flex items-center justify-center font-mono text-[15px] font-extrabold cursor-pointer select-none relative overflow-hidden z-10 transition-all duration-150 active:scale-95 hover:scale-110
                        ${isRollingActive
                          ? 'bg-emerald-500 text-slate-950 font-black animate-pulse border border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                          : isAssigned
                            ? 'bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 text-amber-950 border border-amber-300 font-black shadow-[0_2px_4px_rgba(0,0,0,0.15)] dark:shadow-[0_2px_4px_rgba(0,0,0,0.4)]'
                            : 'bg-slate-100 dark:bg-[#0C152B] text-slate-700 dark:text-blue-300/80 border border-slate-200 dark:border-blue-900/30 hover:bg-slate-200 dark:hover:bg-blue-900/40 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-blue-400'
                        }
                      `}
                    >
                      <span className={isAssigned ? 'font-black text-amber-950 text-base z-10' : ''}>
                        {num}
                      </span>
                    </div>

                    {isAssigned && assignedParticipant && (
                      <span className="absolute bottom-1 right-1 bg-amber-200 dark:bg-[#1C160B] text-amber-900 dark:text-amber-300 border border-amber-400/30 text-[8px] font-sans font-extrabold px-1 rounded shadow-sm pointer-events-none scale-90 z-20">
                        {assignedParticipant.nombre[0]}{assignedParticipant.apellido[0]}
                      </span>
                    )}

                    {hoveredNumber === num && isAssigned && assignedParticipant && (
                      <div className={`
                        absolute z-50 bottom-full mb-3 w-64 bg-white dark:bg-slate-950 border border-amber-500/30 dark:border-amber-500/40 rounded-xl p-3 shadow-lg backdrop-blur-md text-left pointer-events-none animate-fade-in
                        ${(Number(num) % 12 === 1 || Number(num) % 12 === 2) ? 'left-0' : (Number(num) % 12 === 0 || Number(num) % 12 === 11) ? 'right-0' : 'left-1/2 -translate-x-1/2'}
                      `}>
                        <div className={`absolute bottom-[-6px] w-3 h-3 bg-white dark:bg-slate-950 border-r border-b border-amber-500/30 dark:border-amber-500/40 rotate-45 ${(Number(num) % 12 === 1 || Number(num) % 12 === 2) ? 'left-4' : (Number(num) % 12 === 0 || Number(num) % 12 === 11) ? 'right-4' : 'left-1/2 -translate-x-1/2'}`} />
                        <div className="flex items-start justify-between mb-1.5 pb-1 border-b border-slate-100 dark:border-white/10">
                          <p className="text-amber-600 dark:text-amber-400 text-[10px] font-mono uppercase tracking-widest font-bold">Número Confirmado: {num}</p>
                          {assignedParticipant.pago ? (
                            <span className="text-[9px] bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 dark:border-emerald-500/30 px-1.5 py-0.5 rounded">Pagado</span>
                          ) : (
                            <span className="text-[9px] bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 dark:border-rose-500/30 px-1.5 py-0.5 rounded">Pendiente</span>
                          )}
                        </div>
                        <p className="text-slate-800 dark:text-white font-bold text-sm leading-tight">
                          {assignedParticipant.nombre} {assignedParticipant.apellido}
                        </p>
                        <div className="mt-1.5 space-y-1 text-[11px] text-slate-500 dark:text-gray-400">
                          <p><span className="text-slate-400 dark:text-gray-500">Equipo:</span> {assignedParticipant.equipo || 'Sin Equipo'}</p>
                          <p><span className="text-slate-400 dark:text-gray-500">Área:</span> {assignedParticipant.area || 'Sin Área'}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* View Mode: LISTA (Ordered list with filters and search) */}
        {viewMode === 'lista' && (
          <div className="space-y-4">
            {processedParticipants.length === 0 ? (
              <div className="text-center py-16 text-slate-400 dark:text-gray-500 border border-dashed border-slate-200 dark:border-white/5 rounded-xl bg-slate-50 dark:bg-slate-950/20">
                <p className="text-sm">No se encontraron participantes asignados con los filtros aplicados.</p>
                <p className="text-xs text-slate-400 dark:text-gray-600 mt-1">Intenta cambiar el criterio de búsqueda o espera a que se asignen números.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/5">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-[#0B1528] text-slate-500 dark:text-gray-400 text-[10px] uppercase tracking-wider border-b border-slate-200 dark:border-white/5">
                      <th className="py-3.5 px-5 font-mono">Número</th>
                      <th className="py-3.5 px-5 font-mono">Participante</th>
                      <th className="py-3.5 px-5 font-mono">Equipo / Área</th>
                      <th className="py-3.5 px-5 font-mono text-center">Estado Pago</th>
                      <th className="py-3.5 px-5 font-mono text-right">Fecha de Asignación</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs text-slate-600 dark:text-gray-300">
                    {processedParticipants.map((p) => (
                      <tr key={p._id || p.id} className="hover:bg-blue-50/50 dark:hover:bg-blue-500/5 transition-colors">
                        {/* Number Badge Column */}
                        <td className="py-3 px-5">
                          <span className="inline-flex items-center justify-center font-mono bg-amber-50 dark:bg-[#1C160B] border border-amber-500/25 dark:border-amber-500/35 text-amber-700 dark:text-amber-400 font-extrabold px-3 py-1 rounded shadow-inner text-sm">
                            {(p.numeroAsignado || '').padStart(2, '0')}
                          </span>
                        </td>

                        {/* Name Surname */}
                        <td className="py-3 px-5 font-semibold text-slate-800 dark:text-white">
                          {p.nombre} {p.apellido}
                        </td>

                        {/* Team and Area */}
                        <td className="py-3 px-5 text-slate-500 dark:text-gray-400">
                          {p.equipo || <span className="italic text-slate-400 dark:text-gray-600">Sin Equipo</span>}
                          <span className="text-slate-300 dark:text-gray-700 mx-2">/</span>
                          {p.area || <span className="italic text-slate-400 dark:text-gray-600">Sin Área</span>}
                        </td>

                        {/* Payment */}
                        <td className="py-3 px-5 text-center">
                          {p.pago ? (
                            <span className="inline-flex px-2 py-0.5 bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-full text-[10px] font-medium">
                              Pagado
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-0.5 bg-rose-500/10 dark:bg-rose-500/15 border border-rose-500/20 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 rounded-full text-[10px] font-medium">
                              Pendiente
                            </span>
                          )}
                        </td>

                        {/* Time of assignment */}
                        <td className="py-3 px-5 text-right font-mono text-slate-400 dark:text-gray-500">
                          {p.fechaAsignacion ? (
                            new Date(p.fechaAsignacion).toLocaleDateString('es-ES', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit'
                            })
                          ) : (
                            <span className="italic">N/A</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* Table statistics counter */}
            <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 dark:text-gray-500 pt-2">
              <span>LISTADO FILTRADO: {processedParticipants.length} DE {assignedCount} NÚMEROS CONFIRMADOS</span>
              <span>Sincronizado en tiempo real</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
