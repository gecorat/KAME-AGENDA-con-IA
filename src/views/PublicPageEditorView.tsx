import React, { useState } from 'react';
import {
  Palette,
  Image as ImageIcon,
  Layout,
  Type,
  Sparkles,
  Save,
  Copy,
  ExternalLink,
  CheckCircle,
  Eye,
  Smartphone,
  Monitor,
  Check,
  Star,
  ShieldCheck,
  MapPin,
  Calendar,
  Clock,
  ArrowRight,
  Upload,
  RefreshCw,
  Globe,
  Share2,
  Pencil,
  Lock,
  MessageCircle,
  X,
  QrCode,
  Mail,
  CheckSquare
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAgendaStore } from '../lib/store';
import { PracticeSettings } from '../types';
import { RequiredFieldsSettings } from '../components/settings/RequiredFieldsSettings';

interface PublicPageEditorViewProps {
  onNavigateToTab?: (tab: string) => void;
}

export const PublicPageEditorView: React.FC<PublicPageEditorViewProps> = ({ onNavigateToTab }) => {
  const { practiceSettings, updatePracticeSettings, services } = useAgendaStore();

  // Local form state for immediate responsive live editing
  const [handleInput, setHandleInput] = useState<string>(practiceSettings.handle || 'consultorio-medico');
  const [handleSavedToast, setHandleSavedToast] = useState(false);
  // Lock/Edit state for unique handle: default to locked (false) so it doesn't get accidentally overwritten
  const [isEditingHandle, setIsEditingHandle] = useState<boolean>(false);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [copiedShareLink, setCopiedShareLink] = useState<boolean>(false);
  const [copiedBioSnippet, setCopiedBioSnippet] = useState<boolean>(false);
  const [themePreset, setThemePreset] = useState<string>(
    practiceSettings.public_theme_preset || 'minimal-slate'
  );
  const [photoUrl, setPhotoUrl] = useState<string>(
    practiceSettings.public_profile_photo_url || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80'
  );
  const [photoShape, setPhotoShape] = useState<'square' | 'rounded-smooth' | 'rounded-full'>(
    practiceSettings.public_profile_photo_shape || 'rounded-smooth'
  );
  const [photoAlign, setPhotoAlign] = useState<'left' | 'center' | 'right'>(
    practiceSettings.public_profile_photo_align || 'left'
  );
  const [cardBorderStyle, setCardBorderStyle] = useState<'square' | 'rounded-smooth' | 'rounded-xl' | 'pill'>(
    practiceSettings.public_card_border_style || 'rounded-xl'
  );
  const [badgeText, setBadgeText] = useState<string>(
    practiceSettings.public_badge_text || 'Atención Particular & Reintegros • Turnos Inmediatos'
  );
  const [bio, setBio] = useState<string>(
    practiceSettings.public_bio || 'Especialista en atención médica integral y diagnósticos avanzados. Más de 10 años de experiencia brindando atención personalizada y puntual.'
  );
  const [showReviews, setShowReviews] = useState<boolean>(
    practiceSettings.public_show_reviews ?? true
  );
  const [customAccent, setCustomAccent] = useState<string>(
    practiceSettings.public_custom_accent || practiceSettings.page_color || '#0284c7'
  );

  // Preview device toggle
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'desktop'>('desktop');
  const [activeSettingsTab, setActiveSettingsTab] = useState<'theme' | 'photo' | 'content' | 'fields'>('theme');
  const [copiedLink, setCopiedLink] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sample avatar presets
  const AVATAR_PRESETS = [
    {
      label: 'Doctor Masculino 1',
      url: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80'
    },
    {
      label: 'Doctora Femenina 1',
      url: 'https://images.unsplash.com/photo-1594824813689-5632d4b8e21a?w=400&auto=format&fit=crop&q=80'
    },
    {
      label: 'Doctor Masculino 2',
      url: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&auto=format&fit=crop&q=80'
    },
    {
      label: 'Doctora Femenina 2',
      url: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&auto=format&fit=crop&q=80'
    },
    {
      label: 'Consultorio Logo',
      url: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400&auto=format&fit=crop&q=80'
    }
  ];

  // Theme presets definitions
  const THEMES = [
    {
      id: 'minimal-slate',
      name: 'Minimal Slate',
      tagline: 'Moderno, monocromático de alto contraste',
      bgClass: 'bg-neutral-50',
      cardClass: 'bg-white border-neutral-200',
      textClass: 'text-neutral-900',
      accentColor: '#171717',
      badgeClass: 'bg-neutral-100 text-neutral-800 border-neutral-200'
    },
    {
      id: 'medical-teal',
      name: 'Medical Clean Teal',
      tagline: 'Clínico, sereno y profesional',
      bgClass: 'bg-teal-50/40',
      cardClass: 'bg-white border-teal-200/80',
      textClass: 'text-teal-950',
      accentColor: '#0d9488',
      badgeClass: 'bg-teal-100/70 text-teal-800 border-teal-200'
    },
    {
      id: 'warm-oat',
      name: 'Warm Luxury Oat',
      tagline: 'Cálido, premium para estética o dermatología',
      bgClass: 'bg-[#faf7f2]',
      cardClass: 'bg-white border-[#ebdccb]',
      textClass: 'text-[#3c342d]',
      accentColor: '#8a6240',
      badgeClass: 'bg-[#f4ede4] text-[#6b4c30] border-[#decbb7]'
    },
    {
      id: 'nordic-blue',
      name: 'Nordic Blue',
      tagline: 'Azul médico confiable y sobrio',
      bgClass: 'bg-sky-50/30',
      cardClass: 'bg-white border-sky-100',
      textClass: 'text-sky-950',
      accentColor: '#0284c7',
      badgeClass: 'bg-sky-100 text-sky-800 border-sky-200'
    },
    {
      id: 'dark-carbon',
      name: 'Dark Carbon Luxury',
      tagline: 'Oscuro premium para clínicas de alta gama',
      bgClass: 'bg-neutral-950',
      cardClass: 'bg-neutral-900 border-neutral-800',
      textClass: 'text-white',
      accentColor: '#38bdf8',
      badgeClass: 'bg-neutral-800 text-neutral-200 border-neutral-700'
    }
  ];

  const currentThemeObj = THEMES.find(t => t.id === themePreset) || THEMES[0];

  const cleanHandle = (handleInput || 'consultorio-medico')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/--+/g, '-');

  const handleSave = () => {
    updatePracticeSettings({
      handle: cleanHandle,
      public_theme_preset: themePreset as any,
      public_profile_photo_url: photoUrl,
      public_profile_photo_shape: photoShape,
      public_profile_photo_align: photoAlign,
      public_card_border_style: cardBorderStyle,
      public_badge_text: badgeText,
      public_bio: bio,
      public_show_reviews: showReviews,
      public_custom_accent: customAccent
    });

    setSaveSuccess(true);
    confetti({ particleCount: 50, spread: 60 });
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const publicUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/u/${cleanHandle}`
    : `https://agendapro.ai/u/${cleanHandle}`;

  const copyPublicLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSaveHandle = () => {
    updatePracticeSettings({ handle: cleanHandle });
    setIsEditingHandle(false);
    setHandleSavedToast(true);
    setTimeout(() => setHandleSavedToast(false), 2500);
  };

  const handleCancelEditHandle = () => {
    setHandleInput(practiceSettings.handle || 'consultorio-medico');
    setIsEditingHandle(false);
  };

  const handleShare = async () => {
    const shareData = {
      title: `${practiceSettings.practice_name || 'Consultorio Médico'} - Turnos Online`,
      text: `Agenda tu turno online con ${practiceSettings.professional_name || 'nosotros'} ingresando a:`,
      url: publicUrl,
    };

    if (navigator.share && typeof navigator.canShare === 'function' && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
      }
    }
    setShowShareModal(true);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-neutral-900 text-white">
              <Palette className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-neutral-900 tracking-tight">
                Editor de Página Pública & Portal
              </h1>
              <p className="text-xs text-neutral-500">
                Personaliza la estética, foto de perfil, bordes y modelo de diseño que verán tus pacientes al reservar.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleShare}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-neutral-200 hover:bg-neutral-50 text-neutral-700 transition flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-2xs"
            title="Compartir enlace de reservas por WhatsApp, correo o redes"
          >
            <Share2 className="w-4 h-4 text-emerald-600" />
            <span>Compartir</span>
          </button>

          <button
            onClick={copyPublicLink}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-neutral-200 hover:bg-neutral-50 text-neutral-700 transition flex items-center gap-1.5"
            title="Copiar enlace de reserva"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-neutral-500" />}
            <span>{copiedLink ? '¡Enlace copiado!' : 'Copiar Enlace'}</span>
          </button>

          {onNavigateToTab && (
            <button
              onClick={() => {
                handleSave();
                onNavigateToTab('portal');
              }}
              className="px-3 py-2 text-xs font-semibold rounded-xl border border-neutral-200 hover:bg-neutral-50 text-neutral-700 transition flex items-center gap-1.5"
            >
              <Eye className="w-4 h-4 text-neutral-500" />
              <span>Ver Pantalla Completa</span>
            </button>
          )}

          <button
            onClick={handleSave}
            className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5"
          >
            {saveSuccess ? (
              <>
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>¡Diseño Guardado!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Guardar Cambios</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Featured Unique Public Link Card */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 text-white rounded-2xl p-6 border border-sky-800/80 shadow-md space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-500/20 text-sky-300 border border-sky-400/30 flex items-center gap-1">
                <Globe className="w-3 h-3" />
                Enlace Público Único de Reservas
              </span>
              <span className="text-xs text-slate-300 hidden sm:inline">Tus pacientes ingresan directamente a este link para agendar turnos</span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white">
              Personaliza tu URL pública oficial
            </h3>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleShare}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
              title="Compartir link por WhatsApp, correo o redes sociales"
            >
              <Share2 className="w-4 h-4 text-emerald-100" />
              <span>Compartir</span>
            </button>

            <button
              type="button"
              onClick={copyPublicLink}
              className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              <span>{copiedLink ? '¡Enlace copiado!' : 'Copiar Enlace'}</span>
            </button>

            <a
              href={`/u/${cleanHandle}`}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 border border-slate-700"
            >
              <ExternalLink className="w-4 h-4 text-sky-400" />
              <span>Abrir Página Pública</span>
            </a>
          </div>
        </div>

        {/* Interactive URL Form Field with Lock & Edit Protection */}
        <div className="bg-slate-950/80 border border-slate-700/80 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div
            className={`flex-1 flex items-center rounded-lg px-3 py-2 font-mono text-xs sm:text-sm transition-all ${
              isEditingHandle
                ? 'bg-slate-900 border-2 border-sky-500 text-white ring-2 ring-sky-500/20'
                : 'bg-slate-900/90 border border-slate-700/90 text-slate-300'
            }`}
          >
            <span className="text-slate-500 select-none shrink-0">https://agendapro.ai/u/</span>
            <input
              type="text"
              value={handleInput}
              readOnly={!isEditingHandle}
              disabled={!isEditingHandle}
              onChange={(e) => {
                const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                setHandleInput(val);
              }}
              placeholder="consultorio-medico"
              className={`bg-transparent font-bold flex-1 ml-0.5 min-w-0 transition-colors ${
                isEditingHandle
                  ? 'text-sky-300 focus:outline-none'
                  : 'text-slate-300 cursor-not-allowed select-all'
              }`}
            />

            {/* Lock / Protected Status indicator */}
            {!isEditingHandle ? (
              <span
                className="shrink-0 ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-sans font-semibold bg-slate-800/90 text-emerald-400 border border-slate-700 select-none"
                title="Este enlace está guardado y protegido contra sobreescrituras accidentales"
              >
                <Lock className="w-3 h-3 text-emerald-400" />
                <span>Bloqueado</span>
              </span>
            ) : (
              <span
                className="shrink-0 ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-sans font-semibold bg-sky-950 text-sky-300 border border-sky-700/60 select-none"
                title="Modo edición activo. Modifica el nombre y haz clic en Guardar Link"
              >
                <Pencil className="w-3 h-3 text-sky-400" />
                <span>Editando</span>
              </span>
            )}
          </div>

          {/* Action Buttons: Unlock with Pencil OR Save / Cancel */}
          {!isEditingHandle ? (
            <button
              type="button"
              onClick={() => setIsEditingHandle(true)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-sky-300 hover:text-white text-xs font-semibold rounded-lg transition shrink-0 flex items-center justify-center gap-1.5 border border-slate-700 active:scale-95 cursor-pointer shadow-xs"
              title="Haz clic para desbloquear y editar el enlace único"
            >
              <Pencil className="w-3.5 h-3.5 text-sky-400" />
              <span>Editar link</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleSaveHandle}
                className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{handleSavedToast ? '¡Guardado!' : 'Guardar Link'}</span>
              </button>
              <button
                type="button"
                onClick={handleCancelEditHandle}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-medium rounded-lg transition border border-slate-700/80 cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>

        {/* Quick Suggestions Chips (Purely Informational Suggestions, NOT Clickable to overwrite) */}
        <div className="flex items-center gap-2 flex-wrap text-xs text-slate-400 pt-1">
          <span className="text-[11px] font-medium text-slate-400">
            Formatos de referencia sugeridos (solo de ejemplo, no modifican tu link):
          </span>
          {['consultorio-medico', 'dr-gonzalez', 'odontologia-integral', 'clinica-dental', 'salud-bienestar'].map(slug => (
            <span
              key={slug}
              className="px-2.5 py-1 rounded-md bg-slate-800/80 text-slate-300 border border-slate-700/80 text-[11px] font-mono select-none cursor-default"
              title="Formato de ejemplo recomendado"
            >
              {slug}
            </span>
          ))}
        </div>
      </div>

      {/* Main Grid: Controls on Left, Live Simulator on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Design Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Controls Tabs */}
          <div className="flex bg-neutral-100 p-1 rounded-xl gap-1">
            <button
              onClick={() => setActiveSettingsTab('theme')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 ${
                activeSettingsTab === 'theme' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Tema & Estilo</span>
            </button>

            <button
              onClick={() => setActiveSettingsTab('photo')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 ${
                activeSettingsTab === 'photo' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Foto & Bordes</span>
            </button>

            <button
              onClick={() => setActiveSettingsTab('content')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 ${
                activeSettingsTab === 'content' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Type className="w-3.5 h-3.5" />
              <span>Bio & Badges</span>
            </button>

            <button
              onClick={() => setActiveSettingsTab('fields')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 ${
                activeSettingsTab === 'fields' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Campos</span>
            </button>
          </div>

          {/* TAB 1: THEME PRESETS */}
          {activeSettingsTab === 'theme' && (
            <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs space-y-4">
              <div>
                <h3 className="text-sm font-bold text-neutral-900">Modelos de Diseño Premium</h3>
                <p className="text-xs text-neutral-500">Selecciona la paleta y atmósfera que mejor represente a tu clínica o consultorio.</p>
              </div>

              <div className="space-y-2.5">
                {THEMES.map((theme) => {
                  const isSelected = themePreset === theme.id;
                  return (
                    <div
                      key={theme.id}
                      onClick={() => {
                        setThemePreset(theme.id);
                        setCustomAccent(theme.accentColor);
                      }}
                      className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                        isSelected
                          ? 'border-neutral-900 bg-neutral-50/80 ring-2 ring-neutral-900/10'
                          : 'border-neutral-200 hover:border-neutral-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-7 h-7 rounded-lg border flex items-center justify-center text-xs font-bold text-white shadow-2xs"
                          style={{ backgroundColor: theme.accentColor }}
                        >
                          {isSelected && <Check className="w-4 h-4 text-white" />}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-neutral-900">{theme.name}</div>
                          <div className="text-[11px] text-neutral-500">{theme.tagline}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <span className={`w-3 h-3 rounded-full ${theme.bgClass} border border-neutral-300`} />
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.accentColor }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Color Picker / Accent */}
              <div className="pt-3 border-t border-neutral-100 space-y-2">
                <label className="text-xs font-semibold text-neutral-800 flex items-center justify-between">
                  <span>Color de Acento Principal</span>
                  <span className="text-[11px] font-mono text-neutral-500">{customAccent}</span>
                </label>
                <div className="flex items-center gap-2">
                  {['#0284c7', '#0d9488', '#171717', '#8a6240', '#4f46e5', '#e11d48', '#d97706'].map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setCustomAccent(color)}
                      className={`w-7 h-7 rounded-full transition transform hover:scale-110 flex items-center justify-center border ${
                        customAccent === color ? 'ring-2 ring-neutral-900 ring-offset-2' : 'border-neutral-300'
                      }`}
                      style={{ backgroundColor: color }}
                    >
                      {customAccent === color && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))}
                  <input
                    type="color"
                    value={customAccent}
                    onChange={(e) => setCustomAccent(e.target.value)}
                    className="w-7 h-7 rounded-lg cursor-pointer border border-neutral-200"
                    title="Elegir color personalizado"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PROFILE PHOTO, ALIGNMENT & BORDERS */}
          {activeSettingsTab === 'photo' && (
            <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs space-y-5">
              <div>
                <h3 className="text-sm font-bold text-neutral-900">Foto de Perfil Pública</h3>
                <p className="text-xs text-neutral-500">Configura la imagen del profesional o logo institucional.</p>
              </div>

              {/* URL Input & Quick Presets */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-neutral-700">URL de la Imagen / Foto</label>
                <input
                  type="text"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder="https://ejemplo.com/foto-doctor.jpg"
                  className="w-full px-3 py-2 text-xs border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 focus:outline-hidden"
                />

                <div className="pt-1">
                  <span className="text-[11px] text-neutral-500 block mb-1.5">O elige una foto médica de muestra:</span>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {AVATAR_PRESETS.map((preset, idx) => (
                      <img
                        key={idx}
                        src={preset.url}
                        alt={preset.label}
                        onClick={() => setPhotoUrl(preset.url)}
                        className={`w-10 h-10 rounded-xl object-cover cursor-pointer border-2 transition hover:opacity-100 ${
                          photoUrl === preset.url ? 'border-neutral-900 opacity-100' : 'border-neutral-200 opacity-70'
                        }`}
                        title={preset.label}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Photo Shape Selection */}
              <div className="space-y-2 pt-2 border-t border-neutral-100">
                <label className="text-xs font-semibold text-neutral-800">Forma y Bordes de la Foto</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPhotoShape('square')}
                    className={`p-3 rounded-xl border text-center transition flex flex-col items-center gap-1.5 ${
                      photoShape === 'square' ? 'border-neutral-900 bg-neutral-50 font-bold' : 'border-neutral-200 hover:bg-neutral-50'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-none bg-neutral-800 text-white text-[10px] flex items-center justify-center font-bold">
                      Cuadrado
                    </div>
                    <span className="text-xs text-neutral-800">Cuadrado</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPhotoShape('rounded-smooth')}
                    className={`p-3 rounded-xl border text-center transition flex flex-col items-center gap-1.5 ${
                      photoShape === 'rounded-smooth' ? 'border-neutral-900 bg-neutral-50 font-bold' : 'border-neutral-200 hover:bg-neutral-50'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-neutral-800 text-white text-[10px] flex items-center justify-center font-bold">
                      Suave
                    </div>
                    <span className="text-xs text-neutral-800">Redondeado</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPhotoShape('rounded-full')}
                    className={`p-3 rounded-xl border text-center transition flex flex-col items-center gap-1.5 ${
                      photoShape === 'rounded-full' ? 'border-neutral-900 bg-neutral-50 font-bold' : 'border-neutral-200 hover:bg-neutral-50'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-neutral-800 text-white text-[10px] flex items-center justify-center font-bold">
                      Círculo
                    </div>
                    <span className="text-xs text-neutral-800">Circular</span>
                  </button>
                </div>
              </div>

              {/* Photo Alignment Selection */}
              <div className="space-y-2 pt-2 border-t border-neutral-100">
                <label className="text-xs font-semibold text-neutral-800">Alineación del Perfil</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['left', 'center', 'right'] as const).map((align) => (
                    <button
                      key={align}
                      type="button"
                      onClick={() => setPhotoAlign(align)}
                      className={`py-2 px-3 rounded-xl border text-xs font-semibold capitalize transition ${
                        photoAlign === align
                          ? 'border-neutral-900 bg-neutral-900 text-white'
                          : 'border-neutral-200 hover:bg-neutral-50 text-neutral-700'
                      }`}
                    >
                      {align === 'left' ? 'Izquierda' : align === 'center' ? 'Centro' : 'Derecha'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cards Border Style */}
              <div className="space-y-2 pt-2 border-t border-neutral-100">
                <label className="text-xs font-semibold text-neutral-800">Bordes de las Tarjetas y Botones</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'square', label: 'Sobrio (8px)' },
                    { id: 'rounded-smooth', label: 'Suave (16px)' },
                    { id: 'rounded-xl', label: 'Curvo (24px)' }
                  ].map((style) => (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => setCardBorderStyle(style.id as any)}
                      className={`py-2 px-2 rounded-xl border text-xs font-semibold text-center transition ${
                        cardBorderStyle === style.id
                          ? 'border-neutral-900 bg-neutral-900 text-white'
                          : 'border-neutral-200 hover:bg-neutral-50 text-neutral-700'
                      }`}
                    >
                      {style.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BIO, PRESENTATION & BADGES */}
          {activeSettingsTab === 'content' && (
            <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs space-y-4">
              <div>
                <h3 className="text-sm font-bold text-neutral-900">Textos, Biografía & Badges</h3>
                <p className="text-xs text-neutral-500">Transmite confianza y destaca los diferenciales de tu atención.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-700">Badge o Etiqueta Destacada</label>
                <input
                  type="text"
                  value={badgeText}
                  onChange={(e) => setBadgeText(e.target.value)}
                  placeholder="Ej. Atención Particular y OSDE • Turnos Inmediatos"
                  className="w-full px-3 py-2 text-xs border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 focus:outline-hidden"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-700">Presentación / Bio Profesional</label>
                <textarea
                  rows={4}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Breve reseña sobre tu trayectoria, enfoque clínico o diferenciales..."
                  className="w-full px-3 py-2 text-xs border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 focus:outline-hidden resize-none leading-relaxed"
                />
                <span className="text-[10px] text-neutral-400 block text-right">{bio.length} caracteres</span>
              </div>

              <div className="pt-2 border-t border-neutral-100 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-neutral-900">Mostrar Calificación y Reseñas</div>
                  <div className="text-[11px] text-neutral-500">Muestra insignia de 4.9 ★ basada en opiniones verificadas</div>
                </div>
                <input
                  type="checkbox"
                  checked={showReviews}
                  onChange={(e) => setShowReviews(e.target.checked)}
                  className="w-4 h-4 rounded text-neutral-900 accent-neutral-900 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* TAB 4: CAMPOS OBLIGATORIOS */}
          {activeSettingsTab === 'fields' && (
            <div className="space-y-4">
              <RequiredFieldsSettings />
            </div>
          )}
        </div>

        {/* Right Column: Live Simulator (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          {/* Simulator Toolbar */}
          <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-xl border border-neutral-200 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold text-neutral-700">Simulador en Vivo</span>
            </div>

            <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setPreviewDevice('desktop')}
                className={`p-1.5 rounded text-xs transition flex items-center gap-1 ${
                  previewDevice === 'desktop' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500 hover:text-neutral-900'
                }`}
                title="Vista de Escritorio"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span className="text-[11px] font-medium hidden sm:inline">Escritorio</span>
              </button>

              <button
                type="button"
                onClick={() => setPreviewDevice('mobile')}
                className={`p-1.5 rounded text-xs transition flex items-center gap-1 ${
                  previewDevice === 'mobile' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500 hover:text-neutral-900'
                }`}
                title="Vista Móvil"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="text-[11px] font-medium hidden sm:inline">Móvil</span>
              </button>
            </div>
          </div>

          {/* Device Frame */}
          <div className="flex justify-center">
            <div
              className={`transition-all duration-300 w-full ${
                previewDevice === 'mobile' ? 'max-w-sm rounded-[36px] p-3 bg-neutral-900 shadow-xl border-4 border-neutral-800' : 'w-full'
              }`}
            >
              {/* Dynamic Theme Container */}
              <div
                className={`w-full overflow-hidden transition-all duration-200 ${
                  currentThemeObj.bgClass
                } ${
                  previewDevice === 'mobile'
                    ? 'rounded-[28px] min-h-[580px] p-3 text-xs'
                    : 'rounded-2xl p-6 border border-neutral-200 min-h-[560px]'
                }`}
              >
                {/* Simulated URL bar for mobile */}
                {previewDevice === 'mobile' && (
                  <div className="w-full bg-neutral-200/60 rounded-full py-1.5 px-3 mb-3 text-[10px] text-neutral-700 text-center font-mono truncate flex items-center justify-center gap-1">
                    <Globe className="w-2.5 h-2.5 text-neutral-500" />
                    <span>agendapro.ai/u/{cleanHandle}</span>
                  </div>
                )}

                {/* Simulated browser bar for desktop */}
                {previewDevice === 'desktop' && (
                  <div className="w-full bg-white/80 backdrop-blur-xs border border-neutral-200/80 rounded-xl py-2 px-4 mb-4 text-xs text-neutral-600 flex items-center justify-between font-mono shadow-2xs">
                    <div className="flex items-center gap-2 truncate">
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                      </div>
                      <span className="text-neutral-300">|</span>
                      <div className="flex items-center gap-1.5 text-neutral-700 truncate text-[11px]">
                        <Globe className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                        <span className="text-neutral-400 font-sans">https://</span>
                        <span className="font-semibold text-neutral-900">agendapro.ai/u/{cleanHandle}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 shrink-0 font-sans">
                      Enlace Activo
                    </span>
                  </div>
                )}

                {/* Patient Portal Header */}
                <div
                  className={`p-5 mb-4 transition-all duration-200 border shadow-xs ${
                    currentThemeObj.cardClass
                  } ${
                    cardBorderStyle === 'square'
                      ? 'rounded-lg'
                      : cardBorderStyle === 'rounded-smooth'
                      ? 'rounded-2xl'
                      : 'rounded-3xl'
                  }`}
                >
                  <div
                    className={`flex flex-col gap-3 ${
                      photoAlign === 'center'
                        ? 'items-center text-center'
                        : photoAlign === 'right'
                        ? 'items-end text-right'
                        : 'items-start text-left'
                    }`}
                  >
                    {/* Profile Photo */}
                    <div className="relative">
                      <img
                        src={photoUrl}
                        alt="Foto Profesional"
                        className={`w-16 h-16 object-cover border-2 shadow-xs ${
                          photoShape === 'square'
                            ? 'rounded-none'
                            : photoShape === 'rounded-smooth'
                            ? 'rounded-2xl'
                            : 'rounded-full'
                        }`}
                        style={{ borderColor: customAccent }}
                      />
                      <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" />
                    </div>

                    {/* Titles */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
                        <h2 className={`font-bold text-base ${currentThemeObj.textClass}`}>
                          {practiceSettings.professional_name || 'Dr/a. Especialista'}
                        </h2>
                        {showReviews && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
                            <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                            4.9 (128)
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-neutral-500 font-medium">
                        {practiceSettings.professional_title || 'Especialista en Salud'} • {practiceSettings.medical_license || 'M.N. 142.890'}
                      </p>

                      {badgeText && (
                        <div className="pt-1">
                          <span className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${currentThemeObj.badgeClass}`}>
                            {badgeText}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Bio presentation */}
                    {bio && (
                      <p className="text-xs text-neutral-600 leading-relaxed max-w-lg pt-1">
                        {bio}
                      </p>
                    )}

                    {/* Location */}
                    <div className="flex items-center gap-1 text-[11px] text-neutral-500 pt-1">
                      <MapPin className="w-3 h-3 text-neutral-400" />
                      <span>{practiceSettings.address || 'Av. Santa Fe 3200, Piso 4'}, {practiceSettings.city || 'Buenos Aires'}</span>
                    </div>
                  </div>
                </div>

                {/* Simulated Step 1: Services List */}
                <div
                  className={`p-4 transition-all duration-200 border shadow-xs space-y-3 ${
                    currentThemeObj.cardClass
                  } ${
                    cardBorderStyle === 'square'
                      ? 'rounded-lg'
                      : cardBorderStyle === 'rounded-smooth'
                      ? 'rounded-2xl'
                      : 'rounded-3xl'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-900">1. Selecciona tu Tratamiento</span>
                    <span className="text-[10px] text-neutral-500">Paso 1 de 3</span>
                  </div>

                  <div className="space-y-2">
                    {services.slice(0, 2).map((srv, idx) => (
                      <div
                        key={srv.id}
                        className={`p-2.5 border rounded-xl flex items-center justify-between transition ${
                          idx === 0
                            ? 'border-neutral-900 bg-neutral-50'
                            : 'border-neutral-200 bg-white'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="text-xs font-bold text-neutral-900">{srv.name}</div>
                          <div className="text-[11px] text-neutral-500 flex items-center gap-2">
                            <span>{srv.duration_minutes} mins</span>
                            <span>•</span>
                            <span className="text-emerald-700 font-semibold">Seña disponible</span>
                          </div>
                        </div>
                        <div className="text-xs font-black text-neutral-900">
                          ${srv.price.toLocaleString('es-AR')}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Simulated Action Button */}
                  <button
                    type="button"
                    className="w-full py-2.5 px-4 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
                    style={{ backgroundColor: customAccent }}
                  >
                    <span>Continuar a Selección de Fecha & Hora</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Share Modal Dialog */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900 font-display">
                    Compartir Enlace de Reservas
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Tus pacientes pueden agendar su turno las 24 hs de forma autónoma.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Direct Link Box with Copy Button */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-700 flex items-center justify-between">
                <span>Tu Enlace Público Oficial</span>
                <span className="text-[11px] text-emerald-600 font-medium">Listo para compartir</span>
              </label>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-neutral-50 border border-neutral-200">
                <Globe className="w-4 h-4 text-sky-600 shrink-0 ml-1" />
                <input
                  type="text"
                  readOnly
                  value={publicUrl}
                  className="bg-transparent text-xs font-mono text-neutral-800 flex-1 focus:outline-none select-all truncate"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(publicUrl);
                    setCopiedShareLink(true);
                    setTimeout(() => setCopiedShareLink(false), 2000);
                  }}
                  className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold rounded-lg transition flex items-center gap-1.5 shrink-0 shadow-2xs cursor-pointer active:scale-95"
                >
                  {copiedShareLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedShareLink ? '¡Copiado!' : 'Copiar'}</span>
                </button>
              </div>
            </div>

            {/* Quick Sharing Options */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-neutral-700 block">
                Opciones directas de difusión:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* WhatsApp */}
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                    `¡Hola! Podés agendar tu turno médico online de manera rápida y directa con ${practiceSettings.professional_name || practiceSettings.practice_name || 'nosotros'} ingresando a este enlace:\n${publicUrl}`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100/70 text-emerald-900 flex items-center gap-3 transition group cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="text-xs font-bold truncate">Enviar por WhatsApp</div>
                    <div className="text-[10px] text-emerald-700">Mensaje predeterminado</div>
                  </div>
                </a>

                {/* Email */}
                <a
                  href={`mailto:?subject=${encodeURIComponent(
                    `Reserva tu turno online - ${practiceSettings.practice_name || 'Consultorio'}`
                  )}&body=${encodeURIComponent(
                    `Hola,\n\nPodés agendar tu consulta médica online ingresando a nuestro portal oficial:\n${publicUrl}\n\n¡Esperamos tu visita!`
                  )}`}
                  className="p-3 rounded-xl border border-sky-200 bg-sky-50/70 hover:bg-sky-100/70 text-sky-900 flex items-center gap-3 transition group cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="text-xs font-bold truncate">Enviar por Email</div>
                    <div className="text-[10px] text-sky-700">Para tus pacientes</div>
                  </div>
                </a>
              </div>
            </div>

            {/* Instagram / Social Media Bio Text Snippet */}
            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-neutral-800">
                  Para tu biografía de Instagram o estado de WhatsApp:
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`📅 Agendá tu turno online las 24 hs aquí 👉 ${publicUrl}`);
                    setCopiedBioSnippet(true);
                    setTimeout(() => setCopiedBioSnippet(false), 2000);
                  }}
                  className="text-[11px] font-semibold text-sky-700 hover:text-sky-800 flex items-center gap-1 cursor-pointer"
                >
                  {copiedBioSnippet ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedBioSnippet ? '¡Texto copiado!' : 'Copiar texto'}</span>
                </button>
              </div>
              <p className="text-[11px] font-mono text-neutral-600 bg-white p-2 rounded-lg border border-neutral-200 select-all">
                📅 Agendá tu turno online las 24 hs aquí 👉 {publicUrl}
              </p>
            </div>

            {/* QR Code section */}
            <div className="flex items-center gap-3 p-3 bg-neutral-900 text-white rounded-xl">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(publicUrl)}`}
                alt="Código QR del portal de turnos"
                className="w-14 h-14 bg-white p-1 rounded-lg shrink-0"
              />
              <div className="space-y-1 flex-1 min-w-0">
                <div className="text-xs font-bold flex items-center gap-1.5 text-neutral-100">
                  <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Código QR para Recepción</span>
                </div>
                <p className="text-[11px] text-neutral-400">
                  Imprime este código y colócalo en el mostrador para que tus pacientes reserven escaneando con su celular.
                </p>
              </div>
              <a
                href={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(publicUrl)}`}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold shrink-0 transition border border-white/10"
              >
                Ver QR
              </a>
            </div>

            {/* Close footer */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
