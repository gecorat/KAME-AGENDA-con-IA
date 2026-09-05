import React, { useState } from 'react';
import {
  Settings,
  Save,
  RotateCcw,
  Bot,
  Building2,
  Sparkles,
  ShieldCheck,
  Key,
  Landmark,
  Crown,
  UserCheck,
  ArrowRightLeft,
  Lock,
  Calendar
} from 'lucide-react';
import { useAgendaStore } from '../lib/store';
import { PracticeSettings } from '../types';
import { PatientDepositSettings } from '../components/settings/PatientDepositSettings';
import { SuperAdminApiSettings } from '../components/settings/SuperAdminApiSettings';

export const SettingsView: React.FC = () => {
  const {
    practiceSettings,
    updatePracticeSettings,
    resetToDemoData,
    currentUser,
    switchUserRole
  } = useAgendaStore();

  const [formData, setFormData] = useState<PracticeSettings>(practiceSettings);
  const isSuperAdmin = currentUser.email === 'gonzalocorat@gmail.com' && currentUser.isSuperAdmin;

  const [activeTab, setActiveTab] = useState<'general' | 'deposits' | 'apis' | 'workspace'>('general');
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

  const handleRoleToggle = () => {
    if (isSuperAdmin) {
      switchUserRole('professional');
      if (activeTab === 'apis') {
        setActiveTab('general');
      }
    } else {
      switchUserRole('superadmin');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Top Role & Session Bar */}
      <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-xs ${
            isSuperAdmin ? 'bg-neutral-900' : 'bg-sky-600'
          }`}>
            {isSuperAdmin ? <Crown className="w-5 h-5 text-amber-400" /> : <UserCheck className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-neutral-900 font-display">
                {isSuperAdmin ? 'Sesión: Super Administrador' : 'Sesión: Usuario Profesional'}
              </h2>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                isSuperAdmin ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-sky-100 text-sky-900'
              }`}>
                {currentUser.email}
              </span>
            </div>
            <p className="text-xs text-neutral-500">
              {isSuperAdmin
                ? 'Acceso total a las APIs maestras (Evolution WhatsApp, Mercado Pago Suscripciones y Email).'
                : 'Vista limpia de consultorio. No tiene acceso a credenciales maestras de servidor.'}
            </p>
          </div>
        </div>

        {/* Role Switcher Button for Gonzalo */}
        <div className="flex items-center gap-2 self-stretch md:self-auto justify-between md:justify-end">
          <button
            type="button"
            onClick={handleRoleToggle}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all flex items-center gap-1.5 shadow-2xs ${
              isSuperAdmin
                ? 'bg-neutral-50 hover:bg-neutral-100 text-neutral-800 border-neutral-300'
                : 'bg-neutral-900 hover:bg-neutral-800 text-white border-neutral-900'
            }`}
            title="Alternar entre la vista de Super Admin y la vista que experimentan los médicos"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>{isSuperAdmin ? 'Simular Vista Profesional' : 'Volver a Modo Super Admin'}</span>
          </button>

          <button
            onClick={handleSave}
            className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            {savedNotice ? '¡Guardado!' : 'Guardar Cambios'}
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-neutral-100/80 rounded-xl border border-neutral-200/80 w-fit overflow-x-auto max-w-full">
        <button
          type="button"
          onClick={() => setActiveTab('general')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'general'
              ? 'bg-white text-neutral-900 shadow-2xs font-semibold'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Consultorio & Perfil</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('deposits')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'deposits'
              ? 'bg-white text-neutral-900 shadow-2xs font-semibold'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          <Landmark className="w-3.5 h-3.5 text-emerald-700" />
          <span>Cobro de Señas a Pacientes</span>
          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
            Alias / MP
          </span>
        </button>

        {/* RESTRICTED: APIs Tab ONLY for Super Admin gonzalocorat@gmail.com */}
        {isSuperAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab('apis')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'apis'
                ? 'bg-neutral-900 text-white shadow-2xs font-semibold'
                : 'text-neutral-700 hover:text-neutral-900'
            }`}
          >
            <Key className="w-3.5 h-3.5 text-amber-400" />
            <span>Super Admin: APIs SaaS</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-400 text-neutral-950 font-mono">
              Admin
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveTab('workspace')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'workspace'
              ? 'bg-white text-neutral-900 shadow-2xs font-semibold'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Google Workspace</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* TAB 1: CONSULTORIO & GENERAL */}
        {activeTab === 'general' && (
          <>
            {/* Identity & Practice Information */}
            <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-neutral-100">
                <Building2 className="w-4 h-4 text-neutral-700" />
                <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider font-display">
                  Identidad del Consultorio / Práctica
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">
                    Nombre del Consultorio / Clínica:
                  </label>
                  <input
                    type="text"
                    value={formData.practice_name}
                    onChange={e => handleChange('practice_name', e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900 font-medium"
                    placeholder="Ej. Consultorio Médico Integral"
                    required
                  />
                </div>

                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">
                    Nombre del Profesional a Cargo:
                  </label>
                  <input
                    type="text"
                    value={formData.professional_name}
                    onChange={e => handleChange('professional_name', e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900 font-medium"
                    placeholder="Ej. Dr. Alejandro Rossi"
                    required
                  />
                </div>

                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">
                    Matrícula Profesional (M.N. / M.P.):
                  </label>
                  <input
                    type="text"
                    value={formData.medical_license || ''}
                    onChange={e => handleChange('medical_license', e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900 font-mono"
                    placeholder="M.N. 142.890 / M.P. 45.210"
                  />
                </div>

                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">
                    Especialidad / Rama Médica:
                  </label>
                  <input
                    type="text"
                    value={formData.specialty}
                    onChange={e => handleChange('specialty', e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    placeholder="Ej. Odontología General & Estética"
                  />
                </div>

                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">
                    WhatsApp del Consultorio (Para avisos):
                  </label>
                  <input
                    type="tel"
                    value={formData.whatsapp_number}
                    onChange={e => handleChange('whatsapp_number', e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900 font-mono"
                    placeholder="+54 9 11 5000-0000"
                  />
                </div>

                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">
                    Email de Contacto del Consultorio:
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => handleChange('email', e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    placeholder="contacto@consultorio.com"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-semibold text-neutral-700 block mb-1">
                    Dirección Física / Consultorio:
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={e => handleChange('address', e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    placeholder="Av. Santa Fe 3200, Piso 4 B, CABA"
                  />
                </div>
              </div>
            </div>

            {/* Virtual Assistant (IA) Customization */}
            <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-sky-600" />
                  <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider font-display">
                    Asistente Virtual IA para WhatsApp & Web
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-900 text-white">
                  GEMINI AI
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">
                    Nombre del Asistente Bot:
                  </label>
                  <input
                    type="text"
                    value={formData.bot_assistant_name}
                    onChange={e => handleChange('bot_assistant_name', e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900 font-medium"
                    placeholder="Ej. Sofía (IA)"
                  />
                </div>

                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">
                    Tono de Conversación:
                  </label>
                  <input
                    type="text"
                    value={formData.bot_tone}
                    onChange={e => handleChange('bot_tone', e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    placeholder="Ej. cálido, profesional y conciso"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700 block mb-1">
                  Mensaje Inicial de Bienvenida (Saludo):
                </label>
                <textarea
                  rows={2}
                  value={formData.welcome_message}
                  onChange={e => handleChange('welcome_message', e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900 leading-relaxed"
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
                    className="w-4 h-4 text-neutral-900 rounded focus:ring-neutral-900"
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
                    className="w-4 h-4 text-neutral-900 rounded focus:ring-neutral-900"
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {/* TAB 2: PATIENT DEPOSIT SETTINGS (ALIAS / CBU & MERCADO PAGO CONNECT) */}
        {activeTab === 'deposits' && (
          <PatientDepositSettings formData={formData} onChange={handleChange} />
        )}

        {/* TAB 3: SUPER ADMIN INFRASTRUCTURE (RESTRICTED TO GONZALO) */}
        {activeTab === 'apis' && isSuperAdmin && (
          <SuperAdminApiSettings formData={formData} onChange={handleChange} />
        )}

        {/* TAB 4: GOOGLE WORKSPACE */}
        {activeTab === 'workspace' && (
          <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider font-display">
                  Google Workspace (Calendar & Sheets)
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-900 text-white">
                CONECTADO A OAUTH
              </span>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed">
              Tu consultorio cuenta con integración directa con las APIs oficiales de Google Calendar y Google Sheets. Puedes sincronizar turnos a tu calendario y crear respaldos automáticos en tu Google Drive desde la pestaña <strong>Google Workspace</strong> del menú principal.
            </p>
          </div>
        )}

        {/* Reset Demo Data Button */}
        <div className="pt-4 border-t border-neutral-200 flex justify-between items-center text-xs text-neutral-400">
          <span>AgendaPro AI v3.0 • Sistema Integral Multi-Tenant</span>
          <button
            type="button"
            onClick={() => {
              if (confirm('¿Restablecer los datos a los valores de demostración iniciales?')) {
                resetToDemoData();
                setFormData(practiceSettings);
                alert('Datos restablecidos con éxito.');
              }
            }}
            className="text-neutral-500 hover:text-neutral-800 underline"
          >
            Restablecer demo inicial
          </button>
        </div>
      </form>
    </div>
  );
};
