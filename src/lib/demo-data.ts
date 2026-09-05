import {
  Service,
  Patient,
  Appointment,
  DayAvailability,
  PracticeSettings,
  Conversation,
  WaitlistEntry,
  ReminderConfig,
  ReminderLog,
  PaymentRecord,
  CashRegister,
  CashMovement,
  ConsultationRecord,
  MedicalPrescription,
  MedicalCertificate,
  VoiceNote
} from '../types';

export const INITIAL_PRACTICE_SETTINGS: PracticeSettings = {
  practice_name: "Consultorio Dr. Gonzalo Corat",
  handle: "dr-corat",
  professional_name: "Dr. Gonzalo Corat",
  professional_title: "Odontología & Estética Dental",
  medical_license: "M.N. 142.890 / M.P. 45.210",
  specialty: "Odontología Integral e Implantes",
  phone: "+54 9 11 4589-2311",
  whatsapp_number: "+54 9 11 5566-7788",
  email: "gonzalocorat@gmail.com",
  address: "Av. Santa Fe 3200, Piso 4 B",
  city: "Palermo, Buenos Aires",
  currency: "ARS",
  bot_assistant_name: "Sofía (IA)",
  bot_tone: "cálido, empático y resolutivo",
  bot_enabled: true,
  page_color: "#0284c7", // Sky blue profesional
  welcome_message: "¡Hola! Soy Sofía, asistente virtual de AgendaPro AI. Puedo ayudarte a conocer nuestros tratamientos, aranceles o coordinar tu próximo turno.",
  auto_confirm_bookings: true,
  allow_telemedicine: true
};

export const INITIAL_SERVICES: Service[] = [
  {
    id: "srv-1",
    name: "Consulta y Diagnóstico Inicial",
    price: 18000,
    duration_minutes: 30,
    description: "Evaluación clínica integral, odontograma y plan de tratamiento personalizado con Rx digital.",
    color: "#0284c7",
    active: true,
    category: "Diagnóstico"
  },
  {
    id: "srv-2",
    name: "Limpieza Profunda & Profilaxis Ultrasonido",
    price: 32000,
    duration_minutes: 45,
    description: "Eliminación de sarro supra y subgingival con ultrasonido, pulido coronario y fluoración.",
    color: "#0d9488",
    active: true,
    category: "Prevención"
  },
  {
    id: "srv-3",
    name: "Blanqueamiento Dental Láser LED",
    price: 85000,
    duration_minutes: 60,
    description: "Sesión completa en consultorio con gel fotoactivado de última generación. Resultados inmediatos.",
    color: "#8b5cf6",
    active: true,
    category: "Estética"
  },
  {
    id: "srv-4",
    name: "Restauración Estética con Resina",
    price: 38000,
    duration_minutes: 45,
    description: "Tratamiento de caries o fracturas con resinas nanoparticuladas de alta resistencia y mimetismo estético.",
    color: "#f59e0b",
    active: true,
    category: "Operatoria"
  },
  {
    id: "srv-5",
    name: "Consulta Telemedicina / Videollamada",
    price: 15000,
    duration_minutes: 20,
    description: "Teleconsulta para orientación, seguimiento post-operatorio o lectura de estudios.",
    color: "#ec4899",
    active: true,
    category: "Online"
  }
];

export const INITIAL_AVAILABILITY: DayAvailability[] = [
  { day_of_week: 1, enabled: true, start_time: "09:00", end_time: "19:00", break_start: "13:00", break_end: "14:00" }, // Lunes
  { day_of_week: 2, enabled: true, start_time: "09:00", end_time: "19:00", break_start: "13:00", break_end: "14:00" }, // Martes
  { day_of_week: 3, enabled: true, start_time: "09:00", end_time: "19:00", break_start: "13:00", break_end: "14:00" }, // Miércoles
  { day_of_week: 4, enabled: true, start_time: "09:00", end_time: "19:00", break_start: "13:00", break_end: "14:00" }, // Jueves
  { day_of_week: 5, enabled: true, start_time: "09:00", end_time: "18:00", break_start: "13:00", break_end: "14:00" }, // Viernes
  { day_of_week: 6, enabled: true, start_time: "09:30", end_time: "13:30" }, // Sábado medio día
  { day_of_week: 0, enabled: false, start_time: "10:00", end_time: "14:00" } // Domingo cerrado
];

