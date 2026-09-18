import { Appointment, PracticeSettings, Service } from '../types';

export interface FormatConfirmationOptions {
  /**
   * De donde salio el turno. Cambia solo el saludo:
   * 'whatsapp' -> "¡Buenisimo {paciente}! Tu turno quedo agendado..."
   * 'pagina' (o sin especificar) -> "¡Hola {paciente}! Queria recordarte que tu turno quedo agendado..."
   */
  origen?: 'pagina' | 'whatsapp';
  /**
   * If true or if patientName is in greeting:
   * "¡Hola Mauricio Macri! 👋. Te escribo para avisarte que tu turno quedó confirmado, te paso los detalles 😊:"
   * Otherwise:
   * "Te confirmo tu turno, te paso los detalles 😊:"
   */
  forChat?: boolean;
  includeGreetingWithName?: boolean;
  services?: Service[];
}

/**
 * Builds the exact appointment confirmation text according to practice settings:
 * - Professional name (practiceSettings.professional_name) distinct from business name (practiceSettings.practice_name)
 * - Date: "Lunes 14 de septiembre de 2026"
 * - Horario: "16:00 hs"
 * - Profesional: practiceSettings.professional_name
 * - Servicio: Service name with duration, e.g. "Asesoría Privada (30 min)"
 * - Lugar: Address with city, e.g. "Av. Santa Fe 3200, Piso 4 B, Palermo"
 * - Waiting notice: "¡Te esperamos mañana!" / "¡Te esperamos hoy!" / etc.
 */
export function formatAppointmentConfirmationMessage(
  apt: {
    patient_name: string;
    start_datetime?: string;
    end_datetime?: string;
    date?: string;
    time?: string;
    service_name?: string;
    service_id?: string;
    origin?: string;
    meet_url?: string;
  },
  practiceSettings: PracticeSettings,
  options?: FormatConfirmationOptions
): string {
  const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

  // 1. Date and Time formatting
  let formattedDate = '';
  let formattedTime = '';
  let waitingText = '¡Te esperamos!';

  let aptDate: Date | null = null;
  if (apt.start_datetime) {
    const parsed = new Date(apt.start_datetime);
    if (!isNaN(parsed.getTime())) {
      aptDate = parsed;
    }
  }

  if (aptDate) {
    const weekday = capitalize(aptDate.toLocaleDateString('es-AR', { weekday: 'long' }));
    const day = aptDate.toLocaleDateString('es-AR', { day: 'numeric' });
    const month = aptDate.toLocaleDateString('es-AR', { month: 'long' });
    const year = aptDate.getFullYear();
    formattedDate = `${weekday} ${day} de ${month} de ${year}`;

    formattedTime = `${aptDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })} hs`;

    // Relative day calculation
    const now = new Date();
    const d1 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const d2 = new Date(aptDate.getFullYear(), aptDate.getMonth(), aptDate.getDate());
    const diffDays = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      waitingText = '¡Te esperamos hoy!';
    } else if (diffDays === 1) {
      waitingText = '¡Te esperamos mañana!';
    } else if (diffDays > 1 && diffDays < 7) {
      const dayName = aptDate.toLocaleDateString('es-AR', { weekday: 'long' }).toLowerCase();
      waitingText = `¡Te esperamos el ${dayName}!`;
    } else {
      waitingText = '¡Te esperamos!';
    }
  } else {
    formattedDate = apt.date || 'A coordinar';
    formattedTime = apt.time ? (apt.time.endsWith('hs') ? apt.time : `${apt.time} hs`) : 'A coordinar';
  }

  // 2. Professional name (strictly separate from business/practice name)
  const professionalName = (practiceSettings.professional_name || '').trim() || 'Especialista a cargo';

  // 3. Service duration in minutes
  let durationMinutes = 30;
  if (options?.services && apt.service_id) {
    const found = options.services.find(s => s.id === apt.service_id || s.name === apt.service_name);
    if (found?.duration_minutes) {
      durationMinutes = found.duration_minutes;
    }
  } else if (apt.start_datetime && apt.end_datetime) {
    const startMs = new Date(apt.start_datetime).getTime();
    const endMs = new Date(apt.end_datetime).getTime();
    if (!isNaN(startMs) && !isNaN(endMs) && endMs > startMs) {
      const diffMin = Math.round((endMs - startMs) / 60000);
      if (diffMin > 0 && diffMin <= 480) {
        durationMinutes = diffMin;
      }
    }
  }
  const serviceName = apt.service_name || 'Consulta';
  const serviceText = `${serviceName} (${durationMinutes} min)`;

  // 4. Location: Address and City combined seamlessly
  let locationText = '';
  if (apt.origin === 'telemedicine' || apt.meet_url) {
    locationText = 'Online por Google Meet (Videollamada)';
  } else {
    const addr = (practiceSettings.address || '').trim();
    const city = (practiceSettings.city || '').trim();
    if (addr && city) {
      const cityFirstPart = city.split(',')[0].trim();
      if (addr.toLowerCase().includes(cityFirstPart.toLowerCase())) {
        locationText = addr;
      } else {
        locationText = `${addr}, ${cityFirstPart}`;
      }
    } else {
      locationText = addr || city || 'Consultorio Principal';
    }
  }

  // 5. Header: For chat vs general
  const header = options?.origen === 'whatsapp'
    ? `¡Buenísimo ${apt.patient_name}! Tu turno quedó agendado, te paso los detalles:`
    : `¡Hola ${apt.patient_name}! Quería recordarte que tu turno quedó agendado, te paso los detalles:`;

  return `${header}

🗓️ *Fecha:* ${formattedDate}
⏰ *Horario:* ${formattedTime}
👤 *Profesional:* ${professionalName}
💼 *Servicio:* ${serviceText}
📍 *Lugar:* ${locationText}

${waitingText} Si necesitás hacer alguna modificación o consulta previa, avisame por acá. 😊`;
}
