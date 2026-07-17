import React, { useState } from 'react';
import { Participant } from '../types';
import { 
  Search, Filter, Plus, FileSpreadsheet, Download, 
  Edit2, Trash2, Check, X, AlertCircle, Sparkles, DollarSign 
} from 'lucide-react';

interface TableSectionProps {
  participants: Participant[];
  onAddParticipant: (p: Omit<Participant, '_id' | 'id'>) => Promise<void>;
  onEditParticipant: (id: string, p: Partial<Participant>) => Promise<void>;
  onDeleteParticipant: (id: string) => Promise<void>;
  onImportExcel: (base64: string) => Promise<void>;
  token: string | null;
}

export default function TableSection({
  participants,
  onAddParticipant,
  onEditParticipant,
  onDeleteParticipant,
  onImportExcel,
  token
}: TableSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPayment, setFilterPayment] = useState<'ALL' | 'PAID' | 'PENDING'>('ALL');
  const [filterAssigned, setFilterAssigned] = useState<'ALL' | 'ASSIGNED' | 'UNASSIGNED'>('ALL');
  
  // Form States
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // New Participant Input Form
  const [newNombre, setNewNombre] = useState('');
  const [newApellido, setNewApellido] = useState('');
  const [newEquipo, setNewEquipo] = useState('');
  const [newArea, setNewArea] = useState('');
  const [newPago, setNewPago] = useState(false);
  const [newParticipa, setNewParticipa] = useState(true);
  const [newMedio, setNewMedio] = useState('');
  const [newValor, setNewValor] = useState('0');

  // Inline Edit states
  const [editNombre, setEditNombre] = useState('');
  const [editApellido, setEditApellido] = useState('');
  const [editEquipo, setEditEquipo] = useState('');
  const [editArea, setEditArea] = useState('');
  const [editPago, setEditPago] = useState(false);
  const [editParticipa, setEditParticipa] = useState(true);
  const [editMedio, setEditMedio] = useState('');
  const [editValor, setEditValor] = useState('0');

  const [importingState, setImportingState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [importError, setImportError] = useState('');

  // Handle excel upload
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportingState('loading');
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const result = event.target?.result as string;
        // Strip base64 metadata header if present
        const base64Data = result.split(',')[1] || result;
        await onImportExcel(base64Data);
        setImportingState('success');
        setTimeout(() => setImportingState('idle'), 3000);
      } catch (err: any) {
        setImportingState('error');
        setImportError(err.message || 'Error importando archivo');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNombre || !newApellido) return;

    try {
      await onAddParticipant({
        nombre: newNombre,
        apellido: newApellido,
        equipo: newEquipo,
        area: newArea,
        pago: newPago,
        participa: newParticipa,
        numeroAsignado: null,
        medioPago: newMedio,
        valor: Number(newValor) || 0
      });

      // Reset
      setNewNombre('');
      setNewApellido('');
      setNewEquipo('');
      setNewArea('');
      setNewPago(false);
      setNewParticipa(true);
      setNewMedio('');
      setNewValor('0');
      setIsAdding(false);
    } catch (err) {
      console.error(err);
    }
  };

  const startEdit = (p: Participant) => {
    const id = p._id || p.id;
    if (!id) return;
    setEditingId(id);
    setEditNombre(p.nombre);
    setEditApellido(p.apellido);
    setEditEquipo(p.equipo || '');
    setEditArea(p.area || '');
    setEditPago(!!p.pago);
    setEditParticipa(p.participa !== false);
    setEditMedio(p.medioPago || '');
    setEditValor(String(p.valor || 0));
  };

  const saveEdit = async (id: string) => {
    try {
      await onEditParticipant(id, {
        nombre: editNombre,
        apellido: editApellido,
        equipo: editEquipo,
        area: editArea,
        pago: editPago,
        participa: editParticipa,
        medioPago: editMedio,
        valor: Number(editValor) || 0
      });
      setEditingId(null);
    } catch (err) {
      console.error(err);
    }
  };

  // Filter participants
  const filteredParticipants = React.useMemo(() => {
    return participants.filter(p => {
      const matchesSearch = 
        `${p.nombre} ${p.apellido}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.equipo || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.area || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.numeroAsignado || '').includes(searchQuery);

      const matchesPayment = 
        filterPayment === 'ALL' ||
        (filterPayment === 'PAID' && p.pago) ||
        (filterPayment === 'PENDING' && !p.pago);

      const matchesAssigned = 
        filterAssigned === 'ALL' ||
        (filterAssigned === 'ASSIGNED' && p.numeroAsignado) ||
        (filterAssigned === 'UNASSIGNED' && !p.numeroAsignado);

      return matchesSearch && matchesPayment && matchesAssigned;
    });
  }, [participants, searchQuery, filterPayment, filterAssigned]);

  return (
    <div className="space-y-6">
      {/* Search and Action Bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-white dark:bg-[#070D19]/80 border border-slate-200 dark:border-blue-500/10 p-5 rounded-2xl shadow-xl backdrop-blur-xl">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, equipo, área o número..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-[#0B1528] border border-slate-200 dark:border-blue-500/20 rounded-xl py-2 px-10 text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center w-full md:w-auto">
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-[#0B1528] px-3 py-1.5 border border-slate-200 dark:border-blue-500/15 rounded-xl">
            <DollarSign className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <select
              value={filterPayment}
              onChange={(e: any) => setFilterPayment(e.target.value)}
              className="bg-slate-100 dark:bg-[#0B1528] border-none text-xs text-slate-700 dark:text-gray-300 focus:outline-none cursor-pointer font-sans"
            >
              <option value="ALL" className="bg-slate-100 dark:bg-[#0B1528] text-slate-800 dark:text-white">Todos los Pagos</option>
              <option value="PAID" className="bg-slate-100 dark:bg-[#0B1528] text-slate-800 dark:text-white">Pagados</option>
              <option value="PENDING" className="bg-slate-100 dark:bg-[#0B1528] text-slate-800 dark:text-white">Pendientes</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-[#0B1528] px-3 py-1.5 border border-slate-200 dark:border-blue-500/15 rounded-xl">
            <Filter className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <select
              value={filterAssigned}
              onChange={(e: any) => setFilterAssigned(e.target.value)}
              className="bg-slate-100 dark:bg-[#0B1528] border-none text-xs text-slate-700 dark:text-gray-300 focus:outline-none cursor-pointer font-sans"
            >
              <option value="ALL" className="bg-slate-100 dark:bg-[#0B1528] text-slate-800 dark:text-white">Todas las Asignaciones</option>
              <option value="ASSIGNED" className="bg-slate-100 dark:bg-[#0B1528] text-slate-800 dark:text-white">Con Número</option>
              <option value="UNASSIGNED" className="bg-slate-100 dark:bg-[#0B1528] text-slate-800 dark:text-white">Sin Número</option>
            </select>
          </div>

          {token && (
            <button
              onClick={() => setIsAdding(!isAdding)}
              className="ml-auto md:ml-0 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-lg shadow-amber-500/10 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-slate-950 stroke-[3]" />
              Nuevo Participante
            </button>
          )}
        </div>
      </div>

      {/* Excel Importer View */}
      {token && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-[#070D19]/60 backdrop-blur-xl border border-dashed border-slate-350 dark:border-blue-500/30 p-6 rounded-2xl flex flex-col items-center justify-center text-center group hover:border-amber-500/40 dark:hover:border-amber-400/40 transition-colors shadow-lg">
            <FileSpreadsheet className="w-10 h-10 text-blue-500 dark:text-blue-400 mb-3 group-hover:text-amber-500 transition-colors" />
            <h3 className="text-slate-850 dark:text-white font-medium text-sm mb-1.5">Carga Masiva desde Excel</h3>
            <p className="text-slate-500 dark:text-gray-400 text-xs max-w-xs mb-4 leading-relaxed">
              Sube la lista oficial de participantes para importación o <strong>restauración de resultados</strong>. Las columnas son: Nombre, Apellido, Equipo, Área, Pago, Participa, <strong>Nro. Asignado</strong>, Medio, Valor.
            </p>
            <label className="relative overflow-hidden bg-blue-500/10 hover:bg-blue-500/15 border border-blue-500/35 hover:border-blue-500/50 text-blue-600 dark:text-blue-300 text-xs font-semibold px-4 py-2 rounded-xl cursor-pointer transition-all">
              Seleccionar Archivo Excel
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleExcelUpload}
                className="hidden"
              />
            </label>

            {importingState === 'loading' && (
              <p className="text-amber-500 dark:text-amber-400 text-xs mt-3 animate-pulse">Procesando archivo excel...</p>
            )}
            {importingState === 'success' && (
              <p className="text-emerald-500 dark:text-emerald-400 text-xs mt-3">¡Participantes importados exitosamente!</p>
            )}
            {importingState === 'error' && (
              <div className="flex items-center gap-1.5 text-rose-500 dark:text-rose-400 text-xs mt-3 bg-rose-500/10 p-2 border border-rose-500/20 rounded-lg">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{importError}</span>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-[#070D19]/60 backdrop-blur-xl border border-slate-200 dark:border-blue-500/10 p-6 rounded-2xl flex flex-col justify-between shadow-lg">
            <div>
              <h3 className="text-slate-850 dark:text-white font-medium text-sm flex items-center gap-1.5 mb-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Descargar Resultados
              </h3>
              <p className="text-slate-500 dark:text-gray-400 text-xs leading-relaxed mb-4">
                Exporta el estado actual de las asignaciones en tiempo real para auditorías o proyecciones impresas. El archivo contendrá el desglose de cada participante con su número.
              </p>
            </div>
            <div className="flex gap-3">
              <a
                href="/api/export/excel"
                className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 hover:border-blue-400/30 text-slate-800 dark:text-white text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                <Download className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                Exportar Excel (.xlsx)
              </a>
              <a
                href="/api/export/csv"
                className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 hover:border-amber-400/30 text-slate-800 dark:text-white text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                <Download className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                Exportar CSV (.csv)
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Manual Input Form */}
      {isAdding && (
        <form onSubmit={handleCreate} className="bg-white dark:bg-slate-900/85 border border-slate-200 dark:border-amber-500/20 p-5 rounded-2xl shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
            <h3 className="text-amber-600 dark:text-amber-400 text-xs font-mono uppercase tracking-widest font-bold">Registrar Participante</h3>
            <button type="button" onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1 font-mono">Nombre</label>
              <input
                type="text"
                required
                value={newNombre}
                onChange={e => setNewNombre(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-lg p-2 text-xs text-slate-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1 font-mono">Apellido</label>
              <input
                type="text"
                required
                value={newApellido}
                onChange={e => setNewApellido(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-lg p-2 text-xs text-slate-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1 font-mono">Equipo</label>
              <input
                type="text"
                value={newEquipo}
                onChange={e => setNewEquipo(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-lg p-2 text-xs text-slate-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1 font-mono">Área</label>
              <input
                type="text"
                value={newArea}
                onChange={e => setNewArea(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-lg p-2 text-xs text-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            <div>
              <label className="block text-[10px] text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1 font-mono">Medio de Pago</label>
              <input
                type="text"
                placeholder="Efectivo, Nequi..."
                value={newMedio}
                onChange={e => setNewMedio(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-lg p-2 text-xs text-slate-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1 font-mono">Valor</label>
              <input
                type="number"
                value={newValor}
                onChange={e => setNewValor(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-lg p-2 text-xs text-slate-800 dark:text-white"
              />
            </div>
            <div className="flex items-center gap-6 pt-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={newPago}
                  onChange={e => setNewPago(e.target.checked)}
                  className="rounded border-slate-300 dark:border-gray-600 bg-slate-50 dark:bg-slate-950 text-amber-500"
                />
                <span className="text-xs text-slate-600 dark:text-gray-300">¿Ha Pagado?</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={newParticipa}
                  onChange={e => setNewParticipa(e.target.checked)}
                  className="rounded border-slate-300 dark:border-gray-600 bg-slate-50 dark:bg-slate-950 text-amber-500"
                />
                <span className="text-xs text-slate-600 dark:text-gray-300">¿Participa?</span>
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-3">
              <button
                type="submit"
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs px-4 py-2 rounded-lg cursor-pointer"
              >
                Guardar
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Main Table */}
      <div className="bg-white dark:bg-[#070D19]/80 border border-slate-200 dark:border-blue-500/10 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-[#0B1528] text-slate-500 dark:text-gray-400 text-[10px] uppercase tracking-wider border-b border-slate-200 dark:border-blue-500/10">
                <th className="py-4 px-6 font-mono font-bold">Participante</th>
                <th className="py-4 px-4 font-mono font-bold">Equipo / Área</th>
                <th className="py-4 px-4 font-mono font-bold">Estado Pago</th>
                <th className="py-4 px-4 font-mono font-bold text-center">Participa</th>
                <th className="py-4 px-4 font-mono font-bold text-center">Número Asignado</th>
                <th className="py-4 px-4 font-mono font-bold">Fecha Asignación</th>
                {token && <th className="py-4 px-6 font-mono font-bold text-center">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 dark:divide-white/5 text-xs text-slate-700 dark:text-gray-300">
              {filteredParticipants.length === 0 ? (
                <tr>
                  <td colSpan={token ? 7 : 6} className="py-12 text-center text-slate-400 dark:text-gray-500">
                    No se encontraron participantes con los criterios de búsqueda.
                  </td>
                </tr>
              ) : (
                filteredParticipants.map((p) => {
                  const id = p._id || p.id || '';
                  const isEditing = editingId === id;

                  return (
                    <tr key={id} className="hover:bg-blue-50/50 dark:hover:bg-blue-500/5 transition-colors">
                      {/* Name / Surname */}
                      <td className="py-3 px-6">
                        {isEditing ? (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={editNombre}
                              onChange={e => setEditNombre(e.target.value)}
                              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/20 rounded p-1 w-24 text-slate-800 dark:text-white"
                            />
                            <input
                              type="text"
                              value={editApellido}
                              onChange={e => setEditApellido(e.target.value)}
                              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/20 rounded p-1 w-24 text-slate-800 dark:text-white"
                            />
                          </div>
                        ) : (
                          <span className="font-bold text-slate-800 dark:text-white">
                            {p.nombre} {p.apellido}
                          </span>
                        )}
                      </td>

                      {/* Team & Area */}
                      <td className="py-3 px-4">
                        {isEditing ? (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Equipo"
                              value={editEquipo}
                              onChange={e => setEditEquipo(e.target.value)}
                              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/20 rounded p-1 w-20 text-slate-800 dark:text-white"
                            />
                            <input
                              type="text"
                              placeholder="Área"
                              value={editArea}
                              onChange={e => setEditArea(e.target.value)}
                              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/20 rounded p-1 w-20 text-slate-800 dark:text-white"
                            />
                          </div>
                        ) : (
                          <span className="text-slate-500 dark:text-gray-400">
                            {p.equipo || '-'} <span className="text-slate-300 dark:text-gray-600">/</span> {p.area || '-'}
                          </span>
                        )}
                      </td>

                      {/* Payment */}
                      <td className="py-3 px-4">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="checkbox"
                              checked={editPago}
                              onChange={e => setEditPago(e.target.checked)}
                              className="rounded border-slate-300 dark:border-gray-600 bg-slate-50 dark:bg-slate-950 text-amber-500"
                            />
                            <input
                              type="text"
                              placeholder="Medio"
                              value={editMedio}
                              onChange={e => setEditMedio(e.target.value)}
                              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/20 rounded p-1 w-16 text-slate-800 dark:text-white"
                            />
                            <input
                              type="number"
                              placeholder="Valor"
                              value={editValor}
                              onChange={e => setEditValor(e.target.value)}
                              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/20 rounded p-1 w-12 text-slate-800 dark:text-white"
                            />
                          </div>
                        ) : p.pago ? (
                          <div className="flex items-center gap-1">
                            <span className="px-2 py-0.5 bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-full text-[10px]">
                              Pagado
                            </span>
                            {p.medioPago && (
                              <span className="text-[10px] text-slate-400 dark:text-gray-500">({p.medioPago})</span>
                            )}
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 bg-rose-500/10 dark:bg-rose-500/15 border border-rose-500/20 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 rounded-full text-[10px]">
                            Pendiente
                          </span>
                        )}
                      </td>

                      {/* Active Toggle */}
                      <td className="py-3 px-4 text-center font-semibold">
                        {isEditing ? (
                          <input
                            type="checkbox"
                            checked={editParticipa}
                            onChange={e => setEditParticipa(e.target.checked)}
                            className="rounded border-slate-300 dark:border-gray-600 bg-slate-50 dark:bg-slate-950 text-amber-500"
                          />
                        ) : p.participa !== false ? (
                          <span className="text-emerald-500 dark:text-emerald-400">Sí</span>
                        ) : (
                          <span className="text-rose-500 dark:text-rose-400">No</span>
                        )}
                      </td>

                      {/* Assigned Number */}
                      <td className="py-3 px-4 text-center">
                        {p.numeroAsignado ? (
                          <span className="font-mono bg-amber-50 dark:bg-[#1C160B] border border-amber-500/20 dark:border-amber-500/30 text-amber-700 dark:text-amber-400 font-bold px-2.5 py-1 rounded shadow-inner">
                            {p.numeroAsignado.padStart(2, '0')}
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-gray-600 font-mono">-</span>
                        )}
                      </td>

                      {/* Confirmation Date */}
                      <td className="py-3 px-4 text-slate-400 dark:text-gray-500 font-mono">
                        {p.fechaAsignacion ? (
                          new Date(p.fechaAsignacion).toLocaleDateString('es-ES', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        ) : (
                          <span className="italic text-slate-300 dark:text-gray-600">No asignado</span>
                        )}
                      </td>

                      {/* Inline Controls */}
                      {token && (
                        <td className="py-3 px-6 text-center">
                          <div className="flex items-center justify-center gap-2.5">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => saveEdit(id)}
                                  className="p-1 text-emerald-500 dark:text-emerald-400 hover:bg-emerald-500/10 rounded cursor-pointer"
                                  title="Confirmar"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="p-1 text-rose-500 dark:text-rose-400 hover:bg-rose-500/10 rounded cursor-pointer"
                                  title="Cancelar"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => startEdit(p)}
                                  className="p-1 text-blue-500 dark:text-blue-400 hover:bg-blue-500/10 rounded cursor-pointer"
                                  title="Editar"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => onDeleteParticipant(id)}
                                  className="p-1 text-rose-500 dark:text-rose-400 hover:bg-rose-500/10 rounded cursor-pointer"
                                  title="Eliminar"
                                  disabled={!!p.numeroAsignado}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