export const INITIAL_PATIENTS: Patient[] = [
  {
    id: "pat-1",
    first_name: "Valentina",
    last_name: "Rossi",
    phone: "+54 9 11 6721-9988",
    email: "valentina.rossi@email.com",
    dni: "38.921.450",
    birth_date: "1995-04-12",
    notes: "Paciente con sensibilidad gingival leve en premolares. Prefiere anestesia tópica antes de ultrasonido.",
    tags: ["Particular", "Estética"],
    total_appointments: 4,
    created_at: "2024-02-15T10:00:00Z"
  },
  {
    id: "pat-2",
    first_name: "Matías",
    last_name: "Albarracín",
    phone: "+54 9 11 5102-4433",
    email: "matias.albarracin@gmail.com",
    dni: "34.128.902",
    birth_date: "1988-11-23",
    notes: "Inició plan de tratamiento de ortodoncia invisible. Control cada 3 semanas.",
    tags: ["OSDE", "Ortodoncia"],
    total_appointments: 6,
    created_at: "2024-01-10T14:30:00Z"
  },
  {
    id: "pat-3",
    first_name: "Camila",
    last_name: "Benítez",
    phone: "+54 9 11 4490-8812",
    email: "camibenitez@hotmail.com",
    dni: "41.050.211",
    birth_date: "1998-07-09",
    notes: "Turno reservado a través del bot inteligente de WhatsApp.",
    tags: ["Swiss Medical", "Nuevo"],
    total_appointments: 1,
    created_at: "2024-03-01T09:15:00Z"
  },
  {
    id: "pat-4",
    first_name: "Esteban",
    last_name: "Morales",
    phone: "+54 9 11 3322-7711",
    email: "esteban.morales@tech.ar",
    dni: "31.450.880",
    birth_date: "1985-09-30",
    notes: "Turno de videollamada para revisión post extracción quirúrgica.",
    tags: ["Telemedicina"],
    total_appointments: 3,
    created_at: "2024-01-20T11:00:00Z"
  }
];

