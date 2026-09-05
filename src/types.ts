export type AppointmentStatus = 'confirmed' | 'pending' | 'completed' | 'cancelled' | 'no_show';

export type PaymentStatus = 'pending' | 'paid' | 'partial' | 'refunded';

export interface Service {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
  description?: string;
  color?: string;
  active: boolean;
  category?: string;
}

export interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email?: string;
  dni?: string;
  birth_date?: string;
  notes?: string;
  tags?: string[];
  allergies?: string[];
  blood_type?: string;
  insurance_company?: string;
  insurance_number?: string;
  emergency_contact?: {
    name: string;
    phone: string;
    relation: string;
  };
  total_appointments?: number;
  created_at: string;
}

export interface Appointment {
  id: string;
  patient_id: string;
  patient_name: string;
  patient_phone: string;
  patient_email?: string;
  service_id: string;
  service_name: string;
  service_price: number;
  start_datetime: string; // ISO 8601
  end_datetime: string;   // ISO 8601
  status: AppointmentStatus;
  payment_status: PaymentStatus;
  notes?: string;
  origin: 'public_booking' | 'bot_whatsapp' | 'manual' | 'telemedicine';
  meet_url?: string;
  is_demo?: boolean;
  reminder_24h_sent?: boolean;
  reminder_24h_sent_at?: string;
  reminder_2h_sent?: boolean;
  reminder_2h_sent_at?: string;
  email_reminder_sent?: boolean;
  email_reminder_sent_at?: string;
  patient_confirmed?: boolean;
  patient_confirmed_at?: string;
}

export interface DayAvailability {
  day_of_week: number; // 0 = Domingo, 1 = Lunes, ... 6 = Sábado
  enabled: boolean;
  start_time: string; // "09:00"
  end_time: string;   // "18:00"
  break_start?: string; // "13:00"
  break_end?: string;   // "14:00"
}

export interface PracticeSettings {
  practice_name: string;
  handle: string; // p. ej. "consultorio-dr-corat"
  professional_name: string;
  professional_title: string; // p. ej. "Odontólogo Especialista"
  medical_license?: string; // p. ej. "M.N. 142.890 / M.P. 45.210"
  specialty: string;
  phone: string;
  whatsapp_number: string;
  email: string;
  address: string;
  city: string;
  currency: string; // "ARS", "USD", etc.
  bot_assistant_name: string;
  bot_tone: string;
  bot_enabled: boolean;
  page_color: string;
  welcome_message: string;
  auto_confirm_bookings: boolean;
  allow_telemedicine: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  status?: 'sent' | 'delivered' | 'read';
  actionTaken?: {
    type: 'appointment_created';
    appointmentId: string;
    details: string;
  };
}

export interface Conversation {
  id: string;
  patient_name: string;
  patient_phone: string;
  patient_avatar?: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  ai_handled: boolean;
  messages: ChatMessage[];
}

export type WaitlistPriority = 'urgent' | 'high' | 'normal';
export type WaitlistStatus = 'waiting' | 'notified' | 'scheduled' | 'cancelled';

export interface WaitlistEntry {
  id: string;
  patient_id?: string;
  patient_name: string;
  patient_phone: string;
  patient_email?: string;
  service_id?: string;
  service_name?: string;
  preferred_days?: string[]; // e.g. ["Lunes", "Miércoles", "Cualquiera"]
  preferred_time_range?: 'morning' | 'afternoon' | 'any';
  priority: WaitlistPriority;
  status: WaitlistStatus;
  notes?: string;
  created_at: string;
  notified_at?: string;
}

export interface ReminderConfig {
  whatsapp_enabled: boolean;
  email_enabled: boolean;
  send_24h_before: boolean;
  send_2h_before: boolean;
  require_confirmation: boolean;
  auto_update_status_on_confirm: boolean;
  sender_email_alias: string;
  whatsapp_template_24h: string;
  whatsapp_template_2h: string;
  email_subject_24h: string;
  email_body_24h: string;
  email_subject_2h: string;
  email_body_2h: string;
}

export interface ReminderLog {
  id: string;
  appointment_id: string;
  patient_name: string;
  patient_phone: string;
  patient_email?: string;
  channel: 'whatsapp' | 'email';
  timing: '24h' | '2h' | 'manual';
  status: 'sent' | 'delivered' | 'failed' | 'scheduled';
  sent_at: string;
  appointment_datetime: string;
  service_name: string;
  message_preview: string;
  confirmed?: boolean;
}

