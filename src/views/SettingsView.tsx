import React, { useState } from 'react';
import { Settings, Save, RotateCcw, Bot, Building2, Phone, Sparkles, Check } from 'lucide-react';
import { useAgendaStore } from '../lib/store';
import { PracticeSettings } from '../types';

export const SettingsView: React.FC = () => {
  const { practiceSettings, updatePracticeSettings, resetToDemoData } = useAgendaStore();

  const [formData, setFormData] = useState<PracticeSettings>(practiceSettings);
  const [savedNotice, setSavedNotice] = useState(false);

  const handleChange = (field: keyof PracticeSettings, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updatePracticeSettings(formData);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-neutral-100 text-neutral-800 flex items-center justify-center">
            <Settings className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-neutral-900">Configuración General</h2>
            <p className="text-xs text-neutral-500">
              Datos del consultorio, perfil del profesional y parámetros del asistente IA
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (confirm('¿Restablecer los datos a los valores de demostración iniciales?')) {
                resetToDemoData();
                setFormData(practiceSettings);
                alert('Datos restablecidos con éxito.');
              }
            }}
            className="px-3 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Demo Reset
          </button>

          <button
            onClick={handleSave}
            className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            {savedNotice ? '¡Guardado!' : 'Guardar Cambios'}
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Practice & Professional Info */}
        <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-neutral-100">
            <Building2 className="w-4 h-4 text-sky-600" />
            <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
              Datos del Consultorio & Profesional
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-neutral-700 block mb-1.5">
                Nombre de la Clínica o Consultorio
              </label>
              <input
                type="text"
                value={formData.practice_name}
                onChange={e => handleChange('practice_name', e.target.value)}
                className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-700 block mb-1.5">
                Identificador URL Público (slug)
              </label>
              <div className="flex items-center bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs">
                <span className="text-neutral-400 font-mono">agendapro.ai/u/</span>
                <input
                  type="text"
                  value={formData.handle}
                  onChange={e => handleChange('handle', e.target.value)}
                  className="bg-transparent font-mono text-neutral-900 font-bold focus:outline-none flex-1 ml-0.5"
                  required
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-neutral-700 block mb-1.5">
                Nombre del Profesional Titular
              </label>
              <input
                type="text"
                value={formData.professional_name}
                onChange={e => handleChange('professional_name', e.target.value)}
                className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-700 block mb-1.5">
                Especialidad Médica / Profesional
              </label>
              <input
                type="text"
                value={formData.specialty}
                onChange={e => handleChange('specialty', e.target.value)}
                className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-neutral-700 block mb-1.5">
                Dirección física
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={e => handleChange('address', e.target.value)}
                className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-700 block mb-1.5">
                Ciudad / Zona
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={e => handleChange('city', e.target.value)}
                className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-neutral-700 block mb-1.5">
                Número de WhatsApp oficial
              </label>
              <input
                type="tel"
                value={formData.whatsapp_number}
                onChange={e => handleChange('whatsapp_number', e.target.value)}
                className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-700 block mb-1.5">
                Email de contacto
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={e => handleChange('email', e.target.value)}
                className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>
        </div>

        {/* AI Assistant Personality & Automation Settings */}
        <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-neutral-100">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
              Parámetros de la Asistente Virtual IA
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-neutral-700 block mb-1.5">
                Nombre del Asistente
              </label>
              <input
                type="text"
                value={formData.bot_assistant_name}
                onChange={e => handleChange('bot_assistant_name', e.target.value)}
                placeholder="Ej. Sofía"
                className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-700 block mb-1.5">
                Tono de comunicación
              </label>
              <input
                type="text"
                value={formData.bot_tone}
                onChange={e => handleChange('bot_tone', e.target.value)}
                placeholder="Ej. cálido, empático y resolutivo"
                className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-neutral-700 block mb-1.5">
              Mensaje de bienvenida automático del WhatsApp
            </label>
            <textarea
              rows={2}
              value={formData.welcome_message}
              onChange={e => handleChange('welcome_message', e.target.value)}
              className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 leading-relaxed"
            />
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between p-3.5 bg-neutral-50 rounded-xl border border-neutral-200">
              <div>
                <p className="text-xs font-bold text-neutral-900">Auto-confirmar reservas de la web y bot</p>
                <p className="text-[11px] text-neutral-500">
                  Si se desactiva, los turnos ingresarán en estado "Pendiente" hasta que el profesional los apruebe.
                </p>
              </div>
              <input
                type="checkbox"
                checked={formData.auto_confirm_bookings}
                onChange={e => handleChange('auto_confirm_bookings', e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 bg-neutral-50 rounded-xl border border-neutral-200">
              <div>
                <p className="text-xs font-bold text-neutral-900">Habilitar servicio de Telemedicina</p>
                <p className="text-[11px] text-neutral-500">
                  Permite agendar videollamadas online y genera enlaces virtuales automáticamente.
                </p>
              </div>
              <input
                type="checkbox"
                checked={formData.allow_telemedicine}
                onChange={e => handleChange('allow_telemedicine', e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