export function getInitialAppointments(): Appointment[] {
  const now = new Date();
  
  // Helper to format ISO datetime at given offset from today and specific hour
  const makeDate = (daysOffset: number, hours: number, minutes: number = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() + daysOffset);
    d.setHours(hours, minutes, 0, 0);
    return d.toISOString();
  };

  return [
    {
      id: "apt-1",
      patient_id: "pat-1",
      patient_name: "Valentina Rossi",
      patient_phone: "+54 9 11 6721-9988",
      patient_email: "valentina.rossi@email.com",
      service_id: "srv-2",
      service_name: "Limpieza Profunda & Profilaxis Ultrasonido",
      service_price: 32000,
      start_datetime: makeDate(0, 10, 0),
      end_datetime: makeDate(0, 10, 45),
      status: "confirmed",
      payment_status: "paid",
      notes: "Confirmado por WhatsApp. Recordatorio enviado.",
      origin: "bot_whatsapp",
      reminder_24h_sent: true,
      reminder_24h_sent_at: makeDate(-1, 10, 0),
      reminder_2h_sent: true,
      reminder_2h_sent_at: makeDate(0, 8, 0),
      email_reminder_sent: true,
      email_reminder_sent_at: makeDate(-1, 10, 0),
      patient_confirmed: true,
      patient_confirmed_at: makeDate(-1, 10, 15)
    },
    {
      id: "apt-2",
      patient_id: "pat-2",
      patient_name: "Matías Albarracín",
      patient_phone: "+54 9 11 5102-4433",
      patient_email: "matias.albarracin@gmail.com",
      service_id: "srv-4",
      service_name: "Restauración Estética con Resina",
      service_price: 38000,
      start_datetime: makeDate(0, 11, 30),
      end_datetime: makeDate(0, 12, 15),
      status: "confirmed",
      payment_status: "pending",
      notes: "Pieza 1.4 vestibular.",
      origin: "manual",
      reminder_24h_sent: true,
      reminder_24h_sent_at: makeDate(-1, 11, 30),
      reminder_2h_sent: false,
      email_reminder_sent: true,
      email_reminder_sent_at: makeDate(-1, 11, 30),
      patient_confirmed: true,
      patient_confirmed_at: makeDate(-1, 12, 5)
    },
    {
      id: "apt-3",
      patient_id: "pat-3",
      patient_name: "Camila Benítez",
      patient_phone: "+54 9 11 4490-8812",
      patient_email: "camibenitez@hotmail.com",
      service_id: "srv-1",
      service_name: "Consulta y Diagnóstico Inicial",
      service_price: 18000,
      start_datetime: makeDate(0, 15, 0),
      end_datetime: makeDate(0, 15, 30),
      status: "pending",
      payment_status: "pending",
      notes: "Reserva realizada desde el link público web.",
      origin: "public_booking",
      reminder_24h_sent: false,
      reminder_2h_sent: false,
      email_reminder_sent: false,
      patient_confirmed: false
    },
    {
      id: "apt-4",
      patient_id: "pat-4",
      patient_name: "Esteban Morales",
      patient_phone: "+54 9 11 3322-7711",
      patient_email: "esteban.morales@tech.ar",
      service_id: "srv-5",
      service_name: "Consulta Telemedicina / Videollamada",
      service_price: 15000,
      start_datetime: makeDate(0, 16, 30),
      end_datetime: makeDate(0, 16, 50),
      status: "confirmed",
      payment_status: "paid",
      notes: "Videoconsulta de seguimiento.",
      origin: "telemedicine",
      meet_url: "https://meet.google.com/agd-pro-meet",
      reminder_24h_sent: true,
      reminder_24h_sent_at: makeDate(-1, 16, 30),
      reminder_2h_sent: false,
      email_reminder_sent: true,
      email_reminder_sent_at: makeDate(-1, 16, 30),
      patient_confirmed: true,
      patient_confirmed_at: makeDate(-1, 17, 0)
    },
    {
      id: "apt-5",
      patient_id: "pat-1",
      patient_name: "Valentina Rossi",
      patient_phone: "+54 9 11 6721-9988",
      service_id: "srv-3",
      service_name: "Blanqueamiento Dental Láser LED",
      service_price: 85000,
      start_datetime: makeDate(1, 10, 0),
      end_datetime: makeDate(1, 11, 0),
      status: "confirmed",
      payment_status: "pending",
      notes: "Segunda etapa de tratamiento.",
      origin: "manual"
    },
    {
      id: "apt-6",
      patient_id: "pat-3",
      patient_name: "Camila Benítez",
      patient_phone: "+54 9 11 4490-8812",
      service_id: "srv-2",
      service_name: "Limpieza Profunda & Profilaxis Ultrasonido",
      service_price: 32000,
      start_datetime: makeDate(2, 14, 0),
      end_datetime: makeDate(2, 14, 45),
      status: "confirmed",
      payment_status: "pending",
      notes: "Agendado.",
      origin: "bot_whatsapp"
    }
  ];
}

