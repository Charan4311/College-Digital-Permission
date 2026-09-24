import React from 'react';
import {
  Clock,
  CheckCircle2,
  XCircle,
  QrCode,
  CheckCheck,
  Ban
} from 'lucide-react';

const STATUS_CONFIG = {
  PENDING_CTPO: { label: 'Pending', icon: Clock, className: 'badge-pending_ctpo' },
  PENDING_HOD: { label: 'Pending HOD', icon: Clock, className: 'badge-pending_hod' },
  PENDING_HOSTEL_INCHARGE: { label: 'Pending Hostel', icon: Clock, className: 'badge-pending_hostel_incharge' },
  PENDING_PLACEMENT_OFFICER: { label: 'Pending Placement', icon: Clock, className: 'badge-pending_hod' },
  APPROVED: { label: 'Approved', icon: CheckCircle2, className: 'badge-approved' },
  ISSUED: { label: 'Issued (Active)', icon: QrCode, className: 'badge-issued' },
  USED: { label: 'Used / Gate Passed', icon: CheckCheck, className: 'badge-used' },
  REJECTED_CTPO: { label: 'Rejected', icon: XCircle, className: 'badge-rejected_ctpo' },
  REJECTED_HOD: { label: 'Rejected', icon: XCircle, className: 'badge-rejected_hod' },
  REJECTED_HOSTEL_INCHARGE: { label: 'Rejected', icon: XCircle, className: 'badge-rejected_hostel_incharge' },
  REJECTED_PLACEMENT_OFFICER: { label: 'Rejected', icon: XCircle, className: 'badge-rejected_hod' },
  CANCELLED: { label: 'Cancelled', icon: Ban, className: 'badge-cancelled' },
};

export default function StatusBadge({ status }) {
  if (!status) return null;
  const cfg = STATUS_CONFIG[status] || {
    label: status.replace(/_/g, ' '),
    icon: Clock,
    className: `badge badge-${status.toLowerCase()}`
  };
  const Icon = cfg.icon;

  return (
    <span className={`badge ${cfg.className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
      <Icon size={13} />
      <span>{cfg.label}</span>
    </span>
  );
}
