import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Send,
  Sparkles,
  CheckCircle2,
  Lightbulb,
  Clock,
  Calendar,
  CreditCard,
  Bot,
  UserCheck,
  Zap,
  Volume2,
  RefreshCw,
  Copy,
  Check,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Building,
  ShieldCheck,
  Trash2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAgendaStore } from '../lib/store';
import { AppSuggestion, SuggestionCategory, SuggestionPriority } from '../types';

// Reference guide data to inspire users on what to suggest
const SUGGESTION_REFERENCES = [
  {
    category: 'Agenda y Gestión de Turnos',
    icon: Calendar,
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    examples: [
      'Configurar sobreturnos de emergencia con cupos limitados',
      'Definir descansos o almuerzos automáticos no reservables',
      'Permitir turnos dobles para tratamientos largos o cirugías',
      'Recordatorios con 2 horas de anticipación además de las 24 horas'
    ]
  },
  {
    category: 'WhatsApp y Asistente Bot IA',
    icon: Bot,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    examples: [
      'Respuestas personalizadas para pacientes con indicaciones previas al turno',
      'Ajustar el tono del bot (más formal, clínico o cercano)',
      'Escuchar y responder notas de voz de los pacientes automáticamente',
      'Preguntas frecuentes automáticas sobre obras sociales y coberturas'
    ]
  },
  {
    category: 'Pagos, Señas y Cobros',
    icon: CreditCard,
    color: 'text-amber-600 bg-amber-50 border-amber-200',
    examples: [
      'Exigir pago del 50% de seña para confirmar el turno en DLocal Go / Mercado Pago',
      'Exportar reporte mensual de cobros para el contador en formato Excel',
      'Reembolsos automáticos si el turno se cancela con 48hs de anticipación',
      'Precios diferenciados según el medio de pago (efectivo vs tarjeta)'
    ]
  },
  {
    category: 'Ficha Clínica y Pacientes',
    icon: UserCheck,
    color: 'text-purple-600 bg-purple-50 border-purple-200',
    examples: [
      'Campos clínicos personalizados para mi especialidad (anamnesis, odontograma, etc.)',
      'Galería de fotos antes / después comparativas en cada consulta',
      'Generación rápida de recetas o constancias con membrete en PDF',
      'Alertas de antecedentes médicos críticos o alergias visibles'
    ]
  },
  {
    category: 'Automatizaciones e Integraciones',
    icon: Zap,
    color: 'text-rose-600 bg-rose-50 border-rose-200',
    examples: [
      'Sincronización bidireccional inmediata con Google Calendar',
      'Notificaciones de huecos libres a los pacientes en lista de espera',
      'Envío automático de encuesta de satisfacción luego de la atención',
      'Múltiples profesionales con agendas y horarios independientes'
    ]
  }
];

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
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Speech Recognition state
  const [isRecording, setIsRecording] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [speechSupported, setSpeechSupported] = useState(true);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Reference guide toggle
  const [showGuide, setShowGuide] = useState(true);

  // Admin states
  const userEmail = currentUser?.email || practiceSettings.email || '';
  const isSuperAdmin =
    userEmail.toLowerCase() === 'gonzalocorat@gmail.com' ||
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
      setSpeechError('Tu navegador no soporta el reconocimiento de voz directo. Puedes escribir tu sugerencia en el cuadro de texto.');
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
        console.warn('Speech recognition warning:', event.error);
        if (event.error === 'not-allowed') {
          setSpeechError('Permiso de micrófono bloqueado. Por favor habilita el micrófono en el navegador para dictar por voz.');
          setIsRecording(false);
        } else if (event.error !== 'no-speech') {
          setSpeechError(`Aviso de dictado (${event.error}). Puedes continuar dictando o escribir normalmente.`);
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
        setInterimTranscript('');
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn('Error starting speech recognition:', err);
      setSpeechError('No se pudo inicializar el micrófono. Por favor intenta de nuevo.');
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    setIsRecording(false);
    setInterimTranscript('');
  };

  // Submit suggestion
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRecording) {
      stopRecording();
    }

    const trimmedDesc = description.trim();
    if (!trimmedDesc) return;

    setIsSubmitting(true);

    const finalTitle = title.trim() || (trimmedDesc.slice(0, 60) + (trimmedDesc.length > 60 ? '...' : ''));

    try {
      await addSuggestion({
        title: finalTitle,
        description: trimmedDesc,
        category,
        priority: 'high'
      });

      confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
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

  const handleUseExample = (exampleText: string, exampleCategory: SuggestionCategory) => {
    setDescription(prev => {
      const cleanPrev = prev ? prev.trim() : '';
      return cleanPrev ? `${cleanPrev}\n• ${exampleText}` : `Me gustaría poder ${exampleText.toLowerCase()}`;
    });
    setCategory(exampleCategory);
    if (!title) {
      setTitle(exampleText);
    }
  };

  // Filter only user's suggestions (or all if superadmin)
  const relevantSuggestions = suggestions.filter(s => {
    if (isSuperAdmin) return true;
    if (userEmail && s.user_email?.toLowerCase() === userEmail.toLowerCase()) return true;
    if (currentUser?.uid && s.user_id === currentUser.uid) return true;
    return false;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-6 pb-20">
      {/* HEADER */}
      <div className="bg-white rounded-3xl border border-neutral-200/80 p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Buzón de Voz & Mejoras para AgenFacil</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900">
              Sugerencias de Mejoras y Cambios
            </h1>
            <p className="text-neutral-600 text-xs sm:text-sm leading-relaxed">
              Dicta por voz o escribe directamente los cambios, funciones o detalles que te gustaría que sumemos a AgenFacil.
              El sistema transcribe tus palabras automáticamente en tiempo real para que no tengas que redactar todo a mano.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowGuide(!showGuide)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
              <span>{showGuide ? 'Ocultar Ideas' : 'Ver Ideas de Referencia'}</span>
              {showGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* REFERENCE GUIDE SECTION (Collapsible) */}
      {showGuide && (
        <div className="bg-neutral-50/80 rounded-3xl border border-neutral-200/80 p-5 sm:p-6 space-y-4 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                <Lightbulb className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-neutral-900">
                  ¿Qué cosas puedes pedir o sugerir? (Guía de referencia)
                </h3>
                <p className="text-[11px] text-neutral-500">
                  Haz clic en cualquiera de estos ejemplos para agregarlo automáticamente a tu mensaje:
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {SUGGESTION_REFERENCES.map((item, idx) => {
              const Icon = item.icon;
              const catMap: Record<number, SuggestionCategory> = {
                0: 'improvement',
                1: 'new_feature',
                2: 'integration',
                3: 'improvement',
                4: 'integration'
              };
              return (
                <div
                  key={idx}
                  className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-2xs space-y-2.5"
                >
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg border ${item.color}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold text-neutral-900">{item.category}</span>
                  </div>

                  <ul className="space-y-1.5 text-[11px] text-neutral-600">
                    {item.examples.map((ex, exIdx) => (
                      <li key={exIdx} className="leading-tight flex items-start gap-1.5">
                        <span className="text-neutral-400 select-none">•</span>
                        <button
                          type="button"
                          onClick={() => handleUseExample(ex, catMap[idx] || 'improvement')}
                          className="text-left hover:text-emerald-700 hover:underline cursor-pointer"
                          title="Usar este ejemplo"
                        >
                          {ex}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CENTRAL VOICE DICTATION & WRITING STUDIO */}
      <div className="bg-white rounded-3xl border border-neutral-200 p-6 sm:p-8 shadow-xs space-y-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* VOICE RECORDER BIG CONTROL */}
          <div className={`p-6 rounded-2xl border-2 transition-all flex flex-col sm:flex-row items-center justify-between gap-5 ${
            isRecording
              ? 'bg-rose-50/70 border-rose-400 ring-4 ring-rose-100'
              : 'bg-neutral-50/70 border-neutral-200/90'
          }`}>
            <div className="flex items-center gap-4 text-center sm:text-left">
              {/* Record Button */}
              <button
                type="button"
                onClick={toggleRecording}
                className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all cursor-pointer shadow-md shrink-0 active:scale-95 ${
                  isRecording
                    ? 'bg-rose-600 text-white animate-pulse shadow-rose-300'
                    : 'bg-neutral-950 text-white hover:bg-neutral-800'
                }`}
                title={isRecording ? 'Detener dictado por voz' : 'Iniciar dictado por voz'}
              >
                {isRecording ? (
                  <MicOff className="w-7 h-7 animate-bounce" />
                ) : (
                  <Mic className="w-7 h-7" />
                )}
              </button>

              <div className="space-y-1">
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <span className="text-sm sm:text-base font-extrabold text-neutral-950">
                    {isRecording ? 'Escuchando tu voz...' : 'Dictar Sugerencia por Voz'}
                  </span>
                  {isRecording && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-200 text-rose-800 animate-pulse">
                      ● GRABANDO
                    </span>
                  )}
                </div>
                <p className="text-xs text-neutral-500 max-w-md">
                  {isRecording
                    ? 'Habla con naturalidad. Tus palabras se transcribirán automáticamente en el recuadro inferior.'
                    : 'Presiona el micrófono para hablar y transcribir automáticamente sin escribir.'}
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 shrink-0">
              {isRecording ? (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer transition shadow-2xs"
                >
                  Listo / Detener
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startRecording}
                  className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold cursor-pointer transition shadow-2xs flex items-center gap-1.5"
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>Empezar a Dictar</span>
                </button>
              )}
            </div>
          </div>

          {/* Speech Error banner if any */}
          {speechError && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{speechError}</span>
            </div>
          )}

          {/* Real-time Interim Transcript Preview */}
          {isRecording && interimTranscript && (
            <div className="p-3 bg-rose-50/80 border border-rose-200 rounded-xl text-xs text-rose-900 italic flex items-center gap-2 animate-fade-in">
              <Volume2 className="w-4 h-4 text-rose-600 animate-pulse shrink-0" />
              <span>Transcribiendo: &ldquo;{interimTranscript}&rdquo;</span>
            </div>
          )}

          {/* Category Chips */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-800 block">
              Área o categoría del cambio
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: 'improvement', label: '⚡ Mejora de Función Existente' },
                { id: 'new_feature', label: '🚀 Nueva Función' },
                { id: 'integration', label: '🔗 Integración (Pasarela / WhatsApp / Google)' },
                { id: 'bug', label: '🐛 Detalle o Inconveniente a Corregir' },
                { id: 'other', label: '💡 Otra Idea' }
              ].map(cat => (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => setCategory(cat.id as SuggestionCategory)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    category === cat.id
                      ? 'bg-neutral-900 text-white shadow-xs'
                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title (Optional / Quick) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-800 block">
              Título o resumen breve <span className="text-neutral-400 font-normal">(opcional)</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ej: Cobrar seña del 50% antes de dar el turno"
              className="w-full px-3.5 py-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-neutral-950 focus:outline-hidden transition"
            />
          </div>

          {/* Main Description / Transcribed text area */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-neutral-800 block">
                Detalle de la sugerencia o transcripción del dictado <span className="text-rose-500">*</span>
              </label>
              {description && (
                <button
                  type="button"
                  onClick={() => setDescription('')}
                  className="text-[11px] text-neutral-400 hover:text-rose-600 transition cursor-pointer"
                >
                  Limpiar texto
                </button>
              )}
            </div>
            <textarea
              required
              rows={5}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Explica qué te gustaría mejorar, cómo te facilitaría el día a día o qué cambio quisieras ver. Puedes escribir aquí o usar el botón de dictado por voz de arriba..."
              className="w-full px-4 py-3 text-xs sm:text-sm bg-neutral-50 border border-neutral-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-neutral-950 focus:outline-hidden transition resize-none leading-relaxed"
            />
          </div>

          {/* Success Banner */}
          {submittedSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-900 text-xs sm:text-sm flex items-center gap-2 animate-fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>
                <strong>¡Sugerencia recibida con éxito!</strong> Nuestro equipo la revisará y podrás seguir su avance en la lista inferior.
              </span>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="text-[11px] text-neutral-500">
              Enviado por: <strong className="text-neutral-800">{userEmail || 'Tu Cuenta'}</strong>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !description.trim()}
              className="w-full sm:w-auto px-6 py-3 bg-neutral-950 hover:bg-neutral-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Guardando sugerencia...</span>
              ) : (
                <>
                  <span>Enviar Sugerencia</span>
                  <Send className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* RECENT SUBMISSIONS HISTORY */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-neutral-900">
            {isSuperAdmin ? 'Todas las Sugerencias Recibidas' : 'Mis Sugerencias Enviadas'} ({relevantSuggestions.length})
          </h2>
          <span className="text-xs text-neutral-500">
            {isSuperAdmin ? 'Panel de Moderación SuperAdmin' : 'Seguimiento en tiempo real'}
          </span>
        </div>

        {relevantSuggestions.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-neutral-200 text-xs text-neutral-500 space-y-2">
            <Lightbulb className="w-6 h-6 text-neutral-400 mx-auto" />
            <p className="font-semibold text-neutral-700">Aún no has enviado sugerencias</p>
            <p>Usa el micrófono arriba para dictar tu primera idea o mejora para el sistema.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {relevantSuggestions.map(sug => {
              const statusBadge = {
                review: { label: 'En Revisión', color: 'bg-amber-100 text-amber-800' },
                planned: { label: 'Planificada', color: 'bg-sky-100 text-sky-800' },
                in_progress: { label: 'En Desarrollo', color: 'bg-purple-100 text-purple-800' },
                completed: { label: 'Implementada 🎉', color: 'bg-emerald-100 text-emerald-800' },
                declined: { label: 'Pospuesta', color: 'bg-neutral-100 text-neutral-700' }
              }[sug.status] || { label: 'En Revisión', color: 'bg-amber-100 text-amber-800' };

              return (
                <div
                  key={sug.id}
                  className="bg-white rounded-2xl p-5 border border-neutral-200 shadow-2xs space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-neutral-950">
                          {sug.title}
                        </h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${statusBadge.color}`}>
                          {statusBadge.label}
                        </span>
                      </div>
                      <div className="text-[11px] text-neutral-500 flex items-center gap-2">
                        <span>{sug.user_name || sug.user_email || 'Profesional'}</span>
                        <span>•</span>
                        <span>
                          {new Date(sug.created_at).toLocaleDateString('es-AR', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>

                    {isSuperAdmin && (
                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          value={sug.status}
                          onChange={e => updateSuggestionStatus(sug.id, e.target.value as any, sug.admin_reply)}
                          className="text-xs bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1"
                        >
                          <option value="review">En Revisión</option>
                          <option value="planned">Planificada</option>
                          <option value="in_progress">En Desarrollo</option>
                          <option value="completed">Implementada 🎉</option>
                          <option value="declined">Pospuesta</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm('¿Eliminar esta sugerencia?')) {
                              deleteSuggestion(sug.id);
                            }
                          }}
                          className="p-1 text-neutral-400 hover:text-red-600 rounded transition"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="text-xs sm:text-sm text-neutral-700 whitespace-pre-wrap leading-relaxed">
                    {sug.description}
                  </p>

                  {sug.admin_reply && (
                    <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-neutral-900">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Respuesta del Equipo AgenFacil:</span>
                      </div>
                      <p className="text-neutral-700 leading-relaxed">{sug.admin_reply}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
