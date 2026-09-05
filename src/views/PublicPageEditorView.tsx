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
  RefreshCw
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAgendaStore } from '../lib/store';
import { PracticeSettings } from '../types';

interface PublicPageEditorViewProps {
  onNavigateToTab?: (tab: string) => void;
}

export const PublicPageEditorView: React.FC<PublicPageEditorViewProps> = ({ onNavigateToTab }) => {
  const { practiceSettings, updatePracticeSettings, services } = useAgendaStore();

  // Local form state for immediate responsive live editing
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
  const [activeSettingsTab, setActiveSettingsTab] = useState<'theme' | 'photo' | 'content'>('theme');
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

  const handleSave = () => {
    updatePracticeSettings({
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

  const publicUrl = `https://agendapro.ai/u/${practiceSettings.handle || 'consultorio-medico'}`;

  const copyPublicLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
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
                  <div className="w-full bg-neutral-200/50 rounded-full py-1 px-3 mb-3 text-[10px] text-neutral-600 text-center font-mono truncate">
                    agendapro.ai/u/{practiceSettings.handle || 'consultorio-medico'}
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
    </div>
  );
};