export const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: "conv-1",
    patient_name: "Camila Benítez",
    patient_phone: "+54 9 11 4490-8812",
    last_message: "Perfecto Sofía, ahí ya quedó agendado para las 15:00 hs. Muchas gracias!",
    last_message_time: "10:42",
    unread_count: 0,
    ai_handled: true,
    messages: [
      {
        id: "msg-1",
        role: "user",
        content: "Hola! Quería consultar cuánto sale la consulta inicial y si atienden por la tarde esta semana.",
        timestamp: "10:38"
      },
      {
        id: "msg-2",
        role: "assistant",
        content: "¡Hola Camila! 😊 Con mucho gusto. La Consulta y Diagnóstico Inicial tiene un arancel de $18.000 (incluye evaluación clínica completa y Rx digital). Atendemos de lunes a viernes de 09:00 a 19:00 hs.\n\nPara hoy mismo o mañana tenemos disponibilidad disponible a las 15:00 o 16:30 hs. ¿Te gustaría que te reserve alguno?",
        timestamp: "10:39"
      },
      {
        id: "msg-3",
        role: "user",
        content: "Sí por favor, hoy a las 15:00 me queda perfecto!",
        timestamp: "10:40"
      },
      {
        id: "msg-4",
        role: "assistant",
        content: "¡Excelente! Ya te he agendado para hoy a las 15:00 hs con el Dr. Gonzalo Corat en Av. Santa Fe 3200, Piso 4 B.\n\nTe esperamos 10 minutos antes. Te llegará el recordatorio por este mismo medio.",
        timestamp: "10:41",
        actionTaken: {
          type: "appointment_created",
          appointmentId: "apt-3",
          details: "Consulta Inicial hoy 15:00 hs"
        }
      },
      {
        id: "msg-5",
        role: "user",
        content: "Perfecto Sofía, ahí ya quedó agendado para las 15:00 hs. Muchas gracias!",
        timestamp: "10:42"
      }
    ]
  },
  {
    id: "conv-2",
    patient_name: "Matías Albarracín",
    patient_phone: "+54 9 11 5102-4433",
    last_message: "Hola Dr., le confirmo que llego puntual a las 11:30.",
    last_message_time: "09:15",
    unread_count: 1,
    ai_handled: false,
    messages: [
      {
        id: "m-1",
        role: "assistant",
        content: "Hola Matías! Te recordamos tu turno de hoy a las 11:30 hs para Restauración Estética. Por favor respóndenos para confirmar tu asistencia.",
        timestamp: "08:30"
      },
      {
        id: "m-2",
        role: "user",
        content: "Hola Dr., le confirmo que llego puntual a las 11:30.",
        timestamp: "09:15"
      }
    ]
  }
];

export const INITIAL_WAITLIST: WaitlistEntry[] = [
  {
    id: "wait-1",
    patient_name: "Camila Navarro",
    patient_phone: "+54 9 11 6390-1122",
    patient_email: "camila.navarro@gmail.com",
    service_id: "srv-3",
    service_name: "Blanqueamiento Dental Láser LED",
    preferred_days: ["Martes", "Jueves", "Viernes"],
    preferred_time_range: "afternoon",
    priority: "urgent",
    status: "waiting",
    notes: "Tiene un evento el fin de semana, solicita turno con urgencia si alguien cancela.",
    created_at: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: "wait-2",
    patient_name: "Ignacio Ferreyra",
    patient_phone: "+54 9 11 4488-9900",
    patient_email: "ignacio.f@hotmail.com",
    service_id: "srv-2",
    service_name: "Limpieza Profunda & Profilaxis Ultrasonido",
    preferred_days: ["Lunes", "Miércoles"],
    preferred_time_range: "morning",
    priority: "high",
    status: "waiting",
    notes: "Disponible de 09:00 a 13:00 hs cualquier lunes o miércoles.",
    created_at: new Date(Date.now() - 86400000 * 3).toISOString()
  },
  {
    id: "wait-3",
    patient_name: "Florencia Soria",
    patient_phone: "+54 9 11 3344-5566",
    service_id: "srv-1",
    service_name: "Consulta y Diagnóstico Inicial",
    preferred_days: ["Viernes", "Sábado"],
    preferred_time_range: "any",
    priority: "normal",
    status: "waiting",
    notes: "Prefiere fines de semana o viernes a última hora.",
    created_at: new Date(Date.now() - 86400000 * 1).toISOString()
  },
  {
    id: "wait-4",
    patient_name: "Lucas Benítez",
    patient_phone: "+54 9 11 7711-2244",
    service_id: "srv-4",
    service_name: "Restauración Estética con Resina",
    preferred_days: ["Miércoles", "Jueves"],
    preferred_time_range: "afternoon",
    priority: "normal",
    status: "notified",
    notes: "Se le avisó de posible hueco el miércoles a las 16hs.",
    created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    notified_at: new Date(Date.now() - 3600000 * 5).toISOString()
  }
];

