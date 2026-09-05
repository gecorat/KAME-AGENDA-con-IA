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
  UserCheck
} from 'lucide-react';
import { useAgendaStore } from '../lib/store';
import { Patient, ConsultationRecord, MedicalCertificate, PaymentRecord } from '../types';
import { ConsultationModal } from '../components/ConsultationModal';
import { NewPaymentModal } from '../components/NewPaymentModal';
import { ReceiptModal } from '../components/ReceiptModal';
import { PrescriptionPrintModal } from '../components/PrescriptionPrintModal';
import { CertificatePrintModal } from '../components/CertificatePrintModal';

interface PatientsViewProps {
  onOpenNewPatient: () => void;
  onEditPatient: (patient: Patient) => void;
  onScheduleForPatient: (patient: Patient) => void;
  onOpenAppointment?: (appointmentId: string) => void;
}

type PatientTab = 'overview' | 'consultations' | 'appointments' | 'billing';

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
    deletePatient
  } = useAgendaStore();

  const [search, setSearch] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string>(patients[0]?.id || '');
  const [activeTab, setActiveTab] = useState<PatientTab>('overview');

  // Modals for coordinated clinical & billing workflows
  const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false);
  const [consultationToEdit, setConsultationToEdit] = useState<ConsultationRecord | null>(null);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [activeReceiptPayment, setActiveReceiptPayment] = useState<PaymentRecord | null>(null);

  const [activePrescriptionToPrint, setActivePrescriptionToPrint] = useState<{
    consultation: ConsultationRecord;
  } | null>(null);

  const [activeCertificateToPrint, setActiveCertificateToPrint] = useState<{
    certificate: MedicalCertificate;
    patientPhone?: string;
  } | null>(null);

  // Filtered patients
  const filteredPatients = patients.filter(p => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    const fullName = `${p.first_name} ${p.last_name}`.toLowerCase();
    const phone = (p.phone || '').toLowerCase();
    const dni = (p.dni || '').toLowerCase();
    const email = (p.email || '').toLowerCase();
    const tags = (p.tags || []).join(' ').toLowerCase();
    return fullName.includes(q) || phone.includes(q) || dni.includes(q) || email.includes(q) || tags.includes(q);
  });

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
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    : [];

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
    if (confirm(`¿Confirmas eliminar a ${patient.first_name} ${patient.last_name}? Esta acción no se puede deshacer.`)) {
      deletePatient(patient.id);
      if (selectedPatientId === patient.id) {
        const remaining = patients.filter(p => p.id !== patient.id);
        setSelectedPatientId(remaining[0]?.id || '');
      }
    }
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
            <h2 className="text-sm sm:text-base font-semibold text-neutral-900 font-display">Directorio de Pacientes</h2>
            <p className="text-[11px] text-neutral-500">
              {patients.length} pacientes registrados con ficha integral, consultas, turnos y cobranzas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, tel o DNI..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-400"
            />
          </div>

          <button
            type="button"
            onClick={onOpenNewPatient}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nuevo Paciente</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Patients List + Detail Profile Card */}
      <div className="grid lg:grid-cols-12 gap-4 min-w-0">
        {/* Left Column: Patient List */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-neutral-200/75 shadow-2xs overflow-hidden flex flex-col min-w-0">
          <div className="px-3.5 py-2.5 border-b border-neutral-200/80 bg-neutral-50/50 flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-700 font-display">
              Pacientes ({filteredPatients.length})
            </span>
            <span className="text-[10px] text-neutral-400 font-medium">
              Selecciona para ver ficha
            </span>
          </div>

          <div className="divide-y divide-neutral-100 max-h-[360px] lg:max-h-[640px] overflow-y-auto flex-1">
            {filteredPatients.length === 0 ? (
              <div className="p-8 text-center text-xs text-neutral-400">
                No se encontraron pacientes con esa búsqueda.
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
                    onClick={() => setSelectedPatientId(p.id)}
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
                        <div className="text-xs font-semibold text-neutral-900 truncate">
                          {p.first_name} {p.last_name}
                        </div>
                        <div className="text-[11px] text-neutral-500 truncate flex items-center gap-1">
                          <span>{p.phone}</span>
                          {p.dni && <span>• DNI {p.dni}</span>}
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
                        {aptsCount} turnos
                      </span>
                      {consCount > 0 && (
                        <span className="text-[9px] text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100 font-medium">
                          {consCount} consultas
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Selected Patient Comprehensive Profile */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-neutral-200/75 shadow-2xs p-3.5 sm:p-5 flex flex-col justify-between min-w-0 overflow-hidden">
          {selectedPatient ? (
            <div className="space-y-4 min-w-0">
              {/* Header profile banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-200/75 min-w-0">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-neutral-900 text-white font-bold text-xs sm:text-sm flex items-center justify-center shadow-xs shrink-0">
                    {selectedPatient.first_name[0]}{selectedPatient.last_name[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm sm:text-base font-bold text-neutral-900 font-display truncate">
                        {selectedPatient.first_name} {selectedPatient.last_name}
                      </h3>
                      {selectedPatient.insurance_provider && (
                        <span className="px-2 py-0.5 text-[10px] font-semibold bg-sky-50 text-sky-700 rounded-full border border-sky-200 shrink-0">
                          {selectedPatient.insurance_provider}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] text-neutral-500 mt-0.5">
                      <span>DNI: {selectedPatient.dni || 'No registrado'}</span>
                      {selectedPatient.birth_date && <span>• Nac.: {selectedPatient.birth_date}</span>}
                      {selectedPatient.insurance_number && <span>• N° Afiliado: {selectedPatient.insurance_number}</span>}
                    </div>
                  </div>
                </div>

                {/* Primary Action Buttons */}
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => onScheduleForPatient(selectedPatient)}
                    className="flex-1 sm:flex-initial px-2.5 sm:px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center justify-center gap-1.5 shrink-0"
                    title="Agendar nuevo turno para este paciente"
                  >
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    <span>Agendar Turno</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setConsultationToEdit(null);
                      setIsConsultationModalOpen(true);
                    }}
                    className="flex-1 sm:flex-initial px-2.5 sm:px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center justify-center gap-1.5 shrink-0"
                    title="Crear nueva consulta clínica / evolución"
                  >
                    <Stethoscope className="w-3.5 h-3.5 shrink-0" />
                    <span>Nueva Consulta</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsPaymentModalOpen(true)}
                    className="flex-1 sm:flex-initial px-2.5 sm:px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center justify-center gap-1.5 shrink-0"
                    title="Registrar cobro y emitir recibo"
                  >
                    <DollarSign className="w-3.5 h-3.5 shrink-0" />
                    <span>Cobrar</span>
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onEditPatient(selectedPatient)}
                      className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-100 text-neutral-600 transition-colors"
                      title="Editar datos del paciente"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeletePatient(selectedPatient)}
                      className="p-1.5 rounded-lg border border-neutral-200 hover:bg-rose-50 hover:text-rose-600 text-neutral-400 transition-colors"
                      title="Eliminar paciente"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Coordinated Metric Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 min-w-0">
                <div className="p-2 sm:p-2.5 bg-neutral-50 rounded-xl border border-neutral-200/70 min-w-0">
                  <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider block truncate">Turnos</span>
                  <div className="text-sm sm:text-base font-bold text-neutral-900 mt-0.5">
                    {patientAppointments.length}
                  </div>
                  <span className="text-[10px] text-neutral-400 block truncate">
                    {patientAppointments.filter(a => a.status === 'confirmed').length} activos
                  </span>
                </div>

                <div className="p-2 sm:p-2.5 bg-indigo-50/60 rounded-xl border border-indigo-100 min-w-0">
                  <span className="text-[10px] uppercase font-bold text-indigo-700 tracking-wider block truncate">Consultas</span>
                  <div className="text-sm sm:text-base font-bold text-indigo-950 mt-0.5">
                    {patientConsultations.length}
                  </div>
                  <span className="text-[10px] text-indigo-600 block truncate">
                    {totalPrescriptions} recetas • {totalCertificates} certs
                  </span>
                </div>

                <div className="p-2 sm:p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-100 min-w-0">
                  <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider block truncate">Facturado</span>
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

              {/* Sub-Tab Navigation inside Patient Profile */}
              <div className="border-b border-neutral-200 flex items-center gap-2 sm:gap-4 text-xs font-semibold overflow-x-auto whitespace-nowrap pb-1 no-scrollbar scroll-smooth">
                <button
                  type="button"
                  onClick={() => setActiveTab('overview')}
                  className={`pb-1.5 transition-colors relative flex items-center gap-1.5 shrink-0 ${
                    activeTab === 'overview'
                      ? 'text-neutral-900 border-b-2 border-neutral-900 font-bold'
                      : 'text-neutral-500 hover:text-neutral-800'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Ficha & Antecedentes</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('consultations')}
                  className={`pb-1.5 transition-colors relative flex items-center gap-1.5 shrink-0 ${
                    activeTab === 'consultations'
                      ? 'text-indigo-700 border-b-2 border-indigo-600 font-bold'
                      : 'text-neutral-500 hover:text-neutral-800'
                  }`}
                >
                  <Stethoscope className="w-3.5 h-3.5" />
                  <span>Historia Clínica ({patientConsultations.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('appointments')}
                  className={`pb-1.5 transition-colors relative flex items-center gap-1.5 shrink-0 ${
                    activeTab === 'appointments'
                      ? 'text-sky-700 border-b-2 border-sky-600 font-bold'
                      : 'text-neutral-500 hover:text-neutral-800'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Turnos ({patientAppointments.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('billing')}
                  className={`pb-1.5 transition-colors relative flex items-center gap-1.5 shrink-0 ${
                    activeTab === 'billing'
                      ? 'text-emerald-700 border-b-2 border-emerald-600 font-bold'
                      : 'text-neutral-500 hover:text-neutral-800'
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Cobros & Recibos ({patientPayments.length})</span>
                </button>
              </div>

              {/* Tab 1: Ficha & Antecedentes */}
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

                  {/* Coverage & Insurance */}
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

                  {/* Clinical Notes */}
                  <div>
                    <h4 className="text-[11px] font-semibold text-neutral-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-neutral-400" /> Antecedentes & Observaciones Médicas
                    </h4>
                    <div className="p-3 bg-neutral-50/70 rounded-lg border border-neutral-200/80 text-xs text-neutral-700 leading-relaxed min-h-[70px]">
                      {selectedPatient.notes || 'No hay observaciones clínicas registradas para este paciente todavía.'}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Historia Clínica & Consultas */}
              {activeTab === 'consultations' && (
                <div className="space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neutral-500">
                      Registro de evoluciones, diagnósticos y prescripciones
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setConsultationToEdit(null);
                        setIsConsultationModalOpen(true);
                      }}
                      className="px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Agregar Consulta</span>
                    </button>
                  </div>

                  {patientConsultations.length === 0 ? (
                    <div className="p-8 bg-neutral-50/70 rounded-xl border border-neutral-200/70 text-center text-xs text-neutral-500 space-y-2">
                      <Stethoscope className="w-6 h-6 mx-auto text-neutral-400 stroke-1" />
                      <p className="font-semibold text-neutral-700">Sin consultas registradas para este paciente</p>
                      <p className="text-[11px] text-neutral-400">
                        Inicia una consulta médica para transcribir voz, registrar diagnósticos y generar recetas.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setConsultationToEdit(null);
                          setIsConsultationModalOpen(true);
                        }}
                        className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg font-semibold text-xs inline-flex items-center gap-1.5 hover:bg-indigo-700 shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Nueva Ficha de Consulta</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                      {patientConsultations.map(c => (
                        <div
                          key={c.id}
                          className="p-3 rounded-xl border border-neutral-200/80 bg-white hover:border-indigo-300 hover:shadow-2xs transition-all space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-neutral-900">
                                  {c.chief_complaint || 'Consulta de control'}
                                </span>
                                <span className="px-1.5 py-0.2 text-[10px] font-semibold bg-indigo-50 text-indigo-700 rounded border border-indigo-100">
                                  {c.template_type.toUpperCase()}
                                </span>
                              </div>
                              <span className="text-[11px] text-neutral-400">
                                {new Date(c.created_at).toLocaleDateString([], {
                                  weekday: 'short',
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric'
                                })} • {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} hs
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {c.prescriptions && c.prescriptions.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setActivePrescriptionToPrint({ consultation: c })}
                                  className="p-1 rounded-md text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 text-xs"
                                  title="Imprimir / Ver Receta Médica"
                                >
                                  <Pill className="w-3.5 h-3.5" />
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => {
                                  setConsultationToEdit(c);
                                  setIsConsultationModalOpen(true);
                                }}
                                className="px-2.5 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 rounded-md border border-neutral-200 transition-colors flex items-center gap-1"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Ver Detalle</span>
                              </button>
                            </div>
                          </div>

                          {c.diagnosis && (
                            <div className="text-xs text-neutral-700 bg-neutral-50 p-2 rounded-lg border border-neutral-100">
                              <span className="font-semibold text-neutral-900 block mb-0.5">Diagnóstico:</span>
                              {c.diagnosis}
                            </div>
                          )}

                          {c.treatment_plan && (
                            <div className="text-[11px] text-neutral-600">
                              <span className="font-semibold text-neutral-800">Plan: </span>
                              {c.treatment_plan}
                            </div>
                          )}

                          {c.prescriptions && c.prescriptions.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {c.prescriptions.map((p, idx) => (
                                <span key={idx} className="text-[10px] bg-sky-50 text-sky-800 border border-sky-200 px-2 py-0.5 rounded-full font-medium">
                                  💊 {p.medication} ({p.dosage})
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Historial de Turnos */}
              {activeTab === 'appointments' && (
                <div className="space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neutral-500">
                      Historial cronológico de citas y reservas
                    </span>
                    <button
                      type="button"
                      onClick={() => onScheduleForPatient(selectedPatient)}
                      className="px-2.5 py-1 text-xs font-semibold text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded-lg border border-neutral-200 transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Agendar Turno</span>
                    </button>
                  </div>

                  {patientAppointments.length === 0 ? (
                    <div className="p-8 bg-neutral-50/70 rounded-xl border border-neutral-200/70 text-center text-xs text-neutral-500 space-y-2">
                      <Calendar className="w-6 h-6 mx-auto text-neutral-400 stroke-1" />
                      <p className="font-semibold text-neutral-700">Aún no tiene turnos registrados</p>
                      <p className="text-[11px] text-neutral-400">
                        Programa una nueva cita presencial o videoconsulta desde aquí.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                      {patientAppointments.map(apt => (
                        <div
                          key={apt.id}
                          className="p-3 rounded-xl border border-neutral-200/80 bg-white hover:bg-neutral-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-neutral-900">{apt.service_name}</span>
                              {apt.origin === 'telemedicine' && (
                                <span className="px-1.5 py-0.2 text-[9px] font-bold bg-sky-100 text-sky-800 rounded">
                                  TELEMEDICINA
                                </span>
                              )}
                              {apt.patient_confirmed && (
                                <span className="px-1.5 py-0.2 text-[9px] font-bold bg-emerald-100 text-emerald-800 rounded flex items-center gap-0.5">
                                  <UserCheck className="w-2.5 h-2.5" />
                                  CONFIRMADO
                                </span>
                              )}
                            </div>
                            <span className="text-neutral-500 text-[11px] block mt-0.5">
                              {new Date(apt.start_datetime).toLocaleDateString([], {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short'
                              })}{' '}
                              a las{' '}
                              {new Date(apt.start_datetime).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}{' '}
                              hs
                            </span>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 pt-1 sm:pt-0 border-t sm:border-t-0 border-neutral-100">
                            <div className="sm:text-right">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                apt.status === 'confirmed'
                                  ? 'bg-sky-50 text-sky-700 border border-sky-200'
                                  : apt.status === 'completed'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-neutral-100 text-neutral-600'
                              }`}>
                                {apt.status}
                              </span>
                              <span className="block text-[11px] font-bold text-neutral-900 mt-0.5">
                                ${apt.service_price?.toLocaleString('es-AR')}
                              </span>
                            </div>

                            {onOpenAppointment && (
                              <button
                                type="button"
                                onClick={() => onOpenAppointment(apt.id)}
                                className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-100 text-neutral-600"
                                title="Abrir y editar turno"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 4: Cobros & Recibos */}
              {activeTab === 'billing' && (
                <div className="space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neutral-500">
                      Comprobantes de pago y recibos emitidos a este paciente
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsPaymentModalOpen(true)}
                      className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Cobrar / Emitir Recibo</span>
                    </button>
                  </div>

                  {patientPayments.length === 0 ? (
                    <div className="p-8 bg-neutral-50/70 rounded-xl border border-neutral-200/70 text-center text-xs text-neutral-500 space-y-2">
                      <Receipt className="w-6 h-6 mx-auto text-neutral-400 stroke-1" />
                      <p className="font-semibold text-neutral-700">Sin pagos registrados para este paciente</p>
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

                            <button
                              type="button"
                              onClick={() => setActiveReceiptPayment(pay)}
                              className="px-2.5 py-1 bg-white border border-neutral-200 hover:bg-neutral-100 rounded-lg text-xs font-semibold text-neutral-800 transition-colors shadow-2xs flex items-center gap-1 shrink-0"
                            >
                              <Receipt className="w-3.5 h-3.5 text-neutral-600" />
                              <span>Ver Recibo</span>
                            </button>
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
          onClose={() => {
            setIsConsultationModalOpen(false);
            setConsultationToEdit(null);
          }}
          onSaved={() => {
            setIsConsultationModalOpen(false);
            setConsultationToEdit(null);
          }}
        />
      )}

      {isPaymentModalOpen && selectedPatient && (
        <NewPaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          preselectedPatient={selectedPatient}
          onPaymentSuccess={payment => {
            setIsPaymentModalOpen(false);
            setActiveReceiptPayment(payment);
          }}
        />
      )}

      {activeReceiptPayment && (
        <ReceiptModal
          isOpen={!!activeReceiptPayment}
          onClose={() => setActiveReceiptPayment(null)}
          payment={activeReceiptPayment}
        />
      )}

      {activePrescriptionToPrint && (
        <PrescriptionPrintModal
          isOpen={!!activePrescriptionToPrint}
          onClose={() => setActivePrescriptionToPrint(null)}
          consultation={activePrescriptionToPrint.consultation}
        />
      )}

      {activeCertificateToPrint && (
        <CertificatePrintModal
          isOpen={!!activeCertificateToPrint}
          onClose={() => setActiveCertificateToPrint(null)}
          certificate={activeCertificateToPrint.certificate}
          patientPhone={activeCertificateToPrint.patientPhone}
        />
      )}
    </div>
  );
};
