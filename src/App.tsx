import React, { useState, useEffect } from 'react';
import { AgendaStoreProvider, useAgendaStore } from './lib/store';
import { AppLayout } from './components/AppLayout';
import { DashboardView } from './views/DashboardView';
import { AgendaView } from './views/AgendaView';
import { PatientsView } from './views/PatientsView';
import { AssistantBotView } from './views/AssistantBotView';
import { ServicesView } from './views/ServicesView';
import { AvailabilityView } from './views/AvailabilityView';
import { AnalyticsView } from './views/AnalyticsView';
import { SettingsView } from './views/SettingsView';
import { SubscriptionPlansView } from './views/SubscriptionPlansView';
import { GoogleWorkspaceView } from './views/GoogleWorkspaceView';
import { PublicBookingView } from './views/PublicBookingView';
import { WaitlistView } from './views/WaitlistView';
import { RemindersView } from './views/RemindersView';
import { BillingView } from './views/BillingView';
import { ConsultationsView } from './views/ConsultationsView';
import { WhatsAppChatsView } from './views/WhatsAppChatsView';
import { OnboardingGuideView } from './views/OnboardingGuideView';
import { PublicPageEditorView } from './views/PublicPageEditorView';
import { SuperAdminAnalyticsView } from './views/SuperAdminAnalyticsView';
import { SuperAdminApisView } from './views/SuperAdminApisView';
import { LandingPageView } from './views/LandingPageView';
import { AuthModal } from './components/AuthModal';
import { ProFeatureGate } from './components/ProFeatureGate';
import { AppointmentModal } from './components/AppointmentModal';
import { PatientModal } from './components/PatientModal';
import { ServiceModal } from './components/ServiceModal';
import { WaitlistModal } from './components/WaitlistModal';
import { ConsultationModal } from './components/ConsultationModal';
import { Appointment, Patient, Service, WaitlistEntry, ConsultationRecord } from './types';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

