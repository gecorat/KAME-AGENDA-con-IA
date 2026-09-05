import React, { useState } from 'react';
import {
  Bell,
  MessageSquare,
  Mail,
  Check,
  CheckCircle2,
  Clock,
  Calendar,
  Send,
  Sparkles,
  Settings2,
  ListFilter,
  FileText,
  History,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Eye,
  RefreshCw,
  Smartphone,
  CheckCheck
} from 'lucide-react';
import { useAgendaStore } from '../lib/store';
import { Appointment } from '../types';
import { WhatsAppPreviewModal } from '../components/WhatsAppPreviewModal';
import { EmailPreviewModal } from '../components/EmailPreviewModal';

export const RemindersView: React.FC = () => {
  const {
    appointments,
    practiceSettings,
    reminderConfig,
    reminderLogs,
    updateReminderConfig,
    sendWhatsAppReminder,
    sendEmailReminder,
    confirmAppointmentByPatient,
    runAutomatedRemindersScan,
    formatReminderText
  } = useAgendaStore();

  const [activeTab, setActiveTab] = useState<'cola' | 'plantillas' | 'configuracion' | 'historial'>('cola');
  const [filterQueue, setFilterQueue] = useState<'all' | 'today' | 'tomorrow' | 'unconfirmed'>('all');
  
  // Modals state
  const [waModalOpen, setWaModalOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [modalTiming, setModalTiming] = useState<'24h' | '2h'>('24h');

  // Execution feedback
  const [executingScan, setExecutingScan] = useState(false);
  const [scanResult, setScanResult] = useState<{ sentWA: number; sentEmail: number } | null>(null);
  const [savedSettingsNotice, setSavedSettingsNotice] = useState(false);

  // Template editor state
  const [templateChannel, setTemplateChannel] = useState<'wa_24h' | 'wa_2h' | 'email_24h' | 'email_2h'>('wa_24h');
  const [editTemplates, setEditTemplates] = useState({
    wa_24h: reminderConfig.whatsapp_template_24h,
    wa_2h: reminderConfig.whatsapp_template_2h,
    email_subject_24h: reminderConfig.email_subject_24h,
    email_body_24h: reminderConfig.email_body_24h,
    email_subject_2h: reminderConfig.email_subject_2h,
    email_body_2h: reminderConfig.email_body_2h
  });

  // Calculate stats
  const totalUpcoming = appointments.filter(a => a.status !== 'cancelled' && new Date(a.start_datetime) >= new Date(Date.now() - 3600000 * 24)).length;
  const confirmedCount = appointments.filter(a => a.patient_confirmed).length;
  const confirmationRate = totalUpcoming > 0 ? Math.round((confirmedCount / totalUpcoming) * 100) : 100;
  const totalWaSent = reminderLogs.filter(l => l.channel === 'whatsapp').length;
  const totalEmailSent = reminderLogs.filter(l => l.channel === 'email').length;

  // Filtered upcoming appointments
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const filteredAppointments = appointments
    .filter(a => {
      if (a.status === 'cancelled') return false;
      const aptDate = a.start_datetime.split('T')[0];
      if (filterQueue === 'today') return aptDate === todayStr;
      if (filterQueue === 'tomorrow') return aptDate === tomorrowStr;
      if (filterQueue === 'unconfirmed') return !a.patient_confirmed;
      return true;
    })
    .sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime());

  // Demo sample for template preview
  const sampleAppointment: Appointment = filteredAppointments[0] || appointments[0] || {
    id: 'demo-sample',
    patient_id: 'p-1',
    patient_name: 'María González',
    patient_phone: '+54 9 11 5566-7788',
    patient_email: 'maria.gonzalez@gmail.com',
    service_id: 'srv-1',
    service_name: 'Limpieza Profunda & Profilaxis',
    service_price: 32000,
    start_datetime: new Date(Date.now() + 86400000).toISOString(),
    end_datetime: new Date(Date.now() + 86400000 + 2700000).toISOString(),
    status: 'pending',
    payment_status: 'pending',
    origin: 'manual'
  };

  const handleRunScan = () => {
    setExecutingScan(true);
    setTimeout(() => {
      const res = runAutomatedRemindersScan();
      setScanResult({ sentWA: res.sentWhatsApp, sentEmail: res.sentEmail });
      setExecutingScan(false);
      setTimeout(() => setScanResult(null), 4500);
    }, 800);
  };

  const handleSaveTemplates = () => {
    updateReminderConfig({
      whatsapp_template_24h: editTemplates.wa_24h,
      whatsapp_template_2h: editTemplates.wa_2h,
      email_subject_24h: editTemplates.email_subject_24h,
      email_body_24h: editTemplates.email_body_24h,
      email_subject_2h: editTemplates.email_subject_2h,
      email_body_2h: editTemplates.email_body_2h
    });
    setSavedSettingsNotice(true);
    setTimeout(() => setSavedSettingsNotice(false), 2500);
  };

  const insertVariable = (variable: string) => {
    if (templateChannel === 'wa_24h') {
      setEditTemplates(prev => ({ ...prev, wa_24h: prev.wa_24h + ' ' + variable }));
    } else if (templateChannel === 'wa_2h') {
      setEditTemplates(prev => ({ ...prev, wa_2h: prev.wa_2h + ' ' + variable }));
    } else if (templateChannel === 'email_24h') {
      setEditTemplates(prev => ({ ...prev, email_body_24h: prev.email_body_24h + ' ' + variable }));
    } else if (templateChannel === 'email_2h') {
      setEditTemplates(prev => ({ ...prev, email_body_2h: prev.email_body_2h + ' ' + variable }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-neutral-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-neutral-900">
                Recordatorios Automatizados
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                WhatsApp & Email Activos
              </span>
            </div>
            <p className="text-xs text-neutral-500">
              Notificaciones automáticas 24h y 2h antes de la consulta para maximizar confirmaciones y reducir ausentismo
            </p>
          </div>
        </div>

        {/* Header Action: Trigger automated scan */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={handleRunScan}
            disabled={executingScan}
            className="w-full md:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${executingScan ? 'animate-spin' : ''}`} />
            {executingScan ? 'Escaneando agenda...' : 'Ejecutar Ciclo de Envíos Ahora'}
          </button>
        </div>
      </div>

      {/* Execution Feedback Notification */}
      {scanResult && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
              <Check className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-950">
                ¡Ciclo de recordatorios ejecutado con éxito!
              </p>
              <p className="text-[11px] text-emerald-800">
                Se enviaron <strong>{scanResult.sentWA} WhatsApps</strong> y <strong>{scanResult.sentEmail} Correos Electrónicos</strong> para los turnos de las próximas 24 horas.
              </p>
            </div>
          </div>
          <button
            onClick={() => setScanResult(null)}
            className="text-xs font-semibold text-emerald-800 hover:text-emerald-950"
          >
            Entendido
          </button>
        </div>
      )}

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xl font-bold text-neutral-900">{confirmationRate}%</p>
            <p className="text-[11px] text-neutral-500 font-medium">Tasa de Confirmación</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xl font-bold text-neutral-900">{totalWaSent}</p>
            <p className="text-[11px] text-neutral-500 font-medium">WhatsApps Despachados</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xl font-bold text-neutral-900">{totalEmailSent}</p>
            <p className="text-[11px] text-neutral-500 font-medium">Emails Enviados</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xl font-bold text-neutral-900">-78%</p>
            <p className="text-[11px] text-neutral-500 font-medium">Ausentismo / No-Shows</p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-neutral-200 bg-white px-3 rounded-2xl shadow-xs overflow-x-auto">
        <button
          onClick={() => setActiveTab('cola')}
          className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeTab === 'cola'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <Clock className="w-4 h-4" />
          Cola de Próximos Envíos
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-neutral-100 text-neutral-700 font-bold">
            {filteredAppointments.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('plantillas')}
          className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeTab === 'plantillas'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          Plantillas WhatsApp & Correo
        </button>

        <button
          onClick={() => setActiveTab('configuracion')}
          className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeTab === 'configuracion'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <Settings2 className="w-4 h-4" />
          Reglas de Automatización
        </button>

        <button
          onClick={() => setActiveTab('historial')}
          className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeTab === 'historial'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <History className="w-4 h-4" />
          Registro de Auditoría (Logs)
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-neutral-100 text-neutral-700 font-bold">
            {reminderLogs.length}
          </span>
        </button>
      </div>

      {/* TAB 1: COLA DE PRÓXIMOS TURNOS */}
      {activeTab === 'cola' && (
        <div className="space-y-4">
          {/* Subfilter chips */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 p-1 bg-neutral-200/60 rounded-xl text-xs">
              <button
                onClick={() => setFilterQueue('all')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  filterQueue === 'all' ? 'bg-white text-neutral-900 font-bold shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Todos los próximos
              </button>
              <button
                onClick={() => setFilterQueue('today')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  filterQueue === 'today' ? 'bg-white text-neutral-900 font-bold shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Hoy
              </button>
              <button
                onClick={() => setFilterQueue('tomorrow')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  filterQueue === 'tomorrow' ? 'bg-white text-neutral-900 font-bold shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Mañana
              </button>
              <button
                onClick={() => setFilterQueue('unconfirmed')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  filterQueue === 'unconfirmed' ? 'bg-white text-amber-900 font-bold shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Sin confirmar
              </button>
            </div>

            <div className="text-xs text-neutral-500 font-medium">
              Mostrando {filteredAppointments.length} turnos
            </div>
          </div>

          {/* Queue List */}
          <div className="space-y-3">
            {filteredAppointments.length === 0 ? (
              <div className="bg-white rounded-2xl border border-neutral-200 p-8 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <h4 className="text-sm font-bold text-neutral-900">¡Al día! No hay turnos pendientes en esta vista</h4>
                <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                  Todos los recordatorios aplicables han sido procesados o no hay turnos con los filtros seleccionados.
                </p>
              </div>
            ) : (
              filteredAppointments.map(apt => {
                const aptDate = new Date(apt.start_datetime);
                const formattedDate = aptDate.toLocaleDateString('es-AR', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short'
                });
                const formattedTime = aptDate.toLocaleTimeString('es-AR', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false
                });

                return (
                  <div
                    key={apt.id}
                    className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-xs hover:border-neutral-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    {/* Patient & Service Info */}
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-neutral-100 text-neutral-700 flex items-center justify-center font-bold text-sm shrink-0">
                        {apt.patient_name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-neutral-900 truncate">
                            {apt.patient_name}
                          </h4>
                          {apt.patient_confirmed ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                              <CheckCheck className="w-3 h-3" />
                              Confirmado por paciente
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Esperando confirmación
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-neutral-500 mt-1 flex-wrap">
                          <span className="font-semibold text-neutral-800">{apt.service_name}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1 font-medium text-neutral-700">
                            <Calendar className="w-3 h-3 text-neutral-400" />
                            {formattedDate} {formattedTime} hs
                          </span>
                          <span>•</span>
                          <span>{apt.patient_phone}</span>
                        </div>
                      </div>
                    </div>

                    {/* Reminders Channels Status & Fast Actions */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-neutral-100">
                      {/* WhatsApp Trigger */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAppointment(apt);
                          setModalTiming('24h');
                          setWaModalOpen(true);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                          apt.reminder_24h_sent
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
                        }`}
                        title="Enviar o ver WhatsApp"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        {apt.reminder_24h_sent ? 'WA Enviado' : 'Enviar WhatsApp'}
                      </button>

                      {/* Email Trigger */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAppointment(apt);
                          setModalTiming('24h');
                          setEmailModalOpen(true);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                          apt.email_reminder_sent
                            ? 'bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100'
                            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-xs'
                        }`}
                        title="Enviar o ver correo electrónico"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        {apt.email_reminder_sent ? 'Email Enviado' : 'Enviar Email'}
                      </button>

                      {/* Patient Confirmation Button */}
                      {!apt.patient_confirmed && (
                        <button
                          type="button"
                          onClick={() => confirmAppointmentByPatient(apt.id)}
                          className="px-2.5 py-1.5 bg-neutral-100 hover:bg-emerald-100 text-neutral-700 hover:text-emerald-800 border border-neutral-200 hover:border-emerald-300 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1"
                          title="Marcar turno como confirmado verbalmente"
                        >
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          Confirmar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: EDITOR DE PLANTILLAS */}
      {activeTab === 'plantillas' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Template Selector & Editor */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-neutral-200 p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-neutral-900">Editor de Plantillas de Mensajes</h3>
                <p className="text-xs text-neutral-500">
                  Personaliza los textos automáticos con variables dinámicas que se completarán solas
                </p>
              </div>
              <button
                onClick={handleSaveTemplates}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                {savedSettingsNotice ? '¡Guardado!' : 'Guardar Plantillas'}
              </button>
            </div>

            {/* Template Selector Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-neutral-100 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setTemplateChannel('wa_24h')}
                className={`py-2 px-2.5 rounded-lg text-center transition-all ${
                  templateChannel === 'wa_24h' ? 'bg-white text-emerald-800 font-bold shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                WhatsApp 24h
              </button>
              <button
                type="button"
                onClick={() => setTemplateChannel('wa_2h')}
                className={`py-2 px-2.5 rounded-lg text-center transition-all ${
                  templateChannel === 'wa_2h' ? 'bg-white text-emerald-800 font-bold shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                WhatsApp 2h
              </button>
              <button
                type="button"
                onClick={() => setTemplateChannel('email_24h')}
                className={`py-2 px-2.5 rounded-lg text-center transition-all ${
                  templateChannel === 'email_24h' ? 'bg-white text-blue-800 font-bold shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Email 24h
              </button>
              <button
                type="button"
                onClick={() => setTemplateChannel('email_2h')}
                className={`py-2 px-2.5 rounded-lg text-center transition-all ${
                  templateChannel === 'email_2h' ? 'bg-white text-blue-800 font-bold shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Email 2h
              </button>
            </div>

            {/* Available Variables Bar */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                Variables disponibles (haz clic para insertar):
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  '{paciente}',
                  '{fecha}',
                  '{hora}',
                  '{servicio}',
                  '{profesional}',
                  '{consultorio}',
                  '{direccion}',
                  '{ciudad}',
                  '{whatsapp}',
                  '{link_confirmar}'
                ].map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => insertVariable(v)}
                    className="px-2 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-mono text-[11px] rounded-lg transition-colors border border-neutral-200/80"
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Email Subject Field (if email selected) */}
            {(templateChannel === 'email_24h' || templateChannel === 'email_2h') && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700">Asunto del Correo:</label>
                <input
                  type="text"
                  value={
                    templateChannel === 'email_24h'
                      ? editTemplates.email_subject_24h
                      : editTemplates.email_subject_2h
                  }
                  onChange={e => {
                    const val = e.target.value;
                    if (templateChannel === 'email_24h') {
                      setEditTemplates(prev => ({ ...prev, email_subject_24h: val }));
                    } else {
                      setEditTemplates(prev => ({ ...prev, email_subject_2h: val }));
                    }
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>
            )}

            {/* Body Textarea */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-700">
                {templateChannel.startsWith('wa') ? 'Texto del Mensaje de WhatsApp:' : 'Cuerpo del Correo:'}
              </label>
              <textarea
                rows={10}
                value={
                  templateChannel === 'wa_24h'
                    ? editTemplates.wa_24h
                    : templateChannel === 'wa_2h'
                    ? editTemplates.wa_2h
                    : templateChannel === 'email_24h'
                    ? editTemplates.email_body_24h
                    : editTemplates.email_body_2h
                }
                onChange={e => {
                  const val = e.target.value;
                  if (templateChannel === 'wa_24h') setEditTemplates(prev => ({ ...prev, wa_24h: val }));
                  else if (templateChannel === 'wa_2h') setEditTemplates(prev => ({ ...prev, wa_2h: val }));
                  else if (templateChannel === 'email_24h') setEditTemplates(prev => ({ ...prev, email_body_24h: val }));
                  else setEditTemplates(prev => ({ ...prev, email_body_2h: val }));
                }}
                className="w-full p-3 text-xs rounded-xl border border-neutral-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono leading-relaxed"
              />
            </div>
          </div>

          {/* Right Column: Live Interactive Preview */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                Vista Previa en Tiempo Real
              </h4>
              <span className="text-[11px] text-neutral-500">Con datos de ejemplo</span>
            </div>

            {templateChannel.startsWith('wa') ? (
              /* WhatsApp Preview Frame */
              <div className="rounded-2xl border border-neutral-300 overflow-hidden shadow-xs bg-[#efeae2]">
                <div className="bg-[#075e54] text-white px-3.5 py-2.5 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-300" />
                  <span className="text-xs font-bold">{practiceSettings.practice_name}</span>
                </div>
                <div className="p-4 min-h-[260px] bg-[radial-gradient(#0000000a_1px,transparent_1px)] [background-size:16px_16px]">
                  <div className="bg-[#dcf8c6] text-neutral-900 rounded-2xl rounded-tr-xs p-3.5 text-xs shadow-xs space-y-1.5 max-w-[90%] ml-auto border border-emerald-100">
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {formatReminderText(
                        templateChannel === 'wa_24h' ? editTemplates.wa_24h : editTemplates.wa_2h,
                        sampleAppointment
                      )}
                    </p>
                    <div className="flex items-center justify-end gap-1 text-[10px] text-neutral-500 pt-1">
                      <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <CheckCheck className="w-3.5 h-3.5 text-sky-500" />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Email Preview Frame */
              <div className="rounded-2xl border border-neutral-300 overflow-hidden shadow-xs bg-white">
                <div className="bg-sky-600 text-white p-4 text-center">
                  <h4 className="text-sm font-bold">{practiceSettings.practice_name}</h4>
                  <p className="text-[11px] text-sky-100">{practiceSettings.professional_title}</p>
                </div>
                <div className="p-4 text-xs text-neutral-800 space-y-3 font-sans">
                  <div className="border-b border-neutral-100 pb-2">
                    <p className="font-bold text-neutral-900">
                      {formatReminderText(
                        templateChannel === 'email_24h'
                          ? editTemplates.email_subject_24h
                          : editTemplates.email_subject_2h,
                        sampleAppointment
                      )}
                    </p>
                  </div>
                  <p className="whitespace-pre-wrap leading-relaxed">
                    {formatReminderText(
                      templateChannel === 'email_24h'
                        ? editTemplates.email_body_24h
                        : editTemplates.email_body_2h,
                      sampleAppointment
                    )}
                  </p>
                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      className="px-4 py-2 bg-sky-600 text-white text-[11px] font-bold rounded-xl shadow-xs"
                    >
                      Confirmar Asistencia al Turno
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: CONFIGURACIÓN Y REGLAS */}
      {activeTab === 'configuracion' && (
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs space-y-6 max-w-3xl">
          <div>
            <h3 className="text-sm font-bold text-neutral-900">Reglas de Automatización de Recordatorios</h3>
            <p className="text-xs text-neutral-500">
              Configura qué canales y momentos disparan avisos automáticos a tus pacientes
            </p>
          </div>

          {/* WhatsApp Automation Options */}
          <div className="space-y-3 pb-4 border-b border-neutral-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-neutral-900">Canal WhatsApp Oficial</p>
                  <p className="text-[11px] text-neutral-500">
                    Enviar mensajes directos desde el número {practiceSettings.whatsapp_number}
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={reminderConfig.whatsapp_enabled}
                onChange={e => updateReminderConfig({ whatsapp_enabled: e.target.checked })}
                className="w-4 h-4 text-emerald-600 rounded-md focus:ring-emerald-500"
              />
            </div>

            {reminderConfig.whatsapp_enabled && (
              <div className="ml-10 space-y-2 text-xs text-neutral-700">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reminderConfig.send_24h_before}
                    onChange={e => updateReminderConfig({ send_24h_before: e.target.checked })}
                    className="w-3.5 h-3.5 text-emerald-600 rounded-md"
                  />
                  <span>Enviar recordatorio anticipado <strong>24 horas antes</strong> del turno</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reminderConfig.send_2h_before}
                    onChange={e => updateReminderConfig({ send_2h_before: e.target.checked })}
                    className="w-3.5 h-3.5 text-emerald-600 rounded-md"
                  />
                  <span>Enviar aviso final de llegada <strong>2 horas antes</strong> de la cita</span>
                </label>
              </div>
            )}
          </div>

          {/* Email Automation Options */}
          <div className="space-y-3 pb-4 border-b border-neutral-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-neutral-900">Canal Correo Electrónico</p>
                  <p className="text-[11px] text-neutral-500">
                    Enviar correos electrónicos con tarjeta informativa y botón de confirmación
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={reminderConfig.email_enabled}
                onChange={e => updateReminderConfig({ email_enabled: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded-md focus:ring-blue-500"
              />
            </div>

            {reminderConfig.email_enabled && (
              <div className="ml-10 space-y-3 text-xs text-neutral-700">
                <div className="space-y-1">
                  <label className="font-semibold text-neutral-700">Nombre de remitente mostrado (Alias):</label>
                  <input
                    type="text"
                    value={reminderConfig.sender_email_alias}
                    onChange={e => updateReminderConfig({ sender_email_alias: e.target.value })}
                    className="w-full max-w-md px-3 py-1.5 text-xs rounded-xl border border-neutral-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Confirmation Rules */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-neutral-900">Confirmación Inteligente</p>
                  <p className="text-[11px] text-neutral-500">
                    Actualizar el estado del turno a "Confirmado" automáticamente al recibir respuesta del paciente
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={reminderConfig.auto_update_status_on_confirm}
                onChange={e => updateReminderConfig({ auto_update_status_on_confirm: e.target.checked })}
                className="w-4 h-4 text-purple-600 rounded-md focus:ring-purple-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: AUDITORÍA Y LOGS */}
      {activeTab === 'historial' && (
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-neutral-900">Historial de Notificaciones y Despachos</h3>
              <p className="text-xs text-neutral-500">
                Registro de todos los WhatsApps y correos enviados con estado de recepción y confirmación
              </p>
            </div>
            <span className="text-xs text-neutral-500 font-medium">
              {reminderLogs.length} registros
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 border-b border-neutral-100 text-neutral-500 font-semibold">
                <tr>
                  <th className="py-3 px-4">Fecha/Hora</th>
                  <th className="py-3 px-4">Paciente</th>
                  <th className="py-3 px-4">Canal</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Mensaje Resumido</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Confirmado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-neutral-700">
                {reminderLogs.map(log => {
                  const logDate = new Date(log.sent_at);
                  const formattedTime = logDate.toLocaleDateString('es-AR', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <tr key={log.id} className="hover:bg-neutral-50/60 transition-colors">
                      <td className="py-3 px-4 text-neutral-500 font-mono text-[11px]">
                        {formattedTime}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-neutral-900 block">{log.patient_name}</span>
                        <span className="text-[11px] text-neutral-400">{log.patient_phone}</span>
                      </td>
                      <td className="py-3 px-4">
                        {log.channel === 'whatsapp' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1 w-fit">
                            <MessageSquare className="w-3 h-3" />
                            WhatsApp
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 flex items-center gap-1 w-fit">
                            <Mail className="w-3 h-3" />
                            Email
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="capitalize font-medium text-neutral-600">
                          {log.timing === '24h' ? '24 hs antes' : log.timing === '2h' ? '2 hs antes' : 'Manual'}
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate text-neutral-600">
                        {log.message_preview}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-100 text-neutral-700">
                          {log.status === 'delivered' ? 'Entregado' : 'Enviado'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {log.confirmed ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-bold">
                            <CheckCheck className="w-3.5 h-3.5" />
                            Confirmado
                          </span>
                        ) : (
                          <span className="text-[11px] text-neutral-400 font-medium">Pendiente</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      <WhatsAppPreviewModal
        isOpen={waModalOpen}
        onClose={() => setWaModalOpen(false)}
        appointment={selectedAppointment}
        timing={modalTiming}
      />

      <EmailPreviewModal
        isOpen={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        appointment={selectedAppointment}
        timing={modalTiming}
      />
    </div>
  );
};
