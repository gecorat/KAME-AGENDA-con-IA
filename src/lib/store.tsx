import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  Appointment,
  Patient,
  Service,
  DayAvailability,
  PracticeSettings,
  Conversation,
  ChatMessage,
  WaitlistEntry,
  ReminderConfig,
  ReminderLog,
  PaymentRecord,
  CashRegister,
  CashMovement,
  PaymentMethod,
  ConsultationRecord,
  MedicalPrescription,
  MedicalCertificate,
  VoiceNote,
  MedicalPrescriptionItem,
  UserSession,
  UserRole,
  SaasTenantUser,
  AppNotification
} from '../types';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  playNotificationSound,
  sendBrowserNotification,
  NotificationPermissionStatus
} from './browser-notifications';
import {
  INITIAL_PRACTICE_SETTINGS,
  INITIAL_SERVICES,
  INITIAL_AVAILABILITY,
  INITIAL_PATIENTS,
  getInitialAppointments,
  INITIAL_CONVERSATIONS,
  INITIAL_WAITLIST,
  DEFAULT_REMINDER_CONFIG,
  INITIAL_REMINDER_LOGS,
  INITIAL_PAYMENTS,
  INITIAL_CASH_REGISTER,
  INITIAL_CASH_MOVEMENTS,
  INITIAL_CONSULTATIONS,
  DEMO_SAAS_TENANTS
} from './demo-data';
import {
  saveAppointmentToFirestore,
  deleteAppointmentFromFirestore,
  savePatientToFirestore,
  deletePatientFromFirestore,
  saveServiceToFirestore,
  deleteServiceFromFirestore,
  saveConsultationToFirestore,
  deleteConsultationFromFirestore,
  savePaymentToFirestore,
  deletePaymentFromFirestore,
  saveSettingsToFirestore,
  saveWaitlistToFirestore,
  deleteWaitlistFromFirestore,
  saveUserToFirestore,
  getUserFromFirestore,
  subscribeToUsers,
  updateUserInFirestore,
  deleteUserFromFirestore,
  cleanupDuplicateUsers,
  cleanupDuplicatePatientsInFirestore,
  subscribeToAppointments,
  subscribeToPatients,
  subscribeToServices,
  subscribeToSettings,
  subscribeToPayments,
  subscribeToConsultations,
  subscribeToWaitlist,
  auth,
  googleProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from './firestore-sync';

interface AgendaStoreContextType {
  appointments: Appointment[];
  patients: Patient[];
  services: Service[];
  availability: DayAvailability[];
  practiceSettings: PracticeSettings;
  conversations: Conversation[];
  waitlist: WaitlistEntry[];
  
  // Appointment actions
  addAppointment: (data: Omit<Appointment, 'id'>) => Appointment;
  updateAppointment: (id: string, updates: Partial<Appointment>) => void;
  deleteAppointment: (id: string) => void;
  
  // Patient actions
  addPatient: (data: Omit<Patient, 'id' | 'created_at' | 'total_appointments'>) => Patient;
  updatePatient: (id: string, updates: Partial<Patient>) => void;
  deletePatient: (id: string) => void;
  
  // Service actions
  addService: (data: Omit<Service, 'id'>) => Service;
  updateService: (id: string, updates: Partial<Service>) => void;
  deleteService: (id: string) => void;
  
  // Availability actions
  updateAvailability: (newAvailability: DayAvailability[]) => void;
  
  // Settings actions
  updatePracticeSettings: (updates: Partial<PracticeSettings>) => void;
  
  // Conversation actions
  addChatMessage: (convId: string, message: Omit<ChatMessage, 'id'>) => void;
  createConversation: (patientName: string, patientPhone: string, initialMsg?: string) => Conversation;
  toggleAiHandled: (convId: string) => void;

  // Waitlist actions
  addWaitlistEntry: (data: Omit<WaitlistEntry, 'id' | 'created_at' | 'status'>) => WaitlistEntry;
  updateWaitlistEntry: (id: string, updates: Partial<WaitlistEntry>) => void;
  deleteWaitlistEntry: (id: string) => void;
  notifyWaitlistEntry: (id: string) => void;

  // Reminders actions
  reminderConfig: ReminderConfig;
  reminderLogs: ReminderLog[];
  updateReminderConfig: (updates: Partial<ReminderConfig>) => void;
  sendWhatsAppReminder: (appointmentId: string, timing?: '24h' | '2h' | 'manual') => { success: boolean; message: string; waUrl: string };
  sendEmailReminder: (appointmentId: string, timing?: '24h' | '2h' | 'manual') => { success: boolean; message: string };
  confirmAppointmentByPatient: (appointmentId: string) => void;
  runAutomatedRemindersScan: () => { sentWhatsApp: number; sentEmail: number; checkedCount: number };
  formatReminderText: (template: string, apt: Appointment) => string;

  // Billing & Cash Register actions
  payments: PaymentRecord[];
  cashRegister: CashRegister;
  cashMovements: CashMovement[];
  addPayment: (data: Omit<PaymentRecord, 'id' | 'receipt_number' | 'date' | 'status'> & { receipt_number?: string; date?: string }) => PaymentRecord;
  updatePayment: (paymentId: string, updates: Partial<PaymentRecord>) => void;
  deletePayment: (paymentId: string) => void;
  voidPayment: (paymentId: string, reason?: string) => void;
  openCashRegister: (openingCash: number, notes?: string) => void;
  closeCashRegister: (closingCash: number, notes?: string) => void;
  addCashMovement: (data: Omit<CashMovement, 'id' | 'created_at'>) => CashMovement;
  updateCashMovement: (movementId: string, updates: Partial<CashMovement>) => void;
  deleteCashMovement: (movementId: string) => void;
  verifyAppointmentDeposit: (appointmentId: string, verified: boolean) => void;

  // EHR & Clinical Consultations with Voice Notes
  consultations: ConsultationRecord[];
  addConsultation: (data: Omit<ConsultationRecord, 'id' | 'created_at'>) => ConsultationRecord;
  updateConsultation: (id: string, updates: Partial<ConsultationRecord>) => void;
  deleteConsultation: (id: string) => void;
  addVoiceNoteToConsultation: (consultationId: string, voiceNote: Omit<VoiceNote, 'id' | 'recorded_at'>) => VoiceNote;

  // Authentication & Access Control
  currentUser: UserSession | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (name: string, email: string, pass: string, specialty?: string) => Promise<void>;
  loginAsDemo: (type: 'superadmin' | 'pro' | 'basic') => void;
  logout: () => Promise<void>;
  switchUserRole: (role: UserRole) => void;
  saasTenants: SaasTenantUser[];
  updateSaasTenant: (id: string, updates: Partial<SaasTenantUser>) => Promise<void>;
  deleteSaasTenant: (id: string) => Promise<boolean>;
  extendUserTrial: (id: string, daysToAdd: number) => Promise<boolean>;
  grantUserPlan: (id: string, plan: 'basic' | 'pro', isPermanent: boolean, days?: number) => Promise<boolean>;

  // Browser & App Notifications
  notifications: AppNotification[];
  unreadNotificationsCount: number;
  notificationPermission: NotificationPermissionStatus;
  activeToastNotification: AppNotification | null;
  requestBrowserNotificationPermission: () => Promise<NotificationPermissionStatus>;
  testBrowserNotification: () => Promise<void>;
  markNotificationAsRead: (id: string) => void;
  markNotificationAsUnread: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearReadNotifications: () => void;
  clearNotifications: () => void;
  dismissToastNotification: () => void;
  triggerNotification: (notif: Omit<AppNotification, 'id' | 'created_at' | 'read'>) => void;

  // Example / Demo data management
  hasExampleData: boolean;
  clearExampleData: () => Promise<void>;
  isExampleItem: (item: any) => boolean;
  deleteReminderLog: (logId: string) => void;
  clearAllReminderLogs: () => void;
  clearAllPendingAppointments: () => void;

  // Utilities
  resetToDemoData: () => void;
}

// Helper to determine if an item is a demo/example item that should not count towards real statistics
export function isExampleItem(item: any): boolean {
  if (!item) return false;
  if (item.is_example === true || item.is_demo === true) return true;

  if (typeof item.id === 'string') {
    const id = item.id.toLowerCase();
    if (
      id.startsWith('ejemplo-') ||
      id.startsWith('sample-') ||
      id.startsWith('demo-') ||
      id === 'pat-1' || id === 'pat-2' || id === 'pat-3' || id === 'pat-4' || id === 'pat-5' || id === 'ejemplo-paciente-1' ||
      id === 'apt-1' || id === 'apt-2' || id === 'apt-3' || id === 'apt-4' || id === 'apt-5' || id === 'apt-6' || id === 'ejemplo-turno-1' ||
      id === 'pay-1' || id === 'pay-2' || id === 'pay-3' || id === 'pay-4' ||
      id === 'cs-1' || id === 'cs-2' || id === 'cs-3' || id === 'cons-1' || id === 'cons-2' ||
      id === 'wait-1' || id === 'wait-2' ||
      id === 'log-1' || id === 'log-2' || id === 'log-3' || id === 'log-4' || id === 'log-5' ||
      id === 'mov-1' || id === 'mov-2' || id === 'mov-3' ||
      id === 'conv-1' || id === 'conv-2' || id === 'conv-3'
    ) return true;
  }

  const text = `${item.first_name || ''} ${item.last_name || ''} ${item.patient_name || ''} ${item.doctor_name || ''} ${item.notes || ''} ${item.concept || ''}`.toLowerCase();
  if (
    text.includes('(ejemplo)') ||
    text.includes('(muestra)') ||
    text.includes('sofía navarro') ||
    text.includes('sofia navarro') ||
    text.includes('valentina rossi') ||
    text.includes('matías albarracín') ||
    text.includes('matias albarracin') ||
    text.includes('camila benítez') ||
    text.includes('camila benitez') ||
    text.includes('esteban morales') ||
    text.includes('lucía méndez') ||
    text.includes('lucia mendez') ||
    text.includes('carlos benítez') ||
    text.includes('carlos benitez') ||
    text.includes('mariana costa') ||
    text.includes('lucas gómez') ||
    text.includes('lucas gomez') ||
    text.includes('martina silva') ||
    text.includes('joaquín pereyra') ||
    text.includes('joaquin pereyra') ||
    text.includes('florencia díaz') ||
    text.includes('florencia diaz') ||
    text.includes('tomás herrera') ||
    text.includes('tomas herrera') ||
    text.includes('camila morales') ||
    text.includes('ficha de demostración') ||
    text.includes('turno de muestra') ||
    text.includes('paciente de ejemplo')
  ) return true;

  if (
    item.email === 'ejemplo@paciente.com' ||
    item.patient_email === 'ejemplo@paciente.com' ||
    item.email === 'valentina.rossi@email.com' ||
    item.patient_email === 'valentina.rossi@email.com' ||
    item.email === 'matias.albarracin@gmail.com' ||
    item.patient_email === 'matias.albarracin@gmail.com' ||
    item.email === 'camibenitez@hotmail.com' ||
    item.patient_email === 'camibenitez@hotmail.com' ||
    item.email === 'esteban.morales@tech.ar' ||
    item.patient_email === 'esteban.morales@tech.ar'
  ) return true;

  if (
    item.phone === '+54 9 11 9999-0000' ||
    item.patient_phone === '+54 9 11 9999-0000' ||
    item.phone === '+54 9 11 6721-9988' ||
    item.patient_phone === '+54 9 11 6721-9988' ||
    item.phone === '+54 9 11 5102-4433' ||
    item.patient_phone === '+54 9 11 5102-4433' ||
    item.phone === '+54 9 11 4490-8812' ||
    item.patient_phone === '+54 9 11 4490-8812' ||
    item.phone === '+54 9 11 3322-7711' ||
    item.patient_phone === '+54 9 11 3322-7711' ||
    item.dni === '99.999.999' ||
    item.patient_dni === '99.999.999'
  ) return true;

  return false;
}

// Clean storage helper: always removes mock demo items so only real data is shown
function getCleanStorageList<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((item: any) => !isExampleItem(item));
    }
    return [];
  } catch {
    return [];
  }
}

