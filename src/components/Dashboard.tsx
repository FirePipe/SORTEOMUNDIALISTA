import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Participant, EventState, AppConfig, AuditLog } from '../types';
import { audio } from '../utils/audio';
import BoardSection from './BoardSection';
import TableSection from './TableSection';
import EventSection from './EventSection';
import PublicSection from './PublicSection';
import AuditSection from './AuditSection';
import AdminLogin from './AdminLogin';
import socketIOClient from 'socket.io-client';
import { useTheme } from '../context/ThemeContext';
import confetti from 'canvas-confetti';
import { 
  Trophy, Users, Calendar, HelpCircle, LayoutDashboard, 
  TableProperties, Disc, LogOut, ShieldCheck, Play, Eye, Terminal, Lock,
  Tv, Sparkles, Cpu, Layers, ChevronLeft, ChevronRight, Sun, Moon, Home, Settings2, Wrench, Clock, Info, Save, Loader2
} from 'lucide-react';

function DashboardSkeleton() {
  return (
    <div className="w-full space-y-8 animate-pulse py-4">
      {/* Skeleton Top Prize Banner */}
      <div className="relative overflow-hidden bg-white/60 dark:bg-[#070D19]/60 border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="lg:w-1/3 w-full aspect-video bg-slate-200 dark:bg-slate-800/80 rounded-xl" />
          <div className="lg:w-2/3 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="w-28 h-4 bg-amber-500/30 rounded-md" />
              <div className="w-64 h-8 bg-slate-200 dark:bg-slate-800 rounded-md" />
              <div className="w-40 h-4 bg-slate-200 dark:bg-slate-800 rounded-md" />
            </div>
            <div className="grid grid-cols-2 gap-3 bg-slate-100 dark:bg-slate-900/50 p-4 rounded-xl">
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded" />
            </div>
            <div className="flex gap-3">
              <div className="h-10 flex-1 bg-amber-500/20 rounded-xl" />
              <div className="h-10 flex-1 bg-amber-500/20 rounded-xl" />
            </div>
          </div>
        </div>
      </div>

      {/* Skeleton Board Cards Grid */}
      <div className="bg-white/60 dark:bg-[#070D19]/60 border border-slate-200 dark:border-white/10 rounded-3xl p-8 space-y-6">
        <div className="flex justify-between items-center">
          <div className="w-48 h-6 bg-slate-200 dark:bg-slate-800 rounded-md" />
          <div className="w-32 h-6 bg-slate-200 dark:bg-slate-800 rounded-md" />
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-10 gap-3">
          {Array.from({ length: 30 }).map((_, i) => (
            <div key={i} className="w-full aspect-square rounded-full bg-slate-200 dark:bg-slate-800/80 border border-slate-300 dark:border-white/5" />
          ))}
        </div>
      </div>

      {/* Loading Footer Indicator */}
      <div className="flex items-center justify-center gap-3 py-6 text-amber-500 font-mono text-xs font-bold uppercase tracking-widest">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>Sincronizando Base de Datos SorteoSOS...</span>
      </div>
    </div>
  );
}

const triggerCelebration = () => {
  const duration = 4 * 1000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 3000 };

  const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

  const interval: any = setInterval(function() {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 40 * (timeLeft / duration);
    confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
    confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
  }, 250);
};

const CAROUSEL_IMAGES = [
  "https://lh3.googleusercontent.com/d/17FN25LvBbd26TWiEgm10KpwZts_5XcIM",
  "https://lh3.googleusercontent.com/d/14gCeM1fbNPOEx6yCp6bkvQbz6m7mwmEH",
  "https://lh3.googleusercontent.com/d/17zV9YtgRx7srEOtoAi2duUQp8tpeeysu",
  "https://lh3.googleusercontent.com/d/1eGSGGEgnqNxPJKId6vlFrQUeJOivA0bz",
  "https://lh3.googleusercontent.com/d/1FxBTA_hbKJewghLIyeLe2_LvwHxZVUND",
  "https://lh3.googleusercontent.com/d/1rNt_IOT2X2DeFLhgJytgjP8n5v0GhZlE",
  "https://lh3.googleusercontent.com/d/1oF1tSq7XNg96RJQrkywZlMZrXsjxxNc2",
  "https://lh3.googleusercontent.com/d/1jv-WU8JY9Gu2RaLAqyDjFVPEIMNBO4bR",
  "https://lh3.googleusercontent.com/d/1sDBhDnGqW3kp6t3P_bBzdMQWzf8sQm-y",
  "https://lh3.googleusercontent.com/d/1pGSgCJVDp1y85_hU9kZqkPrRyt59ViGH"
];

