import React, { useState, useEffect } from 'react';
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
import { 
  Trophy, Users, Calendar, HelpCircle, LayoutDashboard, 
  TableProperties, Disc, LogOut, ShieldCheck, Play, Eye, Terminal, Lock,
  Tv, Sparkles, Cpu, Layers, ChevronLeft, ChevronRight, Sun, Moon, Home
} from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'inicio' | 'tablero' | 'participantes' | 'evento' | 'publico' | 'logs'>('inicio');
  
  // App States
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [eventState, setEventState] = useState<EventState>({
    estado: 'LISTO',
    participanteActualId: null,
    numeroPropuesto: null,
    numerosDisponibles: Array.from({ length: 99 }, (_, i) => String(i + 1).padStart(2, '0')),
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

  // Auth States
  const [token, setToken] = useState<string | null>(localStorage.getItem('admin_token'));
  const [adminUser, setAdminUser] = useState<string | null>(localStorage.getItem('admin_username'));

  // Socket Connection for Real-Time Sync
  useEffect(() => {
    const socket = socketIOClient(window.location.origin);

    socket.on('connect', () => {
      setSocketConnected(true);
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    // Get initial state
    socket.emit('get:state');

    // Live state triggers
    socket.on('state:changed', (data: { state: EventState; config: AppConfig; participantsCount: number }) => {
      setEventState(data.state);
      setAppConfig(data.config);
      // Fetch latest lists
      fetchParticipants();
      fetchLogs();
      fetchDbStatus();
    });

    socket.on('participants:changed', (updatedList: Participant[]) => {
      setParticipants(updatedList);
    });

    socket.on('event:confirmed', () => {
      fetchParticipants();
      fetchLogs();
      fetchDbStatus();
    });

    socket.on('event:auto-assigned-complete', () => {
      fetchParticipants();
      fetchLogs();
      fetchDbStatus();
    });

    socket.on('event:reset-complete', () => {
      fetchParticipants();
      fetchLogs();
      fetchDbStatus();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Sync initial setup and set up fallback interval + image slider interval
  useEffect(() => {
    fetchParticipants();
    fetchLogs();
    fetchConfig();
    fetchEventState();
    fetchDbStatus();
  }, [token]);

  // Robust automatic periodic polling (Vercel Compatibility Fallback)
  // Ensures that all users see updates eventually if sockets fail
  useEffect(() => {
    // If socket is connected, poll very slowly (every 30 seconds) to save resources.
    // If socket is disconnected (e.g. on Vercel), poll frequently (every 2.5 seconds) to ensure real-time sync.
    const pollInterval = socketConnected ? 30000 : 2500;
    let pollCount = 0;

    const interval = setInterval(() => {
      // Only poll if window is focused to save resources
      if (document.visibilityState === 'visible') {
        fetchEventState();
        fetchParticipants();
        
        pollCount++;
        // Fetch logs and DB status less frequently (every 10 seconds on fallback, every 2 minutes on socket)
        const statusPollCycle = socketConnected ? 4 : 4; 
        if (pollCount % statusPollCycle === 0) {
          fetchLogs();
          fetchDbStatus();
        }
      }
    }, pollInterval);

    return () => clearInterval(interval);
  }, [socketConnected]);

  // Automatic rotation of the QLED screen slideshow every 4.5 seconds
  useEffect(() => {
    const slideInterval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % CAROUSEL_IMAGES.length);
    }, 4500);

    return () => clearInterval(slideInterval);
  }, []);

  const fetchDbStatus = async () => {
    try {
      const res = await fetch('/api/db/status');
      if (res.ok) {
        const data = await res.json();
        setDbStatus(data);
        setIsDbLocal(!data.connected);
      }
    } catch (e) {
      console.error('Error fetching db status:', e);
    }
  };

  const fetchParticipants = async () => {
    try {
      const res = await fetch('/api/participants');
      if (res.ok) {
        const data = await res.json();
        setParticipants(data);
      }
    } catch (e) {
      console.error('Error fetching participants:', e);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (e) {
      console.error('Error fetching audit logs:', e);
    }
  };

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const data = await res.json();
        setAppConfig(data);
      }
    } catch (e) {
      console.error('Error fetching config:', e);
    }
  };

  const fetchEventState = async () => {
    try {
      const res = await fetch('/api/event/state');
      if (res.ok) {
        const data = await res.json();
        setEventState(data);
      }
    } catch (e) {
      console.error('Error fetching event state:', e);
    }
  };

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
        fetchParticipants();
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
        fetchParticipants();
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
        fetchParticipants();
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
    fetchParticipants();
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
    fetchParticipants();
    return data;
  };

  const handleAutoAssign = async () => {
    const res = await fetch('/api/event/auto-assign', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || 'Auto assignment failed');
    } else {
      const data = await res.json();
      if (data.state) {
        setEventState(data.state);
      }
      fetchParticipants();
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
    fetchEventState();
    fetchParticipants();
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
      fetchEventState();
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
      fetchLogs();
    }
  };

  // Derived metrics
  const totalCount = participants.length;
  const assignedCount = participants.filter(p => p.numeroAsignado).length;
  const pendingCount = participants.filter(p => p.participa && !p.numeroAsignado).length;
  const availableNumbersCount = 99 - assignedCount;

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
              <span>Proyectar</span>
            </button>
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
              {/* Thank You Note Section */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-blue-500/5 border border-blue-200 dark:border-blue-500/20 rounded-2xl p-6 relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                <div className="flex items-start gap-4">
                  <div className="p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/20">
                    <Users className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                      ¡Gracias por hacer esto posible, Equipo! 💙
                    </h3>
                    <p className="text-slate-600 dark:text-gray-300 text-xs leading-relaxed font-medium italic">
                      "Queremos agradecer de corazón a cada uno de ustedes por sumarse al recaudo para el televisor de 50 pulgadas".
                      <br /><br />
                      Más allá de quién se lleve el premio a casa (¡mucha suerte a todos! 🍀), lo realmente valioso ha sido demostrar, una vez más, la fuerza y la unión que nos caracteriza como Gestión de Ingresos.
                      <br /><br />
                      Que este gran ambiente de compañerismo sea el impulso para seguir integrándonos y creciendo juntos en muchas más actividades. ¡Somos un gran equipo! 🚀🤝"
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Main Prize Feature Panel */}
              <div className="relative overflow-hidden bg-white dark:bg-gradient-to-b dark:from-[#0C152B] dark:via-[#050D1C] dark:to-[#040810] border border-slate-200 dark:border-amber-500/20 rounded-3xl p-6 md:p-10 shadow-xl dark:shadow-2xl">
                <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
                <div className="absolute -right-32 -top-32 w-96 h-96 bg-amber-500/5 rounded-full blur-[120px] pointer-events-none" />
                <div className="absolute -left-32 -bottom-32 w-96 h-96 bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-10 items-center relative z-10">
                  {/* Left Column: TV visual design and badges */}
                  <div className="lg:col-span-5 space-y-6 flex flex-col items-center lg:items-start text-center lg:text-left">
                    <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400 font-mono text-[10px] font-black px-3.5 py-1.5 rounded-full uppercase tracking-widest animate-pulse">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                      Premio Mayor • Gran Sorteo
                    </div>

                    <div className="space-y-2">
                      <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-none uppercase font-sans">
                        Televisor HISENSE 50" QLED
                      </h2>
                      <p className="text-amber-600 dark:text-amber-400 text-sm md:text-base font-extrabold tracking-wide">
                        Smart TV 50Q4SV • Experiencia de Cine en Casa
                      </p>
                    </div>

                    {/* Stunning mock TV physical framing representing the Hisense TV */}
                    <div className="w-full max-w-sm aspect-video bg-slate-950 border-4 border-slate-850 rounded-xl p-1 shadow-[0_25px_60px_rgba(0,0,0,0.85),_0_0_25px_rgba(230,194,128,0.2)] relative group overflow-hidden">
                      {/* TV Stand Base mockup */}
                      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-16 h-[3px] bg-slate-700 z-30" />

                      {/* Image Slide Panel */}
                      <div className="w-full h-full relative rounded overflow-hidden">
                        <img 
                          src={CAROUSEL_IMAGES[currentImageIndex]} 
                          alt={`SorteoSOS Premio ${currentImageIndex + 1}`}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover object-center transition-transform duration-750 group-hover:scale-105"
                        />

                        {/* Delicate physical glass reflection sheen overlay */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 pointer-events-none z-10" />
                        <div className="absolute top-1 left-3 w-16 h-3 bg-white/15 rounded-full filter blur-[1px] transform -rotate-12 pointer-events-none z-10 opacity-65" />

                        {/* HUD Overlay Label */}
                        <div className="absolute bottom-2.5 left-2.5 bg-black/75 border border-white/10 px-2 py-0.5 rounded text-[9px] font-mono font-semibold text-amber-400 tracking-wider backdrop-blur-sm z-20">
                          QLED SCREEN • FOTO {currentImageIndex + 1}/{CAROUSEL_IMAGES.length}
                        </div>

                        {/* Left/Right manual buttons */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentImageIndex((prev) => (prev - 1 + CAROUSEL_IMAGES.length) % CAROUSEL_IMAGES.length);
                          }}
                          className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/60 hover:bg-amber-400 hover:text-slate-950 border border-white/10 text-white flex items-center justify-center transition-all z-20 cursor-pointer opacity-0 group-hover:opacity-100"
                          title="Anterior"
                        >
                          <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentImageIndex((prev) => (prev + 1) % CAROUSEL_IMAGES.length);
                          }}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/60 hover:bg-amber-400 hover:text-slate-950 border border-white/10 text-white flex items-center justify-center transition-all z-20 cursor-pointer opacity-0 group-hover:opacity-100"
                          title="Siguiente"
                        >
                          <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                        </button>

                        {/* Carousel Indicator Dots */}
                        <div className="absolute bottom-2.5 right-2.5 flex gap-1 z-20 bg-black/50 px-1.5 py-1 rounded-full backdrop-blur-sm border border-white/5">
                          {CAROUSEL_IMAGES.map((_, idx) => (
                            <button
                              key={idx}
                              onClick={(e) => {
                                e.stopPropagation();
                                setCurrentImageIndex(idx);
                              }}
                              className={`w-1.5 h-1.5 rounded-full transition-all cursor-pointer ${currentImageIndex === idx ? 'bg-amber-400 w-3' : 'bg-gray-500 hover:bg-gray-300'}`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Highlight pill banner */}
                    <div className="bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-white/5 px-5 py-3 rounded-2xl w-full">
                      <p className="text-amber-600 dark:text-amber-400 text-xs font-mono uppercase tracking-widest font-black">50" Pantalla Gigante</p>
                      <p className="text-slate-500 dark:text-gray-400 text-[11px] mt-0.5">Disfruta de la mejor calidad de imagen de ultra alta definición.</p>
                    </div>
                  </div>

                  {/* Right Column: Full specifications matrix table */}
                  <div className="lg:col-span-7 space-y-6">
                    <div className="border-b border-slate-200 dark:border-white/10 pb-3 flex items-center justify-between">
                      <h3 className="text-sm font-mono text-slate-500 dark:text-gray-400 uppercase tracking-wider font-bold">Ficha Técnica Oficial</h3>
                      <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400/80 bg-amber-500/5 px-2.5 py-1 rounded border border-amber-500/10">Ref: 50Q4SV</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-xs">
                      {[
                        { label: "Referencia", value: "50Q4SV" },
                        { label: "Resolución", value: "Fhd (1920*1080)" },
                        { label: "Tipo de pantalla", value: "QLED" },
                        { label: "Sistema operativo", value: "Vidaa" },
                        { label: "Tamaño", value: "50\" (127 cm)" },
                        { label: "Smart TV", value: "Sí" },
                        { label: "TDT", value: "Sí" },
                        { label: "Dimensiones", value: "111.1 x 65.5 x 7.1 cm" },
                        { label: "Puertos", value: "2 HDMI, 1 USB" },
                        { label: "Audio", value: "12W" },
                        { label: "Peso", value: "7.4 kg" },
                      ].map((spec, i) => (
                        <div 
                          key={i} 
                          className="flex items-center justify-between py-2 border-b border-slate-200/60 dark:border-white/5 hover:bg-slate-100/50 dark:hover:bg-white/5 px-2 rounded transition-all"
                        >
                          <span className="text-slate-500 dark:text-gray-400 font-medium">{spec.label}</span>
                          <span className="text-slate-900 dark:text-white font-extrabold text-right">{spec.value}</span>
                        </div>
                      ))}
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-4 flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={() => setActiveTab('tablero')}
                        className="flex-1 bg-[#E6C280] hover:bg-[#d4b06a] text-slate-950 font-black text-xs px-6 py-3.5 rounded-xl shadow-lg shadow-amber-500/15 cursor-pointer transition-all text-center uppercase tracking-wider"
                      >
                        Ver Balones en Tablero
                      </button>
                      <button
                        onClick={() => setActiveTab('publico')}
                        className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-850 border border-slate-200 dark:border-white/5 text-slate-800 dark:text-white font-bold text-xs px-6 py-3.5 rounded-xl cursor-pointer transition-all text-center uppercase tracking-wider"
                      >
                        Proyectar Sorteo (Pantalla Completa)
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sorteo Oficial & Dinámica del Juego Cards */}
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
                          <p className="text-slate-900 dark:text-white text-sm font-black uppercase tracking-wide">Últimas 2 Cifras</p>
                          <p className="text-slate-500 dark:text-gray-400 text-xs leading-relaxed">El ganador se define única y exclusivamente con las cifras finales del sorteo de Chontico Noche.</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-black/40 rounded-2xl border border-slate-100 dark:border-white/5">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center font-mono text-sm text-amber-600 dark:text-amber-400 font-black shadow-lg">2</div>
                        <div className="space-y-1">
                          <p className="text-slate-900 dark:text-white text-sm font-black uppercase tracking-wide">Sorteo Garantizado</p>
                          <p className="text-slate-500 dark:text-gray-400 text-xs leading-relaxed">Jugamos cada noche hasta que el número extraído coincida exactamente con un participante registrado.</p>
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
                  onRefreshDbStatus={fetchDbStatus}
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
