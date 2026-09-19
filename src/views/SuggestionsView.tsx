import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Send,
  Sparkles,
  CheckCircle2,
  Lock,
  Clock,
  UserCheck,
  Building,
  ShieldCheck,
  Trash2,
  Filter,
  MessageSquare,
  Volume2,
  AlertCircle,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAgendaStore } from '../lib/store';
import { esSuperAdmin } from '../lib/firestore-sync';
import { SuggestionCategory, SuggestionStatus } from '../types';

export const SuggestionsView: React.FC = () => {
  const {
    suggestions,
    addSuggestion,
    deleteSuggestion,
    updateSuggestionStatus,
    currentUser,
    practiceSettings
  } = useAgendaStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<SuggestionCategory>('improvement');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  // Speech Recognition state
  const [isRecording, setIsRecording] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [speechSupported, setSpeechSupported] = useState(true);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // SuperAdmin state & Inline Delete confirmation
  const [statusFilter, setStatusFilter] = useState<'all' | SuggestionStatus>('all');
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [savingReplyId, setSavingReplyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Admin validation
  const userEmail = currentUser?.email || practiceSettings.email || '';
  const isSuper =
    esSuperAdmin(currentUser?.email, currentUser?.uid) ||
    esSuperAdmin(practiceSettings?.email) ||
    currentUser?.role === 'superadmin' ||
    Boolean(currentUser?.isSuperAdmin);

  // Check speech recognition support on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setSpeechSupported(false);
      }
    }
  }, []);

  // Toggle voice dictation
  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const startRecording = () => {
    setSpeechError(null);
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      setSpeechError('Reconocimiento de voz no soportado en este navegador. Escribe directamente.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'es-AR';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsRecording(true);
        setSpeechError(null);
      };

      recognition.onresult = (event: any) => {
        let finalPhrase = '';
        let interimPhrase = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const text = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalPhrase += text + ' ';
          } else {
            interimPhrase += text;
          }
        }

        setInterimTranscript(interimPhrase);

        if (finalPhrase) {
          setDescription(prev => {
            const cleanPrev = prev ? prev.trim() : '';
            return cleanPrev ? `${cleanPrev} ${finalPhrase.trim()}` : finalPhrase.trim();
          });
          setInterimTranscript('');
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'not-allowed') {
          setSpeechError('Micrófono bloqueado en el navegador.');
          setIsRecording(false);
        } else if (event.error !== 'no-speech') {
          setSpeechError(`Aviso de dictado (${event.error})`);
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
        setInterimTranscript('');
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      setSpeechError('No se pudo activar el micrófono.');
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsRecording(false);
    setInterimTranscript('');
  };

  // Submit suggestion
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRecording) stopRecording();

    const trimmedDesc = description.trim();
    if (!trimmedDesc) return;

    setIsSubmitting(true);
    const finalTitle = title.trim() || (trimmedDesc.slice(0, 50) + (trimmedDesc.length > 50 ? '...' : ''));

    try {
      await addSuggestion({
        title: finalTitle,
        description: trimmedDesc,
        category,
        priority: 'high'
      });

      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      setTitle('');
      setDescription('');
      setInterimTranscript('');
      setSubmittedSuccess(true);
      setTimeout(() => setSubmittedSuccess(false), 5000);
    } catch (err) {
      console.error('Error submitting suggestion:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Handler with inline confirmation (no window.confirm popup needed)
  const handleDeleteSuggestion = async (sugId: string) => {
    setDeletingId(sugId);
    try {
      await deleteSuggestion(sugId);
      setConfirmDeleteId(null);
    } finally {
      setDeletingId(null);
    }
  };

  // Save admin reply
  const handleSaveAdminReply = async (sugId: string, currentStatus: SuggestionStatus) => {
    const replyText = replyDrafts[sugId];
    if (replyText === undefined) return;
    setSavingReplyId(sugId);
    try {
      await updateSuggestionStatus(sugId, currentStatus, replyText.trim());
    } finally {
      setSavingReplyId(null);
    }
  };

  // Filtered suggestions for SuperAdmin
  const filteredSuggestions = suggestions.filter(s => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    return true;
  });

  const categoryBadges: Record<SuggestionCategory, { label: string; color: string }> = {
    improvement: { label: '⚡ Mejora', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    new_feature: { label: '🚀 Nueva Función', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    integration: { label: '🔗 Integración', color: 'bg-purple-50 text-purple-700 border-purple-200' },
    bug: { label: '🐛 Corrección', color: 'bg-rose-50 text-rose-700 border-rose-200' },
    other: { label: '💡 Idea', color: 'bg-amber-50 text-amber-700 border-amber-200' }
  };

  const statusBadges: Record<SuggestionStatus, { label: string; color: string }> = {
    review: { label: 'En Revisión', color: 'bg-amber-100 text-amber-900 border-amber-300' },
    planned: { label: 'Planificada', color: 'bg-sky-100 text-sky-900 border-sky-300' },
    in_progress: { label: 'En Desarrollo', color: 'bg-purple-100 text-purple-900 border-purple-300' },
    completed: { label: 'Implementada', color: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
    declined: { label: 'Pospuesta', color: 'bg-neutral-100 text-neutral-700 border-neutral-300' }
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 space-y-5 pb-20">
      {/* HEADER COMPACT */}
      <div className="bg-white rounded-2xl border border-neutral-200/90 p-5 sm:p-6 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-neutral-900 tracking-tight">
              Sugerencias y Mejoras
            </h1>
            <p className="text-xs text-neutral-500">
              Envía ideas, pedidos de funciones o ajustes por dictado de voz o texto.
            </p>
          </div>
        </div>
      </div>

      {/* FORMULARIO COMPACTO */}
      <div className="bg-white rounded-2xl border border-neutral-200/90 p-5 sm:p-6 shadow-2xs">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Quick Voice Bar */}
          <div className={`p-3.5 rounded-xl border transition flex items-center justify-between gap-3 ${
            isRecording
              ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-100'
              : 'bg-neutral-50/90 border-neutral-200'
          }`}>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleRecording}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition cursor-pointer shadow-xs shrink-0 ${
                  isRecording
                    ? 'bg-rose-600 text-white animate-pulse'
                    : 'bg-neutral-900 text-white hover:bg-neutral-800'
                }`}
                title={isRecording ? 'Detener dictado' : 'Dictar por voz'}
              >
                {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              <div>
                <div className="text-xs font-bold text-neutral-900">
                  {isRecording ? '🎙️ Escuchando tu voz...' : 'Dictado por voz'}
                </div>
                <div className="text-[11px] text-neutral-500">
                  {isRecording ? 'Habla con naturalidad para transcribir' : 'Presiona el micrófono para no escribir a mano'}
                </div>
              </div>
            </div>

            {isRecording && (
              <button
                type="button"
                onClick={stopRecording}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                Listo
              </button>
            )}
          </div>

          {speechError && (
            <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{speechError}</span>
            </div>
          )}

          {isRecording && interimTranscript && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 italic flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Transcribiendo: &ldquo;{interimTranscript}&rdquo;</span>
            </div>
          )}

          {/* Categorías */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700 block">Categoría</label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'improvement', label: '⚡ Mejora' },
                { id: 'new_feature', label: '🚀 Nueva Función' },
                { id: 'integration', label: '🔗 Integración' },
                { id: 'bug', label: '🐛 Corrección' },
                { id: 'other', label: '💡 Idea' }
              ].map(cat => (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => setCategory(cat.id as SuggestionCategory)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    category === cat.id
                      ? 'bg-neutral-900 text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Título opcional */}
          <div>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Título breve (opcional)"
              className="w-full px-3.5 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-neutral-900 focus:outline-hidden"
            />
          </div>

          {/* Texto de sugerencia */}
          <div>
            <textarea
              required
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe lo que te gustaría agregar o cambiar en AgenFacil..."
              className="w-full px-3.5 py-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-neutral-900 focus:outline-hidden resize-none leading-relaxed"
            />
          </div>

          {submittedSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span><strong>¡Sugerencia recibida!</strong> Ha sido enviada de forma privada al Super Administrador.</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-1">
            <span className="text-[11px] text-neutral-400 truncate">
              {userEmail}
            </span>

            <button
              type="submit"
              disabled={isSubmitting || !description.trim()}
              className="px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs rounded-xl transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? <span>Enviando...</span> : (
                <>
                  <span>Enviar Sugerencia</span>
                  <Send className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* REGULAR USER PRIVACY NOTE */}
      {!isSuper && (
        <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200/80 flex items-center gap-2.5 text-xs text-neutral-600">
          <Lock className="w-4 h-4 text-neutral-400 shrink-0" />
          <span>Tus sugerencias son privadas y recibidas directamente por la administración para mejorar AgenFacil.</span>
        </div>
      )}

      {/* SUPERADMIN MODERATION INBOX (ONLY VISIBLE FOR SUPERADMIN) */}
      {isSuper && (
        <div className="space-y-3 pt-2">
          {/* Header Bar */}
          <div className="bg-neutral-900 text-white rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <h2 className="text-sm font-bold flex items-center gap-2">
                  <span>Bandeja SuperAdmin</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30">
                    {suggestions.length} sugerencias
                  </span>
                </h2>
                <p className="text-[11px] text-neutral-400">
                  Moderación exclusiva de sugerencias de todos los usuarios
                </p>
              </div>
            </div>

            {/* Filter pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'all', label: `Todos (${suggestions.length})` },
                { id: 'review', label: `Revisión (${suggestions.filter(s => s.status === 'review').length})` },
                { id: 'planned', label: `Planificadas (${suggestions.filter(s => s.status === 'planned').length})` },
                { id: 'in_progress', label: `Desarrollo (${suggestions.filter(s => s.status === 'in_progress').length})` },
                { id: 'completed', label: `Hechas (${suggestions.filter(s => s.status === 'completed').length})` }
              ].map(f => (
                <button
                  type="button"
                  key={f.id}
                  onClick={() => setStatusFilter(f.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    statusFilter === f.id
                      ? 'bg-amber-400 text-neutral-950'
                      : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cards List */}
          {filteredSuggestions.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-neutral-200 text-xs text-neutral-500">
              <MessageSquare className="w-6 h-6 text-neutral-300 mx-auto mb-1.5" />
              <p className="font-semibold text-neutral-700">No hay sugerencias en esta categoría</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredSuggestions.map(sug => {
                const badge = statusBadges[sug.status] || statusBadges.review;
                const catBadge = categoryBadges[sug.category] || categoryBadges.other;
                const currentDraft = replyDrafts[sug.id] !== undefined ? replyDrafts[sug.id] : (sug.admin_reply || '');
                const isConfirming = confirmDeleteId === sug.id;
                const isDeleting = deletingId === sug.id;

                return (
                  <div
                    key={sug.id}
                    className="bg-white rounded-2xl p-4 border border-neutral-200 shadow-2xs space-y-3"
                  >
                    {/* Top row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${catBadge.color}`}>
                            {catBadge.label}
                          </span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${badge.color}`}>
                            {badge.label}
                          </span>
                          <span className="text-xs font-bold text-neutral-900">{sug.title}</span>
                        </div>

                        <div className="text-[11px] text-neutral-500 flex flex-wrap items-center gap-1.5">
                          <span className="font-medium text-neutral-700">{sug.user_name || 'Usuario'}</span>
                          <span>•</span>
                          <span>{sug.user_email || 'Sin email'}</span>
                          {sug.practice_name && (
                            <>
                              <span>•</span>
                              <span>{sug.practice_name}</span>
                            </>
                          )}
                          <span>•</span>
                          <span className="text-neutral-400">
                            {new Date(sug.created_at).toLocaleDateString('es-AR', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Controls: status switcher and inline delete confirmation */}
                      <div className="flex items-center gap-1.5 self-start sm:self-center shrink-0">
                        <select
                          value={sug.status}
                          onChange={e => updateSuggestionStatus(sug.id, e.target.value as any, sug.admin_reply)}
                          className="text-xs bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1 font-medium text-neutral-800 cursor-pointer"
                        >
                          <option value="review">🟡 En Revisión</option>
                          <option value="planned">🔵 Planificada</option>
                          <option value="in_progress">🟣 En Desarrollo</option>
                          <option value="completed">🟢 Implementada</option>
                          <option value="declined">⚪ Pospuesta</option>
                        </select>

                        {isConfirming ? (
                          <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 rounded-lg p-0.5">
                            <button
                              type="button"
                              disabled={isDeleting}
                              onClick={() => handleDeleteSuggestion(sug.id)}
                              className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[11px] font-bold cursor-pointer transition disabled:opacity-50"
                            >
                              {isDeleting ? 'Borrando...' : 'Confirmar'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="p-1 text-neutral-500 hover:text-neutral-800 rounded cursor-pointer"
                              title="Cancelar"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(sug.id)}
                            className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="Eliminar sugerencia"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Text */}
                    <p className="text-xs text-neutral-700 whitespace-pre-wrap leading-relaxed bg-neutral-50 p-2.5 rounded-xl">
                      {sug.description}
                    </p>

                    {/* Admin reply input */}
                    <div className="flex items-center gap-2 pt-0.5">
                      <input
                        type="text"
                        value={currentDraft}
                        onChange={e => setReplyDrafts(prev => ({ ...prev, [sug.id]: e.target.value }))}
                        placeholder="Nota o respuesta administrativa..."
                        className="flex-1 px-3 py-1.5 text-xs bg-white border border-neutral-200 rounded-lg focus:ring-1 focus:ring-neutral-900 focus:outline-hidden"
                      />
                      <button
                        type="button"
                        disabled={savingReplyId === sug.id || currentDraft === (sug.admin_reply || '')}
                        onClick={() => handleSaveAdminReply(sug.id, sug.status)}
                        className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-bold transition disabled:opacity-30 cursor-pointer shrink-0"
                      >
                        {savingReplyId === sug.id ? '...' : 'Guardar'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
