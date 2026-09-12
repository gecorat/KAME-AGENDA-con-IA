import React, { useState } from 'react';
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  Calendar,
  FileText,
  Tag,
  Edit2,
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  DollarSign,
  Receipt,
  Pill,
  Award,
  Mic,
  Eye,
  ExternalLink,
  ShieldCheck,
  CreditCard,
  Building2,
  Activity,
  HeartPulse,
  UserCheck,
  Play,
  Pause,
  Save,
  X,
  Filter,
  Volume2,
  Info,
  Scale,
  Brain,
  BookOpen,
  Apple,
  Heart,
  Smile,
  Briefcase,
  AlertTriangle,
  Zap,
  Send,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useAgendaStore } from '../lib/store';
import { Patient, ConsultationRecord, MedicalCertificate, PaymentRecord, Appointment } from '../types';
import { ConsultationModal } from '../components/ConsultationModal';
import { NewPaymentModal } from '../components/NewPaymentModal';
import { PaymentRequestModal } from '../components/PaymentRequestModal';
import { EditPaymentModal } from '../components/EditPaymentModal';
import { ReceiptModal } from '../components/ReceiptModal';
import { PrescriptionPrintModal } from '../components/PrescriptionPrintModal';
import { CertificatePrintModal } from '../components/CertificatePrintModal';
import { VoiceNoteRecorder } from '../components/VoiceNoteRecorder';
import { ConfirmModal } from '../components/ConfirmModal';
import { getClientTerm, getConsultationTerm, getProfessionInfo } from '../lib/terminology';

interface PatientsViewProps {
  onOpenNewPatient: () => void;
  onEditPatient: (patient: Patient) => void;
  onScheduleForPatient: (patient: Patient) => void;
  onOpenAppointment?: (appointmentId: string) => void;
}

type PatientTab = 'consultations' | 'overview' | 'appointments' | 'billing';

