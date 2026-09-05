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
  Loader2,
  Stethoscope,
  Smile,
  Brain,
  Zap,
  Check,
  RotateCcw
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

type TemplateMode = 'dental' | 'generic' | 'soap' | 'psychology' | 'kinesiology';

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

  // Determine initial template mode
  const initialMode: TemplateMode = (() => {
    if (consultation?.consultation_type) return consultation.consultation_type;
    const spec = (practiceSettings.specialty || '').toLowerCase();
    const name = (practiceSettings.practice_name || '').toLowerCase();
    if (spec.includes('odont') || spec.includes('dent') || name.includes('dent') || name.includes('odont')) {
      return 'dental';
    }
    if (spec.includes('psic') || spec.includes('mental')) return 'psychology';
    if (spec.includes('kine') || spec.includes('fisio')) return 'kinesiology';
    return 'dental'; // Default to dental / adaptable first since user specifically requested dental workflow
  })();

  const [templateMode, setTemplateMode] = useState<TemplateMode>(initialMode);

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
  
  // Dental Specific Fields
  const [dentalToothNumber, setDentalToothNumber] = useState(consultation?.dental_tooth_number || '');
  const [treatmentPerformed, setTreatmentPerformed] = useState(consultation?.treatment_performed || '');
  
  // Generic Evolution Field
  const [clinicalEvolution, setClinicalEvolution] = useState(consultation?.clinical_evolution || '');

  // Vital Signs - Configurable and toggleable (defaults to false so dentists / psychologists are never forced to measure weight!)
  const [vitalSignsEnabled, setVitalSignsEnabled] = useState<boolean>(() => {
    if (consultation?.vital_signs_enabled !== undefined) return consultation.vital_signs_enabled;
    if (consultation?.vital_signs && Object.values(consultation.vital_signs).some(Boolean)) return true;
    return false;
  });

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
  const [voiceNotification, setVoiceNotification] = useState<string | null>(null);

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

  // Active Tab: 'clinical' | 'voice' | 'prescriptions' | 'certificates'
  const [activeTab, setActiveTab] = useState<'clinical' | 'voice' | 'prescriptions' | 'certificates'>('clinical');

  // Sub-modal states
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [activeCertToPrint, setActiveCertToPrint] = useState<MedicalCertificate | null>(null);

  // Live Web Speech Recognition states
  const [activeSpeechField, setActiveSpeechField] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // AI refinement state
  const [isRefiningAI, setIsRefiningAI] = useState(false);

  // Initialize certificate text helper
  useEffect(() => {
    if (currentPatient) {
      if (certType === 'reposo') {
        setCertContent(
          `Certifico que el/la paciente ${currentPatient.first_name} ${currentPatient.last_name}${currentPatient.dni ? `, DNI ${currentPatient.dni},` : ''} fue atendido/a en este consultorio y requiere reposo por razones de salud por el término de ${certDays} día(s) a partir de la fecha.`
        );
      } else if (certType === 'asistencia') {
        setCertContent(
          `Hago constar que el/la paciente ${currentPatient.first_name} ${currentPatient.last_name}${currentPatient.dni ? `, DNI ${currentPatient.dni},` : ''} asistió a atención profesional en el día de la fecha en horario de consulta.`
        );
      } else {
        setCertContent(
          `Certifico que habiendo examinado a ${currentPatient.first_name} ${currentPatient.last_name}${currentPatient.dni ? `, DNI ${currentPatient.dni},` : ''}, se encuentra en condiciones clínicas aptas para la realización de actividades habituales o físicas moderadas.`
        );
      }
    }
  }, [certType, certDays, currentPatient]);

  // Handle Speech Recognition for any specific field
  const toggleSpeechDictation = (fieldKey: string, setter: React.Dispatch<React.SetStateAction<string>>) => {
    if (activeSpeechField === fieldKey) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setActiveSpeechField(null);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Tu navegador no soporta la API de dictado continuo directo. Puedes usar el módulo "Notas de Voz" con inteligencia artificial Gemini.');
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
        setter(prev => (prev ? prev + ' ' + text : text));
      };

      recognition.onerror = () => {
        setActiveSpeechField(null);
      };

      recognition.onend = () => {
        setActiveSpeechField(null);
      };

      recognition.start();
      recognitionRef.current = recognition;
      setActiveSpeechField(fieldKey);
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

    // Intelligently map into active template
    if (templateMode === 'dental') {
      if (data.transcription) {
        if (!treatmentPerformed) setTreatmentPerformed(data.transcription);
        else setTreatmentPerformed(prev => `${prev}\n\n[Audio]: ${data.transcription}`);
      }
      if (data.soap?.analysis && !soapAnalysis) {
        setSoapAnalysis(data.soap.analysis);
      }
      if (data.soap?.plan && !soapPlan) {
        setSoapPlan(data.soap.plan);
      }
    } else if (templateMode === 'generic') {
      if (data.transcription) {
        setClinicalEvolution(prev => prev ? `${prev}\n\n[Dictado de voz]: ${data.transcription}` : data.transcription);
      }
      if (data.soap?.analysis) setSoapAnalysis(data.soap.analysis);
      if (data.soap?.plan) setSoapPlan(data.soap.plan);
    } else {
      // SOAP mode
      if (data.soap) {
        if (data.soap.subjective) setSoapSubjective(prev => prev ? `${prev}\n\n[Dictado]: ${data.soap!.subjective}` : data.soap!.subjective);
        if (data.soap.objective) setSoapObjective(prev => prev ? `${prev}\n\n[Dictado]: ${data.soap!.objective}` : data.soap!.objective);
        if (data.soap.analysis) setSoapAnalysis(prev => prev ? `${prev}\n\n[Dictado]: ${data.soap!.analysis}` : data.soap!.analysis);
        if (data.soap.plan) setSoapPlan(prev => prev ? `${prev}\n\n[Dictado]: ${data.soap!.plan}` : data.soap!.plan);
      }
    }

    // Automatically add extracted prescriptions if any
    let addedCount = 0;
    if (data.prescriptions && data.prescriptions.length > 0) {
      const formattedItems: MedicalPrescriptionItem[] = data.prescriptions.map((p, idx) => ({
        id: `rx-ai-${Date.now()}-${idx}`,
        medication: p.medication,
        dosage: p.dosage,
        duration: p.duration,
        instructions: p.instructions
      }));
      setPrescriptions(prev => [...prev, ...formattedItems]);
      addedCount = formattedItems.length;
    }

    setVoiceNotification(
      `Audio procesado exitosamente con IA.${addedCount > 0 ? ` Se añadieron ${addedCount} medicamento(s) a la pestaña Recetas.` : ''}`
    );
    setTimeout(() => setVoiceNotification(null), 5000);

    // Switch to clinical tab to view updated content
    setActiveTab('clinical');
  };

  // AI Refinement action
  const handleRefineWithAI = async () => {
    let rawContent = '';
    if (templateMode === 'dental') {
      rawContent = `Pieza dental: ${dentalToothNumber}\nMotivo: ${reasonForVisit}\nDiagnóstico: ${soapAnalysis}\nProcedimiento realizado: ${treatmentPerformed}\nIndicaciones: ${soapPlan}`;
    } else if (templateMode === 'generic') {
      rawContent = `Motivo: ${reasonForVisit}\nEvolución clínica: ${clinicalEvolution}\nDiagnóstico: ${soapAnalysis}\nPlan: ${soapPlan}`;
    } else {
      rawContent = `Subjetivo: ${soapSubjective}\nObjetivo: ${soapObjective}\nAnálisis: ${soapAnalysis}\nPlan: ${soapPlan}`;
    }

    if (!rawContent.trim() || rawContent.length < 15) {
      alert('Por favor redacta o dicta algunas observaciones primero para que la IA pueda estructurarlas.');
      return;
    }

    setIsRefiningAI(true);
    try {
      const response = await fetch('/api/consultations/structure-soap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: rawContent,
          patientName: currentPatient ? `${currentPatient.first_name} ${currentPatient.last_name}` : 'Paciente',
          specialty: templateMode === 'dental' ? 'Odontología' : practiceSettings.specialty
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.soap) {
          if (templateMode === 'dental') {
            if (data.soap.objective) setTreatmentPerformed(data.soap.objective);
            if (data.soap.analysis) setSoapAnalysis(data.soap.analysis);
            if (data.soap.plan) setSoapPlan(data.soap.plan);
          } else if (templateMode === 'generic') {
            if (data.soap.subjective || data.soap.objective) {
              setClinicalEvolution(`${data.soap.subjective || ''} ${data.soap.objective || ''}`.trim());
            }
            if (data.soap.analysis) setSoapAnalysis(data.soap.analysis);
            if (data.soap.plan) setSoapPlan(data.soap.plan);
          } else {
            if (data.soap.subjective) setSoapSubjective(data.soap.subjective);
            if (data.soap.objective) setSoapObjective(data.soap.objective);
            if (data.soap.analysis) setSoapAnalysis(data.soap.analysis);
            if (data.soap.plan) setSoapPlan(data.soap.plan);
          }
        }
      }
    } catch (e) {
      console.error('Error refining consultation text:', e);
    } finally {
      setIsRefiningAI(false);
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

  const handleApplyPresetMedication = (preset: { medication: string; dosage: string; duration: string; instructions: string }) => {
    setNewMed(preset);
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
      diagnosis: soapAnalysis || reasonForVisit || 'Atención profesional programada',
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

    const payload: Omit<ConsultationRecord, 'id' | 'created_at'> = {
      patient_id: currentPatient.id,
      patient_name: `${currentPatient.first_name} ${currentPatient.last_name}`,
      appointment_id: appointmentId,
      date: new Date(date).toISOString(),
      reason_for_visit: reasonForVisit.trim(),
      consultation_type: templateMode,
      dental_tooth_number: dentalToothNumber.trim() || undefined,
      treatment_performed: treatmentPerformed.trim() || undefined,
      clinical_evolution: clinicalEvolution.trim() || undefined,
      vital_signs_enabled: vitalSignsEnabled,
      vital_signs: vitalSignsEnabled ? vitalSigns : undefined,
      soap_subjective: templateMode === 'generic' ? clinicalEvolution : soapSubjective.trim(),
      soap_objective: templateMode === 'dental' ? treatmentPerformed : soapObjective.trim(),
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

  // Preset Prescriptions for fast 1-click dental and medical workflows
  const DENTAL_PRESCRIPTION_PRESETS = [
    {
      medication: 'Amoxicilina 500 mg',
      dosage: '1 comprimido cada 8 horas',
      duration: 'Durante 7 días',
      instructions: 'Tomar con abundante agua después de las comidas.'
    },
    {
      medication: 'Amoxicilina + Ácido Clavulánico 875/125 mg',
      dosage: '1 comprimido cada 12 horas',
      duration: 'Durante 7 días completos',
      instructions: 'Tomar al inicio de las comidas principales para proteger el estómago.'
    },
    {
      medication: 'Ibuprofeno 600 mg',
      dosage: '1 comprimido cada 8 horas',
      duration: 'Por 3 a 5 días según dolor',
      instructions: 'Tomar preferentemente con alimentos o lácteos.'
    },
    {
      medication: 'Ketorolac 10 mg Sublingual',
      dosage: '1 comprimido sublingual cada 8 horas',
      duration: 'Máximo 3 días consecutivos',
      instructions: 'Disolver debajo de la lengua ante dolor agudo moderado a severo.'
    },
    {
      medication: 'Clorhexidina 0.12% Colutorio Bucal',
      dosage: 'Enjuague bucal de 15 ml durante 60 segundos cada 12 hs',
      duration: 'Durante 7 días',
      instructions: 'No enjuagar con agua ni ingerir bebidas/alimentos durante 30 minutos posteriores.'
    },
    {
      medication: 'Paracetamol 500 mg',
      dosage: '1 comprimido cada 8 horas',
      duration: 'Por 3 días según molestias',
      instructions: 'Apto para pacientes con intolerancia o contraindicación a los AINEs.'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-4 max-h-[94vh] flex flex-col">
        
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-600/30 border border-sky-400/40 text-sky-400 flex items-center justify-center">
              {templateMode === 'dental' ? (
                <Smile className="w-5 h-5 text-sky-400" />
              ) : templateMode === 'psychology' ? (
                <Brain className="w-5 h-5 text-indigo-400" />
              ) : (
                <FileText className="w-5 h-5 text-sky-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-white">
                  {consultation ? 'Ficha de Evolución Clínica' : 'Nueva Consulta / Ficha Clínica'}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-500/20 text-sky-300 border border-sky-400/30">
                  {templateMode === 'dental'
                    ? '🦷 Plantilla Odontológica'
                    : templateMode === 'generic'
                    ? '📋 Evolución Libre'
                    : templateMode === 'soap'
                    ? '🩺 Método SOAP'
                    : '🧠 Salud Mental'}
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

        {/* Specialty / Template Mode Selector Bar */}
        <div className="bg-slate-800 text-slate-300 px-6 py-2.5 border-b border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Especialidad / Plantilla:</span>
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-700">
              <button
                type="button"
                onClick={() => setTemplateMode('dental')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition flex items-center gap-1 ${
                  templateMode === 'dental'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span>🦷</span>
                <span>Odontología</span>
              </button>

              <button
                type="button"
                onClick={() => setTemplateMode('generic')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition flex items-center gap-1 ${
                  templateMode === 'generic'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span>📋</span>
                <span>Evolución Libre</span>
              </button>

              <button
                type="button"
                onClick={() => setTemplateMode('soap')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition flex items-center gap-1 ${
                  templateMode === 'soap'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span>🩺</span>
                <span>SOAP Médico</span>
              </button>

              <button
                type="button"
                onClick={() => setTemplateMode('psychology')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition flex items-center gap-1 ${
                  templateMode === 'psychology'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span>🧠</span>
                <span>Psicología</span>
              </button>
            </div>
          </div>

          {/* Optional Vital Signs Switch */}
          <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300 hover:text-white">
            <input
              type="checkbox"
              checked={vitalSignsEnabled}
              onChange={(e) => setVitalSignsEnabled(e.target.checked)}
              className="w-4 h-4 rounded border-slate-600 text-sky-600 focus:ring-sky-500 bg-slate-900"
            />
            <span className="text-[11px] font-medium">
              Registrar Signos Vitales (Presión, Pulso, Peso - Opcional)
            </span>
          </label>
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

            {/* Consultation Date */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Fecha de Atención
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
                  Sin alergias reportadas
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
              placeholder={
                templateMode === 'dental'
                  ? 'Motivo de consulta (ej. Control periódico, dolor al masticar en molar, profilaxis, fractura de cúspide)...'
                  : 'Motivo de consulta principal (ej. Chequeo anual, dolor agudo, seguimiento)...'
              }
              className="w-full text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-lg px-3 py-1.5 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-white px-6 gap-6 text-xs font-semibold text-slate-600 flex-shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('clinical')}
            className={`py-3 flex items-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'clinical'
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            {templateMode === 'dental'
              ? 'Ficha Odontológica'
              : templateMode === 'soap'
              ? 'Evolución SOAP'
              : 'Evolución Clínica'}
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
            Notas de Voz & Grabación IA
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
          
          {/* Notification Toast if Voice Audio was Processed */}
          {voiceNotification && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{voiceNotification}</span>
              </div>
              <button
                type="button"
                onClick={() => setVoiceNotification(null)}
                className="text-emerald-600 hover:text-emerald-800 text-xs font-semibold"
              >
                Cerrar
              </button>
            </div>
          )}

          {/* TAB 1: Clinical Evolution (Adapts to Active Template Mode) */}
          {activeTab === 'clinical' && (
            <div className="space-y-6">
              
              {/* Voice Note Banner Callout if no audio recorded yet */}
              {voiceNotes.length === 0 && (
                <div className="p-3.5 bg-gradient-to-r from-sky-50 to-indigo-50 border border-sky-200 rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center flex-shrink-0">
                      <Mic className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">¿Deseas dictar la atención por voz?</h4>
                      <p className="text-[11px] text-slate-600">
                        Graba una nota de voz y Gemini transcribirá los hallazgos y agregará automáticamente las recetas médicas detectadas.
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

              {/* Optional Vital Signs (Only shown when enabled) */}
              {vitalSignsEnabled && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Heart className="w-4 h-4 text-rose-500" />
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Signos Vitales y Parámetros Clínicos (Opcional)
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setVitalSignsEnabled(false)}
                      className="text-[11px] text-slate-400 hover:text-rose-600"
                    >
                      Ocultar parámetros
                    </button>
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
              )}

              {/* AI Helper Button */}
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <span>Registro Clínico</span>
                  <span className="text-slate-400 font-normal">({templateMode === 'dental' ? 'Odontológico' : templateMode})</span>
                </h3>

                <button
                  type="button"
                  onClick={handleRefineWithAI}
                  disabled={isRefiningAI}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  {isRefiningAI ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Optimizando con IA...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      Mejorar redacción con Gemini IA
                    </>
                  )}
                </button>
              </div>

              {/* ---------------------------------------------------- */}
              {/* TEMPLATE A: ODONTOLOGÍA & SALUD DENTAL */}
              {/* ---------------------------------------------------- */}
              {templateMode === 'dental' && (
                <div className="space-y-4">
                  {/* Pieza o Sector Dental */}
                  <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <span className="text-sky-600">🦷</span>
                        Pieza(s) Dental(es) o Sector Bucal a Tratar
                      </label>
                      <span className="text-[11px] text-slate-400">Selección rápida o escribe la pieza</span>
                    </div>

                    <input
                      type="text"
                      value={dentalToothNumber}
                      onChange={(e) => setDentalToothNumber(e.target.value)}
                      placeholder="ej. Pieza 3.6, Sector 1.1 a 2.1, Boca completa..."
                      className="w-full text-xs font-semibold text-slate-900 border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-sky-500"
                    />

                    {/* Fast Dental Tooth Chips */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {[
                        'Pieza 1.6',
                        'Pieza 2.6',
                        'Pieza 3.6',
                        'Pieza 4.6',
                        'Pieza 1.1',
                        'Pieza 2.1',
                        'Sector Anterosuperior',
                        'Sector Anteroinferior',
                        'Arcada Superior',
                        'Arcada Inferior',
                        'Boca Completa'
                      ].map(chip => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => setDentalToothNumber(prev => prev ? `${prev}, ${chip}` : chip)}
                          className="px-2 py-0.5 bg-slate-100 hover:bg-sky-50 hover:text-sky-700 text-slate-600 rounded text-[11px] font-medium transition"
                        >
                          + {chip}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Diagnóstico Bucodental */}
                  <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                          Dx
                        </span>
                        Diagnóstico Bucodental
                      </label>
                      <button
                        type="button"
                        onClick={() => toggleSpeechDictation('analysis', setSoapAnalysis)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded transition ${
                          activeSpeechField === 'analysis' ? 'bg-rose-100 text-rose-700 animate-pulse' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        <Mic className="w-3 h-3 text-rose-600" />
                        {activeSpeechField === 'analysis' ? 'Dictando...' : 'Dictar'}
                      </button>
                    </div>

                    <input
                      type="text"
                      value={soapAnalysis}
                      onChange={(e) => setSoapAnalysis(e.target.value)}
                      placeholder="ej. Caries oclusal profunda, Pulpitis irreversible, Gingivitis marginal, Periodontitis..."
                      className="w-full text-xs text-slate-800 border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-sky-500"
                    />

                    {/* Dental Diagnosis Suggestion Chips */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {[
                        'Caries dental activa',
                        'Pulpitis sintomática',
                        'Gingivitis por placa bacteriana',
                        'Periodontitis crónica',
                        'Fractura dental coronaria',
                        'Bruxismo / Desgaste oclusal',
                        'Necrosis pulpar'
                      ].map(diag => (
                        <button
                          key={diag}
                          type="button"
                          onClick={() => setSoapAnalysis(diag)}
                          className="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded text-[11px] font-medium transition"
                        >
                          {diag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Procedimiento Realizado */}
                  <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded bg-sky-100 text-sky-800 flex items-center justify-center font-bold text-xs">
                          Rx
                        </span>
                        Procedimiento Odontológico Realizado en Consulta
                      </label>
                      <button
                        type="button"
                        onClick={() => toggleSpeechDictation('treatment', setTreatmentPerformed)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded transition ${
                          activeSpeechField === 'treatment' ? 'bg-rose-100 text-rose-700 animate-pulse' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        <Mic className="w-3 h-3 text-rose-600" />
                        {activeSpeechField === 'treatment' ? 'Dictando...' : 'Dictar'}
                      </button>
                    </div>

                    <textarea
                      rows={3}
                      value={treatmentPerformed}
                      onChange={(e) => setTreatmentPerformed(e.target.value)}
                      placeholder="Detalle del procedimiento: anestesia, aislamiento, instrumental utilizado, materiales (resina, sellador, ionómero), medicación intra-conducto..."
                      className="w-full text-xs text-slate-800 border border-slate-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-sky-500 placeholder-slate-400"
                    />

                    {/* Common Dental Procedure Quick Chips */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {[
                        'Destartraje y profilaxis ultrasonido',
                        'Obturación estética resina compuesta',
                        'Apertura cameral y pulpectomía',
                        'Endodoncia mecanizada',
                        'Extracción simple con anestesia',
                        'Control y ajuste de ortodoncia',
                        'Cementado de provisorio'
                      ].map(proc => (
                        <button
                          key={proc}
                          type="button"
                          onClick={() => setTreatmentPerformed(prev => prev ? `${prev}. ${proc}` : proc)}
                          className="px-2 py-0.5 bg-sky-50 hover:bg-sky-100 text-sky-800 rounded text-[11px] font-medium transition"
                        >
                          + {proc}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Indicaciones Post-Atención y Próximo Control */}
                  <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                          Pl
                        </span>
                        Indicaciones Post-Atención y Próxima Cita
                      </label>
                      <button
                        type="button"
                        onClick={() => toggleSpeechDictation('plan', setSoapPlan)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded transition ${
                          activeSpeechField === 'plan' ? 'bg-rose-100 text-rose-700 animate-pulse' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        <Mic className="w-3 h-3 text-rose-600" />
                        {activeSpeechField === 'plan' ? 'Dictando...' : 'Dictar'}
                      </button>
                    </div>

                    <textarea
                      rows={2}
                      value={soapPlan}
                      onChange={(e) => setSoapPlan(e.target.value)}
                      placeholder="Pautas de cuidado (dieta blanda, no masticar de ese lado, higiene con cerdas suaves), pautas de alarma y fecha del próximo turno..."
                      className="w-full text-xs text-slate-800 border border-slate-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-sky-500 placeholder-slate-400"
                    />

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {[
                        'Dieta blanda y fría por 24 hs',
                        'Evitar masticar sobre la pieza tratada',
                        'Higiene bucal suave sin tocar la zona',
                        'Colutorio con clorhexidina 0.12%',
                        'Próximo control en 7 días',
                        'Control periódico en 6 meses'
                      ].map(ind => (
                        <button
                          key={ind}
                          type="button"
                          onClick={() => setSoapPlan(prev => prev ? `${prev}. ${ind}` : ind)}
                          className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded text-[11px] font-medium transition"
                        >
                          + {ind}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ---------------------------------------------------- */}
              {/* TEMPLATE B: EVOLUCIÓN LIBRE / CONSULTA GENERAL */}
              {/* ---------------------------------------------------- */}
              {templateMode === 'generic' && (
                <div className="space-y-4">
                  {/* Evolución Clínica y Observaciones */}
                  <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800">
                        Observaciones Clínicas / Evolución en Sesión
                      </label>
                      <button
                        type="button"
                        onClick={() => toggleSpeechDictation('clinicalEvolution', setClinicalEvolution)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition ${
                          activeSpeechField === 'clinicalEvolution' ? 'bg-rose-100 text-rose-700 animate-pulse' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        <Mic className="w-3 h-3 text-rose-600" />
                        {activeSpeechField === 'clinicalEvolution' ? 'Dictando...' : 'Dictar por voz'}
                      </button>
                    </div>
                    <textarea
                      rows={4}
                      value={clinicalEvolution}
                      onChange={(e) => setClinicalEvolution(e.target.value)}
                      placeholder="Describe la evolución del paciente, estado actual, hallazgos observados, maniobras o procedimientos realizados..."
                      className="w-full text-xs text-slate-800 border border-slate-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-sky-500 placeholder-slate-400"
                    />
                  </div>

                  {/* Diagnóstico */}
                  <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-2">
                    <label className="text-xs font-bold text-slate-800">Diagnóstico / Conclusión</label>
                    <input
                      type="text"
                      value={soapAnalysis}
                      onChange={(e) => setSoapAnalysis(e.target.value)}
                      placeholder="Diagnóstico clínico, juicio profesional o estado del caso..."
                      className="w-full text-xs text-slate-800 border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  {/* Plan / Indicaciones */}
                  <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-2">
                    <label className="text-xs font-bold text-slate-800">Plan Terapéutico e Indicaciones</label>
                    <textarea
                      rows={3}
                      value={soapPlan}
                      onChange={(e) => setSoapPlan(e.target.value)}
                      placeholder="Pautas a seguir por el paciente, medicación, fecha de próxima consulta o estudios solicitados..."
                      className="w-full text-xs text-slate-800 border border-slate-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-sky-500 placeholder-slate-400"
                    />
                  </div>
                </div>
              )}

              {/* ---------------------------------------------------- */}
              {/* TEMPLATE C: MÉTODO SOAP TRADICIONAL */}
              {/* ---------------------------------------------------- */}
              {templateMode === 'soap' && (
                <div className="space-y-4">
                  {/* S - Subjetivo */}
                  <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded bg-sky-100 text-sky-800 font-bold font-mono text-xs flex items-center justify-center">
                          S
                        </span>
                        <label className="text-xs font-bold text-slate-800">
                          Subjetivo (Anamnesis, síntomas referidos y dolor)
                        </label>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleSpeechDictation('subjective', setSoapSubjective)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition ${
                          activeSpeechField === 'subjective' ? 'bg-rose-100 text-rose-700 animate-pulse' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <Mic className="w-3 h-3 text-rose-600" />
                        {activeSpeechField === 'subjective' ? 'Dictando...' : 'Dictar'}
                      </button>
                    </div>
                    <textarea
                      rows={3}
                      value={soapSubjective}
                      onChange={(e) => setSoapSubjective(e.target.value)}
                      placeholder="Qué refiere el paciente: síntomas, dolor, localización, tiempo de evolución, antecedentes..."
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
                        onClick={() => toggleSpeechDictation('objective', setSoapObjective)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition ${
                          activeSpeechField === 'objective' ? 'bg-rose-100 text-rose-700 animate-pulse' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <Mic className="w-3 h-3 text-rose-600" />
                        {activeSpeechField === 'objective' ? 'Dictando...' : 'Dictar'}
                      </button>
                    </div>
                    <textarea
                      rows={3}
                      value={soapObjective}
                      onChange={(e) => setSoapObjective(e.target.value)}
                      placeholder="Hallazgos observados en examen regional, inspección, palpación, pruebas diagnósticas..."
                      className="w-full text-xs text-slate-800 border border-slate-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-sky-500 placeholder-slate-400"
                    />
                  </div>

                  {/* A - Análisis */}
                  <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded bg-amber-100 text-amber-800 font-bold font-mono text-xs flex items-center justify-center">
                          A
                        </span>
                        <label className="text-xs font-bold text-slate-800">
                          Análisis (Diagnóstico / Juicio facultativo)
                        </label>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleSpeechDictation('analysis', setSoapAnalysis)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition ${
                          activeSpeechField === 'analysis' ? 'bg-rose-100 text-rose-700 animate-pulse' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <Mic className="w-3 h-3 text-rose-600" />
                        {activeSpeechField === 'analysis' ? 'Dictando...' : 'Dictar'}
                      </button>
                    </div>
                    <textarea
                      rows={2}
                      value={soapAnalysis}
                      onChange={(e) => setSoapAnalysis(e.target.value)}
                      placeholder="Diagnóstico presuntivo o de certeza..."
                      className="w-full text-xs text-slate-800 border border-slate-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-sky-500 placeholder-slate-400"
                    />
                  </div>

                  {/* P - Plan */}
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
                        onClick={() => toggleSpeechDictation('plan', setSoapPlan)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition ${
                          activeSpeechField === 'plan' ? 'bg-rose-100 text-rose-700 animate-pulse' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <Mic className="w-3 h-3 text-rose-600" />
                        {activeSpeechField === 'plan' ? 'Dictando...' : 'Dictar'}
                      </button>
                    </div>
                    <textarea
                      rows={3}
                      value={soapPlan}
                      onChange={(e) => setSoapPlan(e.target.value)}
                      placeholder="Procedimientos realizados hoy, pautas terapéuticas, medicación prescrita, próxima cita..."
                      className="w-full text-xs text-slate-800 border border-slate-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-sky-500 placeholder-slate-400"
                    />
                  </div>
                </div>
              )}

              {/* ---------------------------------------------------- */}
              {/* TEMPLATE D: SALUD MENTAL / PSICOLOGÍA */}
              {/* ---------------------------------------------------- */}
              {templateMode === 'psychology' && (
                <div className="space-y-4">
                  <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-2">
                    <label className="text-xs font-bold text-slate-800">
                      Temas Abordados & Dinámica de la Sesión
                    </label>
                    <textarea
                      rows={3}
                      value={clinicalEvolution}
                      onChange={(e) => setClinicalEvolution(e.target.value)}
                      placeholder="Aspectos tratados, discursos emergentes, vínculos familiares o laborales trabajados..."
                      className="w-full text-xs text-slate-800 border border-slate-200 rounded-lg p-3 focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-2">
                    <label className="text-xs font-bold text-slate-800">
                      Observaciones Clínicas & Estado Anímico
                    </label>
                    <textarea
                      rows={2}
                      value={soapObjective}
                      onChange={(e) => setSoapObjective(e.target.value)}
                      placeholder="Afecto, juicio de realidad, angustia manifiesta, lenguaje, predisposición al trabajo analítico..."
                      className="w-full text-xs text-slate-800 border border-slate-200 rounded-lg p-3 focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-2">
                    <label className="text-xs font-bold text-slate-800">
                      Pautas, Intervenciones y Próxima Sesión
                    </label>
                    <textarea
                      rows={2}
                      value={soapPlan}
                      onChange={(e) => setSoapPlan(e.target.value)}
                      placeholder="Pautas reflexivas acordadas, tareas conductuales, frecuencia de sesiones..."
                      className="w-full text-xs text-slate-800 border border-slate-200 rounded-lg p-3 focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Voice Notes & Recording Hub */}
          {activeTab === 'voice' && (
            <div className="space-y-6">
              <VoiceNoteRecorder
                patientName={currentPatient ? `${currentPatient.first_name} ${currentPatient.last_name}` : 'Paciente'}
                specialty={templateMode === 'dental' ? 'Odontología' : practiceSettings.specialty}
                onTranscriptionComplete={handleVoiceNoteProcessed}
              />

              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Mic className="w-4 h-4 text-sky-600" />
                  Audios Guardados en esta Consulta ({voiceNotes.length})
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
                                Transcrito con Gemini IA
                              </span>
                            )}
                          </div>
                        </div>

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
              {/* Quick Presets for Current Specialty */}
              <div className="p-4 bg-sky-50/50 border border-sky-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-sky-900 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    Medicamentos Frecuentes (Carga Rápida en 1 Clic)
                  </h4>
                  <span className="text-[11px] text-sky-700">Haz clic en un fármaco para precargar sus dosis habituales</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {DENTAL_PRESCRIPTION_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplyPresetMedication(preset)}
                      className="px-2.5 py-1 bg-white hover:bg-sky-600 hover:text-white border border-sky-200 rounded-lg text-xs font-semibold text-slate-700 shadow-2xs transition active:scale-95"
                    >
                      + {preset.medication}
                    </button>
                  ))}
                </div>
              </div>

              {/* Add New Prescription Row */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Plus className="w-4 h-4 text-sky-600" />
                  Agregar Medicamento a la Receta Digital
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
                    Medicamentos en la Receta ({prescriptions.length})
                  </h4>

                  {prescriptions.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowPrescriptionModal(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Emitir Receta Oficial / Imprimir / WhatsApp
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
                    <h5 className="text-xs font-bold text-emerald-900">Emitir Nuevo Certificado / Constancia</h5>
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
                        <option value="reposo">Reposo Laboral / Escolar</option>
                        <option value="asistencia">Constancia de Atención y Asistencia</option>
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
                      />
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
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs"
                    >
                      Guardar Certificado
                    </button>
                  </div>
                </div>
              )}

              {/* Certificates List */}
              <div className="space-y-3">
                {certificates.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-xs text-slate-500">
                    No se han emitido certificados para esta consulta aún.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {certificates.map((cert) => (
                      <div key={cert.id} className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs flex items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-900">
                              {cert.type === 'reposo'
                                ? `Reposo Laboral (${cert.rest_days} días)`
                                : cert.type === 'asistencia'
                                ? 'Constancia de Asistencia'
                                : 'Aptitud Física'}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500">Nº {cert.certificate_number}</span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1 line-clamp-2">"{cert.content}"</p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setActiveCertToPrint(cert)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold rounded-lg flex-shrink-0"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Imprimir / WhatsApp
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Sticky Bar */}
        <div className="bg-slate-100 border-t border-slate-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span>Plantilla activa:</span>
            <strong className="text-slate-800 uppercase font-semibold">
              {templateMode === 'dental' ? 'Odontología' : templateMode === 'generic' ? 'Evolución Libre' : templateMode}
            </strong>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              id="btn-save-consultation-bottom"
              onClick={handleSaveConsultation}
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-sky-600 hover:bg-sky-500 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition"
            >
              <Save className="w-4 h-4" />
              Guardar Historia Clínica
            </button>
          </div>
        </div>
      </div>

      {/* Official Prescription Print / WhatsApp Modal */}
      {showPrescriptionModal && currentPatient && (
        <PrescriptionPrintModal
          prescription={{
            id: `rx-modal-${Date.now()}`,
            prescription_number: `RX-2026-${Math.floor(1000 + Math.random() * 9000)}`,
            patient_id: currentPatient.id,
            patient_name: `${currentPatient.first_name} ${currentPatient.last_name}`,
            patient_dni: currentPatient.dni,
            patient_phone: currentPatient.phone,
            patient_insurance: currentPatient.insurance_company,
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

      {/* Official Certificate Print / WhatsApp Modal */}
      {activeCertToPrint && (
        <CertificatePrintModal
          certificate={activeCertToPrint}
          practiceSettings={practiceSettings}
          patientPhone={currentPatient?.phone}
          onClose={() => setActiveCertToPrint(null)}
        />
      )}
    </div>
  );
};
