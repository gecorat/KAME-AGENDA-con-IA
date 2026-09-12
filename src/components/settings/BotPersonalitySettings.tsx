import React, { useState, useRef } from 'react';
import {
  Bot,
  User,
  Sparkles,
  Zap,
  Cpu,
  Brain,
  MessageSquare,
  ShieldCheck,
  Check,
  Save,
  AlertCircle,
  HelpCircle,
  Clock,
  MapPin,
  DollarSign,
  UserCheck,
  Sliders,
  Flame,
  CheckCircle2,
  Lock,
  Crown,
  PauseCircle,
  PlayCircle,
  Image as ImageIcon,
  Timer,
  CheckCheck,
  ShieldAlert,
  Send,
  RefreshCw,
  Phone,
  Video,
  MoreVertical,
  Paperclip,
  Smile,
  Upload,
  Link as LinkIcon,
  RotateCcw,
  Info
} from 'lucide-react';
import { useAgendaStore } from '../../lib/store';
import { PracticeSettings, BotAiModel, BotIdentityMode, BotPersonalityPreset } from '../../types';

interface BotPersonalitySettingsProps {
  onSaveSuccess?: () => void;
}

const AI_MODELS: {
  id: BotAiModel;
  name: string;
  badge: string;
  badgeColor: string;
  description: string;
  costLabel: string;
  latencyLabel: string;
  icon: any;
}[] = [
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    badge: 'Recomendado por Defecto',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    description: 'Máximo equilibrio y fluidez: entiende modismos coloquiales de pacientes, valida horarios médicos con precisión y opera a costo ultra bajo.',
    costLabel: 'Ultra Económico',
    latencyLabel: '~350ms',
    icon: Zap
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash Lite',
    badge: 'Máximo Ahorro',
    badgeColor: 'bg-sky-50 text-sky-700 border-sky-200',
    description: 'Diseñado para volumen masivo de mensajes con el consumo de tokens más bajo del mercado.',
    costLabel: 'Hiper Económico',
    latencyLabel: '~200ms',
    icon: Flame
  },
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    badge: 'Veloz & Moderno',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    description: 'Generación rápida con capacidad avanzada de seguimiento de conversaciones y contexto clínico.',
    costLabel: 'Económico',
    latencyLabel: '~300ms',
    icon: Cpu
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    badge: 'Razonamiento Profundo',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    description: 'Capacidad de razonamiento superior para protocolos clínicos extensos o clínicas con múltiples especialidades.',
    costLabel: 'Estándar',
    latencyLabel: '~900ms',
    icon: Brain
  }
];

const DELAY_OPTIONS = [
  {
    seconds: 10,
    label: 'Rápida (10s)',
    badge: 'Ágil',
    desc: 'Espera ~10 segundos con variación aleatoria (+/- 2s).',
    icon: Clock
  },
  {
    seconds: 15,
    label: 'Fluida (15s)',
    badge: 'Equilibrado',
    desc: 'Pausa moderada para redacción natural.',
    icon: Clock
  },
  {
    seconds: 20,
    label: 'Natural (20s)',
    badge: 'Predeterminado / Recomendado',
    desc: 'Simula lectura humana y redacción natural. Máxima protección antibloqueo.',
    icon: Timer
  },
  {
    seconds: 45,
    label: 'Pausada (45s)',
    badge: 'Alto Tráfico',
    desc: 'Ideal para consultorios con cientos de mensajes simultáneos.',
    icon: ShieldCheck
  },
  {
    seconds: 60,
    label: 'Diferida (60s)',
    badge: 'Simula Ocupado',
    desc: 'Espera 1 minuto antes de responder.',
    icon: Clock
  }
];

const PERSONALITY_PRESETS: {
  id: BotPersonalityPreset;
  title: string;
  tone: string;
  description: string;
}[] = [
  {
    id: 'warm',
    title: '🌸 Cálido & Empático',
    tone: 'cálido, amable, empático y contenedor, con emojis sutiles',
    description: 'Ideal para consultorios médicos, psicología, pediatría y bienestar.'
  },
  {
    id: 'formal',
    title: '🏛️ Formal & Clínico',
    tone: 'formal, respetuoso, clínico y riguroso',
    description: 'Ideal para centros médicos corporativos, odontología estética o estudios profesionales.'
  },
  {
    id: 'concise',
    title: '⚡ Ejecutivo & Rápido',
    tone: 'ágil, directo, resolutivo y conciso',
    description: 'Va directo al grano para pacientes que buscan agendar en pocos segundos.'
  },
  {
    id: 'custom',
    title: '✏️ Tono Personalizado',
    tone: '',
    description: 'Escribe tus propias directivas sobre cómo debe expresarse el bot.'
  }
];

