import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Participant, EventState, AppConfig } from '../types';
import { audio } from '../utils/audio';
import { Clock, ShieldCheck, Trophy, Sparkles, Activity } from 'lucide-react';
import socketIOClient from 'socket.io-client';

interface PublicSectionProps {
  participants: Participant[];
  eventState: EventState;
  appConfig: AppConfig;
}

export default function PublicSection({ participants, eventState, appConfig }: PublicSectionProps) {
  const [time, setTime] = useState(new Date().toLocaleTimeString('es-ES'));
  const [localFlasher, setLocalFlasher] = useState('00');
  const [isRolling, setIsRolling] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  // Keep digital clock ticking
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString('es-ES'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Monitor events via WebSocket in real-time
  useEffect(() => {
    const socket = socketIOClient(window.location.origin);

    socket.on('event:rolling', (data: { participantName: string; sequence: string[]; targetNumber: string }) => {
      setIsRolling(true);
      setShowCelebration(false);
      let idx = 0;
      const seq = data.sequence;

      const runTick = () => {
        if (idx < seq.length) {
          setLocalFlasher(seq[idx]);
          if (appConfig.soundEnabled) {
            audio.playTick(220 + idx * 15);
          }
          idx++;
          setTimeout(runTick, appConfig.tempoFlashing + Math.pow(idx / seq.length, 2) * 150);
        } else {
          setLocalFlasher(data.targetNumber);
          setIsRolling(false);
          setShowCelebration(true);
          if (appConfig.soundEnabled) {
            audio.playSuccessFanfare();
          }
        }
      };
      runTick();
    });

    socket.on('event:confirmed', (data: any) => {
      setShowCelebration(false);
      setIsRolling(false);
      setLocalFlasher('00');
    });

    socket.on('event:rerolled', (data: any) => {
      setShowCelebration(false);
      setIsRolling(false);
      setLocalFlasher('00');
    });

    socket.on('event:reset-complete', () => {
      setShowCelebration(false);
      setIsRolling(false);
      setLocalFlasher('00');
    });

    return () => {
      socket.disconnect();
    };
  }, [appConfig.soundEnabled, appConfig.tempoFlashing]);

  // Map values
  const totalAssigned = participants.filter(p => p.numeroAsignado).length;
  const activeUnassigned = participants.filter(p => p.participa && !p.numeroAsignado).length;

  const currentParticipant = participants.find(
    p => p._id?.toString() === eventState.participanteActualId || p.id?.toString() === eventState.participanteActualId
  );

  return (
    <div className="relative min-h-[580px] bg-gradient-to-b from-[#030712] via-[#09142E] to-[#030712] border border-blue-500/15 rounded-3xl p-8 flex flex-col justify-between overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
      {/* Decorative neon rings */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] border border-blue-500/5 rounded-full blur-[2px]" />
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] border border-amber-500/5 rounded-full blur-[1px]" />
      
      {/* Laser glow lines */}
      <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
      <div className="absolute bottom-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />

      {/* Header Spectator Bar */}
      <div className="relative z-10 flex flex-col sm:flex-row justify-between items-center pb-6 border-b border-white/5 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl">
            <Trophy className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-white text-base font-bold uppercase tracking-wider font-sans">
              {appConfig.nombreEvento}
            </h1>
            <p className="text-gray-400 text-xs">Asignación Aleatoria • Modo Proyección Pública</p>
          </div>
        </div>

        {/* Real-time Digital Clock & Status */}
        <div className="flex items-center gap-4 font-mono">
          <div className="flex items-center gap-2 bg-[#0C152B]/80 border border-blue-500/20 px-3.5 py-1.5 rounded-xl text-blue-300 text-xs shadow-lg">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span>{time}</span>
          </div>
          <span className="flex items-center gap-1.5 text-[10px] bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 px-3 py-1.5 rounded-xl uppercase tracking-widest font-extrabold animate-pulse">
            <Activity className="w-3 h-3" />
            Sincronizado
          </span>
        </div>
      </div>

      {/* Spectacular Central Projection Sphere */}
      <div className="relative z-10 my-12 flex flex-col items-center justify-center text-center space-y-8">
        <AnimatePresence mode="wait">
          {eventState.participanteActualId ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="space-y-6"
            >
              <div className="space-y-1">
                <span className="text-amber-400 text-xs font-mono uppercase tracking-widest font-bold flex items-center justify-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                  {isRolling ? 'Sorteando Número Único...' : 'Asignación Confirmada'}
                </span>
                <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight drop-shadow-[0_2px_15px_rgba(255,255,255,0.1)] leading-none">
                  {currentParticipant?.nombre} {currentParticipant?.apellido}
                </h2>
                <p className="text-gray-400 text-sm font-sans tracking-wide">
                  {currentParticipant?.equipo} • {currentParticipant?.area}
                </p>
              </div>

              {/* Magnificent sphere structure */}
              <div className="flex justify-center py-4">
                <div className="relative">
                  {/* Rotating visual galaxy ring */}
                  <div className="absolute inset-[-15px] rounded-full bg-gradient-to-tr from-[#E6C280] via-[#3B82F6] to-transparent animate-spin opacity-45 blur-[10px]" />
                  <div className="absolute inset-0 rounded-full bg-black ring-4 ring-amber-400/25 shadow-[0_0_50px_rgba(230,194,128,0.25)]" />

                  <div className="relative w-44 h-44 rounded-full bg-gradient-to-br from-[#121E36] to-[#02050A] border-3 border-[#E6C280]/70 flex items-center justify-center shadow-[inset_0_0_20px_rgba(230,194,128,0.3)]">
                    <motion.span
                      key={localFlasher}
                      initial={{ scale: 0.7, opacity: 0.3 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 350, damping: 10 }}
                      className="text-7xl font-mono font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-amber-200 to-amber-400 tracking-tighter"
                    >
                      {isRolling ? localFlasher.padStart(2, '0') : (eventState.numeroPropuesto || '00').padStart(2, '0')}
                    </motion.span>
                  </div>
                </div>
              </div>

              {showCelebration && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-amber-400/10 border border-amber-400/25 px-5 py-2.5 rounded-2xl max-w-sm mx-auto"
                >
                  <p className="text-amber-400 font-sans font-bold text-xs">
                    🎉 ¡Número asignado con total transparencia! 🎉
                  </p>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="max-w-md space-y-4 py-12"
            >
              <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto shadow-inner">
                <ShieldCheck className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="text-white text-lg font-bold">Asignación Auditada SorteoSOS</h3>
              <p className="text-gray-400 text-xs leading-relaxed max-w-sm mx-auto">
                Esperando a que el operador asigne el próximo participante disponible. Todo el proceso es monitoreado, aleatorizado por Fisher-Yates, y registrado de forma transparente en la base de datos.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer statistics meters */}
      <div className="relative z-10 border-t border-white/5 pt-6 grid grid-cols-2 sm:grid-cols-3 gap-6">
        <div>
          <span className="text-gray-500 text-[10px] uppercase font-mono tracking-wider block">Asignaciones Completadas</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-white text-xl font-bold">{totalAssigned}</span>
            <span className="text-gray-500 text-xs">/ 52 participantes</span>
          </div>
          <div className="w-full bg-slate-900 h-1.5 rounded-full mt-2 overflow-hidden border border-white/5">
            <div 
              className="bg-gradient-to-r from-blue-500 to-amber-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (totalAssigned / 52) * 100)}%` }}
            />
          </div>
        </div>

        <div>
          <span className="text-gray-500 text-[10px] uppercase font-mono tracking-wider block">Estado del Sorteo</span>
          <span className="text-amber-400 text-sm font-bold uppercase tracking-wider block mt-1">
            {eventState.estado === 'FINALIZADO' ? '🏆 Sorteo Concluido' : '● Activo en Vivo'}
          </span>
          <span className="text-[10px] text-gray-500 font-mono">Algoritmo: Fisher-Yates único</span>
        </div>

        <div className="col-span-2 sm:col-span-1 flex items-center sm:justify-end">
          <div className="text-right text-[10px] text-gray-500 font-mono space-y-0.5 border-l sm:border-l-0 sm:border-r border-white/10 px-4">
            <p>DB: MongoDB (Cloud Atlas)</p>
            <p>WS ID: socket-sync-active</p>
          </div>
        </div>
      </div>
    </div>
  );
}
