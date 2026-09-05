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
  insurance_provider?: string;
  insurance_number?: string;
  emergency_contact?: {
    name: string;
    phone: string;
    relation: string;
  };
  total_appointments?: number;
  created_at: string;
}

export interface BookingRequiredFields {
  full_name: boolean; // default: true (fixed/required)
  phone: boolean;     // default: true (fixed/required)
  dni: boolean;       // default: false (optional toggle)
  email: boolean;     // default: false (optional toggle)
  insurance: boolean; // default: false (optional toggle: Obra Social o Cobertura)
  reason: boolean;    // default: false (optional toggle: Motivo de consulta)
  address?: boolean;  // default: false (optional toggle: Domicilio)
}

export interface Appointment {
  id: string;
  patient_id: string;
  patient_name: string;
  patient_phone: string;
  patient_email?: string;
  patient_dni?: string;
  patient_insurance?: string;
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
  handle: string; // p. ej. "consultorio-medico"
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
  // Subscription and payments
  subscription_plan?: 'trial' | 'basic' | 'pro';
  subscription_billing_cycle?: 'monthly' | 'annual';
  trial_active?: boolean;
  trial_started_at?: string;
  trial_days_left?: number;
  whatsapp_connected?: boolean;
  whatsapp_session_phone?: string;
  onboarding_completed_steps?: string[];
  mercadopago_public_key?: string;
  mercadopago_access_token?: string;
  mercadopago_webhook_secret?: string;
  mercadopago_deposit_enabled?: boolean;
  mercadopago_deposit_percent?: number;
  // Professional's deposit payment setup for their patients (No API keys needed for doctors)
  patient_deposit_enabled?: boolean;
  patient_deposit_percent?: number;
  patient_deposit_method?: 'alias_cbu' | 'mercadopago_connect' | 'mercadopago_link';
  patient_deposit_alias?: string;
  patient_deposit_cbu?: string;
  patient_deposit_bank_name?: string;
  patient_deposit_account_holder?: string;
  patient_deposit_cuit?: string;
  patient_deposit_mp_link?: string;
  patient_deposit_mp_connected?: boolean;
  patient_deposit_mp_email?: string;
  // Evolution API (WhatsApp infrastructure - Superadmin only)
  evolution_api_url?: string;
  evolution_api_key?: string;
  evolution_instance_name?: string;
  evolution_auto_connect?: boolean;
  // Email Transaccional / Recordatorios (Superadmin only)
  email_provider?: 'resend' | 'smtp';
  email_resend_api_key?: string;
  email_sender_address?: string;
  email_sender_name?: string;
  email_smtp_host?: string;
  email_smtp_port?: number;
  email_smtp_user?: string;
  email_smtp_pass?: string;
  email_reminders_active?: boolean;
  // Public Page Customization (Theme, Profile Photo, Shapes & Alignment)
  public_profile_photo_url?: string;
  public_profile_photo_shape?: 'square' | 'rounded-smooth' | 'rounded-full';
  public_profile_photo_align?: 'left' | 'center' | 'right';
  public_theme_preset?: 'minimal-slate' | 'medical-teal' | 'warm-oat' | 'nordic-blue' | 'dark-carbon';
  public_card_border_style?: 'square' | 'rounded-smooth' | 'rounded-xl' | 'pill';
  public_badge_text?: string;
  public_bio?: string;
  public_show_reviews?: boolean;
  public_custom_accent?: string;
  // Browser Notifications (Alerts for Bot Bookings & Patient Confirmations)
  notify_browser_enabled?: boolean;
  notify_bot_bookings?: boolean;
  notify_patient_confirmations?: boolean;
  notify_sound_enabled?: boolean;
  // Configurable Required Fields for Booking & Bot
  booking_required_fields?: BookingRequiredFields;
  bot_required_fields?: BookingRequiredFields;
}

export interface AppNotification {
  id: string;
  type: 'bot_booking' | 'patient_confirm' | 'public_booking' | 'test';
  title: string;
  message: string;
  appointment_id?: string;
  patient_name: string;
  service_name?: string;
  datetime?: string;
  created_at: string;
  read: boolean;
}

export interface SaasTenantUser {
  id: string;
  practice_name: string;
  doctor_name: string;
  email: string;
  phone: string;
  plan: 'trial' | 'basic' | 'pro';
  billing_cycle?: 'monthly' | 'annual';
  status: 'active' | 'trial' | 'past_due' | 'cancelled';
  subscription_started_at?: string;
  next_billing_date?: string;
  amount_monthly_ars?: number;
  payment_method?: 'mercadopago' | 'transfer';
  last_payment_date?: string;
  last_payment_amount?: number;
  total_paid_ars?: number;
  appointments_count?: number;
  whatsapp_status?: 'connected' | 'disconnected';
  // Trial & Super Admin access controls
  trial_days_left?: number;
  trial_active?: boolean;
  is_permanent?: boolean;
  access_expires_at?: string | null;
  created_at?: string;
  last_active_at?: string;
}

export type UserRole = 'superadmin' | 'professional' | 'assistant';

export interface UserSession {
  uid?: string;
  email: string;
  name: string;
  role: UserRole;
  isSuperAdmin: boolean;
  photoURL?: string;
  plan?: 'trial' | 'basic' | 'pro';
}

export type SubscriptionPlanId = 'trial' | 'basic' | 'pro';
export type BillingCycle = 'monthly' | 'annual';
export type CurrencyCode = 'ARS' | 'USD';

export interface SubscriptionPlanDef {
  id: SubscriptionPlanId;
  name: string;
  badge?: string;
  tagline: string;
  priceMonthARS: number;
  priceAnnualARS: number;
  priceMonthUSD: number;
  priceAnnualUSD: number;
  popular?: boolean;
  features: {
    text: string;
    included: boolean;
    highlight?: boolean;
  }[];
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
  // Specialty & Customization
  consultation_type?: 'dental' | 'generic' | 'soap' | 'psychology' | 'kinesiology';
  dental_tooth_number?: string; // Pieza o sector dental (ej. "3.6", "Sector anterosuperior")
  treatment_performed?: string; // Procedimiento realizado en sesión
  clinical_evolution?: string;  // Nota libre / Evolución clínica genérica
  vital_signs_enabled?: boolean; // Si el profesional desea registrar signos vitales
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