export const DEFAULT_REMINDER_CONFIG: ReminderConfig = {
  whatsapp_enabled: true,
  email_enabled: true,
  send_24h_before: true,
  send_2h_before: true,
  require_confirmation: true,
  auto_update_status_on_confirm: true,
  sender_email_alias: "Dr. Gonzalo Corat - AgendaPro AI",
  whatsapp_template_24h: "¡Hola {paciente}! Te recordamos tu turno de *{servicio}* programado para mañana *{fecha}* a las *{hora} hs* con {profesional} en {direccion}.\n\nPara confirmar tu asistencia, responde *1* a este mensaje o haz clic aquí:\n👉 {link_confirmar}\n\nSi necesitas reprogramar, responde *2*.\n¡Muchas gracias!",
  whatsapp_template_2h: "Hola {paciente}, te esperamos hoy a las *{hora} hs* en {direccion} para tu atención de *{servicio}*. Si tienes algún imprevisto, avísanos con antelación.",
  email_subject_24h: "Recordatorio de Turno: {servicio} - Mañana {hora} hs ({consultorio})",
  email_body_24h: "Estimado/a {paciente},\n\nLe recordamos su próximo turno programado en {consultorio} con {profesional}.\n\n📅 Fecha: {fecha}\n⏰ Hora: {hora} hs\n🩺 Tratamiento: {servicio}\n📍 Dirección: {direccion}, {ciudad}\n\nPara confirmar su asistencia y conservar su lugar reservado, por favor haga clic en el botón a continuación:\n\n{boton_confirmar}\n\nAnte cualquier consulta o necesidad de reprogramación, puede responder a este correo o comunicarse a nuestro WhatsApp {whatsapp}.\n\nAtentamente,\nEquipo de {consultorio}",
  email_subject_2h: "Aviso de turno hoy: {servicio} a las {hora} hs en {consultorio}",
  email_body_2h: "Hola {paciente},\n\nLe recordamos que su turno es hoy a las {hora} hs ({servicio}) en {direccion}.\n\nPor favor procure llegar con 5 minutos de anticipación.\n\n¡Le esperamos en {consultorio}!"
};

export const INITIAL_REMINDER_LOGS: ReminderLog[] = [
  {
    id: "log-1",
    appointment_id: "apt-1",
    patient_name: "Valentina Rossi",
    patient_phone: "+54 9 11 6721-9988",
    patient_email: "valentina.rossi@email.com",
    channel: "whatsapp",
    timing: "24h",
    status: "delivered",
    sent_at: new Date(Date.now() - 86400000).toISOString(),
    appointment_datetime: new Date().toISOString(),
    service_name: "Limpieza Profunda & Profilaxis Ultrasonido",
    message_preview: "¡Hola Valentina Rossi! Te recordamos tu turno de Limpieza Profunda...",
    confirmed: true
  },
  {
    id: "log-2",
    appointment_id: "apt-1",
    patient_name: "Valentina Rossi",
    patient_phone: "+54 9 11 6721-9988",
    patient_email: "valentina.rossi@email.com",
    channel: "email",
    timing: "24h",
    status: "sent",
    sent_at: new Date(Date.now() - 86400000).toISOString(),
    appointment_datetime: new Date().toISOString(),
    service_name: "Limpieza Profunda & Profilaxis Ultrasonido",
    message_preview: "Estimada Valentina Rossi, Le recordamos su próximo turno...",
    confirmed: true
  },
  {
    id: "log-3",
    appointment_id: "apt-2",
    patient_name: "Matías Albarracín",
    patient_phone: "+54 9 11 5102-4433",
    patient_email: "matias.albarracin@gmail.com",
    channel: "whatsapp",
    timing: "24h",
    status: "delivered",
    sent_at: new Date(Date.now() - 86400000).toISOString(),
    appointment_datetime: new Date().toISOString(),
    service_name: "Restauración Estética con Resina",
    message_preview: "¡Hola Matías Albarracín! Te recordamos tu turno...",
    confirmed: true
  },
  {
    id: "log-4",
    appointment_id: "apt-4",
    patient_name: "Esteban Morales",
    patient_phone: "+54 9 11 3322-7711",
    patient_email: "esteban.morales@tech.ar",
    channel: "email",
    timing: "24h",
    status: "sent",
    sent_at: new Date(Date.now() - 86400000).toISOString(),
    appointment_datetime: new Date().toISOString(),
    service_name: "Consulta Telemedicina / Videollamada",
    message_preview: "Estimado Esteban Morales, Le recordamos su turno de videoconsulta...",
    confirmed: true
  }
];

