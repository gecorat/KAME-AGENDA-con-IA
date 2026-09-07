import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { Appointment, Patient, Service, PracticeSettings } from '../types';

// Workspace Scopes
export const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file'
];

// Initialize Firebase App safely (singleton)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
WORKSPACE_SCOPES.forEach(scope => provider.addScope(scope));
provider.setCustomParameters({
  prompt: 'consent',
  access_type: 'offline'
});

let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Auth state listener
export const initWorkspaceAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user && cachedAccessToken) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else if (!isSigningIn) {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const signInWithGoogleWorkspace = async (): Promise<{
  user: User;
  accessToken: string;
} | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('No se pudo obtener el token de acceso de Google');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Error al iniciar sesión con Google:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getWorkspaceAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const disconnectGoogleWorkspace = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

// ==========================================
// GOOGLE CALENDAR API INTEGRATION
// ==========================================

export interface GoogleCalendarEventItem {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  htmlLink?: string;
}

/**
 * Creates or updates an event in Google Calendar
 */
export const createGoogleCalendarEvent = async (
  appointment: Appointment,
  service?: Service,
  patient?: Patient,
  practiceSettings?: PracticeSettings
): Promise<{ success: boolean; eventId?: string; error?: string; htmlLink?: string }> => {
  const token = await getWorkspaceAccessToken();
  if (!token) {
    return { success: false, error: 'No se ha iniciado sesión con Google' };
  }

  try {
    const serviceName = service?.name || appointment.service_name || 'Consulta Médica';
    const patientName = patient ? `${patient.first_name} ${patient.last_name}` : appointment.patient_name;
    const summary = `${serviceName} - ${patientName} (Agenfacil)`;
    
    // Dates from ISO 8601
    const startDate = new Date(appointment.start_datetime);
    const endDate = new Date(appointment.end_datetime);

    const description = [
      `Paciente: ${patientName}`,
      `Teléfono: ${patient?.phone || appointment.patient_phone}`,
      patient?.insurance_company ? `Obra Social / Prepaga: ${patient.insurance_company}` : '',
      patient?.insurance_number ? `N° Afiliado: ${patient.insurance_number}` : '',
      `Servicio: ${serviceName}`,
      `Arancel: $${(service?.price || appointment.service_price).toLocaleString('es-AR')}`,
      appointment.notes ? `Notas: ${appointment.notes}` : '',
      `Sede / Consultorio: ${practiceSettings?.address || 'Consultorio Principal'}`,
      'Generado automáticamente por Agenfacil'
    ].filter(Boolean).join('\n');

    const eventPayload = {
      summary,
      description,
      start: {
        dateTime: startDate.toISOString(),
        timeZone: 'America/Argentina/Buenos_Aires'
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: 'America/Argentina/Buenos_Aires'
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 60 },
          { method: 'popup', minutes: 1440 } // 24 hours
        ]
      }
    };

    const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(eventPayload)
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || `Error HTTP ${res.status}`);
    }

    const data = await res.json();
    return {
      success: true,
      eventId: data.id,
      htmlLink: data.htmlLink
    };
  } catch (error: any) {
    console.error('Error creating Google Calendar event:', error);
    return { success: false, error: error.message || 'Error desconocido al crear evento' };
  }
};

/**
 * List upcoming events from Primary Google Calendar
 */
export const listGoogleCalendarEvents = async (
  timeMin?: string,
  timeMax?: string
): Promise<{ success: boolean; events?: GoogleCalendarEventItem[]; error?: string }> => {
  const token = await getWorkspaceAccessToken();
  if (!token) {
    return { success: false, error: 'No se ha iniciado sesión con Google' };
  }

  try {
    const min = timeMin || new Date().toISOString();
    const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
    url.searchParams.append('timeMin', min);
    if (timeMax) url.searchParams.append('timeMax', timeMax);
    url.searchParams.append('singleEvents', 'true');
    url.searchParams.append('orderBy', 'startTime');
    url.searchParams.append('maxResults', '50');

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || `Error HTTP ${res.status}`);
    }

    const data = await res.json();
    return {
      success: true,
      events: data.items || []
    };
  } catch (error: any) {
    console.error('Error listing Google Calendar events:', error);
    return { success: false, error: error.message };
  }
};

// ==========================================
// GOOGLE SHEETS API INTEGRATION
// ==========================================

