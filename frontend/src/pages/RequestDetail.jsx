import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import StatusBadge from '../components/StatusBadge';
import DocumentViewer from '../components/DocumentViewer';
import api from '../lib/api';
import toast from 'react-hot-toast';
import {
  formatDate,
  formatDateTime,
  formatTime,
  formatDuration,
  formatCurrency,
  getOrdinalYear,
  getResidenceTypeLabel
} from '../lib/utils';
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
  IndianRupee,
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
  return ['CTPO', 'HOD'];
}

function Timeline({ steps, status, request }) {
  const chain = getWorkflowChain(request);

  return (
    <div className="timeline" style={{ width: '100%' }}>
      {chain.map((role, i) => {
        const step = steps.find(s => s.role === role);
        const pendingStatus = `PENDING_${role}`;
        const isPending = status === pendingStatus || (role === 'HOD' && status === 'PENDING_HOD_APPROVAL');
        const isWaiting = !step && !isPending;
        const dotClass = step
          ? (step.decision === 'APPROVED' ? 'approved' : 'rejected')
          : isPending ? 'pending' : 'waiting';

        const defaultApproverName =
          role === 'CTPO'
            ? 'CTPO Approver'
            : role === 'HOD'
            ? 'Head of Department'
            : role === 'HOSTEL_INCHARGE'
            ? 'Hostel Warden'
            : role === 'PLACEMENT_OFFICER'
            ? 'Placement Officer'
            : 'Authorized Staff';

        const approverName = step?.approverUserId?.name || defaultApproverName;

        return (
          <div
            className="timeline-item"
            key={role}
            style={{
              paddingBottom: i === chain.length - 1 ? 0 : '24px',
              display: 'flex',
              gap: '16px',
              position: 'relative'
            }}
          >
            <div className="timeline-line" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div
                className={`timeline-dot ${dotClass}`}
                style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  marginTop: '4px',
                  flexShrink: 0
                }}
              />
              {i < chain.length - 1 && (
                <div
                  className="timeline-connector"
                  style={{
                    width: '2px',
                    flex: 1,
                    background: '#e2e8f0',
                    marginTop: '6px',
                    minHeight: '36px'
                  }}
                />
              )}
            </div>
            <div className="timeline-content" style={{ flex: 1, paddingLeft: '4px' }}>
              <div
                className="timeline-role"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#0f172a'
                }}
              >
                <span>{ROLE_STEP_LABELS[role]}</span>
                {isPending && (
                  <span
                    style={{
                      fontSize: '11px',
                      color: '#b45309',
                      background: '#fef3c7',
                      border: '1px solid #fde68a',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontWeight: 600
                    }}
                  >
                    <Clock size={11} /> Awaiting Decision
                  </span>
                )}
                {isWaiting && !step && (
                  <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>Waiting in queue</span>
                )}
              </div>

              {step && (
                <div style={{ marginTop: '6px' }}>
                  <div
                    className="timeline-meta"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '13px',
                      color: '#475569',
                      flexWrap: 'wrap'
                    }}
                  >
                    {step.decision === 'APPROVED' ? (
                      <span
                        style={{
                          color: '#059669',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontWeight: 700
                        }}
                      >
                        <CheckCircle2 size={15} /> Approved
                      </span>
                    ) : (
                      <span
                        style={{
                          color: '#dc2626',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontWeight: 700
                        }}
                      >
                        <XCircle size={15} /> Rejected
                      </span>
                    )}
                    <span>
                      by <strong>{approverName}</strong>
                    </span>
                    <span>•</span>
                    <span>{formatDateTime(step.decidedAt)}</span>
                  </div>
                  {step.remarks && (
                    <div
                      className="timeline-remarks"
                      style={{
                        marginTop: '10px',
                        fontStyle: 'italic',
                        background: '#f8fafc',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        color: '#334155',
                        fontSize: '13px',
                        lineHeight: '1.5'
                      }}
                    >
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
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qrImage, setQrImage] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);

  // Approver Approval State
  const [approverRemarks, setApproverRemarks] = useState('');
  const [approverActionLoading, setApproverActionLoading] = useState(false);
  const [approverActionError, setApproverActionError] = useState('');
  const [rejectModalOpen, setRejectModalOpen] = useState(false);

  // Edit & Resubmit Modal State
  const [resubmitModalOpen, setResubmitModalOpen] = useState(false);
  const [resubmitForm, setResubmitForm] = useState({});
  const [resubmitting, setResubmitting] = useState(false);
  const [resubmitError, setResubmitError] = useState('');

  // Document View Modal State
  const [documentModalOpen, setDocumentModalOpen] = useState(false);

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
    // Only student or security can fetch QR
    if (user?.role !== 'STUDENT' && user?.role !== 'SECURITY') return;
    setQrLoading(true);
    try {
      const res = await api.get(`/outpass/${id}/qr`);
      setQrImage(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setQrLoading(false);
    }
  }, [id, user?.role]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (data?.request?.status === 'ISSUED' && !qrImage && (user?.role === 'STUDENT' || user?.role === 'SECURITY')) {
      fetchQR();
    }
  }, [data?.request?.status, qrImage, fetchQR, user?.role]);

  const handleOpenResubmit = () => {
    const req = data.request;
    setResubmitForm({
      reason: req.reason || '',
      outDate: req.outDate ? new Date(req.outDate).toISOString().split('T')[0] : '',
      outTime: req.outTime || '09:00 AM',
      expectedReturnDate: req.expectedReturnDate ? new Date(req.expectedReturnDate).toISOString().split('T')[0] : '',
      emergencyContact: req.emergencyContact || '',
      startDate: req.startDate ? new Date(req.startDate).toISOString().split('T')[0] : '',
      endDate: req.endDate ? new Date(req.endDate).toISOString().split('T')[0] : '',
      messAmount: req.messAmount ?? '',
      companyName: req.companyName || '',
      companyLocation: req.companyLocation || '',
      role: req.role || '',
      internshipMode: req.internshipMode || 'Offline',
      documentUrl: req.documentUrl || '',
      documentName: req.documentName || ''
    });
    setResubmitError('');
    setResubmitModalOpen(true);
  };

  const handleResubmitSubmit = async (e) => {
    e.preventDefault();
    setResubmitting(true);
    setResubmitError('');
    try {
      await api.post(`/outpass/${id}/resubmit`, resubmitForm);
      toast.success('Request updated and resubmitted for verification!');
      setResubmitModalOpen(false);
      fetchData();
    } catch (err) {
      setResubmitError(err?.response?.data?.message || 'Failed to resubmit request.');
    } finally {
      setResubmitting(false);
    }
  };

  const handleApproverApprove = async () => {
    setApproverActionLoading(true);
    setApproverActionError('');
    try {
      await api.post(`/outpass/${id}/approve`, { remarks: approverRemarks });
      toast.success('Permission request approved successfully!');
      fetchData();
    } catch (err) {
      setApproverActionError(err?.response?.data?.message || 'Failed to approve request.');
    } finally {
      setApproverActionLoading(false);
    }
  };

  const handleApproverReject = async () => {
    if (!approverRemarks.trim()) {
      setApproverActionError('Please provide a reason for rejecting this request.');
      return;
    }
    setApproverActionLoading(true);
    setApproverActionError('');
    try {
      await api.post(`/outpass/${id}/reject`, { remarks: approverRemarks });
      toast.success('Request rejected.');
      setRejectModalOpen(false);
      fetchData();
    } catch (err) {
      setApproverActionError(err?.response?.data?.message || 'Failed to reject request.');
    } finally {
      setApproverActionLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="loading-screen"><div className="spinner spinner-lg" /></div>
      </DashboardLayout>
    );
  }

  if (!data?.request) {
    return (
      <DashboardLayout>
        <div className="empty-state">
          <div className="empty-title">Request Not Found</div>
          <div className="empty-subtitle">The requested permission could not be located.</div>
          <button className="btn btn-secondary" onClick={() => navigate(-1)} style={{ marginTop: 16 }}>
            <ArrowLeft size={16} /> Go Back
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const { request, approvalSteps } = data;
  const isOwner = user?.role === 'STUDENT' && request.studentId?._id === user?.id;
  const isStudent = user?.role === 'STUDENT';
  const isSecurity = user?.role === 'SECURITY';

  // Check if current user is the active approver
  let showApproverApprovalActions = false;
  let approverTitle = 'Review & Action';

  if (user?.role === 'CTPO' && request.status === 'PENDING_CTPO') {
    showApproverApprovalActions = true;
    approverTitle = 'CTPO Verification Action';
  } else if (user?.role === 'HOD' && (request.status === 'PENDING_HOD' || request.status === 'PENDING_HOD_APPROVAL')) {
    showApproverApprovalActions = true;
    approverTitle = 'HOD Authorization Action';
  } else if (user?.role === 'HOSTEL_INCHARGE' && request.status === 'PENDING_HOSTEL_INCHARGE') {
    showApproverApprovalActions = true;
    approverTitle = 'Hostel Warden Clearance Action';
  } else if (user?.role === 'PLACEMENT_OFFICER' && request.status === 'PENDING_PLACEMENT_OFFICER') {
    showApproverApprovalActions = true;
    approverTitle = 'Placement Officer Authorization Action';
  }

  const reqType = request.requestType || 'OUTPASS';
  const studentName = request.studentId?.name || 'Student';
  const rollNo = request.studentId?.rollNo || 'N/A';
  const branchName = request.branchId?.name || request.branchId?.code || 'Engineering';
  const residence = getResidenceTypeLabel(request.studentId?.residenceType);
  const refId = request.referenceId || `KDP-${new Date(request.createdAt).getFullYear()}-${request._id.toString().slice(-6).toUpperCase()}`;

  const pageHeadingTitle =
    reqType === 'OUTPASS'
      ? 'Out-Pass Details'
      : reqType === 'MESS_FEE'
      ? 'Mess Fee Clearance Details'
      : reqType === 'INTERNSHIP'
      ? 'Internship Permission Details'
      : 'Library Clearance Details';

  return (
    <DashboardLayout>
      <div style={{ width: '100%', paddingBottom: '40px' }}>
        {/* Top Header matching reference design */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '24px',
            flexWrap: 'wrap',
            gap: '16px'
          }}
        >
          {/* Left: Back button + Title + Status Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate(-1)}
              type="button"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                color: '#334155',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#cbd5e1')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')}
            >
              <ArrowLeft size={16} />
              <span>Back</span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <h1
                style={{
                  margin: 0,
                  fontSize: '22px',
                  fontWeight: 800,
                  color: '#0f172a',
                  letterSpacing: '-0.3px'
                }}
              >
                {pageHeadingTitle}
              </h1>
              <StatusBadge status={request.status} />
            </div>
          </div>

          {/* Right: Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* Official Institutional Document Button */}
            {['APPROVED', 'ISSUED', 'CLEARED', 'USED'].includes(request.status) && (
              <button
                type="button"
                onClick={() => setPrintModalOpen(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: '#059669',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(5, 150, 105, 0.25)',
                  transition: 'background 0.15s ease'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#047857')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#059669')}
              >
                <FileText size={16} />
                <span>View Official Permission Document</span>
              </button>
            )}

            {/* Resubmit button for student if rejected */}
            {isOwner && String(request.status).startsWith('REJECT') && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleOpenResubmit}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Edit3 size={15} />
                <span>Edit & Resubmit</span>
              </button>
            )}
          </div>
        </div>

        {/* 2-Column Responsive Layout spanning full width */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
            gap: '24px',
            alignItems: 'start',
            width: '100%'
          }}
        >
          {/* Left Column: Permission Details & Status/QR */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="card" style={{ padding: '24px 28px' }}>
              <div
                className="card-header"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '20px',
                  borderBottom: '1px solid #f1f5f9',
                  paddingBottom: '14px'
                }}
              >
                {reqType === 'OUTPASS' && <FileText size={19} color="#059669" />}
                {reqType === 'MESS_FEE' && <Receipt size={19} color="#059669" />}
                {reqType === 'INTERNSHIP' && <Briefcase size={19} color="#059669" />}
                {reqType === 'LIBRARY' && <BookOpen size={19} color="#059669" />}
                <div className="card-title" style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>
                  Permission Details
                </div>
              </div>

              <div style={{ display: 'grid', gap: '16px' }}>
                <Row icon={Sparkles} label="Reference ID" value={<code>{refId}</code>} />
                <Row icon={User} label="Student Name" value={`${studentName} (${rollNo})`} />
                <Row icon={Building} label="Department" value={branchName} />
                <Row
                  icon={Calendar}
                  label="Academic Year"
                  value={
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <span>{getOrdinalYear(request.year || request.studentId?.year)}</span>
                      {residence !== 'Not set' && (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: residence === 'Hosteller' ? '#ede9fe' : '#ecfdf5',
                            color: residence === 'Hosteller' ? '#6d28d9' : '#059669'
                          }}
                        >
                          {residence}
                        </span>
                      )}
                    </span>
                  }
                />
                <Row icon={FileText} label="Reason / Purpose" value={request.reason} />

                {/* OUTPASS specifics */}
                {reqType === 'OUTPASS' && (
                  <>
                    <Row
                      icon={Calendar}
                      label="Out Date & Time"
                      value={
                        request.outTime
                          ? `${formatDate(request.outDate)} at ${formatTime(request.outTime)}`
                          : formatDate(request.outDate)
                      }
                    />
                    <Row
                      icon={Calendar}
                      label="Return Date & Time"
                      value={
                        request.expectedReturnTime || request.returnTime
                          ? `${formatDate(request.expectedReturnDate)} at ${formatTime(request.expectedReturnTime || request.returnTime)}`
                          : formatDate(request.expectedReturnDate)
                      }
                    />
                    {request.emergencyContact && (
                      <Row icon={Phone} label="Emergency Contact" value={request.emergencyContact} />
                    )}
                  </>
                )}

                {/* MESS_FEE specifics */}
                {reqType === 'MESS_FEE' && (
                  <>
                    <Row icon={IndianRupee} label="Mess Amount" value={formatCurrency(request.messAmount)} />
                    <Row icon={CheckCircle2} label="Payment Status" value={request.paidStatus || 'Paid'} />
                    <Row icon={Calendar} label="Period Range" value={formatDuration(request.startDate, request.endDate)} />
                  </>
                )}

                {/* INTERNSHIP specifics */}
                {reqType === 'INTERNSHIP' && (
                  <>
                    <Row icon={Building} label="Company Name" value={request.companyName || '-'} />
                    <Row icon={MapPin} label="Company Location" value={request.companyLocation || '-'} />
                    <Row icon={Briefcase} label="Internship Role" value={request.role || '-'} />
                    <Row icon={Laptop} label="Work Mode" value={request.internshipMode || 'Offline'} />
                    <Row icon={Calendar} label="Duration" value={formatDuration(request.startDate, request.endDate)} />
                  </>
                )}

                {/* LIBRARY specifics */}
                {reqType === 'LIBRARY' && (
                  <Row icon={Calendar} label="Access Date" value={formatDate(request.requestDate || request.createdAt)} />
                )}

                {/* Attached Document */}
                {request.documentUrl && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      marginTop: '6px',
                      paddingTop: '12px',
                      borderTop: '1px solid #f1f5f9'
                    }}
                  >
                    <span
                      style={{
                        width: 170,
                        flexShrink: 0,
                        fontSize: 13,
                        color: '#64748b',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <Paperclip size={15} color="#059669" />
                      <span>Attached Document</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setDocumentModalOpen(true)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#059669',
                        background: '#ecfdf5',
                        border: '1px solid #a7f3d0',
                        padding: '5px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                      title="Open attached document"
                    >
                      <span>{request.documentName || 'View Document'}</span>
                    </button>
                  </div>
                )}

                <Row icon={Clock} label="Submitted On" value={formatDateTime(request.createdAt)} />
                {request.resubmitCount > 0 && (
                  <Row icon={Sparkles} label="Resubmission Cycle" value={`Cycle #${request.resubmitCount}`} />
                )}
              </div>
            </div>

            {/* Bottom Status Banner for Used Passes */}
            {reqType === 'OUTPASS' && request.status === 'USED' && (
              <div
                style={{
                  padding: '16px 20px',
                  background: '#f0fdf4',
                  border: '1px solid #a7f3d0',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  color: '#047857',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  boxShadow: '0 1px 3px rgba(16, 185, 129, 0.08)'
                }}
              >
                <CheckCircle2 size={20} color="#059669" style={{ flexShrink: 0 }} />
                <span>This out-pass has been verified and used at the campus security gate. Exit recorded.</span>
              </div>
            )}

            {/* QR Code Pass Card: ONLY visible to Student and Security */}
            {reqType === 'OUTPASS' && (request.status === 'ISSUED' || request.status === 'APPROVED') && (isStudent || isSecurity) && (
              <div className="card" style={{ textAlign: 'center', border: '1px solid #10b981', padding: '24px 28px' }}>
                <div className="card-title" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#059669' }}>
                  <QrCode size={20} />
                  <span>Authorized Out-Pass QR Code</span>
                </div>
                <div className="alert alert-info" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px' }}>
                  <ShieldCheck size={16} />
                  <span>Present this QR code or short pass code to security upon exit.</span>
                </div>
                {qrLoading ? (
                  <div className="loading-screen"><div className="spinner spinner-lg" /></div>
                ) : qrImage ? (
                  <div className="qr-container" style={{ background: '#fff', padding: '16px', borderRadius: '12px', display: 'inline-block', margin: '0 auto 8px auto', border: '1px solid #e2e8f0' }}>
                    <img src={qrImage.qrImage} alt="Out-pass QR" className="qr-image" style={{ width: 200, height: 200, display: 'block', margin: '0 auto' }} />
                    <div style={{ fontSize: '15px', color: '#059669', marginTop: '10px', fontWeight: 800, letterSpacing: '1px' }}>
                      Pass Code: <code>{qrImage.shortCode || request.shortCode || qrImage.token?.slice(0, 8)?.toUpperCase()}</code>
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                      Valid until {formatDate(qrImage.expiresAt || request.expectedReturnDate)} 11:59 PM
                    </div>
                  </div>
                ) : (
                  <button className="btn btn-primary" onClick={fetchQR}>Load Pass Code</button>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Approval Timeline & Action Box */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="card" style={{ padding: '24px 28px' }}>
              <div
                className="card-header"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '20px',
                  borderBottom: '1px solid #f1f5f9',
                  paddingBottom: '14px'
                }}
              >
                <ShieldCheck size={19} color="#6366f1" />
                <div className="card-title" style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>
                  Approval Workflow Status
                </div>
              </div>
              <Timeline
                steps={approvalSteps || []}
                status={request.status}
                request={request}
              />
            </div>

            {/* Approver Action Card */}
            {showApproverApprovalActions && (
              <div className="card" style={{ border: '1px solid #10b981', padding: '24px 28px' }}>
                <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <ShieldCheck size={18} color="#059669" />
                  <div className="card-title" style={{ margin: 0, fontSize: '15px' }}>{approverTitle}</div>
                </div>

                {approverActionError && (
                  <div className="alert alert-error" style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertTriangle size={16} />
                    <span>{approverActionError}</span>
                  </div>
                )}

                <div style={{ marginBottom: 16 }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Remarks / Comments (Optional for Approval)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Enter any approval remarks..."
                    value={approverRemarks}
                    onChange={(e) => setApproverRemarks(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleApproverApprove}
                    disabled={approverActionLoading}
                    style={{ flex: 1, height: '42px', fontWeight: 700 }}
                  >
                    {approverActionLoading ? 'Processing...' : 'Approve Permission'}
                  </button>

                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      setApproverRemarks('');
                      setApproverActionError('');
                      setRejectModalOpen(true);
                    }}
                    disabled={approverActionLoading}
                    style={{
                      height: '42px',
                      padding: '0 20px',
                      background: '#fee2e2',
                      color: '#dc2626',
                      border: '1px solid #fecaca',
                      fontWeight: 700,
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    Reject
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Reject Remarks Modal */}
        {rejectModalOpen && (
          <div
            className="modal-overlay"
            onClick={(e) => {
              if (e.target === e.currentTarget && !approverActionLoading) {
                setRejectModalOpen(false);
              }
            }}
            style={{ zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <div className="modal" style={{ width: 'min(480px, 95vw)', padding: '24px', borderRadius: '12px' }}>
              <h3 style={{ margin: '0 0 8px', fontSize: '16px', color: '#dc2626' }}>Reject Permission Request</h3>
              <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#64748b' }}>
                Please provide a clear reason for rejection so the student can rectify it.
              </p>

              {approverActionError && (
                <div className="alert alert-error" style={{ marginBottom: 12 }}>{approverActionError}</div>
              )}

              <div className="form-group" style={{ marginBottom: 20 }}>
                <textarea
                  className="form-input"
                  rows={4}
                  placeholder="Enter rejection reason..."
                  value={approverRemarks}
                  onChange={(e) => setApproverRemarks(e.target.value)}
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setRejectModalOpen(false)}>Cancel</button>
                <button
                  type="button"
                  className="btn"
                  onClick={handleApproverReject}
                  disabled={approverActionLoading}
                  style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '0 18px', fontWeight: 700, borderRadius: 8 }}
                >
                  {approverActionLoading ? 'Rejecting...' : 'Confirm Reject'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Official Document Print Modal */}
        {printModalOpen && (
          <div
            className="modal-overlay"
            onClick={(e) => { if (e.target === e.currentTarget) setPrintModalOpen(false); }}
            style={{ zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
          >
            <div className="modal" style={{ width: 'min(720px, 95vw)', maxHeight: '90vh', overflowY: 'auto', padding: '24px', borderRadius: '12px' }}>
              <div id="printable-certificate" ref={printRef} style={{ border: '2px solid #0f172a', padding: '24px', background: '#fff' }}>
                <div style={{ textAlign: 'center', borderBottom: '2px solid #0f172a', paddingBottom: '16px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '18px', fontWeight: 800, textTransform: 'uppercase' }}>K.I.E.T ENGINEERING COLLEGE</div>
                  <div style={{ fontSize: '12px', color: '#475569' }}>Autonomous Institution • Digital Permission & Clearance Platform</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, marginTop: '8px', color: '#059669', textTransform: 'uppercase' }}>
                    {reqType === 'OUTPASS' ? 'OFFICIAL CAMPUS OUT-PASS CERTIFICATE' : `${reqType.replace(/_/g, ' ')} CLEARANCE CERTIFICATE`}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px', marginBottom: '16px' }}>
                  <div><strong>Reference ID:</strong> {refId}</div>
                  <div><strong>Date Issued:</strong> {formatDate(request.createdAt)}</div>
                  <div><strong>Student Name:</strong> {studentName}</div>
                  <div><strong>Roll Number:</strong> {rollNo}</div>
                  <div><strong>Department:</strong> {branchName}</div>
                  <div><strong>Academic Year:</strong> {getOrdinalYear(request.year || request.studentId?.year)}</div>
                  <div><strong>Student Type:</strong> {residence}</div>
                  <div><strong>Status:</strong> Approved / Certified</div>
                </div>

                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', fontSize: '13px', marginBottom: '16px' }}>
                  <div><strong>Purpose / Justification:</strong> {request.reason}</div>
                  {reqType === 'OUTPASS' && (
                    <div style={{ marginTop: '6px' }}>
                      <strong>Out Time:</strong> {formatDate(request.outDate)} at {formatTime(request.outTime)} &nbsp;|&nbsp;
                      <strong>Return Date:</strong> {formatDate(request.expectedReturnDate)}
                    </div>
                  )}
                  {reqType === 'MESS_FEE' && (
                    <div style={{ marginTop: '6px' }}>
                      <strong>Mess Clearance Amount:</strong> {formatCurrency(request.messAmount)} &nbsp;|&nbsp;
                      <strong>Payment Status:</strong> {request.paidStatus}
                    </div>
                  )}
                  {reqType === 'INTERNSHIP' && (
                    <div style={{ marginTop: '6px' }}>
                      <strong>Company:</strong> {request.companyName} ({request.companyLocation}) &nbsp;|&nbsp;
                      <strong>Duration:</strong> {formatDuration(request.startDate, request.endDate)}
                    </div>
                  )}
                </div>

                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Digitally Certified & Approved</div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#059669' }}>Verified on {formatDateTime(request.updatedAt)}</div>
                  </div>
                  {reqType === 'OUTPASS' && (qrImage?.shortCode || request.shortCode) && (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>Security Gate Pass Code</div>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: '#059669', letterSpacing: '1px' }}>
                        {qrImage?.shortCode || request.shortCode}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setPrintModalOpen(false)}>Close</button>
                <button type="button" className="btn btn-primary" onClick={handlePrint} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Printer size={16} /> Print / Save PDF
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Document Viewer Modal */}
        <DocumentViewer
          isOpen={documentModalOpen}
          onClose={() => setDocumentModalOpen(false)}
          documentUrl={request.documentUrl}
          documentName={request.documentName}
          documentMime={request.documentMime}
        />
      </div>
    </DashboardLayout>
  );
}

function Row({ icon: Icon, label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px' }}>
      <span
        style={{
          width: 165,
          flexShrink: 0,
          fontSize: 13,
          color: '#64748b',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        {Icon && <Icon size={15} color="#059669" />}
        <span>{label}</span>
      </span>
      <span style={{ fontSize: 13.5, color: '#0f172a', fontWeight: 600, flex: 1, wordBreak: 'break-word' }}>
        {value || '—'}
      </span>
    </div>
  );
}
