import React, { useState, useMemo } from 'react';
import {
  Mail,
  Phone,
  Search,
  CheckCircle2,
  Clock,
  Archive,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Copy,
  Check,
  Calendar,
  FileText,
  UserCheck
} from 'lucide-react';
import { useAgendaStore } from '../lib/store';
import { ContactMessage, ContactMessageStatus } from '../types';

interface SuperAdminMessagesViewProps {
  onNavigateToTab?: (tab: string) => void;
}

export const SuperAdminMessagesView: React.FC<SuperAdminMessagesViewProps> = ({
  onNavigateToTab
}) => {
  const {
    contactMessages,
    updateContactMessageStatus,
    updateContactMessageNote,
    deleteContactMessage
  } = useAgendaStore();

  const [filterStatus, setFilterStatus] = useState<ContactMessageStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [tempNote, setTempNote] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Filter & search messages
  const filteredMessages = useMemo(() => {
    return contactMessages.filter(msg => {
      // Filter by status
      if (filterStatus !== 'all' && msg.status !== filterStatus) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = msg.name?.toLowerCase().includes(q);
        const matchesEmail = msg.email?.toLowerCase().includes(q);
        const matchesPhone = msg.phone?.toLowerCase().includes(q);
        const matchesSubject = msg.subject?.toLowerCase().includes(q);
        const matchesMessage = msg.message?.toLowerCase().includes(q);
        const matchesNotes = msg.notes?.toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesPhone && !matchesSubject && !matchesMessage && !matchesNotes) {
          return false;
        }
      }
      return true;
    });
  }, [contactMessages, filterStatus, searchQuery]);

  // Statistics counts
  const totalCount = contactMessages.length;
  const pendingCount = contactMessages.filter(m => m.status === 'pending').length;
  const repliedCount = contactMessages.filter(m => m.status === 'replied').length;
  const archivedCount = contactMessages.filter(m => m.status === 'archived').length;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSaveNote = async (id: string) => {
    await updateContactMessageNote(id, tempNote.trim());
    setEditingNoteId(null);
  };

  const handleStatusChange = async (id: string, newStatus: ContactMessageStatus) => {
    await updateContactMessageStatus(id, newStatus);
  };

  const handleDelete = async (id: string) => {
    await deleteContactMessage(id);
    setConfirmDeleteId(null);
  };

  const formatMessageDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat('es-AR', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(date);
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 font-display">
            Buzón de Mensajes de Contacto (Web)
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1 max-w-2xl leading-relaxed">
            Consultas recibidas desde la página pública de contacto (<code className="px-1.5 py-0.5 bg-neutral-100 text-emerald-700 rounded font-mono text-xs border border-neutral-200">/contacto</code>). Todos los mensajes cuentan con verificación humana anti-bot y sincronización en tiempo real.
          </p>
        </div>

        {onNavigateToTab && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onNavigateToTab('contacto')}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Ver Formulario Público</span>
            </button>
          </div>
        )}
      </div>

      {/* METRIC COUNTER CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Messages */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-semibold">
            <span>Total Recibidos</span>
            <Mail className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-neutral-950">
            {totalCount}
          </div>
          <div className="text-[11px] text-neutral-500">
            Desde la landing y portal
          </div>
        </div>

        {/* Pending Messages */}
        <div className={`p-5 rounded-2xl border shadow-2xs space-y-1 transition ${
          pendingCount > 0
            ? 'bg-rose-50/70 border-rose-200'
            : 'bg-white border-neutral-200/80'
        }`}>
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className={pendingCount > 0 ? 'text-rose-700 font-bold' : 'text-neutral-500'}>
              Nuevos / Pendientes
            </span>
            <Clock className={`w-4 h-4 ${pendingCount > 0 ? 'text-rose-600 animate-pulse' : 'text-neutral-400'}`} />
          </div>
          <div className={`text-2xl sm:text-3xl font-black ${pendingCount > 0 ? 'text-rose-600' : 'text-neutral-950'}`}>
            {pendingCount}
          </div>
          <div className="text-[11px] text-neutral-500">
            {pendingCount > 0 ? 'Requieren respuesta' : 'Al día, sin pendientes'}
          </div>
        </div>

        {/* Replied Messages */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-semibold">
            <span>Respondidos</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-neutral-950">
            {repliedCount}
          </div>
          <div className="text-[11px] text-neutral-500">
            Atendidos por el equipo
          </div>
        </div>

        {/* Human Verification */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-semibold">
            <span>Anti-Bot Shield</span>
            <UserCheck className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-neutral-950">
            100%
          </div>
          <div className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Filtro humano activo</span>
          </div>
        </div>
      </div>

      {/* FILTER TABS & SEARCH BAR */}
      <div className="bg-white rounded-2xl p-4 border border-neutral-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Pill Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            type="button"
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              filterStatus === 'all'
                ? 'bg-neutral-950 text-white shadow-2xs'
                : 'bg-neutral-100 text-neutral-600 hover:text-neutral-950 hover:bg-neutral-200'
            }`}
          >
            Todos ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              filterStatus === 'pending'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>Pendientes ({pendingCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('replied')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              filterStatus === 'replied'
                ? 'bg-emerald-700 text-white shadow-2xs'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>Respondidos ({repliedCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('archived')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              filterStatus === 'archived'
                ? 'bg-neutral-800 text-white shadow-2xs'
                : 'bg-neutral-100 text-neutral-600 hover:text-neutral-950 hover:bg-neutral-200'
            }`}
          >
            <Archive className="w-3 h-3" />
            <span>Archivados ({archivedCount})</span>
          </button>
        </div>

        {/* Search input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, email, teléfono..."
            className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-neutral-950 focus:outline-hidden transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 text-xs font-bold"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* MESSAGES LIST */}
      <div className="space-y-4">
        {filteredMessages.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-neutral-200 shadow-2xs space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto">
              <Mail className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-neutral-900">
              No se encontraron mensajes
            </h3>
            <p className="text-xs text-neutral-500 max-w-md mx-auto leading-relaxed">
              {searchQuery
                ? `No hay mensajes que coincidan con "${searchQuery}". Intenta con otros términos.`
                : 'Aún no hay mensajes en esta categoría. Puedes probar enviando un mensaje de prueba desde la página de contacto.'}
            </p>
            {onNavigateToTab && (
              <button
                type="button"
                onClick={() => onNavigateToTab('contacto')}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Ir al Formulario de Contacto</span>
              </button>
            )}
          </div>
        ) : (
          filteredMessages.map(msg => {
            const isPending = msg.status === 'pending';
            const isReplied = msg.status === 'replied';
            const cleanPhone = msg.phone ? msg.phone.replace(/[^0-9]/g, '') : null;

            return (
              <div
                key={msg.id}
                className={`bg-white rounded-2xl border transition-all shadow-2xs overflow-hidden ${
                  isPending
                    ? 'border-rose-300 ring-1 ring-rose-200/60'
                    : 'border-neutral-200/80 hover:border-neutral-300'
                }`}
              >
                {/* Message Header */}
                <div className="p-5 sm:p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-bold text-neutral-950">
                          {msg.name}
                        </span>
                        {/* Status Badge */}
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          isPending
                            ? 'bg-rose-100 text-rose-800'
                            : isReplied
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-neutral-100 text-neutral-700'
                        }`}>
                          {isPending ? 'Pendiente' : isReplied ? 'Respondido' : 'Archivado'}
                        </span>
                        {/* Human verification check */}
                        {msg.human_verified && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <ShieldCheck className="w-3 h-3" />
                            <span>Humano verificado</span>
                          </span>
                        )}
                      </div>

                      {/* Subject Pill */}
                      <div className="text-xs font-bold text-emerald-700">
                        Asunto: {msg.subject}
                      </div>
                    </div>

                    {/* Date and actions */}
                    <div className="flex items-center gap-2 text-xs text-neutral-500 shrink-0">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{formatMessageDate(msg.created_at)}</span>
                    </div>
                  </div>

                  {/* Contact Channels Bar */}
                  <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-neutral-600 bg-neutral-50/80 p-3 rounded-xl border border-neutral-200/60">
                    {/* Email */}
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                      <a
                        href={`mailto:${msg.email}?subject=Re: [AgenFacil] ${encodeURIComponent(msg.subject)}`}
                        className="font-semibold text-neutral-900 hover:text-emerald-700 underline"
                      >
                        {msg.email}
                      </a>
                      <button
                        type="button"
                        onClick={() => handleCopy(msg.email, `email-${msg.id}`)}
                        className="p-1 hover:bg-neutral-200 rounded text-neutral-500 cursor-pointer transition ml-0.5"
                        title="Copiar email"
                      >
                        {copiedId === `email-${msg.id}` ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>

                    {/* Phone / WhatsApp */}
                    {msg.phone && (
                      <div className="flex items-center gap-1.5 pl-2 sm:border-l border-neutral-200">
                        <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="font-semibold text-neutral-900">{msg.phone}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(msg.phone || '', `phone-${msg.id}`)}
                          className="p-1 hover:bg-neutral-200 rounded text-neutral-500 cursor-pointer transition ml-0.5"
                          title="Copiar teléfono"
                        >
                          {copiedId === `phone-${msg.id}` ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Message Content */}
                  <div className="text-xs sm:text-sm text-neutral-800 bg-white p-4 rounded-xl border border-neutral-200/80 whitespace-pre-wrap leading-relaxed">
                    {msg.message}
                  </div>

                  {/* Admin Notes Section */}
                  <div className="space-y-1.5">
                    {editingNoteId === msg.id ? (
                      <div className="space-y-2 bg-amber-50/50 p-3 rounded-xl border border-amber-200">
                        <label className="text-[11px] font-bold text-amber-900 block">
                          Nota interna de seguimiento (solo visible para SuperAdmin):
                        </label>
                        <textarea
                          rows={2}
                          value={tempNote}
                          onChange={e => setTempNote(e.target.value)}
                          placeholder="Ej. Se le envió información sobre el plan PRO y acordamos llamada el viernes..."
                          className="w-full p-2 text-xs bg-white border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleSaveNote(msg.id)}
                            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold cursor-pointer transition"
                          >
                            Guardar Nota
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingNoteId(null)}
                            className="px-2.5 py-1 text-neutral-600 hover:text-neutral-900 text-xs cursor-pointer"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <div className="text-neutral-600 text-[11px] flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-neutral-400" />
                          {msg.notes ? (
                            <span><strong className="text-neutral-900">Nota interna:</strong> {msg.notes}</span>
                          ) : (
                            <span className="text-neutral-400 italic">Sin notas internas</span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingNoteId(msg.id);
                            setTempNote(msg.notes || '');
                          }}
                          className="text-[11px] font-bold text-neutral-700 hover:text-neutral-950 underline cursor-pointer"
                        >
                          {msg.notes ? 'Editar nota' : '+ Agregar nota interna'}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-2 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-3">
                    {/* Fast Reply Buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                      <a
                        href={`mailto:${msg.email}?subject=Re: [AgenFacil] ${encodeURIComponent(msg.subject)}&body=Hola ${encodeURIComponent(msg.name)},%0D%0A%0D%0AGracias por contactarnos en AgenFacil.%0D%0A%0D%0A`}
                        className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>Responder por Email</span>
                      </a>

                      {cleanPhone && (
                        <a
                          href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hola ${msg.name}, te escribimos desde AgenFacil en relación a tu consulta sobre "${msg.subject}".`)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>Escribir por WhatsApp</span>
                        </a>
                      )}
                    </div>

                    {/* Status Toggle & Delete */}
                    <div className="flex items-center gap-2">
                      {isPending ? (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(msg.id, 'replied')}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 transition flex items-center gap-1 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Marcar Respondido</span>
                        </button>
                      ) : isReplied ? (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(msg.id, 'pending')}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold rounded-xl border border-rose-200 transition flex items-center gap-1 cursor-pointer"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>Marcar Pendiente</span>
                        </button>
                      ) : null}

                      {msg.status !== 'archived' ? (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(msg.id, 'archived')}
                          className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition cursor-pointer"
                          title="Archivar mensaje"
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(msg.id, 'pending')}
                          className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition cursor-pointer"
                          title="Restaurar a pendientes"
                        >
                          <Clock className="w-4 h-4" />
                        </button>
                      )}

                      {/* Delete */}
                      {confirmDeleteId === msg.id ? (
                        <div className="flex items-center gap-1 bg-red-50 p-1 rounded-xl border border-red-200">
                          <span className="text-[11px] text-red-700 font-bold px-1">¿Eliminar?</span>
                          <button
                            type="button"
                            onClick={() => handleDelete(msg.id)}
                            className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded cursor-pointer"
                          >
                            Sí
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-1.5 py-0.5 text-neutral-600 hover:text-neutral-900 text-xs cursor-pointer"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(msg.id)}
                          className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
                          title="Eliminar mensaje"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
