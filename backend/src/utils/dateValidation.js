/**
 * Backend date validation and IST range helpers.
 */

function isValidDateYear(dateObj) {
  if (!dateObj || !(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
    return false;
  }
  const year = dateObj.getFullYear();
  return year >= 2000 && year <= 2100;
}

function parseAndValidateDate(dateString, fieldName = 'Date') {
  if (!dateString) return { valid: true, date: null };
  const d = new Date(dateString);
  if (isNaN(d.getTime())) {
    return { valid: false, error: `${fieldName} is not a valid date format` };
  }
  if (!isValidDateYear(d)) {
    return { valid: false, error: `${fieldName} must have a 4-digit year between 2000 and 2100` };
  }
  return { valid: true, date: d };
}

/**
 * Returns inclusive date boundaries [start, end] for a given date or range in Asia/Kolkata (IST).
 */
function getISTDateRange(fromDateStr, toDateStr) {
  if (!fromDateStr && !toDateStr) return null;

  let start = null;
  let end = null;

  if (fromDateStr) {
    const fromCheck = parseAndValidateDate(fromDateStr, 'From date');
    if (!fromCheck.valid) return { error: fromCheck.error };
    // Start of from date in IST (UTC+5:30)
    start = new Date(`${fromDateStr.slice(0, 10)}T00:00:00.000+05:30`);
  }

  if (toDateStr) {
    const toCheck = parseAndValidateDate(toDateStr, 'To date');
    if (!toCheck.valid) return { error: toCheck.error };
    // End of to date in IST
    end = new Date(`${toDateStr.slice(0, 10)}T23:59:59.999+05:30`);
  }

  if (start && end && start > end) {
    return { error: 'From date cannot be after To date' };
  }

  const query = {};
  if (start) query.$gte = start;
  if (end) query.$lte = end;

  return { query, start, end };
}

module.exports = {
  isValidDateYear,
  parseAndValidateDate,
  getISTDateRange
};
