/**
 * Shared date and formatting utilities for CampusFlow.
 * Timezone: Asia/Kolkata (IST).
 */

const TIMEZONE = 'Asia/Kolkata';

/**
 * Validates whether a given date object has a valid year between 2000 and 2100.
 */
export function isValidDateYear(dateObj) {
  if (!dateObj || !(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
    return false;
  }
  const year = dateObj.getFullYear();
  return year >= 2000 && year <= 2100;
}

/**
 * Parse a date safely in Asia/Kolkata context.
 */
export function parseSafeDate(input) {
  if (!input) return null;
  const d = new Date(input);
  if (isNaN(d.getTime())) return null;
  if (!isValidDateYear(d)) return null;
  return d;
}

/**
 * Format a date as DD-MM-YYYY in Asia/Kolkata timezone.
 * Returns 'Invalid date' for invalid or out-of-range dates.
 */
export function formatDate(input) {
  if (!input) return '—';
  const d = parseSafeDate(input);
  if (!d) return 'Invalid date';

  try {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: TIMEZONE,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    // en-GB produces DD/MM/YYYY -> replace '/' with '-'
    return formatter.format(d).replace(/\//g, '-');
  } catch {
    return 'Invalid date';
  }
}

/**
 * Format a date & time as DD-MM-YYYY, hh:mm AM/PM (12-hour) in Asia/Kolkata timezone.
 * Returns 'Invalid date' for invalid or out-of-range dates.
 */
export function formatDateTime(input) {
  if (!input) return '—';
  const d = parseSafeDate(input);
  if (!d) return 'Invalid date';

  try {
    const datePart = new Intl.DateTimeFormat('en-GB', {
      timeZone: TIMEZONE,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(d).replace(/\//g, '-');

    const timePart = new Intl.DateTimeFormat('en-US', {
      timeZone: TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(d);

    return `${datePart}, ${timePart}`;
  } catch {
    return 'Invalid date';
  }
}

/**
 * Format 24-hour time (e.g. '17:00' or '09:30') to 12-hour AM/PM format (e.g. '05:00 PM', '09:30 AM').
 */
export function formatTime(timeStr) {
  if (!timeStr) return '';
  // Check if it already has AM/PM
  if (/(AM|PM)/i.test(timeStr)) return timeStr.toUpperCase();

  const parts = String(timeStr).split(':');
  if (parts.length < 2) return timeStr;

  let hours = parseInt(parts[0], 10);
  const minutes = parts[1].slice(0, 2);
  if (isNaN(hours)) return timeStr;

  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 becomes 12
  const formattedHours = hours < 10 ? `0${hours}` : hours;
  return `${formattedHours}:${minutes} ${ampm}`;
}

/**
 * Format date duration: "DD-MM-YYYY to DD-MM-YYYY (N days)".
 */
export function formatDuration(startDate, endDate) {
  if (!startDate || !endDate) return '—';
  const start = parseSafeDate(startDate);
  const end = parseSafeDate(endDate);

  if (!start || !end) return 'Invalid date';

  const startFormatted = formatDate(start);
  const endFormatted = formatDate(end);

  if (startFormatted === 'Invalid date' || endFormatted === 'Invalid date') {
    return 'Invalid date';
  }

  // Calculate day difference (inclusive)
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1);

  return `${startFormatted} to ${endFormatted} (${diffDays} day${diffDays === 1 ? '' : 's'})`;
}

/**
 * Ordinal year formatting: 1 -> "1st Year", 2 -> "2nd Year", 3 -> "3rd Year", 4 -> "4th Year".
 */
export function getOrdinalYear(yearInput) {
  if (!yearInput && yearInput !== 0) return '—';
  // If yearInput is string like "4th Year" or "4", extract number
  const match = String(yearInput).match(/\d+/);
  const num = match ? parseInt(match[0], 10) : parseInt(yearInput, 10);

  if (isNaN(num)) return String(yearInput);

  switch (num) {
    case 1:
      return '1st Year';
    case 2:
      return '2nd Year';
    case 3:
      return '3rd Year';
    case 4:
      return '4th Year';
    default:
      return `${num}th Year`;
  }
}

/**
 * Format Indian currency: ₹55,000.
 */
export function formatCurrency(amount) {
  if (amount === undefined || amount === null || isNaN(Number(amount))) return '₹0';
  const num = Math.round(Number(amount));
  return '₹' + new Intl.NumberFormat('en-IN').format(num);
}

/**
 * Get display label for student residence type.
 */
export function getResidenceTypeLabel(type) {
  if (!type) return 'Not set';
  const t = String(type).toLowerCase();
  if (t === 'hosteler' || t === 'hosteller') return 'Hosteller';
  if (t === 'dayscholar' || t === 'day scholar') return 'Day Scholar';
  return 'Not set';
}

/**
 * Get date input min and max attributes for HTML <input type="date">.
 * Min: 2000-01-01
 * Max: Today + 1 year (e.g. 2027-10-07)
 */
export function getDateInputBounds(options = {}) {
  const { allowPast = false } = options;
  const now = new Date();
  
  const minDate = allowPast 
    ? '2000-01-01'
    : now.toISOString().split('T')[0];

  const maxYearDate = new Date(now);
  maxYearDate.setFullYear(now.getFullYear() + 1);
  const maxDate = maxYearDate.toISOString().split('T')[0];

  return {
    min: minDate,
    max: maxDate
  };
}
