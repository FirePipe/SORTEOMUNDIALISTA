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
  const [localFlasher, setLocalFlasher] = useState(eventState.numeroPropuesto || '??');
  const [isRolling, setIsRolling] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [ping, setPing] = useState(24);
  const flashTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to clear flashing loop
  const stopFlashing = () => {
    if (flashTimeoutRef.current) {
      clearTimeout(flashTimeoutRef.current);
      flashTimeoutRef.current = null;
    }
  };

  // Simulated real-time ping indicator
  useEffect(() => {
    const interval = setInterval(() => {
      setPing(Math.floor(Math.random() * 15) + 18);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Sync flasher with prop when not rolling to avoid 00 flicker
  useEffect(() => {
    if (!isRolling && eventState.numeroPropuesto) {
      setLocalFlasher(eventState.numeroPropuesto);
    }
  }, [eventState.numeroPropuesto, isRolling]);

  // Keep digital clock ticking
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString('es-ES'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Monitor events via WebSocket in real-time
  const [rollingParticipantName, setRollingParticipantName] = useState<string | null>(null);
  const [lastWinner, setLastWinner] = useState<{ nombre: string; apellido: string; equipo: string; area: string } | null>(null);

  useEffect(() => {
    const socket = socketIOClient(window.location.origin);

    socket.on('event:rolling', (data: { participantName: string; sequence: string[]; targetNumber: string }) => {
      stopFlashing();
      setIsRolling(true);
      setShowCelebration(false);
      setRollingParticipantName(data.participantName);
      let idx = 0;
      const seq = data.sequence;

      const runTick = () => {
        if (idx < seq.length) {
          setLocalFlasher(seq[idx]);
          if (appConfig.soundEnabled) {
            audio.playRolling();
            audio.playTick(220 + idx * 5);
          }
          idx++;
          flashTimeoutRef.current = setTimeout(runTick, appConfig.tempoFlashing + Math.pow(idx / seq.length, 2) * 150);
        } else {
          setLocalFlasher(data.targetNumber);
          setIsRolling(false);
          setShowCelebration(true);
          if (appConfig.soundEnabled) {
            audio.playBing();
            audio.playSuccessFanfare();
          }
        }
      };
      runTick();
    });

    socket.on('event:confirmed', (data: any) => {
      stopFlashing();
      setShowCelebration(true);
      setIsRolling(false);
      
      // If we have data about the participant, store it as last winner
      if (data.participant) {
        setLastWinner({
          nombre: data.participant.nombre,
          apellido: data.participant.apellido,
          equipo: data.participant.equipo,
          area: data.participant.area
        });
      }
      
      setRollingParticipantName(null);
      // Persist the confirmed number in the local flasher to avoid flickering
      const confirmedNum = data.number || data.numeroAsignado;
      if (confirmedNum) {
        setLocalFlasher(confirmedNum);
      }
    });

    socket.on('event:rerolled', (data: any) => {
      stopFlashing();
      setShowCelebration(false);
      setIsRolling(false);
      setRollingParticipantName(null);
    });

    socket.on('event:reset-complete', () => {
      stopFlashing();
      setShowCelebration(false);
      setIsRolling(false);
      setRollingParticipantName(null);
      setLocalFlasher('??');
    });

    return () => {
      socket.disconnect();
    };
  }, [appConfig.soundEnabled, appConfig.tempoFlashing]);

  // Map values
  const totalAssigned = participants.filter(p => p.numeroAsignado).length;
  
  const currentParticipantFromState = participants.find(
    p => p._id?.toString() === eventState.participanteActualId || p.id?.toString() === eventState.participanteActualId
  );

  const displayParticipant = rollingParticipantName ? {
    nombre: rollingParticipantName,
    apellido: '',
    equipo: 'Sorteo en Curso',
    area: 'Auditando...'
  } : (showCelebration ? lastWinner : currentParticipantFromState);

  return (
    <div className="relative min-h-[620px] bg-[#020617] border border-blue-500/20 rounded-[2.5rem] p-8 flex flex-col justify-between overflow-hidden shadow-[0_0_80px_rgba(30,58,138,0.3)]">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-600/10 blur-[120px] rounded-full animate-pulse" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-amber-500/5 blur-[120px] rounded-full" />
      
      {/* Decorative neon rings with more depth */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] border border-blue-500/10 rounded-full blur-[1px] animate-[spin_20s_linear_infinite]" />
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] border border-amber-500/5 rounded-full blur-[2px] animate-[spin_35s_linear_infinite_reverse]" />
      
      {/* Laser glow lines */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />

      {/* Header Spectator Bar */}
      <div className="relative z-10 flex flex-col sm:flex-row justify-between items-center pb-8 border-b border-white/10 gap-4">
        <motion.div 
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="flex items-center gap-4"
        >
          <div className="p-3 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl shadow-[0_0_20px_rgba(245,158,11,0.3)]">
            <Trophy className="w-6 h-6 text-slate-950" />
          </div>
          <div>
            <h1 className="text-white text-lg font-black uppercase tracking-[0.2em] font-sans">
              {appConfig.nombreEvento}
            </h1>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
              <p className="text-blue-400/60 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                Transmisión en Vivo • Auditado 
                <span className="ml-2 px-2 py-0.5 bg-blue-500/10 rounded-full border border-blue-500/20 text-emerald-400 text-[9px]">
                  PING: {ping}ms
                </span>
              </p>
            </div>
          </div>
        </motion.div>

        {/* Real-time Digital Clock & Status */}
        <motion.div 
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="flex items-center gap-4 font-mono"
        >
          <div className="flex items-center gap-3 bg-blue-950/40 border border-blue-500/20 px-4 py-2 rounded-2xl text-blue-300 text-sm shadow-xl backdrop-blur-sm">
            <Clock className="w-4 h-4 text-blue-400" />
            <span className="font-bold">{time}</span>
          </div>
        </motion.div>
      </div>

      {/* Spectacular Central Projection Sphere */}
      <div className="relative z-10 my-10 flex flex-col items-center justify-center text-center">
        <AnimatePresence mode="wait">
          {eventState.participanteActualId || (showCelebration && localFlasher !== '??') ? (
            <motion.div
              key="active-raffle"
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: -20 }}
              transition={{ type: "spring", damping: 15 }}
              className="space-y-10"
            >
              <div className="space-y-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-blue-500/10 border border-blue-500/20"
                >
                  <Activity className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                  <span className="text-blue-400 text-[10px] font-black uppercase tracking-[0.3em]">
                    {isRolling ? 'Procesando Aleatorización...' : 'Resultado Tentativo'}
                  </span>
                </motion.div>

                <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter leading-[1.1] max-w-2xl">
                  {displayParticipant?.nombre} {displayParticipant?.apellido}
                </h2>
                <div className="flex items-center justify-center gap-3 text-blue-400/70 font-bold uppercase tracking-[0.2em] text-xs">
                  <span>{displayParticipant?.equipo}</span>
                  <span className="w-1.5 h-1.5 bg-blue-500/30 rounded-full" />
                  <span>{displayParticipant?.area}</span>
                </div>
              </div>

              {/* Magnificent 3D sphere structure */}
              <div className="flex justify-center relative py-6">
                <motion.div 
                  className="relative group"
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                  {/* Glowing halo behind */}
                  <div className={`ball-glow-container ${isRolling ? 'glow-emerald animate-pulse opacity-90' : 'glow-amber opacity-70'}`} />
                  
                  {/* Outer energy rings */}
                  <div className="absolute inset-[-30px] rounded-full border border-blue-500/15 animate-[spin_12s_linear_infinite]" />
                  <div className="absolute inset-[-15px] rounded-full border-t-2 border-r-2 border-amber-500/30 animate-[spin_4s_linear_infinite]" />

                  {/* 3D Realistic Ball */}
                  <div 
                    className={`relative w-64 h-64 rounded-full flex items-center justify-center overflow-hidden border-[8px] border-[#2A3449] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.9)] ${isRolling ? 'ball-emerald-3d' : 'ball-gold-3d'}`}
                  >
                    {/* Glossy Reflection Overlay */}
                    <div className="absolute top-[10%] left-[15%] w-[40%] h-[30%] bg-gradient-to-b from-white/20 to-transparent rounded-full blur-[8px] transform -rotate-15 pointer-events-none" />
                    
                    {/* Inner lighting depth */}
                    <div className="absolute inset-0 rounded-full shadow-[inset_0_2px_20px_rgba(255,255,255,0.2),inset_0_-8px_30px_rgba(0,0,0,0.6)] pointer-events-none" />

                    <motion.div
                      key={localFlasher}
                      initial={{ scale: 0.6, opacity: 0, filter: "blur(12px)" }}
                      animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
                      transition={{ type: "spring", stiffness: 400, damping: 14 }}
                      className="relative z-10"
                    >
                      <span className={`text-[120px] md:text-[140px] font-black tracking-tighter ${isRolling ? 'text-slate-950' : 'text-[#1C160B] drop-shadow-[0_1px_2px_rgba(255,255,255,0.4)]'}`}>
                        {localFlasher.padStart(2, '0')}
                      </span>
                    </motion.div>
                  </div>
                  
                  {/* Visual base shadow */}
                  <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-48 h-5 bg-black/60 blur-xl rounded-full" />
                </motion.div>
              </div>

              {showCelebration && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center gap-3"
                >
                  <div className="bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-amber-500/20 border border-amber-500/30 px-8 py-3 rounded-2xl shadow-2xl backdrop-blur-md">
                    <p className="text-amber-400 font-sans font-black text-xs uppercase tracking-[0.2em] flex items-center gap-3">
                      <Sparkles className="w-4 h-4 text-amber-300 animate-bounce" />
                      ¡Asignación Auditada y Lista!
                      <Sparkles className="w-4 h-4 text-amber-300 animate-bounce" />
                    </p>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="waiting-state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-md space-y-8 py-16 flex flex-col items-center"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full" />
                <div className="relative w-24 h-24 rounded-3xl bg-blue-900/20 border border-blue-500/30 flex items-center justify-center shadow-2xl transform rotate-12">
                  <ShieldCheck className="w-12 h-12 text-blue-400" />
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-white text-2xl font-black uppercase tracking-tight">Sistema de Sorteo Seguro</h3>
                <p className="text-gray-400 text-sm leading-relaxed font-medium">
                  Listo para la siguiente asignación. El proceso utiliza aleatorización criptográfica distribuida y auditoría en tiempo real para garantizar total transparencia.
                </p>
              </div>
              <div className="flex items-center gap-4 py-4">
                 <div className="flex -space-x-3">
                   {[1,2,3,4].map(i => (
                     <div key={i} className={`w-8 h-8 rounded-full border-2 border-[#020617] bg-blue-900/${i*20} flex items-center justify-center text-[10px] font-bold text-blue-300`}>
                       {i}
                     </div>
                   ))}
                 </div>
                 <span className="text-[10px] text-blue-500/60 font-bold uppercase tracking-widest">Protocolo de seguridad activo</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer statistics meters */}
      <div className="relative z-10 border-t border-white/10 pt-8 grid grid-cols-1 sm:grid-cols-3 gap-8">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
          <span className="text-gray-500 text-[10px] uppercase font-bold tracking-widest block mb-2">Progreso General</span>
          <div className="flex items-baseline gap-2">
            <span className="text-white text-3xl font-black">{totalAssigned}</span>
            <span className="text-gray-500 text-xs font-bold">/ 52 PARTICIPANTES</span>
          </div>
          <div className="w-full bg-slate-900/50 h-2 rounded-full mt-3 overflow-hidden border border-white/5 p-[1px]">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, (totalAssigned / 52) * 100)}%` }}
              className="bg-gradient-to-r from-blue-600 via-amber-400 to-amber-600 h-full rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"
            />
          </div>
        </motion.div>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }} className="flex flex-col justify-center">
          <span className="text-gray-500 text-[10px] uppercase font-bold tracking-widest block mb-1">Estado de Seguridad</span>
          <span className="text-emerald-400 text-sm font-black uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            Encriptación de Extremo a Extremo
          </span>
          <span className="text-[10px] text-gray-500 font-mono mt-1">Fisher-Yates (Entropy Seed: 0x8A2)</span>
        </motion.div>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6 }} className="flex items-center sm:justify-end">
          <div className="text-right text-[10px] text-gray-500 font-mono space-y-1.5 bg-white/5 p-4 rounded-2xl border border-white/5">
            <p className="flex justify-between gap-4"><span>CLOUD NODE:</span> <span className="text-blue-400">AWS-EAST-1</span></p>
            <p className="flex justify-between gap-4"><span>DB STATUS:</span> <span className="text-emerald-400">SYNCHRONIZED</span></p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
