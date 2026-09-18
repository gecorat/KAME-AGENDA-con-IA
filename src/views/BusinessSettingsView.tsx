import React, { useState, useEffect } from 'react';
import {
  Building2,
  Sparkles,
  Clock,
  Landmark,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Save,
  Crown,
  UserCheck,
  ArrowRightLeft,
  Plus,
  Edit2,
  Trash2,
  ShieldCheck,
  Check,
  Coffee,
  Info,
  ArrowRight,
  Database
} from 'lucide-react';
import { useAgendaStore } from '../lib/store';
import { PracticeSettings, Service, DayAvailability } from '../types';
import { ProfessionSettings } from '../components/settings/ProfessionSettings';
import { RequiredFieldsSettings } from '../components/settings/RequiredFieldsSettings';
import { PatientDepositSettings } from '../components/settings/PatientDepositSettings';
import { GoogleWorkspaceView } from './GoogleWorkspaceView';
import { ConfirmModal } from '../components/ConfirmModal';
import { DataBackupSettings } from '../components/settings/DataBackupSettings';

interface BusinessSettingsViewProps {
  initialStep?: 'profile' | 'services' | 'hours' | 'deposits' | 'google' | 'backup';
  onOpenNewService: () => void;
  onEditService: (service: Service) => void;
  onNavigateTab?: (tab: string) => void;
}

const DAYS_NAMES = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado'
];