const CLEAN_DEFAULT_SERVICES: Service[] = [
  {
    id: "srv-default-1",
    name: "Consulta Médica General",
    price: 15000,
    duration_minutes: 30,
    description: "Evaluación clínica integral y diagnóstico personalizado.",
    color: "#0284c7",
    active: true,
    category: "Consulta"
  }
];

const AgendaStoreContext = createContext<AgendaStoreContextType | null>(null);

const STORAGE_KEYS = {
  SETTINGS: 'agendapro_settings_v1',
  SERVICES: 'agendapro_services_v1',
  AVAILABILITY: 'agendapro_availability_v1',
  PATIENTS: 'agendapro_patients_v1',
  APPOINTMENTS: 'agendapro_appointments_v1',
  CONVERSATIONS: 'agendapro_conversations_v1',
  WAITLIST: 'agendapro_waitlist_v1',
  REMINDER_CONFIG: 'agendapro_reminder_config_v1',
  REMINDER_LOGS: 'agendapro_reminder_logs_v1',
  PAYMENTS: 'agendapro_payments_v1',
  CASH_REGISTER: 'agendapro_cash_register_v1',
  CASH_MOVEMENTS: 'agendapro_cash_movements_v1',
  CONSULTATIONS: 'agendapro_consultations_v1',
  NOTIFICATIONS: 'agendapro_notifications_v1'
};

