/**
 * Centralized Timezone Utilities for Argentina (America/Argentina/Buenos_Aires)
 * Ensures 100% consistent dates, times, and slot calculations across the entire platform.
 */

export const ARGENTINA_TIMEZONE = 'America/Argentina/Buenos_Aires';
export const ARGENTINA_OFFSET = '-03:00';

/**
 * Returns YYYY-MM-DD in Argentina timezone from a Date object or ISO string.
 */
export function getArgentinaDateString(dateInput: Date | string | number = new Date()): string {
  const d = typeof dateInput === 'string' || typeof dateInput === 'number' ? parseArgentinaDate(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ARGENTINA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(d);
}

/**
 * Returns HH:mm (24-hour format) in Argentina timezone.
 */
export function getArgentinaTimeString(dateInput: Date | string | number = new Date()): string {
  const d = typeof dateInput === 'string' || typeof dateInput === 'number' ? parseArgentinaDate(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: ARGENTINA_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(d);
}

/**
 * Parses any date string or ISO timestamp safely, treating unqualified timestamps as Argentina local time.
 */
export function parseArgentinaDate(dateInput: string | Date | number): Date {
  if (dateInput instanceof Date) return dateInput;
  if (typeof dateInput === 'number') return new Date(dateInput);
  if (!dateInput) return new Date(NaN);

  let s = String(dateInput).trim();

  // If plain YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return new Date(`${s}T00:00:00${ARGENTINA_OFFSET}`);
  }

  // If YYYY-MM-DDTHH:mm or YYYY-MM-DDTHH:mm:ss without offset/Z
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?$/.test(s)) {
    s = s.replace(' ', 'T');
    if (s.length === 16) s += ':00';
    return new Date(`${s}${ARGENTINA_OFFSET}`);
  }

  return new Date(s);
}

/**
 * Constructs an ISO string anchored to Argentina (-03:00) given date (YYYY-MM-DD) and time (HH:mm).
 */
export function createArgentinaIsoString(dateStr: string, timeStr: string = '00:00'): string {
  const cleanDate = dateStr.trim();
  const cleanTime = timeStr.trim().length === 5 ? `${timeStr.trim()}:00` : timeStr.trim();
  const full = `${cleanDate}T${cleanTime}${ARGENTINA_OFFSET}`;
  const d = new Date(full);
  return isNaN(d.getTime()) ? '' : d.toISOString();
}

/**
 * Formats a date in human-friendly Argentina Spanish (e.g., "martes, 15 de septiembre de 2026").
 */
export function formatArgentinaDisplayDate(
  dateInput: Date | string | number,
  options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
): string {
  const d = parseArgentinaDate(dateInput);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-AR', {
    timeZone: ARGENTINA_TIMEZONE,
    ...options
  });
}

/**
 * Formats a short date (e.g. "15/09/2026").
 */
export function formatArgentinaShortDate(dateInput: Date | string | number): string {
  const d = parseArgentinaDate(dateInput);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-AR', {
    timeZone: ARGENTINA_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * Gets day of the week in Argentina timezone (0=Sunday, 1=Monday... 6=Saturday).
 */
export function getArgentinaDayOfWeek(dateInput: Date | string | number): number {
  const dateStr = getArgentinaDateString(dateInput);
  if (!dateStr) return 0;
  const [y, m, d] = dateStr.split('-').map(Number);
  // Construct noon UTC on that year/month/day to get day of week without timezone shift
  const temp = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return temp.getUTCDay();
}

/**
 * Gets minutes from midnight (0..1439) in Argentina timezone.
 */
export function getArgentinaMinutesFromMidnight(dateInput: Date | string | number): number {
  const timeStr = getArgentinaTimeString(dateInput);
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Today's date string YYYY-MM-DD in Argentina.
 */
export function getTodayArgentinaDateStr(): string {
  return getArgentinaDateString(new Date());
}

/**
 * Tomorrow's date string YYYY-MM-DD in Argentina.
 */
export function getTomorrowArgentinaDateStr(): string {
  const now = new Date();
  // Add 24 hours safely
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return getArgentinaDateString(tomorrow);
}

/**
 * Current month string YYYY-MM in Argentina.
 */
export function getCurrentMonthArgentinaStr(): string {
  const today = getTodayArgentinaDateStr();
  return today.slice(0, 7);
}

/**
 * Extracts a set of possible YYYY-MM-DD interpretations for any date input
 * (handles ISO strings, local strings, Firestore timestamps, unix epochs, DD/MM/YYYY, etc.)
 */
export function extractPossibleYMDDates(input: any): string[] {
  if (!input) return [];
  const results = new Set<string>();

  // If input is an object with Firestore Timestamp shape (seconds or _seconds or toDate)
  if (typeof input === 'object' && input !== null) {
    if (typeof input.toDate === 'function') {
      try {
        const d = input.toDate();
        if (d instanceof Date && !isNaN(d.getTime())) {
          return extractPossibleYMDDates(d.toISOString());
        }
      } catch {}
    }
    if (typeof input.seconds === 'number') {
      return extractPossibleYMDDates(new Date(input.seconds * 1000).toISOString());
    }
    if (typeof input._seconds === 'number') {
      return extractPossibleYMDDates(new Date(input._seconds * 1000).toISOString());
    }
  }

  // If input is a Date instance
  if (input instanceof Date) {
    if (!isNaN(input.getTime())) {
      results.add(getArgentinaDateString(input));
      const year = input.getFullYear();
      const month = String(input.getMonth() + 1).padStart(2, '0');
      const day = String(input.getDate()).padStart(2, '0');
      results.add(`${year}-${month}-${day}`);
      try {
        results.add(input.toISOString().split('T')[0]);
      } catch {}
    }
    return Array.from(results);
  }

  // If input is numeric timestamp
  if (typeof input === 'number') {
    const d = new Date(input < 1e11 ? input * 1000 : input);
    if (!isNaN(d.getTime())) {
      return extractPossibleYMDDates(d);
    }
  }

  if (typeof input !== 'string') return [];

  const trimmed = input.trim();
  if (!trimmed) return [];

  // 1. Literal YYYY-MM-DD or YYYY/MM/DD prefix extraction (regardless of time/timezone)
  const ymdMatch = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (ymdMatch) {
    const y = ymdMatch[1];
    const m = ymdMatch[2].padStart(2, '0');
    const d = ymdMatch[3].padStart(2, '0');
    results.add(`${y}-${m}-${d}`);
  }

  // 2. Literal DD/MM/YYYY or DD-MM-YYYY match
  const dmyMatch = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, '0');
    const m = dmyMatch[2].padStart(2, '0');
    const y = dmyMatch[3];
    results.add(`${y}-${m}-${d}`);
  }

  // 3. Argentina timezone conversion
  try {
    const argDate = getArgentinaDateString(trimmed);
    if (argDate && /^\d{4}-\d{2}-\d{2}$/.test(argDate)) {
      results.add(argDate);
    }
  } catch {}

  // 4. Client / browser local date conversion
  try {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      results.add(`${year}-${month}-${day}`);
      results.add(d.toISOString().split('T')[0]);
    }
  } catch {}

  return Array.from(results);
}