export const PatientsView: React.FC<PatientsViewProps> = ({
  onOpenNewPatient,
  onEditPatient,
  onScheduleForPatient,
  onOpenAppointment
}) => {
  const {
    patients,
    appointments,
    consultations,
    payments,
    practiceSettings,
    deletePatient,
    updatePatient,
    deletePayment,
    voidPayment,
    deleteConsultation,
    deleteAppointment,
    hasExampleData,
    clearExampleData,
    isExampleItem
  } = useAgendaStore();

  const clientTermSingular = getClientTerm(practiceSettings, { plural: false, capitalize: true });
  const clientTermPlural = getClientTerm(practiceSettings, { plural: true, capitalize: true });
  const consultationTermSingular = getConsultationTerm(practiceSettings, { plural: false, capitalize: true });
  const consultationTermPlural = getConsultationTerm(practiceSettings, { plural: true, capitalize: true });
  const professionInfo = getProfessionInfo(practiceSettings);

  const [search, setSearch] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string>(patients[0]?.id || '');
  const [activeTab, setActiveTab] = useState<PatientTab>('consultations');

  // Interactive timeline & date filter
  const [selectedTimelineFilter, setSelectedTimelineFilter] = useState<'all' | 'appointments' | 'consultations'>('all');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('all');
  const [consultationAppointmentId, setConsultationAppointmentId] = useState<string | undefined>(undefined);
  const [preselectedAppointmentForPayment, setPreselectedAppointmentForPayment] = useState<Appointment | null>(null);
  const [paymentRequestDetails, setPaymentRequestDetails] = useState<{
    concept: string;
    amount: number;
    appointmentId?: string;
  } | null>(null);
  const [expandedConsultationId, setExpandedConsultationId] = useState<string | null>(null);

  // In-place editing of patient general notes / initial state
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [tempNotes, setTempNotes] = useState('');
  const [isRecordingGeneralVoice, setIsRecordingGeneralVoice] = useState(false);

  // Audio playback state
  const [playingAudioUrl, setPlayingAudioUrl] = useState<string | null>(null);

  // Modals for coordinated clinical & billing workflows
  const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false);
  const [consultationToEdit, setConsultationToEdit] = useState<ConsultationRecord | null>(null);
  const [consultationToDelete, setConsultationToDelete] = useState<ConsultationRecord | null>(null);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isPaymentRequestModalOpen, setIsPaymentRequestModalOpen] = useState(false);
  const [isEditPaymentModalOpen, setIsEditPaymentModalOpen] = useState(false);
  const [paymentToEdit, setPaymentToEdit] = useState<PaymentRecord | null>(null);
  const [paymentToDelete, setPaymentToDelete] = useState<PaymentRecord | null>(null);
  const [appointmentToDelete, setAppointmentToDelete] = useState<Appointment | null>(null);
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);
  const [activeReceiptPayment, setActiveReceiptPayment] = useState<PaymentRecord | null>(null);

  const [activePrescriptionToPrint, setActivePrescriptionToPrint] = useState<{
    consultation: ConsultationRecord;
  } | null>(null);

  const [activeCertificateToPrint, setActiveCertificateToPrint] = useState<{
    certificate: MedicalCertificate;
    patientPhone?: string;
  } | null>(null);

  // Filtered patients (multi-field search including case, cuit, company, etc.)
  const filteredPatients = patients.filter(p => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    const fullName = `${p.first_name} ${p.last_name}`.toLowerCase();
    const phone = (p.phone || '').toLowerCase();
    const dni = (p.dni || '').toLowerCase();
    const email = (p.email || '').toLowerCase();
    const cuit = (p.cuit || '').toLowerCase();
    const company = (p.company_name || '').toLowerCase();
    const caseNum = (p.case_number || '').toLowerCase();
    const matter = (p.subject_or_matter || '').toLowerCase();
    const pet = (p.pet_species || '').toLowerCase();
    const tags = (p.tags || []).join(' ').toLowerCase();
    return (
      fullName.includes(q) ||
      phone.includes(q) ||
      dni.includes(q) ||
      email.includes(q) ||
      cuit.includes(q) ||
      company.includes(q) ||
      caseNum.includes(q) ||
      matter.includes(q) ||
      pet.includes(q) ||
      tags.includes(q)
    );
  });

  const getProfessionHistoryIcon = () => {
    switch (professionInfo.id) {
      case 'legal_contable':
        return <Scale className="w-3.5 h-3.5 text-indigo-600" />;
      case 'educacion_clases':
        return <BookOpen className="w-3.5 h-3.5 text-indigo-600" />;
      case 'psicologia':
        return <Brain className="w-3.5 h-3.5 text-indigo-600" />;
      case 'kinesiologia':
        return <Zap className="w-3.5 h-3.5 text-indigo-600" />;
      case 'nutricion':
        return <Apple className="w-3.5 h-3.5 text-indigo-600" />;
      case 'odontologia':
        return <Smile className="w-3.5 h-3.5 text-indigo-600" />;
      case 'veterinaria':
        return <Heart className="w-3.5 h-3.5 text-indigo-600" />;
      default:
        return <Stethoscope className="w-3.5 h-3.5 text-indigo-600" />;
    }
  };

  const selectedPatient = patients.find(p => p.id === selectedPatientId) || filteredPatients[0] || patients[0];

  // Coordinated patient data
  const patientAppointments = selectedPatient
    ? appointments
        .filter(a => a.patient_id === selectedPatient.id || a.patient_phone === selectedPatient.phone)
        .sort((a, b) => new Date(b.start_datetime).getTime() - new Date(a.start_datetime).getTime())
    : [];

  const patientConsultations = selectedPatient
    ? consultations
        .filter(c => c.patient_id === selectedPatient.id || c.patient_phone === selectedPatient.phone)
        .sort((a, b) => new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime())
    : [];

  // Distinct attention dates across both appointments and consultations for interactive timeline filtering
  const distinctAttentionDates = Array.from(
    new Set([
      ...patientAppointments.map(a => a.date || (a.start_datetime ? a.start_datetime.split('T')[0] : '')),
      ...patientConsultations.map(c => {
        const raw = c.date || c.created_at;
        return raw ? raw.split('T')[0] : '';
      })
    ].filter(Boolean))
  ).sort().reverse();

  // Filtered consultations by selected date
  const filteredConsultations = selectedDateFilter === 'all'
    ? patientConsultations
    : patientConsultations.filter(c => {
        const raw = c.date || c.created_at;
        return raw && raw.startsWith(selectedDateFilter);
      });

  // Filtered appointments by selected date
  const filteredAppointments = selectedDateFilter === 'all'
    ? patientAppointments
    : patientAppointments.filter(a => {
        const d = a.start_datetime ? a.start_datetime.split('T')[0] : '';
        return d === selectedDateFilter;
      });

  const handleAttendAppointment = (apt: Appointment) => {
    setConsultationAppointmentId(apt.id);
    const aptDate = apt.start_datetime ? apt.start_datetime.split('T')[0] : '';
    const existing = patientConsultations.find(c => 
      c.appointment_id === apt.id ||
      (c.date && aptDate && c.date.startsWith(aptDate))
    );
    setConsultationToEdit(existing || null);
    setIsConsultationModalOpen(true);
  };

  const handleCollectAppointment = (apt: Appointment) => {
    setPreselectedAppointmentForPayment(apt);
    setIsPaymentModalOpen(true);
  };

  const handleSendPaymentRequest = (apt?: Appointment) => {
    if (apt) {
      setPaymentRequestDetails({
        concept: `${apt.service_name} (${new Date(apt.start_datetime).toLocaleDateString()})`,
        amount: apt.service_price || 0,
        appointmentId: apt.id
      });
    } else {
      const pendingApt = patientAppointments.find(a => a.payment_status === 'pending');
      setPaymentRequestDetails({
        concept: `Arancel / Consulta - ${selectedPatient?.first_name} ${selectedPatient?.last_name}`,
        amount: pendingApt?.service_price || patientAppointments[0]?.service_price || 0,
      });
    }
    setIsPaymentRequestModalOpen(true);
  };

  const patientPayments = selectedPatient
    ? payments
        .filter(p => p.patient_id === selectedPatient.id || p.patient_phone === selectedPatient.phone)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    : [];

  // Financial summary
  const totalBilled = patientPayments
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const totalPrescriptions = patientConsultations.reduce(
    (acc, c) => acc + (c.prescriptions?.length || 0),
    0
  );

  const totalCertificates = patientConsultations.reduce(
    (acc, c) => acc + (c.certificates?.length || 0),
    0
  );

  const handleDeletePatient = (patient: Patient) => {
    setPatientToDelete(patient);
  };

  const handleSaveNotes = () => {
    if (!selectedPatient) return;
    updatePatient(selectedPatient.id, { notes: tempNotes });
    setIsEditingNotes(false);
  };

  const toggleAudio = (url: string) => {
    if (playingAudioUrl === url) {
      setPlayingAudioUrl(null);
    } else {
      setPlayingAudioUrl(url);
    }
  };

  // Calculate age if birth_date is present
  const calculateAge = (birthDateStr?: string) => {
    if (!birthDateStr) return null;
    const birth = new Date(birthDateStr);
    if (isNaN(birth.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age >= 0 ? `${age} años` : null;
  };

  return (
    <div className="space-y-4">
      {/* Header and Search */}
      <div className="bg-white p-3.5 rounded-xl border border-neutral-200/75 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-semibold text-neutral-900 font-display">Directorio de {clientTermPlural}</h2>
            <p className="text-[11px] text-neutral-500">
              {patients.length} {clientTermPlural.toLowerCase()} registrados con ficha integral, {consultationTermPlural.toLowerCase()}, turnos y cobranzas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder={`Buscar por nombre, DNI, tel...`}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:bg-white"
            />
          </div>

          <button
            type="button"
            onClick={onOpenNewPatient}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nuevo {clientTermSingular}</span>
          </button>
        </div>
      </div>

      {/* Demo / Example Data Banner with 1-click removal */}
      {hasExampleData && (
        <div className="bg-sky-50 border border-sky-200/90 rounded-xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sky-950 shadow-2xs">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
              <Info className="w-4 h-4 text-sky-700" />
            </div>
            <div>
              <p className="text-xs font-bold text-sky-900">
                Ficha de Demostración Activa
              </p>
              <p className="text-[11px] text-sky-800/90 leading-tight mt-0.5">
                Los registros de ejemplo permiten probar las historias clínicas y cobros. Al registrar tu primer {clientTermSingular.toLowerCase()} real o hacer clic en eliminar, desaparecerán.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => clearExampleData()}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-lg text-xs font-semibold shrink-0 transition-colors shadow-2xs flex items-center gap-1.5 self-end sm:self-auto cursor-pointer"
            title="Eliminar todos los registros de ejemplo"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Eliminar datos de ejemplo</span>
          </button>
        </div>
      )}

      {/* Main Two-Column Directory and Profile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column: Patients List */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-neutral-200/75 shadow-2xs overflow-hidden flex flex-col min-w-0">
          <div className="px-3.5 py-2.5 border-b border-neutral-200/80 bg-neutral-50/50 flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-700 font-display">
              {clientTermPlural} ({filteredPatients.length})
            </span>
            <span className="text-[10px] text-neutral-400 font-medium">
              Selecciona para ver ficha
            </span>
          </div>

          <div className="divide-y divide-neutral-100 max-h-[360px] lg:max-h-[680px] overflow-y-auto flex-1">
            {filteredPatients.length === 0 ? (
              <div className="p-8 text-center text-xs text-neutral-400">
                No se encontraron {clientTermPlural.toLowerCase()} con esa búsqueda.
              </div>
            ) : (
              filteredPatients.map(p => {
                const isSelected = selectedPatient?.id === p.id;
                const initials = `${p.first_name[0] || ''}${p.last_name[0] || ''}`.toUpperCase();
                const aptsCount = appointments.filter(a => a.patient_id === p.id || a.patient_phone === p.phone).length;
                const consCount = consultations.filter(c => c.patient_id === p.id || c.patient_phone === p.phone).length;

                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      setSelectedPatientId(p.id);
                      setSelectedDateFilter('all');
                      setIsEditingNotes(false);
                      setIsRecordingGeneralVoice(false);
                    }}
                    className={`p-3 cursor-pointer transition-colors flex items-center justify-between gap-2.5 min-w-0 ${
                      isSelected
                        ? 'bg-sky-50/70 border-l-3 border-l-sky-600'
                        : 'hover:bg-neutral-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className={`w-8 h-8 rounded-lg font-semibold text-xs flex items-center justify-center shrink-0 border ${
                        isSelected
                          ? 'bg-sky-600 text-white border-sky-600'
                          : 'bg-neutral-100 text-neutral-800 border-neutral-200/60'
                      }`}>
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-xs font-semibold text-neutral-900 truncate">
                            {p.first_name} {p.last_name}
                          </span>
                          {isExampleItem(p) && (
                            <span className="text-[9px] bg-amber-100 text-amber-800 font-semibold px-1 rounded shrink-0">
                              Ejemplo
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-neutral-500 truncate flex items-center gap-1">
                          <span>{p.phone}</span>
                          {professionInfo.id === 'legal_contable' ? (
                            p.company_name ? (
                              <span>• {p.company_name}</span>
                            ) : p.case_number ? (
                              <span>• Expte: {p.case_number}</span>
                            ) : p.cuit ? (
                              <span>• CUIT {p.cuit}</span>
                            ) : (
                              p.dni && <span>• DNI {p.dni}</span>
                            )
                          ) : professionInfo.id === 'educacion_clases' ? (
                            p.student_level ? (
                              <span>• {p.student_level}</span>
                            ) : (
                              p.subject_or_matter && <span>• {p.subject_or_matter}</span>
                            )
                          ) : professionInfo.id === 'veterinaria' ? (
                            p.pet_species && <span>• 🐾 {p.pet_species}</span>
                          ) : (
                            p.dni && <span>• DNI {p.dni}</span>
                          )}
                        </div>
                        {p.tags && p.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {p.tags.slice(0, 2).map((t, idx) => (
                              <span key={idx} className="text-[9px] bg-neutral-100 text-neutral-600 px-1.5 py-0.2 rounded font-medium">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0 flex flex-col items-end gap-1">
                      <span className="text-[10px] bg-neutral-100 text-neutral-700 font-medium px-2 py-0.5 rounded border border-neutral-200/60">
                        {aptsCount} {professionInfo.id === 'legal_contable' ? 'citas' : professionInfo.id === 'educacion_clases' ? 'clases' : 'turnos'}
                      </span>
                      {consCount > 0 && (
                        <span className="text-[9px] text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100 font-medium">
                          {consCount} {consCount === 1 ? consultationTermSingular.toLowerCase() : consultationTermPlural.toLowerCase()}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Selected Patient Comprehensive Profile & Clinical History */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-neutral-200/75 shadow-2xs p-4 sm:p-5 flex flex-col justify-between min-w-0 overflow-hidden space-y-4">
          {selectedPatient ? (
            <div className="space-y-4 min-w-0">
              {/* 1. Header Profile Banner with Actions */}
              <div className="flex items-start sm:items-center justify-between gap-3 pb-3.5 border-b border-neutral-200/80 min-w-0">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-neutral-900 text-white font-bold text-sm sm:text-base flex items-center justify-center shadow-xs shrink-0">
                    {selectedPatient.first_name[0]}{selectedPatient.last_name[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base sm:text-lg font-bold text-neutral-900 font-display truncate">
                        {selectedPatient.first_name} {selectedPatient.last_name}
                      </h3>
                      {isExampleItem(selectedPatient) && (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-900 rounded-full border border-amber-300 shrink-0">
                          Ficha de Ejemplo
                        </span>
                      )}
                      {professionInfo.id === 'legal_contable' ? (
                        <>
                          <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200 shrink-0">
                            {selectedPatient.company_name ? `Empresa: ${selectedPatient.company_name}` : (selectedPatient.client_type === 'company' ? 'Empresa / Sociedad' : 'Persona Física')}
                          </span>
                          {selectedPatient.case_number && (
                            <span className="px-2 py-0.5 text-[10px] font-semibold bg-amber-50 text-amber-800 rounded-full border border-amber-200 font-mono shrink-0">
                              Expte: {selectedPatient.case_number}
                            </span>
                          )}
                        </>
                      ) : professionInfo.id === 'educacion_clases' ? (
                        <>
                          <span className="px-2 py-0.5 text-[10px] font-semibold bg-sky-50 text-sky-700 rounded-full border border-sky-200 shrink-0">
                            {selectedPatient.student_level || 'Alumno regular'}
                          </span>
                          {selectedPatient.subject_or_matter && (
                            <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200 shrink-0">
                              {selectedPatient.subject_or_matter}
                            </span>
                          )}
                        </>
                      ) : professionInfo.id === 'veterinaria' ? (
                        <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200 shrink-0">
                          🐾 {selectedPatient.pet_species || 'Mascota'} {selectedPatient.pet_breed ? `(${selectedPatient.pet_breed})` : ''}
                        </span>
                      ) : selectedPatient.insurance_provider ? (
                        <span className="px-2 py-0.5 text-[10px] font-semibold bg-sky-50 text-sky-700 rounded-full border border-sky-200 shrink-0">
                          {selectedPatient.insurance_provider}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-semibold bg-neutral-100 text-neutral-600 rounded-full border border-neutral-200 shrink-0">
                          Particular
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] text-neutral-500 mt-0.5">
                      <span>Registrado el {new Date(selectedPatient.created_at).toLocaleDateString()}</span>
                      {selectedPatient.tags && selectedPatient.tags.length > 0 && (
                        <span>• {selectedPatient.tags.join(', ')}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Patient Profile Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => onEditPatient(selectedPatient)}
                    className="h-8 px-2.5 rounded-lg border border-neutral-200 hover:bg-neutral-100 text-neutral-700 transition-colors flex items-center justify-center gap-1 text-xs font-semibold cursor-pointer shadow-2xs"
                    title={`Editar datos del ${clientTermSingular.toLowerCase()}`}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Editar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeletePatient(selectedPatient)}
                    className="h-8 w-8 rounded-lg border border-neutral-200 hover:bg-rose-50 hover:text-rose-600 text-neutral-400 transition-colors flex items-center justify-center shrink-0 cursor-pointer shadow-2xs"
                    title={`Eliminar ${clientTermSingular.toLowerCase()}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Primary Action Toolbar: Agendar Turno, Nueva Sesión, Cobrar, Solicitar Pago */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => onScheduleForPatient(selectedPatient)}
                  className="px-2.5 py-2 bg-neutral-900 hover:bg-neutral-800 active:scale-[0.98] text-white text-xs font-semibold rounded-lg shadow-2xs transition-all flex items-center justify-center gap-1.5 truncate cursor-pointer"
                  title={`Agendar para este ${clientTermSingular.toLowerCase()}`}
                >
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Agendar Turno</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setConsultationToEdit(null);
                    setIsConsultationModalOpen(true);
                  }}
                  className="px-2.5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-xs font-semibold rounded-lg shadow-2xs transition-all flex items-center justify-center gap-1.5 truncate cursor-pointer"
                  title={`Ver Ficha / Registrar ${consultationTermSingular}`}
                >
                  <FileText className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Nueva Ficha</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="px-2.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-xs font-semibold rounded-lg shadow-2xs transition-all flex items-center justify-center gap-1.5 truncate cursor-pointer"
                  title={`Registrar cobro confirmado de ${professionInfo.billingTerm.toLowerCase()} en caja`}
                >
                  <DollarSign className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Registrar Cobro</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSendPaymentRequest()}
                  className="px-2.5 py-2 bg-sky-600 hover:bg-sky-700 active:scale-[0.98] text-white text-xs font-semibold rounded-lg shadow-2xs transition-all flex items-center justify-center gap-1.5 truncate cursor-pointer"
                  title="Solicitar pago por WhatsApp (Alias / CBU / Link MP / QR)"
                >
                  <Send className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Solicitar Pago</span>
                </button>
              </div>

              {/* 2. Coordinated Metric Badges (Moved right below header) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 min-w-0">
                <div className="p-2 sm:p-2.5 bg-neutral-50/80 rounded-xl border border-neutral-200/80 min-w-0">
                  <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider block truncate">
                    {professionInfo.id === 'legal_contable'
                      ? 'Citas / Audiencias'
                      : professionInfo.id === 'educacion_clases'
                      ? 'Clases'
                      : 'Turnos'}
                  </span>
                  <div className="text-sm sm:text-base font-bold text-neutral-900 mt-0.5">
                    {patientAppointments.length}
                  </div>
                  <span className="text-[10px] text-neutral-400 block truncate">
                    {patientAppointments.filter(a => a.status === 'confirmed').length} activos
                  </span>
                </div>

                <div className="p-2 sm:p-2.5 bg-indigo-50/60 rounded-xl border border-indigo-100 min-w-0">
                  <span className="text-[10px] uppercase font-bold text-indigo-700 tracking-wider block truncate">
                    {consultationTermPlural}
                  </span>
                  <div className="text-sm sm:text-base font-bold text-indigo-950 mt-0.5">
                    {patientConsultations.length}
                  </div>
                  <span className="text-[10px] text-indigo-600 block truncate">
                    {professionInfo.id === 'legal_contable'
                      ? `${patientConsultations.length} actuaciones judiciales / contables`
                      : professionInfo.id === 'educacion_clases'
                      ? `${patientConsultations.length} clases dictadas`
                      : professionInfo.id === 'psicologia'
                      ? `${patientConsultations.length} sesiones registradas`
                      : professionInfo.id === 'kinesiologia'
                      ? `${patientConsultations.length} sesiones registradas`
                      : professionInfo.id === 'nutricion'
                      ? `${patientConsultations.length} controles registrados`
                      : `${totalPrescriptions} recetas • ${totalCertificates} certs`}
                  </span>
                </div>

                <div className="p-2 sm:p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-100 min-w-0">
                  <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider block truncate">
                    {professionInfo.billingTerm}
                  </span>
                  <div className="text-sm sm:text-base font-bold text-emerald-950 mt-0.5 truncate">
                    ${totalBilled.toLocaleString('es-AR')}
                  </div>
                  <span className="text-[10px] text-emerald-600 block truncate">
                    {patientPayments.length} recibos emitidos
                  </span>
                </div>

                <div className="p-2 sm:p-2.5 bg-amber-50/60 rounded-xl border border-amber-100 min-w-0">
                  <span className="text-[10px] uppercase font-bold text-amber-700 tracking-wider block truncate">Contacto</span>
                  <a
                    href={`https://wa.me/${selectedPatient.phone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] sm:text-xs font-semibold text-amber-900 mt-0.5 block hover:underline truncate"
                  >
                    WhatsApp directo →
                  </a>
                  <span className="text-[10px] text-amber-700 truncate block">
                    {selectedPatient.phone}
                  </span>
                </div>
              </div>

              {/* 3. Structured Personal Information & Coverage / Legal / Academic Card */}
              <div className="p-3.5 sm:p-4 bg-gradient-to-br from-neutral-50 to-white rounded-xl border border-neutral-200/90 shadow-2xs space-y-3 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-200/70">
                  <span className="text-[11px] font-bold text-neutral-800 uppercase tracking-wider flex items-center gap-1.5 font-display">
                    {professionInfo.id === 'legal_contable' ? (
                      <Scale className="w-3.5 h-3.5 text-neutral-500" />
                    ) : professionInfo.id === 'educacion_clases' ? (
                      <BookOpen className="w-3.5 h-3.5 text-neutral-500" />
                    ) : (
                      <Building2 className="w-3.5 h-3.5 text-neutral-500" />
                    )}
                    {professionInfo.id === 'legal_contable'
                      ? 'Información del Cliente & Datos Fiscales / Legales'
                      : professionInfo.id === 'educacion_clases'
                      ? 'Información del Alumno & Nivel Académico'
                      : professionInfo.id === 'veterinaria'
                      ? 'Información del Paciente & Tutor Responsable'
                      : 'Información Personal & Cobertura'}
                  </span>
                  <button
                    type="button"
                    onClick={() => onEditPatient(selectedPatient)}
                    className="text-[11px] text-sky-700 hover:text-sky-800 hover:underline font-semibold flex items-center gap-1 min-h-[30px]"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Modificar datos</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-neutral-500 block uppercase font-medium tracking-wider">
                      {professionInfo.id === 'legal_contable' ? 'CUIT / CUIL / DNI' : 'DNI / Identificación'}
                    </span>
                    <span className="font-semibold text-neutral-900 font-mono text-xs">
                      {selectedPatient.cuit || selectedPatient.dni || 'Sin registrar'}
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-[10px] text-neutral-500 block uppercase font-medium tracking-wider">WhatsApp / Teléfono</span>
                    <a
                      href={`https://wa.me/${selectedPatient.phone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-amber-900 hover:underline inline-flex items-center gap-1 text-xs"
                    >
                      <Phone className="w-3 h-3 text-amber-700" />
                      <span>{selectedPatient.phone}</span>
                    </a>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-[10px] text-neutral-500 block uppercase font-medium tracking-wider">Correo Electrónico</span>
                    <span className="font-semibold text-neutral-900 truncate block text-xs" title={selectedPatient.email}>
                      {selectedPatient.email || 'Sin correo registrado'}
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-[10px] text-neutral-500 block uppercase font-medium tracking-wider">
                      {professionInfo.id === 'legal_contable'
                        ? 'Tipo de Cliente'
                        : professionInfo.id === 'veterinaria'
                        ? 'Mascota'
                        : 'Nacimiento / Edad'}
                    </span>
                    <span className="font-semibold text-neutral-900 text-xs truncate block">
                      {professionInfo.id === 'legal_contable'
                        ? selectedPatient.company_name
                          ? `Empresa: ${selectedPatient.company_name}`
                          : selectedPatient.client_type === 'company'
                          ? 'Empresa / Sociedad'
                          : 'Persona Física'
                        : professionInfo.id === 'veterinaria'
                        ? `${selectedPatient.pet_species || 'Mascota'} ${selectedPatient.pet_breed ? `(${selectedPatient.pet_breed})` : ''}`
                        : selectedPatient.birth_date
                        ? `${selectedPatient.birth_date} ${calculateAge(selectedPatient.birth_date) ? `(${calculateAge(selectedPatient.birth_date)})` : ''}`
                        : 'No registrado'}
                    </span>
                  </div>
                </div>

                {/* Additional profession-specific details */}
                <div className="pt-2.5 border-t border-neutral-200/60 grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 text-xs">
                  {professionInfo.id === 'legal_contable' ? (
                    <>
                      <div>
                        <span className="text-[10px] text-neutral-500 block uppercase font-medium tracking-wider">Materia / Fuero</span>
                        <strong className="text-neutral-900 font-semibold">
                          {selectedPatient.subject_or_matter || 'Civil, Comercial, Laboral o Contable'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-500 block uppercase font-medium tracking-wider">N° de Causa / Expediente</span>
                        <strong className="text-neutral-900 font-semibold font-mono">
                          {selectedPatient.case_number || 'En trámite / Sin causa fijada'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-500 block uppercase font-medium tracking-wider">Tribunal / Dependencia</span>
                        <span className="text-neutral-700 font-medium">
                          {selectedPatient.jurisdiction || 'Jurisdicción Ordinaria'}
                        </span>
                      </div>
                    </>
                  ) : professionInfo.id === 'educacion_clases' ? (
                    <>
                      <div>
                        <span className="text-[10px] text-neutral-500 block uppercase font-medium tracking-wider">Nivel Académico</span>
                        <strong className="text-neutral-900 font-semibold">
                          {selectedPatient.student_level || 'Primario / Secundario / Universitario'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-500 block uppercase font-medium tracking-wider">Materia / Instrumento</span>
                        <strong className="text-neutral-900 font-semibold">
                          {selectedPatient.subject_or_matter || 'Clases regulares'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-500 block uppercase font-medium tracking-wider">Tutor / Responsable</span>
                        <span className="text-neutral-700 font-medium">
                          {selectedPatient.emergency_contact?.name || 'Titular directo'}
                        </span>
                      </div>
                    </>
                  ) : professionInfo.id === 'veterinaria' ? (
                    <>
                      <div>
                        <span className="text-[10px] text-neutral-500 block uppercase font-medium tracking-wider">Especie & Raza</span>
                        <strong className="text-neutral-900 font-semibold">
                          {selectedPatient.pet_species || 'Mascota'} - {selectedPatient.pet_breed || 'Cruza'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-500 block uppercase font-medium tracking-wider">Peso de la Mascota</span>
                        <strong className="text-neutral-900 font-semibold font-mono">
                          {selectedPatient.pet_weight ? `${selectedPatient.pet_weight} kg` : 'Sin registrar'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-500 block uppercase font-medium tracking-wider">Tutor a Cargo</span>
                        <span className="text-neutral-700 font-medium">
                          {selectedPatient.first_name} {selectedPatient.last_name}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <span className="text-[10px] text-neutral-500 block uppercase font-medium tracking-wider">Obra Social / Prepaga</span>
                        <strong className="text-neutral-900 font-semibold">
                          {selectedPatient.insurance_provider || 'Particular (Sin cobertura)'}
                        </strong>
                        {selectedPatient.insurance_number && (
                          <span className="text-neutral-600 font-mono text-[11px] block mt-0.5">
                            Credencial: {selectedPatient.insurance_number}
                          </span>
                        )}
                      </div>

                      {selectedPatient.blood_type && (
                        <div>
                          <span className="text-[10px] text-neutral-500 block uppercase font-medium tracking-wider">Grupo y Factor</span>
                          <strong className="text-neutral-900 font-semibold">{selectedPatient.blood_type}</strong>
                        </div>
                      )}

                      {selectedPatient.allergies && selectedPatient.allergies.length > 0 && (
                        <div className="col-span-2 sm:col-span-1">
                          <span className="text-[10px] text-rose-600 block uppercase font-semibold tracking-wider">⚠️ Alergias Conocidas</span>
                          <span className="text-neutral-800 font-medium">{selectedPatient.allergies.join(', ')}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* 5. Sub-Tab Navigation inside Patient Profile (Unified & Simplified) */}
              <div className="border-b border-neutral-200 flex items-center gap-2 sm:gap-4 text-xs font-semibold overflow-x-auto whitespace-nowrap pb-1 no-scrollbar scroll-smooth">
                <button
                  type="button"
                  onClick={() => setActiveTab('consultations')}
                  className={`pb-2 px-1 transition-colors relative flex items-center gap-1.5 shrink-0 min-h-[38px] ${
                    activeTab === 'consultations' || activeTab === 'appointments'
                      ? 'text-indigo-700 border-b-2 border-indigo-600 font-bold'
                      : 'text-neutral-500 hover:text-neutral-800'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Historial Turnos y Sesiones</span>
                  <span className="text-[10px] bg-indigo-50 text-indigo-700 font-semibold px-1.5 py-0.2 rounded border border-indigo-200/60">
                    {patientAppointments.length + patientConsultations.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('overview')}
                  className={`pb-2 px-1 transition-colors relative flex items-center gap-1.5 shrink-0 min-h-[38px] ${
                    activeTab === 'overview'
                      ? 'text-neutral-900 border-b-2 border-neutral-900 font-bold'
                      : 'text-neutral-500 hover:text-neutral-800'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Ficha y Antecedentes</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('billing')}
                  className={`pb-2 px-1 transition-colors relative flex items-center gap-1.5 shrink-0 min-h-[38px] ${
                    activeTab === 'billing'
                      ? 'text-emerald-700 border-b-2 border-emerald-600 font-bold'
                      : 'text-neutral-500 hover:text-neutral-800'
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>
                    {professionInfo.id === 'legal_contable' ? 'Honorarios & Recibos' : 'Cobros & Recibos'} ({patientPayments.length})
                  </span>
                </button>
              </div>

              {/* Tab 1: Línea de Tiempo Unificada (Turnos & Consultas Coordinadas) */}
              {(activeTab === 'consultations' || activeTab === 'appointments') && (() => {
                // Map linked consultations to appointments
                const linkedConsultationsMap = new Map<string, ConsultationRecord>();
                patientConsultations.forEach(c => {
                  if (c.appointment_id) {
                    linkedConsultationsMap.set(c.appointment_id, c);
                  }
                });
                patientAppointments.forEach(apt => {
                  if (!linkedConsultationsMap.has(apt.id)) {
                    const aptDate = apt.start_datetime ? apt.start_datetime.split('T')[0] : '';
                    const matched = patientConsultations.find(c => 
                      !Array.from(linkedConsultationsMap.values()).some(v => v.id === c.id) &&
                      ((c.date && aptDate && c.date.startsWith(aptDate)) ||
                       (c.created_at && aptDate && c.created_at.split('T')[0] === aptDate))
                    );
                    if (matched) {
                      linkedConsultationsMap.set(apt.id, matched);
                    }
                  }
                });

                const standaloneConsultations = patientConsultations.filter(c => 
                  !Array.from(linkedConsultationsMap.values()).some(v => v.id === c.id)
                );

                const filteredStandalone = selectedDateFilter === 'all'
                  ? standaloneConsultations
                  : standaloneConsultations.filter(c => {
                      const raw = c.date || c.created_at;
                      return raw && raw.startsWith(selectedDateFilter);
                    });

                const totalTimelineCount = selectedTimelineFilter === 'appointments'
                  ? filteredAppointments.length
                  : selectedTimelineFilter === 'consultations'
                  ? filteredConsultations.length
                  : filteredAppointments.length + filteredStandalone.length;

                return (
                  <div className="space-y-3.5 animate-in fade-in duration-150">
                    {/* Filter & Action Controls */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-neutral-50/70 p-2.5 rounded-xl border border-neutral-200/80">
                      <div className="flex flex-col gap-2 min-w-0">
                        {/* Scope Filter: All vs Appointments vs Consultations */}
                        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                          <button
                            type="button"
                            onClick={() => setSelectedTimelineFilter('all')}
                            className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-all shrink-0 ${
                              selectedTimelineFilter === 'all'
                                ? 'bg-indigo-600 text-white shadow-2xs'
                                : 'bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-100'
                            }`}
                          >
                            Todos ({patientAppointments.length + patientConsultations.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedTimelineFilter('appointments')}
                            className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-all shrink-0 flex items-center gap-1 ${
                              selectedTimelineFilter === 'appointments'
                                ? 'bg-indigo-600 text-white shadow-2xs'
                                : 'bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-100'
                            }`}
                          >
                            <Calendar className="w-3 h-3" />
                            <span>Solo Turnos ({patientAppointments.length})</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedTimelineFilter('consultations')}
                            className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-all shrink-0 flex items-center gap-1 ${
                              selectedTimelineFilter === 'consultations'
                                ? 'bg-indigo-600 text-white shadow-2xs'
                                : 'bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-100'
                            }`}
                          >
                            <Stethoscope className="w-3 h-3" />
                            <span>Solo {consultationTermPlural} ({patientConsultations.length})</span>
                          </button>
                        </div>

                        {/* Date Filter Pills */}
                        {distinctAttentionDates.length > 0 && (
                          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                            <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1 shrink-0">
                              <Filter className="w-2.5 h-2.5 text-neutral-400" />
                              Fecha:
                            </span>
                            <button
                              type="button"
                              onClick={() => setSelectedDateFilter('all')}
                              className={`px-2 py-0.5 text-[11px] rounded-md font-medium transition-all shrink-0 ${
                                selectedDateFilter === 'all'
                                  ? 'bg-neutral-800 text-white'
                                  : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-100'
                              }`}
                            >
                              Todas
                            </button>
                            {distinctAttentionDates.map(dateStr => {
                              const aptsCount = patientAppointments.filter(a => a.start_datetime.split('T')[0] === dateStr).length;
                              const consCount = patientConsultations.filter(c => (c.date || c.created_at || '').startsWith(dateStr)).length;
                              return (
                                <button
                                  key={dateStr}
                                  type="button"
                                  onClick={() => setSelectedDateFilter(dateStr)}
                                  className={`px-2 py-0.5 text-[11px] rounded-md font-medium transition-all shrink-0 flex items-center gap-1 ${
                                    selectedDateFilter === dateStr
                                      ? 'bg-neutral-800 text-white'
                                      : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-100'
                                  }`}
                                >
                                  <span>{new Date(dateStr + 'T12:00:00').toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
                                  <span className={`text-[9px] px-1 py-0.2 rounded-full ${
                                    selectedDateFilter === dateStr ? 'bg-neutral-700 text-white' : 'bg-neutral-100 text-neutral-600'
                                  }`}>
                                    {aptsCount + consCount}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Top Action Buttons */}
                      <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-center">
                        <button
                          type="button"
                          onClick={() => onScheduleForPatient(selectedPatient)}
                          className="px-2.5 py-1 text-xs font-semibold text-neutral-800 bg-white hover:bg-neutral-100 rounded-lg border border-neutral-300 shadow-2xs transition-colors flex items-center gap-1 shrink-0"
                        >
                          <Calendar className="w-3.5 h-3.5 text-neutral-600" />
                          <span>Agendar Turno</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setConsultationAppointmentId(undefined);
                            setConsultationToEdit(null);
                            setIsConsultationModalOpen(true);
                          }}
                          className="px-2.5 py-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs transition-colors flex items-center gap-1 shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Nueva {consultationTermSingular}</span>
                        </button>
                      </div>
                    </div>

                    {/* Timeline Stream */}
                    {totalTimelineCount === 0 ? (
                      <div className="p-8 bg-neutral-50/70 rounded-xl border border-neutral-200/70 text-center text-xs text-neutral-500 space-y-2">
                        <div className="flex justify-center">{getProfessionHistoryIcon()}</div>
                        <p className="font-semibold text-neutral-700">
                          {selectedDateFilter === 'all'
                            ? `Sin turnos ni registros de atención para este ${clientTermSingular.toLowerCase()}`
                            : `No hay turnos ni evoluciones para la fecha seleccionada (${selectedDateFilter})`}
                        </p>
                        <p className="text-[11px] text-neutral-400 max-w-md mx-auto">
                          Cuando agendes un turno o registres una evolución, podrás ver el historial completo, atender con un clic y cobrar directamente desde aquí.
                        </p>
                        <div className="flex items-center justify-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => onScheduleForPatient(selectedPatient)}
                            className="px-3 py-1.5 bg-neutral-900 text-white rounded-lg font-semibold text-xs inline-flex items-center gap-1.5 hover:bg-neutral-800 shadow-2xs"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Agendar Turno</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setConsultationAppointmentId(undefined);
                              setConsultationToEdit(null);
                              setIsConsultationModalOpen(true);
                            }}
                            className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg font-semibold text-xs inline-flex items-center gap-1.5 hover:bg-indigo-700 shadow-2xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Nueva {consultationTermSingular}</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                        {/* 1. APPOINTMENTS (in 'all' or 'appointments' filter) */}
                        {selectedTimelineFilter !== 'consultations' && filteredAppointments.map(apt => {
                          const linkedConsultation = linkedConsultationsMap.get(apt.id);
                          const linkedPayment = patientPayments.find(p => p.appointment_id === apt.id);
                          const isExpanded = expandedConsultationId === (linkedConsultation?.id || apt.id);
                          const aptDateObj = new Date(apt.start_datetime);

                          return (
                            <div
                              key={`apt-${apt.id}`}
                              className="p-3.5 rounded-xl border border-neutral-200/90 bg-white hover:border-indigo-200 hover:shadow-2xs transition-all space-y-2.5"
                            >
                              {/* Header: Turn Info & Status Badges */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-xs sm:text-sm text-neutral-900 flex items-center gap-1.5">
                                      <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                      {apt.service_name}
                                    </span>
                                    {apt.origin === 'telemedicine' && (
                                      <span className="px-1.5 py-0.2 text-[9px] font-bold bg-sky-100 text-sky-800 rounded">
                                        VIRTUAL / TELECONSULTA
                                      </span>
                                    )}
                                    {apt.patient_confirmed && (
                                      <span className="px-1.5 py-0.2 text-[9px] font-bold bg-emerald-100 text-emerald-800 rounded flex items-center gap-0.5">
                                        <UserCheck className="w-2.5 h-2.5" />
                                        CONFIRMADO
                                      </span>
                                    )}
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                      apt.status === 'completed'
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : apt.status === 'confirmed'
                                        ? 'bg-sky-50 text-sky-700 border border-sky-200'
                                        : 'bg-neutral-100 text-neutral-600'
                                    }`}>
                                      {apt.status === 'completed' ? 'Atendido' : apt.status === 'confirmed' ? 'Confirmado' : apt.status}
                                    </span>
                                  </div>
                                  <span className="text-[11px] text-neutral-500 flex items-center gap-1.5 mt-0.5">
                                    <Clock className="w-3 h-3 text-neutral-400" />
                                    {aptDateObj.toLocaleDateString([], {
                                      weekday: 'long',
                                      day: 'numeric',
                                      month: 'long',
                                      year: 'numeric'
                                    })}{' '}
                                    a las {aptDateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} hs
                                  </span>
                                </div>

                                {/* Price & Payment Status */}
                                <div className="flex items-center gap-2 sm:text-right">
                                  <div>
                                    <span className="text-xs font-bold text-neutral-900 block">
                                      ${(apt.service_price || 0).toLocaleString('es-AR')}
                                    </span>
                                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded inline-block ${
                                      apt.payment_status === 'paid'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-amber-100 text-amber-800'
                                    }`}>
                                      {apt.payment_status === 'paid' ? 'Pagado' : 'Pendiente de cobro'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Action Row: Atender, Cobrar, Mandar a Cobrar */}
                              <div className="flex items-center justify-between gap-2 pt-2 border-t border-neutral-100 flex-wrap">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {/* Evolution Status & Action */}
                                  {!linkedConsultation ? (
                                    <button
                                      type="button"
                                      onClick={() => handleAttendAppointment(apt)}
                                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1.5"
                                      title="Abrir ficha clínica para registrar evolución y marcar turno como atendido"
                                    >
                                      <Stethoscope className="w-3.5 h-3.5" />
                                      <span>Atender / Iniciar Evolución</span>
                                    </button>
                                  ) : (
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setConsultationToEdit(linkedConsultation);
                                          setConsultationAppointmentId(apt.id);
                                          setIsConsultationModalOpen(true);
                                        }}
                                        className="px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors flex items-center gap-1"
                                        title="Ver o editar la evolución clínica vinculada"
                                      >
                                        <Eye className="w-3 h-3" />
                                        <span>Ver / Editar Evolución</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setExpandedConsultationId(isExpanded ? null : linkedConsultation.id)}
                                        className="px-2 py-1 text-xs font-medium text-neutral-600 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-lg flex items-center gap-1"
                                      >
                                        {isExpanded ? (
                                          <>
                                            <ChevronUp className="w-3 h-3" />
                                            <span>Ocultar resumen</span>
                                          </>
                                        ) : (
                                          <>
                                            <ChevronDown className="w-3 h-3" />
                                            <span>Resumen clínico</span>
                                          </>
                                        )}
                                      </button>
                                    </div>
                                  )}

                                   {/* Cashier / Payment Action Buttons if Pending, or Receipt if Paid */}
                                  {apt.payment_status !== 'paid' ? (
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <button
                                        type="button"
                                        onClick={() => handleCollectAppointment(apt)}
                                        className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors flex items-center gap-1"
                                        title="Registrar cobro confirmado en caja / finanzas"
                                      >
                                        <DollarSign className="w-3.5 h-3.5" />
                                        <span>Registrar Cobro</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleSendPaymentRequest(apt)}
                                        className="px-2.5 py-1 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition-colors flex items-center gap-1"
                                        title="Solicitar pago por WhatsApp con Alias, Link MP o QR"
                                      >
                                        <Send className="w-3.5 h-3.5" />
                                        <span>Solicitar Pago</span>
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-lg">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                        <span>Cobro Registrado</span>
                                      </span>
                                      {linkedPayment ? (
                                        <button
                                          type="button"
                                          onClick={() => setActiveReceiptPayment(linkedPayment)}
                                          className="px-2 py-0.5 text-xs font-medium text-emerald-800 bg-white hover:bg-emerald-50 border border-emerald-200 rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
                                          title="Ver e imprimir recibo oficial"
                                        >
                                          <Receipt className="w-3 h-3 text-emerald-600" />
                                          <span>Ver Recibo</span>
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => setActiveTab('billing')}
                                          className="px-2 py-0.5 text-xs font-medium text-emerald-800 bg-white hover:bg-emerald-50 border border-emerald-200 rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
                                          title="Ver comprobante en pestaña de Cobros & Recibos"
                                        >
                                          <Receipt className="w-3 h-3 text-emerald-600" />
                                          <span>Ver Cobros</span>
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                                  {onOpenAppointment && (
                                    <button
                                      type="button"
                                      onClick={() => onOpenAppointment(apt.id)}
                                      className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-100 text-neutral-600"
                                      title="Abrir turno en la agenda general"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => setAppointmentToDelete(apt)}
                                    className="p-1.5 rounded-lg border border-neutral-200 hover:bg-rose-50 text-neutral-400 hover:text-rose-600 transition-colors"
                                    title="Eliminar turno"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {/* Accordion: Linked Consultation Preview */}
                              {linkedConsultation && isExpanded && (
                                <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 text-xs space-y-2 mt-2">
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-indigo-950 uppercase tracking-wider text-[10px]">
                                      Resumen de la Evolución Clínica:
                                    </span>
                                    {linkedConsultation.prescriptions && linkedConsultation.prescriptions.length > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => setActivePrescriptionToPrint({ consultation: linkedConsultation })}
                                        className="text-[11px] text-sky-700 font-semibold hover:underline flex items-center gap-1"
                                      >
                                        <Pill className="w-3 h-3" />
                                        <span>Imprimir Receta ({linkedConsultation.prescriptions.length})</span>
                                      </button>
                                    )}
                                  </div>

                                  {(linkedConsultation.treatment_performed || linkedConsultation.clinical_evolution || linkedConsultation.soap_analysis) && (
                                    <p className="text-neutral-800 leading-relaxed whitespace-pre-line bg-white p-2.5 rounded-lg border border-indigo-100/80">
                                      {linkedConsultation.treatment_performed || linkedConsultation.clinical_evolution || linkedConsultation.soap_analysis}
                                    </p>
                                  )}

                                  {linkedConsultation.soap_plan && (
                                    <div>
                                      <span className="font-bold text-emerald-900 block text-[10px] uppercase mb-0.5">Indicaciones / Próximos Pasos:</span>
                                      <p className="text-neutral-700 bg-white p-2 rounded-lg border border-emerald-100">
                                        {linkedConsultation.soap_plan}
                                      </p>
                                    </div>
                                  )}

                                  {linkedConsultation.voice_notes && linkedConsultation.voice_notes.length > 0 && (
                                    <div className="pt-1">
                                      <span className="text-[10px] font-bold text-indigo-800 uppercase block mb-1">Audios asociados:</span>
                                      {linkedConsultation.voice_notes.map((vn, idx) => (
                                        <div key={idx} className="flex items-center gap-2 p-1.5 bg-white rounded-md border border-indigo-100">
                                          <button
                                            type="button"
                                            onClick={() => toggleAudio(vn.audio_url)}
                                            className="p-1 rounded-full bg-indigo-600 text-white"
                                          >
                                            {playingAudioUrl === vn.audio_url ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                                          </button>
                                          <span className="text-[11px] text-indigo-950 font-medium">{vn.title || `Nota de voz ${idx + 1}`}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* 2. CONSULTATIONS (either standalone when in 'all', or all when in 'consultations') */}
                        {(selectedTimelineFilter === 'consultations' ? filteredConsultations : filteredStandalone).map(c => {
                          const rawDate = c.date || c.created_at;
                          const dateObj = new Date(rawDate);
                          return (
                            <div
                              key={`cons-${c.id}`}
                              className="p-3.5 rounded-xl border border-neutral-200/85 bg-white hover:border-indigo-300 hover:shadow-2xs transition-all space-y-2.5"
                            >
                              {/* Consultation Top Info */}
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-xs sm:text-sm text-neutral-900 flex items-center gap-1.5">
                                      <Stethoscope className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                      {c.reason_for_visit || c.treatment_performed || (
                                        professionInfo.id === 'legal_contable'
                                          ? 'Actuación / Diligencia Judicial'
                                          : professionInfo.id === 'educacion_clases'
                                          ? 'Clase Dictada'
                                          : 'Atención / Consulta'
                                      )}
                                    </span>
                                    {c.consultation_type && (
                                      <span className="px-1.5 py-0.2 text-[10px] font-semibold uppercase bg-indigo-50 text-indigo-700 rounded border border-indigo-100">
                                        {c.consultation_type}
                                      </span>
                                    )}
                                    {c.service_name && (
                                      <span className="px-1.5 py-0.2 text-[10px] font-medium bg-neutral-100 text-neutral-700 rounded">
                                        {c.service_name}
                                      </span>
                                    )}
                                    {c.procedural_stage && (
                                      <span className="px-1.5 py-0.2 text-[10px] font-medium bg-amber-50 text-amber-800 rounded border border-amber-200">
                                        Etapa: {c.procedural_stage}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[11px] text-neutral-500 flex items-center gap-1.5 mt-0.5">
                                    <Calendar className="w-3 h-3 text-neutral-400" />
                                    {dateObj.toLocaleDateString([], {
                                      weekday: 'long',
                                      day: 'numeric',
                                      month: 'long',
                                      year: 'numeric'
                                    })}{' '}
                                    a las {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} hs
                                    {c.professional_name && (
                                      <span>• {c.professional_name}</span>
                                    )}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                                  {c.prescriptions && c.prescriptions.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => setActivePrescriptionToPrint({ consultation: c })}
                                      className="px-2 py-1 rounded-lg text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 text-xs font-semibold flex items-center gap-1 whitespace-nowrap shrink-0"
                                      title="Imprimir / Ver Receta Médica"
                                    >
                                      <Pill className="w-3.5 h-3.5 shrink-0" />
                                      <span className="hidden sm:inline">Receta ({c.prescriptions.length})</span>
                                    </button>
                                  )}

                                  {c.certificates && c.certificates.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => setActiveCertificateToPrint({ certificate: c.certificates![0], patientPhone: selectedPatient.phone })}
                                      className="px-2 py-1 rounded-lg text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-xs font-semibold flex items-center gap-1 whitespace-nowrap shrink-0"
                                      title="Imprimir / Ver Certificado"
                                    >
                                      <Award className="w-3.5 h-3.5 shrink-0" />
                                      <span className="hidden sm:inline">Certificado</span>
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setConsultationToEdit(c);
                                      setConsultationAppointmentId(c.appointment_id);
                                      setIsConsultationModalOpen(true);
                                    }}
                                    className="px-2.5 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 rounded-lg border border-neutral-200 transition-colors flex items-center gap-1 whitespace-nowrap shrink-0"
                                  >
                                    <Eye className="w-3 h-3 shrink-0" />
                                    <span>Ver / Editar</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setConsultationToDelete(c)}
                                    className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-rose-200 hover:border-rose-300 transition-colors flex items-center gap-1 whitespace-nowrap shrink-0"
                                    title="Eliminar registro"
                                  >
                                    <Trash2 className="w-3 h-3 text-rose-500 shrink-0" />
                                    <span>Eliminar</span>
                                  </button>
                                </div>
                              </div>

                              {/* Generic Session Notes & Plan */}
                              {(c.treatment_performed || c.clinical_evolution || c.soap_analysis || c.soap_plan) && (
                                <div className="space-y-2 text-xs bg-neutral-50/90 p-3 rounded-lg border border-neutral-200/80">
                                  {(c.treatment_performed || c.clinical_evolution || c.soap_analysis) && (
                                    <div>
                                      <span className="font-bold text-neutral-800 block text-[11px] mb-1 uppercase tracking-wider">
                                        Notas de la Sesión / Registro:
                                      </span>
                                      <p className="text-neutral-800 leading-relaxed whitespace-pre-line">
                                        {c.treatment_performed || c.clinical_evolution || c.soap_analysis}
                                      </p>
                                    </div>
                                  )}

                                  {c.soap_plan && (
                                    <div className="pt-1 border-t border-neutral-200/60">
                                      <span className="font-bold text-emerald-800 block text-[11px] mb-0.5 uppercase tracking-wider">
                                        Próximos Pasos / Indicaciones:
                                      </span>
                                      <p className="text-neutral-700 leading-relaxed whitespace-pre-line">
                                        {c.soap_plan}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Voice Notes */}
                              {c.voice_notes && c.voice_notes.length > 0 && (
                                <div className="space-y-1.5 pt-1">
                                  <span className="text-[11px] font-semibold text-neutral-600 flex items-center gap-1">
                                    <Volume2 className="w-3 h-3 text-indigo-600" />
                                    Audios y Notas de Voz:
                                  </span>
                                  <div className="space-y-1">
                                    {c.voice_notes.map((vn, idx) => (
                                      <div
                                        key={vn.id || idx}
                                        className="p-2 bg-indigo-50/50 rounded-lg border border-indigo-100 flex items-center justify-between gap-2 text-xs"
                                      >
                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                          <button
                                            type="button"
                                            onClick={() => toggleAudio(vn.audio_url)}
                                            className="p-1 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 shrink-0"
                                          >
                                            {playingAudioUrl === vn.audio_url ? (
                                              <Pause className="w-3 h-3" />
                                            ) : (
                                              <Play className="w-3 h-3" />
                                            )}
                                          </button>
                                          <div className="min-w-0 flex-1">
                                            <span className="font-medium text-indigo-950 block truncate">
                                              {vn.title || `Nota de voz ${idx + 1}`} ({vn.duration_seconds || 0} seg)
                                            </span>
                                            {vn.transcription && (
                                              <p className="text-[11px] text-neutral-600 line-clamp-1 italic">
                                                "{vn.transcription}"
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                        <span className="text-[10px] text-neutral-400 shrink-0">
                                          {new Date(vn.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} hs
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Prescriptions */}
                              {c.prescriptions && c.prescriptions.length > 0 && (
                                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                  <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wider">Recetado:</span>
                                  {c.prescriptions.map((p, idx) => (
                                    <span key={idx} className="text-[10px] bg-sky-50 text-sky-900 border border-sky-200 px-2 py-0.5 rounded-full font-medium">
                                      💊 {p.medication} ({p.dosage})
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Tab 2: Ficha & Antecedentes Detallados */}
              {activeTab === 'overview' && (
                <div className="space-y-3 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="p-3 bg-neutral-50/70 rounded-lg border border-neutral-200/80 text-xs">
                      <div className="text-neutral-500 flex items-center gap-1.5 mb-1 font-medium text-[11px]">
                        <Phone className="w-3.5 h-3.5 text-neutral-400" /> WhatsApp / Teléfono
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <span className="font-semibold text-neutral-900">{selectedPatient.phone}</span>
                        <a
                          href={`https://wa.me/${selectedPatient.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-neutral-700 hover:underline text-[11px] font-medium"
                        >
                          Chat WhatsApp →
                        </a>
                      </div>
                    </div>

                    <div className="p-3 bg-neutral-50/70 rounded-lg border border-neutral-200/80 text-xs">
                      <div className="text-neutral-500 flex items-center gap-1.5 mb-1 font-medium text-[11px]">
                        <Mail className="w-3.5 h-3.5 text-neutral-400" /> Correo Electrónico
                      </div>
                      <div className="font-semibold text-neutral-900 truncate">
                        {selectedPatient.email || 'Sin correo cargado'}
                      </div>
                    </div>
                  </div>

                  {/* Profession Specific Secondary Card */}
                  {professionInfo.id === 'legal_contable' ? (
                    <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100 text-xs grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <span className="text-[11px] text-indigo-700 block font-medium">Expediente / Autos</span>
                        <span className="font-semibold text-indigo-950 font-mono">
                          {selectedPatient.case_number || 'En trámite extrajudicial'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] text-indigo-700 block font-medium">Fuero / Materia</span>
                        <span className="font-semibold text-indigo-950">
                          {selectedPatient.subject_or_matter || 'Civil / Comercial / Laboral / Fiscal'}
                        </span>
                      </div>
                    </div>
                  ) : professionInfo.id === 'educacion_clases' ? (
                    <div className="p-3 bg-sky-50/50 rounded-lg border border-sky-100 text-xs grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <span className="text-[11px] text-sky-700 block font-medium">Nivel Escolar / Académico</span>
                        <span className="font-semibold text-sky-950">
                          {selectedPatient.student_level || 'Primario / Secundario / Superior'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] text-sky-700 block font-medium">Materia / Especialidad</span>
                        <span className="font-semibold text-sky-950">
                          {selectedPatient.subject_or_matter || 'Clases regulares'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-neutral-50/70 rounded-lg border border-neutral-200/80 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                      <div>
                        <span className="text-[11px] text-neutral-500 block font-medium">Obra Social / Prepaga</span>
                        <span className="font-semibold text-neutral-900">
                          {selectedPatient.insurance_provider || 'Particular (Sin cobertura)'}
                        </span>
                      </div>
                      {selectedPatient.insurance_number && (
                        <div className="sm:text-right">
                          <span className="text-[11px] text-neutral-500 block font-medium">Credencial N°</span>
                          <span className="font-mono text-neutral-900 font-semibold">{selectedPatient.insurance_number}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tags */}
                  {selectedPatient.tags && selectedPatient.tags.length > 0 && (
                    <div>
                      <span className="text-[11px] font-semibold text-neutral-700 uppercase tracking-wider block mb-1">
                        Etiquetas & Clasificación
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedPatient.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 bg-neutral-100 text-neutral-700 rounded-full text-xs font-medium border border-neutral-200"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Clinical / Legal / Educational Notes Full View with Voice Recorder & Edit */}
                  <div className="p-3.5 bg-amber-50/40 rounded-xl border border-amber-200/70 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[11px] font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5 font-display">
                        <FileText className="w-3.5 h-3.5 text-amber-600" />
                        {professionInfo.id === 'legal_contable'
                          ? 'Antecedentes del Caso & Observaciones Jurídicas / Contables'
                          : professionInfo.id === 'educacion_clases'
                          ? 'Antecedentes Académicos & Objetivos de Aprendizaje'
                          : 'Antecedentes, Estado Inicial & Observaciones'}
                      </h4>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsRecordingGeneralVoice(!isRecordingGeneralVoice)}
                          className="px-2 py-1 text-[11px] font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-md transition-colors flex items-center gap-1"
                        >
                          <Mic className="w-3 h-3 text-amber-700" />
                          <span>{isRecordingGeneralVoice ? 'Cerrar Grabador' : 'Grabar Nota de Voz'}</span>
                        </button>
                        {!isEditingNotes ? (
                          <button
                            type="button"
                            onClick={() => {
                              setTempNotes(selectedPatient.notes || '');
                              setIsEditingNotes(true);
                            }}
                            className="px-2 py-1 text-[11px] font-semibold text-neutral-700 bg-white border border-neutral-200 hover:bg-neutral-50 rounded-md transition-colors flex items-center gap-1"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Editar Notas</span>
                          </button>
                        ) : (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={handleSaveNotes}
                              className="px-2.5 py-1 text-[11px] font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded-md transition-colors flex items-center gap-1"
                            >
                              <Save className="w-3 h-3" />
                              <span>Guardar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsEditingNotes(false)}
                              className="px-2 py-1 text-[11px] text-neutral-500 hover:bg-neutral-200 rounded-md"
                            >
                              Cancelar
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {isRecordingGeneralVoice && (
                      <div className="p-3 bg-white rounded-lg border border-amber-300 shadow-2xs">
                        <VoiceNoteRecorder
                          patientName={`${selectedPatient.first_name} ${selectedPatient.last_name}`}
                          specialty={professionInfo.name}
                          onTranscriptionComplete={data => {
                            const newNote = selectedPatient.notes 
                              ? `${selectedPatient.notes}\n\n[Nota de Voz ${new Date().toLocaleDateString()}]: ${data.transcription}`
                              : `[Nota de Voz ${new Date().toLocaleDateString()}]: ${data.transcription}`;
                            updatePatient(selectedPatient.id, { notes: newNote });
                            setIsRecordingGeneralVoice(false);
                          }}
                        />
                      </div>
                    )}

                    {isEditingNotes ? (
                      <textarea
                        rows={4}
                        value={tempNotes}
                        onChange={e => setTempNotes(e.target.value)}
                        placeholder={
                          professionInfo.id === 'legal_contable'
                            ? 'Registra antecedentes fácticos, pruebas aportadas, acuerdos prejudiciales u observaciones del cliente...'
                            : professionInfo.id === 'educacion_clases'
                            ? 'Registra nivel del alumno, fortalezas, debilidades, requerimientos curriculares...'
                            : 'Registra antecedentes patológicos, quirúrgicos, hábitos, alergias u observaciones iniciales...'
                        }
                        className="w-full p-2.5 bg-white border border-amber-300 rounded-lg text-xs text-neutral-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    ) : (
                      <p className="text-neutral-700 leading-relaxed min-h-[50px] bg-white/80 p-3 rounded-lg border border-amber-100 whitespace-pre-wrap">
                        {selectedPatient.notes || (
                          <span className="text-neutral-400 italic">
                            Sin antecedentes u observaciones iniciales cargadas. Haz clic en 'Editar Notas' o 'Grabar Nota de Voz' para añadir detalles.
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 3: Cobros & Recibos */}
              {activeTab === 'billing' && (
                <div className="space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neutral-500">
                      Comprobantes de pago y recibos emitidos a este {clientTermSingular.toLowerCase()}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsPaymentModalOpen(true)}
                      className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{professionInfo.id === 'legal_contable' ? 'Registrar Cobro de Honorarios' : 'Registrar Cobro / Emitir Recibo'}</span>
                    </button>
                  </div>

                  {patientPayments.length === 0 ? (
                    <div className="p-8 bg-neutral-50/70 rounded-xl border border-neutral-200/70 text-center text-xs text-neutral-500 space-y-2">
                      <Receipt className="w-6 h-6 mx-auto text-neutral-400 stroke-1" />
                      <p className="font-semibold text-neutral-700">Sin pagos registrados para este {clientTermSingular.toLowerCase()}</p>
                      <p className="text-[11px] text-neutral-400">
                        Registra cobros en efectivo, transferencia o tarjeta y genera recibos oficiales en PDF.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                      {patientPayments.map(pay => (
                        <div
                          key={pay.id}
                          className="p-3 rounded-xl border border-neutral-200/80 bg-white hover:bg-neutral-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs font-bold text-neutral-900">
                                Recibo {pay.receipt_number}
                              </span>
                              <span className="px-1.5 py-0.2 text-[10px] font-semibold uppercase bg-neutral-100 text-neutral-700 rounded border border-neutral-200">
                                {pay.method}
                              </span>
                            </div>
                            <span className="text-neutral-500 text-[11px] block mt-0.5 truncate">
                              {pay.concept} • {new Date(pay.date).toLocaleDateString()} {new Date(pay.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 pt-1 sm:pt-0 border-t sm:border-t-0 border-neutral-100">
                            <div className="sm:text-right">
                              <span className="text-xs font-bold text-emerald-700 block">
                                ${pay.amount.toLocaleString('es-AR')}
                              </span>
                              {pay.copay_amount ? (
                                <span className="text-[10px] text-neutral-400 block">
                                  Coseguro: ${pay.copay_amount.toLocaleString('es-AR')}
                                </span>
                              ) : null}
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => setActiveReceiptPayment(pay)}
                                className="px-2.5 py-1 bg-white border border-neutral-200 hover:bg-neutral-100 rounded-lg text-xs font-semibold text-neutral-800 transition-colors shadow-2xs flex items-center gap-1 shrink-0"
                                title="Ver comprobante e imprimir"
                              >
                                <Receipt className="w-3.5 h-3.5 text-neutral-600" />
                                <span>Ver</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setPaymentToEdit(pay);
                                  setIsEditPaymentModalOpen(true);
                                }}
                                className="p-1.5 bg-white border border-neutral-200 hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900 rounded-lg transition-colors shadow-2xs"
                                title="Editar recibo"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => setPaymentToDelete(pay)}
                                className="p-1.5 bg-white border border-neutral-200 hover:bg-rose-50 text-neutral-400 hover:text-rose-600 rounded-lg transition-colors shadow-2xs"
                                title="Eliminar recibo"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center text-neutral-400">
              Selecciona un paciente para ver su ficha completa.
            </div>
          )}
        </div>
      </div>

      {/* Embedded Modals for Coordinated Clinical & Financial Flow */}
      {isConsultationModalOpen && selectedPatient && (
        <ConsultationModal
          consultation={consultationToEdit}
          patientId={selectedPatient.id}
          appointmentId={consultationAppointmentId}
          onClose={() => {
            setIsConsultationModalOpen(false);
            setConsultationToEdit(null);
            setConsultationAppointmentId(undefined);
          }}
          onSaved={() => {
            setIsConsultationModalOpen(false);
            setConsultationToEdit(null);
            setConsultationAppointmentId(undefined);
          }}
        />
      )}

      {isPaymentModalOpen && selectedPatient && (
        <NewPaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => {
            setIsPaymentModalOpen(false);
            setPreselectedAppointmentForPayment(null);
          }}
          preselectedPatient={selectedPatient}
          preselectedAppointment={preselectedAppointmentForPayment}
          onPaymentSuccess={payment => {
            setIsPaymentModalOpen(false);
            setPreselectedAppointmentForPayment(null);
            setActiveReceiptPayment(payment);
          }}
        />
      )}

      {isEditPaymentModalOpen && paymentToEdit && (
        <EditPaymentModal
          isOpen={isEditPaymentModalOpen}
          onClose={() => {
            setIsEditPaymentModalOpen(false);
            setPaymentToEdit(null);
          }}
          payment={paymentToEdit}
          onPaymentUpdated={updated => {
            if (activeReceiptPayment?.id === updated.id) {
              setActiveReceiptPayment(updated);
            }
          }}
        />
      )}

      {activeReceiptPayment && (
        <ReceiptModal
          isOpen={!!activeReceiptPayment}
          onClose={() => setActiveReceiptPayment(null)}
          payment={activeReceiptPayment}
          onVoid={id => {
            voidPayment(id);
            setActiveReceiptPayment(null);
          }}
          onEdit={payment => {
            setPaymentToEdit(payment);
            setIsEditPaymentModalOpen(true);
          }}
          onDelete={id => {
            deletePayment(id);
            setActiveReceiptPayment(null);
          }}
        />
      )}

      {activePrescriptionToPrint && (
        <PrescriptionPrintModal
          prescription={{
            id: activePrescriptionToPrint.consultation.id,
            appointment_id: activePrescriptionToPrint.consultation.appointment_id,
            patient_id: activePrescriptionToPrint.consultation.patient_id,
            patient_name: activePrescriptionToPrint.consultation.patient_name,
            patient_phone: selectedPatient?.phone,
            date: activePrescriptionToPrint.consultation.date,
            items: (activePrescriptionToPrint.consultation.prescriptions || []).map(p => ({
              id: p.id,
              medication: p.medication,
              dosage: p.dosage,
              duration: p.duration,
              instructions: p.instructions
            })),
            notes: activePrescriptionToPrint.consultation.soap_plan,
            professional_name: practiceSettings.professional_name || 'Profesional Médico',
            status: 'active',
            created_at: activePrescriptionToPrint.consultation.created_at
          }}
          practiceSettings={practiceSettings}
          onClose={() => setActivePrescriptionToPrint(null)}
        />
      )}

      {activeCertificateToPrint && (
        <CertificatePrintModal
          certificate={activeCertificateToPrint.certificate}
          practiceSettings={practiceSettings}
          patientPhone={activeCertificateToPrint.patientPhone}
          onClose={() => setActiveCertificateToPrint(null)}
        />
      )}

      {selectedPatient && (
        <PaymentRequestModal
          isOpen={isPaymentRequestModalOpen}
          onClose={() => {
            setIsPaymentRequestModalOpen(false);
            setPaymentRequestDetails(null);
          }}
          patientName={`${selectedPatient.first_name} ${selectedPatient.last_name}`}
          patientPhone={selectedPatient.phone}
          concept={paymentRequestDetails?.concept || `Arancel / Consulta - ${selectedPatient.first_name} ${selectedPatient.last_name}`}
          amount={paymentRequestDetails?.amount ?? (patientAppointments[0]?.service_price || 0)}
          appointmentId={paymentRequestDetails?.appointmentId}
        />
      )}

      {/* Confirmation Dialog for Payment Deletion */}
      <ConfirmModal
        isOpen={!!paymentToDelete}
        onClose={() => setPaymentToDelete(null)}
        onConfirm={() => {
          if (paymentToDelete) {
            deletePayment(paymentToDelete.id);
            setPaymentToDelete(null);
          }
        }}
        title={`¿Eliminar Recibo ${paymentToDelete?.receipt_number}?`}
        message={`¿Está seguro de que desea eliminar el recibo ${paymentToDelete?.receipt_number} por $${paymentToDelete?.amount.toLocaleString('es-AR')}? Esta acción actualizará los saldos y no se puede deshacer.`}
        confirmText="Sí, Eliminar Recibo"
        variant="danger"
      />

      {/* Confirmation Dialog for Consultation Deletion */}
      <ConfirmModal
        isOpen={!!consultationToDelete}
        onClose={() => setConsultationToDelete(null)}
        onConfirm={() => {
          if (consultationToDelete) {
            deleteConsultation(consultationToDelete.id);
            setConsultationToDelete(null);
          }
        }}
        title={`¿Eliminar ${consultationTermSingular}?`}
        message={`¿Está seguro de que desea eliminar la ficha de ${consultationTermSingular.toLowerCase()} del ${consultationToDelete ? new Date(consultationToDelete.date || consultationToDelete.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''}? Esta acción no se puede deshacer.`}
        confirmText={`Sí, Eliminar ${consultationTermSingular}`}
        variant="danger"
      />

      {/* Confirmation Dialog for Patient Deletion */}
      <ConfirmModal
        isOpen={!!patientToDelete}
        onClose={() => setPatientToDelete(null)}
        onConfirm={() => {
          if (patientToDelete) {
            deletePatient(patientToDelete.id);
            if (selectedPatientId === patientToDelete.id) {
              const remaining = patients.filter(p => p.id !== patientToDelete.id);
              setSelectedPatientId(remaining[0]?.id || '');
            }
            setPatientToDelete(null);
          }
        }}
        title={`¿Eliminar ${clientTermSingular} ${patientToDelete?.first_name} ${patientToDelete?.last_name}?`}
        message={`Esta acción eliminará de forma permanente al paciente ${patientToDelete?.first_name} ${patientToDelete?.last_name} y todos sus registros asociados.`}
        confirmText={`Sí, Eliminar ${clientTermSingular}`}
        variant="danger"
      />

      {/* Confirmation Dialog for Appointment Deletion */}
      <ConfirmModal
        isOpen={!!appointmentToDelete}
        onClose={() => setAppointmentToDelete(null)}
        onConfirm={() => {
          if (appointmentToDelete) {
            deleteAppointment(appointmentToDelete.id);
            setAppointmentToDelete(null);
          }
        }}
        title="¿Eliminar Turno?"
        message={`¿Está seguro de que desea eliminar el turno agendado para el ${appointmentToDelete?.date || appointmentToDelete?.start_datetime.split('T')[0]} a las ${appointmentToDelete?.time || appointmentToDelete?.start_datetime.split('T')[1]?.slice(0, 5)}?`}
        confirmText="Sí, Eliminar Turno"
        variant="danger"
      />
    </div>
  );
};
