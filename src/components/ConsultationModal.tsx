import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Mic,
  Save,
  FileText,
  Activity,
  Pill,
  Award,
  Sparkles,
  Plus,
  Trash2,
  Printer,
  Send,
  Play,
  Pause,
  AlertTriangle,
  Heart,
  ChevronDown,
  Calendar,
  User,
  Clock,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { useAgendaStore } from '../lib/store';
import {
  ConsultationRecord,
  MedicalPrescriptionItem,
  MedicalCertificate,
  VoiceNote,
  VitalSigns,
  Patient
} from '../types';
import { VoiceNoteRecorder } from './VoiceNoteRecorder';
import { PrescriptionPrintModal } from './PrescriptionPrintModal';
import { CertificatePrintModal } from './CertificatePrintModal';

interface ConsultationModalProps {
  consultation?: ConsultationRecord | null;
  patientId?: string;
  appointmentId?: string;
  onClose: () => void;
  onSaved?: (consultation: ConsultationRecord) => void;
}

export const ConsultationModal: React.FC<ConsultationModalProps> = ({
  consultation,
  patientId: initialPatientId,
  appointmentId,
  onClose,
  onSaved
}) => {
  const {
    patients,
    practiceSettings,
    addConsultation,
    updateConsultation
  } = useAgendaStore();

  // Selected Patient
  const [selectedPatientId, setSelectedPatientId] = useState<string>(() => {
    if (consultation) return consultation.patient_id;
    if (initialPatientId) return initialPatientId;
    return patients[0]?.id || '';
  });

  const currentPatient: Patient | undefined = patients.find(p => p.id === selectedPatientId);

  // Form Fields
  const [reasonForVisit, setReasonForVisit] = useState(consultation?.reason_for_visit || '');
  const [date, setDate] = useState(consultation ? consultation.date.split('T')[0] : new Date().toISOString().split('T')[0]);
  
  // Vital Signs
  const [vitalSigns, setVitalSigns] = useState<VitalSigns>(consultation?.vital_signs || {
    blood_pressure: '',
    heart_rate: '',
    temperature: '',
    weight_kg: '',
    height_cm: '',
    oxygen_sat: ''
  });

  // SOAP fields
  const [soapSubjective, setSoapSubjective] = useState(consultation?.soap_subjective || '');
  const [soapObjective, setSoapObjective] = useState(consultation?.soap_objective || '');
  const [soapAnalysis, setSoapAnalysis] = useState(consultation?.soap_analysis || '');
  const [soapPlan, setSoapPlan] = useState(consultation?.soap_plan || '');

  // Attached Voice Notes
  const [voiceNotes, setVoiceNotes] = useState<VoiceNote[]>(consultation?.voice_notes || []);
  const [playingVoiceNoteId, setPlayingVoiceNoteId] = useState<string | null>(null);

  // Prescriptions List
  const [prescriptions, setPrescriptions] = useState<MedicalPrescriptionItem[]>(consultation?.prescriptions || []);
  const [newMed, setNewMed] = useState({ medication: '', dosage: '', duration: '', instructions: '' });

  // Certificates
  const [certificates, setCertificates] = useState<MedicalCertificate[]>(consultation?.certificates || []);
  const [showCertificateForm, setShowCertificateForm] = useState(false);
  const [certType, setCertType] = useState<'reposo' | 'asistencia' | 'aptitud_fisica'>('reposo');
  const [certDays, setCertDays] = useState(2);
  const [certPresentedTo, setCertPresentedTo] = useState('A quien corresponda');
  const [certContent, setCertContent] = useState('');

  // Active Tab: 'soap' | 'voice' | 'prescriptions' | 'certificates'
  const [activeTab, setActiveTab] = useState<'soap' | 'voice' | 'prescriptions' | 'certificates'>('soap');

  // Sub-modal states
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [showCertPrintModal, setShowCertPrintModal] = useState<MedicalCertificate | null>(null);

  // Live Web Speech Recognition states
  const [activeSpeechField, setActiveSpeechField] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // AI SOAP text refining state
  const [isRefiningSOAP, setIsRefiningSOAP] = useState(false);

  // Initialize certificate text helper
  useEffect(() => {
    if (currentPatient) {
      if (certType === 'reposo') {
        setCertContent(
          `Certifico que el paciente ${currentPatient.first_name} ${currentPatient.last_name}${currentPatient.dni ? `, DNI ${currentPatient.dni},` : ''} fue evaluado en consulta médica presentando cuadro que amerita reposo laboral por el término de ${certDays} días a partir de la fecha.`
        );
      } else if (certType === 'asistencia') {
        setCertContent(
          `Hago constar que el paciente ${currentPatient.first_name} ${currentPatient.last_name}${currentPatient.dni ? `, DNI ${currentPatient.dni},` : ''} asistió a consulta odontológica/médica en el día de la fecha de ${new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs.`
        );
      } else {
        setCertContent(
          `Certifico que habiendo examinado al paciente ${currentPatient.first_name} ${currentPatient.last_name}${currentPatient.dni ? `, DNI ${currentPatient.dni},` : ''} no se observan contraindicaciones clínicas evidentes al momento del examen para la práctica de actividad física de moderada intensidad.`
        );
      }
    }
  }, [certType, certDays, currentPatient]);

  // Handle Speech Recognition for any SOAP field
  const toggleSpeechDictation = (field: 'subjective' | 'objective' | 'analysis' | 'plan') => {
    if (activeSpeechField === field) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setActiveSpeechField(null);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Tu navegador no soporta la API de reconocimiento de voz directo. Puedes usar el grabador de Notas de Voz de arriba.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'es-AR';
      recognition.continuous = true;
      recognition.interimResults = false;

      recognition.onresult = (event: any) => {
        const last = event.results.length - 1;
        const text = event.results[last][0].transcript;

        if (field === 'subjective') setSoapSubjective(prev => (prev ? prev + ' ' + text : text));
        if (field === 'objective') setSoapObjective(prev => (prev ? prev + ' ' + text : text));
        if (field === 'analysis') setSoapAnalysis(prev => (prev ? prev + ' ' + text : text));
        if (field === 'plan') setSoapPlan(prev => (prev ? prev + ' ' + text : text));
      };

      recognition.onerror = () => {
        setActiveSpeechField(null);
      };

      recognition.onend = () => {
        setActiveSpeechField(null);
      };

      recognition.start();
      recognitionRef.current = recognition;
      setActiveSpeechField(field);
    } catch (e) {
      console.warn('Speech recognition error:', e);
      setActiveSpeechField(null);
    }
  };

  // When a voice note finishes recording and is transcribed by Gemini
  const handleVoiceNoteProcessed = (data: {
    transcription: string;
    audioUrl: string;
    durationSeconds: number;
    soap?: {
      subjective: string;
      objective: string;
      analysis: string;
      plan: string;
    };
    prescriptions?: Array<{
      medication: string;
      dosage: string;
      duration: string;
      instructions?: string;
    }>;
  }) => {
    // Add new voice note item
    const newNote: VoiceNote = {
      id: `vn-${Date.now()}`,
      audio_url: data.audioUrl,
      duration_seconds: data.durationSeconds,
      recorded_at: new Date().toISOString(),
      title: `Nota de Voz - ${new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`,
      transcription: data.transcription,
      transcription_status: 'ready'
    };
    setVoiceNotes(prev => [newNote, ...prev]);

    // Automatically fill or merge SOAP fields if provided by AI
    if (data.soap) {
      if (data.soap.subjective) {
        setSoapSubjective(prev => prev ? `${prev}\n\n[Dictado de voz]: ${data.soap!.subjective}` : data.soap!.subjective);
      }
      if (data.soap.objective) {
        setSoapObjective(prev => prev ? `${prev}\n\n[Dictado de voz]: ${data.soap!.objective}` : data.soap!.objective);
      }
      if (data.soap.analysis) {
        setSoapAnalysis(prev => prev ? `${prev}\n\n[Dictado de voz]: ${data.soap!.analysis}` : data.soap!.analysis);
      }
      if (data.soap.plan) {
        setSoapPlan(prev => prev ? `${prev}\n\n[Dictado de voz]: ${data.soap!.plan}` : data.soap!.plan);
      }
    }

    // Automatically add extracted prescriptions if any
    if (data.prescriptions && data.prescriptions.length > 0) {
      const formattedItems: MedicalPrescriptionItem[] = data.prescriptions.map((p, idx) => ({
        id: `rx-ai-${Date.now()}-${idx}`,
        medication: p.medication,
        dosage: p.dosage,
        duration: p.duration,
        instructions: p.instructions
      }));
      setPrescriptions(prev => [...prev, ...formattedItems]);
    }

    // Switch to SOAP tab to review populated content
    setActiveTab('soap');
  };

  // AI SOAP Refinement action
  const handleRefineWithAI = async () => {
    const rawContent = `Subjetivo: ${soapSubjective}\nObjetivo: ${soapObjective}\nAnálisis: ${soapAnalysis}\nPlan: ${soapPlan}`;
    if (!rawContent.trim() || rawContent.length < 15) {
      alert('Escribe o dicta algunas notas primero para que la IA pueda estructurarlas.');
      return;
    }

    setIsRefiningSOAP(true);
    try {
      const response = await fetch('/api/consultations/structure-soap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: rawContent,
          patientName: currentPatient ? `${currentPatient.first_name} ${currentPatient.last_name}` : 'Paciente',
          specialty: practiceSettings.specialty
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.soap) {
          if (data.soap.subjective) setSoapSubjective(data.soap.subjective);
          if (data.soap.objective) setSoapObjective(data.soap.objective);
          if (data.soap.analysis) setSoapAnalysis(data.soap.analysis);
          if (data.soap.plan) setSoapPlan(data.soap.plan);
        }
      }
    } catch (e) {
      console.error('Error refining SOAP:', e);
    } finally {
      setIsRefiningSOAP(false);
    }
  };

  // Add Medication Item
  const handleAddMedication = () => {
    if (!newMed.medication.trim()) return;
    const item: MedicalPrescriptionItem = {
      id: `rx-${Date.now()}`,
      medication: newMed.medication.trim(),
      dosage: newMed.dosage.trim() || 'Según indicación',
      duration: newMed.duration.trim() || 'Durante 7 días',
      instructions: newMed.instructions.trim()
    };
    setPrescriptions(prev => [...prev, item]);
    setNewMed({ medication: '', dosage: '', duration: '', instructions: '' });
  };

  const handleRemoveMedication = (id: string) => {
    setPrescriptions(prev => prev.filter(p => p.id !== id));
  };

  // Add Certificate
  const handleCreateCertificate = () => {
    if (!currentPatient) return;
    const newCert: MedicalCertificate = {
      id: `cert-${Date.now()}`,
      certificate_number: `CERT-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      patient_id: currentPatient.id,
      patient_name: `${currentPatient.first_name} ${currentPatient.last_name}`,
      patient_dni: currentPatient.dni,
      type: certType,
      presented_to: certPresentedTo,
      diagnosis: soapAnalysis || reasonForVisit || 'Consulta clínica',
      rest_days: certType === 'reposo' ? certDays : undefined,
      start_date: date,
      end_date: certType === 'reposo' ? new Date(new Date(date).getTime() + (certDays - 1) * 86400000).toISOString().split('T')[0] : undefined,
      content: certContent,
      professional_name: practiceSettings.professional_name,
      medical_license: practiceSettings.medical_license,
      date: date
    };

    setCertificates(prev => [newCert, ...prev]);
    setShowCertificateForm(false);
  };

  // Save full Consultation Record
  const handleSaveConsultation = () => {
    if (!currentPatient) {
      alert('Por favor selecciona un paciente');
      return;
    }
    if (!reasonForVisit.trim()) {
      alert('Por favor especifica el motivo de consulta principal.');
      return;
    }

    const payload = {
      patient_id: currentPatient.id,
      patient_name: `${currentPatient.first_name} ${currentPatient.last_name}`,
      appointment_id: appointmentId,
      date: new Date(date).toISOString(),
      reason_for_visit: reasonForVisit.trim(),
      vital_signs: vitalSigns,
      soap_subjective: soapSubjective.trim(),
      soap_objective: soapObjective.trim(),
      soap_analysis: soapAnalysis.trim(),
      soap_plan: soapPlan.trim(),
      voice_notes: voiceNotes,
      prescriptions: prescriptions,
      certificates: certificates,
      professional_name: practiceSettings.professional_name,
      medical_license: practiceSettings.medical_license
    };

    let savedRecord: ConsultationRecord;
    if (consultation) {
      updateConsultation(consultation.id, payload);
      savedRecord = { ...consultation, ...payload };
    } else {
      savedRecord = addConsultation(payload);
    }

    if (onSaved) onSaved(savedRecord);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-4 max-h-[92vh] flex flex-col">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-600/30 border border-sky-400/40 text-sky-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  {consultation ? 'Ficha de Evolución Clínica' : 'Nueva Consulta con Notas de Voz'}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-500/20 text-sky-300 border border-sky-400/30">
                  Método SOAP & Audio IA
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {practiceSettings.practice_name} • {practiceSettings.professional_name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="btn-save-consultation-top"
              onClick={handleSaveConsultation}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-500 active:scale-95 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              Guardar Ficha
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Patient Selection & Quick Medical Alerts Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex-shrink-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
            {/* Patient Selector */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Paciente
              </label>
              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                disabled={!!consultation}
                className="w-full text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                {patients.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.first_name} {p.last_name} {p.dni ? `(DNI: ${p.dni})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Consultation Date & Reason */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Fecha de Consulta
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-xs text-slate-800 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {/* Medical Alerts / Allergies Badge */}
            <div className="sm:border-l sm:border-slate-200 sm:pl-3">
              <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Antecedentes & Alergias
              </span>
              {currentPatient?.allergies && currentPatient.allergies.length > 0 ? (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-100 text-rose-800 rounded-md text-xs font-bold">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                  Alergias: {currentPatient.allergies.join(', ')}
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-md text-xs font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Sin alergias conocidas
                </div>
              )}
            </div>
          </div>

          {/* Reason for Visit Input */}
          <div className="mt-3">
            <input
              type="text"
              value={reasonForVisit}
              onChange={(e) => setReasonForVisit(e.target.value)}
              placeholder="Motivo principal de consulta (ej. Control periódico, Dolor pulsátil molar, Revisión post-operatoria)..."
              className="w-full text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-lg px-3 py-1.5 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-white px-6 gap-6 text-xs font-semibold text-slate-600 flex-shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('soap')}
            className={`py-3 flex items-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'soap'
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            Evolución SOAP
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('voice')}
            className={`py-3 flex items-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'voice'
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <Mic className="w-4 h-4 text-rose-600" />
            Notas de Voz & Grabación
            {voiceNotes.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 text-[10px] flex items-center justify-center font-bold">
                {voiceNotes.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('prescriptions')}
            className={`py-3 flex items-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'prescriptions'
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <Pill className="w-4 h-4 text-indigo-600" />
            Recetas Médicas
            {prescriptions.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] flex items-center justify-center font-bold">
                {prescriptions.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('certificates')}
            className={`py-3 flex items-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'certificates'
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <Award className="w-4 h-4 text-emerald-600" />
            Certificados
            {certificates.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] flex items-center justify-center font-bold">
                {certificates.length}
              </span>
            )}
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: SOAP Evolution */}
          {activeTab === 'soap' && (
            <div className="space-y-6">
              {/* Voice Note Banner Callout if no audio recorded yet */}
              {voiceNotes.length === 0 && (
                <div className="p-3.5 bg-gradient-to-r from-sky-50 to-indigo-50 border border-sky-200 rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center flex-shrink-0">
                      <Mic className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">¿Prefieres dictar la consulta por voz?</h4>
                      <p className="text-[11px] text-slate-600">
                        Graba una nota de audio y Gemini transcribirá y completará automáticamente los 4 campos del método SOAP.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('voice')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex-shrink-0"
                  >
                    <Mic className="w-3.5 h-3.5" />
                    Grabar Audio
                  </button>
                </div>
              )}

              {/* Signos Vitales (Vital Signs Strip) */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Heart className="w-4 h-4 text-rose-500" />
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Signos Vitales y Parámetros Clínicos
                  </h4>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500">PA (Presión)</label>
                    <input
                      type="text"
                      placeholder="120/80"
                      value={vitalSigns.blood_pressure || ''}
                      onChange={(e) => setVitalSigns(prev => ({ ...prev, blood_pressure: e.target.value }))}
                      className="w-full text-xs font-mono bg-white border border-slate-300 rounded px-2 py-1"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500">FC (Pulso)</label>
                    <input
                      type="text"
                      placeholder="72 bpm"
                      value={vitalSigns.heart_rate || ''}
                      onChange={(e) => setVitalSigns(prev => ({ ...prev, heart_rate: e.target.value }))}
                      className="w-full text-xs font-mono bg-white border border-slate-300 rounded px-2 py-1"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500">Temp (°C)</label>
                    <input
                      type="text"
                      placeholder="36.5"
                      value={vitalSigns.temperature || ''}
                      onChange={(e) => setVitalSigns(prev => ({ ...prev, temperature: e.target.value }))}
                      className="w-full text-xs font-mono bg-white border border-slate-300 rounded px-2 py-1"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500">Peso (kg)</label>
                    <input
                      type="text"
                      placeholder="70"
                      value={vitalSigns.weight_kg || ''}
                      onChange={(e) => setVitalSigns(prev => ({ ...prev, weight_kg: e.target.value }))}
                      className="w-full text-xs font-mono bg-white border border-slate-300 rounded px-2 py-1"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500">Talla (cm)</label>
                    <input
                      type="text"
                      placeholder="175"
                      value={vitalSigns.height_cm || ''}
                      onChange={(e) => setVitalSigns(prev => ({ ...prev, height_cm: e.target.value }))}
                      className="w-full text-xs font-mono bg-white border border-slate-300 rounded px-2 py-1"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500">Sat O2 (%)</label>
                    <input
                      type="text"
                      placeholder="98%"
                      value={vitalSigns.oxygen_sat || ''}
                      onChange={(e) => setVitalSigns(prev => ({ ...prev, oxygen_sat: e.target.value }))}
                      className="w-full text-xs font-mono bg-white border border-slate-300 rounded px-2 py-1"
                    />
                  </div>
                </div>
              </div>

              {/* SOAP Form Sections */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Evolución Clínica Estructurada (SOAP)
                  </h3>

                  <button
                    type="button"
                    onClick={handleRefineWithAI}
                    disabled={isRefiningSOAP}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isRefiningSOAP ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Refinando redacción...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        Mejorar redacción con Gemini IA
                      </>
                    )}
                  </button>
                </div>

                {/* S - Subjetivo */}
                <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded bg-sky-100 text-sky-800 font-bold font-mono text-xs flex items-center justify-center">
                        S
                      </span>
                      <label className="text-xs font-bold text-slate-800">
                        Subjetivo (Anamnesis, síntomas referidos y motivo)
                      </label>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleSpeechDictation('subjective')}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                        activeSpeechField === 'subjective'
                          ? 'bg-rose-100 text-rose-700 animate-pulse'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <Mic className="w-3 h-3 text-rose-600" />
                      {activeSpeechField === 'subjective' ? 'Dictando ahora...' : 'Dictar por voz'}
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    value={soapSubjective}
                    onChange={(e) => setSoapSubjective(e.target.value)}
                    placeholder="Qué refiere el paciente: síntomas, dolor, localización, tiempo de evolución, medicamentos que tomó..."
                    className="w-full text-xs text-slate-800 border border-slate-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-sky-500 placeholder-slate-400"
                  />
                </div>

                {/* O - Objetivo */}
                <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded bg-teal-100 text-teal-800 font-bold font-mono text-xs flex items-center justify-center">
                        O
                      </span>
                      <label className="text-xs font-bold text-slate-800">
                        Objetivo (Examen físico, hallazgos clínicos y estudios)
                      </label>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleSpeechDictation('objective')}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                        activeSpeechField === 'objective'
                          ? 'bg-rose-100 text-rose-700 animate-pulse'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <Mic className="w-3 h-3 text-rose-600" />
                      {activeSpeechField === 'objective' ? 'Dictando ahora...' : 'Dictar por voz'}
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    value={soapObjective}
                    onChange={(e) => setSoapObjective(e.target.value)}
                    placeholder="Hallazgos observados: examen regional, inspección, palpación, pruebas diagnósticas, Rx o laboratorio..."
                    className="w-full text-xs text-slate-800 border border-slate-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-sky-500 placeholder-slate-400"
                  />
                </div>

                {/* A - Análisis / Diagnóstico */}
                <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded bg-amber-100 text-amber-800 font-bold font-mono text-xs flex items-center justify-center">
                        A
                      </span>
                      <label className="text-xs font-bold text-slate-800">
                        Análisis (Diagnóstico clínico / Juicio facultativo)
                      </label>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleSpeechDictation('analysis')}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                        activeSpeechField === 'analysis'
                          ? 'bg-rose-100 text-rose-700 animate-pulse'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <Mic className="w-3 h-3 text-rose-600" />
                      {activeSpeechField === 'analysis' ? 'Dictando ahora...' : 'Dictar por voz'}
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    value={soapAnalysis}
                    onChange={(e) => setSoapAnalysis(e.target.value)}
                    placeholder="Diagnóstico presuntivo o de certeza (ej. Pulpitis irreversible en 3.6, Gingivitis marginal leve, Hipertensión estadio 1)..."
                    className="w-full text-xs text-slate-800 border border-slate-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-sky-500 placeholder-slate-400"
                  />
                </div>

                {/* P - Plan Terapéutico */}
                <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded bg-indigo-100 text-indigo-800 font-bold font-mono text-xs flex items-center justify-center">
                        P
                      </span>
                      <label className="text-xs font-bold text-slate-800">
                        Plan (Tratamiento, pautas de alarma y próxima cita)
                      </label>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleSpeechDictation('plan')}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                        activeSpeechField === 'plan'
                          ? 'bg-rose-100 text-rose-700 animate-pulse'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <Mic className="w-3 h-3 text-rose-600" />
                      {activeSpeechField === 'plan' ? 'Dictando ahora...' : 'Dictar por voz'}
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    value={soapPlan}
                    onChange={(e) => setSoapPlan(e.target.value)}
                    placeholder="Procedimientos realizados hoy, pautas terapéuticas, medicación prescrita, solicitud de estudios, fecha de control..."
                    className="w-full text-xs text-slate-800 border border-slate-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-sky-500 placeholder-slate-400"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Voice Notes & Recording Hub */}
          {activeTab === 'voice' && (
            <div className="space-y-6">
              {/* Interactive Recorder Component */}
              <VoiceNoteRecorder
                patientName={currentPatient ? `${currentPatient.first_name} ${currentPatient.last_name}` : 'Paciente'}
                specialty={practiceSettings.specialty}
                onTranscriptionComplete={handleVoiceNoteProcessed}
              />

              {/* Saved Voice Notes Archive for this consultation */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Mic className="w-4 h-4 text-sky-600" />
                  Audios Grabados en esta Consulta ({voiceNotes.length})
                </h4>

                {voiceNotes.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-xs text-slate-500">
                    No hay notas de voz grabadas aún. Presiona "Iniciar Grabación de Voz" arriba para comenzar.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {voiceNotes.map((vn, index) => (
                      <div key={vn.id || index} className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className="w-7 h-7 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center">
                              <Mic className="w-3.5 h-3.5" />
                            </span>
                            <div>
                              <h5 className="text-xs font-bold text-slate-900">{vn.title || `Nota de voz ${index + 1}`}</h5>
                              <p className="text-[11px] text-slate-500">
                                {new Date(vn.recorded_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} • Duración: {vn.duration_seconds}s
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {vn.transcription_status === 'ready' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                                Transcripta
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Transcription Preview */}
                        {vn.transcription && (
                          <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-700 italic border-l-2 border-sky-500">
                            "{vn.transcription}"
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Prescriptions Manager */}
          {activeTab === 'prescriptions' && (
            <div className="space-y-6">
              {/* Add New Prescription Row */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Plus className="w-4 h-4 text-sky-600" />
                  Agregar Medicamento a la Receta
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500">Medicamento & Concentración</label>
                    <input
                      type="text"
                      placeholder="ej. Amoxicilina 500mg, Ibuprofeno 600mg"
                      value={newMed.medication}
                      onChange={(e) => setNewMed(prev => ({ ...prev, medication: e.target.value }))}
                      className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500">Posología / Dosis</label>
                    <input
                      type="text"
                      placeholder="ej. 1 comprimido cada 8 horas"
                      value={newMed.dosage}
                      onChange={(e) => setNewMed(prev => ({ ...prev, dosage: e.target.value }))}
                      className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500">Duración</label>
                    <input
                      type="text"
                      placeholder="ej. Durante 7 días"
                      value={newMed.duration}
                      onChange={(e) => setNewMed(prev => ({ ...prev, duration: e.target.value }))}
                      className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500">Instrucciones Adicionales (Opcional)</label>
                  <input
                    type="text"
                    placeholder="ej. Tomar después de las comidas con abundante agua"
                    value={newMed.instructions}
                    onChange={(e) => setNewMed(prev => ({ ...prev, instructions: e.target.value }))}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleAddMedication}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Añadir a la Receta
                  </button>
                </div>
              </div>

              {/* Prescriptions List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Medicamentos Indicados ({prescriptions.length})
                  </h4>

                  {prescriptions.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowPrescriptionModal(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Emitir Receta Oficial / Imprimir
                    </button>
                  )}
                </div>

                {prescriptions.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-xs text-slate-500">
                    No hay medicamentos indicados en esta consulta. Puedes agregarlos arriba o dictarlos en la nota de voz.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {prescriptions.map((p, idx) => (
                      <div key={p.id || idx} className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 shadow-xs">
                        <div className="flex items-start gap-3">
                          <span className="w-6 h-6 rounded-full bg-sky-100 text-sky-700 text-xs font-bold flex items-center justify-center font-mono mt-0.5">
                            {idx + 1}
                          </span>
                          <div>
                            <h5 className="text-xs font-bold text-slate-900">{p.medication}</h5>
                            <p className="text-[11px] text-slate-600">
                              <strong className="font-semibold text-slate-700">Dosis:</strong> {p.dosage} • <strong className="font-semibold text-slate-700">Duración:</strong> {p.duration}
                            </p>
                            {p.instructions && (
                              <p className="text-[11px] text-slate-500 italic mt-0.5">
                                Indicaciones: {p.instructions}
                              </p>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveMedication(p.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: Certificates Manager */}
          {activeTab === 'certificates' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Certificados Médicos & Constancias Oficiales
                </h4>

                {!showCertificateForm && (
                  <button
                    type="button"
                    onClick={() => setShowCertificateForm(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Nuevo Certificado
                  </button>
                )}
              </div>

              {/* Certificate Creator Form */}
              {showCertificateForm && (
                <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-emerald-900">Emitir Nuevo Certificado</h5>
                    <button
                      type="button"
                      onClick={() => setShowCertificateForm(false)}
                      className="text-xs text-slate-400 hover:text-slate-600"
                    >
                      Cancelar
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600">Tipo de Certificado</label>
                      <select
                        value={certType}
                        onChange={(e) => setCertType(e.target.value as any)}
                        className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5"
                      >
                        <option value="reposo">Reposo Médico Laboral / Escolar</option>
                        <option value="asistencia">Constancia de Asistencia a Consulta</option>
                        <option value="aptitud_fisica">Certificado de Aptitud Física</option>
                      </select>
                    </div>

                    {certType === 'reposo' && (
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600">Días de Reposo</label>
                        <input
                          type="number"
                          min="1"
                          max="30"
                          value={certDays}
                          onChange={(e) => setCertDays(parseInt(e.target.value) || 1)}
                          className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600">Presentar Ante</label>
                      <input
                        type="text"
                        value={certPresentedTo}
                        onChange={(e) => setCertPresentedTo(e.target.value)}
                        placeholder="A quien corresponda / Empresa"
                        className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5"
                      >
                      </input>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600">Texto del Certificado</label>
                    <textarea
                      rows={3}
                      value={certContent}
                      onChange={(e) => setCertContent(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCertificateForm(false)}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                    >
                      Descartar
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateCertificate}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs"
                    >
                      Generar Certificado
                    </button>
                  </div>
                </div>
              )}

              {/* Certificates List */}
              <div className="space-y-3">
                {certificates.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-xs text-slate-500">
                    No hay certificados emitidos para esta consulta.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {certificates.map((cert) => (
                      <div key={cert.id} className="p-4 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 shadow-xs">
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                            <Award className="w-4 h-4" />
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="text-xs font-bold text-slate-900">
                                {cert.type === 'reposo' ? 'Certificado de Reposo' : cert.type === 'asistencia' ? 'Constancia de Asistencia' : 'Aptitud Física'}
                              </h5>
                              <span className="text-[10px] text-slate-400 font-mono">Nº {cert.certificate_number}</span>
                            </div>
                            <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-1">
                              {cert.content}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => setShowCertPrintModal(cert)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg transition-colors"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            Ver / Imprimir
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Sticky Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-200 flex-shrink-0">
          <div className="text-xs text-slate-500">
            {currentPatient ? (
              <span>Paciente: <strong className="text-slate-800">{currentPatient.first_name} {currentPatient.last_name}</strong></span>
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancelar
            </button>

            <button
              type="button"
              id="btn-save-consultation-bottom"
              onClick={handleSaveConsultation}
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-sky-600 hover:bg-sky-500 active:scale-95 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              Guardar Consulta en Historia Clínica
            </button>
          </div>
        </div>
      </div>

      {/* Sub-modal: Official Prescription Print & Send */}
      {showPrescriptionModal && currentPatient && (
        <PrescriptionPrintModal
          prescription={{
            id: `rx-doc-${Date.now()}`,
            prescription_number: `RX-2026-${Math.floor(1000 + Math.random() * 9000)}`,
            patient_id: currentPatient.id,
            patient_name: `${currentPatient.first_name} ${currentPatient.last_name}`,
            patient_dni: currentPatient.dni,
            patient_phone: currentPatient.phone,
            items: prescriptions,
            diagnosis: soapAnalysis || reasonForVisit,
            professional_name: practiceSettings.professional_name,
            medical_license: practiceSettings.medical_license,
            date: date,
            status: 'active'
          }}
          practiceSettings={practiceSettings}
          onClose={() => setShowPrescriptionModal(false)}
        />
      )}

      {/* Sub-modal: Official Certificate Print & Send */}
      {showCertPrintModal && currentPatient && (
        <CertificatePrintModal
          certificate={showCertPrintModal}
          practiceSettings={practiceSettings}
          patientPhone={currentPatient.phone}
          onClose={() => setShowCertPrintModal(null)}
        />
      )}
    </div>
  );
};