export const BusinessSettingsView: React.FC<BusinessSettingsViewProps> = ({
  initialStep = 'profile',
  onOpenNewService,
  onEditService,
  onNavigateTab
}) => {
  const {
    practiceSettings,
    updatePracticeSettings,
    services,
    deleteService,
    availability,
    updateAvailability,
    currentUser,
    switchUserRole
  } = useAgendaStore();

  const isGonzalo = currentUser?.email?.toLowerCase() === 'gonzalocorat@gmail.com';
  const isSuperAdmin = isGonzalo && Boolean(currentUser?.isSuperAdmin);

  // Local state for profile form
  const [formData, setFormData] = useState<PracticeSettings>(practiceSettings);
  const [savedNotice, setSavedNotice] = useState(false);

  // Local state for availability schedule
  const [schedule, setSchedule] = useState<DayAvailability[]>(availability);
  const [scheduleSavedNotice, setScheduleSavedNotice] = useState(false);

  // Delete service modal
  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);

  // Active accordion steps: users can open multiple or focus on one
  const [openSteps, setOpenSteps] = useState<Record<string, boolean>>({
    profile: initialStep === 'profile',
    services: initialStep === 'services',
    hours: initialStep === 'hours',
    deposits: initialStep === 'deposits',
    google: initialStep === 'google',
    backup: initialStep === 'backup'
  });

  // Sync if initialStep prop changes from external navigation
  useEffect(() => {
    if (initialStep) {
      setOpenSteps(prev => ({
        ...prev,
        [initialStep]: true
      }));
    }
  }, [initialStep]);

  useEffect(() => {
    setFormData(practiceSettings);
  }, [practiceSettings]);

  useEffect(() => {
    setSchedule(availability);
  }, [availability]);

  const toggleStep = (stepKey: string) => {
    setOpenSteps(prev => ({
      ...prev,
      [stepKey]: !prev[stepKey]
    }));
  };

  const handleProfileChange = (field: keyof PracticeSettings, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    updatePracticeSettings(formData);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const handleToggleDay = (dayOfWeek: number) => {
    setSchedule(prev =>
      prev.map(item =>
        item.day_of_week === dayOfWeek ? { ...item, enabled: !item.enabled } : item
      )
    );
  };

  const handleTogglePausa = (dayOfWeek: number, activar: boolean) => {
    setSchedule(prev =>
      prev.map(item =>
        item.day_of_week === dayOfWeek
          ? { ...item, break_start: activar ? '13:00' : '', break_end: activar ? '14:00' : '' }
          : item
      )
    );
  };

  const handleScheduleFieldChange = (
    dayOfWeek: number,
    field: keyof DayAvailability,
    value: any
  ) => {
    setSchedule(prev =>
      prev.map(item =>
        item.day_of_week === dayOfWeek ? { ...item, [field]: value } : item
      )
    );
  };

  const handleSaveSchedule = () => {
    updateAvailability(schedule);
    setScheduleSavedNotice(true);
    setTimeout(() => setScheduleSavedNotice(false), 2500);
  };

  const handleRoleToggle = () => {
    if (!isGonzalo) return;
    if (isSuperAdmin) {
      switchUserRole('professional');
    } else {
      switchUserRole('superadmin');
    }
  };

  // Completion calculations
  const isProfileComplete = Boolean(
    formData.practice_name?.trim() &&
    formData.professional_name?.trim() &&
    formData.phone?.trim()
  );

  const activeServices = services.filter(s => s.active);
  const isServicesComplete = activeServices.length > 0;

  const enabledDays = schedule.filter(d => d.enabled);
  const isHoursComplete = enabledDays.length > 0;

  const isDepositConfigured = Boolean(
    formData.patient_deposit_alias?.trim() ||
    formData.patient_deposit_cbu?.trim() ||
    formData.patient_deposit_mp_token?.trim() ||
    formData.patient_deposit_mp_link?.trim() ||
    formData.patient_deposit_mp_connected
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Super Admin Session Bar (Only for Super Admin) */}
      {isGonzalo && (
        <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-xs ${
              isSuperAdmin ? 'bg-neutral-900' : 'bg-sky-600'
            }`}>
              {isSuperAdmin ? <Crown className="w-4 h-4 text-amber-400" /> : <UserCheck className="w-4 h-4" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold text-neutral-900 font-display">
                  {isSuperAdmin ? 'Sesión: Super Administrador' : 'Sesión: Modo Profesional'}
                </h2>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                  isSuperAdmin ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-sky-100 text-sky-900'
                }`}>
                  {currentUser.email}
                </span>
              </div>
              <p className="text-[11px] text-neutral-500">
                {isSuperAdmin
                  ? 'Configuración maestra del negocio con permisos globales de plataforma.'
                  : 'Simulación de la vista exacta que experimenta un profesional.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRoleToggle}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-neutral-300 bg-neutral-50 hover:bg-neutral-100 text-neutral-800 transition-all flex items-center gap-1.5 shadow-2xs self-end md:self-auto cursor-pointer"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>{isSuperAdmin ? 'Simular Profesional' : 'Volver a Super Admin'}</span>
          </button>
        </div>
      )}

      {/* Main Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="text-xl font-bold tracking-tight text-neutral-900 font-display">
              Ajustes del Negocio
            </h1>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Configura la información de tu consultorio en pasos organizados para habilitar reservas online, cobros de señas y atención del bot.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSaveProfile}
            className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 active:scale-[0.99] rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{savedNotice ? '¡Guardado!' : 'Guardar Todo'}</span>
          </button>
        </div>
      </div>

      {/* =========================================================
          PASO 1: INFORMACIÓN DEL NEGOCIO (CONSULTORIO Y PERFIL)
         ========================================================= */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden transition-all">
        <button
          type="button"
          onClick={() => toggleStep('profile')}
          className="w-full p-4 sm:p-5 flex items-center justify-between gap-4 text-left hover:bg-neutral-50/60 transition cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isProfileComplete ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-100 text-sky-800'
            }`}>
              {isProfileComplete ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-700" />
              ) : (
                <Building2 className="w-5 h-5 text-sky-700" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                  Paso 1
                </span>
                <h2 className="text-sm sm:text-base font-bold text-neutral-900 font-display">
                  Información del Negocio & Consultorio
                </h2>
                {isProfileComplete ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Completado ✓
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                    Pendiente
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-500 mt-0.5 truncate">
                Nombre del establecimiento, profesional a cargo, especialidad, contacto y dirección.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold text-neutral-400 hidden sm:inline">
              {openSteps.profile ? 'Ocultar' : 'Completar / Editar'}
            </span>
            {openSteps.profile ? (
              <ChevronUp className="w-5 h-5 text-neutral-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-neutral-500" />
            )}
          </div>
        </button>

        {openSteps.profile && (
          <div className="p-4 sm:p-6 border-t border-neutral-100 bg-neutral-50/30 space-y-6">
            {/* Rubro, Profesión y Terminología */}
            <ProfessionSettings settings={formData} onChange={handleProfileChange} />

            {/* Identity & Practice Information */}
            <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-2xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-neutral-100">
                <Building2 className="w-4 h-4 text-neutral-700" />
                <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider font-display">
                  Datos de Identidad del Establecimiento
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">
                    Nombre del Consultorio / Clínica / Negocio: *
                  </label>
                  <input
                    type="text"
                    value={formData.practice_name || ''}
                    onChange={e => handleProfileChange('practice_name', e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900 font-medium text-xs"
                    placeholder="Ej. Consultorio Médico Integral"
                    required
                  />
                  <p className="text-[11px] text-neutral-500 mt-1">Nombre comercial que verán los clientes.</p>
                </div>

                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">
                    Nombre del Profesional / Titular a Cargo: *
                  </label>
                  <input
                    type="text"
                    value={formData.professional_name || ''}
                    onChange={e => handleProfileChange('professional_name', e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900 font-medium text-xs"
                    placeholder="Ej. Dr. Alejandro Rossi"
                    required
                  />
                  <p className="text-[11px] text-emerald-700 mt-1 font-medium">Se utiliza en los avisos de WhatsApp en el renglón 👤 Profesional.</p>
                </div>

                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">
                    Matrícula Profesional (M.N. / M.P.):
                  </label>
                  <input
                    type="text"
                    value={formData.medical_license || ''}
                    onChange={e => handleProfileChange('medical_license', e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900 font-mono text-xs"
                    placeholder="M.N. 142.890 / M.P. 45.210"
                  />
                </div>

                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">
                    Especialidad / Rama:
                  </label>
                  <input
                    type="text"
                    value={formData.specialty || ''}
                    onChange={e => handleProfileChange('specialty', e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900 text-xs"
                    placeholder="Ej. Odontología General & Estética"
                  />
                </div>

                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">
                    WhatsApp de Atención al Cliente: *
                  </label>
                  <input
                    type="tel"
                    value={formData.whatsapp_number || formData.phone || ''}
                    onChange={e => {
                      handleProfileChange('whatsapp_number', e.target.value);
                      handleProfileChange('phone', e.target.value);
                    }}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900 font-mono text-xs"
                    placeholder="+54 9 11 5000-0000"
                    required
                  />
                  <p className="text-[11px] text-neutral-500 mt-1">Número donde tus clientes pueden comunicarse.</p>
                </div>

                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">
                    Email de Contacto:
                  </label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={e => handleProfileChange('email', e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900 text-xs"
                    placeholder="contacto@negocio.com"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-semibold text-neutral-700 block mb-1">
                    Dirección Física / Ubicación:
                  </label>
                  <input
                    type="text"
                    value={formData.address || ''}
                    onChange={e => handleProfileChange('address', e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900 text-xs"
                    placeholder="Av. Santa Fe 3200, Piso 4 B, CABA"
                  />
                </div>
              </div>
            </div>

            {/* Required Fields upon Booking */}
            <RequiredFieldsSettings />

            {/* General Booking Preferences */}
            <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-neutral-100">
                <Clock className="w-4 h-4 text-sky-600" />
                <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider font-display">
                  Preferencias de Reserva
                </h3>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3.5 bg-neutral-50 rounded-xl border border-neutral-200">
                  <div>
                    <p className="text-xs font-bold text-neutral-900">Auto-confirmar reservas de la web y bot</p>
                    <p className="text-[11px] text-neutral-500">
                      Si se desactiva, los turnos ingresarán en estado "Pendiente" hasta que los apruebes.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(formData.auto_confirm_bookings)}
                    onChange={e => handleProfileChange('auto_confirm_bookings', e.target.checked)}
                    className="w-4 h-4 text-neutral-900 rounded focus:ring-neutral-900 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 bg-neutral-50 rounded-xl border border-neutral-200">
                  <div>
                    <p className="text-xs font-bold text-neutral-900">Habilitar servicio online / Teleconsulta</p>
                    <p className="text-[11px] text-neutral-500">
                      Permite agendar videollamadas o reuniones virtuales automáticamente.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(formData.allow_telemedicine)}
                    onChange={e => handleProfileChange('allow_telemedicine', e.target.checked)}
                    className="w-4 h-4 text-neutral-900 rounded focus:ring-neutral-900 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-neutral-500">
                {savedNotice ? '✓ Cambios guardados correctamente' : 'Guarda para aplicar los cambios en todo el sistema'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Guardar Paso 1</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleSaveProfile();
                    setOpenSteps(prev => ({ ...prev, profile: false, services: true }));
                  }}
                  className="px-4 py-2 text-xs font-semibold text-neutral-800 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Continuar a Paso 2</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================
          PASO 2: SERVICIOS Y PRECIOS
         ========================================================= */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden transition-all">
        <button
          type="button"
          onClick={() => toggleStep('services')}
          className="w-full p-4 sm:p-5 flex items-center justify-between gap-4 text-left hover:bg-neutral-50/60 transition cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isServicesComplete ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-100 text-sky-800'
            }`}>
              {isServicesComplete ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-700" />
              ) : (
                <Sparkles className="w-5 h-5 text-sky-700" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                  Paso 2
                </span>
                <h2 className="text-sm sm:text-base font-bold text-neutral-900 font-display">
                  Servicios y Aranceles
                </h2>
                {isServicesComplete ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {activeServices.length} activo(s) ✓
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                    Sin servicios
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-500 mt-0.5 truncate">
                Carga consultas, tratamientos o servicios con sus precios y duración en minutos.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold text-neutral-400 hidden sm:inline">
              {openSteps.services ? 'Ocultar' : 'Ver y Administrar'}
            </span>
            {openSteps.services ? (
              <ChevronUp className="w-5 h-5 text-neutral-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-neutral-500" />
            )}
          </div>
        </button>

        {openSteps.services && (
          <div className="p-4 sm:p-6 border-t border-neutral-100 bg-neutral-50/30 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-neutral-200">
              <div>
                <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wide">
                  Catálogo de Servicios Disponibles
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Estos servicios se sincronizan con tu página pública, el bot de WhatsApp y el cobro de señas.
                </p>
              </div>

              <button
                type="button"
                onClick={onOpenNewService}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Nuevo Servicio</span>
              </button>
            </div>

            {services.length === 0 ? (
              <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-neutral-300 p-6">
                <Sparkles className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
                <p className="text-xs font-bold text-neutral-700">No tienes servicios creados aún</p>
                <p className="text-[11px] text-neutral-500 mt-1 max-w-sm mx-auto">
                  Crea al menos una consulta o sesión para que tus clientes puedan seleccionarla al reservar.
                </p>
                <button
                  type="button"
                  onClick={onOpenNewService}
                  className="mt-3 px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-2xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Crear Primer Servicio</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {services.map(srv => (
                  <div
                    key={srv.id}
                    className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-2xs flex flex-col justify-between hover:border-neutral-300 transition"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: srv.color || '#0284c7' }}
                          />
                          <span className="text-[10px] font-semibold bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded-full">
                            {srv.category || 'General'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onEditService(srv)}
                            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition cursor-pointer"
                            title="Editar Servicio"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setServiceToDelete(srv)}
                            className="p-1 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Eliminar Servicio"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <h4 className="text-xs font-bold text-neutral-900 mb-1">{srv.name}</h4>
                      <p className="text-[11px] text-neutral-500 leading-relaxed mb-3 line-clamp-2">
                        {srv.description || 'Sin descripción detallada.'}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-neutral-100 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1 text-neutral-500">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="font-medium text-[11px]">{srv.duration_minutes} min</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-neutral-900">
                          ${srv.price.toLocaleString('es-AR')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  setOpenSteps(prev => ({ ...prev, services: false, hours: true }));
                }}
                className="px-4 py-2 text-xs font-semibold text-neutral-800 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>Continuar a Paso 3 (Horarios)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================
          PASO 3: HORARIOS DE ATENCIÓN
         ========================================================= */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden transition-all">
        <button
          type="button"
          onClick={() => toggleStep('hours')}
          className="w-full p-4 sm:p-5 flex items-center justify-between gap-4 text-left hover:bg-neutral-50/60 transition cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isHoursComplete ? 'bg-emerald-100 text-emerald-800' : 'bg-purple-100 text-purple-800'
            }`}>
              {isHoursComplete ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-700" />
              ) : (
                <Clock className="w-5 h-5 text-purple-700" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                  Paso 3
                </span>
                <h2 className="text-sm sm:text-base font-bold text-neutral-900 font-display">
                  Horarios de Atención
                </h2>
                {isHoursComplete ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {enabledDays.length} días activos ✓
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                    Sin horarios
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-500 mt-0.5 truncate">
                Días de la semana, franjas horarias y pausas de almuerzo para turnos online y bot.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold text-neutral-400 hidden sm:inline">
              {openSteps.hours ? 'Ocultar' : 'Configurar Franjas'}
            </span>
            {openSteps.hours ? (
              <ChevronUp className="w-5 h-5 text-neutral-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-neutral-500" />
            )}
          </div>
        </button>

        {openSteps.hours && (
          <div className="p-4 sm:p-6 border-t border-neutral-100 bg-neutral-50/30 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-neutral-200">
              <div>
                <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wide">
                  Franjas Horarias Semanales
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  El sistema calculará automáticamente los turnos libres según la duración de cada servicio.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSaveSchedule}
                className="px-4 py-2 text-xs font-semibold text-white bg-purple-700 hover:bg-purple-800 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Save className="w-4 h-4" />
                <span>{scheduleSavedNotice ? '¡Guardado!' : 'Guardar Horarios'}</span>
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xs divide-y divide-neutral-100 overflow-hidden">
              {schedule.map(day => {
                const isEnabled = day.enabled;
                const hasPausa = Boolean(day.break_start && day.break_end);

                return (
                  <div
                    key={day.day_of_week}
                    className={`p-3.5 sm:p-4 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-4 ${
                      isEnabled ? 'bg-white' : 'bg-neutral-50/70 opacity-65'
                    }`}
                  >
                    <div className="flex items-center gap-3 w-full md:w-36 shrink-0">
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={() => handleToggleDay(day.day_of_week)}
                        className="w-4 h-4 text-purple-700 rounded focus:ring-purple-700 cursor-pointer"
                        id={`step-day-${day.day_of_week}`}
                      />
                      <label
                        htmlFor={`step-day-${day.day_of_week}`}
                        className={`text-xs font-bold cursor-pointer select-none ${
                          isEnabled ? 'text-neutral-900' : 'text-neutral-500 line-through'
                        }`}
                      >
                        {DAYS_NAMES[day.day_of_week]}
                      </label>
                    </div>

                    {isEnabled ? (
                      <div className="flex flex-wrap items-center gap-3 w-full text-xs">
                        <div className="flex items-center gap-1.5 bg-neutral-50 px-2.5 py-1 rounded-xl border border-neutral-200">
                          <span className="text-[11px] text-neutral-500 font-medium">De</span>
                          <input
                            type="time"
                            value={day.start_time}
                            onChange={e =>
                              handleScheduleFieldChange(day.day_of_week, 'start_time', e.target.value)
                            }
                            className="bg-transparent border-0 p-0 text-xs font-bold text-neutral-900 focus:ring-0 focus:outline-none"
                          />
                          <span className="text-[11px] text-neutral-500 font-medium">a</span>
                          <input
                            type="time"
                            value={day.end_time}
                            onChange={e =>
                              handleScheduleFieldChange(day.day_of_week, 'end_time', e.target.value)
                            }
                            className="bg-transparent border-0 p-0 text-xs font-bold text-neutral-900 focus:ring-0 focus:outline-none"
                          />
                        </div>

                        {hasPausa ? (
                          <div className="flex items-center gap-1.5 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200 text-amber-900">
                            <Coffee className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span className="text-[11px] font-medium">Pausa:</span>
                            <input
                              type="time"
                              value={day.break_start || ''}
                              onChange={e =>
                                handleScheduleFieldChange(day.day_of_week, 'break_start', e.target.value)
                              }
                              className="bg-transparent border-0 p-0 text-xs font-bold text-amber-950 focus:ring-0 focus:outline-none"
                            />
                            <span className="text-[11px] font-medium">-</span>
                            <input
                              type="time"
                              value={day.break_end || ''}
                              onChange={e =>
                                handleScheduleFieldChange(day.day_of_week, 'break_end', e.target.value)
                              }
                              className="bg-transparent border-0 p-0 text-xs font-bold text-amber-950 focus:ring-0 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleTogglePausa(day.day_of_week, false)}
                              className="ml-1 text-[10px] font-bold text-rose-600 hover:text-rose-800 underline cursor-pointer"
                              title="Quitar pausa de almuerzo"
                            >
                              Quitar
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleTogglePausa(day.day_of_week, true)}
                            className="text-[11px] font-medium text-neutral-500 hover:text-neutral-800 bg-neutral-100 hover:bg-neutral-200 px-2.5 py-1 rounded-xl transition flex items-center gap-1 cursor-pointer"
                          >
                            <Coffee className="w-3 h-3" />
                            <span>+ Pausa almuerzo</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="text-[11px] text-neutral-400 italic">No se atiende este día</span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-neutral-500">
                {scheduleSavedNotice ? '✓ Horarios guardados con éxito' : 'Los horarios aplican de inmediato en tu agenda'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveSchedule}
                  className="px-4 py-2 text-xs font-semibold text-white bg-purple-700 hover:bg-purple-800 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Guardar Horarios</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleSaveSchedule();
                    setOpenSteps(prev => ({ ...prev, hours: false, deposits: true }));
                  }}
                  className="px-4 py-2 text-xs font-semibold text-neutral-800 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Continuar a Paso 4 (Cobros)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================
          PASO 4: INFORMACIÓN DE COBRO & SEÑAS
         ========================================================= */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden transition-all">
        <button
          type="button"
          onClick={() => toggleStep('deposits')}
          className="w-full p-4 sm:p-5 flex items-center justify-between gap-4 text-left hover:bg-neutral-50/60 transition cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isDepositConfigured ? 'bg-emerald-100 text-emerald-800' : 'bg-teal-100 text-teal-800'
            }`}>
              {isDepositConfigured ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-700" />
              ) : (
                <Landmark className="w-5 h-5 text-teal-700" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                  Paso 4
                </span>
                <h2 className="text-sm sm:text-base font-bold text-neutral-900 font-display">
                  Información de Cobro & Señas
                </h2>
                {isDepositConfigured ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {formData.patient_deposit_method === 'mercadopago_connect' ? 'Mercado Pago ✓' : 'Alias / CBU ✓'}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                    Sin configurar
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-500 mt-0.5 truncate">
                Alias / CBU bancario y cobro online con Mercado Pago para señas previas al reservar.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold text-neutral-400 hidden sm:inline">
              {openSteps.deposits ? 'Ocultar' : 'Configurar Cuenta'}
            </span>
            {openSteps.deposits ? (
              <ChevronUp className="w-5 h-5 text-neutral-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-neutral-500" />
            )}
          </div>
        </button>

        {openSteps.deposits && (
          <div className="p-4 sm:p-6 border-t border-neutral-100 bg-neutral-50/30">
            <PatientDepositSettings formData={formData} onChange={handleProfileChange} />
          </div>
        )}
      </div>

      {/* =========================================================
          PASO 5 (OPCIONAL): GOOGLE CALENDAR & WORKSPACE
         ========================================================= */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden transition-all">
        <button
          type="button"
          onClick={() => toggleStep('google')}
          className="w-full p-4 sm:p-5 flex items-center justify-between gap-4 text-left hover:bg-neutral-50/60 transition cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5 text-sky-700" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-md border border-neutral-200">
                  Opcional
                </span>
                <h2 className="text-sm sm:text-base font-bold text-neutral-900 font-display">
                  Sincronización con Google Calendar
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-100 text-neutral-600">
                  Integración OAuth
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5 truncate">
                Conecta tu cuenta de Google para sincronizar tus turnos bidireccionalmente con tu calendario personal.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold text-neutral-400 hidden sm:inline">
              {openSteps.google ? 'Ocultar' : 'Ver Integración'}
            </span>
            {openSteps.google ? (
              <ChevronUp className="w-5 h-5 text-neutral-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-neutral-500" />
            )}
          </div>
        </button>

        {openSteps.google && (
          <div className="p-4 sm:p-6 border-t border-neutral-100 bg-neutral-50/30">
            <GoogleWorkspaceView />
          </div>
        )}
      </div>

      {/* ========================================================
          PASO 6: COPIA DE SEGURIDAD & PORTABILIDAD DE DATOS (JSON / CSV)
          ======================================================== */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
        <button
          type="button"
          onClick={() => toggleStep('backup')}
          className="w-full p-4 sm:p-5 flex items-center justify-between gap-4 text-left hover:bg-neutral-50/60 transition cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center shrink-0">
              <Database className="w-5 h-5 text-indigo-700" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                  Respaldo
                </span>
                <h2 className="text-sm sm:text-base font-bold text-neutral-900 font-display">
                  Copia de Seguridad & Portabilidad de Datos
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Exportar JSON / CSV
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5 truncate">
                Exporta tus pacientes, agenda de turnos e historias clínicas en formatos abiertos (.JSON y .CSV para Excel).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold text-neutral-400 hidden sm:inline">
              {openSteps.backup ? 'Ocultar' : 'Exportar Datos'}
            </span>
            {openSteps.backup ? (
              <ChevronUp className="w-5 h-5 text-neutral-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-neutral-500" />
            )}
          </div>
        </button>

        {openSteps.backup && (
          <div className="p-4 sm:p-6 border-t border-neutral-100 bg-neutral-50/30">
            <DataBackupSettings />
          </div>
        )}
      </div>

      {/* Delete Service Confirmation Modal */}
      {serviceToDelete && (
        <ConfirmModal
          isOpen={true}
          title="¿Eliminar este servicio?"
          message={`Estás por eliminar "${serviceToDelete.name}". Los turnos ya asignados conservarán el registro, pero no estará disponible para nuevas reservas.`}
          confirmText="Eliminar Servicio"
          confirmVariant="danger"
          onConfirm={() => {
            deleteService(serviceToDelete.id);
            setServiceToDelete(null);
          }}
          onCancel={() => setServiceToDelete(null)}
        />
      )}
    </div>
  );
};
