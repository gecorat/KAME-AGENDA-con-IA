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
import { PublicBookingView } from './views/PublicBookingView';
import { WaitlistView } from './views/WaitlistView';
import { RemindersView } from './views/RemindersView';
import { BillingView } from './views/BillingView';
import { ConsultationsView } from './views/ConsultationsView';
import { AppointmentModal } from './components/AppointmentModal';
import { PatientModal } from './components/PatientModal';
import { ServiceModal } from './components/ServiceModal';
import { WaitlistModal } from './components/WaitlistModal';
import { Appointment, Patient, Service, WaitlistEntry } from './types';

function MainApp() {
  const { patients, addPatient, updateWaitlistEntry, confirmAppointmentByPatient } = useAgendaStore();
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Modal states
  const [aptModalOpen, setAptModalOpen] = useState(false);
  const [aptToEdit, setAptToEdit] = useState<Appointment | null>(null);
  const [defaultDate, setDefaultDate] = useState<string | undefined>();
  const [defaultTime, setDefaultTime] = useState<string | undefined>();

  const [patientModalOpen, setPatientModalOpen] = useState(false);
  const [patientToEdit, setPatientToEdit] = useState<Patient | null>(null);

  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [serviceToEdit, setServiceToEdit] = useState<Service | null>(null);

  const [waitlistModalOpen, setWaitlistModalOpen] = useState(false);
  const [waitlistToEdit, setWaitlistToEdit] = useState<WaitlistEntry | null>(null);
  const [activeWaitlistToSchedule, setActiveWaitlistToSchedule] = useState<WaitlistEntry | null>(null);

  // Check initial URL to see if it's the public booking page /u/ or patient confirmation
  useEffect(() => {
    if (window.location.pathname.startsWith('/u/')) {
      setActiveTab('portal');
    }
    const params = new URLSearchParams(window.location.search);
    const confirmAptId = params.get('confirmar');
    if (confirmAptId) {
      confirmAppointmentByPatient(confirmAptId);
      alert('¡Turno confirmado con éxito por el paciente!');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleOpenNewAppointment = (date?: string, time?: string) => {
    setAptToEdit(null);
    setDefaultDate(date);
    setDefaultTime(time);
    setAptModalOpen(true);
  };

  const handleEditAppointment = (apt: Appointment) => {
    setAptToEdit(apt);
    setAptModalOpen(true);
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
    // Find or create patient if not linked
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

    // Default time based on preference
    const timeSuggestion = entry.preferred_time_range === 'morning' ? '10:00' : '15:30';
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    setDefaultDate(tomorrow.toISOString().split('T')[0]);
    setDefaultTime(timeSuggestion);
    setAptToEdit(null);
    setAptModalOpen(true);

    // Mark as scheduled in waitlist
    updateWaitlistEntry(entry.id, { status: 'scheduled' });
  };

  // If viewing the patient portal in standalone full view
  if (activeTab === 'portal') {
    return (
      <PublicBookingView onBackToDashboard={() => setActiveTab('dashboard')} />
    );
  }

  return (
    <AppLayout
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      onOpenNewAppointment={() => handleOpenNewAppointment()}
    >
      {activeTab === 'dashboard' && (
        <DashboardView
          onOpenNewAppointment={() => handleOpenNewAppointment()}
          onNavigateToTab={setActiveTab}
          onEditAppointment={handleEditAppointment}
        />
      )}

      {activeTab === 'agenda' && (
        <AgendaView
          onOpenNewAppointment={handleOpenNewAppointment}
          onEditAppointment={handleEditAppointment}
          onNavigateToTab={setActiveTab}
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
        />
      )}

      {activeTab === 'consultas' && (
        <ConsultationsView />
      )}

      {activeTab === 'asistente' && (
        <AssistantBotView />
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

      {activeTab === 'configuracion' && (
        <SettingsView />
      )}

      {/* Shared Modals */}
      <AppointmentModal
        isOpen={aptModalOpen}
        onClose={() => setAptModalOpen(false)}
        appointmentToEdit={aptToEdit}
        defaultDate={defaultDate}
        defaultTime={defaultTime}
      />

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