export const INITIAL_PAYMENTS: PaymentRecord[] = [
  {
    id: "pay-1",
    receipt_number: "REC-00101",
    appointment_id: "apt-1",
    patient_id: "pat-1",
    patient_name: "Valentina Rossi",
    patient_phone: "+54 9 11 6721-9988",
    patient_dni: "38.291.442",
    amount: 32000,
    method: "transfer",
    concept: "Limpieza Profunda & Profilaxis Ultrasonido",
    service_name: "Limpieza Profunda & Profilaxis Ultrasonido",
    date: new Date(Date.now() - 7200000).toISOString(),
    notes: "Comprobante bancario recibido vía WhatsApp.",
    status: "completed"
  },
  {
    id: "pay-2",
    receipt_number: "REC-00102",
    appointment_id: "apt-4",
    patient_id: "pat-4",
    patient_name: "Esteban Morales",
    patient_phone: "+54 9 11 3322-7711",
    patient_dni: "35.109.821",
    amount: 15000,
    method: "mercado_pago",
    concept: "Consulta Telemedicina / Videollamada",
    service_name: "Consulta Telemedicina / Videollamada",
    date: new Date(Date.now() - 14400000).toISOString(),
    notes: "Abonado con link de pago Mercado Pago.",
    status: "completed"
  },
  {
    id: "pay-3",
    receipt_number: "REC-00103",
    patient_id: "pat-5",
    patient_name: "Luciana Varela",
    patient_phone: "+54 9 11 6023-1199",
    patient_dni: "41.882.310",
    amount: 18000,
    method: "cash",
    concept: "Consulta y Diagnóstico Inicial",
    service_name: "Consulta y Diagnóstico Inicial",
    date: new Date(Date.now() - 18000000).toISOString(),
    notes: "Abonado en recepción al ingresar.",
    status: "completed"
  },
  {
    id: "pay-4",
    receipt_number: "REC-00104",
    patient_id: "pat-2",
    patient_name: "Matías Albarracín",
    patient_phone: "+54 9 11 5102-4433",
    patient_dni: "33.450.198",
    amount: 28000,
    method: "card_debit",
    concept: "Restauración Estética con Resina",
    service_name: "Restauración Estética con Resina",
    date: new Date(Date.now() - 86400000).toISOString(),
    notes: "Tarjeta Débito Visa Banco Galicia.",
    status: "completed"
  }
];

export const INITIAL_CASH_REGISTER: CashRegister = {
  id: "cash-today",
  date: new Date().toISOString().split('T')[0],
  status: "open",
  opening_cash: 25000,
  opened_at: new Date(new Date().setHours(8, 30, 0, 0)).toISOString(),
  notes: "Caja chica abierta para cambio y gastos menores."
};

export const INITIAL_CASH_MOVEMENTS: CashMovement[] = [
  {
    id: "mov-1",
    type: "income",
    category: "opening",
    amount: 25000,
    concept: "Fondo inicial de caja chica",
    method: "cash",
    created_at: new Date(new Date().setHours(8, 30, 0, 0)).toISOString(),
    registered_by: "Recepción",
    notes: "Billetes para cambio"
  },
  {
    id: "mov-2",
    type: "income",
    category: "payment",
    amount: 18000,
    concept: "Cobro REC-00103 Luciana Varela",
    method: "cash",
    created_at: new Date(Date.now() - 18000000).toISOString(),
    registered_by: "Recepción"
  },
  {
    id: "mov-3",
    type: "expense",
    category: "supplies",
    amount: 4500,
    concept: "Compra de insumos de esterilización y agua mineral",
    method: "cash",
    created_at: new Date(Date.now() - 10800000).toISOString(),
    registered_by: "Asistente dental",
    notes: "Factura B Farmacia San Martín"
  }
];

