import { format } from 'date-fns';

/**
 * Normalizes any timestamp, ISO string, or JavaScript Date object
 * into a standard timezone-neutral YYYY-MM-DD local date string.
 * If the string is already a YYYY-MM-DD local format, returns it verbatim.
 */
export const normalizeToLocalDateString = (dInput: string | Date | undefined): string => {
  if (!dInput) return '';
  if (typeof dInput === 'string') {
    const trimmed = dInput.trim();
    if (trimmed.length === 10 && /^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
  }
  try {
    const dateObj = dInput instanceof Date ? dInput : new Date(dInput);
    if (isNaN(dateObj.getTime())) return '';
    return format(dateObj, 'yyyy-MM-dd');
  } catch {
    return '';
  }
};
