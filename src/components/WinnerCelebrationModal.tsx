import React, { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Sparkles, X, Star, Award, CheckCircle, Flame, RotateCw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Participant } from '../types';
import { audio } from '../utils/audio';

interface WinnerCelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  winnerNumber: string;
  participant?: Participant | { nombre: string; apellido: string; equipo?: string; area?: string; pago?: boolean } | null;
  title?: string;
  subtitle?: string;
}

export default function WinnerCelebrationModal({
  isOpen,
  onClose,
  winnerNumber,
  participant,
  title = "¡NÚMERO GANADOR DEL SORTEO!",
  subtitle = "SorteoSOS 2026 • Chontico Noche"
}: WinnerCelebrationModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Confetti Burst Trigger
  const fireConfetti = useCallback(() => {
    // Play celebratory sound
    audio.playSuccessFanfare();

    // Multi-stage confetti burst
    const count = 200;
    const defaults = {
      origin: { y: 0.7 },
      zIndex: 10000,
    };

    function fire(particleRatio: number, opts: confetti.Options) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio)
      });
    }

    // Gold, amber, emerald, white particles
    const colors = ['#f59e0b', '#fbbf24', '#e6c280', '#10b981', '#ffffff', '#3b82f6'];

    fire(0.25, {
      spread: 26,
      startVelocity: 55,
      colors,
    });
    fire(0.2, {
      spread: 60,
      colors,
    });
    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8,
      colors,
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2,
      colors,
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 45,
      colors,
    });
  }, []);

  // Trigger celebration on modal open
  useEffect(() => {
    if (isOpen) {
      fireConfetti();
    }
  }, [isOpen, fireConfetti]);

  // Interactive Particle Canvas effect inside modal
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const parent = canvas.parentElement;
    const updateCanvasSize = () => {
      if (canvas && parent) {
        canvas.width = parent.clientWidth || window.innerWidth;
        canvas.height = parent.clientHeight || window.innerHeight;
      }
    };
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    const particles: Array<{
      x: number;
      y: number;
      radius: number;
      color: string;
      vx: number;
      vy: number;
      alpha: number;
      life: number;
      maxLife: number;
      decay: number;
      sparkle: boolean;
    }> = [];

    const colors = ['#F59E0B', '#FBBF24', '#E6C280', '#34D399', '#60A5FA', '#FFFFFF'];

    // Spawn initial particle cloud
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 2.5 + 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 1.5,
        vy: -Math.random() * 2 - 0.5,
        alpha: Math.random() * 0.8 + 0.2,
        life: 0,
        maxLife: Math.random() * 120 + 60,
        decay: Math.random() * 0.015 + 0.005,
        sparkle: Math.random() > 0.6
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Add new particles periodically
      if (particles.length < 80 && Math.random() < 0.3) {
        particles.push({
          x: Math.random() * canvas.width,
          y: canvas.height + 10,
          radius: Math.random() * 3 + 1,
          color: colors[Math.floor(Math.random() * colors.length)],
          vx: (Math.random() - 0.5) * 2,
          vy: -Math.random() * 2.5 - 1,
          alpha: 1,
          life: 0,
          maxLife: Math.random() * 100 + 50,
          decay: Math.random() * 0.015 + 0.008,
          sparkle: Math.random() > 0.5
        });
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;

        if (p.sparkle) {
          p.radius = Math.sin(Date.now() * 0.01 + i) * 1.2 + 1.8;
        }

        if (p.alpha <= 0 || p.y < -20) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        if (p.sparkle) {
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 6;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', updateCanvasSize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isOpen]);

  const formattedNum = String(winnerNumber || '00').padStart(2, '0');
  const participantName = participant
    ? `${participant.nombre} ${participant.apellido}`.trim().toUpperCase()
    : 'SIN ASIGNAR';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-2xl overflow-hidden"
          onClick={onClose}
        >
          {/* Particle Canvas Layer */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 pointer-events-none z-0"
          />

          {/* Background Radial Lights */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,0.25)_0%,rgba(16,185,129,0.1)_40%,transparent_75%)] pointer-events-none animate-pulse" />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.6, y: 50, rotateX: 25, opacity: 0 }}
            animate={{ scale: 1, y: 0, rotateX: 0, opacity: 1 }}
            exit={{ scale: 0.7, y: 30, opacity: 0 }}
            transition={{ type: "spring", damping: 18, stiffness: 120 }}
            className="relative z-10 w-full max-w-md max-h-[92vh] my-auto bg-gradient-to-b from-[#0F1B36] via-[#080E1C] to-[#04070F] border-2 border-amber-400/60 rounded-2xl sm:rounded-3xl p-4 sm:p-5 md:p-6 shadow-[0_0_60px_rgba(245,158,11,0.5)] overflow-y-auto text-center space-y-3 sm:space-y-4 scrollbar-thin scrollbar-thumb-amber-500/30"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Glossy Top Shimmer */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-300 to-transparent shadow-[0_0_15px_#f59e0b]" />
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 p-2 rounded-full bg-slate-900/80 border border-white/10 text-amber-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer shadow-lg"
              title="Cerrar"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Header Badge */}
            <div className="flex flex-col items-center justify-center space-y-1 pt-1">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-400/40 text-amber-300 text-[11px] sm:text-xs font-black uppercase tracking-widest shadow-[0_0_20px_rgba(245,158,11,0.3)]"
              >
                <Trophy className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
                <span>{title}</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              </motion.div>
              <p className="text-slate-400 text-[11px] font-mono">{subtitle}</p>
            </div>

            {/* Main 3D Winning Number Ball */}
            <div className="relative py-1 flex justify-center items-center">
              {/* Outer Pulsing Glowing Rings */}
              <div className="absolute w-32 h-32 sm:w-36 sm:h-36 rounded-full bg-gradient-to-r from-amber-500/30 to-emerald-500/30 blur-2xl animate-ping opacity-60" />
              <div className="absolute w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-amber-400/20 blur-xl animate-pulse" />

              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 150, damping: 15 }}
                className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-yellow-300 via-amber-400 to-amber-600 border-3 border-yellow-100 flex items-center justify-center shadow-[0_0_50px_rgba(251,191,36,0.9)] group"
              >
                {/* Glossy Reflection */}
                <div className="absolute top-[8%] left-[15%] w-[40%] h-[30%] rounded-full bg-gradient-to-b from-white/70 to-transparent blur-[2px] transform -rotate-12 pointer-events-none" />

                {/* Sparkling star overlay */}
                <Sparkles className="absolute top-2 right-2 w-4 h-4 text-white/80 animate-spin" />

                {/* Big Display Number */}
                <span className="relative z-10 font-black text-4xl sm:text-5xl text-slate-950 tracking-tighter drop-shadow-[0_2px_4px_rgba(255,255,255,0.6)] select-none">
                  {formattedNum}
                </span>
              </motion.div>
            </div>

            {/* Winner Details Card */}
            <div className="bg-slate-900/90 border border-amber-500/30 rounded-xl sm:rounded-2xl p-3.5 sm:p-4 text-center space-y-2 shadow-inner">
              <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest block">
                PARTICIPANTE GANADOR DE LA BOLETA #{formattedNum}
              </span>

              <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight leading-tight drop-shadow-md">
                {participantName}
              </h3>

              <div className="flex flex-wrap items-center justify-center gap-1.5 pt-0.5">
                {participant?.equipo && (
                  <span className="px-2.5 py-0.5 bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[11px] font-extrabold uppercase rounded-lg">
                    {participant.equipo}
                  </span>
                )}
                {participant?.area && (
                  <span className="px-2.5 py-0.5 bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[11px] font-extrabold uppercase rounded-lg">
                    {participant.area}
                  </span>
                )}
                {participant?.pago !== undefined && (
                  <span className={`px-2.5 py-0.5 border text-[11px] font-extrabold uppercase rounded-lg ${participant.pago ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-rose-500/20 border-rose-500/40 text-rose-300'}`}>
                    {participant.pago ? 'Pago Confirmado ✓' : 'Pago Pendiente ⏳'}
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
              <button
                onClick={fireConfetti}
                className="w-full sm:flex-1 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black py-2.5 sm:py-3 px-3 rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:scale-105 transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs uppercase tracking-wider"
              >
                <Flame className="w-4 h-4 text-slate-950 animate-pulse" />
                <span>Explosión Festiva 🎆</span>
              </button>

              <button
                onClick={onClose}
                className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2.5 sm:py-3 px-5 rounded-xl border border-white/10 transition-all cursor-pointer text-xs uppercase"
              >
                Cerrar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