export interface ExportSpreadsheetResult {
  success: boolean;
  spreadsheetId?: string;
  spreadsheetUrl?: string;
  error?: string;
}

/**
 * Creates a brand new Google Spreadsheet with 2 tabs:
 * 1. "Pacientes": Complete medical directory
 * 2. "Turnos & Cobros": Complete appointment history and billing log
 */
export const exportDataToGoogleSheets = async (
  patients: Patient[],
  appointments: Appointment[],
  services: Service[],
  practiceSettings: PracticeSettings
): Promise<ExportSpreadsheetResult> => {
  const token = await getWorkspaceAccessToken();
  if (!token) {
    return { success: false, error: 'No se ha iniciado sesión con Google' };
  }

  try {
    const dateStamp = new Date().toLocaleDateString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).replace(/\//g, '-');

    const title = `Agenfacil - Backup y Reporte (${practiceSettings.practice_name}) - ${dateStamp}`;

    // 1. Create Spreadsheet
    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: { title },
        sheets: [
          { properties: { title: 'Turnos y Cobros' } },
          { properties: { title: 'Directorio de Pacientes' } }
        ]
      })
    });

    if (!createRes.ok) {
      const errData = await createRes.json().catch(() => ({}));
      throw new Error(errData.error?.message || `Error HTTP ${createRes.status}`);
    }

    const createdSheet = await createRes.json();
    const spreadsheetId = createdSheet.spreadsheetId;
    const spreadsheetUrl = createdSheet.spreadsheetUrl;

    // 2. Prepare Data for Turnos y Cobros
    const appointmentRows: (string | number)[][] = [
      ['ID', 'Fecha', 'Hora', 'Paciente', 'Teléfono', 'Servicio', 'Estado', 'Arancel ($)', 'Notas', 'Estado de Pago']
    ];

    appointments.forEach(app => {
      const serv = services.find(s => s.id === app.service_id);
      const startD = new Date(app.start_datetime);
      const dateStr = startD.toISOString().split('T')[0];
      const timeStr = `${startD.getHours().toString().padStart(2, '0')}:${startD.getMinutes().toString().padStart(2, '0')}`;
      appointmentRows.push([
        app.id,
        dateStr,
        timeStr,
        app.patient_name,
        app.patient_phone,
        serv?.name || app.service_name || 'Consulta General',
        app.status === 'confirmed' ? 'Confirmado' : app.status === 'completed' ? 'Atendido' : app.status === 'cancelled' ? 'Cancelado' : 'Pendiente',
        app.service_price || serv?.price || 0,
        app.notes || '',
        app.payment_status === 'paid' ? 'Cobrado' : 'Pendiente'
      ]);
    });

    // 3. Prepare Data for Pacientes
    const patientRows: (string | number)[][] = [
      ['ID', 'Nombre Completo', 'DNI / Identificación', 'Teléfono', 'Email', 'Obra Social / Prepaga', 'N° Afiliado', 'Alergias / Notas', 'Fecha de Alta']
    ];

    patients.forEach(pat => {
      patientRows.push([
        pat.id,
        `${pat.first_name} ${pat.last_name}`,
        pat.dni || 'S/D',
        pat.phone,
        pat.email || 'S/D',
        pat.insurance_company || 'Particular',
        pat.insurance_number || '',
        [Array.isArray(pat.allergies) ? pat.allergies.join(', ') : '', pat.notes].filter(Boolean).join('; '),
        pat.created_at ? new Date(pat.created_at).toLocaleDateString('es-AR') : 'Sin registrar'
      ]);
    });

    // 4. Populate values
    const populateTurnosRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'Turnos y Cobros'!A1:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ values: appointmentRows })
      }
    );

    if (!populateTurnosRes.ok) {
      console.warn('Failed populating Turnos sheet');
    }

    const populatePacientesRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'Directorio de Pacientes'!A1:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ values: patientRows })
      }
    );

    if (!populatePacientesRes.ok) {
      console.warn('Failed populating Pacientes sheet');
    }

    return {
      success: true,
      spreadsheetId,
      spreadsheetUrl
    };
  } catch (error: any) {
    console.error('Error exporting to Google Sheets:', error);
    return { success: false, error: error.message || 'Error al exportar a Google Sheets' };
  }
};
