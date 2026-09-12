import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Sparkles,
  Bot,
  Send,
  X,
  Minus,
  Maximize2,
  Minimize2,
  Trash2,
  Calendar,
  DollarSign,
  AlertTriangle,
  HelpCircle,
  ArrowRight,
  Plus,
  Loader2,
  MessageSquare,
  CheckCircle2,
  Mic,
  MicOff,
  Square,
  Radio,
  Volume2,
  AlertCircle,
  Play
} from 'lucide-react';
import { useAgendaStore } from '../lib/store';

interface DoctorCopilotProps {
  onSelectTab: (tab: string) => void;
  onOpenNewAppointment?: (date?: string, time?: string, patientId?: string) => void;
}

interface ChatMsg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  action?: {
    label: string;
    tab?: string;
    actionType?: string;
    patientName?: string;
    date?: string;
  };
}

export const DoctorCopilot: React.FC<DoctorCopilotProps> = ({
  onSelectTab,
  onOpenNewAppointment
}) => {
  const {
    currentUser,
    practiceSettings,
    appointments,
    patients,
    services,
    payments,
    isExampleItem
  } = useAgendaStore();

  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnreadIndicator, setHasUnreadIndicator] = useState(false);

  // Voice transcription states
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceRecordingTime, setVoiceRecordingTime] = useState(0);
  const [voiceInterimTranscript, setVoiceInterimTranscript] = useState('');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [isTranscribingAudio, setIsTranscribingAudio] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const voiceTimerRef = useRef<any>(null);

  // Storage key strictly isolated by user UID / Email
  const userStorageKey = useMemo(() => {
    if (!currentUser) return null;
    const identifier = currentUser.uid || currentUser.email?.replace(/[^a-zA-Z0-9]/g, '_') || 'default';
    return `agenfacil_copilot_chat_${identifier}`;
  }, [currentUser]);

  // Initial welcome message factory
  const defaultWelcomeMessage: ChatMsg = useMemo(() => ({
    id: 'welcome-msg',
    role: 'assistant',
    content: `👋 ¡Hola ${currentUser?.name || 'Doctor/a'}! Soy tu **Copiloto Inteligente de Agenfacil**.\n\nEstoy conectado en tiempo real a los datos de tu consultorio (**${practiceSettings.practice_name || 'Mi Consultorio'}**).\n\nPuedes preguntarme por texto o **dictar por voz 🎙️** sobre tus **turnos de hoy**, **cuánto llevas facturado**, **pagos pendientes**, o **dudas sobre el uso de la app**.`,
    timestamp: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  }), [currentUser?.name, practiceSettings.practice_name]);

  // Messages state with per-user isolation
  const [messages, setMessages] = useState<ChatMsg[]>(() => {
    if (!userStorageKey) return [defaultWelcomeMessage];
    try {
      const saved = localStorage.getItem(userStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}
    return [defaultWelcomeMessage];
  });

  // Reload chat if user changes (e.g. log in with different account)
  useEffect(() => {
    if (!userStorageKey) return;
    try {
      const saved = localStorage.getItem(userStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          return;
        }
      }
    } catch {}
    setMessages([defaultWelcomeMessage]);
  }, [userStorageKey, defaultWelcomeMessage]);

  // Persist messages to user-isolated localStorage
  useEffect(() => {
    if (!userStorageKey) return;
    try {
      localStorage.setItem(userStorageKey, JSON.stringify(messages.slice(-30)));
    } catch {}
  }, [messages, userStorageKey]);

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setHasUnreadIndicator(false);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages]);

  // Cleanup voice recording on unmount or window close
  useEffect(() => {
    return () => {
      stopVoiceRecording(false);
    };
  }, []);

  // Filtered real data (strictly non-example data)
  const realAppointments = useMemo(() => {
    return appointments.filter(a => !isExampleItem(a));
  }, [appointments, isExampleItem]);

  const realPatients = useMemo(() => {
    return patients.filter(p => !isExampleItem(p));
  }, [patients, isExampleItem]);

  const realPayments = useMemo(() => {
    return payments.filter(p => p.status === 'completed' && !isExampleItem(p));
  }, [payments, isExampleItem]);

  // Calculations for prompt context
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const startOfMonthStr = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const todayAppointments = useMemo(() => {
    return realAppointments
      .filter(a => a.start_datetime.startsWith(todayStr) && a.status !== 'cancelled')
      .sort((a, b) => a.start_datetime.localeCompare(b.start_datetime))
      .map(a => ({
        id: a.id,
        patient_name: a.patient_name,
        service_name: a.service_name,
        time: a.start_datetime.split('T')[1]?.slice(0, 5) || 'Sin hora',
        status: a.status,
        payment_status: a.payment_status,
        deposit_amount: a.deposit_amount || 0
      }));
  }, [realAppointments, todayStr]);

  const upcomingAppointments = useMemo(() => {
    return realAppointments
      .filter(a => a.start_datetime > todayStr && a.status !== 'cancelled')
      .slice(0, 10)
      .map(a => ({
        id: a.id,
        patient_name: a.patient_name,
        service_name: a.service_name,
        date: a.start_datetime.split('T')[0],
        time: a.start_datetime.split('T')[1]?.slice(0, 5),
        status: a.status
      }));
  }, [realAppointments, todayStr]);

  const todayRevenue = useMemo(() => {
    return realPayments
      .filter(p => p.date.startsWith(todayStr))
      .reduce((sum, p) => sum + p.amount, 0);
  }, [realPayments, todayStr]);

  const monthRevenue = useMemo(() => {
    return realPayments
      .filter(p => p.date >= startOfMonthStr)
      .reduce((sum, p) => sum + p.amount, 0);
  }, [realPayments, startOfMonthStr]);

  const pendingAppointments = useMemo(() => {
    return realAppointments.filter(a => a.payment_status === 'pending' && a.status !== 'cancelled');
  }, [realAppointments]);

  const pendingAmount = useMemo(() => {
    return pendingAppointments.reduce((sum, a) => sum + (a.service_price || 0), 0);
  }, [pendingAppointments]);

  const pendingPatientsList = useMemo(() => {
    return pendingAppointments.slice(0, 15).map(a => ({
      patient_name: a.patient_name,
      service_name: a.service_name,
      date: a.start_datetime.split('T')[0],
      amount: a.service_price || 0,
      deposit_declared: a.deposit_declared
    }));
  }, [pendingAppointments]);

  // Voice Dictation Logic
  const formatVoiceTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startVoiceRecording = async () => {
    setVoiceError(null);
    setVoiceInterimTranscript('');
    setVoiceRecordingTime(0);

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    // 1. Try Browser SpeechRecognition for instant real-time streaming
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = 'es-AR';
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onstart = () => {
          setIsRecordingVoice(true);
          setVoiceError(null);
          voiceTimerRef.current = setInterval(() => {
            setVoiceRecordingTime(prev => prev + 1);
          }, 1000);
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

          setVoiceInterimTranscript(interimPhrase);

          if (finalPhrase) {
            setInputMessage(prev => {
              const cleanPrev = prev ? prev.trim() : '';
              return cleanPrev ? `${cleanPrev} ${finalPhrase.trim()}` : finalPhrase.trim();
            });
            setVoiceInterimTranscript('');
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('SpeechRecognition warning:', event.error);
          if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            setVoiceError('Permiso de micrófono bloqueado. Por favor habilítalo en tu navegador.');
            stopVoiceRecording(false);
          } else if (event.error !== 'no-speech') {
            setVoiceError(`Aviso de micrófono (${event.error}).`);
          }
        };

        recognition.onend = () => {
          setIsRecordingVoice(false);
          if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
        };

        recognitionRef.current = recognition;
        recognition.start();
        return;
      } catch (err: any) {
        console.warn('SpeechRecognition start failed, trying MediaRecorder fallback:', err);
      }
    }

    // 2. Fallback: MediaRecorder + Gemini Backend Transcription
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('El navegador no soporta grabación de audio.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        await handleTranscribeAudioBlob(audioBlob, mimeType);
      };

      mediaRecorder.start(250);
      setIsRecordingVoice(true);
      voiceTimerRef.current = setInterval(() => {
        setVoiceRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.warn('Microphone access error:', err);
      setVoiceError(err.message?.includes('not-allowed') || err.name === 'NotAllowedError'
        ? 'El acceso al micrófono no fue concedido. Habilita los permisos del navegador o prueba una consulta de muestra.'
        : 'No se pudo acceder al micrófono del dispositivo.');
      setIsRecordingVoice(false);
    }
  };

  const stopVoiceRecording = (autoSendAfterStop = false) => {
    if (voiceTimerRef.current) {
      clearInterval(voiceTimerRef.current);
      voiceTimerRef.current = null;
    }

    // Stop SpeechRecognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }

    // Stop MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }

    setIsRecordingVoice(false);
    setVoiceInterimTranscript('');

    if (autoSendAfterStop) {
      setTimeout(() => {
        if (inputRef.current?.value || inputMessage.trim()) {
          handleSendMessage(inputRef.current?.value || inputMessage);
        }
      }, 300);
    }
  };

  const cancelVoiceRecording = () => {
    if (voiceTimerRef.current) {
      clearInterval(voiceTimerRef.current);
      voiceTimerRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }

    setIsRecordingVoice(false);
    setVoiceInterimTranscript('');
    setVoiceError(null);
  };

  const handleTranscribeAudioBlob = async (blob: Blob, mimeType: string) => {
    if (blob.size === 0) return;
    setIsTranscribingAudio(true);
    setVoiceError(null);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64Data = reader.result as string;
        const response = await fetch('/api/copilot/transcribe-voice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioBase64: base64Data,
            mimeType
          })
        });

        if (!response.ok) {
          throw new Error('Error al transcribir el audio');
        }

        const data = await response.json();
        const transcription = data.transcription?.trim();
        if (transcription) {
          setInputMessage(prev => {
            const cleanPrev = prev ? prev.trim() : '';
            return cleanPrev ? `${cleanPrev} ${transcription}` : transcription;
          });
        }
        setIsTranscribingAudio(false);
      };
    } catch (err: any) {
      console.error('Error transcribing audio:', err);
      setVoiceError('No se pudo transcribir el audio: ' + (err.message || 'Error'));
      setIsTranscribingAudio(false);
    }
  };

  // If user is not authenticated, DO NOT show copilot
  if (!currentUser) {
    return null;
  }

  const handleSendMessage = async (customText?: string) => {
    if (isRecordingVoice) {
      stopVoiceRecording(false);
    }

    const textToSend = (customText || inputMessage).trim();
    if (!textToSend || isLoading) return;

    const userMsg: ChatMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setVoiceInterimTranscript('');
    setIsLoading(true);

    try {
      const todayDateFormatted = now.toLocaleDateString('es-AR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const response = await fetch('/api/copilot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          history: messages.slice(-8).map(m => ({ role: m.role, content: m.content })),
          context: {
            doctorName: currentUser.name || practiceSettings.professional_name || 'Profesional',
            doctorEmail: currentUser.email,
            practiceName: practiceSettings.practice_name || 'Consultorio',
            specialty: practiceSettings.specialty || 'Medicina General',
            todayDateStr: todayDateFormatted,
            todayAppointments,
            upcomingAppointments,
            financials: {
              today_revenue: todayRevenue,
              month_revenue: monthRevenue,
              pending_amount: pendingAmount,
              pending_appointments_count: pendingAppointments.length,
              pending_patients: pendingPatientsList
            },
            services: services.filter(s => s.active).map(s => ({
              name: s.name,
              price: s.price,
              duration_minutes: s.duration_minutes
            })),
            patientsCount: realPatients.length,
            settingsSummary: {
              patient_deposit_enabled: practiceSettings.patient_deposit_enabled,
              patient_deposit_type: practiceSettings.patient_deposit_type,
              patient_deposit_percent: practiceSettings.patient_deposit_percent,
              patient_deposit_fixed_amount: practiceSettings.patient_deposit_fixed_amount,
              patient_deposit_method: practiceSettings.patient_deposit_method,
              patient_deposit_alias: practiceSettings.patient_deposit_alias,
              bot_assistant_name: practiceSettings.bot_assistant_name,
              handle: practiceSettings.handle
            }
          }
        })
      });

      if (!response.ok) {
        throw new Error('Error al consultar el servidor');
      }

      const data = await response.json();

      const assistantMsg: ChatMsg = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.reply || 'No pude obtener una respuesta en este momento.',
        timestamp: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
        action: data.action
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error('Error contacting copilot:', err);
      const errorMsg: ChatMsg = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: 'Ocurrió un error momentáneo al consultar al copiloto. Por favor intenta nuevamente.',
        timestamp: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    if (confirm('¿Deseas reiniciar la conversación con el copiloto?')) {
      setMessages([defaultWelcomeMessage]);
      if (userStorageKey) {
        localStorage.removeItem(userStorageKey);
      }
    }
  };

  const handleExecuteAction = (action: NonNullable<ChatMsg['action']>) => {
    if (action.actionType === 'new_appointment') {
      if (onOpenNewAppointment) {
        onOpenNewAppointment(action.date, undefined, undefined);
      }
    } else if (action.tab) {
      onSelectTab(action.tab);
    }
  };

  // Quick suggestion prompts
  const quickSuggestions = [
    { label: '📊 Facturación del mes', prompt: '¿Cuánto llevo facturado este mes y cuánto recaudé hoy?' },
    { label: '📅 Turnos de hoy', prompt: '¿Qué turnos tengo agendados para hoy y quién viene primero?' },
    { label: '⚠️ Pagos pendientes', prompt: '¿Quiénes tienen pagos pendientes y a cuánto asciende la deuda?' },
    { label: '💡 Sugerir mejora', prompt: 'Quiero sugerir una mejora o nueva función para la app Agenfacil' },
    { label: '➕ Agendar nuevo turno', prompt: 'Quiero agendar un nuevo turno para un paciente' },
    { label: '💳 Cobro de señas', prompt: '¿Cómo configuro el cobro obligatorio de señas por Mercado Pago o CBU?' }
  ];

  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <div className="fixed bottom-4 right-4 z-40 sm:bottom-6 sm:right-6">
          <button
            type="button"
            id="btn-open-doctor-copilot"
            onClick={() => setIsOpen(true)}
            className="group relative flex items-center gap-2.5 bg-neutral-900 hover:bg-neutral-800 text-white p-2.5 sm:pl-4 sm:pr-4 sm:py-3 rounded-full shadow-lg hover:shadow-xl active:scale-95 transition-all duration-200 border border-neutral-700/60 cursor-pointer"
            title="Abrir Copiloto IA de Agenfacil"
          >
            <div className="relative flex items-center justify-center">
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-white shadow-xs">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-purple-500"></span>
              </span>
            </div>
            <div className="text-left hidden sm:block">
              <span className="text-xs font-semibold block leading-tight tracking-tight">Copiloto IA</span>
              <span className="text-[10px] text-neutral-300 font-medium block leading-tight">Tu asistente • Voz 🎙️</span>
            </div>
          </button>
        </div>
      )}

      {/* Floating Chat Modal / Card */}
      {isOpen && (
        <div
          id="doctor-copilot-window"
          className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col bg-white rounded-2xl shadow-2xl border border-neutral-200/90 transition-all duration-300 overflow-hidden ${
            isExpanded
              ? 'w-[calc(100vw-32px)] sm:w-[480px] h-[calc(100vh-64px)] max-h-[680px]'
              : 'w-[calc(100vw-32px)] sm:w-[420px] h-[570px] max-h-[85vh]'
          }`}
        >
          {/* Header */}
          <div className="bg-neutral-900 text-white px-4 py-3.5 flex items-center justify-between border-b border-neutral-800 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-white shrink-0 shadow-xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold text-white truncate">Copiloto Agenfacil</h3>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-purple-500/30 text-purple-200 border border-purple-400/30 flex items-center gap-1">
                    <Mic className="w-2.5 h-2.5" />
                    Voz & IA
                  </span>
                </div>
                <p className="text-[10px] text-neutral-400 truncate">
                  {practiceSettings.practice_name || 'Consultorio'} • Datos en tiempo real
                </p>
              </div>
            </div>

            {/* Window Controls */}
            <div className="flex items-center gap-1 text-neutral-400">
              <button
                type="button"
                id="btn-copilot-clear"
                onClick={handleClearHistory}
                className="p-1.5 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
                title="Reiniciar conversación"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                id="btn-copilot-expand"
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors hidden sm:block cursor-pointer"
                title={isExpanded ? 'Ventana compacta' : 'Expandir ventana'}
              >
                {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                id="btn-copilot-close"
                onClick={() => {
                  stopVoiceRecording(false);
                  setIsOpen(false);
                }}
                className="p-1.5 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
                title="Cerrar asistente"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Filter / Suggestion Chips Bar */}
          <div 
            onWheel={(e) => {
              if (e.deltaY !== 0 && e.currentTarget.scrollWidth > e.currentTarget.clientWidth) {
                e.currentTarget.scrollLeft += e.deltaY;
              }
            }}
            className="bg-neutral-50 border-b border-neutral-200/80 px-3 py-2 overflow-x-auto scroll-touch-x subtle-scrollbar shrink-0 flex items-center gap-1.5 w-full max-w-full min-w-0"
          >
            {quickSuggestions.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(item.prompt)}
                disabled={isLoading || isRecordingVoice}
                className="shrink-0 px-2.5 py-1 bg-white hover:bg-neutral-100 active:scale-95 text-neutral-700 text-[11px] font-medium rounded-full border border-neutral-200/90 shadow-2xs transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-neutral-50/50 text-xs">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-end gap-1.5 max-w-[88%]">
                    {!isUser && (
                      <div className="w-6 h-6 rounded-lg bg-neutral-900 text-white flex items-center justify-center shrink-0 mb-1 text-[10px] font-bold">
                        <Bot className="w-3.5 h-3.5 text-purple-400" />
                      </div>
                    )}
                    <div
                      className={`p-3 rounded-2xl leading-relaxed whitespace-pre-wrap ${
                        isUser
                          ? 'bg-neutral-900 text-white rounded-br-xs shadow-xs'
                          : 'bg-white text-neutral-800 border border-neutral-200/80 rounded-bl-xs shadow-2xs'
                      }`}
                    >
                      {msg.content}

                      {/* Attached action button if recommended by assistant */}
                      {msg.action && (
                        <div className="mt-2.5 pt-2.5 border-t border-neutral-100 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleExecuteAction(msg.action!)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
                          >
                            <span>{msg.action.label}</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="text-[9px] text-neutral-400 mt-1 px-1">
                    {msg.timestamp}
                  </span>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-center gap-2 text-neutral-400 text-xs py-1">
                <div className="w-6 h-6 rounded-lg bg-neutral-200 flex items-center justify-center shrink-0 animate-pulse">
                  <Bot className="w-3.5 h-3.5 text-neutral-500" />
                </div>
                <div className="flex items-center gap-1.5 bg-white border border-neutral-200/80 px-3 py-2 rounded-2xl text-[11px] text-neutral-500 shadow-2xs">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600" />
                  <span>Consultando datos del consultorio...</span>
                </div>
              </div>
            )}

            {isTranscribingAudio && (
              <div className="flex items-center gap-2 text-neutral-400 text-xs py-1">
                <div className="w-6 h-6 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                  <Mic className="w-3.5 h-3.5 text-purple-600 animate-pulse" />
                </div>
                <div className="flex items-center gap-1.5 bg-purple-50 border border-purple-200 px-3 py-2 rounded-2xl text-[11px] text-purple-800 shadow-2xs">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600" />
                  <span>Transcribiendo voz con IA Gemini...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Voice Error Notice Banner if any */}
          {voiceError && (
            <div className="px-3 py-2 bg-amber-50 border-t border-amber-200 text-amber-900 text-[11px] flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="truncate">{voiceError}</span>
              </div>
              <button
                type="button"
                onClick={() => setVoiceError(null)}
                className="text-amber-700 hover:text-amber-900 p-0.5 rounded cursor-pointer shrink-0"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* LIVE VOICE RECORDING ACTIVE PANEL */}
          {isRecordingVoice && (
            <div className="p-3 bg-purple-50/90 border-t border-purple-200 shrink-0 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600"></span>
                  </span>
                  <span className="text-xs font-bold text-purple-900">
                    Escuchando... {formatVoiceTime(voiceRecordingTime)}
                  </span>
                </div>

                {/* Animated Waveform Visualizer */}
                <div className="flex items-center gap-1 h-5 px-2">
                  {[40, 75, 100, 60, 90, 45, 80, 100, 50, 70, 90, 40].map((h, i) => (
                    <span
                      key={i}
                      className="w-1 bg-purple-600 rounded-full animate-pulse transition-all duration-150"
                      style={{
                        height: `${Math.max(20, (h * (1 + Math.sin(Date.now() / 150 + i))) / 2)}%`,
                        opacity: 0.6 + (i % 3) * 0.2
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Interim realtime speech preview */}
              <div className="p-2 bg-white rounded-xl border border-purple-200 text-xs text-purple-950 font-medium min-h-[34px] flex items-center shadow-2xs">
                {inputMessage || voiceInterimTranscript ? (
                  <span className="leading-snug">
                    {inputMessage} <em className="text-purple-600 not-italic font-normal">{voiceInterimTranscript}</em>
                  </span>
                ) : (
                  <span className="text-neutral-400 italic text-[11px]">
                    Di tu pregunta médica o administrativa (ej: "¿Qué turnos tengo hoy?" o "¿Cuánto cobramos?")...
                  </span>
                )}
              </div>

              {/* Action Buttons while recording */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  id="btn-voice-cancel"
                  onClick={cancelVoiceRecording}
                  className="px-2.5 py-1.5 text-[11px] font-medium text-neutral-600 hover:text-neutral-900 hover:bg-purple-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    id="btn-voice-stop-keep"
                    onClick={() => stopVoiceRecording(false)}
                    className="px-3 py-1.5 bg-white hover:bg-neutral-100 text-neutral-800 text-[11px] font-semibold rounded-lg border border-neutral-200 shadow-2xs transition-colors cursor-pointer"
                  >
                    Detener dictado
                  </button>

                  <button
                    type="button"
                    id="btn-voice-stop-send"
                    onClick={() => stopVoiceRecording(true)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white text-[11px] font-bold rounded-lg shadow-xs transition-all cursor-pointer"
                  >
                    <Send className="w-3 h-3" />
                    <span>Enviar consulta</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Message Input Footer */}
          {!isRecordingVoice && (
            <div className="p-3 bg-white border-t border-neutral-200 shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <button
                  type="button"
                  id="btn-copilot-voice-record"
                  onClick={startVoiceRecording}
                  disabled={isLoading || isTranscribingAudio}
                  className="w-9 h-9 flex items-center justify-center bg-purple-50 hover:bg-purple-100 active:scale-95 text-purple-700 hover:text-purple-900 rounded-xl border border-purple-200/90 shadow-2xs transition-all shrink-0 cursor-pointer disabled:opacity-40"
                  title="Dictar pregunta por voz (Transcripción inteligente)"
                >
                  <Mic className="w-4 h-4" />
                </button>

                <input
                  ref={inputRef}
                  type="text"
                  id="input-doctor-copilot"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Escribe o dicta por voz una consulta..."
                  disabled={isLoading}
                  className="flex-1 text-xs px-3.5 py-2.5 bg-neutral-100 hover:bg-neutral-50 focus:bg-white border border-transparent focus:border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all placeholder:text-neutral-400"
                />

                <button
                  type="submit"
                  id="btn-copilot-send"
                  disabled={!inputMessage.trim() || isLoading}
                  className="w-9 h-9 flex items-center justify-center bg-neutral-900 hover:bg-neutral-800 disabled:opacity-40 disabled:hover:bg-neutral-900 text-white rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer"
                  title="Enviar mensaje"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
              <div className="mt-1.5 flex items-center justify-between text-[9px] text-neutral-400 px-1">
                <span>🎙️ Dictado por voz disponible</span>
                <span>🔒 Información privada para {currentUser.name || currentUser.email}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};
