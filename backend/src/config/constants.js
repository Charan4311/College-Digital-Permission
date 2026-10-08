// Shared constants for CampusFlow backend
const PERMISSION_TYPES = {
  OUTPASS: 'OUTPASS',
  INTERNSHIP: 'INTERNSHIP',
  MESS_FEE: 'MESS_FEE',
  LIBRARY: 'LIBRARY'
};

const PERMISSION_LABELS = {
  OUTPASS: 'Out-Pass',
  INTERNSHIP: 'Internship',
  MESS_FEE: 'Mess Fee',
  LIBRARY: 'Library'
};

const ALL_PERMISSION_TYPES = Object.values(PERMISSION_TYPES);

const SIMPLIFIED_STATUS = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected'
};

const mapStatusToSimple = (status) => {
  if (!status) return 'Pending';
  const s = String(status).toUpperCase();
  if (s === 'APPROVED' || s === 'CLEARED' || s === 'ISSUED' || s === 'USED') {
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

const MESS_FEE_MAX_YEARLY = Number(process.env.MESS_FEE_YEARLY_PER_STUDENT) || 60000;

module.exports = {
  PERMISSION_TYPES,
  PERMISSION_LABELS,
  ALL_PERMISSION_TYPES,
  SIMPLIFIED_STATUS,
  mapStatusToSimple,
  MESS_FEE_MAX_YEARLY
};
