import React, { createContext, useContext, useState, useEffect } from 'react';
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
  MedicalPrescriptionItem
} from '../types';
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
  INITIAL_CONSULTATIONS
} from './demo-data';

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
  voidPayment: (paymentId: string, reason?: string) => void;
  openCashRegister: (openingCash: number, notes?: string) => void;
  closeCashRegister: (closingCash: number, notes?: string) => void;
  addCashMovement: (data: Omit<CashMovement, 'id' | 'created_at'>) => CashMovement;

  // EHR & Clinical Consultations with Voice Notes
  consultations: ConsultationRecord[];
  addConsultation: (data: Omit<ConsultationRecord, 'id' | 'created_at'>) => ConsultationRecord;
  updateConsultation: (id: string, updates: Partial<ConsultationRecord>) => void;
  deleteConsultation: (id: string) => void;
  addVoiceNoteToConsultation: (consultationId: string, voiceNote: Omit<VoiceNote, 'id' | 'recorded_at'>) => VoiceNote;

  // Utilities
  resetToDemoData: () => void;
}

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
  CONSULTATIONS: 'agendapro_consultations_v1'
};

export const AgendaStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [practiceSettings, setPracticeSettings] = useState<PracticeSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return saved ? JSON.parse(saved) : INITIAL_PRACTICE_SETTINGS;
    } catch {
      return INITIAL_PRACTICE_SETTINGS;
    }
  });

  const [services, setServices] = useState<Service[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SERVICES);
      return saved ? JSON.parse(saved) : INITIAL_SERVICES;
    } catch {
      return INITIAL_SERVICES;
    }
  });

  const [availability, setAvailability] = useState<DayAvailability[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.AVAILABILITY);
      return saved ? JSON.parse(saved) : INITIAL_AVAILABILITY;
    } catch {
      return INITIAL_AVAILABILITY;
    }
  });

  const [patients, setPatients] = useState<Patient[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PATIENTS);
      return saved ? JSON.parse(saved) : INITIAL_PATIENTS;
    } catch {
      return INITIAL_PATIENTS;
    }
  });

  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.APPOINTMENTS);
      return saved ? JSON.parse(saved) : getInitialAppointments();
    } catch {
      return getInitialAppointments();
    }
  });

  const [conversations, setConversations] = useState<Conversation[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CONVERSATIONS);
      return saved ? JSON.parse(saved) : INITIAL_CONVERSATIONS;
    } catch {
      return INITIAL_CONVERSATIONS;
    }
  });

  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.WAITLIST);
      return saved ? JSON.parse(saved) : INITIAL_WAITLIST;
    } catch {
      return INITIAL_WAITLIST;
    }
  });

  const [reminderConfig, setReminderConfig] = useState<ReminderConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.REMINDER_CONFIG);
      return saved ? JSON.parse(saved) : DEFAULT_REMINDER_CONFIG;
    } catch {
      return DEFAULT_REMINDER_CONFIG;
    }
  });

  const [reminderLogs, setReminderLogs] = useState<ReminderLog[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.REMINDER_LOGS);
      return saved ? JSON.parse(saved) : INITIAL_REMINDER_LOGS;
    } catch {
      return INITIAL_REMINDER_LOGS;
    }
  });

  const [payments, setPayments] = useState<PaymentRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
      return saved ? JSON.parse(saved) : INITIAL_PAYMENTS;
    } catch {
      return INITIAL_PAYMENTS;
    }
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
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CASH_MOVEMENTS);
      return saved ? JSON.parse(saved) : INITIAL_CASH_MOVEMENTS;
    } catch {
      return INITIAL_CASH_MOVEMENTS;
    }
  });

  const [consultations, setConsultations] = useState<ConsultationRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CONSULTATIONS);
      return saved ? JSON.parse(saved) : INITIAL_CONSULTATIONS;
    } catch {
      return INITIAL_CONSULTATIONS;
    }
  });

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

  // Appointment Handlers
  const addAppointment = (data: Omit<Appointment, 'id'>): Appointment => {
    const id = `apt-${Date.now()}`;
    const newApt: Appointment = { ...data, id };
    
    setAppointments(prev => [newApt, ...prev]);

    // Update patient's appointment count
    setPatients(prev => prev.map(p => {
      if (p.id === data.patient_id) {
        return { ...p, total_appointments: (p.total_appointments || 0) + 1 };
      }
      return p;
    }));

    return newApt;
  };

  const updateAppointment = (id: string, updates: Partial<Appointment>) => {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  const deleteAppointment = (id: string) => {
    setAppointments(prev => prev.filter(a => a.id !== id));
  };

  // Patient Handlers
  const addPatient = (data: Omit<Patient, 'id' | 'created_at' | 'total_appointments'>): Patient => {
    const id = `pat-${Date.now()}`;
    const newPatient: Patient = {
      ...data,
      id,
      total_appointments: 0,
      created_at: new Date().toISOString()
    };
    setPatients(prev => [newPatient, ...prev]);
    return newPatient;
  };

  const updatePatient = (id: string, updates: Partial<Patient>) => {
    setPatients(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const deletePatient = (id: string) => {
    setPatients(prev => prev.filter(p => p.id !== id));
  };

  // Service Handlers
  const addService = (data: Omit<Service, 'id'>): Service => {
    const id = `srv-${Date.now()}`;
    const newService: Service = { ...data, id };
    setServices(prev => [...prev, newService]);
    return newService;
  };

  const updateService = (id: string, updates: Partial<Service>) => {
    setServices(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const deleteService = (id: string) => {
    setServices(prev => prev.filter(s => s.id !== id));
  };

  // Availability Handlers
  const updateAvailability = (newAvailability: DayAvailability[]) => {
    setAvailability(newAvailability);
  };

  // Practice Settings
  const updatePracticeSettings = (updates: Partial<PracticeSettings>) => {
    setPracticeSettings(prev => ({ ...prev, ...updates }));
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
    return newEntry;
  };

  const updateWaitlistEntry = (id: string, updates: Partial<WaitlistEntry>) => {
    setWaitlist(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w));
  };

  const deleteWaitlistEntry = (id: string) => {
    setWaitlist(prev => prev.filter(w => w.id !== id));
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

    return newPayment;
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

        return {
          ...p,
          status: 'voided',
          notes: `${p.notes || ''} [Anulado: ${reason || 'Sin motivo especificado'}]`.trim()
        };
      }
      return p;
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
    return newRecord;
  };

  const updateConsultation = (id: string, updates: Partial<ConsultationRecord>) => {
    setConsultations(prev => prev.map(c => c.id === id ? { ...c, ...updates, updated_at: new Date().toISOString() } : c));
  };

  const deleteConsultation = (id: string) => {
    setConsultations(prev => prev.filter(c => c.id !== id));
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
      voidPayment,
      openCashRegister,
      closeCashRegister,
      addCashMovement,
      addConsultation,
      updateConsultation,
      deleteConsultation,
      addVoiceNoteToConsultation,
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