export const INITIAL_CONSULTATIONS: ConsultationRecord[] = [
  {
    id: "cons-1",
    patient_id: "pat-1",
    patient_name: "Valentina Rossi",
    appointment_id: "apt-1",
    service_name: "Limpieza Profunda & Profilaxis Ultrasonido",
    date: new Date().toISOString(),
    reason_for_visit: "Control periodontal periódico y profilaxis dental",
    vital_signs: {
      blood_pressure: "118/75",
      heart_rate: "70 bpm",
      temperature: "36.5 °C",
      weight_kg: "58",
      height_cm: "165"
    },
    soap_subjective: "Paciente de 32 años asiste a su control programado. Refiere sangrado leve durante el cepillado en el sector anteroinferior desde hace aproximadamente 2 semanas. Niega dolor espontáneo, movilidad dental o hipersensibilidad al frío/calor.",
    soap_objective: "Gingivitis marginal inducida por biopelícula en sector 3.1 a 4.2. Presencia de cálculo lingual supragingival moderado. Sondeo periodontal sin sacos patológicos (< 3mm). Ausencia de lesiones de caries activas. Se realiza destartraje ultrasónico completo y pulido coronario con pasta profiláctica fluorada.",
    soap_analysis: "Gingivitis marginal localizada asociada a acumulación de placa/tártaro. Estado periodontal general estable con buen pronóstico.",
    soap_plan: "1. Refuerzo de técnica de cepillado de Bass modificada con cepillo de cerdas ultrasuaves.\n2. Uso diario de hilo dental interproximal.\n3. Colutorio antiséptico con Clorhexidina al 0.12% durante 7 días (nocturno).\n4. Control clínico y mantenimiento en 6 meses.",
    voice_notes: [
      {
        id: "vn-1",
        audio_url: "demo://audio-note-1.webm",
        duration_seconds: 38,
        recorded_at: new Date().toISOString(),
        title: "Evolución clínica y plan profiláctico",
        transcription: "Paciente Valentina Rossi, 32 años. Realizamos destartraje con ultrasonido y pulido coronario. Presentaba sangrado leve en sector anteroinferior por placa bacteriana. Sin caries activas ni bolsas periodontales. Se le indicó colutorio de clorhexidina cero punto doce por siete días y técnica de cepillado suave. Próximo control en seis meses.",
        transcription_status: "ready",
        ai_summary: "Profilaxis ultrasónica exitosa. Gingivitis marginal leve tratada con clorhexidina 0.12% y refuerzo de técnica de higiene."
      }
    ],
    prescriptions: [
      {
        id: "rx-item-1",
        medication: "Clorhexidina 0.12% Colutorio Bucal",
        dosage: "Enjuague de 15 ml puro durante 60 segundos cada 12 hs",
        duration: "Durante 7 días",
        instructions: "Usar después del cepillado dental. No enjuagar con agua ni ingerir alimentos por 30 minutos."
      }
    ],
    certificates: [],
    professional_name: "Dr. Gonzalo Corat",
    medical_license: "M.N. 142.890 / M.P. 45.210",
    created_at: new Date().toISOString()
  },
  {
    id: "cons-2",
    patient_id: "pat-2",
    patient_name: "Mariano Castro",
    appointment_id: "apt-2",
    service_name: "Restauración Estética con Resina",
    date: new Date(Date.now() - 86400000 * 2).toISOString(),
    reason_for_visit: "Dolor pulsátil intenso en molar inferior izquierdo al masticar",
    vital_signs: {
      blood_pressure: "125/82",
      heart_rate: "78 bpm",
      temperature: "36.8 °C",
      weight_kg: "79",
      height_cm: "178"
    },
    soap_subjective: "Paciente de 38 años consulta por odontalgia pulsátil aguda en primer molar inferior izquierdo (pieza 3.6), de 48 horas de evolución, que se intensifica en decúbito y con estímulos térmicos calientes. Tomó paracetamol con alivio transitorio.",
    soap_objective: "Pieza 3.6 presenta restauración desadaptada con caries recidivante profunda oclusodistal. Dolor severo a la percusión vertical y horizontal. Respuesta muy aumentada y prolongada al test de frío. Radiografía periapical muestra compromiso cameral evidente y ensanchamiento del espacio periodontal apical.",
    soap_analysis: "Pulpitis irreversible sintomática con periodontitis apical sintomática en pieza 3.6.",
    soap_plan: "1. Anestesia infiltrativa y troncular (Articaína 4% con epinefrina 1:100.000).\n2. Apertura cameral de urgencia, aislamiento absoluto con dique de goma.\n3. Extirpación del tejido pulpar inflamado, instrumentación bio-mecánica preliminar y colocación de cura medicamentosa con hidróxido de calcio.\n4. Sellado temporal hermético con ionómero vítreo.\n5. Prescripción de esquema antibiótico y analgésico antiinflamatorio.\n6. Turno programado para sesión de endodoncia mecanizada en 7 días.",
    voice_notes: [
      {
        id: "vn-2",
        audio_url: "demo://audio-note-2.webm",
        duration_seconds: 47,
        recorded_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        title: "Urgencia endodóntica en pieza 3.6",
        transcription: "Paciente Mariano Castro. Acude por dolor pulsátil en pieza tres punto seis con diagnóstico de pulpitis irreversible sintomática. Se realizó apertura cameral, pulpectomía de urgencia bajo anestesia troncular, irrigación copiosa y medicación con pasta de hidróxido de calcio. Se indicó reposo médico por cuarenta y ocho horas y tratamiento con Amoxicilina más Clavulánico e Ibuprofeno seiscientos. Programamos cita para continuar el tratamiento de conducto.",
        transcription_status: "ready",
        ai_summary: "Apertura cameral y pulpectomía de urgencia en pieza 3.6. Indicado reposo de 48 hs, antibioticoterapia y analgesia."
      }
    ],
    prescriptions: [
      {
        id: "rx-item-2",
        medication: "Amoxicilina + Ácido Clavulánico 875/125 mg",
        dosage: "1 comprimido cada 12 horas",
        duration: "Durante 7 días completos",
        instructions: "Tomar al inicio de las comidas principales para minimizar molestias gástricas. No interrumpir."
      },
      {
        id: "rx-item-3",
        medication: "Ibuprofeno 600 mg",
        dosage: "1 comprimido cada 8 horas",
        duration: "Por 3 a 5 días según dolor",
        instructions: "Tomar junto con alimentos o un vaso completo de agua."
      }
    ],
    certificates: [
      {
        id: "cert-1",
        certificate_number: "CERT-2026-0012",
        patient_id: "pat-2",
        patient_name: "Mariano Castro",
        patient_dni: "34.128.902",
        type: "reposo",
        presented_to: "A quien corresponda",
        diagnosis: "Procedimiento odontológico quirúrgico invasivo de urgencia",
        rest_days: 2,
        start_date: new Date(Date.now() - 86400000 * 2).toISOString().split("T")[0],
        end_date: new Date(Date.now()).toISOString().split("T")[0],
        content: "Por la presente certifico que el paciente Mariano Castro, DNI 34.128.902, fue atendido en este consultorio realizándosele un procedimiento de urgencia endodóntica con anestesia troncular, requiriendo reposo laboral por el término de 48 (cuarenta y ocho) horas a partir de la fecha.",
        professional_name: "Dr. Gonzalo Corat",
        medical_license: "M.N. 142.890 / M.P. 45.210",
        date: new Date(Date.now() - 86400000 * 2).toISOString().split("T")[0]
      }
    ],
    professional_name: "Dr. Gonzalo Corat",
    medical_license: "M.N. 142.890 / M.P. 45.210",
    created_at: new Date(Date.now() - 86400000 * 2).toISOString()
  }
];



