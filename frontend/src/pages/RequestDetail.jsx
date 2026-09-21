import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import StatusBadge from '../components/StatusBadge';
import api, { buildFileUrl } from '../lib/api';
import {
  ArrowLeft,
  QrCode,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  User,
  Building,
  Home,
  FileText,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  Receipt,
  Briefcase,
  BookOpen,
  DollarSign,
  MapPin,
  Laptop,
  Paperclip,
  Printer,
  Edit3,
  UploadCloud,
  Check,
  Trash2,
  X,
  Phone
} from 'lucide-react';

const ROLE_STEP_LABELS = {
  CTPO: 'CTPO Verification',
  HOD: 'HOD Authorization',
  HOSTEL_INCHARGE: 'Hostel Warden Clearance',
  PLACEMENT_OFFICER: 'Placement Officer Authorization',
  SECURITY: 'Campus Gate Security Checkout',
  STUDENT: 'Student Resubmission'
};

function getWorkflowChain(request) {
  const type = request.requestType || 'OUTPASS';
  if (type === 'MESS_FEE') return ['CTPO', 'HOD'];
  if (type === 'INTERNSHIP') return ['CTPO', 'HOD', 'PLACEMENT_OFFICER'];
  if (type === 'LIBRARY') return ['CTPO'];
  // OUTPASS:
  return request.studentType === 'HOSTELER' ? ['CTPO', 'HOD', 'HOSTEL_INCHARGE'] : ['CTPO', 'HOD'];
}