export type PaymentMethod = 'cash' | 'transfer' | 'card_debit' | 'card_credit' | 'mercado_pago' | 'insurance';

export interface PaymentRecord {
  id: string;
  receipt_number: string;
  appointment_id?: string;
  patient_id: string;
  patient_name: string;
  patient_phone?: string;
  patient_dni?: string;
  amount: number;
  method: PaymentMethod;
  concept: string;
  service_name?: string;
  date: string;
  notes?: string;
  insurance_provider?: string;
  copay_amount?: number;
  status: 'completed' | 'voided';
}

export interface CashRegister {
  id: string;
  date: string;
  status: 'open' | 'closed';
  opening_cash: number;
  closing_cash?: number;
  opened_at: string;
  closed_at?: string;
  notes?: string;
}

export interface CashMovement {
  id: string;
  type: 'income' | 'expense';
  category: 'payment' | 'withdrawal' | 'supplies' | 'opening' | 'other';
  amount: number;
  concept: string;
  method: PaymentMethod;
  created_at: string;
  registered_by?: string;
  notes?: string;
}

export interface VoiceNote {
  id: string;
  audio_url: string; // Blob URL or base64 data URL
  duration_seconds: number;
  recorded_at: string;
  title?: string;
  transcription?: string;
  transcription_status?: 'ready' | 'transcribing' | 'failed';
  ai_summary?: string;
}

export interface MedicalPrescriptionItem {
  id: string;
  medication: string; // e.g. "Amoxicilina 500mg"
  dosage: string;     // e.g. "1 comprimido cada 8 hs"
  duration: string;   // e.g. "Durante 7 días"
  instructions?: string; // e.g. "Tomar con abundante agua después de las comidas"
}

export interface MedicalPrescription {
  id: string;
  prescription_number: string;
  patient_id: string;
  patient_name: string;
  patient_dni?: string;
  patient_phone?: string;
  patient_insurance?: string;
  items: MedicalPrescriptionItem[];
  diagnosis?: string;
  professional_name: string;
  medical_license?: string;
  notes?: string;
  date: string;
  status: 'active' | 'dispensed';
}

export interface MedicalCertificate {
  id: string;
  certificate_number: string;
  patient_id: string;
  patient_name: string;
  patient_dni?: string;
  type: 'reposo' | 'asistencia' | 'aptitud_fisica' | 'alta';
  presented_to?: string; // e.g. "A las autoridades de la empresa" / "A quien corresponda"
  diagnosis?: string;
  rest_days?: number;
  start_date: string;
  end_date?: string;
  content: string;
  professional_name: string;
  medical_license?: string;
  date: string;
}

export interface VitalSigns {
  blood_pressure?: string; // e.g. "120/80"
  heart_rate?: string;     // e.g. "72 bpm"
  temperature?: string;    // e.g. "36.6 °C"
  weight_kg?: string;      // e.g. "70.5"
  height_cm?: string;      // e.g. "175"
  blood_glucose?: string;  // e.g. "95 mg/dL"
  oxygen_sat?: string;     // e.g. "98%"
}

export interface ConsultationRecord {
  id: string;
  patient_id: string;
  patient_name: string;
  appointment_id?: string;
  service_name?: string;
  date: string;
  reason_for_visit: string; // Motivo de consulta principal
  vital_signs?: VitalSigns;
  // SOAP Medical Evolution
  soap_subjective: string; // Subjetivo: Síntomas referidos, antecedentes recientes, dolor
  soap_objective: string;  // Objetivo: Hallazgos clínicos, examen físico, estudios
  soap_analysis: string;   // Análisis: Diagnóstico presuntivo o definitivo (CIE-10)
  soap_plan: string;       // Plan: Tratamiento, pautas de alarma, próxima cita
  // Multimodal & Voice attachments
  voice_notes: VoiceNote[];
  prescriptions?: MedicalPrescriptionItem[];
  certificates?: MedicalCertificate[];
  attachments?: {
    id: string;
    name: string;
    type: 'study' | 'lab' | 'photo' | 'document';
    url: string;
    date: string;
  }[];
  professional_name: string;
  medical_license?: string;
  created_at: string;
  updated_at?: string;
}

