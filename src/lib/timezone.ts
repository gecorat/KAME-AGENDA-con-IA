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