function Timeline({ steps, status, request }) {
  const chain = getWorkflowChain(request);

  return (
    <div className="timeline">
      {chain.map((role, i) => {
        const step = steps.find(s => s.role === role);
        const pendingStatus = `PENDING_${role}`;
        const isPending = status === pendingStatus;
        const isWaiting = !step && !isPending;
        const dotClass = step
          ? (step.decision === 'APPROVED' ? 'approved' : 'rejected')
          : isPending ? 'pending' : 'waiting';

        return (
          <div className="timeline-item" key={role}>
            <div className="timeline-line">
              <div className={`timeline-dot ${dotClass}`} />
              {i < chain.length - 1 && <div className="timeline-connector" />}
            </div>
            <div className="timeline-content">
              <div className="timeline-role" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>{ROLE_STEP_LABELS[role]}</span>
                {isPending && (
                  <span style={{
                    fontSize: 11,
                    color: 'var(--yellow)',
                    background: 'var(--yellow-dim)',
                    padding: '2px 8px',
                    borderRadius: '20px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <Clock size={11} /> Awaiting Decision
                  </span>
                )}
                {isWaiting && !step && (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Waiting in queue</span>
                )}
              </div>
              {step && (
                <div style={{ marginTop: '4px' }}>
                  <div className="timeline-meta" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                    {step.decision === 'APPROVED' ? (
                      <span style={{ color: 'var(--green)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                        <CheckCircle2 size={13} /> Approved
                      </span>
                    ) : (
                      <span style={{ color: 'var(--red)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                        <XCircle size={13} /> Rejected
                      </span>
                    )}
                    <span>by <strong>{step.approverUserId?.name || 'Authorized Staff'}</strong></span>
                    <span>·</span>
                    <span>{new Date(step.decidedAt).toLocaleString('en-IN')}</span>
                  </div>
                  {step.remarks && (
                    <div className="timeline-remarks" style={{ marginTop: '6px', fontStyle: 'italic', background: '#f8fafc', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      "{step.remarks}"
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function RequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qrImage, setQrImage] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);

  // Official Document View / Print Modal State
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const printRef = useRef();

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get(`/outpass/${id}`);
      setData(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchQR = useCallback(async () => {
    setQrLoading(true);
    try {
      const res = await api.get(`/outpass/${id}/qr`);
      setQrImage(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setQrLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if ((data?.request?.status === 'ISSUED' || data?.request?.status === 'USED') && !qrImage) {
      fetchQR();
    }
  }, [data?.request?.status, qrImage, fetchQR]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) return (
    <DashboardLayout>
      <div className="loading-screen"><div className="spinner spinner-lg" /></div>
    </DashboardLayout>
  );

  if (!data) return (
    <DashboardLayout>
      <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <AlertTriangle size={16} />
        <span>Request not found</span>
      </div>
    </DashboardLayout>
  );

  const { request, approvalSteps } = data;
  const reqType = request.requestType || 'OUTPASS';
  const isOwner = user?.role === 'STUDENT' && (request.studentId?._id === user?.id || request.studentId === user?.id);
  const isApprovedOrIssued = request.status === 'APPROVED' || request.status === 'ISSUED' || request.status === 'USED';
  const proofDocumentUrl = buildFileUrl(request.documentUrl);

  // Compute clean Reference ID
  const refId = request.referenceId || `PERM-${new Date(request.createdAt).getFullYear()}-${request._id.toString().slice(-6).toUpperCase()}`;

  // Permission type label
  const getPermissionTypeLabel = () => {
    if (reqType === 'OUTPASS') return 'Out-Pass';
    if (reqType === 'MESS_FEE') return 'Mess Fee Clearance';
    if (reqType === 'INTERNSHIP') return 'Internship Permission';
    if (reqType === 'LIBRARY') return 'Library Permission';
    return 'Digital Permission';
  };

  const getPermissionMeta = () => {
    const map = {
      OUTPASS: {
        label: 'Out-Pass',
        subtitle: 'Campus exit request and return clearance status.',
        icon: FileText,
      },
      MESS_FEE: {
        label: 'Mess Fee Permission',
        subtitle: 'Academic fee support and mess ledger request.',
        icon: Receipt,
      },
      INTERNSHIP: {
        label: 'Internship Permission',
        subtitle: 'Industry internship approval and onboarding details.',
        icon: Briefcase,
      },
      LIBRARY: {
        label: 'Library Permission',
        subtitle: 'Library access and resource approval request.',
        icon: BookOpen,
      },
    };

    return map[reqType] || {
      label: getPermissionTypeLabel(),
      subtitle: 'Digital permission request submitted for institutional review.',
      icon: FileText,
    };
  };

  const permissionMeta = getPermissionMeta();
  const permissionFields = [
    { icon: Sparkles, label: 'Reference ID', value: refId },
    { icon: User, label: 'Student Name', value: request.studentId?.name || '—' },
    { icon: User, label: 'Roll Number', value: request.studentId?.rollNo || '—' },
    { icon: Building, label: 'Department / Branch', value: request.branchId?.name || '—' },
    { icon: Calendar, label: 'Academic Year', value: request.year ? `Year ${request.year}` : '—' },
    { icon: Home, label: 'Student Type', value: request.studentType ? request.studentType.replace(/_/g, ' ') : '—' },
    { icon: FileText, label: 'Permission Type', value: getPermissionTypeLabel() },
    { icon: FileText, label: 'Reason / Purpose', value: request.reason || '—' },
  ];

  if (reqType === 'OUTPASS') {
    permissionFields.push(
      { icon: Calendar, label: 'Out Date & Time', value: request.outDate ? `${new Date(request.outDate).toLocaleDateString('en-IN')} at ${request.outTime || '—'}` : '—' },
      { icon: Clock, label: 'Return Date & Time', value: request.expectedReturnDate ? `${new Date(request.expectedReturnDate).toLocaleDateString('en-IN')} at ${request.expectedReturnTime || '—'}` : '—' },
      ...(request.emergencyContact ? [{ icon: Phone, label: 'Emergency Contact', value: request.emergencyContact }] : [])
    );
  }

  if (reqType === 'MESS_FEE') {
    permissionFields.push(
      { icon: DollarSign, label: 'Mess Amount', value: request.messAmount ? `₹${request.messAmount.toLocaleString('en-IN')}` : '—' },
      { icon: CheckCircle2, label: 'Payment Status', value: request.paidStatus || '—' },
      { icon: Calendar, label: 'Period Range', value: request.startDate && request.endDate ? `${new Date(request.startDate).toLocaleDateString('en-IN')} to ${new Date(request.endDate).toLocaleDateString('en-IN')}` : '—' }
    );
  }

  if (reqType === 'INTERNSHIP') {
    permissionFields.push(
      { icon: Building, label: 'Company Name', value: request.companyName || '—' },
      { icon: MapPin, label: 'Company Location', value: request.companyLocation || '—' },
      { icon: Briefcase, label: 'Internship Role', value: request.role || '—' },
      { icon: Laptop, label: 'Work Mode', value: request.internshipMode || '—' },
      { icon: Calendar, label: 'Duration', value: request.startDate && request.endDate ? `${new Date(request.startDate).toLocaleDateString('en-IN')} to ${new Date(request.endDate).toLocaleDateString('en-IN')}` : '—' }
    );
  }

  if (reqType === 'LIBRARY') {
    permissionFields.push({
      icon: Calendar,
      label: 'Access Date',
      value: (request.requestDate || request.createdAt) ? new Date(request.requestDate || request.createdAt).toLocaleDateString('en-IN') : '—',
    });
  }

  permissionFields.push({ icon: Clock, label: 'Submitted On', value: new Date(request.createdAt).toLocaleString('en-IN') });

  if (request.resubmitCount > 0) {
    permissionFields.push({ icon: Sparkles, label: 'Resubmission Cycle', value: `Cycle #${request.resubmitCount}` });
  }

  return (
    <>
      <style>{`
        .detail-page-shell {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .detail-header {
          background: linear-gradient(135deg, rgba(37, 99, 235, 0.08), rgba(255, 255, 255, 0.96));
          border: 1px solid rgba(37, 99, 235, 0.12);
          border-radius: 22px;
          padding: 20px 22px;
          box-shadow: 0 14px 36px -24px rgba(37, 99, 235, 0.28);
        }
        .detail-header-top {
          display: flex;
          justify-content: flex-start;
          align-items: center;
          margin-bottom: 18px;
        }
        .detail-back-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 1px solid var(--border);
          background: rgba(255,255,255,0.8);
          color: var(--text-primary);
          border-radius: 12px;
          padding: 9px 14px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all var(--transition);
        }
        .detail-back-btn:hover {
          border-color: rgba(37, 99, 235, 0.3);
          background: rgba(37, 99, 235, 0.05);
          color: var(--accent);
        }
        .detail-header-main {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 18px;
        }
        .detail-title-wrap {
          display: flex;
          align-items: flex-start;
          gap: 16px;
        }
        .detail-icon-wrap {
          width: 56px;
          height: 56px;
          border-radius: 18px;
          background: linear-gradient(135deg, var(--accent), #60a5fa);
          box-shadow: 0 12px 24px -16px rgba(37, 99, 235, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          flex-shrink: 0;
        }
        .detail-eyebrow {
          display: inline-flex;
          align-items: center;
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          font-weight: 700;
          color: var(--accent);
          margin-bottom: 6px;
        }
        .detail-title {
          margin: 0;
          font-size: clamp(26px, 2vw, 34px);
          font-weight: 800;
          letter-spacing: -0.06em;
          color: var(--text-primary);
        }
        .detail-subtitle {
          margin-top: 6px;
          color: var(--text-secondary);
          font-size: 14px;
          max-width: 560px;
        }
        .detail-meta-stack {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 10px;
          min-width: 220px;
        }
        .detail-status-wrap {
          display: inline-flex;
          justify-content: flex-end;
        }
        .detail-meta-box {
          width: 100%;
          background: rgba(255,255,255,0.7);
          border: 1px solid rgba(148, 163, 184, 0.3);
          border-radius: 12px;
          padding: 10px 12px;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .detail-meta-box span {
          font-size: 10px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--text-muted);
        }
        .detail-meta-box strong {
          font-size: 13px;
          color: var(--text-primary);
          word-break: break-word;
        }
        .detail-grid {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 24px;
          align-items: start;
        }
        .detail-column {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .detail-card {
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: 18px;
          padding: 22px;
          box-shadow: var(--shadow-sm);
        }
        .detail-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 18px;
        }
        .detail-card-title {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          font-size: 16px;
          font-weight: 800;
          color: var(--text-primary);
        }
        .detail-field-grid {
          display: grid;
          gap: 0;
        }
        .detail-field-row {
          display: grid;
          grid-template-columns: minmax(150px, 180px) minmax(0, 1fr);
          gap: 16px;
          padding: 12px 0;
          border-bottom: 1px solid #f1f5f9;
        }
        .detail-field-row:last-child {
          border-bottom: none;
        }
        .detail-field-label {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          color: var(--text-muted);
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .detail-field-value {
          color: var(--text-primary);
          font-size: 14px;
          font-weight: 600;
          line-height: 1.6;
          overflow-wrap: anywhere;
        }
        .detail-field-value code {
          display: inline-block;
          background: rgba(37, 99, 235, 0.08);
          color: var(--accent);
          border: 1px solid rgba(37, 99, 235, 0.12);
          padding: 5px 8px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
        }
        .detail-document-item {
          display: flex;
          align-items: center;
          gap: 14px;
          background: linear-gradient(135deg, rgba(37,99,235,0.04), rgba(96,165,250,0.03));
          border: 1px solid rgba(37, 99, 235, 0.12);
          border-radius: 14px;
          padding: 14px 16px;
          color: var(--text-primary);
          text-decoration: none;
        }
        .detail-doc-icon {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          background: rgba(37, 99, 235, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--accent);
        }
        .detail-doc-meta {
          flex: 1;
          min-width: 0;
        }
        .detail-doc-name {
          font-size: 14px;
          font-weight: 700;
          color: var(--text-primary);
          overflow-wrap: anywhere;
        }
        .detail-doc-date {
          font-size: 12px;
          color: var(--text-muted);
          margin-top: 4px;
        }
        .detail-doc-action {
          background: var(--accent);
          color: white;
          border-radius: 10px;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 700;
        }
        @media (max-width: 980px) {
          .detail-header-main {
            flex-direction: column;
          }
          .detail-meta-stack {
            width: 100%;
            align-items: stretch;
          }
          .detail-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 640px) {
          .detail-header {
            padding: 16px 16px 18px;
          }
          .detail-title-wrap {
            gap: 12px;
          }
          .detail-icon-wrap {
            width: 46px;
            height: 46px;
          }
          .detail-field-row {
            grid-template-columns: 1fr;
            gap: 8px;
          }
          .detail-document-item {
            align-items: flex-start;
          }
          .detail-doc-action {
            display: none;
          }
        }
      `}</style>
      <DashboardLayout>
        <div className="detail-page-shell">
          <header className="detail-header">
            <div className="detail-header-top">
              <button
                className="detail-back-btn"
                onClick={() => navigate(-1)}
                type="button"
              >
                <ArrowLeft size={15} />
                <span>Back to History</span>
              </button>
            </div>

            <div className="detail-header-main">
              <div className="detail-title-wrap">
                <div className="detail-icon-wrap">
                  <permissionMeta.icon size={24} />
                </div>
                <div>
                  <div className="detail-eyebrow">Permission Request</div>
                  <h1 className="detail-title">{permissionMeta.label}</h1>
                  <p className="detail-subtitle">{permissionMeta.subtitle}</p>
                </div>
              </div>

              <div className="detail-meta-stack">
                <div className="detail-status-wrap">
                  <StatusBadge status={request.status} />
                </div>
                <div className="detail-meta-box">
                  <span>Request ID</span>
                  <strong>{refId}</strong>
                </div>
                <div className="detail-meta-box">
                  <span>Submitted</span>
                  <strong>{new Date(request.createdAt).toLocaleString('en-IN')}</strong>
                </div>
              </div>
            </div>
          </header>

          {request.status.startsWith('REJECTED') && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fca5a5',
              borderRadius: '12px',
              padding: '16px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: '#ef4444',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <XCircle size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#991b1b' }}>
                    Request Rejected by {request.rejectedByRole || 'Approver'}
                  </div>
                  <div style={{ fontSize: '13px', color: '#b91c1c', marginTop: '2px' }}>
                    <strong>Remarks:</strong> {request.rejectionReason || 'Please review required documentation and correct details.'}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="detail-grid">
            <div className="detail-column">
              <section className="detail-card">
                <div className="detail-card-header">
                  <div className="detail-card-title">
                    <FileText size={18} color="var(--accent)" />
                    <span>Request Information</span>
                  </div>
                </div>

                <div className="detail-field-grid">
                  {permissionFields.map((field, index) => (
                    <div key={`${field.label}-${index}`} className="detail-field-row">
                      <div className="detail-field-label">
                        <field.icon size={13} color="var(--accent)" />
                        <span>{field.label}</span>
                      </div>
                      <div className="detail-field-value">
                        {field.label === 'Reference ID' ? <code>{field.value}</code> : field.value || '—'}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {proofDocumentUrl && (
                <section className="detail-card">
                  <div className="detail-card-header">
                    <div className="detail-card-title">
                      <Paperclip size={18} color="var(--accent)" />
                      <span>Attached Documents</span>
                    </div>
                  </div>

                  <a
                    href={proofDocumentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="detail-document-item"
                    onClick={(e) => {
                      if (!proofDocumentUrl) {
                        e.preventDefault();
                        window.alert('This proof document could not be loaded.');
                      }
                    }}
                  >
                    <div className="detail-doc-icon">
                      <Paperclip size={18} />
                    </div>
                    <div className="detail-doc-meta">
                      <div className="detail-doc-name">{request.documentName || 'Uploaded Document'}</div>
                      <div className="detail-doc-date">Uploaded on {new Date(request.createdAt).toLocaleString('en-IN')}</div>
                    </div>
                    <div className="detail-doc-action">View</div>
                  </a>
                </section>
              )}

              {reqType === 'OUTPASS' && (request.status === 'ISSUED' || request.status === 'USED') && (
                <div className="detail-card" style={{ textAlign: 'center', border: '1px solid rgba(5, 150, 105, 0.24)' }}>
                  <div className="detail-card-title" style={{ justifyContent: 'center', color: 'var(--green)', marginBottom: 12 }}>
                    <QrCode size={20} />
                    <span>Authorized Out-Pass QR Code</span>
                  </div>
                  <div className="alert alert-info" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <ShieldCheck size={16} />
                    <span>Show this QR code to the security gate guard upon exit. Only outpass requires security verification.</span>
                  </div>
                  {qrLoading ? (
                    <div className="loading-screen"><div className="spinner spinner-lg" /></div>
                  ) : qrImage ? (
                    <div className="qr-container" style={{ background: '#fff', padding: '16px', borderRadius: '12px', display: 'inline-block', margin: '0 auto 12px auto' }}>
                      <img src={qrImage.qrImage} alt="Out-pass QR" className="qr-image" style={{ width: 220, height: 220, display: 'block' }} />
                      <div style={{ fontSize: '12px', color: '#1f2937', marginTop: '8px', fontWeight: 600 }}>
                        Token: <code>{qrImage.token.slice(0, 18)}...</code>
                      </div>
                      <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                        Valid until {new Date(qrImage.expiresAt).toLocaleDateString('en-IN')} 23:59
                      </div>
                    </div>
                  ) : (
                    <button className="btn btn-primary" onClick={fetchQR}>Generate / Load QR Code</button>
                  )}
                </div>
              )}

              {reqType === 'OUTPASS' && request.status === 'USED' && (
                <div className="detail-card" style={{ border: '1px solid rgba(5, 150, 105, 0.24)' }}>
                  <div className="alert alert-success" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={18} />
                    <span>This out-pass has been verified and used at the campus security gate. Exit recorded.</span>
                  </div>
                </div>
              )}
            </div>

            <div className="detail-column">
              <div className="detail-card">
                <div className="detail-card-header">
                  <div className="detail-card-title">
                    <ShieldCheck size={18} color="var(--accent)" />
                    <span>Approval Workflow Status</span>
                  </div>
                </div>
                <Timeline steps={approvalSteps || []} status={request.status} request={request} />
              </div>

              {isApprovedOrIssued && (
                <div className="detail-card">
                  <div className="detail-card-header">
                    <div className="detail-card-title">
                      <Printer size={18} color="var(--accent)" />
                      <span>Official Document</span>
                    </div>
                  </div>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => setPrintModalOpen(true)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Printer size={15} />
                    <span>View Permission Slip</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {printModalOpen && (
            <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setPrintModalOpen(false)}>
              <div className="modal" style={{ maxWidth: '640px', padding: '24px', background: '#ffffff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Printer size={18} color="var(--accent)" />
                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Official Digital Permission Slip
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPrintModalOpen(false)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                  >
                    <X size={20} />
                  </button>
                </div>

                <div ref={printRef} className="official-permission-doc" style={{
                  background: '#ffffff',
                  border: '1.5px solid #0f172a',
                  borderRadius: '6px',
                  padding: '28px 32px',
                  color: '#0f172a',
                  fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                  maxHeight: '70vh',
                  overflowY: 'auto',
                  WebkitOverflowScrolling: 'touch'
                }}>
                  <div style={{ textAlign: 'center', marginBottom: '14px' }}>
                    <div style={{ fontSize: '17px', fontWeight: 800, letterSpacing: '0.5px', textTransform: 'uppercase', lineHeight: 1.3 }}>
                      COLLEGE DIGITAL PERMISSION<br />& APPROVAL PLATFORM
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155', marginTop: '8px' }}>
                      Reference ID: {refId}
                    </div>
                  </div>

                  <div style={{ borderBottom: '1.5px solid #0f172a', margin: '14px 0' }} />

                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '8px' }}>
                      STUDENT INFORMATION
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '4px', fontSize: '13px', lineHeight: 1.5 }}>
                      <div><strong>Name:</strong> {request.studentId?.name}</div>
                      <div><strong>Roll Number:</strong> {request.studentId?.rollNo}</div>
                      <div><strong>Department:</strong> {request.branchId?.name || 'CSE'}</div>
                      <div><strong>Year:</strong> {request.year || 4}</div>
                      <div><strong>Student Type:</strong> {request.studentType?.replace('_', ' ')}</div>
                    </div>
                  </div>

                  <div style={{ borderBottom: '1.5px solid #0f172a', margin: '14px 0' }} />

                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '8px' }}>
                      PERMISSION INFORMATION
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '4px', fontSize: '13px', lineHeight: 1.5 }}>
                      <div><strong>Permission Type:</strong> {getPermissionTypeLabel()}</div>
                      <div><strong>Reason:</strong> {request.reason}</div>

                      {reqType === 'OUTPASS' && (
                        <>
                          <div><strong>Date:</strong> {new Date(request.outDate).toLocaleDateString('en-GB')} ({request.outTime} to {request.expectedReturnTime})</div>
                          {request.emergencyContact && (
                            <div><strong>Emergency Contact:</strong> {request.emergencyContact}</div>
                          )}
                        </>
                      )}

                      {reqType === 'MESS_FEE' && (
                        <>
                          <div><strong>Date:</strong> {new Date(request.startDate).toLocaleDateString('en-GB')} to {new Date(request.endDate).toLocaleDateString('en-GB')}</div>
                          <div><strong>Mess Amount:</strong> ₹{request.messAmount?.toLocaleString('en-IN')}</div>
                          <div><strong>Payment Status:</strong> {request.paidStatus}</div>
                        </>
                      )}

                      {reqType === 'INTERNSHIP' && (
                        <>
                          <div><strong>Company:</strong> {request.companyName} ({request.companyLocation})</div>
                          <div><strong>Role & Mode:</strong> {request.role} ({request.internshipMode})</div>
                          <div><strong>Duration:</strong> {new Date(request.startDate).toLocaleDateString('en-GB')} to {new Date(request.endDate).toLocaleDateString('en-GB')}</div>
                        </>
                      )}

                      {reqType === 'LIBRARY' && (
                        <div><strong>Date:</strong> {new Date(request.requestDate || request.createdAt).toLocaleDateString('en-GB')}</div>
                      )}
                    </div>
                  </div>

                  <div style={{ borderBottom: '1.5px solid #0f172a', margin: '14px 0' }} />

                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '8px' }}>
                      APPROVAL HISTORY
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                      {approvalSteps && approvalSteps.length > 0 ? (
                        approvalSteps.filter(s => s.role !== 'STUDENT').map((step, idx) => (
                          <div key={idx} style={{ lineHeight: 1.4 }}>
                            <div style={{ fontWeight: 700 }}>{step.role}</div>
                            <div style={{ paddingLeft: '8px', color: '#1e293b' }}>
                              <div>Approver: {step.approverUserId?.name || 'Authorized Faculty'}</div>
                              <div>Status: {step.decision === 'APPROVED' ? 'Approved' : step.decision}</div>
                              <div>Approved At: {new Date(step.decidedAt).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div style={{ color: '#64748b' }}>Approvals recorded digitally by college authority.</div>
                      )}
                    </div>
                  </div>

                  <div style={{ borderBottom: '1.5px solid #0f172a', margin: '14px 0' }} />

                  <div style={{ marginBottom: '12px' }}>
                    {reqType === 'OUTPASS' ? (
                      <>
                        <div style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '8px' }}>
                          REFERENCE / QR CODE
                        </div>
                        <div style={{ fontSize: '12px', marginBottom: '10px' }}>
                          Scan this QR code for security verification:
                        </div>
                        <div style={{ textAlign: 'center', margin: '8px 0' }}>
                          {qrImage?.qrImage ? (
                            <img
                              src={qrImage.qrImage}
                              alt="Out-pass Security QR"
                              style={{ width: '160px', height: '160px', display: 'inline-block', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                            />
                          ) : (
                            <div style={{ padding: '20px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '4px', fontSize: '12px', color: '#64748b' }}>
                              QR Code available upon gate checkout verification
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '8px' }}>
                          REFERENCE / VERIFICATION
                        </div>
                        <div style={{ fontSize: '12px', color: '#334155', lineHeight: 1.5 }}>
                          Official Institutional Clearance Reference: <strong>{refId}</strong><br />
                          This certificate validates institutional permission approved through the College Digital Permission & Approval Platform. No physical security gate checkout is required for this clearance type.
                        </div>
                      </>
                    )}
                  </div>

                  <div style={{ textAlign: 'center', fontSize: '11px', color: '#64748b', marginTop: '16px' }}>
                    Document generated on {new Date().toLocaleString('en-GB')}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                  <button className="btn btn-ghost" onClick={() => setPrintModalOpen(false)}>Close</button>
                  <button className="btn btn-primary" onClick={handlePrint} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <Printer size={15} />
                    <span>Print / Save as PDF</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </>
  );
}

function Row({ icon: Icon, label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <span style={{ minWidth: 150, fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
        {Icon && <Icon size={14} color="var(--accent)" />}
        <span>{label}</span>
      </span>
      <span style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>{value || '—'}</span>
    </div>
  );
}
