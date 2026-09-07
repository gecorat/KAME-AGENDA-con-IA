import React from 'react';
import { 
  Briefcase, 
  Check, 
  Stethoscope, 
  Activity, 
  Brain, 
  Zap, 
  Apple, 
  Sparkles, 
  Heart, 
  Target, 
  BookOpen, 
  Scale, 
  Users,
  Edit3
} from 'lucide-react';
import { PracticeSettings, ProfessionCategory, ClientTerminology } from '../../types';
import { PROFESSION_OPTIONS, getProfessionInfo } from '../../lib/terminology';

interface ProfessionSettingsProps {
  settings: PracticeSettings;
  onChange: (field: keyof PracticeSettings, value: any) => void;
}

const ICONS_MAP: Record<string, React.ReactNode> = {
  Stethoscope: <Stethoscope className="w-5 h-5 text-sky-600" />,
  Activity: <Activity className="w-5 h-5 text-emerald-600" />,
  Brain: <Brain className="w-5 h-5 text-indigo-600" />,
  Zap: <Zap className="w-5 h-5 text-amber-600" />,
  Apple: <Apple className="w-5 h-5 text-lime-600" />,
  Sparkles: <Sparkles className="w-5 h-5 text-pink-600" />,
  Heart: <Heart className="w-5 h-5 text-red-600" />,
  Target: <Target className="w-5 h-5 text-blue-600" />,
  BookOpen: <BookOpen className="w-5 h-5 text-purple-600" />,
  Scale: <Scale className="w-5 h-5 text-slate-700" />,
  Briefcase: <Briefcase className="w-5 h-5 text-neutral-700" />,
};

export const ProfessionSettings: React.FC<ProfessionSettingsProps> = ({ settings, onChange }) => {
  const currentCategory = settings.profession_category || 'odontologia';
  const currentTerm: ClientTerminology = settings.client_term || 'pacientes';

  const handleSelectCategory = (cat: ProfessionCategory) => {
    onChange('profession_category', cat);
    const info = PROFESSION_OPTIONS.find(p => p.id === cat);
    if (info) {
      // Always synchronize client terminology to match the profession
      onChange('client_term', info.defaultClientTerm);
      // Synchronize professional title and specialty to the profession's defaults
      onChange('professional_title', info.defaultTitle);
      onChange('specialty', info.defaultSpecialty);
    }
  };

  const currentInfo = getProfessionInfo(settings);

  return (
    <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
        <div className="flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-neutral-700" />
          <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider font-display">
            Rubro, Profesión y Terminología
          </h3>
        </div>
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-neutral-900 text-white">
          {currentInfo.badgeLabel}
        </span>
      </div>

      <p className="text-xs text-neutral-600 leading-relaxed">
        Personaliza Agenfacil para tu actividad profesional o empresa de servicios. El sistema adaptará automáticamente el lenguaje de los turnos, las fichas y las secciones clínicas o de seguimiento.
      </p>

      {/* Grid of Profession Categories */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-neutral-800 block">
          1. Selecciona tu Área o Tipo de Servicio:
        </label>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
          {PROFESSION_OPTIONS.map((opt) => {
            const isSelected = currentCategory === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelectCategory(opt.id)}
                className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between gap-2 ${
                  isSelected
                    ? 'bg-sky-50/70 border-sky-600 ring-2 ring-sky-500/20 shadow-2xs'
                    : 'bg-white hover:bg-neutral-50/80 border-neutral-200 text-neutral-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0">
                    {ICONS_MAP[opt.icon] || <Briefcase className="w-4 h-4 text-neutral-600" />}
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-sky-600 text-white flex items-center justify-center">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="text-xs font-bold text-neutral-900 leading-tight">
                    {opt.name}
                  </h4>
                  <p className="text-[10px] text-neutral-500 mt-1 line-clamp-2">
                    {opt.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Profession/Service Name if 'otro_personalizado' */}
      {currentCategory === 'otro_personalizado' && (
        <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl space-y-2 text-xs animate-in fade-in duration-150">
          <label className="font-bold text-amber-950 flex items-center gap-1.5">
            <Edit3 className="w-3.5 h-3.5 text-amber-700" />
            Escribe tu Profesión, Oficio o Servicio Personalizado:
          </label>
          <input
            type="text"
            value={settings.custom_profession_name || ''}
            onChange={(e) => onChange('custom_profession_name', e.target.value)}
            placeholder="Ej. Taller Mecánico, Entrenador Personal, Consultor Financiero..."
            className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      )}

      {/* Client Terminology Preference */}
      <div className="space-y-3 pt-2 border-t border-neutral-100">
        <div>
          <label className="text-xs font-bold text-neutral-800 block flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-neutral-600" />
            2. ¿Cómo prefieres llamar a las personas que atiendes?
          </label>
          <p className="text-[11px] text-neutral-500 mt-0.5">
            Esto adaptará los botones, tablas y mensajes a tu público:
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {[
            { id: 'pacientes', label: 'Pacientes', desc: 'Para salud y medicina' },
            { id: 'clientes', label: 'Clientes', desc: 'Para servicios y estética' },
            { id: 'consultantes', label: 'Consultantes', desc: 'Para psicología / coaching' },
            { id: 'alumnos', label: 'Alumnos', desc: 'Para clases y educación' }
          ].map((term) => {
            const isSelected = currentTerm === term.id;
            return (
              <button
                key={term.id}
                type="button"
                onClick={() => onChange('client_term', term.id as ClientTerminology)}
                className={`p-3 rounded-xl border text-center transition-all ${
                  isSelected
                    ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs font-bold'
                    : 'bg-white hover:bg-neutral-50 border-neutral-200 text-neutral-800'
                }`}
              >
                <span className="block text-xs font-bold">{term.label}</span>
                <span className={`block text-[10px] mt-0.5 ${isSelected ? 'text-neutral-300' : 'text-neutral-500'}`}>
                  {term.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