/**
 * Returns candidate date strings (YYYY-MM-DD) for "today", covering:
 * 1. Argentina local calendar date (America/Argentina/Buenos_Aires)
 * 2. Browser local calendar date
 * 3. UTC calendar date
 */
export function getTodayCandidateDates(explicitTargetDate?: string): string[] {
  const dates = new Set<string>();

  if (explicitTargetDate) {
    extractPossibleYMDDates(explicitTargetDate).forEach(d => dates.add(d));
    dates.add(explicitTargetDate.slice(0, 10));
  }

  const now = new Date();
  dates.add(getTodayArgentinaDateStr());

  // Browser local
  const localY = now.getFullYear();
  const localM = String(now.getMonth() + 1).padStart(2, '0');
  const localD = String(now.getDate()).padStart(2, '0');
  dates.add(`${localY}-${localM}-${localD}`);

  // UTC
  try {
    dates.add(now.toISOString().split('T')[0]);
  } catch {}

  return Array.from(dates);
}

/**
 * Robustly checks if an appointment is scheduled on a given target date (YYYY-MM-DD),
 * handling ISO strings in UTC, local timestamps, or direct date properties.
 * Timezone-agnostic and format-agnostic.
 */
export function isAppointmentOnDate(
  apt: { start_datetime?: any; date?: any; datetime?: any; created_at?: any } | null | undefined,
  targetDateStr: string = getTodayArgentinaDateStr()
): boolean {
  if (!apt) return false;

  const targetCandidates = getTodayCandidateDates(targetDateStr);

  // Collect all possible date values on the appointment object
  const rawValues = [
    apt.date,
    apt.start_datetime,
    apt.datetime,
    (apt as any).start_time,
    (apt as any).scheduled_date
  ].filter(Boolean);

  if (rawValues.length === 0) return false;

  for (const raw of rawValues) {
    // Check raw string prefix match directly first
    if (typeof raw === 'string') {
      for (const target of targetCandidates) {
        if (raw.startsWith(target) || raw.includes(target)) {
          return true;
        }
      }
    }

    // Extract all possible YMD representations for the raw value
    const possibleYMDs = extractPossibleYMDDates(raw);
    for (const ymd of possibleYMDs) {
      if (targetCandidates.includes(ymd)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Robustly checks if a payment occurred on a given target date (YYYY-MM-DD).
 */
export function isPaymentOnDate(
  payment: { date?: any; created_at?: any; payment_date?: any } | null | undefined,
  targetDateStr: string = getTodayArgentinaDateStr()
): boolean {
  if (!payment) return false;

  const targetCandidates = getTodayCandidateDates(targetDateStr);
  const rawValues = [payment.date, payment.created_at, payment.payment_date].filter(Boolean);

  if (rawValues.length === 0) return false;

  for (const raw of rawValues) {
    if (typeof raw === 'string') {
      for (const target of targetCandidates) {
        if (raw.startsWith(target) || raw.includes(target)) {
          return true;
        }
      }
    }

    const possibleYMDs = extractPossibleYMDDates(raw);
    for (const ymd of possibleYMDs) {
      if (targetCandidates.includes(ymd)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Robustly checks if a payment occurred in a given target month (YYYY-MM).
 */
export function isPaymentInMonth(
  payment: { date?: any; created_at?: any } | null | undefined,
  targetMonthStr: string = getCurrentMonthArgentinaStr()
): boolean {
  if (!payment || !targetMonthStr) return false;
  const rawValues = [payment.date, payment.created_at].filter(Boolean);

  for (const raw of rawValues) {
    if (typeof raw === 'string' && raw.includes(targetMonthStr)) {
      return true;
    }
    const possibleYMDs = extractPossibleYMDDates(raw);
    for (const ymd of possibleYMDs) {
      if (ymd.startsWith(targetMonthStr)) {
        return true;
      }
    }
  }

  return false;
}
