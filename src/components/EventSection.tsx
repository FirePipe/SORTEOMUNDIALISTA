import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Participant, EventState, AppConfig } from '../types';
import { audio } from '../utils/audio';
import { 
  Play, RotateCcw, Check, Sparkles, AlertCircle, 
  Settings, Volume2, VolumeX, Eye, ArrowRight, Activity, HelpCircle,
  Pause, Clock, Database, Server, Wifi, WifiOff, RefreshCw, CheckCircle, Info
} from 'lucide-react';

interface EventSectionProps {
  participants: Participant[];
  eventState: EventState;
  appConfig: AppConfig;
  onUpdateEventStatus: (status: "LISTO" | "EJECUTANDO" | "PAUSADO" | "FINALIZADO") => Promise<void>;
  onRollNumber: (participantId: string) => Promise<{ chosenNumber: string; sequence: string[] }>;
  onRerollNumber: () => Promise<void>;
  onConfirmNumber: () => Promise<void>;
  onAutoAssign: () => Promise<void>;
  onResetEvent: () => Promise<void>;
  onUpdateConfig: (config: Partial<AppConfig>) => Promise<void>;
  dbStatus?: { connected: boolean; mode: string; uri: string; error: string | null };
  onRefreshDbStatus?: () => void;
}

export default function EventSection({
  participants,
  eventState,
  appConfig,
  onUpdateEventStatus,
  onRollNumber,
  onRerollNumber,
  onConfirmNumber,
  onAutoAssign,
  onResetEvent,
  onUpdateConfig,
  dbStatus,
  onRefreshDbStatus
}: EventSectionProps) {
  const [selectedParticipantId, setSelectedParticipantId] = useState(eventState.participanteActualId || '');
  
  // Keep selectedParticipantId in sync with eventState for persistence/recovery
  useEffect(() => {
    if (eventState.participanteActualId && selectedParticipantId !== eventState.participanteActualId) {
      setSelectedParticipantId(eventState.participanteActualId);
    }
  }, [eventState.participanteActualId]);

  // Drawing states
  const [isFlashing, setIsFlashing] = useState(false);
  const [flashNumber, setFlashNumber] = useState(eventState.numeroPropuesto || '??');
  const [confettiActive, setConfettiActive] = useState(false);

  // Robust sync: Only update flashNumber if NOT currently animating
  useEffect(() => {
    if (!isFlashing && eventState.numeroPropuesto) {
      setFlashNumber(eventState.numeroPropuesto);
    }
  }, [eventState.numeroPropuesto, isFlashing]);
  const [showRerollConfirm, setShowRerollConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const [isSequentialActive, setIsSequentialActive] = useState(false);
  const isSequentialActiveRef = useRef(false);
  const [drawStrategy, setDrawStrategy] = useState<'sequential' | 'random'>('sequential');
  const drawStrategyRef = useRef<'sequential' | 'random'>('sequential');

  // States to track sequential drawing details
  const [seqStep, setSeqStep] = useState<'idle' | 'selecting' | 'rolling' | 'celebrating' | 'pausing' | 'confirming'>('idle');
  const [seqCountdown, setSeqCountdown] = useState<number | null>(null);
  const [seqCurrentName, setSeqCurrentName] = useState<string>('');

  const setSequentialActive = (active: boolean) => {
    isSequentialActiveRef.current = active;
    setIsSequentialActive(active);
  };

  const flashIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Use refs to keep loop data fresh without re-triggering the useEffect
  const participantsRef = useRef(participants);
  const eventStateRef = useRef(eventState);

  useEffect(() => {
    participantsRef.current = participants;
  }, [participants]);

  useEffect(() => {
    eventStateRef.current = eventState;
  }, [eventState]);

  // List of active participants who still do not have an assigned number
  const unassignedParticipants = React.useMemo(() => {
    return participants.filter(p => p.participa && !p.numeroAsignado);
  }, [participants]);

  // Handle local Web Audio API volume triggers
  const toggleSound = () => {
    onUpdateConfig({ soundEnabled: !appConfig.soundEnabled });
  };

  // HTML5 high performance canvas particles for celebratory Confetti
  useEffect(() => {
    if (!confettiActive || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
    canvas.height = canvas.parentElement?.clientHeight || 450;

    const colors = ['#E6C280', '#D4AF37', '#3B82F6', '#60A5FA', '#FBBF24', '#F59E0B'];
    const particles = Array.from({ length: 150 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      size: Math.random() * 6 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      speed: Math.random() * 4 + 2,
      rotation: Math.random() * 360,
      rotationSpeed: Math.random() * 5 - 2.5
    }));

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.y += p.speed;
        p.rotation += p.rotationSpeed;
        if (p.y > canvas.height) {
          p.y = -20;
          p.x = Math.random() * canvas.width;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    // auto shutoff after 6 seconds
    const timeout = setTimeout(() => {
      setConfettiActive(false);
    }, 6000);

    return () => {
      cancelAnimationFrame(animationFrameId);
      clearTimeout(timeout);
    };
  }, [confettiActive]);

  // Clean up timer
  useEffect(() => {
    return () => {
      if (flashIntervalRef.current) clearTimeout(flashIntervalRef.current);
    };
  }, []);

  // Run single randomized drawing wrapped in a Promise
  const triggerRollPromise = (participantId: string): Promise<string> => {
    return new Promise(async (resolve, reject) => {
      if (isFlashing) return reject("Already rolling");
      
      setIsFlashing(true);
      setConfettiActive(false);
      setFlashNumber('??'); // Loading indicator

      try {
        const res = await onRollNumber(participantId);
        const { chosenNumber, sequence } = res;

        let flashIdx = 0;
        const totalSteps = sequence.length;
        const baseDelay = appConfig.tempoFlashing;

        const runFlash = () => {
          if (flashIdx < totalSteps) {
            const currentNum = sequence[flashIdx];
            setFlashNumber(currentNum);
            
            if (appConfig.soundEnabled) {
              audio.playRolling();
              const pitch = 220 + (flashIdx * 5);
              audio.playTick(pitch);
            }

            flashIdx++;
            const nextDelay = baseDelay + Math.pow(flashIdx / totalSteps, 2) * 150;
            flashIntervalRef.current = setTimeout(runFlash, nextDelay);
          } else {
            // Final lock: Use chosenNumber directly
            setFlashNumber(chosenNumber);
            setIsFlashing(false);
            
            if (appConfig.soundEnabled) {
              audio.playBing();
              audio.playSuccessFanfare();
            }
            setConfettiActive(true);
            resolve(chosenNumber);
          }
        };

        // If sequence is too short, wait a bit for "drama"
        if (totalSteps < 5) {
          setTimeout(runFlash, 500);
        } else {
          runFlash();
        }
      } catch (e) {
        setIsFlashing(false);
        setFlashNumber('??');
        reject(e);
      }
    });
  };

  const handleTriggerRoll = async (participantId: string) => {
    if (!participantId) return;
    try {
      await triggerRollPromise(participantId);
    } catch (e) {
      console.error("Roll failed:", e);
    }
  };

  const triggerSingleRoll = async () => {
    await handleTriggerRoll(selectedParticipantId);
  };

  const handleConfirm = async () => {
    try {
      await onConfirmNumber();
      setConfettiActive(false);
      setSelectedParticipantId('');
      setFlashNumber('??');
    } catch (e) {
      console.error(e);
    }
  };

  const handleReroll = async () => {
    try {
      if (isFlashing) return;
      const currentParticipantId = selectedParticipantId || eventState.participanteActualId;
      if (!currentParticipantId) return;

      await onRerollNumber();
      setConfettiActive(false);
      setFlashNumber('??');
      setShowRerollConfirm(false);
      
      // Wait a tiny bit for state to settle before starting next roll
      setTimeout(() => {
        handleTriggerRoll(currentParticipantId);
      }, 150);
    } catch (e) {
      console.error(e);
    }
  };

  // Automated 1-by-1 Sequential Loop Effect
  useEffect(() => {
    if (!isSequentialActive) {
      setSeqStep('idle');
      setSeqCountdown(null);
      return;
    }

    let isMounted = true;
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const run = async () => {
      while (isSequentialActiveRef.current && isMounted) {
        // 1. Check if there is an active participant already that hasn't been confirmed yet
        // Access via Ref to avoid dependency loop
        const currentEventState = eventStateRef.current;
        const currentParticipants = participantsRef.current;

        if (currentEventState.participanteActualId && currentEventState.numeroPropuesto) {
          const currentP = currentParticipants.find(
            p => p._id?.toString() === currentEventState.participanteActualId?.toString() || p.id?.toString() === currentEventState.participanteActualId?.toString()
          );
          setSeqCurrentName(currentP ? `${currentP.nombre} ${currentP.apellido}` : 'Participante');
          setFlashNumber(currentEventState.numeroPropuesto);
          
          // Pause and countdown for confirmation
          setSeqStep('pausing');
          for (let i = 6; i > 0; i--) {
            if (!isSequentialActiveRef.current || !isMounted) return;
            setSeqCountdown(i);
            await delay(1000);
          }
          if (!isSequentialActiveRef.current || !isMounted) return;
          
          setSeqStep('confirming');
          await handleConfirm();
          await delay(2000);
          continue;
        }

        // 2. Find next unassigned participant based on strategy
        let nextParticipant: Participant | undefined;
        
        // If we have an active participant but NO proposed number (REROLLED state)
        if (currentEventState.participanteActualId && !currentEventState.numeroPropuesto) {
          nextParticipant = currentParticipants.find(
            p => p._id?.toString() === currentEventState.participanteActualId?.toString() || p.id?.toString() === currentEventState.participanteActualId?.toString()
          );
        }

        // Otherwise find a new one
        if (!nextParticipant) {
          if (drawStrategyRef.current === 'random') {
            const available = currentParticipants.filter(p => p.participa && !p.numeroAsignado);
            if (available.length > 0) {
              nextParticipant = available[Math.floor(Math.random() * available.length)];
            }
          } else {
            nextParticipant = currentParticipants.find(p => p.participa && !p.numeroAsignado);
          }
        }
        
        if (!nextParticipant) {
          // No more participants!
          setSequentialActive(false);
          setSeqStep('idle');
          setSeqCountdown(null);
          break;
        }

        // 3. We have a participant! Proceed to roll
        const pId = nextParticipant._id || nextParticipant.id || '';
        setSeqCurrentName(`${nextParticipant.nombre} ${nextParticipant.apellido}`);
        setSelectedParticipantId(pId);
        setSeqStep('selecting');
        
        // Wait 2.5 seconds to read name on screen
        await delay(2500);
        if (!isSequentialActiveRef.current || !isMounted) return;

        // Trigger roll
        setSeqStep('rolling');
        try {
          const chosen = await triggerRollPromise(pId);
          if (!isMounted || !isSequentialActiveRef.current) return;

          // Celebrate for 2.5 seconds of flashing confetti
          setSeqStep('celebrating');
          setFlashNumber(chosen);
          await delay(2500);
          if (!isMounted || !isSequentialActiveRef.current) return;

          // Pause and countdown (Verification pause)
          setSeqStep('pausing');
          for (let i = 6; i > 0; i--) {
            if (!isSequentialActiveRef.current || !isMounted) return;
            setSeqCountdown(i);
            await delay(1000);
          }
          if (!isMounted || !isSequentialActiveRef.current) return;

          // Confirm and write to DB
          setSeqStep('confirming');
          await handleConfirm();
          // Give 2 seconds of resting breathing space
          await delay(2000);
        } catch (err) {
          console.error("Error during sequential roll step:", err);
          // If already rolling, just wait a bit and try again
          if (err === "Already rolling") {
            await delay(1000);
            continue;
          }
          setSequentialActive(false);
          setSeqStep('idle');
          break;
        }
      }
    };

    run();

    return () => {
      isMounted = false;
    };
  }, [isSequentialActive]);

  // Find active drawing participant name
  const currentParticipant = participants.find(
    p => p._id?.toString() === eventState.participanteActualId || p.id?.toString() === eventState.participanteActualId
  );

  return (
    <div className="space-y-6">
      {/* MongoDB Connection Status & Diagnostics Dashboard */}
      <div className="bg-[#070D19]/80 border border-blue-500/10 p-5 rounded-2xl shadow-xl backdrop-blur-xl space-y-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/35 to-transparent" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${dbStatus?.connected ? 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-400' : 'bg-amber-500/10 border border-amber-500/25 text-amber-400'}`}>
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-white font-medium text-sm flex items-center gap-2">
                Conectividad de Base de Datos SorteoSOS
                {dbStatus?.connected ? (
                  <span className="inline-flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    En Línea
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 bg-amber-500/10 border border-amber-500/25 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    Almacenamiento Local
                  </span>
                )}
              </h3>
              <p className="text-gray-400 text-xs font-sans">Monitoreo de sincronización y estado del clúster remoto en MongoDB Atlas</p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch md:self-auto justify-end">
            <button
              onClick={onRefreshDbStatus}
              className="flex items-center gap-1.5 bg-[#0B1528] hover:bg-blue-500/10 px-3.5 py-1.5 border border-blue-500/15 rounded-xl text-xs text-gray-300 transition-colors cursor-pointer"
              title="Volver a verificar estado de la base de datos"
            >
              <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
              Verificar Conexión
            </button>
          </div>
        </div>

        {/* Database statistics info row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
          <div className="bg-[#050B17] border border-white/5 p-3.5 rounded-xl">
            <span className="text-[10px] text-gray-500 font-mono uppercase block">Motor Activo</span>
            <span className="text-xs font-semibold text-white mt-1 block">
              {dbStatus?.mode || 'Cargando...'}
            </span>
          </div>

          <div className="bg-[#050B17] border border-white/5 p-3.5 rounded-xl">
            <span className="text-[10px] text-gray-500 font-mono uppercase block">Dirección del Clúster</span>
            <span className="text-xs font-mono text-gray-400 mt-1 block truncate" title={dbStatus?.uri}>
              {dbStatus?.uri || 'No disponible'}
            </span>
          </div>

          <div className="bg-[#050B17] border border-white/5 p-3.5 rounded-xl">
            <span className="text-[10px] text-gray-500 font-mono uppercase block">Estado Colecciones</span>
            <span className="text-xs font-semibold text-amber-400 mt-1 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>Participantes, Eventos, Historial</span>
            </span>
          </div>
        </div>

        {/* If we have errors / fallback mode is active, show diagnostics and troubleshoot instructions */}
        {!dbStatus?.connected && (
          <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-4 space-y-3">
            <div className="flex gap-2 text-amber-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="text-xs font-bold font-sans uppercase tracking-wide block">Fallo en Conexión a MongoDB Atlas - Modo de Contingencia Activo</span>
                <p className="text-[11px] text-gray-400 leading-relaxed font-sans">
                  El sistema no pudo establecer conexión con el clúster remoto de MongoDB Atlas. Se ha activado el **Módulo de Contingencia Local**, el cual guarda todas las asignaciones y bitácoras de auditoría en memoria y archivo JSON local (`/data/sorteo_db.json`). Todo funciona al 100%, pero se recomienda configurar tu conexión.
                </p>
              </div>
            </div>

            {dbStatus?.error && (
              <div className="bg-black/40 border border-white/5 rounded-lg p-2.5">
                <span className="text-[9px] font-mono text-rose-400 uppercase tracking-widest block mb-1">Registro de Error Técnico (Mongoose/Atlas)</span>
                <p className="text-[10px] font-mono text-gray-300 break-all leading-normal">
                  {dbStatus.error}
                </p>
              </div>
            )}

            <div className="pt-1.5 border-t border-white/5 space-y-2">
              <span className="text-[10px] font-bold font-mono text-amber-400/80 uppercase block">Posibles Causas y Soluciones:</span>
              <ul className="text-[10px] text-gray-400 list-disc list-inside space-y-1 font-sans">
                <li><strong className="text-gray-300">Lista blanca de IPs en MongoDB Atlas:</strong> Asegúrate de que la IP del servidor de Cloud Run tenga permitido el acceso (puedes agregar <code className="bg-[#050B17] px-1 rounded text-amber-500">0.0.0.0/0</code> en Network Access en la consola de Atlas).</li>
                <li><strong className="text-gray-300">Formato del URI de Conexión:</strong> Verifica que el URI en las variables de entorno sea el correcto y no contenga caracteres inválidos o dobles arrobas (<code className="bg-[#050B17] px-1 rounded">@</code>).</li>
                <li><strong className="text-gray-300">Credenciales Inválidas:</strong> Valida que el usuario (<code className="bg-[#050B17] px-1 rounded">pipeblox_db_user</code>) y la contraseña sean correctos en el Secrets Manager de AI Studio o tu archivo local.</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Simulation/Event Configuration Controls Card */}
      <div className="bg-[#070D19]/80 border border-blue-500/10 p-5 rounded-2xl shadow-xl backdrop-blur-xl flex flex-wrap gap-6 items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="w-5 h-5 text-amber-400" />
          <div>
            <h3 className="text-white font-medium text-sm">Ajustes de Sorteo</h3>
            <p className="text-gray-400 text-xs">Ajusta la velocidad y sonido del sorteo oficial</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2 bg-[#0B1528] px-3 py-1.5 border border-blue-500/15 rounded-xl text-xs text-gray-300">
            <span>Intervalo:</span>
            <input
              type="range"
              min="30"
              max="200"
              value={appConfig.tempoFlashing}
              onChange={(e) => onUpdateConfig({ tempoFlashing: Number(e.target.value) })}
              className="w-20 accent-amber-400"
            />
            <span>{appConfig.tempoFlashing}ms</span>
          </div>

          <button
            onClick={toggleSound}
            className="flex items-center gap-1.5 bg-[#0B1528] hover:bg-blue-500/10 px-3.5 py-1.5 border border-blue-500/15 rounded-xl text-xs text-gray-300 transition-colors cursor-pointer"
          >
            {appConfig.soundEnabled ? (
              <>
                <Volume2 className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">Sonido Activado</span>
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4 text-rose-400" />
                <span className="text-gray-400">Silenciado</span>
              </>
            )}
          </button>

          <button
            onClick={() => setShowResetConfirm(true)}
            className="flex items-center gap-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 px-3.5 py-1.5 rounded-xl text-xs text-rose-400 font-semibold transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reiniciar SorteoSOS
          </button>
        </div>
      </div>

      {/* Main TV Show Lottery Stage */}
      <div className="relative bg-gradient-to-b from-[#080E1C] to-[#03060C] border border-blue-500/15 rounded-3xl p-8 shadow-2xl overflow-hidden min-h-[460px] flex flex-col justify-between">
        {/* Particle Canvas */}
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-10" />

        {/* Ambient Glows */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/5 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-amber-500/5 rounded-full blur-[100px]" />

        {/* Top bar HUD */}
        <div className="relative z-20 flex justify-between items-center pb-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-gray-400 text-xs uppercase font-mono tracking-widest">
              SorteoSOS Oficial • En Proyección
            </span>
          </div>
          <div className="text-xs font-mono bg-blue-500/15 text-blue-300 border border-blue-500/20 px-3 py-1 rounded-full flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-blue-400 animate-spin" />
            <span>Faltan {unassignedParticipants.length} Participantes</span>
          </div>
        </div>

        {/* Center Display: Suspense & Number flasher */}
        <div className="relative z-20 my-10 flex flex-col items-center justify-center text-center space-y-6">
          <AnimatePresence mode="wait">
            {eventState.participanteActualId ? (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-4"
              >
                <div className="space-y-1">
                  <span className="text-amber-400 text-xs font-mono uppercase tracking-widest font-bold">
                    {isFlashing ? 'Asignando número aleatorio...' : 'Número Asignado Tentativo'}
                  </span>
                  <h2 className="text-2xl md:text-3xl font-extrabold text-white leading-tight">
                    {currentParticipant?.nombre} {currentParticipant?.apellido}
                  </h2>
                  <p className="text-gray-400 text-xs font-mono">
                    {currentParticipant?.equipo} • {currentParticipant?.area}
                  </p>
                </div>

        {/* Spectacular glowing sphere */}
        <div className="flex justify-center py-4">
          <div className="relative group">
            {/* Ring glow halo */}
            <div className={`ball-glow-container ${isFlashing ? 'glow-emerald animate-pulse opacity-80' : 'glow-amber opacity-60'}`} />
            
            <div className={`relative w-40 h-40 rounded-full flex items-center justify-center overflow-hidden border-[6px] border-[#2A3449] shadow-[0_20px_40px_-10px_rgba(0,0,0,0.8)] ${isFlashing ? 'ball-emerald-3d' : 'ball-gold-3d'}`}>
              {/* Glossy Reflection Overlay */}
              <div className="absolute top-[10%] left-[15%] w-[40%] h-[30%] bg-gradient-to-b from-white/20 to-transparent rounded-full blur-[5px] transform -rotate-15 pointer-events-none" />
              
                <motion.span
                  key={flashNumber}
                  initial={{ scale: 0.7, opacity: 0.5, filter: "blur(4px)" }}
                  animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
                  transition={{ type: "spring", stiffness: 450, damping: 12 }}
                  className={`text-7xl font-black font-mono tracking-tighter ${isFlashing ? 'text-slate-900' : 'text-[#2A1D08] drop-shadow-[0_1px_1px_rgba(255,255,255,0.3)]'}`}
                >
                  {flashNumber}
                </motion.span>
            </div>

            {/* Reflection base shadow */}
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-28 h-3 bg-black/40 blur-md rounded-full" />
          </div>
        </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-8 max-w-sm"
              >
                <HelpCircle className="w-12 h-12 text-blue-500/40 mx-auto mb-3" />
                <h3 className="text-white font-medium text-base mb-1">Preparar Asignación</h3>
                <p className="text-gray-400 text-xs leading-relaxed">
                  Selecciona uno de los {unassignedParticipants.length} participantes activos restantes para iniciar la ceremonia pública de asignación.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom bar Control Actions for Admin */}
        <div className="relative z-20 border-t border-white/5 pt-5">
          {!eventState.participanteActualId ? (
            /* Phase 1: Select Participant and Trigger Draw */
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
              <div className="w-full sm:w-80 bg-[#0B1528] border border-blue-500/20 rounded-xl px-3.5 py-2 flex items-center justify-between">
                <select
                  disabled={isSequentialActive}
                  value={selectedParticipantId}
                  onChange={(e) => setSelectedParticipantId(e.target.value)}
                  className="bg-[#0B1528] border-none text-xs text-white placeholder-gray-500 focus:outline-none w-full cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed font-sans"
                >
                  <option value="" className="bg-[#0B1528] text-gray-400">-- Elegir Participante Disponible --</option>
                  {unassignedParticipants.map((p) => (
                    <option key={p._id || p.id} value={p._id || p.id} className="bg-[#0B1528] text-white">
                      {p.nombre} {p.apellido} ({p.equipo || 'Sin Equipo'})
                    </option>
                  ))}
                </select>
              </div>

              <button
                disabled={!selectedParticipantId || isFlashing || isSequentialActive}
                onClick={triggerSingleRoll}
                className={`
                  w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer
                  ${selectedParticipantId && !isFlashing && !isSequentialActive
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-lg shadow-amber-500/25'
                    : 'bg-slate-900 border border-white/5 text-gray-500 cursor-not-allowed'
                  }
                `}
              >
                <Play className="w-4 h-4 fill-current text-slate-950" />
                Iniciar Asignación Aleatoria
              </button>
            </div>
          ) : (
            /* Phase 2: Drawing active. Admin controls: Confirm, Relanzar, Pause */
            <div className="flex flex-wrap gap-4 items-center justify-center">
              <button
                disabled={isFlashing}
                onClick={handleConfirm}
                className={`
                  px-6 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer
                  ${isFlashing
                    ? 'bg-slate-900 border border-white/5 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                  }
                `}
              >
                <Check className="w-4 h-4 stroke-[3]" />
                ✅ Confirmar Número
              </button>

              <button
                disabled={isFlashing}
                onClick={() => setShowRerollConfirm(true)}
                className={`
                  px-6 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 border transition-all cursor-pointer
                  ${isFlashing
                    ? 'bg-slate-900 border border-white/5 text-gray-500 cursor-not-allowed'
                    : 'bg-amber-500/10 border-amber-500/35 hover:bg-amber-500/15 text-amber-300'
                  }
                `}
              >
                <RotateCcw className="w-4 h-4" />
                🔄 Relanzar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Reroll confirmation modal */}
      {showRerollConfirm && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0B1528] border border-amber-500/30 p-6 rounded-2xl max-w-sm w-full space-y-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-amber-400 flex-shrink-0" />
              <div>
                <h4 className="text-white font-semibold text-sm">¿Desea descartar y relanzar?</h4>
                <p className="text-gray-400 text-xs leading-relaxed mt-1">
                  El número propuesto ({flashNumber}) será liberado y devuelto al conjunto. Comenzará una nueva asignación aleatoria y este número descartado nunca se repetirá en este reintento.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 text-xs font-bold">
              <button
                onClick={() => setShowRerollConfirm(false)}
                className="bg-slate-900 border border-white/10 hover:border-white/20 text-white px-3.5 py-1.5 rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleReroll}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-3.5 py-1.5 rounded-lg cursor-pointer"
              >
                Confirmar y Relanzar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0B1528] border border-rose-500/30 p-6 rounded-2xl max-w-sm w-full space-y-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-rose-400 flex-shrink-0" />
              <div>
                <h4 className="text-white font-semibold text-sm">¿Reiniciar todo el SorteoSOS?</h4>
                <p className="text-gray-400 text-xs leading-relaxed mt-1">
                  Esta acción es irreversible y requiere privilegios. Borrará absolutamente todas las asignaciones existentes en la base de datos MongoDB, liberando los 99 números y devolviendo el sorteo a su estado original listo.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 text-xs font-bold">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="bg-slate-900 border border-white/10 text-white px-3.5 py-1.5 rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  await onResetEvent();
                  setShowResetConfirm(false);
                }}
                className="bg-rose-500 hover:bg-rose-600 text-white px-3.5 py-1.5 rounded-lg cursor-pointer"
              >
                Sí, Reiniciar Todo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mode: Automated Sequential (Paso a Paso) Control Panel */}
      {unassignedParticipants.length > 0 && (
        <div className="bg-gradient-to-b from-[#0B1528] via-[#050D1D] to-[#040810] border border-amber-500/25 p-6 rounded-3xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/5 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
            {/* Left Column: Progress Info & HUD */}
            <div className="lg:col-span-7 space-y-4">
              <div className="space-y-1.5 text-center md:text-left">
                <span className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/25 text-amber-400 font-mono text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider animate-pulse">
                  {isSequentialActive ? '● Sorteo en Ejecución Paso a Paso' : 'Modo Secuencial Recomendado'}
                </span>
                <h4 className="text-white font-black text-xl flex items-center justify-center md:justify-start gap-2">
                  <Sparkles className={`w-5.5 h-5.5 text-amber-400 ${isSequentialActive ? 'animate-spin' : ''}`} />
                  Sorteo Automático 1-a-1
                </h4>
                <div className="flex gap-2 mt-2">
                  <button
                    disabled={isSequentialActive}
                    onClick={() => {
                      setDrawStrategy('sequential');
                      drawStrategyRef.current = 'sequential';
                    }}
                    className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all ${drawStrategy === 'sequential' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-gray-500 border border-white/5'}`}
                  >
                    Orden de Lista
                  </button>
                  <button
                    disabled={isSequentialActive}
                    onClick={() => {
                      setDrawStrategy('random');
                      drawStrategyRef.current = 'random';
                    }}
                    className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all ${drawStrategy === 'random' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-gray-500 border border-white/5'}`}
                  >
                    Orden Aleatorio
                  </button>
                </div>
                <p className="text-gray-400 text-xs mt-2">
                  El sistema avanzará uno a uno garantizando que <span className="text-amber-300 font-semibold">los números nunca se repitan</span>. Introducirá pausas visuales estratégicas para que puedas verificar el resultado en el panel antes de confirmarlo.
                </p>
              </div>

              {/* Live Activity Monitor HUD */}
              {(isSequentialActive || seqStep !== 'idle') && (
                <div className="bg-slate-950/80 border border-amber-500/20 rounded-2xl p-4.5 space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-white/5">
                    <div>
                      <span className="text-[10px] font-mono text-gray-500 uppercase">Sorteando Actualmente</span>
                      <p className="text-amber-400 text-sm font-black tracking-wide">
                        👤 {seqCurrentName || 'Buscando candidato...'}
                      </p>
                    </div>
                    {seqStep === 'pausing' && seqCountdown !== null && (
                      <div className="bg-amber-500/10 border border-amber-400/30 px-3 py-1.5 rounded-xl flex items-center gap-2 text-xs font-mono text-amber-400 font-extrabold animate-pulse">
                        <Clock className="w-4 h-4 text-amber-400" />
                        <span>Pausa de Control: {seqCountdown}s</span>
                      </div>
                    )}
                  </div>

                  {/* Flow Steps Progress Checklist */}
                  <div className="space-y-2.5 text-xs">
                    {[
                      { key: 'selecting', label: '1. Selección de Candidato', desc: 'Analizando y extrayendo de MongoDB el siguiente participante activo.' },
                      { key: 'rolling', label: '2. Suspenso de Ruleta', desc: 'Simulando el giro público de números aleatorios.' },
                      { key: 'celebrating', label: '3. Celebración de Asignación', desc: '¡Festejo público con confeti y fanfarria!' },
                      { key: 'pausing', label: '4. Pausa de Visualización', desc: 'Congelando la pantalla para que el administrador la examine.' },
                      { key: 'confirming', label: '5. Confirmación e Inmutabilidad', desc: 'Guardando el número de forma inalterable.' }
                    ].map((stepItem) => {
                      const isActive = seqStep === stepItem.key;
                      return (
                        <div 
                          key={stepItem.key} 
                          className={`flex items-start gap-2.5 p-2 rounded-xl transition-all ${
                            isActive 
                              ? 'bg-amber-500/10 border border-amber-500/20 translate-x-1.5' 
                              : 'opacity-50'
                          }`}
                        >
                          <div className={`w-2 h-2 rounded-full mt-1.5 ${
                            isActive ? 'bg-amber-400 animate-ping' : 'bg-gray-600'
                          }`} />
                          <div>
                            <p className={`font-bold ${isActive ? 'text-amber-400' : 'text-gray-300'}`}>
                              {stepItem.label}
                            </p>
                            {isActive && (
                              <p className="text-gray-400 text-[11px] mt-0.5 leading-relaxed">
                                {stepItem.key === 'pausing' && seqCountdown !== null
                                  ? `Guardado automático en ${seqCountdown} segundos. Puedes pausar para detener el reloj.`
                                  : stepItem.desc}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Progress metrics and bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-mono text-gray-400">
                  <span>Progreso de Asignación Global:</span>
                  <span className="text-amber-400 font-bold">
                    {participants.filter(p => p.participa && p.numeroAsignado).length} de {participants.filter(p => p.participa).length} ({Math.round((participants.filter(p => p.participa && p.numeroAsignado).length / Math.max(1, participants.filter(p => p.participa).length)) * 100)}%)
                  </span>
                </div>
                <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-white/5 p-0.5">
                  <div 
                    className="bg-gradient-to-r from-amber-400 via-[#E6C280] to-amber-500 h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(230,194,128,0.4)]"
                    style={{ width: `${(participants.filter(p => p.participa && p.numeroAsignado).length / Math.max(1, participants.filter(p => p.participa).length)) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Buttons & Cams */}
            <div className="lg:col-span-5 flex flex-col justify-center items-center lg:items-end gap-3.5 w-full">
              {isSequentialActive ? (
                <button
                  onClick={() => setSequentialActive(false)}
                  className="w-full sm:w-64 bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-xs px-6 py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-rose-500/25 cursor-pointer transition-all hover:scale-[1.02]"
                >
                  <Pause className="w-4 h-4 fill-current" />
                  Pausar Sorteo Continuo
                </button>
              ) : (
                <button
                  disabled={unassignedParticipants.length === 0}
                  onClick={() => setSequentialActive(true)}
                  className={`w-full sm:w-64 font-extrabold text-xs px-6 py-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer hover:scale-[1.02]
                    ${unassignedParticipants.length > 0
                      ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 border border-amber-300/40'
                      : 'bg-slate-900 border border-white/5 text-gray-500 cursor-not-allowed'
                    }
                  `}
                >
                  <Play className="w-4 h-4 fill-current text-slate-950" />
                  Iniciar Sorteo Continuo 1-a-1
                </button>
              )}

              {isSequentialActive ? (
                <div className="text-center lg:text-right font-mono text-[10px] text-amber-400 animate-pulse max-w-xs leading-relaxed">
                  ● El sorteo se está transmitiendo en tiempo real a la pantalla de proyección. No cierres esta pestaña.
                </div>
              ) : (
                <div className="text-center lg:text-right font-mono text-[10px] text-gray-500 max-w-xs leading-relaxed">
                  Usa este panel para automatizar completamente la asignación del 100% de los participantes con pausas configuradas.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mode: Auto Assign (Bulk Assign in <2s) Banner */}
      {unassignedParticipants.length > 0 && (
        <div className="bg-gradient-to-r from-[#0C152B] via-[#08223B] to-[#0C152B] border border-blue-500/25 p-5 rounded-2xl shadow-xl flex flex-col md:flex-row gap-5 items-center justify-between">
          <div className="space-y-1 text-center md:text-left">
            <h4 className="text-white font-medium text-sm flex items-center justify-center md:justify-start gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
              Modo Automático Rápido
            </h4>
            <p className="text-gray-400 text-xs max-w-xl">
              ¿Desea asignar de inmediato todos los participantes sin ceremonias visuales? El algoritmo distribuirá números aleatorios únicos de forma instantánea a los {unassignedParticipants.length} registrados en menos de 2 segundos, guardando todo directamente en MongoDB.
            </p>
          </div>
          <button
            onClick={onAutoAssign}
            className="w-full md:w-auto bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white font-bold text-xs px-5 py-3 rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
          >
            ASIGNAR TODOS AUTOMÁTICAMENTE
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