function MainApp() {
  const {
    patients,
    appointments,
    addPatient,
    updateWaitlistEntry,
    confirmAppointmentByPatient,
    currentUser,
    practiceSettings
  } = useAgendaStore();

  // Default entry point is the landing page for unauthenticated visitors or direct visits
  const [activeTab, setActiveTab] = useState<string>('landing');
  const [tabHistory, setTabHistory] = useState<string[]>(['landing']);

  // Auth modal states
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [pendingProtectedTab, setPendingProtectedTab] = useState<string | null>(null);

  const VALID_TABS = [
    'guia', 'dashboard', 'agenda', 'pacientes', 'consultas', 'chats', 'asistente',
    'espera', 'recordatorios', 'cobros', 'servicios', 'horarios', 'metricas',
    'suscripcion', 'google-sync', 'editor-pagina', 'configuracion', 'superadmin-analytics', 'superadmin-apis'
  ];

  const isGonzalo = currentUser?.email?.toLowerCase() === 'gonzalocorat@gmail.com';
  const isSuperAdmin = isGonzalo && Boolean(currentUser?.isSuperAdmin);
  const isBasicPlan = practiceSettings.subscription_plan === 'basic' && !isSuperAdmin;
  const isTrial = !isSuperAdmin && (practiceSettings.subscription_plan === 'trial' || Boolean(practiceSettings.trial_active));
  const trialExpired = isTrial && (practiceSettings.trial_days_left ?? 0) <= 0 && !practiceSettings.is_permanent;

  // Synchronize browser URL bar cleanly
  const syncBrowserUrl = (tab: string) => {
    if (typeof window === 'undefined') return;
    let targetPath = '/';
    if (tab === 'portal') {
      targetPath = `/u/${practiceSettings.handle || 'consultorio-medico'}`;
    } else if (tab === 'landing') {
      targetPath = '/';
    } else if (VALID_TABS.includes(tab)) {
      targetPath = `/${tab}`;
    }
    if (window.location.pathname !== targetPath) {
      window.history.pushState({ tab }, '', targetPath);
    }
  };

  const handleSelectTab = (tab: string) => {
    // Superadmin tabs are strictly protected
    if ((tab === 'superadmin-analytics' || tab === 'superadmin-apis') && !isSuperAdmin) {
      tab = 'dashboard';
    }

    // Landing page is only accessible to unauthenticated visitors or super admin
    if (tab === 'landing' && currentUser && !isSuperAdmin) {
      tab = 'dashboard';
    }

    // Public routes that don't need authentication
    if (tab === 'landing' || tab === 'portal') {
      setTabHistory(prev => (prev[prev.length - 1] === tab ? prev : [...prev, tab]));
      setActiveTab(tab);
      syncBrowserUrl(tab);
      return;
    }

    // Protected internal panel routes: Require login
    if (!currentUser) {
      setPendingProtectedTab(tab);
      setAuthModalMode('login');
      setAuthModalOpen(true);
      return;
    }

    setTabHistory(prev => {
      if (prev[prev.length - 1] === tab) return prev;
      return [...prev, tab];
    });
    setActiveTab(tab);
    syncBrowserUrl(tab);
  };

  const handleAuthSuccess = () => {
    const destination = pendingProtectedTab || 'dashboard';
    const finalDest = ((destination === 'superadmin-analytics' || destination === 'superadmin-apis') && !isSuperAdmin) ? 'dashboard' : destination;
    setPendingProtectedTab(null);
    setTabHistory(prev => [...prev, finalDest]);
    setActiveTab(finalDest);
    syncBrowserUrl(finalDest);
  };

  const handleBack = () => {
    if (tabHistory.length > 1) {
      const newHist = [...tabHistory];
      newHist.pop(); // pop current view
      const prevTab = newHist[newHist.length - 1] || (currentUser ? 'dashboard' : 'landing');
      setTabHistory(newHist);
      setActiveTab(prevTab);
      syncBrowserUrl(prevTab);
    } else if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    } else {
      const fallback = currentUser ? 'dashboard' : 'landing';
      setActiveTab(fallback);
      syncBrowserUrl(fallback);
    }
  };

  // Modal states
  const [aptModalOpen, setAptModalOpen] = useState(false);
  const [aptToEdit, setAptToEdit] = useState<Appointment | null>(null);
  const [defaultDate, setDefaultDate] = useState<string | undefined>();
  const [defaultTime, setDefaultTime] = useState<string | undefined>();
  const [defaultPatientId, setDefaultPatientId] = useState<string | undefined>();

  const [consultationModalOpen, setConsultationModalOpen] = useState(false);
  const [consultationToEdit, setConsultationToEdit] = useState<ConsultationRecord | null>(null);
  const [consultationPatientId, setConsultationPatientId] = useState<string | undefined>();
  const [consultationAppointmentId, setConsultationAppointmentId] = useState<string | undefined>();

  const [patientModalOpen, setPatientModalOpen] = useState(false);
  const [patientToEdit, setPatientToEdit] = useState<Patient | null>(null);

  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [serviceToEdit, setServiceToEdit] = useState<Service | null>(null);

  const [waitlistModalOpen, setWaitlistModalOpen] = useState(false);
  const [waitlistToEdit, setWaitlistToEdit] = useState<WaitlistEntry | null>(null);
  const [activeWaitlistToSchedule, setActiveWaitlistToSchedule] = useState<WaitlistEntry | null>(null);

  // Check initial URL parameters and subscribe to browser history navigation (popstate)
  useEffect(() => {
    const parseUrlToTab = () => {
      const pathname = window.location.pathname;
      const hash = window.location.hash;

      // Handle public booking URL like /u/consultorio-medico or #/u/...
      if (pathname.startsWith('/u/') || hash.startsWith('#/u/')) {
        return 'portal';
      }

      const params = new URLSearchParams(window.location.search);
      if (params.get('portal') === 'true') {
        return 'portal';
      }

      // Check URL pathname like /agenda, /pacientes, /cobros
      const rawSlug = pathname.replace(/^\//, '').toLowerCase().trim();
      const queryTab = params.get('tab');
      const targetSlug = VALID_TABS.includes(rawSlug) ? rawSlug : (queryTab && VALID_TABS.includes(queryTab) ? queryTab : null);

      if (targetSlug) {
        if (currentUser) {
          if (targetSlug === 'superadmin-analytics' && !isSuperAdmin) {
            return 'dashboard';
          }
          return targetSlug;
        } else {
          setPendingProtectedTab(targetSlug);
          setAuthModalOpen(true);
          return 'landing';
        }
      }

      if (params.get('panel') === 'true') {
        return currentUser ? 'dashboard' : 'landing';
      }

      // Default
      return currentUser ? 'dashboard' : 'landing';
    };

    const initialTab = parseUrlToTab();
    setActiveTab(initialTab);

    // Appointment confirmation link
    const params = new URLSearchParams(window.location.search);
    const confirmAptId = params.get('confirmar');
    if (confirmAptId) {
      confirmAppointmentByPatient(confirmAptId);
      alert('¡Turno confirmado con éxito por el paciente!');
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const handlePopState = () => {
      const poppedTab = parseUrlToTab();
      setActiveTab(poppedTab);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentUser, isSuperAdmin]);

  const handleOpenNewAppointment = (date?: string, time?: string) => {
    if (trialExpired) {
      alert('Tu suscripción no se encuentra activa. Suscríbete al Plan Básico o Pro AI para continuar agendando nuevos turnos.');
      handleSelectTab('suscripcion');
      return;
    }
    setAptToEdit(null);
    setDefaultPatientId(undefined);
    setDefaultDate(date);
    setDefaultTime(time);
    setAptModalOpen(true);
  };

  const handleEditAppointment = (apt: Appointment) => {
    setAptToEdit(apt);
    setDefaultPatientId(apt.patient_id);
    setAptModalOpen(true);
  };

  const handleOpenAppointmentById = (aptId: string) => {
    const found = appointments.find(a => a.id === aptId);
    if (found) {
      setAptToEdit(found);
      setDefaultPatientId(found.patient_id);
      setAptModalOpen(true);
    }
  };

  const handleOpenConsultation = (patientId?: string, appointmentId?: string, consultation?: ConsultationRecord) => {
    setConsultationToEdit(consultation || null);
    setConsultationPatientId(patientId);
    setConsultationAppointmentId(appointmentId);
    setConsultationModalOpen(true);
  };

  const handleOpenNewPatient = () => {
    setPatientToEdit(null);
    setPatientModalOpen(true);
  };

  const handleEditPatient = (patient: Patient) => {
    setPatientToEdit(patient);
    setPatientModalOpen(true);
  };

  const handleScheduleForPatient = (patient: Patient) => {
    setAptToEdit(null);
    setDefaultPatientId(patient.id);
    setDefaultDate(new Date().toISOString().split('T')[0]);
    setDefaultTime('11:00');
    setAptModalOpen(true);
  };

  const handleOpenNewService = () => {
    setServiceToEdit(null);
    setServiceModalOpen(true);
  };

  const handleEditService = (service: Service) => {
    setServiceToEdit(service);
    setServiceModalOpen(true);
  };

  const handleOpenNewWaitlist = () => {
    setWaitlistToEdit(null);
    setWaitlistModalOpen(true);
  };

  const handleEditWaitlist = (entry: WaitlistEntry) => {
    setWaitlistToEdit(entry);
    setWaitlistModalOpen(true);
  };

  const handleScheduleFromWaitlist = (entry: WaitlistEntry) => {
    setActiveWaitlistToSchedule(entry);
    let p = patients.find(patient => 
      patient.id === entry.patient_id || 
      patient.phone.replace(/\D/g, '') === entry.patient_phone.replace(/\D/g, '')
    );
    if (!p) {
      const parts = entry.patient_name.trim().split(' ');
      p = addPatient({
        first_name: parts[0] || 'Paciente',
        last_name: parts.slice(1).join(' ') || 'Espera',
        phone: entry.patient_phone,
        email: entry.patient_email
      });
    }

    const timeSuggestion = entry.preferred_time_range === 'morning' ? '10:00' : '15:30';
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    setDefaultDate(tomorrow.toISOString().split('T')[0]);
    setDefaultTime(timeSuggestion);
    setAptToEdit(null);
    setAptModalOpen(true);

    updateWaitlistEntry(entry.id, { status: 'scheduled' });
  };

  const handleOpenNewAppointmentWithPatient = (patientName: string, patientPhone: string) => {
    let p = patients.find(patient =>
      patient.phone.replace(/\D/g, '') === patientPhone.replace(/\D/g, '')
    );
    if (!p) {
      const parts = patientName.trim().split(' ');
      p = addPatient({
        first_name: parts[0] || 'Paciente',
        last_name: parts.slice(1).join(' ') || '',
        phone: patientPhone,
      });
    }
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setDefaultDate(tomorrow.toISOString().split('T')[0]);
    setDefaultTime('10:00');
    setAptToEdit(null);
    setAptModalOpen(true);
  };

  // If viewing landing page in full view
  if (activeTab === 'landing') {
    return (
      <>
        <LandingPageView
          onEnterApp={() => {
            if (currentUser) {
              handleSelectTab('dashboard');
            } else {
              setPendingProtectedTab('dashboard');
              setAuthModalMode('login');
              setAuthModalOpen(true);
            }
          }}
          onOpenPortal={() => handleSelectTab('portal')}
          onOpenAuth={(mode) => {
            setPendingProtectedTab('dashboard');
            setAuthModalMode(mode);
            setAuthModalOpen(true);
          }}
        />
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          initialMode={authModalMode}
          onSuccess={handleAuthSuccess}
        />
      </>
    );
  }

  // If viewing the patient portal in standalone full view
  if (activeTab === 'portal') {
    return (
      <PublicBookingView
        onBack={handleBack}
        onBackToDashboard={handleBack}
      />
    );
  }

  // If user is not authenticated and trying to view the internal panel, fall back safely
  if (!currentUser) {
    return (
      <>
        <LandingPageView
          onEnterApp={() => {
            setPendingProtectedTab('dashboard');
            setAuthModalMode('login');
            setAuthModalOpen(true);
          }}
          onOpenPortal={() => handleSelectTab('portal')}
          onOpenAuth={(mode) => {
            setPendingProtectedTab('dashboard');
            setAuthModalMode(mode);
            setAuthModalOpen(true);
          }}
        />
        <AuthModal
          isOpen={true}
          onClose={() => setActiveTab('landing')}
          initialMode="login"
          onSuccess={handleAuthSuccess}
        />
      </>
    );
  }

  return (
    <AppLayout
      activeTab={activeTab}
      onSelectTab={handleSelectTab}
      onOpenNewAppointment={() => handleOpenNewAppointment()}
      onOpenAppointment={handleOpenAppointmentById}
    >
      {activeTab === 'guia' && (
        <OnboardingGuideView
          onNavigateToTab={handleSelectTab}
          onOpenNewAppointment={() => handleOpenNewAppointment()}
        />
      )}

      {activeTab === 'dashboard' && (
        <DashboardView
          onOpenNewAppointment={() => handleOpenNewAppointment()}
          onNavigateToTab={handleSelectTab}
          onEditAppointment={handleEditAppointment}
        />
      )}

      {activeTab === 'agenda' && (
        <AgendaView
          onOpenNewAppointment={handleOpenNewAppointment}
          onEditAppointment={handleEditAppointment}
          onNavigateToTab={handleSelectTab}
        />
      )}

      {activeTab === 'cobros' && (
        <BillingView />
      )}

      {activeTab === 'espera' && (
        <WaitlistView
          onOpenNewWaitlist={handleOpenNewWaitlist}
          onEditWaitlist={handleEditWaitlist}
          onScheduleFromWaitlist={handleScheduleFromWaitlist}
        />
      )}

      {activeTab === 'recordatorios' && (
        <RemindersView />
      )}

      {activeTab === 'pacientes' && (
        <PatientsView
          onOpenNewPatient={handleOpenNewPatient}
          onEditPatient={handleEditPatient}
          onScheduleForPatient={handleScheduleForPatient}
          onOpenAppointment={handleOpenAppointmentById}
        />
      )}

      {/* Plan-Protected: Consultas (SOAP) */}
      {activeTab === 'consultas' && (
        isBasicPlan ? (
          <ProFeatureGate
            featureTitle="Historias Clínicas SOAP con Dictado por Voz e IA"
            featureDescription="Registra la evolución médica de cada paciente grabando notas de audio en el consultorio. La IA transcribe automáticamente y sintetiza en formato SOAP profesional."
            icon="soap"
            onNavigateToPlans={() => handleSelectTab('suscripcion')}
          />
        ) : (
          <ConsultationsView />
        )
      )}

      {/* Plan-Protected: WhatsApp Chats & Bot */}
      {(activeTab === 'chats' || activeTab === 'asistente') && (
        isBasicPlan ? (
          <ProFeatureGate
            featureTitle="Asistente de WhatsApp Autónomo con Inteligencia Artificial"
            featureDescription="Conecta tu propio WhatsApp para que la IA atienda a tus pacientes 24/7, coordine turnos según tus horarios y cobre señas bancarias por Alias o Mercado Pago."
            icon="bot"
            onNavigateToPlans={() => handleSelectTab('suscripcion')}
          />
        ) : (
          <WhatsAppChatsView
            onOpenNewAppointmentWithPatient={handleOpenNewAppointmentWithPatient}
            onNavigateToTab={handleSelectTab}
          />
        )
      )}

      {activeTab === 'servicios' && (
        <ServicesView
          onOpenNewService={handleOpenNewService}
          onEditService={handleEditService}
        />
      )}

      {activeTab === 'horarios' && (
        <AvailabilityView />
      )}

      {activeTab === 'metricas' && (
        <AnalyticsView />
      )}

      {activeTab === 'suscripcion' && (
        <SubscriptionPlansView />
      )}

      {/* Plan-Protected: Google Workspace Sync */}
      {activeTab === 'google-sync' && (
        isBasicPlan ? (
          <ProFeatureGate
            featureTitle="Sincronización Bidireccional con Google Calendar"
            featureDescription="Sincroniza tus turnos automáticamente con tu calendario personal de Google Calendar y exporta pacientes a Google Sheets en tiempo real."
            icon="google"
            onNavigateToPlans={() => handleSelectTab('suscripcion')}
          />
        ) : (
          <GoogleWorkspaceView />
        )
      )}

      {activeTab === 'editor-pagina' && (
        <PublicPageEditorView onNavigateToTab={handleSelectTab} />
      )}

      {/* Role-Protected: Super Admin Analytics (Gonzalo) */}
      {activeTab === 'superadmin-analytics' && (
        isSuperAdmin ? (
          <SuperAdminAnalyticsView />
        ) : (
          <div className="max-w-xl mx-auto py-16 px-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-neutral-900 mb-2">
              Acceso Restringido a Super Administrador
            </h3>
            <p className="text-xs sm:text-sm text-neutral-600 mb-6 leading-relaxed">
              Este módulo contiene estadísticas globales de facturación y tenencia SaaS reservadas exclusivamente para la administración central de AgendaPro AI.
            </p>
            <button
              type="button"
              onClick={() => handleSelectTab('dashboard')}
              className="px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver a Mi Panel Principal</span>
            </button>
          </div>
        )
      )}

      {/* Role-Protected: Super Admin APIs & Webhooks (Gonzalo) */}
      {activeTab === 'superadmin-apis' && (
        isSuperAdmin ? (
          <SuperAdminApisView />
        ) : (
          <div className="max-w-xl mx-auto py-16 px-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-neutral-900 mb-2">
              Acceso Restringido a Super Administrador
            </h3>
            <p className="text-xs sm:text-sm text-neutral-600 mb-6 leading-relaxed">
              Esta sección de credenciales maestras y webhooks está reservada para el administrador de la plataforma.
            </p>
            <button
              type="button"
              onClick={() => handleSelectTab('dashboard')}
              className="px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver a Mi Panel Principal</span>
            </button>
          </div>
        )
      )}

      {activeTab === 'configuracion' && (
        <SettingsView />
      )}

      {/* Auth Modal for re-authenticating or switching user */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authModalMode}
        onSuccess={handleAuthSuccess}
      />

      {/* Shared Modals */}
      <AppointmentModal
        isOpen={aptModalOpen}
        onClose={() => setAptModalOpen(false)}
        appointmentToEdit={aptToEdit}
        defaultDate={defaultDate}
        defaultTime={defaultTime}
        defaultPatientId={defaultPatientId}
        onOpenConsultation={handleOpenConsultation}
      />

      {consultationModalOpen && (
        <ConsultationModal
          consultation={consultationToEdit}
          patientId={consultationPatientId}
          appointmentId={consultationAppointmentId}
          onClose={() => {
            setConsultationModalOpen(false);
            setConsultationToEdit(null);
            setConsultationPatientId(undefined);
            setConsultationAppointmentId(undefined);
          }}
          onSaved={() => {
            setConsultationModalOpen(false);
            setConsultationToEdit(null);
            setConsultationPatientId(undefined);
            setConsultationAppointmentId(undefined);
          }}
        />
      )}

      <PatientModal
        isOpen={patientModalOpen}
        onClose={() => setPatientModalOpen(false)}
        patientToEdit={patientToEdit}
      />

      <ServiceModal
        isOpen={serviceModalOpen}
        onClose={() => setServiceModalOpen(false)}
        serviceToEdit={serviceToEdit}
      />

      <WaitlistModal
        isOpen={waitlistModalOpen}
        onClose={() => setWaitlistModalOpen(false)}
        entryToEdit={waitlistToEdit}
      />
    </AppLayout>
  );
}

export default function App() {
  return (
    <AgendaStoreProvider>
      <MainApp />
    </AgendaStoreProvider>
  );
}
