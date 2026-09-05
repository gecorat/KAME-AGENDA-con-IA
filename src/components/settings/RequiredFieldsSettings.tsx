import React, { useState } from 'react';
import { CheckSquare, Square, ShieldCheck, Sparkles, Globe, MessageSquare, Save, Check } from 'lucide-react';
import { useAgendaStore } from '../../lib/store';
import { BookingRequiredFields, PracticeSettings } from '../../types';

interface RequiredFieldsSettingsProps {
  initialPortalFields?: BookingRequiredFields;
  initialBotFields?: BookingRequiredFields;
  onSaveSuccess?: () => void;
  standalone?: boolean;
}

const DEFAULT_REQUIRED: BookingRequiredFields = {
  full_name: true,
  phone: true,
  dni: false,
  email: false,
  insurance: false,
  reason: false,
  address: false
};

export const RequiredFieldsSettings: React.FC<RequiredFieldsSettingsProps> = ({
  initialPortalFields,
  initialBotFields,
  onSaveSuccess,
  standalone = false
}) => {
  const { practiceSettings, updatePracticeSettings } = useAgendaStore();

  const [portalFields, setPortalFields] = useState<BookingRequiredFields>(() => {
    return initialPortalFields || practiceSettings.booking_required_fields || DEFAULT_REQUIRED;
  });

  const [botFields, setBotFields] = useState<BookingRequiredFields>(() => {
    return initialBotFields || practiceSettings.bot_required_fields || DEFAULT_REQUIRED;
  });

  const [saved, setSaved] = useState(false);

  const togglePortalField = (field: keyof BookingRequiredFields) => {
    // Nombre y Apellido + WhatsApp son obligatorios por definición básica
    if (field === 'full_name' || field === 'phone') return;
    setPortalFields(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const toggleBotField = (field: keyof BookingRequiredFields) => {
    if (field === 'full_name' || field === 'phone') return;
    setBotFields(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSave = () => {
    updatePracticeSettings({
      booking_required_fields: portalFields,
      bot_required_fields: botFields
    });
    setSaved(true);
    onSaveSuccess?.();
    setTimeout(() => setSaved(false), 2500);
  };

  const FIELD_DEFINITIONS: { key: keyof BookingRequiredFields; label: string; description: string; isDefaultMandatory?: boolean }[] = [
    {
      key: 'full_name',
      label: 'Nombre y Apellido',
      description: 'Identificación esencial del paciente para la ficha médica.',
      isDefaultMandatory: true
    },
    {
      key: 'phone',
      label: 'WhatsApp / Teléfono Móvil',
      description: 'Canal de comunicación para enviar confirmaciones y recordatorios.',
      isDefaultMandatory: true
    },
    {
      key: 'dni',
      label: 'DNI / Documento de Identidad',
      description: 'Requerido para confección de historia clínica legal o facturación.',
      isDefaultMandatory: false
    },
    {
      key: 'email',
      label: 'Correo Electrónico',
      description: 'Envío de recibos digitales y recordatorios por email.',
      isDefaultMandatory: false
    },
    {
      key: 'insurance',
      label: 'Obra Social o Prepaga',
      description: 'Nombre de la cobertura médica y número de afiliado.',
      isDefaultMandatory: false
    },
    {
      key: 'reason',
      label: 'Motivo de Consulta o Comentario',
      description: 'Breve descripción del dolor o afección para preparar la consulta.',
      isDefaultMandatory: false
    },
    {
      key: 'address',
      label: 'Domicilio o Ciudad de Residencia',
      description: 'Dirección para fichas clínicas o telemedicina.',
      isDefaultMandatory: false
    }
  ];

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-2xs space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-neutral-900 text-white flex items-center justify-center font-bold text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900 font-display">
                Datos Obligatorios para Agendar Turnos
              </h3>
              <p className="text-xs text-neutral-500">
                Tilda qué campos son obligatorios en tu portal web público y en las conversaciones del Bot de WhatsApp.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            className={`px-4 py-2 text-xs font-semibold rounded-xl shadow-2xs transition-all flex items-center gap-1.5 ${
              saved
                ? 'bg-emerald-600 text-white'
                : 'bg-neutral-900 hover:bg-neutral-800 text-white active:scale-98'
            }`}
          >
            {saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            <span>{saved ? 'Guardado con éxito' : 'Guardar Cambios'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SECTION 1: PORTAL WEB */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xs overflow-hidden flex flex-col">
          <div className="p-4 bg-sky-50/70 border-b border-sky-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-sky-700" />
              <div>
                <h4 className="text-xs font-bold text-sky-950 uppercase tracking-wider">
                  Página Web de Turnos (Portal Paciente)
                </h4>
                <p className="text-[11px] text-sky-700">
                  Formulario público que completan los pacientes al reservar.
                </p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-sky-800 border border-sky-200">
              Web
            </span>
          </div>

          <div className="p-4 divide-y divide-neutral-100 flex-1">
            {FIELD_DEFINITIONS.map(field => {
              const isChecked = portalFields[field.key] ?? false;
              const isLocked = field.isDefaultMandatory;

              return (
                <div
                  key={field.key}
                  onClick={() => togglePortalField(field.key)}
                  className={`py-3 flex items-start gap-3 select-none transition-colors ${
                    isLocked ? 'opacity-90 cursor-default' : 'cursor-pointer hover:bg-neutral-50/70'
                  }`}
                >
                  <div className="pt-0.5 shrink-0">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={isLocked}
                      onChange={() => togglePortalField(field.key)}
                      className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-neutral-300 cursor-pointer disabled:cursor-default"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-neutral-900">
                        {field.label}
                      </span>
                      {isLocked ? (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-neutral-100 text-neutral-700 border border-neutral-200">
                          Predeterminado (Fijo)
                        </span>
                      ) : isChecked ? (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-sky-100 text-sky-800">
                          Obligatorio *
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-neutral-50 text-neutral-400">
                          Opcional
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-500 mt-0.5 leading-snug">
                      {field.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SECTION 2: WHATSAPP BOT */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xs overflow-hidden flex flex-col">
          <div className="p-4 bg-emerald-50/70 border-b border-emerald-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-700" />
              <div>
                <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                  Bot Asistente para WhatsApp (IA)
                </h4>
                <p className="text-[11px] text-emerald-700">
                  Datos que el bot exige al paciente antes de confirmar la cita.
                </p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-emerald-800 border border-emerald-200">
              WhatsApp
            </span>
          </div>

          <div className="p-4 divide-y divide-neutral-100 flex-1">
            {FIELD_DEFINITIONS.map(field => {
              const isChecked = botFields[field.key] ?? false;
              const isLocked = field.isDefaultMandatory;

              return (
                <div
                  key={field.key}
                  onClick={() => toggleBotField(field.key)}
                  className={`py-3 flex items-start gap-3 select-none transition-colors ${
                    isLocked ? 'opacity-90 cursor-default' : 'cursor-pointer hover:bg-neutral-50/70'
                  }`}
                >
                  <div className="pt-0.5 shrink-0">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={isLocked}
                      onChange={() => toggleBotField(field.key)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-neutral-300 cursor-pointer disabled:cursor-default"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-neutral-900">
                        {field.label}
                      </span>
                      {isLocked ? (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-neutral-100 text-neutral-700 border border-neutral-200">
                          Predeterminado (Fijo)
                        </span>
                      ) : isChecked ? (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">
                          Exigido por Bot *
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-neutral-50 text-neutral-400">
                          No exigido
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-500 mt-0.5 leading-snug">
                      {field.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Save Button Bar */}
      <div className="flex items-center justify-between bg-neutral-50 p-4 rounded-xl border border-neutral-200">
        <p className="text-xs text-neutral-500">
          Los cambios se aplican de forma inmediata en el portal online y en el simulador / bot de WhatsApp.
        </p>

        <button
          type="button"
          onClick={handleSave}
          className={`px-5 py-2 text-xs font-semibold rounded-xl shadow-2xs transition-all flex items-center gap-1.5 ${
            saved
              ? 'bg-emerald-600 text-white'
              : 'bg-neutral-900 hover:bg-neutral-800 text-white'
          }`}
        >
          {saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
          <span>{saved ? 'Guardado con éxito' : 'Guardar Datos Obligatorios'}</span>
        </button>
      </div>
    </div>
  );
};
