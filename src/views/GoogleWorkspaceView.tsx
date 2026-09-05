import React, { useState, useEffect } from 'react';
import {
  Calendar,
  FileSpreadsheet,
  HardDrive,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  LogOut,
  CalendarCheck,
  Clock,
  ArrowRight,
  Database,
  Lock,
  UserCheck
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  signInWithGoogleWorkspace,
  disconnectGoogleWorkspace,
  initWorkspaceAuth,
  getWorkspaceAccessToken,
  createGoogleCalendarEvent,
  listGoogleCalendarEvents,
  exportDataToGoogleSheets,
  GoogleCalendarEventItem
} from '../lib/google-workspace';
import { useAgendaStore } from '../lib/store';
import { GoogleSignInButton } from '../components/GoogleSignInButton';

export const GoogleWorkspaceView: React.FC = () => {
  const { appointments, patients, services, practiceSettings, updatePracticeSettings } = useAgendaStore();

  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncingCalendar, setIsSyncingCalendar] = useState(false);
  const [isExportingSheets, setIsExportingSheets] = useState(false);
  const [isLoadingCalendarEvents, setIsLoadingCalendarEvents] = useState(false);
  
  const [googleCalendarEvents, setGoogleCalendarEvents] = useState<GoogleCalendarEventItem[]>([]);
  const [calendarSyncSuccess, setCalendarSyncSuccess] = useState<string | null>(null);
  const [calendarSyncError, setCalendarSyncError] = useState<string | null>(null);
  
  const [lastExportedSheetUrl, setLastExportedSheetUrl] = useState<string | null>(null);
  const [sheetsExportSuccess, setSheetsExportSuccess] = useState<string | null>(null);
  const [sheetsExportError, setSheetsExportError] = useState<string | null>(null);

  // User Confirmation Modal State for workspace mutations
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    actionText: string;
    actionType: 'calendar' | 'sheets';
    itemCount?: number;
  }>({
    isOpen: false,
    title: '',
    description: '',
    actionText: '',
    actionType: 'calendar'
  });

  useEffect(() => {
    const unsubscribe = initWorkspaceAuth(
      (authedUser, accessToken) => {
        setUser(authedUser);
        setToken(accessToken);
        if (authedUser?.displayName && (practiceSettings.professional_name === 'Dr/a. Especialista' || practiceSettings.professional_name === 'Dr. Gonzalo Corat')) {
          updatePracticeSettings({
            professional_name: authedUser.displayName,
            email: authedUser.email || practiceSettings.email,
            practice_name: practiceSettings.practice_name === 'Consultorio Médico Integral' || practiceSettings.practice_name === 'Consultorio Dr. Gonzalo Corat'
              ? `Consultorio ${authedUser.displayName}`
              : practiceSettings.practice_name
          });
        }
      },
      () => {
        setUser(null);
        setToken(null);
      }
    );
    return () => unsubscribe();
  }, [practiceSettings.professional_name, practiceSettings.practice_name]);

  const handleSignIn = async () => {
    setIsConnecting(true);
    setCalendarSyncError(null);
    setSheetsExportError(null);
    try {
      const res = await signInWithGoogleWorkspace();
      if (res) {
        setUser(res.user);
        setToken(res.accessToken);
        // Load initial calendar events
        loadUpcomingGoogleEvents(res.accessToken);
      }
    } catch (err: any) {
      setCalendarSyncError(err.message || 'No se pudo conectar la cuenta de Google');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSignOut = async () => {
    await disconnectGoogleWorkspace();
    setUser(null);
    setToken(null);
    setGoogleCalendarEvents([]);
    setCalendarSyncSuccess(null);
    setSheetsExportSuccess(null);
  };

  const loadUpcomingGoogleEvents = async (customToken?: string) => {
    const activeToken = customToken || (await getWorkspaceAccessToken());
    if (!activeToken) return;

    setIsLoadingCalendarEvents(true);
    try {
      const res = await listGoogleCalendarEvents();
      if (res.success && res.events) {
        setGoogleCalendarEvents(res.events);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoadingCalendarEvents(false);
    }
  };

  // Trigger confirmation modal before mutating Google Calendar
  const requestSyncCalendar = () => {
    const upcoming = appointments.filter(a => a.status !== 'cancelled');
    setConfirmationModal({
      isOpen: true,
      title: '¿Sincronizar turnos con Google Calendar?',
      description: `Se registrarán ${upcoming.length} turnos médicos activos en tu calendario principal de Google Calendar ("primary"), asignando recordatorios para el consultorio.`,
      actionText: 'Confirmar Sincronización',
      actionType: 'calendar',
      itemCount: upcoming.length
    });
  };

  // Perform actual calendar synchronization
  const executeSyncCalendar = async () => {
    setConfirmationModal(prev => ({ ...prev, isOpen: false }));
    setIsSyncingCalendar(true);
    setCalendarSyncError(null);
    setCalendarSyncSuccess(null);

    try {
      const upcoming = appointments.filter(a => a.status !== 'cancelled');
      let createdCount = 0;

      for (const app of upcoming) {
        const serv = services.find(s => s.id === app.service_id);
        const pat = patients.find(p => p.id === app.patient_id);
        const result = await createGoogleCalendarEvent(app, serv, pat, practiceSettings);
        if (result.success) {
          createdCount++;
        }
      }

      setCalendarSyncSuccess(`¡Sincronización exitosa! Se añadieron o actualizaron ${createdCount} eventos en Google Calendar.`);
      loadUpcomingGoogleEvents();
    } catch (err: any) {
      setCalendarSyncError(err.message || 'Ocurrió un error al sincronizar turnos');
    } finally {
      setIsSyncingCalendar(false);
    }
  };

  // Trigger confirmation modal before creating Google Spreadsheet
  const requestExportSheets = () => {
    setConfirmationModal({
      isOpen: true,
      title: '¿Crear planilla en Google Sheets?',
      description: `Se creará un nuevo archivo en tu Google Drive con 2 hojas: "Turnos y Cobros" (${appointments.length} registros) y "Directorio de Pacientes" (${patients.length} pacientes).`,
      actionText: 'Crear Planilla en Sheets',
      actionType: 'sheets',
      itemCount: appointments.length + patients.length
    });
  };

  // Perform actual sheets export
  const executeExportSheets = async () => {
    setConfirmationModal(prev => ({ ...prev, isOpen: false }));
    setIsExportingSheets(true);
    setSheetsExportError(null);
    setSheetsExportSuccess(null);

    try {
      const result = await exportDataToGoogleSheets(patients, appointments, services, practiceSettings);
      if (result.success && result.spreadsheetUrl) {
        setLastExportedSheetUrl(result.spreadsheetUrl);
        setSheetsExportSuccess('¡Planilla creada con éxito en Google Drive!');
      } else {
        setSheetsExportError(result.error || 'No se pudo crear la planilla');
      }
    } catch (err: any) {
      setSheetsExportError(err.message || 'Error al exportar planilla');
    } finally {
      setIsExportingSheets(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 uppercase tracking-wider">
              Google Workspace Cloud
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              OAuth Seguro con Permisos Oficiales
            </span>
          </div>
          <h1 className="text-xl font-black text-neutral-900 tracking-tight">
            Sincronización con Google Calendar, Sheets y Drive
          </h1>
          <p className="text-xs text-neutral-600 mt-1 max-w-2xl">
            Conecta tu cuenta médica de Google para reflejar cada turno en tu calendario de teléfono/computadora y respaldar pacientes y facturación en Google Sheets automáticamente.
          </p>
        </div>

        {/* Authentication Card */}
        <div>
          {user ? (
            <div>
              <div className="flex items-center gap-3 p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Usuario Google'}
                    className="w-9 h-9 rounded-full border border-neutral-300 object-cover"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-sky-600 text-white flex items-center justify-center font-bold text-xs">
                    {user.displayName?.charAt(0) || 'P'}
                  </div>
                )}
                <div className="text-left pr-2">
                  <p className="text-xs font-bold text-neutral-900 truncate max-w-[160px]">
                    {user.displayName || 'Profesional Conectado'}
                  </p>
                  <p className="text-[10px] text-neutral-500 truncate max-w-[160px]">
                    {user.email}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  title="Desconectar cuenta de Google"
                  className="p-1.5 text-neutral-400 hover:text-rose-600 rounded-lg transition hover:bg-white"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>

              {user.displayName && practiceSettings.professional_name !== user.displayName && (
                <button
                  type="button"
                  onClick={() => {
                    updatePracticeSettings({
                      professional_name: user.displayName || practiceSettings.professional_name,
                      email: user.email || practiceSettings.email,
                      practice_name: `Consultorio ${user.displayName}`
                    });
                  }}
                  className="mt-2 w-full text-[10px] font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-2 py-1 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  title="Actualizar el nombre del consultorio con mi usuario de Google"
                >
                  <UserCheck className="w-3 h-3 text-sky-600" />
                  <span>Usar mi nombre ({user.displayName}) en el consultorio</span>
                </button>
              )}
            </div>
          ) : (
            <GoogleSignInButton
              onClick={handleSignIn}
              loading={isConnecting}
              label="Conectar con Google"
            />
          )}
        </div>
      </div>

      {!user && (
        <div className="p-4 bg-sky-50 border border-sky-200 rounded-2xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-xs font-bold text-sky-950">Inicia sesión con tu cuenta de Google</h3>
            <p className="text-[11px] text-sky-800 mt-0.5 leading-relaxed">
              Haz clic en el botón superior para autorizar a la aplicación a ver y crear eventos en tu Google Calendar y generar tus planillas de pacientes en Google Sheets con tu permiso.
            </p>
          </div>
        </div>
      )}

      {/* Main Grid: Google Calendar & Google Sheets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Google Calendar */}
        <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-neutral-900">Google Calendar</h2>
                  <p className="text-[11px] text-neutral-500">Agenda médica personal sincronizada</p>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${user ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-100 text-neutral-600'}`}>
                {user ? 'Conectado' : 'Desconectado'}
              </span>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed">
              Sube tus turnos al calendario de tu teléfono Android o iPhone. Recibirás notificaciones push de Google 24h y 1h antes de cada consulta médica.
            </p>

            <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2 text-xs">
              <div className="flex justify-between items-center text-neutral-700">
                <span>Turnos activos en tu consultorio:</span>
                <span className="font-bold text-neutral-900">{appointments.filter(a => a.status !== 'cancelled').length}</span>
              </div>
              <div className="flex justify-between items-center text-neutral-700">
                <span>Eventos recuperados de Google:</span>
                <span className="font-bold text-neutral-900">{googleCalendarEvents.length}</span>
              </div>
            </div>

            {/* Sync Feedbacks */}
            {calendarSyncSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{calendarSyncSuccess}</span>
              </div>
            )}

            {calendarSyncError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-800">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{calendarSyncError}</span>
              </div>
            )}
          </div>

          <div className="pt-2 space-y-2">
            <button
              type="button"
              id="btn-sync-google-calendar"
              disabled={!user || isSyncingCalendar}
              onClick={requestSyncCalendar}
              className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCalendar ? 'animate-spin' : ''}`} />
              <span>{isSyncingCalendar ? 'Sincronizando con Google Calendar...' : 'Sincronizar Turnos con Calendar'}</span>
            </button>

            {user && (
              <button
                type="button"
                onClick={() => loadUpcomingGoogleEvents()}
                disabled={isLoadingCalendarEvents}
                className="w-full py-2 px-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-medium transition flex items-center justify-center gap-1.5"
              >
                <Clock className="w-3.5 h-3.5 text-neutral-500" />
                <span>{isLoadingCalendarEvents ? 'Leyendo eventos...' : 'Refrescar eventos de Google Calendar'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Card 2: Google Sheets & Drive */}
        <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-neutral-900">Google Sheets & Drive</h2>
                  <p className="text-[11px] text-neutral-500">Respaldos y base de datos en nube</p>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${user ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-100 text-neutral-600'}`}>
                {user ? 'Listo' : 'Desconectado'}
              </span>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed">
              Exporta con un solo clic todos tus pacientes, fichas clínicas, historial de turnos y caja a una hoja de cálculo nativa de Google Sheets en tu Google Drive.
            </p>

            <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2 text-xs">
              <div className="flex justify-between items-center text-neutral-700">
                <span>Pacientes a exportar:</span>
                <span className="font-bold text-neutral-900">{patients.length} registros</span>
              </div>
              <div className="flex justify-between items-center text-neutral-700">
                <span>Historial de turnos y cobros:</span>
                <span className="font-bold text-neutral-900">{appointments.length} registros</span>
              </div>
            </div>

            {/* Sheets Feedbacks */}
            {sheetsExportSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-2 text-xs text-emerald-800">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{sheetsExportSuccess}</span>
                </div>
                {lastExportedSheetUrl && (
                  <a
                    href={lastExportedSheetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold underline flex items-center gap-1 text-emerald-900 hover:text-emerald-950"
                  >
                    <span>Abrir Sheet</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}

            {sheetsExportError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-800">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{sheetsExportError}</span>
              </div>
            )}
          </div>

          <div className="pt-2">
            <button
              type="button"
              id="btn-export-google-sheets"
              disabled={!user || isExportingSheets}
              onClick={requestExportSheets}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
            >
              <HardDrive className={`w-3.5 h-3.5 ${isExportingSheets ? 'animate-pulse' : ''}`} />
              <span>{isExportingSheets ? 'Generando planilla en Google Drive...' : 'Crear Planilla en Google Sheets'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Upcoming Google Calendar Events Explorer */}
      {user && googleCalendarEvents.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
            <div className="flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                Próximos Eventos en tu Google Calendar ({googleCalendarEvents.length})
              </h3>
            </div>
            <span className="text-[11px] text-neutral-500">Sincronizado con primary</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {googleCalendarEvents.slice(0, 6).map(evt => {
              const dateStr = evt.start?.dateTime || evt.start?.date;
              const formattedDate = dateStr
                ? new Date(dateStr).toLocaleDateString('es-AR', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    hour: evt.start?.dateTime ? '2-digit' : undefined,
                    minute: evt.start?.dateTime ? '2-digit' : undefined
                  })
                : 'Sin fecha';

              return (
                <div key={evt.id} className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                      {formattedDate}
                    </span>
                    {evt.htmlLink && (
                      <a
                        href={evt.htmlLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-neutral-400 hover:text-blue-600 transition"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  <p className="text-xs font-bold text-neutral-900 truncate" title={evt.summary}>
                    {evt.summary || 'Evento sin título'}
                  </p>
                  {evt.description && (
                    <p className="text-[11px] text-neutral-500 line-clamp-2">
                      {evt.description}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Confirmation Modal (Mandatory User Confirmation for Destructive/Mutating Operations) */}
      {confirmationModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-neutral-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center flex-shrink-0">
                {confirmationModal.actionType === 'calendar' ? (
                  <Calendar className="w-5 h-5" />
                ) : (
                  <FileSpreadsheet className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-900">
                  {confirmationModal.title}
                </h3>
                <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                  {confirmationModal.description}
                </p>
              </div>
            </div>

            <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200 text-xs text-neutral-600 space-y-1">
              <div className="flex justify-between">
                <span>Cuenta de destino:</span>
                <span className="font-semibold text-neutral-900">{user?.email || 'Tu cuenta de Google'}</span>
              </div>
              <div className="flex justify-between">
                <span>Elementos procesados:</span>
                <span className="font-semibold text-neutral-900">{confirmationModal.itemCount ?? 0}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setConfirmationModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={
                  confirmationModal.actionType === 'calendar'
                    ? executeSyncCalendar
                    : executeExportSheets
                }
                className={`px-4 py-2 text-xs font-bold text-white rounded-xl transition shadow-xs ${
                  confirmationModal.actionType === 'calendar'
                    ? 'bg-sky-600 hover:bg-sky-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {confirmationModal.actionText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