const PROMPT_SUGGESTIONS = [
  'Si el paciente consulta por una urgencia o dolor agudo, pedirle que acuda a una guardia o llame al 107.',
  'Aclarar que la tolerancia máxima de espera en el consultorio es de 15 minutos.',
  'No indicar diagnósticos específicos ni recetar medicamentos por chat.',
  'Recordar que los menores de edad deben asistir acompañados por un adulto responsable.',
  'Para cancelaciones de turnos, solicitar un mínimo de 24 horas de anticipación.'
];

export const BotPersonalitySettings: React.FC<BotPersonalitySettingsProps> = ({ onSaveSuccess }) => {
  const { practiceSettings, updatePracticeSettings, currentUser } = useAgendaStore();
  const isGonzalo = currentUser?.email?.toLowerCase() === 'gonzalocorat@gmail.com';
  const isSuperAdmin = isGonzalo && Boolean(currentUser?.isSuperAdmin);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [formData, setFormData] = useState<Partial<PracticeSettings>>({
    bot_enabled: practiceSettings.bot_enabled ?? true,
    bot_identity_mode: practiceSettings.bot_identity_mode || 'assistant',
    bot_assistant_name: practiceSettings.bot_assistant_name || 'Sofía (IA)',
    bot_avatar_url: practiceSettings.bot_avatar_url || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80',
    bot_response_delay_seconds: practiceSettings.bot_response_delay_seconds ?? 20,
    bot_typing_simulation: practiceSettings.bot_typing_simulation ?? true,
    bot_ai_model: practiceSettings.bot_ai_model || 'gemini-2.5-flash',
    bot_personality_preset: practiceSettings.bot_personality_preset || 'warm',
    bot_tone: practiceSettings.bot_tone || 'cálido, amable y profesional',
    welcome_message: practiceSettings.welcome_message || `¡Hola! 👋 Gracias por comunicarte con ${practiceSettings.practice_name}. ¿En qué te puedo ayudar hoy?`,
    bot_custom_instructions: practiceSettings.bot_custom_instructions || '',
    bot_feature_pricing: practiceSettings.bot_feature_pricing ?? true,
    bot_feature_booking: practiceSettings.bot_feature_booking ?? true,
    bot_feature_location: practiceSettings.bot_feature_location ?? true,
    bot_feature_deposit_info: practiceSettings.bot_feature_deposit_info ?? true,
    bot_feature_human_handoff: practiceSettings.bot_feature_human_handoff ?? true,
    auto_confirm_bookings: practiceSettings.auto_confirm_bookings ?? true
  });

  const [saved, setSaved] = useState(false);
  const [customAvatarInput, setCustomAvatarInput] = useState('');

  const handleFileUpload = (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido (JPG, PNG, WebP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        setFormData(prev => ({ ...prev, bot_avatar_url: result }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleIdentityChange = (mode: BotIdentityMode) => {
    setFormData(prev => {
      let defaultWelcome = prev.welcome_message;
      if (mode === 'professional') {
        defaultWelcome = `¡Hola! 👋 Te habla ${practiceSettings.professional_name || 'el profesional a cargo'} de ${practiceSettings.practice_name}. ¿En qué te puedo ayudar hoy?`;
      } else {
        defaultWelcome = `¡Hola! 👋 Soy ${prev.bot_assistant_name || 'Sofía'}, la asistente virtual de ${practiceSettings.practice_name}. ¿En qué te puedo ayudar hoy?`;
      }
      return {
        ...prev,
        bot_identity_mode: mode,
        welcome_message: defaultWelcome
      };
    });
  };

  const handlePresetSelect = (preset: typeof PERSONALITY_PRESETS[0]) => {
    setFormData(prev => ({
      ...prev,
      bot_personality_preset: preset.id,
      bot_tone: preset.tone || prev.bot_tone
    }));
  };

  const addSuggestion = (text: string) => {
    setFormData(prev => {
      const current = prev.bot_custom_instructions || '';
      if (current.includes(text)) return prev;
      const updated = current ? `${current}\n- ${text}` : `- ${text}`;
      return { ...prev, bot_custom_instructions: updated };
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updatePracticeSettings(formData);
    setSaved(true);
    onSaveSuccess?.();
    setTimeout(() => setSaved(false), 2500);
  };

  const currentDisplayName = formData.bot_identity_mode === 'professional'
    ? (practiceSettings.professional_name || 'Doctor/a a cargo')
    : (formData.bot_assistant_name || 'Sofía (IA)');

  const currentRoleSubtext = formData.bot_identity_mode === 'professional'
    ? (practiceSettings.professional_title || 'Profesional')
    : `Asistente de ${practiceSettings.practice_name}`;

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Top Header Card with Master Bot Active Switch */}
      <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white shadow-2xs transition-colors ${
            formData.bot_enabled ? 'bg-emerald-600' : 'bg-neutral-400'
          }`}>
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-neutral-900 font-display">
                Configuración del Asistente & Bot de WhatsApp
              </h2>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                formData.bot_enabled
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-neutral-100 text-neutral-600 border-neutral-300'
              }`}>
                {formData.bot_enabled ? '● Bot Global Activo' : '○ Bot Global Pausado'}
              </span>
            </div>
            <p className="text-xs text-neutral-500">
              Personaliza el estado del bot, tiempos de respuesta anti-detección, foto de perfil e instrucciones.
            </p>
          </div>
        </div>

        {/* Master Switch & Save */}
        <div className="flex items-center gap-3 self-stretch md:self-auto justify-between md:justify-end">
          {/* Master Bot Toggle */}
          <div className="flex items-center gap-2 p-1.5 bg-neutral-100/90 rounded-xl border border-neutral-200">
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, bot_enabled: true }))}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                formData.bot_enabled
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <PlayCircle className="w-3.5 h-3.5" />
              <span>Activo</span>
            </button>
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, bot_enabled: false }))}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                !formData.bot_enabled
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <PauseCircle className="w-3.5 h-3.5" />
              <span>Pausado</span>
            </button>
          </div>

          <button
            type="submit"
            className={`px-4 py-2 text-xs font-semibold rounded-xl shadow-2xs transition-all flex items-center gap-1.5 ${
              saved
                ? 'bg-emerald-600 text-white'
                : 'bg-neutral-900 hover:bg-neutral-800 text-white active:scale-98'
            }`}
          >
            {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            <span>{saved ? '¡Guardado!' : 'Guardar'}</span>
          </button>
        </div>
      </div>

      {/* WHATSAPP WEB LIVE PREVIEW & VISUAL CUSTOMIZATION */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-2xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider font-display">
              1. Vista Previa en WhatsApp Web & Foto de Perfil
            </h3>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
            Simulador de Interfaz Real
          </span>
        </div>

        <p className="text-xs text-neutral-600">
          Así es como tus pacientes verán al bot en la ventana de WhatsApp Web. Sincroniza la foto de perfil del profesional o asistente para transmitir máxima confianza y cercanía.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* WhatsApp Web Simulator Box */}
          <div className="lg:col-span-7 bg-[#efeae2] rounded-2xl border border-neutral-300/80 shadow-md overflow-hidden relative">
            {/* WhatsApp Web Chat Header */}
            <div className="bg-[#f0f2f5] px-4 py-3 border-b border-neutral-300 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img
                    src={formData.bot_avatar_url || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80'}
                    alt="WhatsApp Avatar"
                    className="w-10 h-10 rounded-full object-cover border border-neutral-200 shadow-2xs"
                  />
                  <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                    formData.bot_enabled ? 'bg-emerald-500' : 'bg-neutral-400'
                  }`} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs font-bold text-neutral-900 leading-tight">
                      {currentDisplayName}
                    </h4>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded">
                      {formData.bot_identity_mode === 'professional' ? 'Profesional' : 'Asistente IA'}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500 flex items-center gap-1">
                    {formData.bot_typing_simulation ? (
                      <span className="text-emerald-700 font-medium animate-pulse">escribiendo...</span>
                    ) : (
                      <span>en línea • {currentRoleSubtext}</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-neutral-600">
                <Video className="w-4 h-4 cursor-pointer hover:text-neutral-900" />
                <Phone className="w-4 h-4 cursor-pointer hover:text-neutral-900" />
                <div className="w-[1px] h-4 bg-neutral-300" />
                <MoreVertical className="w-4 h-4 cursor-pointer hover:text-neutral-900" />
              </div>
            </div>

            {/* Simulated Chat Messages */}
            <div className="p-4 space-y-3 min-h-[220px] bg-[radial-gradient(#d8d2cb_1px,transparent_1px)] [background-size:16px_16px]">
              {/* Patient Message */}
              <div className="flex justify-end">
                <div className="bg-[#d9fdd3] text-neutral-900 rounded-lg rounded-tr-none px-3.5 py-2 max-w-[80%] text-xs shadow-2xs space-y-1">
                  <p>Hola, buenas tardes! Quería saber si tienen turnos disponibles para esta semana con el doctor.</p>
                  <div className="flex items-center justify-end gap-1 text-[10px] text-neutral-500">
                    <span>14:32</span>
                    <CheckCheck className="w-3.5 h-3.5 text-sky-600" />
                  </div>
                </div>
              </div>

              {/* Bot Response Message */}
              <div className="flex justify-start">
                <div className="bg-white text-neutral-900 rounded-lg rounded-tl-none px-3.5 py-2 max-w-[85%] text-xs shadow-2xs space-y-1.5 border border-neutral-200/60">
                  <p className="whitespace-pre-wrap">{formData.welcome_message}</p>
                  <p className="text-neutral-600">
                    Tenemos turnos disponibles para <strong>{practiceSettings.specialty || 'consulta'}</strong> el <strong>Jueves a las 10:30 hs</strong> o <strong>Viernes a las 16:00 hs</strong>. ¿Cuál te queda más cómodo?
                  </p>
                  <div className="flex items-center justify-end gap-1 text-[10px] text-neutral-400">
                    <span>14:32</span>
                  </div>
                </div>
              </div>
            </div>

            {/* WhatsApp Web Input Bar Mock */}
            <div className="bg-[#f0f2f5] px-3 py-2 border-t border-neutral-300 flex items-center gap-2">
              <Smile className="w-5 h-5 text-neutral-500" />
              <Paperclip className="w-5 h-5 text-neutral-500" />
              <div className="flex-1 bg-white rounded-lg px-3 py-1.5 text-xs text-neutral-400 border border-neutral-200 font-sans">
                Escribe un mensaje aquí...
              </div>
              <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                <Send className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* Avatar / Profile Photo Controls */}
          <div className="lg:col-span-5 space-y-3.5">
            <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 space-y-3.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-sky-600" />
                  <span>Foto de Perfil del Asistente / WhatsApp:</span>
                </label>
                {formData.bot_avatar_url && (
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, bot_avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80' }))}
                    className="text-[10px] text-neutral-500 hover:text-neutral-800 flex items-center gap-1 font-medium transition-colors"
                    title="Restablecer a imagen sugerida predeterminada"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Restablecer</span>
                  </button>
                )}
              </div>

              {/* Selected Avatar Preview */}
              <div className="flex items-center gap-3 p-2.5 bg-white rounded-xl border border-neutral-200/80 shadow-2xs">
                <img
                  src={formData.bot_avatar_url || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80'}
                  alt="Selected Avatar"
                  className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500/30 shadow-2xs shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-neutral-900 truncate">
                    {currentDisplayName}
                  </p>
                  <p className="text-[10px] text-neutral-500 truncate">
                    Foto asignada para simulador y panel
                  </p>
                </div>
              </div>

              {/* Clarification Notice: Suggestion vs Real WhatsApp */}
              <div className="p-3 bg-sky-50/80 rounded-xl border border-sky-200/80 text-sky-950 text-[11px] space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-sky-900 text-xs">
                  <Info className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                  <span>Aviso de sugerencia</span>
                </div>
                <p className="leading-relaxed text-sky-900/90 text-[11px]">
                  Esta foto es una sugerencia visual para la previsualización. Al conectar tu número de WhatsApp real (mediante QR), los pacientes verán automáticamente la foto de perfil actual que tengas configurada en tu aplicación de WhatsApp en el teléfono.
                </p>
              </div>

              {/* Option 1: Upload from Computer */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-neutral-700 block">
                  Opción 1: Seleccionar imagen desde el ordenador:
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/jpg"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-3 rounded-xl border-2 border-dashed text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5 ${
                    isDragging
                      ? 'border-sky-500 bg-sky-50'
                      : 'border-neutral-300 hover:border-neutral-400 bg-white hover:bg-neutral-50/80'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-600">
                    <Upload className="w-4 h-4 text-sky-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-neutral-800">
                      Haz clic para examinar o arrastra una imagen aquí
                    </p>
                    <p className="text-[10px] text-neutral-500">
                      Formatos compatibles: JPG, PNG o WebP
                    </p>
                  </div>
                </div>
              </div>

              {/* Option 2: Custom Image URL */}
              <div className="space-y-1.5 pt-1">
                <label className="text-[11px] font-semibold text-neutral-700 block flex items-center gap-1">
                  <LinkIcon className="w-3 h-3 text-neutral-500" />
                  <span>Opción 2: Pegar enlace (URL) de imagen:</span>
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="url"
                    value={customAvatarInput}
                    onChange={e => setCustomAvatarInput(e.target.value)}
                    placeholder="https://ejemplo.com/foto.jpg"
                    className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-neutral-200 rounded-lg focus:ring-1 focus:ring-neutral-900"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (customAvatarInput.trim()) {
                        setFormData(prev => ({ ...prev, bot_avatar_url: customAvatarInput.trim() }));
                        setCustomAvatarInput('');
                      }
                    }}
                    className="px-3 py-1.5 bg-neutral-900 text-white text-xs font-semibold rounded-lg hover:bg-neutral-800 shrink-0 transition-colors"
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. DEMORA DE RESPUESTA & PROTECCIÓN ANTI-BOT (PACING HUMANO) */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-amber-600" />
            <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider font-display">
              2. Ritmo de Respuesta & Simulación Humana (Anti-Ban)
            </h3>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
            Recomendado para QR / WhatsApp Web
          </span>
        </div>

        <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
          <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold">¿Por qué es fundamental la demora de respuesta?</p>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Al conectar mediante sesión web / QR, responder en menos de 1 segundo de forma instantánea delata comportamiento de bot. Configurar una pausa de <strong>10 a 20 segundos</strong> con simulación de <em>"escribiendo..."</em> protege la reputación de tu línea y brinda una sensación de atención cálida y humana a los pacientes.
            </p>
          </div>
        </div>

        {/* Delay Options Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
          {DELAY_OPTIONS.map(opt => {
            const isSelected = formData.bot_response_delay_seconds === opt.seconds;
            const Icon = opt.icon;
            return (
              <button
                key={opt.seconds}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, bot_response_delay_seconds: opt.seconds }))}
                className={`p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between gap-2.5 ${
                  isSelected
                    ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/20 shadow-2xs'
                    : 'bg-neutral-50/70 border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-xs font-bold text-neutral-900 font-display flex items-center gap-1">
                      <Icon className="w-3.5 h-3.5 text-amber-600" />
                      {opt.label}
                    </span>
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                      isSelected ? 'bg-amber-600 text-white' : 'bg-neutral-200 text-neutral-700'
                    }`}>
                      {opt.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-600 leading-tight">
                    {opt.desc}
                  </p>
                </div>
                {isSelected && (
                  <div className="flex items-center gap-1 text-[10px] font-bold text-amber-700 pt-1 border-t border-amber-200/60">
                    <Check className="w-3 h-3" />
                    <span>Seleccionado</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Typing presence toggle */}
        <div className="flex items-center justify-between p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 mt-2">
          <div>
            <p className="font-bold text-xs text-neutral-900">Simular estado "Escribiendo..." en el chat</p>
            <p className="text-[11px] text-neutral-500">
              Muestra el indicador de redacción activa al paciente antes de enviar la respuesta.
            </p>
          </div>
          <input
            type="checkbox"
            checked={formData.bot_typing_simulation}
            onChange={e => setFormData(prev => ({ ...prev, bot_typing_simulation: e.target.checked }))}
            className="w-4 h-4 text-neutral-900 rounded focus:ring-neutral-900"
          />
        </div>
      </div>

      {/* 3. SELECCIÓN DE VERSIÓN DE IA - EXCLUSIVO SUPER ADMIN */}
      {isSuperAdmin && (
        <div className="bg-white p-6 rounded-2xl border border-amber-200/80 shadow-2xs space-y-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 px-3 py-1 bg-amber-500 text-white text-[10px] font-bold rounded-bl-xl uppercase tracking-wider flex items-center gap-1 shadow-2xs">
            <Crown className="w-3 h-3 text-amber-200" />
            <span>Exclusivo Super Admin</span>
          </div>

          <div className="flex items-center justify-between pb-3 border-b border-neutral-100 pr-32">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-amber-600" />
              <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider font-display">
                Motor de Inteligencia Artificial (Gemini Backend)
              </h3>
            </div>
            <span className="text-[11px] font-mono text-neutral-500">
              Google GenAI SDK
            </span>
          </div>

          <p className="text-xs text-neutral-600">
            Control de infraestructura SaaS: Selecciona qué modelo de Gemini ejecutará el backend para este consultorio. Por defecto recomendamos <strong>Gemini 2.5 Flash</strong> por su ultra bajo costo y perfecta fluidez en español.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
            {AI_MODELS.map(model => {
              const isSelected = formData.bot_ai_model === model.id;
              const Icon = model.icon;
              return (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, bot_ai_model: model.id }))}
                  className={`p-4 rounded-xl border text-left transition-all relative flex flex-col justify-between gap-3 ${
                    isSelected
                      ? 'bg-amber-50/40 border-amber-500 ring-2 ring-amber-500/20 shadow-2xs'
                      : 'bg-neutral-50/60 border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-amber-600 text-white' : 'bg-neutral-200 text-neutral-700'}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold text-neutral-900 font-display">
                          {model.name}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${model.badgeColor}`}>
                        {model.badge}
                      </span>
                    </div>

                    <p className="text-[11px] text-neutral-600 leading-relaxed">
                      {model.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-neutral-200/60 text-[10px] font-mono text-neutral-500">
                    <span>Costo: <strong className="text-neutral-800">{model.costLabel}</strong></span>
                    <span>Latencia: <strong className="text-neutral-800">{model.latencyLabel}</strong></span>
                  </div>

                  {isSelected && (
                    <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-600" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. IDENTIDAD Y ROL DEL BOT */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-neutral-100">
          <UserCheck className="w-4 h-4 text-neutral-700" />
          <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider font-display">
            3. Identidad: ¿Cómo debe presentarse el Bot ante los pacientes?
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Opción 1: Responder como Asistente */}
          <button
            type="button"
            onClick={() => handleIdentityChange('assistant')}
            className={`p-4 rounded-xl border text-left transition-all ${
              formData.bot_identity_mode === 'assistant'
                ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                : 'bg-neutral-50 border-neutral-200 hover:border-neutral-300 text-neutral-800'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold">👩‍💼 Como Asistente / Secretaria</span>
              {formData.bot_identity_mode === 'assistant' && (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              )}
            </div>
            <p className={`text-[11px] leading-relaxed ${formData.bot_identity_mode === 'assistant' ? 'text-neutral-300' : 'text-neutral-500'}`}>
              El bot se presenta como la secretaria virtual del consultorio (ej. <em>"Hola, te atiende {formData.bot_assistant_name || 'Sofía'}, asistente de {practiceSettings.practice_name}"</em>).
            </p>
          </button>

          {/* Opción 2: Responder como el Profesional */}
          <button
            type="button"
            onClick={() => handleIdentityChange('professional')}
            className={`p-4 rounded-xl border text-left transition-all ${
              formData.bot_identity_mode === 'professional'
                ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                : 'bg-neutral-50 border-neutral-200 hover:border-neutral-300 text-neutral-800'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold">👨‍⚕️ Directamente como el Profesional</span>
              {formData.bot_identity_mode === 'professional' && (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              )}
            </div>
            <p className={`text-[11px] leading-relaxed ${formData.bot_identity_mode === 'professional' ? 'text-neutral-300' : 'text-neutral-500'}`}>
              El bot habla en primera persona como el titular del consultorio (ej. <em>"Hola, soy {practiceSettings.professional_name || 'el profesional'}, te comento mis horarios disponibles..."</em>).
            </p>
          </button>
        </div>

        {/* Nombre del asistente si corresponde */}
        {formData.bot_identity_mode === 'assistant' && (
          <div className="pt-2">
            <label className="text-xs font-semibold text-neutral-700 block mb-1">
              Nombre personalizado de la Asistente:
            </label>
            <input
              type="text"
              value={formData.bot_assistant_name || ''}
              onChange={e => setFormData(prev => ({ ...prev, bot_assistant_name: e.target.value }))}
              placeholder="Ej. Sofía (IA), Camila, Asistente Virtual"
              className="w-full sm:w-80 px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900 font-medium"
            />
          </div>
        )}
      </div>

      {/* 5. ARQUETIPO, TONO Y SALUDO */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-neutral-100">
          <MessageSquare className="w-4 h-4 text-neutral-700" />
          <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider font-display">
            4. Tono de Comunicación & Mensaje de Bienvenida
          </h3>
        </div>

        <div>
          <label className="text-xs font-semibold text-neutral-700 block mb-2">
            Presets de Tono y Estilo:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PERSONALITY_PRESETS.filter(p => p.id !== 'custom').map(preset => {
              const isSelected = formData.bot_personality_preset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handlePresetSelect(preset)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'bg-neutral-900 text-white border-neutral-900 shadow-2xs'
                      : 'bg-neutral-50 border-neutral-200 hover:border-neutral-300 text-neutral-700'
                  }`}
                >
                  <p className="text-xs font-bold mb-1">{preset.title}</p>
                  <p className={`text-[11px] leading-tight ${isSelected ? 'text-neutral-300' : 'text-neutral-500'}`}>
                    {preset.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-neutral-700 block mb-1">
            Instrucción de Tono Activa (o personalizada):
          </label>
          <input
            type="text"
            value={formData.bot_tone || ''}
            onChange={e => setFormData(prev => ({ ...prev, bot_tone: e.target.value, bot_personality_preset: 'custom' }))}
            placeholder="Ej. cálido, empático, claro, con lenguaje rioplatense y emojis sutiles"
            className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-neutral-700 block mb-1">
            Mensaje Inicial de Bienvenida (Saludo al abrir chat):
          </label>
          <textarea
            rows={2}
            value={formData.welcome_message || ''}
            onChange={e => setFormData(prev => ({ ...prev, welcome_message: e.target.value }))}
            className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900 leading-relaxed font-sans"
            placeholder="¡Hola! Gracias por comunicarte..."
          />
        </div>
      </div>

      {/* 6. FUNCIONES HABILITADAS DEL BOT */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-neutral-700" />
            <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider font-display">
              5. Funciones Habilitadas para Responder
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="flex items-center justify-between p-3.5 bg-neutral-50 rounded-xl border border-neutral-200">
            <div>
              <p className="font-bold text-neutral-900">💲 Informar Precios y Aranceles</p>
              <p className="text-[11px] text-neutral-500">Permite responder dudas de costos de los servicios activos.</p>
            </div>
            <input
              type="checkbox"
              checked={formData.bot_feature_pricing}
              onChange={e => setFormData(prev => ({ ...prev, bot_feature_pricing: e.target.checked }))}
              className="w-4 h-4 text-neutral-900 rounded focus:ring-neutral-900"
            />
          </div>

          <div className="flex items-center justify-between p-3.5 bg-neutral-50 rounded-xl border border-neutral-200">
            <div>
              <p className="font-bold text-neutral-900">📅 Agendamiento Automático de Turnos</p>
              <p className="text-[11px] text-neutral-500">Permite concretar turnos directamente en los huecos libres.</p>
            </div>
            <input
              type="checkbox"
              checked={formData.bot_feature_booking}
              onChange={e => setFormData(prev => ({ ...prev, bot_feature_booking: e.target.checked }))}
              className="w-4 h-4 text-neutral-900 rounded focus:ring-neutral-900"
            />
          </div>

          <div className="flex items-center justify-between p-3.5 bg-neutral-50 rounded-xl border border-neutral-200">
            <div>
              <p className="font-bold text-neutral-900">📍 Informar Ubicación & Horarios</p>
              <p className="text-[11px] text-neutral-500">Brinda dirección del consultorio y horarios de atención.</p>
            </div>
            <input
              type="checkbox"
              checked={formData.bot_feature_location}
              onChange={e => setFormData(prev => ({ ...prev, bot_feature_location: e.target.checked }))}
              className="w-4 h-4 text-neutral-900 rounded focus:ring-neutral-900"
            />
          </div>

          <div className="flex items-center justify-between p-3.5 bg-neutral-50 rounded-xl border border-neutral-200">
            <div>
              <p className="font-bold text-neutral-900">💳 Información de Señas / Alias CBU</p>
              <p className="text-[11px] text-neutral-500">Informa el Alias bancario o link de seña para confirmar.</p>
            </div>
            <input
              type="checkbox"
              checked={formData.bot_feature_deposit_info}
              onChange={e => setFormData(prev => ({ ...prev, bot_feature_deposit_info: e.target.checked }))}
              className="w-4 h-4 text-neutral-900 rounded focus:ring-neutral-900"
            />
          </div>

          <div className="flex items-center justify-between p-3.5 bg-neutral-50 rounded-xl border border-neutral-200">
            <div>
              <p className="font-bold text-neutral-900">🙋‍♂️ Derivar a Atención Humana</p>
              <p className="text-[11px] text-neutral-500">Si el paciente pide hablar con una persona, pausa la IA.</p>
            </div>
            <input
              type="checkbox"
              checked={formData.bot_feature_human_handoff}
              onChange={e => setFormData(prev => ({ ...prev, bot_feature_human_handoff: e.target.checked }))}
              className="w-4 h-4 text-neutral-900 rounded focus:ring-neutral-900"
            />
          </div>

          <div className="flex items-center justify-between p-3.5 bg-neutral-50 rounded-xl border border-neutral-200">
            <div>
              <p className="font-bold text-neutral-900">⚡ Auto-confirmar en la Agenda</p>
              <p className="text-[11px] text-neutral-500">Si se desactiva, los turnos ingresan como "Pendientes".</p>
            </div>
            <input
              type="checkbox"
              checked={formData.auto_confirm_bookings}
              onChange={e => setFormData(prev => ({ ...prev, auto_confirm_bookings: e.target.checked }))}
              className="w-4 h-4 text-neutral-900 rounded focus:ring-neutral-900"
            />
          </div>
        </div>
      </div>

      {/* 7. RESTRICCIONES & INSTRUCCIONES ESPECÍFICAS (PROMPT LIBRE) */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-600" />
            <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider font-display">
              6. Restricciones y Reglas Específicas del Consultorio
            </h3>
          </div>
          <span className="text-[10px] font-bold text-neutral-500 uppercase">
            Instrucciones Libres
          </span>
        </div>

        <p className="text-xs text-neutral-600">
          Escribe directivas especiales que la IA de Gemini debe acatar estrictamente al interactuar con los pacientes.
        </p>

        {/* Sugerencias Rápidas */}
        <div>
          <span className="text-[11px] font-semibold text-neutral-500 block mb-1.5">
            Toca para insertar reglas frecuentes:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {PROMPT_SUGGESTIONS.map((sug, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => addSuggestion(sug)}
                className="px-2.5 py-1 text-[11px] bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg transition-colors border border-neutral-200/80 text-left"
              >
                + {sug.length > 55 ? sug.substring(0, 55) + '...' : sug}
              </button>
            ))}
          </div>
        </div>

        <div>
          <textarea
            rows={5}
            value={formData.bot_custom_instructions || ''}
            onChange={e => setFormData(prev => ({ ...prev, bot_custom_instructions: e.target.value }))}
            placeholder="- En caso de urgencia derivar al 107 o a la guardia del hospital más cercano.&#10;- Recordar que no se atiende los días feriados.&#10;- Aclarar que la primera consulta incluye diagnóstico integral."
            className="w-full px-3.5 py-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900 font-mono leading-relaxed"
          />
        </div>
      </div>

      {/* Bottom Save Bar */}
      <div className="pt-2 flex justify-end">
        <button
          type="submit"
          className={`px-6 py-2.5 text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 ${
            saved
              ? 'bg-emerald-600 text-white'
              : 'bg-neutral-900 hover:bg-neutral-800 text-white active:scale-98'
          }`}
        >
          {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          <span>{saved ? '¡Configuración Guardada!' : 'Guardar Todos los Cambios del Bot'}</span>
        </button>
      </div>
    </form>
  );
};
