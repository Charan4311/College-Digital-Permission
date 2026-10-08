// Shared constants for CampusFlow frontend

export const PERMISSION_TYPES = {
  OUTPASS: 'OUTPASS',
  INTERNSHIP: 'INTERNSHIP',
  MESS_FEE: 'MESS_FEE',
  LIBRARY: 'LIBRARY',
};

export const PERMISSION_LABELS = {
  OUTPASS: 'Out-Pass',
  INTERNSHIP: 'Internship',
  MESS_FEE: 'Mess Fee',
  LIBRARY: 'Library',
};

export const PERMISSION_OPTIONS = [
  { value: 'ALL', label: 'All Types' },
  { value: 'OUTPASS', label: 'Out-Pass' },
  { value: 'INTERNSHIP', label: 'Internship' },
  { value: 'MESS_FEE', label: 'Mess Fee' },
  { value: 'LIBRARY', label: 'Library' },
];

export const PERMISSION_TYPE_OPTIONS = PERMISSION_OPTIONS;

export const getPermissionTypeLabel = (type) => {
  if (!type) return '—';
  const key = String(type).toUpperCase();
  return PERMISSION_LABELS[key] || type;
};

export const SIMPLIFIED_STATUS = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

export const mapStatusToSimple = (status) => {
  if (!status) return 'Pending';
  const s = String(status).toUpperCase();
  if (['APPROVED', 'CLEARED', 'ISSUED', 'USED'].includes(s)) {
    return 'Approved';
  }
  if (s.startsWith('REJECT') || s === 'CANCELLED') {
    return 'Rejected';
  }
  if (s.startsWith('PENDING')) {
    return 'Pending';
  }
  return 'Pending';
};

export const MESS_FEE_MAX_YEARLY = 60000;