// Helper functions for normalization and deduplication
export function normalizeText(str?: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizePhoneDigits(phone?: string): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

export function normalizeDniString(dni?: string): string {
  if (!dni) return '';
  return dni.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().trim();
}

export function deduplicatePatientRecords(patientList: Patient[]): {
  canonicalList: Patient[];
  removedIds: string[];
  idMap: Record<string, string>;
} {
  const canonicalList: Patient[] = [];
  const removedIds: string[] = [];
  const idMap: Record<string, string> = {};

  for (const patient of patientList) {
    const normPh = normalizePhoneDigits(patient.phone);
    const normD = normalizeDniString(patient.dni);
    const normNm = normalizeText(`${patient.first_name} ${patient.last_name}`);

    const matchIdx = canonicalList.findIndex(existing => {
      if (existing.id === patient.id) return true;

      const exPh = normalizePhoneDigits(existing.phone);
      if (normPh && exPh && normPh.length >= 7 && exPh.length >= 7) {
        if (normPh === exPh || normPh.endsWith(exPh) || exPh.endsWith(normPh)) {
          return true;
        }
      }

      const exD = normalizeDniString(existing.dni);
      if (normD && exD && normD.length >= 6 && normD === exD) {
        return true;
      }

      const exNm = normalizeText(`${existing.first_name} ${existing.last_name}`);
      if (normNm && exNm && normNm.length >= 5 && normNm === exNm) {
        return true;
      }

      return false;
    });

    if (matchIdx >= 0) {
      const canonical = canonicalList[matchIdx];
      idMap[patient.id] = canonical.id;
      if (patient.id !== canonical.id) {
        removedIds.push(patient.id);
      }

      // Merge enriched details
      canonical.first_name = canonical.first_name || patient.first_name;
      canonical.last_name = canonical.last_name || patient.last_name;
      canonical.phone = canonical.phone || patient.phone;
      canonical.email = canonical.email || patient.email;
      canonical.dni = canonical.dni || patient.dni;
      canonical.birth_date = canonical.birth_date || patient.birth_date;
      canonical.insurance_provider = canonical.insurance_provider || patient.insurance_provider;
      canonical.insurance_number = canonical.insurance_number || patient.insurance_number;
      if (patient.notes && canonical.notes && !canonical.notes.includes(patient.notes)) {
        canonical.notes = `${canonical.notes} | ${patient.notes}`;
      } else if (patient.notes && !canonical.notes) {
        canonical.notes = patient.notes;
      }
      if (patient.tags && patient.tags.length > 0) {
        canonical.tags = Array.from(new Set([...(canonical.tags || []), ...patient.tags]));
      }
      canonical.total_appointments = Math.max(canonical.total_appointments || 0, patient.total_appointments || 0);
    } else {
      canonicalList.push({ ...patient });
      idMap[patient.id] = patient.id;
    }
  }

  return { canonicalList, removedIds, idMap };
}

export const AgendaStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [practiceSettings, setPracticeSettings] = useState<PracticeSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.professional_name === 'Dr. Gonzalo Corat' || parsed.email === 'gonzalocorat@gmail.com' || parsed.handle === 'dr-corat') {
          return {
            ...INITIAL_PRACTICE_SETTINGS,
            ...parsed,
            practice_name: parsed.practice_name === 'Consultorio Dr. Gonzalo Corat' ? 'Consultorio Médico Integral' : parsed.practice_name,
            handle: parsed.handle === 'dr-corat' ? 'consultorio-medico' : parsed.handle,
            professional_name: parsed.professional_name === 'Dr. Gonzalo Corat' ? 'Dr/a. Especialista' : parsed.professional_name,
            email: parsed.email === 'gonzalocorat@gmail.com' ? 'contacto@consultorio.com' : parsed.email
          };
        }
        return parsed;
      }
      return INITIAL_PRACTICE_SETTINGS;
    } catch {
      return INITIAL_PRACTICE_SETTINGS;
    }
  });

  const [services, setServices] = useState<Service[]>(() => {
    const list = getCleanStorageList<Service>(STORAGE_KEYS.SERVICES);
    return list.length > 0 ? list : CLEAN_DEFAULT_SERVICES;
  });

  const [availability, setAvailability] = useState<DayAvailability[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.AVAILABILITY);
      return saved ? JSON.parse(saved) : INITIAL_AVAILABILITY;
    } catch {
      return INITIAL_AVAILABILITY;
    }
  });

  // Real clean patients (starts completely clean/empty, no fake data)
  const [patients, setPatients] = useState<Patient[]>(() => {
    return getCleanStorageList<Patient>(STORAGE_KEYS.PATIENTS);
  });

  // Real clean appointments (starts completely clean/empty, no fake data)
  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    return getCleanStorageList<Appointment>(STORAGE_KEYS.APPOINTMENTS);
  });

  // Real clean conversations (starts empty)
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    return getCleanStorageList<Conversation>(STORAGE_KEYS.CONVERSATIONS);
  });

  // Real clean waitlist (starts empty)
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>(() => {
    return getCleanStorageList<WaitlistEntry>(STORAGE_KEYS.WAITLIST);
  });

  const [reminderConfig, setReminderConfig] = useState<ReminderConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.REMINDER_CONFIG);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.sender_email_alias && (parsed.sender_email_alias.includes('Gonzalo') || parsed.sender_email_alias.includes('AgendaPro'))) {
          parsed.sender_email_alias = 'Consultorio Médico - Agenfacil';
        }
        return parsed;
      }
      return DEFAULT_REMINDER_CONFIG;
    } catch {
      return DEFAULT_REMINDER_CONFIG;
    }
  });

  const [reminderLogs, setReminderLogs] = useState<ReminderLog[]>(() => {
    return getCleanStorageList<ReminderLog>(STORAGE_KEYS.REMINDER_LOGS);
  });

  const [payments, setPayments] = useState<PaymentRecord[]>(() => {
    return getCleanStorageList<PaymentRecord>(STORAGE_KEYS.PAYMENTS);
  });

  const [cashRegister, setCashRegister] = useState<CashRegister>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CASH_REGISTER);
      return saved ? JSON.parse(saved) : INITIAL_CASH_REGISTER;
    } catch {
      return INITIAL_CASH_REGISTER;
    }
  });

  const [cashMovements, setCashMovements] = useState<CashMovement[]>(() => {
    return getCleanStorageList<CashMovement>(STORAGE_KEYS.CASH_MOVEMENTS);
  });

  const [consultations, setConsultations] = useState<ConsultationRecord[]>(() => {
    return getCleanStorageList<ConsultationRecord>(STORAGE_KEYS.CONSULTATIONS);
  });

  // Real-time Browser & App Notifications
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      if (saved) {
        const parsed: AppNotification[] = JSON.parse(saved);
        // Deduplicate notifications by appointment_id or title+message
        const seen = new Set<string>();
        const unique: AppNotification[] = [];
        for (const n of parsed) {
          const key = n.appointment_id ? `appt-${n.appointment_id}-${n.type}` : `${n.title}-${n.message}`;
          if (!seen.has(key)) {
            seen.add(key);
            unique.push(n);
          }
        }
        return unique;
      }
      return [];
    } catch {
      return [];
    }
  });

  const [notificationPermission, setNotificationPermission] = useState<NotificationPermissionStatus>(() => {
    return getNotificationPermission();
  });

  const [activeToastNotification, setActiveToastNotification] = useState<AppNotification | null>(null);

  // Current User Session & Role (Unauthenticated by default)
  const [currentUser, setCurrentUser] = useState<UserSession | null>(() => {
    try {
      const saved = localStorage.getItem('agendapro_current_user_v1');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return null;
  });
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  // Synchronize with Firebase Auth and Firestore in real-time
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser && firebaseUser.email) {
        const emailLower = firebaseUser.email.toLowerCase();
        const isSuper = emailLower === 'gonzalocorat@gmail.com';
        
        const remoteDoc = await getUserFromFirestore(firebaseUser.uid);
        const effectivePlan = isSuper ? 'pro' : (remoteDoc?.plan || 'basic');
        const effectiveTrialActive = isSuper ? false : (remoteDoc?.trial_active ?? true);
        const effectiveTrialDays = isSuper ? 0 : (remoteDoc?.trial_days_left ?? 14);

        const session: UserSession = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          name: firebaseUser.displayName || remoteDoc?.doctor_name || (isSuper ? 'Gonzalo Corat (Super Admin)' : 'Dr/a. Especialista'),
          role: isSuper ? 'superadmin' : 'professional',
          isSuperAdmin: isSuper,
          photoURL: firebaseUser.photoURL || undefined,
          plan: effectivePlan
        };
        setCurrentUser(session);
        try {
          localStorage.setItem('agendapro_current_user_v1', JSON.stringify(session));
        } catch {}

        setPracticeSettings(prev => ({
          ...prev,
          professional_name: session.name,
          email: firebaseUser.email || prev.email,
          subscription_plan: effectivePlan,
          trial_active: effectiveTrialActive,
          trial_days_left: effectiveTrialDays
        }));

        saveUserToFirestore({
          id: firebaseUser.uid,
          email: emailLower,
          doctor_name: session.name,
          practice_name: remoteDoc?.practice_name || (isSuper ? 'Plataforma SaaS Agenfacil' : `Consultorio ${session.name}`),
          phone: remoteDoc?.phone || '',
          plan: effectivePlan,
          status: isSuper ? 'active' : (remoteDoc?.status || 'trial'),
          trial_active: effectiveTrialActive,
          trial_days_left: effectiveTrialDays,
          is_permanent: isSuper ? true : (remoteDoc?.is_permanent ?? false),
          amount_monthly_ars: isSuper ? 0 : (remoteDoc?.amount_monthly_ars || 0),
          last_payment_amount: isSuper ? 0 : (remoteDoc?.last_payment_amount || 0),
          total_paid_ars: isSuper ? 0 : (remoteDoc?.total_paid_ars || 0),
          appointments_count: appointments.length,
          whatsapp_status: 'connected',
          created_at: remoteDoc?.created_at || new Date().toISOString()
        });
      } else {
        try {
          const saved = localStorage.getItem('agendapro_current_user_v1');
          if (saved) {
            setCurrentUser(JSON.parse(saved));
          } else {
            setCurrentUser(null);
          }
        } catch {
          setCurrentUser(null);
        }
      }
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    try {
      setIsAuthLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      if (user && user.email) {
        const isSuper = user.email.toLowerCase() === 'gonzalocorat@gmail.com';
        const session: UserSession = {
          uid: user.uid,
          email: user.email,
          name: user.displayName || (isSuper ? 'Gonzalo Corat (Super Admin)' : 'Dr/a. Especialista'),
          role: isSuper ? 'superadmin' : 'professional',
          isSuperAdmin: isSuper,
          photoURL: user.photoURL || undefined,
          plan: isSuper ? 'pro' : 'pro'
        };
        setCurrentUser(session);
        localStorage.setItem('agendapro_current_user_v1', JSON.stringify(session));
        if (user.displayName) {
          updatePracticeSettings({
            professional_name: user.displayName,
            email: user.email
          });
        }
      }
    } catch (error: any) {
      console.error('Error al conectar con Google:', error);
      throw error;
    } finally {
      setIsAuthLoading(false);
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    try {
      setIsAuthLoading(true);
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      const user = cred.user;
      const isSuper = user.email?.toLowerCase() === 'gonzalocorat@gmail.com';
      const session: UserSession = {
        uid: user.uid,
        email: user.email || email,
        name: user.displayName || (isSuper ? 'Gonzalo Corat (Super Admin)' : 'Dr/a. Especialista'),
        role: isSuper ? 'superadmin' : 'professional',
        isSuperAdmin: isSuper,
        plan: isSuper ? 'pro' : (practiceSettings.subscription_plan || 'pro')
      };
      setCurrentUser(session);
      localStorage.setItem('agendapro_current_user_v1', JSON.stringify(session));
    } catch (error: any) {
      console.error('Error al iniciar sesión con email:', error);
      throw error;
    } finally {
      setIsAuthLoading(false);
    }
  };

  const registerWithEmail = async (name: string, email: string, pass: string, specialty: string = 'Medicina General') => {
    try {
      setIsAuthLoading(true);
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      const user = cred.user;
      await updateProfile(user, { displayName: name });
      const isSuper = email.toLowerCase() === 'gonzalocorat@gmail.com';
      const session: UserSession = {
        uid: user.uid,
        email,
        name,
        role: isSuper ? 'superadmin' : 'professional',
        isSuperAdmin: isSuper,
        plan: isSuper ? 'pro' : 'pro'
      };
      setCurrentUser(session);
      localStorage.setItem('agendapro_current_user_v1', JSON.stringify(session));

      // Persist real user into Firestore users collection
      const newTenant: SaasTenantUser = {
        id: user.uid,
        practice_name: `Consultorio ${name}`,
        doctor_name: name,
        email: email.toLowerCase(),
        phone: '',
        plan: isSuper ? 'pro' : 'pro',
        billing_cycle: 'monthly',
        status: isSuper ? 'active' : 'trial',
        subscription_started_at: new Date().toISOString(),
        next_billing_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
        amount_monthly_ars: 49000,
        payment_method: 'mercadopago',
        last_payment_date: '-',
        last_payment_amount: 0,
        total_paid_ars: 0,
        appointments_count: 0,
        whatsapp_status: 'connected',
        trial_days_left: 14,
        trial_active: !isSuper,
        is_permanent: isSuper,
        created_at: new Date().toISOString(),
        last_active_at: new Date().toISOString()
      };
      await saveUserToFirestore(newTenant);

      updatePracticeSettings({
        professional_name: name,
        email: email,
        specialty,
        practice_name: `Consultorio ${name}`,
        subscription_plan: 'pro',
        trial_active: !isSuper,
        trial_days_left: 14
      });
    } catch (error: any) {
      console.error('Error al registrar usuario:', error);
      throw error;
    } finally {
      setIsAuthLoading(false);
    }
  };

  const loginAsDemo = (type: 'superadmin' | 'pro' | 'basic') => {
    let session: UserSession;
    if (type === 'superadmin') {
      session = {
        email: 'gonzalocorat@gmail.com',
        name: 'Gonzalo Corat (Super Admin)',
        role: 'superadmin',
        isSuperAdmin: true,
        plan: 'pro'
      };
      updatePracticeSettings({
        professional_name: 'Gonzalo Corat',
        email: 'gonzalocorat@gmail.com',
        subscription_plan: 'pro',
        trial_active: false
      });
    } else if (type === 'pro') {
      session = {
        email: 'gecorat@gmail.com',
        name: 'Dr/a. Gecorat',
        role: 'professional',
        isSuperAdmin: false,
        plan: 'pro'
      };
      updatePracticeSettings({
        professional_name: 'Dr/a. Gecorat',
        email: 'gecorat@gmail.com',
        specialty: 'Medicina General',
        subscription_plan: 'pro',
        trial_active: true,
        trial_days_left: 14
      });
    } else {
      session = {
        email: 'contacto@consultorio.com',
        name: 'Dr/a. Especialista',
        role: 'professional',
        isSuperAdmin: false,
        plan: 'basic'
      };
      updatePracticeSettings({
        professional_name: 'Dr/a. Especialista',
        email: 'contacto@consultorio.com',
        specialty: 'Medicina General',
        subscription_plan: 'basic',
        trial_active: false
      });
    }
    setCurrentUser(session);
    localStorage.setItem('agendapro_current_user_v1', JSON.stringify(session));
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('Sign out notice:', e);
    }
    setCurrentUser(null);
    localStorage.removeItem('agendapro_current_user_v1');
    localStorage.removeItem('agendapro_active_role');
  };

  const switchUserRole = (role: UserRole) => {
    // Only Gonzalo is authorized to switch roles or simulate views
    if (!currentUser || currentUser.email.toLowerCase() !== 'gonzalocorat@gmail.com') {
      return;
    }

    if (role === 'superadmin') {
      const adminUser: UserSession = {
        ...currentUser,
        role: 'superadmin',
        isSuperAdmin: true,
        plan: 'pro'
      };
      setCurrentUser(adminUser);
      localStorage.setItem('agendapro_current_user_v1', JSON.stringify(adminUser));
    } else {
      // Simulation mode for testing how doctors see the dashboard
      const simulatedDocUser: UserSession = {
        ...currentUser,
        role: 'professional',
        isSuperAdmin: false,
        plan: practiceSettings.subscription_plan || 'pro'
      };
      setCurrentUser(simulatedDocUser);
      localStorage.setItem('agendapro_current_user_v1', JSON.stringify(simulatedDocUser));
    }
  };

  // Real-time Firestore users synchronization for Super Admin
  const [saasTenants, setSaasTenants] = useState<SaasTenantUser[]>([]);

  useEffect(() => {
    cleanupDuplicateUsers();
    const unsub = subscribeToUsers((remoteUsers) => {
      if (remoteUsers) {
        setSaasTenants(remoteUsers);
      }
    });
    return () => unsub();
  }, []);

  const updateSaasTenant = async (id: string, updates: Partial<SaasTenantUser>) => {
    setSaasTenants(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    await updateUserInFirestore(id, updates);
  };

  const deleteSaasTenant = async (id: string): Promise<boolean> => {
    const tenant = saasTenants.find(t => t.id === id);
    if (tenant?.email?.toLowerCase() === 'gonzalocorat@gmail.com') {
      alert('No se puede eliminar la cuenta del Super Administrador.');
      return false;
    }
    setSaasTenants(prev => prev.filter(t => t.id !== id));
    return await deleteUserFromFirestore(id);
  };

  const extendUserTrial = async (id: string, daysToAdd: number): Promise<boolean> => {
    const tenant = saasTenants.find(t => t.id === id);
    if (!tenant) return false;
    const currentDays = tenant.trial_days_left || 0;
    const newDays = Math.max(1, currentDays + daysToAdd);
    const newExpiresAt = new Date(Date.now() + newDays * 86400000).toISOString();
    const newBilling = newExpiresAt.split('T')[0];

    const updates: Partial<SaasTenantUser> = {
      trial_days_left: newDays,
      trial_active: true,
      status: 'trial',
      is_permanent: false,
      next_billing_date: newBilling
    };

    setSaasTenants(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    return await updateUserInFirestore(id, updates);
  };

  const grantUserPlan = async (id: string, plan: 'basic' | 'pro', isPermanent: boolean, days: number = 30): Promise<boolean> => {
    const tenant = saasTenants.find(t => t.id === id);
    if (!tenant) return false;

    const expiresAt = isPermanent ? null : new Date(Date.now() + days * 86400000).toISOString();
    const nextBilling = isPermanent ? '2099-12-31' : (expiresAt ? expiresAt.split('T')[0] : '2026-12-31');

    const updates: Partial<SaasTenantUser> = {
      plan,
      status: 'active',
      trial_active: false,
      is_permanent: isPermanent,
      access_expires_at: expiresAt,
      amount_monthly_ars: plan === 'pro' ? 49000 : 29000,
      next_billing_date: nextBilling
    };

    setSaasTenants(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    return await updateUserInFirestore(id, updates);
  };

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(practiceSettings));
  }, [practiceSettings]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(services));
  }, [services]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.AVAILABILITY, JSON.stringify(availability));
  }, [availability]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(patients));
  }, [patients]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CONSULTATIONS, JSON.stringify(consultations));
  }, [consultations]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(appointments));
  }, [appointments]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(conversations));
  }, [conversations]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.WAITLIST, JSON.stringify(waitlist));
  }, [waitlist]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.REMINDER_CONFIG, JSON.stringify(reminderConfig));
  }, [reminderConfig]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.REMINDER_LOGS, JSON.stringify(reminderLogs));
  }, [reminderLogs]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));
  }, [payments]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CASH_REGISTER, JSON.stringify(cashRegister));
  }, [cashRegister]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CASH_MOVEMENTS, JSON.stringify(cashMovements));
  }, [cashMovements]);

  // Save notifications to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications.slice(0, 50)));
    } catch {}
  }, [notifications]);

  // Request browser desktop notification permission
  const requestBrowserNotificationPermission = async (): Promise<NotificationPermissionStatus> => {
    const status = await requestNotificationPermission();
    setNotificationPermission(status);
    if (status === 'granted') {
      setPracticeSettings(prev => {
        const updated = { ...prev, notify_browser_enabled: true };
        try {
          localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
        } catch {}
        return updated;
      });
    }
    return status;
  };

  // Dispatch browser desktop + in-app notification
  const triggerNotification = (notifData: Omit<AppNotification, 'id' | 'created_at' | 'read'>) => {
    // Deduplicate: check if notification with same appointment_id and type already exists in state
    if (notifData.appointment_id) {
      const alreadyExists = notifications.some(
        n => n.appointment_id === notifData.appointment_id && n.type === notifData.type
      );
      if (alreadyExists) return;
    } else {
      const alreadyExists = notifications.some(
        n => n.title === notifData.title && n.message === notifData.message && (Date.now() - new Date(n.created_at).getTime() < 1000 * 60 * 10)
      );
      if (alreadyExists) return;
    }

    const newNotif: AppNotification = {
      ...notifData,
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      created_at: new Date().toISOString(),
      read: false
    };

    setNotifications(prev => [newNotif, ...prev.slice(0, 49)]);
    setActiveToastNotification(newNotif);

    // Audio chime synthesis
    if (practiceSettings.notify_sound_enabled !== false) {
      playNotificationSound();
    }

    // Native browser notification
    if (practiceSettings.notify_browser_enabled !== false) {
      sendBrowserNotification({
        title: newNotif.title,
        body: newNotif.message,
        onClick: () => {
          try {
            window.focus();
          } catch {}
        }
      });
    }

    // Auto-dismiss in-app toast after 7 seconds
    setTimeout(() => {
      setActiveToastNotification(current => (current?.id === newNotif.id ? null : current));
    }, 7000);
  };

  const testBrowserNotification = async () => {
    if (notificationPermission === 'default') {
      await requestBrowserNotificationPermission();
    }

    triggerNotification({
      type: 'test',
      title: '🔔 Notificación de Prueba - Agenfacil',
      message: '¡Excelente! Las alertas del navegador están activas para nuevos turnos y confirmaciones.',
      patient_name: 'Dr/a. Notificaciones Activas',
      service_name: 'Alerta del Sistema'
    });
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markNotificationAsUnread = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: false } : n));
  };

  const markAllNotificationsAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Keep appointment notifications that are for upcoming/today's appointments
  const clearReadNotifications = () => {
    setNotifications(prev => prev.filter(n => {
      if (!n.read) return true;
      const aptTimeStr = n.datetime || appointments.find(a => a.id === n.appointment_id)?.start_datetime;
      if (aptTimeStr) {
        const aptTime = new Date(aptTimeStr).getTime();
        const now = Date.now();
        // If appointment time is in the future or within the last 2 hours, keep notification so doctor doesn't miss it
        if (!isNaN(aptTime) && aptTime > now - 1000 * 60 * 60 * 2) {
          return true;
        }
      }
      return false;
    }));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const dismissToastNotification = () => {
    setActiveToastNotification(null);
  };

  // Real-time synchronization with Firestore and initial deduplication sweep
  useEffect(() => {
    // Initial cleanup of duplicates in Firestore in background
    cleanupDuplicatePatientsInFirestore();

    // Initial purge of any legacy example / demo records from localStorage and state
    try {
      localStorage.setItem('agendapro_example_dismissed', 'true');
      [
        STORAGE_KEYS.PATIENTS,
        STORAGE_KEYS.APPOINTMENTS,
        STORAGE_KEYS.PAYMENTS,
        STORAGE_KEYS.CONSULTATIONS,
        STORAGE_KEYS.WAITLIST,
        STORAGE_KEYS.REMINDER_LOGS,
        STORAGE_KEYS.CONVERSATIONS,
        STORAGE_KEYS.CASH_MOVEMENTS
      ].forEach(k => {
        const raw = localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            const cleaned = parsed.filter(i => !isExampleItem(i));
            if (cleaned.length !== parsed.length) {
              localStorage.setItem(k, JSON.stringify(cleaned));
            }
          }
        }
      });
    } catch {}

    // Clean initial state if any lingering mock items slipped in
    setPatients(prev => prev.filter(p => !isExampleItem(p)));
    setAppointments(prev => prev.filter(a => !isExampleItem(a)));
    setPayments(prev => prev.filter(p => !isExampleItem(p)));
    setConsultations(prev => prev.filter(c => !isExampleItem(c)));
    setWaitlist(prev => prev.filter(w => !isExampleItem(w)));
    setReminderLogs(prev => prev.filter(l => !isExampleItem(l)));
    setConversations(prev => prev.filter(c => !isExampleItem(c)));

    // Cleanup Firestore mock documents in background
    const mockIds = [
      'pat-1', 'pat-2', 'pat-3', 'pat-4', 'pat-5', 'ejemplo-paciente-1',
      'apt-1', 'apt-2', 'apt-3', 'apt-4', 'apt-5', 'apt-6', 'ejemplo-turno-1',
      'pay-1', 'pay-2', 'pay-3', 'pay-4',
      'cons-1', 'cons-2', 'cs-1', 'cs-2', 'cs-3',
      'wait-1', 'wait-2'
    ];
    mockIds.forEach(id => {
      if (id.startsWith('pat-') || id === 'ejemplo-paciente-1') deletePatientFromFirestore(id);
      if (id.startsWith('apt-') || id === 'ejemplo-turno-1') deleteAppointmentFromFirestore(id);
      if (id.startsWith('pay-')) deletePaymentFromFirestore(id);
      if (id.startsWith('cons-') || id.startsWith('cs-')) deleteConsultationFromFirestore(id);
      if (id.startsWith('wait-')) deleteWaitlistFromFirestore(id);
    });

    const unsubAppointments = subscribeToAppointments((remoteAppointments) => {
      if (remoteAppointments) {
        // Detect newly added remote appointments from bot or public booking
        const existingIds = new Set(appointments.map(a => a.id));
        remoteAppointments.forEach(remoteApt => {
          if (!existingIds.has(remoteApt.id) && (remoteApt.origin === 'bot_whatsapp' || remoteApt.origin === 'public_booking') && !isExampleItem(remoteApt)) {
            // Only trigger notification if created recently (within last 3 minutes) with valid created_at timestamp
            const createdTime = (remoteApt as any).created_at ? new Date((remoteApt as any).created_at).getTime() : 0;
            const isRecent = createdTime > 0 && (Date.now() - createdTime < 1000 * 60 * 3);

            if (isRecent && practiceSettings.notify_bot_bookings !== false) {
              const aptDate = new Date(remoteApt.start_datetime);
              const dateStr = aptDate.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
              const timeStr = aptDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
              triggerNotification({
                type: remoteApt.origin === 'bot_whatsapp' ? 'bot_booking' : 'public_booking',
                title: remoteApt.origin === 'bot_whatsapp' ? '🤖 ¡Nuevo turno agendado por el Bot!' : '🌐 Nueva reserva online recibida',
                message: `${remoteApt.patient_name} reservó "${remoteApt.service_name}" para el ${dateStr} a las ${timeStr} hs.`,
                appointment_id: remoteApt.id,
                patient_name: remoteApt.patient_name,
                service_name: remoteApt.service_name,
                datetime: remoteApt.start_datetime
              });
            }
          }
        });

        // Filter out and remove any mock items from Firestore
        const mockAppointments = remoteAppointments.filter(isExampleItem);
        if (mockAppointments.length > 0) {
          mockAppointments.forEach(m => deleteAppointmentFromFirestore(m.id));
        }

        const validList = remoteAppointments.filter(a => !isExampleItem(a));
        setAppointments(validList);
      }
    });

    const unsubPatients = subscribeToPatients((remotePatients) => {
      if (remotePatients) {
        // Filter out and remove any mock items from Firestore
        const mockPatients = remotePatients.filter(isExampleItem);
        if (mockPatients.length > 0) {
          mockPatients.forEach(m => deletePatientFromFirestore(m.id));
        }

        const filtered = remotePatients.filter(p => !isExampleItem(p));
        const { canonicalList, removedIds } = deduplicatePatientRecords(filtered);
        
        // Delete ghost duplicates from Firestore
        if (removedIds.length > 0) {
          removedIds.forEach(id => deletePatientFromFirestore(id));
        }

        setPatients(canonicalList);
      }
    });

    const unsubSettings = subscribeToSettings((remoteSettings) => {
      if (remoteSettings && remoteSettings.practice_name) {
        setPracticeSettings(prev => ({ ...prev, ...remoteSettings }));
      }
    });

    const unsubServices = subscribeToServices((remoteServices) => {
      if (remoteServices && remoteServices.length > 0) {
        setServices(remoteServices);
      }
    });

    const unsubPayments = subscribeToPayments((remotePayments) => {
      if (remotePayments) {
        const mockPayments = remotePayments.filter(isExampleItem);
        if (mockPayments.length > 0) {
          mockPayments.forEach(m => deletePaymentFromFirestore(m.id));
        }
        setPayments(remotePayments.filter(p => !isExampleItem(p)));
      }
    });

    const unsubWaitlist = subscribeToWaitlist((remoteWaitlist) => {
      if (remoteWaitlist) {
        const mockWait = remoteWaitlist.filter(isExampleItem);
        if (mockWait.length > 0) {
          mockWait.forEach(m => deleteWaitlistFromFirestore(m.id));
        }
        setWaitlist(remoteWaitlist.filter(w => !isExampleItem(w)));
      }
    });

    const unsubConsultations = subscribeToConsultations((remoteConsultations) => {
      if (remoteConsultations) {
        const mockConsults = remoteConsultations.filter(isExampleItem);
        if (mockConsults.length > 0) {
          mockConsults.forEach(m => deleteConsultationFromFirestore(m.id));
        }
        setConsultations(remoteConsultations.filter(c => !isExampleItem(c)));
      }
    });

    return () => {
      unsubAppointments();
      unsubPatients();
      unsubSettings();
      unsubServices();
      unsubPayments();
      unsubWaitlist();
      unsubConsultations();
    };
  }, []);

  // Example / Demo data state helpers
  const hasExampleData = useMemo(() => {
    return patients.some(isExampleItem) ||
      appointments.some(isExampleItem) ||
      payments.some(isExampleItem) ||
      consultations.some(isExampleItem) ||
      waitlist.some(isExampleItem) ||
      reminderLogs.some(isExampleItem);
  }, [patients, appointments, payments, consultations, waitlist, reminderLogs]);

  const clearExampleData = async () => {
    try {
      localStorage.setItem('agendapro_example_dismissed', 'true');
      [
        STORAGE_KEYS.PATIENTS,
        STORAGE_KEYS.APPOINTMENTS,
        STORAGE_KEYS.PAYMENTS,
        STORAGE_KEYS.CONSULTATIONS,
        STORAGE_KEYS.WAITLIST,
        STORAGE_KEYS.REMINDER_LOGS,
        STORAGE_KEYS.CONVERSATIONS,
        STORAGE_KEYS.CASH_MOVEMENTS
      ].forEach(k => {
        const raw = localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            const cleaned = parsed.filter(i => !isExampleItem(i));
            localStorage.setItem(k, JSON.stringify(cleaned));
          }
        }
      });
    } catch {}

    // 1. Remove from local state
    setPatients(prev => prev.filter(p => !isExampleItem(p)));
    setAppointments(prev => prev.filter(a => !isExampleItem(a)));
    setPayments(prev => prev.filter(p => !isExampleItem(p)));
    setConsultations(prev => prev.filter(c => !isExampleItem(c)));
    setWaitlist(prev => prev.filter(w => !isExampleItem(w)));
    setReminderLogs(prev => prev.filter(l => !isExampleItem(l)));
    setConversations(prev => prev.filter(c => !isExampleItem(c)));

    // 2. Remove from Firestore
    try {
      patients.filter(isExampleItem).forEach(p => deletePatientFromFirestore(p.id));
      appointments.filter(isExampleItem).forEach(a => deleteAppointmentFromFirestore(a.id));
      payments.filter(isExampleItem).forEach(p => deletePaymentFromFirestore(p.id));
      consultations.filter(isExampleItem).forEach(c => deleteConsultationFromFirestore(c.id));
      waitlist.filter(isExampleItem).forEach(w => deleteWaitlistFromFirestore(w.id));

      // Extra safety for known mock IDs in Firestore
      ['pat-1', 'pat-2', 'pat-3', 'pat-4', 'pat-5', 'ejemplo-paciente-1'].forEach(id => deletePatientFromFirestore(id));
      ['apt-1', 'apt-2', 'apt-3', 'apt-4', 'apt-5', 'apt-6', 'ejemplo-turno-1'].forEach(id => deleteAppointmentFromFirestore(id));
      ['pay-1', 'pay-2', 'pay-3', 'pay-4'].forEach(id => deletePaymentFromFirestore(id));
      ['cs-1', 'cs-2', 'cs-3', 'cons-1', 'cons-2'].forEach(id => deleteConsultationFromFirestore(id));
      ['wait-1', 'wait-2'].forEach(id => deleteWaitlistFromFirestore(id));
    } catch (e) {
      console.warn('Could not clean some example items from Firestore:', e);
    }
  };

  const clearAllPendingAppointments = () => {
    setAppointments(prev => prev.filter(a => a.payment_status !== 'pending'));
    appointments
      .filter(a => a.payment_status === 'pending')
      .forEach(a => deleteAppointmentFromFirestore(a.id));
  };

  const deleteReminderLog = (logId: string) => {
    setReminderLogs(prev => prev.filter(l => l.id !== logId));
  };

  const clearAllReminderLogs = () => {
    setReminderLogs([]);
    try {
      localStorage.setItem(STORAGE_KEYS.REMINDER_LOGS, JSON.stringify([]));
    } catch {}
  };

  // Appointment Handlers
  const addAppointment = (data: Omit<Appointment, 'id'>): Appointment => {
    // If user adds a real appointment, clear example data automatically
    if (!data.is_example && !data.is_demo) {
      clearExampleData();
    }

    const id = `apt-${Date.now()}`;
    const newApt: Appointment = { ...data, id };
    
    setAppointments(prev => [newApt, ...prev.filter(a => a.id !== id)]);

    // Save to Firestore in background
    saveAppointmentToFirestore(newApt);

    // Ensure the patient is registered in the patients list and update total appointments without creating duplicates
    setPatients(prev => {
      const normPhone = normalizePhoneDigits(data.patient_phone);
      const normName = normalizeText(data.patient_name);

      const existingIdx = prev.findIndex(p => {
        if (data.patient_id && p.id === data.patient_id) return true;
        const pNormPhone = normalizePhoneDigits(p.phone);
        if (normPhone && pNormPhone && normPhone.length >= 7 && (normPhone === pNormPhone || normPhone.endsWith(pNormPhone) || pNormPhone.endsWith(normPhone))) return true;
        const pNormName = normalizeText(`${p.first_name} ${p.last_name}`);
        if (normName && pNormName && normName.length >= 5 && normName === pNormName) return true;
        return false;
      });

      if (existingIdx >= 0) {
        const existing = prev[existingIdx];
        const updatedPatient: Patient = {
          ...existing,
          total_appointments: (existing.total_appointments || 0) + 1,
          phone: existing.phone || data.patient_phone || '',
          email: existing.email || data.patient_email || undefined
        };
        savePatientToFirestore(updatedPatient);
        const next = [...prev];
        next[existingIdx] = updatedPatient;
        return next;
      } else {
        const nameParts = (data.patient_name || 'Paciente').trim().split(' ');
        const firstName = nameParts[0] || 'Paciente';
        const lastName = nameParts.slice(1).join(' ') || '';
        const newPatientId = data.patient_id && !data.patient_id.startsWith('pat-web-') && !data.patient_id.startsWith('pat-bot-')
          ? data.patient_id
          : `pat-${Date.now()}`;

        const newPatient: Patient = {
          id: newPatientId,
          first_name: firstName,
          last_name: lastName,
          phone: data.patient_phone || '',
          email: data.patient_email || undefined,
          total_appointments: 1,
          created_at: new Date().toISOString()
        };
        savePatientToFirestore(newPatient);
        return [newPatient, ...prev];
      }
    });

    // Trigger browser & app notification on Bot or Public Booking
    if (data.origin === 'bot_whatsapp' && practiceSettings.notify_bot_bookings !== false) {
      const aptDate = new Date(data.start_datetime);
      const dateStr = aptDate.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
      const timeStr = aptDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
      triggerNotification({
        type: 'bot_booking',
        title: '🤖 ¡Nuevo turno agendado por el Bot!',
        message: `${data.patient_name} agendó "${data.service_name}" para el ${dateStr} a las ${timeStr} hs.`,
        appointment_id: id,
        patient_name: data.patient_name,
        service_name: data.service_name,
        datetime: data.start_datetime
      });
    } else if (data.origin === 'public_booking' && practiceSettings.notify_bot_bookings !== false) {
      const aptDate = new Date(data.start_datetime);
      const dateStr = aptDate.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
      const timeStr = aptDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
      triggerNotification({
        type: 'public_booking',
        title: '🌐 Nueva reserva online recibida',
        message: `${data.patient_name} reservó "${data.service_name}" para el ${dateStr} a las ${timeStr} hs desde el portal web.`,
        appointment_id: id,
        patient_name: data.patient_name,
        service_name: data.service_name,
        datetime: data.start_datetime
      });
    }

    return newApt;
  };

  const updateAppointment = (id: string, updates: Partial<Appointment>) => {
    setAppointments(prev => {
      const next = prev.map(a => {
        if (a.id === id) {
          const updated = { ...a, ...updates };
          saveAppointmentToFirestore(updated);
          return updated;
        }
        return a;
      });
      return next;
    });
  };

  const deleteAppointment = (id: string) => {
    if (id.startsWith('ejemplo-') || id === 'apt-1') {
      try {
        localStorage.setItem('agendapro_example_dismissed', 'true');
      } catch {}
    }
    setAppointments(prev => prev.filter(a => a.id !== id));
    deleteAppointmentFromFirestore(id);
  };

  // Patient Handlers
  const addPatient = (data: Omit<Patient, 'id' | 'created_at' | 'total_appointments'>): Patient => {
    // If real patient is added, clear example demo data
    if (!isExampleItem(data)) {
      clearExampleData();
    }

    const normPhone = normalizePhoneDigits(data.phone);
    const normDni = normalizeDniString(data.dni);
    const normName = normalizeText(`${data.first_name} ${data.last_name}`);

    // Check if patient already exists in local state
    let matchedPatient: Patient | null = null;
    let matchedIndex = -1;

    for (let i = 0; i < patients.length; i++) {
      const p = patients[i];
      const pNormPhone = normalizePhoneDigits(p.phone);
      const pNormDni = normalizeDniString(p.dni);
      const pNormName = normalizeText(`${p.first_name} ${p.last_name}`);

      if (normPhone && pNormPhone && normPhone.length >= 7 && (normPhone === pNormPhone || normPhone.endsWith(pNormPhone) || pNormPhone.endsWith(normPhone))) {
        matchedPatient = p;
        matchedIndex = i;
        break;
      }
      if (normDni && pNormDni && normDni.length >= 6 && normDni === pNormDni) {
        matchedPatient = p;
        matchedIndex = i;
        break;
      }
      if (normName && pNormName && normName.length >= 5 && normName === pNormName) {
        matchedPatient = p;
        matchedIndex = i;
        break;
      }
    }

    if (matchedPatient && matchedIndex >= 0) {
      // Update existing patient with new data and merge
      const updated: Patient = {
        ...matchedPatient,
        ...data,
        id: matchedPatient.id,
        created_at: matchedPatient.created_at,
        total_appointments: matchedPatient.total_appointments || 0,
        phone: data.phone || matchedPatient.phone,
        email: data.email || matchedPatient.email,
        dni: data.dni || matchedPatient.dni,
        birth_date: data.birth_date || matchedPatient.birth_date,
        insurance_provider: data.insurance_provider || matchedPatient.insurance_provider,
        insurance_number: data.insurance_number || matchedPatient.insurance_number,
        notes: data.notes
          ? (matchedPatient.notes && !matchedPatient.notes.includes(data.notes) ? `${matchedPatient.notes} | ${data.notes}` : data.notes)
          : matchedPatient.notes,
        tags: Array.from(new Set([...(matchedPatient.tags || []), ...(data.tags || [])]))
      };
      setPatients(prev => {
        const next = [...prev];
        next[matchedIndex] = updated;
        return next;
      });
      savePatientToFirestore(updated);
      return updated;
    }

    const id = `pat-${Date.now()}`;
    const newPatient: Patient = {
      ...data,
      id,
      total_appointments: 0,
      created_at: new Date().toISOString()
    };
    setPatients(prev => [newPatient, ...prev]);
    savePatientToFirestore(newPatient);
    return newPatient;
  };

  const updatePatient = (id: string, updates: Partial<Patient>) => {
    setPatients(prev => {
      const next = prev.map(p => {
        if (p.id === id) {
          const updated = { ...p, ...updates };
          savePatientToFirestore(updated);
          return updated;
        }
        return p;
      });
      return next;
    });
  };

  const deletePatient = (id: string) => {
    if (id.startsWith('ejemplo-') || id === 'pat-1') {
      try {
        localStorage.setItem('agendapro_example_dismissed', 'true');
      } catch {}
    }
    setPatients(prev => prev.filter(p => p.id !== id));
    setAppointments(prev => prev.filter(a => a.patient_id !== id));
    setConsultations(prev => prev.filter(c => c.patient_id !== id));
    setPayments(prev => prev.filter(p => p.patient_id !== id));

    deletePatientFromFirestore(id);
    appointments.filter(a => a.patient_id === id).forEach(a => deleteAppointmentFromFirestore(a.id));
    consultations.filter(c => c.patient_id === id).forEach(c => deleteConsultationFromFirestore(c.id));
    payments.filter(p => p.patient_id === id).forEach(p => deletePaymentFromFirestore(p.id));
  };

  // Service Handlers
  const addService = (data: Omit<Service, 'id'>): Service => {
    const id = `srv-${Date.now()}`;
    const newService: Service = { ...data, id };
    setServices(prev => [...prev, newService]);
    saveServiceToFirestore(newService);
    return newService;
  };

  const updateService = (id: string, updates: Partial<Service>) => {
    setServices(prev => prev.map(s => {
      if (s.id === id) {
        const updated = { ...s, ...updates };
        saveServiceToFirestore(updated);
        return updated;
      }
      return s;
    }));
  };

  const deleteService = (id: string) => {
    setServices(prev => prev.filter(s => s.id !== id));
    deleteServiceFromFirestore(id);
  };

  // Availability Handlers
  const updateAvailability = (newAvailability: DayAvailability[]) => {
    setAvailability(newAvailability);
  };

  // Practice Settings
  const updatePracticeSettings = (updates: Partial<PracticeSettings>) => {
    setPracticeSettings(prev => {
      const next = { ...prev, ...updates };
      saveSettingsToFirestore(next);
      return next;
    });
  };

  // Conversations
  const addChatMessage = (convId: string, message: Omit<ChatMessage, 'id'>) => {
    const msgId = `msg-${Date.now()}`;
    const newMsg: ChatMessage = { ...message, id: msgId };

    setConversations(prev => prev.map(conv => {
      if (conv.id === convId) {
        return {
          ...conv,
          last_message: message.content,
          last_message_time: message.timestamp,
          messages: [...conv.messages, newMsg]
        };
      }
      return conv;
    }));
  };

  const createConversation = (patientName: string, patientPhone: string, initialMsg?: string): Conversation => {
    const id = `conv-${Date.now()}`;
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newConv: Conversation = {
      id,
      patient_name: patientName,
      patient_phone: patientPhone,
      last_message: initialMsg || "Conversación iniciada",
      last_message_time: nowTime,
      unread_count: 0,
      ai_handled: true,
      messages: initialMsg ? [
        {
          id: `msg-${Date.now()}`,
          role: 'user',
          content: initialMsg,
          timestamp: nowTime
        }
      ] : []
    };
    setConversations(prev => [newConv, ...prev]);
    return newConv;
  };

  const toggleAiHandled = (convId: string) => {
    setConversations(prev => prev.map(c => c.id === convId ? { ...c, ai_handled: !c.ai_handled } : c));
  };

  // Waitlist Handlers
  const addWaitlistEntry = (data: Omit<WaitlistEntry, 'id' | 'created_at' | 'status'>): WaitlistEntry => {
    const id = `wait-${Date.now()}`;
    const newEntry: WaitlistEntry = {
      ...data,
      id,
      status: 'waiting',
      created_at: new Date().toISOString()
    };
    setWaitlist(prev => [newEntry, ...prev]);
    saveWaitlistToFirestore(newEntry);
    return newEntry;
  };

  const updateWaitlistEntry = (id: string, updates: Partial<WaitlistEntry>) => {
    setWaitlist(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w));
  };

  const deleteWaitlistEntry = (id: string) => {
    setWaitlist(prev => prev.filter(w => w.id !== id));
    deleteWaitlistFromFirestore(id);
  };

  const notifyWaitlistEntry = (id: string) => {
    setWaitlist(prev => prev.map(w => w.id === id ? { ...w, status: 'notified', notified_at: new Date().toISOString() } : w));
  };

  // Reminders Handlers
  const formatReminderText = (template: string, apt: Appointment): string => {
    const aptDate = new Date(apt.start_datetime);
    const dateFormatted = aptDate.toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
    const timeFormatted = aptDate.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    const confirmLink = `${window.location.origin}/?confirmar=${apt.id}`;

    return template
      .replace(/{paciente}/g, apt.patient_name)
      .replace(/{servicio}/g, apt.service_name)
      .replace(/{fecha}/g, dateFormatted)
      .replace(/{hora}/g, timeFormatted)
      .replace(/{profesional}/g, practiceSettings.professional_name)
      .replace(/{consultorio}/g, practiceSettings.practice_name)
      .replace(/{direccion}/g, practiceSettings.address)
      .replace(/{ciudad}/g, practiceSettings.city)
      .replace(/{whatsapp}/g, practiceSettings.whatsapp_number)
      .replace(/{link_confirmar}/g, confirmLink)
      .replace(/{boton_confirmar}/g, `👉 Confirmar asistencia aquí: ${confirmLink}`);
  };

  const updateReminderConfig = (updates: Partial<ReminderConfig>) => {
    setReminderConfig(prev => ({ ...prev, ...updates }));
  };

  const sendWhatsAppReminder = (appointmentId: string, timing: '24h' | '2h' | 'manual' = 'manual') => {
    const apt = appointments.find(a => a.id === appointmentId);
    if (!apt) return { success: false, message: 'Turno no encontrado', waUrl: '' };

    const template = timing === '2h'
      ? reminderConfig.whatsapp_template_2h
      : reminderConfig.whatsapp_template_24h;

    const message = formatReminderText(template, apt);
    const cleanPhone = apt.patient_phone.replace(/\D/g, '');
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

    const nowIso = new Date().toISOString();
    setAppointments(prev => prev.map(a => {
      if (a.id === appointmentId) {
        return {
          ...a,
          ...(timing === '2h'
            ? { reminder_2h_sent: true, reminder_2h_sent_at: nowIso }
            : { reminder_24h_sent: true, reminder_24h_sent_at: nowIso })
        };
      }
      return a;
    }));

    const newLog: ReminderLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      appointment_id: apt.id,
      patient_name: apt.patient_name,
      patient_phone: apt.patient_phone,
      patient_email: apt.patient_email,
      channel: 'whatsapp',
      timing,
      status: 'delivered',
      sent_at: nowIso,
      appointment_datetime: apt.start_datetime,
      service_name: apt.service_name,
      message_preview: message.length > 90 ? message.slice(0, 90) + '...' : message,
      confirmed: apt.patient_confirmed
    };
    setReminderLogs(prev => [newLog, ...prev]);

    return { success: true, message, waUrl };
  };

  const sendEmailReminder = (appointmentId: string, timing: '24h' | '2h' | 'manual' = 'manual') => {
    const apt = appointments.find(a => a.id === appointmentId);
    if (!apt) return { success: false, message: 'Turno no encontrado' };

    const template = timing === '2h'
      ? reminderConfig.email_body_2h
      : reminderConfig.email_body_24h;

    const message = formatReminderText(template, apt);
    const nowIso = new Date().toISOString();

    setAppointments(prev => prev.map(a => {
      if (a.id === appointmentId) {
        return {
          ...a,
          email_reminder_sent: true,
          email_reminder_sent_at: nowIso
        };
      }
      return a;
    }));

    const newLog: ReminderLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      appointment_id: apt.id,
      patient_name: apt.patient_name,
      patient_phone: apt.patient_phone,
      patient_email: apt.patient_email || 'Sin email registrado',
      channel: 'email',
      timing,
      status: 'sent',
      sent_at: nowIso,
      appointment_datetime: apt.start_datetime,
      service_name: apt.service_name,
      message_preview: message.length > 90 ? message.slice(0, 90) + '...' : message,
      confirmed: apt.patient_confirmed
    };
    setReminderLogs(prev => [newLog, ...prev]);

    return { success: true, message };
  };

  const confirmAppointmentByPatient = (appointmentId: string) => {
    const nowIso = new Date().toISOString();
    const apt = appointments.find(a => a.id === appointmentId);

    setAppointments(prev => prev.map(a => {
      if (a.id === appointmentId) {
        return {
          ...a,
          patient_confirmed: true,
          patient_confirmed_at: nowIso,
          status: reminderConfig.auto_update_status_on_confirm ? 'confirmed' : a.status
        };
      }
      return a;
    }));

    setReminderLogs(prev => prev.map(l => {
      if (l.appointment_id === appointmentId) {
        return { ...l, confirmed: true };
      }
      return l;
    }));

    // Trigger browser & app notification on patient confirmation
    if (apt && practiceSettings.notify_patient_confirmations !== false) {
      const aptDate = new Date(apt.start_datetime);
      const dateStr = aptDate.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
      const timeStr = aptDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
      triggerNotification({
        type: 'patient_confirm',
        title: '✅ Turno confirmado por el paciente',
        message: `${apt.patient_name} confirmó su asistencia para "${apt.service_name}" (${dateStr} ${timeStr} hs).`,
        appointment_id: apt.id,
        patient_name: apt.patient_name,
        service_name: apt.service_name,
        datetime: apt.start_datetime
      });
    }
  };

  const runAutomatedRemindersScan = () => {
    let sentWhatsApp = 0;
    let sentEmail = 0;
    const now = Date.now();
    const nowIso = new Date().toISOString();
    const newLogs: ReminderLog[] = [];

    setAppointments(prev => prev.map(apt => {
      if (apt.status === 'cancelled') return apt;
      const aptTime = new Date(apt.start_datetime).getTime();
      const diffHours = (aptTime - now) / (1000 * 60 * 60);

      let updated = { ...apt };

      // 24 hours check (e.g. between 0 and 36 hours ahead)
      if (diffHours > 0 && diffHours <= 36) {
        if (reminderConfig.whatsapp_enabled && reminderConfig.send_24h_before && !apt.reminder_24h_sent) {
          updated.reminder_24h_sent = true;
          updated.reminder_24h_sent_at = nowIso;
          sentWhatsApp++;
          const msg = formatReminderText(reminderConfig.whatsapp_template_24h, apt);
          newLogs.push({
            id: `log-auto-wa-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            appointment_id: apt.id,
            patient_name: apt.patient_name,
            patient_phone: apt.patient_phone,
            patient_email: apt.patient_email,
            channel: 'whatsapp',
            timing: '24h',
            status: 'delivered',
            sent_at: nowIso,
            appointment_datetime: apt.start_datetime,
            service_name: apt.service_name,
            message_preview: msg.length > 90 ? msg.slice(0, 90) + '...' : msg,
            confirmed: apt.patient_confirmed
          });
        }

        if (reminderConfig.email_enabled && reminderConfig.send_24h_before && !apt.email_reminder_sent && apt.patient_email) {
          updated.email_reminder_sent = true;
          updated.email_reminder_sent_at = nowIso;
          sentEmail++;
          const msg = formatReminderText(reminderConfig.email_body_24h, apt);
          newLogs.push({
            id: `log-auto-em-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            appointment_id: apt.id,
            patient_name: apt.patient_name,
            patient_phone: apt.patient_phone,
            patient_email: apt.patient_email,
            channel: 'email',
            timing: '24h',
            status: 'sent',
            sent_at: nowIso,
            appointment_datetime: apt.start_datetime,
            service_name: apt.service_name,
            message_preview: msg.length > 90 ? msg.slice(0, 90) + '...' : msg,
            confirmed: apt.patient_confirmed
          });
        }
      }

      return updated;
    }));

    if (newLogs.length > 0) {
      setReminderLogs(prev => [...newLogs, ...prev]);
    }

    return { sentWhatsApp, sentEmail, checkedCount: appointments.length };
  };

  // Billing & Cash Handlers
  const addPayment = (data: Omit<PaymentRecord, 'id' | 'receipt_number' | 'date' | 'status'> & { receipt_number?: string; date?: string }): PaymentRecord => {
    const id = `pay-${Date.now()}`;
    const nextNum = payments.length + 101;
    const receipt_number = data.receipt_number || `REC-${String(nextNum).padStart(5, '0')}`;
    const date = data.date || new Date().toISOString();

    const newPayment: PaymentRecord = {
      ...data,
      id,
      receipt_number,
      date,
      status: 'completed'
    };

    setPayments(prev => [newPayment, ...prev]);

    // If linked to an appointment, mark appointment as paid
    if (data.appointment_id) {
      setAppointments(prev => prev.map(a => {
        if (a.id === data.appointment_id) {
          return { ...a, payment_status: 'paid' };
        }
        return a;
      }));
    }

    // If method is cash, register an income movement in cash register
    if (data.method === 'cash') {
      const cashMov: CashMovement = {
        id: `mov-${Date.now()}`,
        type: 'income',
        category: 'payment',
        amount: data.amount,
        concept: `Cobro ${receipt_number} - ${data.patient_name}`,
        method: 'cash',
        created_at: date,
        registered_by: 'Caja'
      };
      setCashMovements(prev => [cashMov, ...prev]);
    }

    savePaymentToFirestore(newPayment);

    return newPayment;
  };

  const updatePayment = (paymentId: string, updates: Partial<PaymentRecord>) => {
    setPayments(prev => prev.map(p => {
      if (p.id === paymentId) {
        const updated: PaymentRecord = { ...p, ...updates };
        savePaymentToFirestore(updated);
        return updated;
      }
      return p;
    }));
  };

  const deletePayment = (paymentId: string) => {
    const existing = payments.find(p => p.id === paymentId);
    if (existing) {
      // Revert appointment payment status if attached
      if (existing.appointment_id) {
        setAppointments(prev => prev.map(a => {
          if (a.id === existing.appointment_id) {
            return { ...a, payment_status: 'pending' };
          }
          return a;
        }));
      }
      // Remove any matching cash movement
      if (existing.receipt_number) {
        setCashMovements(prev => prev.filter(m => !m.concept.includes(existing.receipt_number)));
      }
    }
    setPayments(prev => prev.filter(p => p.id !== paymentId));
    deletePaymentFromFirestore(paymentId);
  };

  const voidPayment = (paymentId: string, reason?: string) => {
    setPayments(prev => prev.map(p => {
      if (p.id === paymentId) {
        // If it was linked to an appointment, revert appointment payment status to pending
        if (p.appointment_id) {
          setAppointments(curr => curr.map(a => a.id === p.appointment_id ? { ...a, payment_status: 'pending' } : a));
        }

        // If it was cash, register an expense / counter-movement
        if (p.method === 'cash') {
          const voidMov: CashMovement = {
            id: `mov-void-${Date.now()}`,
            type: 'expense',
            category: 'withdrawal',
            amount: p.amount,
            concept: `Anulación cobro ${p.receipt_number} (${reason || 'Error de emisión'})`,
            method: 'cash',
            created_at: new Date().toISOString(),
            registered_by: 'Caja',
            notes: reason
          };
          setCashMovements(curr => [voidMov, ...curr]);
        }

        const updatedPayment: PaymentRecord = {
          ...p,
          status: 'voided',
          notes: `${p.notes || ''} [Anulado: ${reason || 'Sin motivo especificado'}]`.trim()
        };
        savePaymentToFirestore(updatedPayment);
        return updatedPayment;
      }
      return p;
    }));
  };

  const verifyAppointmentDeposit = (appointmentId: string, verified: boolean) => {
    setAppointments(prev => prev.map(a => {
      if (a.id === appointmentId) {
        const updated: Appointment = {
          ...a,
          deposit_verified: verified,
          payment_status: verified ? 'partial' : a.payment_status
        };
        saveAppointmentToFirestore(updated);
        return updated;
      }
      return a;
    }));
  };

  const openCashRegister = (openingCash: number, notes?: string) => {
    const today = new Date().toISOString().split('T')[0];
    const newReg: CashRegister = {
      id: `cash-${Date.now()}`,
      date: today,
      status: 'open',
      opening_cash: openingCash,
      opened_at: new Date().toISOString(),
      notes
    };
    setCashRegister(newReg);

    const mov: CashMovement = {
      id: `mov-${Date.now()}`,
      type: 'income',
      category: 'opening',
      amount: openingCash,
      concept: 'Apertura de caja / Fondo inicial',
      method: 'cash',
      created_at: new Date().toISOString(),
      registered_by: 'Administración',
      notes
    };
    setCashMovements(prev => [mov, ...prev]);
  };

  const closeCashRegister = (closingCash: number, notes?: string) => {
    setCashRegister(prev => ({
      ...prev,
      status: 'closed',
      closing_cash: closingCash,
      closed_at: new Date().toISOString(),
      notes: notes || prev.notes
    }));
  };

  const addCashMovement = (data: Omit<CashMovement, 'id' | 'created_at'>): CashMovement => {
    const id = `mov-${Date.now()}`;
    const newMov: CashMovement = {
      ...data,
      id,
      created_at: new Date().toISOString()
    };
    setCashMovements(prev => [newMov, ...prev]);
    return newMov;
  };

  const updateCashMovement = (movementId: string, updates: Partial<CashMovement>) => {
    setCashMovements(prev => prev.map(m => m.id === movementId ? { ...m, ...updates } : m));
  };

  const deleteCashMovement = (movementId: string) => {
    setCashMovements(prev => prev.filter(m => m.id !== movementId));
  };

  const resetToDemoData = () => {
    setPracticeSettings(INITIAL_PRACTICE_SETTINGS);
    setServices(INITIAL_SERVICES);
    setAvailability(INITIAL_AVAILABILITY);
    setPatients(INITIAL_PATIENTS);
    setAppointments(getInitialAppointments());
    setConversations(INITIAL_CONVERSATIONS);
    setWaitlist(INITIAL_WAITLIST);
    setReminderConfig(DEFAULT_REMINDER_CONFIG);
    setReminderLogs(INITIAL_REMINDER_LOGS);
    setPayments(INITIAL_PAYMENTS);
    setCashRegister(INITIAL_CASH_REGISTER);
    setCashMovements(INITIAL_CASH_MOVEMENTS);
    setConsultations(INITIAL_CONSULTATIONS);
    setSaasTenants(DEMO_SAAS_TENANTS);
    localStorage.clear();
  };

  // Consultations & Voice Notes Operations
  const addConsultation = (data: Omit<ConsultationRecord, 'id' | 'created_at'>): ConsultationRecord => {
    const newRecord: ConsultationRecord = {
      ...data,
      id: `cons-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      created_at: new Date().toISOString()
    };
    setConsultations(prev => [newRecord, ...prev]);
    saveConsultationToFirestore(newRecord);
    return newRecord;
  };

  const updateConsultation = (id: string, updates: Partial<ConsultationRecord>) => {
    setConsultations(prev => prev.map(c => {
      if (c.id === id) {
        const updated = { ...c, ...updates, updated_at: new Date().toISOString() };
        saveConsultationToFirestore(updated);
        return updated;
      }
      return c;
    }));
  };

  const deleteConsultation = (id: string) => {
    setConsultations(prev => prev.filter(c => c.id !== id));
    deleteConsultationFromFirestore(id);
  };

  const addVoiceNoteToConsultation = (consultationId: string, voiceNote: Omit<VoiceNote, 'id' | 'recorded_at'>): VoiceNote => {
    const newVN: VoiceNote = {
      ...voiceNote,
      id: `vn-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      recorded_at: new Date().toISOString()
    };
    setConsultations(prev => prev.map(c => {
      if (c.id === consultationId) {
        return {
          ...c,
          voice_notes: [newVN, ...(c.voice_notes || [])]
        };
      }
      return c;
    }));
    return newVN;
  };

  return (
    <AgendaStoreContext.Provider value={{
      appointments,
      patients,
      services,
      availability,
      practiceSettings,
      conversations,
      waitlist,
      reminderConfig,
      reminderLogs,
      payments,
      cashRegister,
      cashMovements,
      consultations,
      addAppointment,
      updateAppointment,
      deleteAppointment,
      addPatient,
      updatePatient,
      deletePatient,
      addService,
      updateService,
      deleteService,
      updateAvailability,
      updatePracticeSettings,
      addChatMessage,
      createConversation,
      toggleAiHandled,
      addWaitlistEntry,
      updateWaitlistEntry,
      deleteWaitlistEntry,
      notifyWaitlistEntry,
      updateReminderConfig,
      sendWhatsAppReminder,
      sendEmailReminder,
      confirmAppointmentByPatient,
      runAutomatedRemindersScan,
      formatReminderText,
      addPayment,
      updatePayment,
      deletePayment,
      voidPayment,
      openCashRegister,
      closeCashRegister,
      addCashMovement,
      updateCashMovement,
      deleteCashMovement,
      verifyAppointmentDeposit,
      addConsultation,
      updateConsultation,
      deleteConsultation,
      addVoiceNoteToConsultation,
      currentUser,
      isAuthenticated: Boolean(currentUser),
      isAuthLoading,
      loginWithGoogle,
      loginWithEmail,
      registerWithEmail,
      loginAsDemo,
      logout,
      switchUserRole,
      saasTenants,
      updateSaasTenant,
      deleteSaasTenant,
      extendUserTrial,
      grantUserPlan,
      // Notifications
      notifications,
      unreadNotificationsCount: notifications.filter(n => !n.read).length,
      notificationPermission,
      activeToastNotification,
      requestBrowserNotificationPermission,
      testBrowserNotification,
      markNotificationAsRead,
      markNotificationAsUnread,
      markAllNotificationsAsRead,
      deleteNotification,
      clearReadNotifications,
      clearNotifications,
      dismissToastNotification,
      triggerNotification,
      // Example data management
      hasExampleData,
      clearExampleData,
      isExampleItem,
      deleteReminderLog,
      clearAllReminderLogs,
      clearAllPendingAppointments,
      resetToDemoData
    }}>
      {children}
    </AgendaStoreContext.Provider>
  );
};

export const useAgendaStore = () => {
  const context = useContext(AgendaStoreContext);
  if (!context) {
    throw new Error('useAgendaStore must be used within an AgendaStoreProvider');
  }
  return context;
};
