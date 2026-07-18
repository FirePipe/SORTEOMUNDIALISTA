import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Participant, EventState, AppConfig } from '../types';
import { audio } from '../utils/audio';
import { useGoldenBallCelebration } from './useGoldenBallCelebration';
import { 
  Shield, Sparkles, HelpCircle, CheckCircle, 
  LayoutGrid, List, ArrowUpDown, Search, User, Hash, Calendar, Trophy, X
} from 'lucide-react';

// --- Sub-component: GoldenBall (Pure Tailwind 3D Sphere) ---
const GoldenBall = React.memo(({ numero, onClick, isWinner = false }: { numero: string, onClick?: () => void, isWinner?: boolean }) => {
  return (
    <div 
      onClick={onClick}
      className={`relative w-12 h-12 md:w-14 md:h-14 group cursor-pointer transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] hover:scale-125 will-change-transform active:scale-95 z-0 hover:z-20 ${isWinner ? 'scale-110 z-10' : ''}`}
    >
      {/* Floating Shadow */}
      <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-4/5 h-1.5 rounded-[100%] blur-md transition-all duration-500 ${isWinner ? 'bg-amber-500/50 scale-125' : 'bg-black/30 group-hover:bg-black/50 group-hover:scale-125'}`} />
      
      {/* Main Sphere Body with improved gradients and 3D effect */}
      <div className={`relative w-full h-full rounded-full flex items-center justify-center border shadow-[0_10px_20px_-5px_rgba(0,0,0,0.3)] transition-all duration-500 group-hover:shadow-[0_20px_30px_-10px_rgba(0,0,0,0.5)] ${isWinner ? 'bg-gradient-to-br from-yellow-300 via-amber-400 to-orange-500 border-yellow-200 shadow-[0_0_30px_rgba(251,191,36,0.8)] animate-winning-card-pulse' : 'ball-gold-3d border-[#B45309]/40'}`}>
        {/* Aura/Pulse Effect */}
        <div className={`absolute -inset-6 rounded-full blur-3xl animate-pulse transition-opacity duration-300 ${isWinner ? 'bg-amber-400/80 opacity-100' : 'bg-amber-400/50 opacity-0 group-hover/ball:opacity-100'}`} />
            
        {/* Glossy highlight */}
        <div className={`absolute top-[10%] left-[15%] w-[40%] h-[30%] rounded-full blur-[3px] transform -rotate-12 pointer-events-none ${isWinner ? 'bg-gradient-to-b from-white/60 to-transparent' : 'bg-gradient-to-b from-white/30 to-transparent'}`} />
            
        {/* Soccer Pattern */}
        <div className={`absolute inset-0 ${isWinner ? 'opacity-30' : 'opacity-20'}`} style={{ backgroundImage: `radial-gradient(circle, ${isWinner ? '#b45309' : '#704d05'} 1px, transparent 1px)`, backgroundSize: '10px 10px' }}></div>

        {/* Number Text */}
        <span className={`relative z-10 font-black text-lg md:text-xl drop-shadow-[0_1px_1px_rgba(255,255,255,0.4)] select-none transition-transform duration-500 group-hover:scale-110 ${isWinner ? 'text-slate-900 drop-shadow-md' : 'text-[#2A1D08]'}`}>
          {numero}
        </span>
      </div>

      {/* Holographic sparkle effect on hover */}
      <div className={`absolute inset-0 rounded-full transition-opacity duration-700 bg-gradient-to-tr from-white/0 via-white/40 to-white/0 pointer-events-none ${isWinner ? 'opacity-100 animate-[spin_4s_linear_infinite]' : 'opacity-0 group-hover:opacity-100'}`} />
    </div>
  );
});

interface BoardSectionProps {
  participants: Participant[];
  currentProposedNumber: string | null;
  eventState?: EventState; // Added eventState for config access
  appConfig: AppConfig; // Added appConfig for sound settings
}

export default function BoardSection({ participants, currentProposedNumber, eventState, appConfig }: BoardSectionProps) {
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const { triggerCelebration } = useGoldenBallCelebration();

  // Safe helper to check if a participant's assigned number matches the event's winning number
  const isGoldenWinnerParticipant = React.useCallback((p: Participant | null) => {
    if (!p || !p.numeroAsignado || !eventState?.config?.numeroGanador) return false;
    return String(p.numeroAsignado).padStart(2, '0') === String(eventState.config.numeroGanador).padStart(2, '0');
  }, [eventState?.config?.numeroGanador]);
  const [viewMode, setViewMode] = useState<'tablero' | 'lista'>('tablero');
  const [sortOrder, setSortOrder] = useState<'a-z' | 'z-a' | 'num'>('num');
  const [searchQuery, setSearchQuery] = useState('');
  const [shuffleValue, setShuffleValue] = useState('00');

  // Shuffling logic for show mode
  const isShuffling = eventState?.config?.modoShow && eventState?.config?.showCountdown === 0;
  const showCountdown = eventState?.config?.modoShow && eventState?.config?.showCountdown && eventState.config.showCountdown > 0 ? eventState.config.showCountdown : null;

  React.useEffect(() => {
    if (isShuffling) {
      const interval = setInterval(() => {
        setShuffleValue(String(Math.floor(Math.random() * 100)).padStart(2, '0'));
        if (appConfig.soundEnabled) {
          audio.playTick(150 + Math.random() * 100);
        }
        if (navigator.vibrate) navigator.vibrate(20);
      }, 60);
      return () => clearInterval(interval);
    }
  }, [isShuffling, appConfig.soundEnabled]);

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

  // Generate numbers based on config
  const numbers = React.useMemo(() => {
    const config = eventState?.config || { rangoMin: 1, rangoMax: 999, habilitar00: true };
    const list: string[] = [];
    
    if (config.habilitar00) {
      list.push('00');
    }
    
    for (let i = config.rangoMin; i <= config.rangoMax; i++) {
      list.push(String(i).padStart(2, '0'));
    }
    
    return list;
  }, [eventState?.config]);

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
      <div className="bg-white dark:bg-[#070D19]/80 backdrop-blur-xl border border-slate-200 dark:border-blue-500/10 rounded-2xl p-6 relative shadow-2xl space-y-6">
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
        {/* View Mode: TABLERO (Grid of 25 - 99) */}
        {viewMode === 'tablero' && (
          <>
            <div className="space-y-6">
              <div className="flex items-center justify-between text-xs font-mono bg-slate-50 dark:bg-[#0B1528]/40 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/5">
                <span className="text-slate-500 dark:text-gray-400">Haz clic en un balón dorado para ver los detalles del participante asignado.</span>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full border-2 border-dashed border-slate-300 dark:border-blue-500/40" />
                    <span className="text-slate-500 dark:text-gray-400 text-[11px]">Disponible</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-gradient-to-br from-amber-400 to-amber-700 border border-amber-400/80" />
                    <span className="text-amber-600 dark:text-amber-400 text-[11px]">Asignado</span>
                  </div>
                  {currentProposedNumber && (
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-emerald-500 border border-emerald-300 animate-pulse" />
                      <span className="text-emerald-500 dark:text-emerald-400 text-[11px]">En Sorteo...</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="relative grid grid-cols-5 sm:grid-cols-7 md:grid-cols-9 lg:grid-cols-11 xl:grid-cols-13 gap-4 md:gap-6 justify-center">
                {numbers.map((num) => {
                  const assignedParticipant = assignmentsMap.get(num);
                  const isAssigned = !!assignedParticipant;
                  const isRollingActive = currentProposedNumber === num;
                  const isGoldenWinner = !!eventState?.config?.numeroGanador && num === String(eventState.config.numeroGanador).padStart(2, '0');

                  return (
                    <div
                      key={num}
                      className="flex justify-center items-center"
                    >
                      {isRollingActive ? (
                        <motion.div 
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ repeat: Infinity, duration: 1 }}
                          className="w-12 h-12 md:w-14 md:h-14 rounded-full ball-emerald-3d text-slate-950 flex items-center justify-center font-black text-lg border-2 border-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.5)] z-10"
                        >
                          {num}
                        </motion.div>
                      ) : isAssigned || isGoldenWinner ? (
                        <div className="relative group/ball">
                          <GoldenBall
                            isWinner={isGoldenWinner} 
                            numero={num} 
                            onClick={isAssigned ? () => {
                              if (isGoldenWinner) {
                                triggerCelebration();
                              } else {
                                audio.playSoftClick();
                              }
                              setSelectedParticipant(assignedParticipant);
                            } : undefined} 
                          />
                          
                          {/* Hover Tooltip - Name & Surname in Uppercase */}
                          {isAssigned && (
                            <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 min-w-[200px] max-w-[320px] bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider shadow-2xl opacity-0 group-hover/ball:opacity-100 translate-y-2 group-hover/ball:translate-y-0 transition-all duration-300 pointer-events-none z-[100] border border-white/10 dark:border-amber-400/50 text-center">
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900 dark:border-t-amber-500" />
                              {assignedParticipant.nombre.toUpperCase()} {assignedParticipant.apellido.toUpperCase()}
                            </div>
                          )}
                          {!isAssigned && isGoldenWinner && (
                            <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 whitespace-nowrap bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider shadow-2xl opacity-0 group-hover/ball:opacity-100 translate-y-2 group-hover/ball:translate-y-0 transition-all duration-300 pointer-events-none z-[100] text-center">
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-amber-500" />
                              BALÓN DE ORO (AÚN NO ASIGNADO)
                            </div>
                          )}
                        </div>
                      ) : isShuffling ? (
                        <div
                          className="w-12 h-12 md:w-14 md:h-14 rounded-full border-2 border-amber-500/40 bg-amber-500/10 flex items-center justify-center text-amber-500/80 font-black text-lg select-none animate-pulse"
                        >
                          {shuffleValue}
                        </div>
                      ) : (
                        <div className="w-12 h-12 md:w-14 md:h-14 rounded-full border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 font-medium text-lg select-none cursor-default hover:border-blue-400/50 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors">
                          {num}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Localized Countdown Overlay inside the Board Area */}
                <AnimatePresence>
                  {showCountdown && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.2 }}
                      className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm rounded-[2rem] overflow-hidden"
                    >
                      {/* Dynamic Background Effects */}
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.2)_0%,transparent_70%)] animate-pulse" />
                      <motion.div
                        key={showCountdown}
                        initial={{ scale: 0, opacity: 0, rotate: -45 }}
                        animate={{ scale: 1, opacity: 1, rotate: 0 }}
                        exit={{ scale: 2, opacity: 0, rotate: 45 }}
                        transition={{ type: 'spring', bounce: 0.5 }}
                        className="relative w-64 h-64 md:w-80 md:h-80 ball-gold-3d rounded-full flex flex-col items-center justify-center shadow-[0_0_100px_rgba(245,158,11,0.8)] border-8 border-white/30"
                      >
                        <span className="text-8xl md:text-[140px] font-black text-[#1C160B] italic drop-shadow-[0_4px_4px_rgba(255,255,255,0.5)]">
                          {showCountdown}
                        </span>
                        <span className="text-white text-xl md:text-2xl font-bold uppercase tracking-[0.2em] mt-2 drop-shadow-md bg-black/20 px-4 py-1 rounded-full">
                          ¡PREPÁRATE!
                        </span>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Detail Modal Overlay - Football Card Style */}
            <AnimatePresence>
              {selectedParticipant && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl"
                  onClick={() => setSelectedParticipant(null)}
                >
                  <motion.div
                    initial={{ rotateY: 90, opacity: 0, scale: 0.8 }}
                    animate={{ rotateY: 0, opacity: 1, scale: 1 }}
                    exit={{ rotateY: -90, opacity: 0, scale: 0.8 }}
                    transition={{ type: "spring", damping: 20, stiffness: 100 }}
                    className={`relative w-full max-w-[340px] aspect-[2/3] bg-gradient-to-b rounded-[2rem] p-0.5 shadow-[0_0_50px_rgba(230,194,128,0.2)] border overflow-hidden ${isGoldenWinnerParticipant(selectedParticipant) ? 'from-amber-400 via-amber-600 to-amber-900 border-amber-300 shadow-[0_0_80px_rgba(251,191,36,0.6)]' : 'from-[#1C160B] to-[#0A0702] border-amber-500/30'}`}
                    onClick={e => e.stopPropagation()}
                  >
                    {/* Card Inner Glow & Patterns */}
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none" />
                    <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-amber-500/10 to-transparent pointer-events-none" />
                       
                    <div className="relative h-full flex flex-col items-center p-6 border border-amber-500/20 rounded-[1.9rem] overflow-hidden bg-black/40">
                      {/* Close Button */}
                      <button 
                        onClick={() => setSelectedParticipant(null)}
                        className="absolute top-4 right-4 z-30 p-2 rounded-full bg-black/40 text-amber-500 hover:bg-black/60 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
 
                      {/* Header Section */}
                      <div className="w-full flex justify-between items-start mb-4">
                        <div className="flex flex-col items-center">
                          <span className={`text-4xl font-black leading-none ${isGoldenWinnerParticipant(selectedParticipant) ? 'text-white' : 'text-amber-500'}`}>
                            {selectedParticipant.numeroAsignado}
                          </span>
                          <span className={`text-[10px] font-bold uppercase tracking-tighter ${isGoldenWinnerParticipant(selectedParticipant) ? 'text-amber-200' : 'text-amber-500/60'}`}>
                            {isGoldenWinnerParticipant(selectedParticipant) ? 'BALÓN DE ORO' : 'BOLETA'}
                          </span>
                        </div>
                        <div className="flex flex-col items-end">
                          <Trophy className={`w-8 h-8 mb-1 ${isGoldenWinnerParticipant(selectedParticipant) ? 'text-amber-200 drop-shadow-[0_0_10px_rgba(251,191,36,1)]' : 'text-amber-500/80'}`} />
                          <div className={`w-8 h-1 rounded-full ${isGoldenWinnerParticipant(selectedParticipant) ? 'bg-amber-200 shadow-[0_0_10px_rgba(251,191,36,1)]' : 'bg-amber-500'}`} />
                        </div>
                      </div>
 
                      {/* Visual Player Placeholder (Golden Ball) */}
                      <div className="relative my-4 group">
                        <div className={`absolute inset-0 blur-2xl rounded-full animate-pulse ${isGoldenWinnerParticipant(selectedParticipant) ? 'bg-amber-300/60' : 'bg-amber-500/20'}`} />
                        <div className={`relative w-32 h-32 rounded-full flex items-center justify-center border-4 shadow-2xl ${isGoldenWinnerParticipant(selectedParticipant) ? 'bg-gradient-to-br from-yellow-300 via-amber-400 to-orange-600 border-yellow-200 shadow-[0_0_40px_rgba(251,191,36,0.8)]' : 'ball-gold-3d border-amber-500/40'}`}>
                           <span className={`text-5xl font-black ${isGoldenWinnerParticipant(selectedParticipant) ? 'text-slate-900 drop-shadow-md' : 'text-[#1C160B]'}`}>
                             {selectedParticipant.numeroAsignado}
                           </span>
                        </div>
                      </div>

                      {/* Name & Info Card */}
                      <div className="w-full text-center space-y-2 mt-4">
                        <h3 className="text-2xl font-black text-white leading-tight uppercase tracking-tight drop-shadow-md">
                          {selectedParticipant.nombre} <br/> {selectedParticipant.apellido}
                        </h3>
                        <div className="flex items-center justify-center gap-2">
                          <span className="px-3 py-1 bg-amber-500 text-slate-950 font-black text-[9px] rounded-md uppercase">
                            {selectedParticipant.equipo || 'GLOBAL'}
                          </span>
                          <span className="px-3 py-1 bg-white/10 text-amber-400 font-bold text-[9px] rounded-md uppercase border border-amber-500/20">
                            {selectedParticipant.area || 'GENERAL'}
                          </span>
                        </div>
                      </div>

                      {/* Stats Section (FIFA Style) */}
                      <div className="w-full grid grid-cols-2 gap-x-6 gap-y-3 mt-8 pt-6 border-t border-amber-500/20">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-bold text-amber-500/60 uppercase">PAGO</span>
                          <span className={`text-[10px] font-black ${selectedParticipant.pago ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {selectedParticipant.pago ? 'OK' : 'PEND'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-bold text-amber-500/60 uppercase">RANGO</span>
                          <span className="text-[10px] font-black text-white">TITULAR</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-bold text-amber-500/60 uppercase">PAÍS</span>
                          <span className="text-[10px] font-black text-white">COL</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-bold text-amber-500/60 uppercase">DIV</span>
                          <span className="text-[10px] font-black text-white">ORP</span>
                        </div>
                      </div>

                      {/* Footer Badge */}
                      <div className="mt-auto pt-6 w-full flex justify-center">
                         <div className="flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-amber-600 to-amber-400 rounded-full text-slate-950 font-black text-[10px] shadow-lg">
                           SORTEOSOS 2026 OFFICIAL CARD
                         </div>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
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
