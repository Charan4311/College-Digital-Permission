import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import StatusBadge from '../components/StatusBadge';
import api from '../lib/api';
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

  return (
    <DashboardLayout>
      {/* Top Navigation Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '14px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => navigate(-1)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>
          <div className="page-title" style={{ margin: 0 }}>
            {getPermissionTypeLabel()} Details
          </div>
          <StatusBadge status={request.status} />
        </div>

        {/* Action Button: View Official Slip Modal (Available whenever Approved or Issued) */}
        {isApprovedOrIssued && (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setPrintModalOpen(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Printer size={15} />
            <span>View Official Permission Document</span>
          </button>
        )}
      </div>

      {/* Rejection Alert Banner with Edit & Resubmit Button */}
      {request.status.startsWith('REJECTED') && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fca5a5',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '24px',
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Left Column: Permission Details & Attachments */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card">
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              {reqType === 'OUTPASS' && <FileText size={18} color="var(--accent)" />}
              {reqType === 'MESS_FEE' && <Receipt size={18} color="var(--green)" />}
              {reqType === 'INTERNSHIP' && <Briefcase size={18} color="#2563eb" />}
              {reqType === 'LIBRARY' && <BookOpen size={18} color="var(--yellow)" />}
              <div className="card-title" style={{ margin: 0 }}>Permission Details</div>
            </div>

            <div style={{ display: 'grid', gap: '14px' }}>
              <Row icon={Sparkles} label="Reference ID" value={<code>{refId}</code>} />
              <Row icon={User} label="Student Name" value={`${request.studentId?.name} (${request.studentId?.rollNo})`} />
              <Row icon={Building} label="Department" value={`${request.branchId?.name || 'CSM'}`} />
              <Row icon={Calendar} label="Academic Year" value={`Year ${request.year || 4}`} />
              <Row icon={Home} label="Student Type" value={request.studentType?.replace('_', ' ')} />
              <Row icon={FileText} label="Reason / Purpose" value={request.reason} />

              {/* OUTPASS specifics */}
              {reqType === 'OUTPASS' && (
                <>
                  <Row icon={Calendar} label="Out Date & Time" value={`${new Date(request.outDate).toLocaleDateString('en-IN')} at ${request.outTime}`} />
                  <Row icon={Clock} label="Return Date & Time" value={`${new Date(request.expectedReturnDate).toLocaleDateString('en-IN')} at ${request.expectedReturnTime}`} />
                  {request.emergencyContact && (
                    <Row icon={Phone} label="Emergency Contact" value={request.emergencyContact} />
                  )}
                </>
              )}

              {/* MESS_FEE specifics */}
              {reqType === 'MESS_FEE' && (
                <>
                  <Row icon={DollarSign} label="Mess Amount" value={`₹${request.messAmount?.toLocaleString('en-IN') || 0}`} />
                  <Row icon={CheckCircle2} label="Payment Status" value={request.paidStatus} />
                  <Row icon={Calendar} label="Period Range" value={`${new Date(request.startDate).toLocaleDateString('en-IN')} to ${new Date(request.endDate).toLocaleDateString('en-IN')}`} />
                </>
              )}

              {/* INTERNSHIP specifics */}
              {reqType === 'INTERNSHIP' && (
                <>
                  <Row icon={Building} label="Company Name" value={request.companyName} />
                  <Row icon={MapPin} label="Company Location" value={request.companyLocation} />
                  <Row icon={Briefcase} label="Internship Role" value={request.role} />
                  <Row icon={Laptop} label="Work Mode" value={request.internshipMode} />
                  <Row icon={Calendar} label="Duration" value={`${new Date(request.startDate).toLocaleDateString('en-IN')} to ${new Date(request.endDate).toLocaleDateString('en-IN')}`} />
                </>
              )}

              {/* LIBRARY specifics */}
              {reqType === 'LIBRARY' && (
                <Row icon={Calendar} label="Access Date" value={new Date(request.requestDate || request.createdAt).toLocaleDateString('en-IN')} />
              )}

              {/* Attached Document Row */}
              {request.documentUrl && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
                  <span style={{ minWidth: 150, fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Paperclip size={14} color="var(--accent)" />
                    <span>Attached Document</span>
                  </span>
                  <a
                    href={request.documentUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: 'var(--accent)',
                      textDecoration: 'none',
                      background: 'var(--accent-dim)',
                      padding: '4px 10px',
                      borderRadius: '6px'
                    }}
                  >
                    <span>{request.documentName || 'View Document'}</span>
                  </a>
                </div>
              )}

              <Row icon={Clock} label="Submitted On" value={new Date(request.createdAt).toLocaleString('en-IN')} />
              {request.resubmitCount > 0 && (
                <Row icon={Sparkles} label="Resubmission Cycle" value={`Cycle #${request.resubmitCount}`} />
              )}
            </div>
          </div>

          {/* QR Code Pass Card for Outpass */}
          {reqType === 'OUTPASS' && (request.status === 'ISSUED' || request.status === 'USED') && (
            <div className="card" style={{ textAlign: 'center', border: '1px solid var(--green)' }}>
              <div className="card-title" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--green)' }}>
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
            <div className="card" style={{ border: '1px solid var(--green)' }}>
              <div className="alert alert-success" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={18} />
                <span>This out-pass has been verified and used at the campus security gate. Exit recorded.</span>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Approval Timeline */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <ShieldCheck size={18} color="var(--purple)" />
            <div className="card-title" style={{ margin: 0 }}>Approval Workflow Status</div>
          </div>
          <Timeline
            steps={approvalSteps || []}
            status={request.status}
            request={request}
          />
        </div>
      </div>

      {/* ─── Official Digital Permission Document Modal (Exact Replica of Sample) ─── */}
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

            {/* Printable Document Sheet matching user's exact uploaded sample */}
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
              {/* Header Title */}
              <div style={{ textAlign: 'center', marginBottom: '14px' }}>
                <div style={{ fontSize: '17px', fontWeight: 800, letterSpacing: '0.5px', textTransform: 'uppercase', lineHeight: 1.3 }}>
                  COLLEGE DIGITAL PERMISSION<br />& APPROVAL PLATFORM
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155', marginTop: '8px' }}>
                  Reference ID: {refId}
                </div>
              </div>

              <div style={{ borderBottom: '1.5px solid #0f172a', margin: '14px 0' }} />

              {/* Student Information Section */}
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

              {/* Permission Information Section */}
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

              {/* Approval History Section */}
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

              {/* Reference / QR Code Section */}
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

              {/* Bottom Footer Generated Timestamp */}
              <div style={{ textAlign: 'center', fontSize: '11px', color: '#64748b', marginTop: '16px' }}>
                Document generated on {new Date().toLocaleString('en-GB')}
              </div>
            </div>

            {/* Modal Controls */}
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
    </DashboardLayout>
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