export default function Dashboard() {
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'inicio' | 'tablero' | 'participantes' | 'evento' | 'publico' | 'logs' | 'ajustes'>('inicio');
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Raffle Config Local State (to avoid immediate server sync)
  const [localRaffleConfig, setLocalRaffleConfig] = useState<{
    rangoMin: number;
    rangoMax: number;
    habilitar00: boolean;
    habilitarBalonOro: boolean;
    numeroGanador?: string | null;
  }>({
    rangoMin: 1,
    rangoMax: 99,
    habilitar00: true,
    habilitarBalonOro: false,
    numeroGanador: null
  });
  const [configStatus, setConfigStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });

  // App States
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [eventState, setEventState] = useState<EventState>({
    estado: 'LISTO',
    participanteActualId: null,
    numeroPropuesto: null,
    numerosDisponibles: ['00', ...Array.from({ length: 99 }, (_, i) => String(i + 1).padStart(2, '0'))],
    numerosAsignados: [],
    descartadosEnEsteIntento: []
  });
  const [appConfig, setAppConfig] = useState<AppConfig>({
    soundEnabled: true,
    tempoFlashing: 60,
    tiempoAnimacion: 6000,
    nombreEvento: 'Sorteo Oficial de Números SorteoSOS'
  });
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isDbLocal, setIsDbLocal] = useState(true);
  const [dbStatus, setDbStatus] = useState<{ connected: boolean; mode: string; uri: string; error: string | null }>({
    connected: false,
    mode: 'Cargando...',
    uri: '',
    error: null
  });

  // Carousel Image index
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Connection State for adaptive fallback polling
  const [socketConnected, setSocketConnected] = useState(false);

  const [showCountdown, setShowCountdown] = useState<number | null>(null);

  // Auth States
  const [token, setToken] = useState<string | null>(localStorage.getItem('admin_token'));
  const [adminUser, setAdminUser] = useState<string | null>(localStorage.getItem('admin_username'));

  // Ref buffer to hold updates and apply them smoothly every 2 seconds
  const pendingUpdatesRef = useRef<{
    participants?: Participant[];
    eventState?: EventState;
    logs?: AuditLog[];
    appConfig?: AppConfig;
    dbStatus?: any;
  }>({});

  // Helper to immediately flush buffered state updates for interactive actions
  const flushPendingUpdatesNow = useCallback(() => {
    const pending = pendingUpdatesRef.current;
    if (!pending) return;

    if (pending.participants !== undefined) {
      const list = pending.participants;
      setParticipants(prev => JSON.stringify(prev) === JSON.stringify(list) ? prev : list);
      delete pending.participants;
    }
    if (pending.eventState !== undefined) {
      const st = pending.eventState;
      setEventState(prev => JSON.stringify(prev) === JSON.stringify(st) ? prev : st);
      delete pending.eventState;
    }
    if (pending.logs !== undefined) {
      const l = pending.logs;
      setLogs(prev => JSON.stringify(prev) === JSON.stringify(l) ? prev : l);
      delete pending.logs;
    }
    if (pending.appConfig !== undefined) {
      const cfg = pending.appConfig;
      setAppConfig(prev => JSON.stringify(prev) === JSON.stringify(cfg) ? prev : cfg);
      delete pending.appConfig;
    }
    if (pending.dbStatus !== undefined) {
      const db = pending.dbStatus;
      setDbStatus(prev => {
        if (JSON.stringify(prev) === JSON.stringify(db)) return prev;
        setIsDbLocal(!db.connected);
        return db;
      });
      delete pending.dbStatus;
    }
  }, []);

  // 2-second buffer timer interval to queue updates without flickering UI
  useEffect(() => {
    const timer = setInterval(() => {
      flushPendingUpdatesNow();
    }, 2000);

    return () => clearInterval(timer);
  }, [flushPendingUpdatesNow]);

  // Memoized API fetch handlers with cancellation support & optional immediate flag
  const fetchDbStatus = useCallback(async (immediate = false, signal?: AbortSignal) => {
    try {
      const res = await fetch('/api/db/status', { signal });
      if (res.ok) {
        const data = await res.json();
        if (immediate) {
          setDbStatus(prev => JSON.stringify(prev) === JSON.stringify(data) ? prev : data);
          setIsDbLocal(!data.connected);
        } else {
          pendingUpdatesRef.current.dbStatus = data;
        }
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') console.error('Error fetching db status:', e);
    }
  }, []);

  const fetchParticipants = useCallback(async (immediate = false, signal?: AbortSignal) => {
    try {
      const res = await fetch('/api/participants', { signal });
      if (res.ok) {
        const data = await res.json();
        if (immediate) {
          setParticipants(prev => JSON.stringify(prev) === JSON.stringify(data) ? prev : data);
        } else {
          pendingUpdatesRef.current.participants = data;
        }
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') console.error('Error fetching participants:', e);
    }
  }, []);

  const fetchLogs = useCallback(async (immediate = false, signal?: AbortSignal) => {
    try {
      const res = await fetch('/api/logs', { signal });
      if (res.ok) {
        const data = await res.json();
        if (immediate) {
          setLogs(prev => JSON.stringify(prev) === JSON.stringify(data) ? prev : data);
        } else {
          pendingUpdatesRef.current.logs = data;
        }
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') console.error('Error fetching audit logs:', e);
    }
  }, []);

  const fetchConfig = useCallback(async (immediate = false, signal?: AbortSignal) => {
    try {
      const res = await fetch('/api/config', { signal });
      if (res.ok) {
        const data = await res.json();
        if (immediate) {
          setAppConfig(prev => JSON.stringify(prev) === JSON.stringify(data) ? prev : data);
        } else {
          pendingUpdatesRef.current.appConfig = data;
        }
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') console.error('Error fetching config:', e);
    }
  }, []);

  const fetchEventState = useCallback(async (immediate = false, signal?: AbortSignal) => {
    try {
      const res = await fetch('/api/event/state', { signal });
      if (res.ok) {
        const data = await res.json();
        if (immediate) {
          setEventState(prev => JSON.stringify(prev) === JSON.stringify(data) ? prev : data);
        } else {
          pendingUpdatesRef.current.eventState = data;
        }
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') console.error('Error fetching event state:', e);
    }
  }, []);

  // Socket Connection for Real-Time Sync
  useEffect(() => {
    let isMounted = true;
    const socket = socketIOClient(window.location.origin);

    socket.on('connect', () => {
      if (isMounted) setSocketConnected(true);
    });

    socket.on('disconnect', () => {
      if (isMounted) setSocketConnected(false);
    });

    socket.emit('get:state');

    socket.on('state:changed', (data: { state: EventState; config: AppConfig; participantsCount: number }) => {
      if (!isMounted) return;
      pendingUpdatesRef.current.eventState = data.state;
      pendingUpdatesRef.current.appConfig = data.config;
      fetchParticipants(false);
      fetchLogs(false);
      fetchDbStatus(false);
    });

    socket.on('participants:changed', (updatedList: Participant[]) => {
      if (!isMounted) return;
      pendingUpdatesRef.current.participants = updatedList;
    });

    socket.on('event:confirmed', () => {
      if (!isMounted) return;
      fetchParticipants(true);
      fetchLogs(true);
      fetchDbStatus(true);
      if (appConfig.soundEnabled) audio.playSuccess();
      triggerCelebration();
    });

    socket.on('event:auto-assigned-complete', () => {
      if (!isMounted) return;
      fetchParticipants(true);
      fetchLogs(true);
      fetchDbStatus(true);
      if (appConfig.soundEnabled) audio.playSuccess();
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      triggerCelebration();
    });

    socket.on('event:reset-complete', () => {
      if (!isMounted) return;
      fetchParticipants(true);
      fetchLogs(true);
      fetchDbStatus(true);
    });

    socket.on('event:show-countdown', (data: { countdown: number }) => {
      if (!isMounted) return;
      setShowCountdown(data.countdown);
      if (data.countdown > 0 && appConfig.soundEnabled) {
        audio.playTick(100 + data.countdown * 50);
      }
      if (data.countdown === 0) {
        setTimeout(() => {
          if (isMounted) setShowCountdown(null);
        }, 2000);
      }
    });

    return () => {
      isMounted = false;
      socket.disconnect();
    };
  }, [fetchParticipants, fetchLogs, fetchDbStatus, appConfig.soundEnabled]);

  // Sync initial setup with loading skeleton and cleanup
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const loadInitialData = async () => {
      setIsInitialLoading(true);
      await Promise.allSettled([
        fetchParticipants(true, controller.signal),
        fetchLogs(true, controller.signal),
        fetchConfig(true, controller.signal),
        fetchEventState(true, controller.signal),
        fetchDbStatus(true, controller.signal)
      ]);
      if (isMounted) {
        setIsInitialLoading(false);
      }
    };

    loadInitialData();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [token, fetchParticipants, fetchLogs, fetchConfig, fetchEventState, fetchDbStatus]);

  // Automatic periodic polling with AbortController and cleanup (Vercel Compatibility Fallback)
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();
    const pollInterval = 2000;
    let pollCount = 0;

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && isMounted) {
        fetchEventState(false, controller.signal);
        fetchParticipants(false, controller.signal);
        
        pollCount++;
        if (pollCount % 5 === 0) {
          fetchLogs(false, controller.signal);
          fetchDbStatus(false, controller.signal);
        }
      }
    }, pollInterval);

    return () => {
      isMounted = false;
      controller.abort();
      clearInterval(interval);
    };
  }, [fetchEventState, fetchParticipants, fetchLogs, fetchDbStatus]);

  // Automatic rotation of the QLED screen slideshow every 4.5 seconds
  useEffect(() => {
    const slideInterval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % CAROUSEL_IMAGES.length);
    }, 4500);

    return () => clearInterval(slideInterval);
  }, []);

  // Auth helper
  const handleLogin = async (username: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('admin_token', data.token);
        localStorage.setItem('admin_username', data.username);
        setToken(data.token);
        setAdminUser(data.username);
        return true;
      }
      return false;
    } catch (e) {
      console.error('Login error:', e);
      return false;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_username');
    setToken(null);
    setAdminUser(null);
    setActiveTab('inicio');
  };

  // Participants APIs
  const handleAddParticipant = async (p: Omit<Participant, '_id' | 'id'>) => {
    try {
      const res = await fetch('/api/participants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(p)
      });
      if (res.ok) {
        fetchParticipants(true);
      }
    } catch (e) {
      console.error('Error adding participant:', e);
    }
  };

  const handleEditParticipant = async (id: string, p: Partial<Participant>) => {
    try {
      const res = await fetch(`/api/participants/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(p)
      });
      if (res.ok) {
        fetchParticipants(true);
      }
    } catch (e) {
      console.error('Error editing participant:', e);
    }
  };

  const handleDeleteParticipant = async (id: string) => {
    try {
      const res = await fetch(`/api/participants/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchParticipants(true);
      }
    } catch (e) {
      console.error('Error deleting participant:', e);
    }
  };

  const handleImportExcel = async (fileBase64: string) => {
    const res = await fetch('/api/participants/import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ fileBase64 })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Fallo al importar participantes.');
    }
    fetchParticipants(true);
  };

  // Drawing APIs
  const handleRollNumber = async (participantId: string): Promise<{ chosenNumber: string; sequence: string[] }> => {
    const res = await fetch('/api/event/roll', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ participanteId: participantId })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to roll');
    }
    const data = await res.json();
    if (data.state) {
      setEventState(data.state);
    }
    return data;
  };

  const handleRerollNumber = async () => {
    if (appConfig.soundEnabled) audio.playWhoosh();
    const res = await fetch('/api/event/reroll', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!res.ok) throw new Error('Reroll failed');
    const data = await res.json();
    if (data.state) {
      setEventState(data.state);
    }
    return data;
  };

  const handleConfirmNumber = async () => {
    if (appConfig.soundEnabled) audio.playConfirm();
    const res = await fetch('/api/event/confirm', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!res.ok) throw new Error('Confirm failed');
    const data = await res.json();
    if (data.state) {
      setEventState(data.state);
    }
    fetchParticipants(true);
    return data;
  };

  useEffect(() => {
    if (eventState.config) {
      setLocalRaffleConfig(prev => {
        if (prev.rangoMin !== eventState.config!.rangoMin || 
            prev.rangoMax !== eventState.config!.rangoMax ||
            prev.habilitar00 !== eventState.config!.habilitar00 ||
            prev.habilitarBalonOro !== eventState.config!.habilitarBalonOro ||
            prev.numeroGanador !== eventState.config!.numeroGanador) {
          return {
            rangoMin: eventState.config!.rangoMin,
            rangoMax: eventState.config!.rangoMax,
            habilitar00: eventState.config!.habilitar00,
            habilitarBalonOro: !!eventState.config!.habilitarBalonOro,
            numeroGanador: eventState.config!.numeroGanador || null
          };
        }
        return prev;
      });
    }
  }, [eventState.config?.rangoMin, eventState.config?.rangoMax, eventState.config?.habilitar00, eventState.config?.habilitarBalonOro, eventState.config?.numeroGanador]);

  const handleUpdateRaffleConfig = async () => {
    // Validation
    const poolSize = (localRaffleConfig.rangoMax - localRaffleConfig.rangoMin + 1) + (localRaffleConfig.habilitar00 ? 1 : 0);
    
    if (poolSize < participants.length) {
      setConfigStatus({ 
        type: 'error', 
        message: `El rango (${poolSize} números) no puede ser inferior al total de participantes registrados (${participants.length}).` 
      });
      return;
    }

    try {
      const res = await fetch('/api/event/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(localRaffleConfig)
      });
      if (res.ok) {
        setConfigStatus({ type: 'success', message: 'Configuración guardada correctamente.' });
        fetchEventState(true);
        setTimeout(() => setConfigStatus({ type: null, message: '' }), 3000);
      }
    } catch (e) {
      console.error('Error updating raffle config:', e);
      setConfigStatus({ type: 'error', message: 'Error al conectar con el servidor.' });
    }
  };

  const handleAutoAssign = async (withShow: boolean = false) => {
    const res = await fetch('/api/event/auto-assign', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ withShow })
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || 'Auto assignment failed');
    } else {
      const data = await res.json();
      if (data.state) {
        setEventState(data.state);
      }
      fetchParticipants(true);
    }
  };

  const handleResetEvent = async () => {
    const res = await fetch('/api/event/reset', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!res.ok) throw new Error('Reset failed');
    fetchEventState(true);
    fetchParticipants(true);
  };

  const handleUpdateConfig = async (configUpdate: Partial<AppConfig>) => {
    const res = await fetch('/api/config', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(configUpdate)
    });
    if (res.ok) {
      const data = await res.json();
      setAppConfig(data);
    }
  };

  const handleUpdateEventStatus = async (status: "LISTO" | "EJECUTANDO" | "PAUSADO" | "FINALIZADO") => {
    const res = await fetch('/api/event/status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ estado: status })
    });
    if (res.ok) {
      fetchEventState(true);
    }
  };

  const handleClearLogs = async () => {
    const res = await fetch('/api/logs/clear', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (res.ok) {
      fetchLogs(true);
    }
  };

  // Derived metrics wrapped in useMemo for optimal rendering performance
  const totalCount = useMemo(() => participants.length, [participants]);
  const assignedCount = useMemo(() => participants.filter(p => !!p.numeroAsignado).length, [participants]);
  const pendingCount = useMemo(() => participants.filter(p => p.participa && !p.numeroAsignado).length, [participants]);
  const availableNumbersCount = useMemo(() => {
    const min = localRaffleConfig?.rangoMin ?? 1;
    const max = localRaffleConfig?.rangoMax ?? 99;
    const has00 = localRaffleConfig?.habilitar00 ?? true;
    const poolSize = (max - min + 1) + (has00 ? 1 : 0);
    return poolSize - assignedCount;
  }, [localRaffleConfig, assignedCount]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#060B15] text-slate-800 dark:text-white selection:bg-amber-400 selection:text-slate-950 font-sans antialiased transition-colors duration-300">
      {/* Outer subtle cosmic sky background elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Main Header */}
      <header className="border-b border-slate-200 dark:border-white/5 bg-white/75 dark:bg-[#070D19]/65 backdrop-blur-md sticky top-0 z-40 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-600 via-[#E6C280] to-amber-600 p-0.5 flex items-center justify-center shadow-lg shadow-blue-500/10">
              <div className="h-full w-full bg-white dark:bg-[#070D19] rounded-full flex items-center justify-center transition-colors duration-300">
                <Trophy className="w-5 h-5 text-amber-400" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight uppercase bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-slate-700 to-amber-600 dark:from-white dark:via-blue-100 dark:to-[#E6C280]">
                SorteoSOS • Asignación de Números
              </h1>
              <p className="text-[10px] text-gray-500 font-mono">FISHER-YATES UNIQUE DISTRIBUTION • AUDITED SECURITY</p>
            </div>
          </div>

          {/* Nav Menu Tabs */}
          <nav className="flex items-center gap-1 bg-slate-100 dark:bg-[#0B1528] p-1 border border-slate-200 dark:border-blue-500/10 rounded-xl max-w-full transition-colors duration-300">
            <button
              onClick={() => setActiveTab('inicio')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center cursor-pointer transition-all ${activeTab === 'inicio' ? 'bg-[#E6C280] text-slate-950 shadow-md font-bold px-3.5' : 'text-slate-500 hover:text-slate-800 dark:text-gray-400 dark:hover:text-white'}`}
              title="Inicio"
            >
              <Home className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActiveTab('tablero')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all ${activeTab === 'tablero' ? 'bg-[#E6C280] text-slate-950 shadow-md font-bold px-3' : 'text-slate-500 hover:text-slate-800 dark:text-gray-400 dark:hover:text-white'}`}
            >
              <Disc className="w-3.5 h-3.5" />
              <span>Tablero</span>
            </button>
            {token && (
              <button
                onClick={() => setActiveTab('participantes')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all ${activeTab === 'participantes' ? 'bg-[#E6C280] text-slate-950 shadow-md font-bold px-3' : 'text-slate-500 hover:text-slate-800 dark:text-gray-400 dark:hover:text-white'}`}
              >
                <TableProperties className="w-3.5 h-3.5" />
                <span>Lista</span>
              </button>
            )}
            {token && (
              <button
                onClick={() => setActiveTab('evento')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all ${activeTab === 'evento' ? 'bg-[#E6C280] text-slate-950 shadow-md font-bold px-3' : 'text-slate-500 hover:text-slate-800 dark:text-gray-400 dark:hover:text-white'}`}
              >
                <Play className="w-3.5 h-3.5 text-current" />
                <span>Sorteo</span>
              </button>
            )}
            <button
              onClick={() => setActiveTab('publico')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all ${activeTab === 'publico' ? 'bg-[#E6C280] text-slate-950 shadow-md font-bold px-3' : 'text-slate-500 hover:text-slate-800 dark:text-gray-400 dark:hover:text-white'}`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Sorteo</span>
            </button>
            {token && (
              <button
                onClick={() => setActiveTab('ajustes')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all ${activeTab === 'ajustes' ? 'bg-[#E6C280] text-slate-950 shadow-md font-bold px-3' : 'text-slate-500 hover:text-slate-800 dark:text-gray-400 dark:hover:text-white'}`}
                title="Ajustes de Sorteo"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Ajustes</span>
              </button>
            )}
            {token && (
              <button
                onClick={() => setActiveTab('logs')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all ${activeTab === 'logs' ? 'bg-[#E6C280] text-slate-950 shadow-md font-bold px-3' : 'text-slate-500 hover:text-slate-800 dark:text-gray-400 dark:hover:text-white'}`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Auditoría</span>
              </button>
            )}
          </nav>

          {/* Theme Toggle & Admin Auth Pill */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-amber-400 transition-all cursor-pointer shadow-sm"
              title={theme === 'dark' ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {token ? (
              <div className="flex items-center gap-2 bg-[#1C160B] border border-[#E6C280]/20 pl-3 pr-2 py-1 rounded-xl shadow-md text-xs">
                <span className="text-[#E6C280] font-bold">Admin: {adminUser}</span>
                <button
                  onClick={handleLogout}
                  className="p-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg cursor-pointer transition-colors"
                  title="Cerrar sesión"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setActiveTab('evento')}
                className="bg-blue-500/10 hover:bg-blue-500/15 border border-blue-500/30 hover:border-blue-500/50 text-blue-600 dark:text-blue-300 font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Lock className="w-3.5 h-3.5" />
                Ingresar Admin
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Stage */}
      <main className="max-w-7xl mx-auto px-6 py-8 relative z-20">
        {isInitialLoading ? (
          <DashboardSkeleton />
        ) : (
          <AnimatePresence mode="wait">
            {activeTab === 'inicio' && (
              <motion.div
                key="inicio"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="space-y-10"
              >
                {/* Main Prize Feature Panel - Compacted */}
                <div className="relative overflow-hidden bg-white dark:bg-gradient-to-b dark:from-[#0C152B] dark:via-[#050D1C] dark:to-[#040810] border border-slate-200 dark:border-amber-500/20 rounded-3xl p-4 md:p-6 shadow-xl dark:shadow-2xl">
                  <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
                  
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Left Column: TV Image */}
                    <div className="lg:w-1/3 flex flex-col items-center">
                      <div className="w-full aspect-video bg-slate-950 border-4 border-slate-850 rounded-xl p-1 shadow-[0_25px_60px_rgba(0,0,0,0.85)] relative group overflow-hidden">
                        <img 
                          src={CAROUSEL_IMAGES[currentImageIndex]} 
                          alt="Premio"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover object-center"
                        />
                      </div>
                    </div>

                    {/* Right Column: Compacted Specs & Buttons */}
                    <div className="lg:w-2/3 flex flex-col gap-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1 mb-2">
                          <motion.h2
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-amber-500 font-black text-xs tracking-[0.2em] uppercase"
                          >
                            GRAN PREMIO
                          </motion.h2>
                          <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase">Televisor HISENSE 50" QLED</h2>
                          <p className="text-amber-600 dark:text-amber-400 text-xs font-extrabold uppercase">50Q4SV • QLED UHD</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px] bg-slate-100 dark:bg-slate-900/50 p-4 rounded-xl">
                        <div><span className="text-gray-500">Resolución:</span> <span className="font-bold text-slate-800 dark:text-slate-200">FHD</span></div>
                        <div><span className="text-gray-500">Sistema:</span> <span className="font-bold text-slate-800 dark:text-slate-200">Vidaa</span></div>
                        <div><span className="text-gray-500">Tamaño:</span> <span className="font-bold text-slate-800 dark:text-slate-200">50"</span></div>
                        <div><span className="text-gray-500">Puertos:</span> <span className="font-bold text-slate-800 dark:text-slate-200">2 HDMI</span></div>
                        <div><span className="text-gray-500">TDT:</span> <span className="font-bold text-slate-800 dark:text-slate-200">Sí</span></div>
                        <div><span className="text-gray-500">Audio:</span> <span className="font-bold text-slate-800 dark:text-slate-200">12W</span></div>
                        <div><span className="text-gray-500">Peso:</span> <span className="font-bold text-slate-800 dark:text-slate-200">7.4 kg</span></div>
                        <div><span className="text-gray-500">Referencia:</span> <span className="font-bold text-slate-800 dark:text-slate-200">50Q4SV</span></div>
                      </div>

                      <div className="flex gap-3 mt-2">
                        <button onClick={() => { audio.playSoftClick(); setTimeout(() => setActiveTab('tablero'), 150); }} className="flex-1 bg-[#E6C280] text-slate-950 font-black text-sm px-5 py-3 rounded-xl shadow uppercase hover:scale-105 transition-transform">Ver Tablero</button>
                        <button onClick={() => { audio.playSoftClick(); setTimeout(() => setActiveTab('publico'), 150); }} className="flex-1 bg-[#E6C280] text-slate-950 font-black text-sm px-5 py-3 rounded-xl shadow uppercase hover:scale-105 transition-transform">Ver Sorteo</button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Left Dynamic Card: Sorteo Oficial */}
                  <motion.div 
                    whileHover={{ y: -5 }}
                    className="lg:col-span-7 bg-white dark:bg-gradient-to-br dark:from-[#0C152B] dark:to-[#040810] border border-slate-200 dark:border-blue-500/30 rounded-3xl p-8 shadow-xl dark:shadow-2xl relative overflow-hidden group"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-blue-500/20 transition-all" />
                    
                    <div className="relative z-10 space-y-5">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                          <Cpu className="w-6 h-6 text-blue-500 dark:text-blue-400" />
                        </div>
                        <span className="bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-300 font-mono text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest">
                          ESTÁNDAR GLOBAL
                        </span>
                      </div>

                      <h4 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
                        🎰 SISTEMA DE JUEGO OFICIAL
                      </h4>
                      
                      <p className="text-slate-600 dark:text-gray-300 text-sm md:text-base leading-relaxed font-medium">
                        Participas de forma automática por la compra de tu boleto registrado en nuestra base de datos. La rifa juega con las cifras finales del sorteo oficial del <span className="text-amber-600 dark:text-amber-400 font-bold underline decoration-amber-400/30 underline-offset-4">Chontico Noche</span> todas las noches, garantizando absoluta transparencia e imparcialidad pública.
                      </p>

                      {/* Statistics Cards mini-row */}
                      <div className="grid grid-cols-2 gap-5 pt-4">
                        <div className="bg-slate-50 dark:bg-[#0B1528]/80 backdrop-blur-sm border border-slate-200 dark:border-blue-500/20 p-5 rounded-2xl shadow-inner">
                          <span className="text-slate-500 dark:text-gray-400 text-[10px] font-mono uppercase font-bold tracking-wider">Participantes Activos</span>
                          <p className="text-3xl font-black text-slate-900 dark:text-white mt-1.5 flex items-baseline gap-1">
                            {totalCount}
                            <span className="text-xs text-blue-500 dark:text-blue-400/60 font-mono">USUARIOS</span>
                          </p>
                          <div className="flex items-center gap-1.5 mt-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-bold">SINCRO TOTAL</span>
                          </div>
                        </div>
                        <div className="bg-amber-500/5 dark:bg-[#1C160B]/80 backdrop-blur-sm border border-amber-500/10 dark:border-[#E6C280]/20 p-5 rounded-2xl shadow-inner">
                          <span className="text-amber-700 dark:text-[#E6C280]/70 text-[10px] font-mono uppercase font-bold tracking-wider">Fecha de Juego</span>
                          <p className="text-lg font-black text-amber-600 dark:text-[#E6C280] mt-1.5 leading-tight">Martes 21 de Julio</p>
                          <div className="flex items-center gap-1.5 mt-2">
                            <Calendar className="w-3 h-3 text-slate-400 dark:text-gray-500" />
                            <span className="text-[10px] text-slate-500 dark:text-gray-400 font-mono">Inicia 8:00 PM</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  {/* Right Dynamic Card: Dinámica del Sorteo */}
                  <motion.div 
                    whileHover={{ y: -5 }}
                    className="lg:col-span-5 bg-white dark:bg-gradient-to-br dark:from-[#1C160B] dark:to-[#040810] border border-slate-200 dark:border-amber-500/30 rounded-3xl p-8 shadow-xl dark:shadow-2xl relative overflow-hidden group"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-amber-500/20 transition-all" />

                    <div className="relative z-10 space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                          <Layers className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                        </div>
                        <span className="bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-300 font-mono text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest">
                          GUÍA TÉCNICA
                        </span>
                      </div>

                      <h4 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
                        ℹ️ REGLAMENTO Y CONDICIONES
                      </h4>
                      
                      <div className="space-y-5 pt-2">
                        <div className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-black/40 rounded-2xl border border-slate-100 dark:border-white/5">
                          <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center font-mono text-sm text-blue-500 dark:text-blue-400 font-black shadow-lg">1</div>
                          <div className="space-y-1">
                            <p className="text-slate-900 dark:text-white text-sm font-black uppercase tracking-wide">Sorteo Principal</p>
                            <p className="text-slate-500 dark:text-gray-400 text-xs leading-relaxed">Martes 21 de julio, 7:00 pm (Chontico noche)</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-black/40 rounded-2xl border border-slate-100 dark:border-white/5">
                          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center font-mono text-sm text-amber-600 dark:text-amber-400 font-black shadow-lg">2</div>
                          <div className="space-y-1">
                            <p className="text-slate-900 dark:text-white text-sm font-black uppercase tracking-wide">Sorteo 2</p>
                            <p className="text-slate-500 dark:text-gray-400 text-xs leading-relaxed">Miércoles 22 de julio, 1:00 pm (Chontico día). (posibilidad si no cae en el principal)</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-black/40 rounded-2xl border border-slate-100 dark:border-white/5">
                          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center font-mono text-sm text-emerald-600 dark:text-emerald-400 font-black shadow-lg">3</div>
                          <div className="space-y-1">
                            <p className="text-slate-900 dark:text-white text-sm font-black uppercase tracking-wide">Sorteo 3</p>
                            <p className="text-slate-500 dark:text-gray-400 text-xs leading-relaxed">Miércoles 22 de Julio, 7:00 pm (Chontico noche). (posibilidad si no cae en el segundo intento)</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* Live Progress Bar HUD */}
                <div className="bg-white dark:bg-[#070D19]/60 border border-slate-200 dark:border-white/5 p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl backdrop-blur-sm transition-colors">
                  <div className="space-y-2 w-full md:w-2/3">
                    <div className="flex justify-between items-center text-xs font-mono">
                      <span className="text-slate-500 dark:text-gray-400 font-bold uppercase tracking-widest">Progreso de Asignación a Participantes:</span>
                      <span className="text-amber-600 dark:text-amber-400 font-black text-sm">
                        {assignedCount} / {totalCount} ({totalCount > 0 ? Math.round((assignedCount / totalCount) * 100) : 0}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-950 h-4 rounded-full overflow-hidden border border-slate-200 dark:border-white/10 p-1">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${totalCount > 0 ? (assignedCount / totalCount) * 100 : 0}%` }}
                        className="bg-gradient-to-r from-amber-600 via-[#E6C280] to-amber-400 h-full rounded-full transition-all duration-700 shadow-[0_0_15px_rgba(230,194,128,0.5)]"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 dark:text-gray-500 font-mono italic">
                      * Métrica calculada en base a los {totalCount} participantes registrados actualmente.
                    </p>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-950/80 border-2 border-slate-200 dark:border-amber-500/20 px-8 py-4 rounded-2xl text-center w-full md:w-auto shadow-inner">
                    <span className="text-[10px] font-mono text-slate-500 dark:text-gray-500 uppercase tracking-widest font-black block mb-1">Cupos Pendientes</span>
                    <span className="text-3xl font-mono font-black text-amber-600 dark:text-amber-400 tracking-tighter">
                      {totalCount - assignedCount}
                    </span>
                  </div>
                </div>

              </motion.div>
            )}

            {activeTab === 'tablero' && (
              <motion.div
                key="tablero"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                <BoardSection 
                  participants={participants} 
                  currentProposedNumber={eventState.numeroPropuesto} 
                  eventState={eventState}
                  appConfig={appConfig}
                />
              </motion.div>
            )}

            {activeTab === 'participantes' && (
              <motion.div
                key="participantes"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                <TableSection
                  participants={participants}
                  eventState={eventState}
                  onAddParticipant={handleAddParticipant}
                  onEditParticipant={handleEditParticipant}
                  onDeleteParticipant={handleDeleteParticipant}
                  onImportExcel={handleImportExcel}
                  token={token}
                />
              </motion.div>
            )}

            {activeTab === 'evento' && (
              <motion.div
                key="evento"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                {token ? (
                  <EventSection
                    participants={participants}
                    eventState={eventState}
                    appConfig={appConfig}
                    onUpdateEventStatus={handleUpdateEventStatus}
                    onRollNumber={handleRollNumber}
                    onRerollNumber={handleRerollNumber}
                    onConfirmNumber={handleConfirmNumber}
                    onAutoAssign={handleAutoAssign}
                    onResetEvent={handleResetEvent}
                    onUpdateConfig={handleUpdateConfig}
                    dbStatus={dbStatus}
                    onRefreshDbStatus={() => fetchDbStatus(true)}
                  />
                ) : (
                  <AdminLogin onLogin={handleLogin} />
                )}
              </motion.div>
            )}

            {activeTab === 'publico' && (
              <motion.div
                key="publico"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                <PublicSection
                  participants={participants}
                  eventState={eventState}
                  appConfig={appConfig}
                />
              </motion.div>
            )}

            {activeTab === 'ajustes' && (
              <motion.div
                key="ajustes"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="bg-white dark:bg-[#070D19]/80 border border-slate-200 dark:border-blue-500/10 p-8 rounded-3xl shadow-2xl backdrop-blur-xl max-w-2xl mx-auto">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                      <Wrench className="w-6 h-6 text-amber-500" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-slate-900 dark:text-white">Dinámica del Sorteo</h2>
                      <p className="text-slate-500 dark:text-gray-400 text-sm">Configura el rango de boletas y opciones de personalización</p>
                    </div>
                  </div>

                  <div className="space-y-8">
                    {/* Rango de Números */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold text-slate-700 dark:text-gray-300 uppercase tracking-widest flex items-center gap-2">
                        <Layers className="w-4 h-4" />
                        Rango de Boletas
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase px-1">Mínimo</label>
                          <input 
                            type="number"
                            value={localRaffleConfig.rangoMin}
                            onChange={(e) => {
                              setLocalRaffleConfig({ ...localRaffleConfig, rangoMin: parseInt(e.target.value) || 0 });
                              setConfigStatus({ type: null, message: '' });
                            }}
                            className="w-full bg-slate-50 dark:bg-[#0B1528] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase px-1">Máximo</label>
                          <input 
                            type="number"
                            value={localRaffleConfig.rangoMax}
                            onChange={(e) => {
                              setLocalRaffleConfig({ ...localRaffleConfig, rangoMax: parseInt(e.target.value) || 0 });
                              setConfigStatus({ type: null, message: '' });
                            }}
                            className="w-full bg-slate-50 dark:bg-[#0B1528] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Número 00 */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-[#0B1528] rounded-2xl border border-slate-200 dark:border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center font-bold text-amber-500">00</div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-800 dark:text-white">Habilitar Número "00"</h4>
                          <p className="text-[10px] text-slate-500">Incluye el doble cero en la tómbola del sorteo</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          setLocalRaffleConfig({ ...localRaffleConfig, habilitar00: !localRaffleConfig.habilitar00 });
                          setConfigStatus({ type: null, message: '' });
                        }}
                        className={`w-12 h-6 rounded-full transition-all relative ${localRaffleConfig.habilitar00 ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${localRaffleConfig.habilitar00 ? 'left-7' : 'left-1'}`} />
                      </button>
                    </div>

                    {/* Número Ganador Opcional */}
                    <div className="space-y-4 p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Trophy className="w-5 h-5 text-amber-500" />
                          <div>
                            <h3 className="text-sm font-bold text-slate-800 dark:text-white">Habilitar Balón de Oro</h3>
                            <p className="text-[10px] text-slate-500">Programa un número ganador para el sorteo</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            setLocalRaffleConfig({ ...localRaffleConfig, habilitarBalonOro: !localRaffleConfig.habilitarBalonOro, numeroGanador: !localRaffleConfig.habilitarBalonOro ? localRaffleConfig.numeroGanador : null });
                            setConfigStatus({ type: null, message: '' });
                          }}
                          className={`w-12 h-6 rounded-full transition-all relative ${localRaffleConfig.habilitarBalonOro ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${localRaffleConfig.habilitarBalonOro ? 'left-7' : 'left-1'}`} />
                        </button>
                      </div>

                      <AnimatePresence>
                        {localRaffleConfig.habilitarBalonOro && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-3 overflow-hidden pt-2"
                          >
                            <p className="text-xs text-slate-600 dark:text-slate-400">
                              Ingresa el número que ganará de forma garantizada:
                            </p>
                            <input 
                              type="text"
                              placeholder="Ej. 07"
                              value={localRaffleConfig.numeroGanador || ''}
                              onChange={(e) => {
                                setLocalRaffleConfig({ ...localRaffleConfig, numeroGanador: e.target.value || null });
                                setConfigStatus({ type: null, message: '' });
                              }}
                              className="w-full bg-white dark:bg-[#0B1528] border border-amber-500/30 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Status Message */}
                    <AnimatePresence>
                      {configStatus.type && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2 ${configStatus.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'}`}
                        >
                          {configStatus.type === 'success' ? <ShieldCheck className="w-4 h-4" /> : <Info className="w-4 h-4" />}
                          {configStatus.message}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <button
                      onClick={handleUpdateRaffleConfig}
                      className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-4 rounded-2xl shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
                    >
                      <Save className="w-5 h-5" />
                      GUARDAR CONFIGURACIÓN
                    </button>

                    {/* Advertencia de Reset */}
                    <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex gap-3">
                      <Info className="w-5 h-5 text-blue-500 flex-shrink-0" />
                      <p className="text-[11px] text-blue-600 dark:text-blue-400 leading-relaxed">
                        <strong>Nota:</strong> Si guardas una configuración de rango (mínimo, máximo o 00) diferente a la actual, el tablero se reiniciará automáticamente y las asignaciones se borrarán. Ajustar únicamente el Ganador Programado no reiniciará el juego.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'logs' && (
              <motion.div
                key="logs"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                <AuditSection
                  logs={logs}
                  onClearLogs={handleClearLogs}
                  token={token}
                  isDbLocal={isDbLocal}
                />
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>

      {/* Footer Audit Declaration */}
      <footer className="border-t border-white/5 py-8 mt-12 bg-[#040810]/70">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-gray-500">
          <p className="font-mono">© 2026 SorteoSOS • PROCESO COMPLETAMENTE AUDITADO • TODOS LOS DERECHOS RESERVADOS</p>
          <div className="flex gap-4 font-mono text-[10px]">
            <p>DB: MongoDB Cloud (SorteoSOS)</p>
            <p>WS ID: socket-active</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
