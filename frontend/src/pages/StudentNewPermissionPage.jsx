import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import api from '../lib/api';
import {
  FileText,
  Calendar,
  Clock,
  PlusCircle,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Building,
  User,
  Home,
  GraduationCap,
  ShieldCheck,
  Sparkles,
  Briefcase,
  BookOpen,
  Receipt,
  UploadCloud,
  Trash2,
  DollarSign,
  MapPin,
  Laptop,
  Check,
  Phone
} from 'lucide-react';

const OUTPASS_REASONS = [
  'Going Home for Weekend',
  'Medical Consultation / Emergency',
  'Family Event / Function',
  'Off-Campus Interview / Drive',
  'Urgent Personal Work'
];

const MESS_REASONS = [
  'Semester Mess Fee Clearance',
  'Hostel Mess Dues Settlement',
  'Hostel Vacation Refund / Adjustment',
  'Exam Hall Ticket Mess Clearance'
];

const LIBRARY_REASONS = [
  'Book Borrowing & Reading Room Access',
  'Semester End Library Clearance / No Dues',
  'Digital Library & Research Database Access',
  'Reference Section Extended Study Hours'
];

const getTodayDateString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const validateLeaveDateRange = (startDate, endDate) => {
  const today = getTodayDateString();

  if (!startDate) return 'Please select a valid start date.';
  if (startDate < today) return 'Period start date cannot be in the past. Please select today or a future date.';
  if (endDate && endDate < today) return 'Period end date cannot be in the past. Please select today or a future date.';
  if (endDate && endDate < startDate) return 'Period end date cannot be earlier than the start date. Please select a date on or after the chosen start date.';

  return '';
};

const getInitialFormState = (studentType = 'DAY_SCHOLAR') => ({
  requestType: 'OUTPASS',
  studentType,
  reason: '',
  documentUrl: '',
  documentName: '',
  emergencyContact: '',
  outDate: new Date().toISOString().split('T')[0],
  outTime: '17:00',
  expectedReturnDate: new Date().toISOString().split('T')[0],
  expectedReturnTime: '20:00',
  startDate: new Date().toISOString().split('T')[0],
  endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  messAmount: '',
  paidStatus: 'Paid',
  companyName: '',
  companyLocation: '',
  role: '',
  internshipMode: 'Offline',
  requestDate: new Date().toISOString().split('T')[0]
});

export default function StudentNewPermissionPage() {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('OUTPASS');

  const [form, setForm] = useState(() => getInitialFormState(user?.studentType || 'DAY_SCHOLAR'));

  useEffect(() => {
    if (user?.studentType) {
      setForm(f => ({ ...f, studentType: user.studentType }));
    }
  }, [user]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setError('');
    setSuccess('');
    setForm(f => ({
      ...f,
      requestType: tab,
      reason: tab === 'INTERNSHIP' ? (f.companyName ? `Internship at ${f.companyName}` : '') : ''
    }));
  };

  const handleReset = () => {
    setError('');
    setSuccess('');
    setForm({
      ...getInitialFormState(user?.studentType || form.studentType || 'DAY_SCHOLAR'),
      requestType: activeTab,
      studentType: form.studentType || user?.studentType || 'DAY_SCHOLAR'
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError('File is too large. Maximum allowed size is 10 MB.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    setUploadingDoc(true);
    setError('');

    try {
      const res = await api.post('/outpass/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setForm(f => ({
        ...f,
        documentUrl: res.data.data.fileUrl,
        documentName: res.data.data.fileName
      }));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload document');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleRemoveFile = () => {
    setForm(f => ({ ...f, documentUrl: '', documentName: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    let dateError = '';
    if (activeTab === 'OUTPASS') {
      dateError = validateLeaveDateRange(form.outDate, form.expectedReturnDate);
    } else if (activeTab === 'LIBRARY') {
      dateError = validateLeaveDateRange(form.requestDate, form.requestDate);
    } else {
      dateError = validateLeaveDateRange(form.startDate, form.endDate);
    }

    if (dateError) {
      setError(dateError);
      return;
    }

    setSubmitting(true);

    try {
      const payload = { ...form, requestType: activeTab };
      await api.post('/outpass', payload);
      const tabLabels = {
        OUTPASS: 'Campus Out-Pass',
        MESS_FEE: 'Mess Fee Clearance',
        INTERNSHIP: 'Internship Permission',
        LIBRARY: 'Library Permission'
      };
      setSuccess(`${tabLabels[activeTab]} request submitted successfully! Tracking approval progress.`);
      setForm(f => ({
        ...f,
        reason: '',
        documentUrl: '',
        documentName: '',
        companyName: '',
        companyLocation: '',
        role: '',
        messAmount: ''
      }));
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <GraduationCap size={28} color="var(--accent)" />
              <span>Digital Permissions & Clearance Hub</span>
            </h1>
            <p className="page-subtitle">
              Logged in as <strong>{user?.name}</strong> ({user?.rollNo || user?.username})
            </p>
          </div>
        </div>
      </div>

      <div className="student-form-card card">
        <div className="student-form-tabs" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: '6px',
          marginBottom: '20px',
          padding: '4px',
          background: '#f8fafc',
          borderRadius: '14px',
          border: '1px solid #e2e8f0'
        }}>
          <button type="button" className="student-form-tab" onClick={() => handleTabChange('OUTPASS')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', padding: '10px 8px', borderRadius: '10px', border: 'none', background: activeTab === 'OUTPASS' ? '#ffffff' : 'transparent', color: activeTab === 'OUTPASS' ? '#2563eb' : '#475569', fontWeight: activeTab === 'OUTPASS' ? 700 : 600, fontSize: '12px', cursor: 'pointer', boxShadow: activeTab === 'OUTPASS' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none', transition: 'all 0.15s ease' }}>
            <GraduationCap size={14} />
            <span>Out-Pass</span>
          </button>
          <button type="button" className="student-form-tab" onClick={() => handleTabChange('MESS_FEE')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', padding: '10px 8px', borderRadius: '10px', border: 'none', background: activeTab === 'MESS_FEE' ? '#ffffff' : 'transparent', color: activeTab === 'MESS_FEE' ? '#059669' : '#475569', fontWeight: activeTab === 'MESS_FEE' ? 700 : 600, fontSize: '12px', cursor: 'pointer', boxShadow: activeTab === 'MESS_FEE' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none', transition: 'all 0.15s ease' }}>
            <Receipt size={14} />
            <span>Mess Fee</span>
          </button>
          <button type="button" className="student-form-tab" onClick={() => handleTabChange('INTERNSHIP')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', padding: '10px 8px', borderRadius: '10px', border: 'none', background: activeTab === 'INTERNSHIP' ? '#ffffff' : 'transparent', color: activeTab === 'INTERNSHIP' ? '#2563eb' : '#475569', fontWeight: activeTab === 'INTERNSHIP' ? 700 : 600, fontSize: '12px', cursor: 'pointer', boxShadow: activeTab === 'INTERNSHIP' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none', transition: 'all 0.15s ease' }}>
            <Briefcase size={14} />
            <span>Internship</span>
          </button>
          <button type="button" className="student-form-tab" onClick={() => handleTabChange('LIBRARY')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', padding: '10px 8px', borderRadius: '10px', border: 'none', background: activeTab === 'LIBRARY' ? '#ffffff' : 'transparent', color: activeTab === 'LIBRARY' ? '#d97706' : '#475569', fontWeight: activeTab === 'LIBRARY' ? 700 : 600, fontSize: '12px', cursor: 'pointer', boxShadow: activeTab === 'LIBRARY' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none', transition: 'all 0.15s ease' }}>
            <BookOpen size={14} />
            <span>Library</span>
          </button>
        </div>

        <div className="student-form-header card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '18px', paddingTop: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
            <div className="student-form-icon" style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(37, 99, 235, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
              <PlusCircle size={20} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="card-title" style={{ fontSize: '18px' }}>
                {activeTab === 'OUTPASS' && 'Apply for Campus Out-Pass'}
                {activeTab === 'MESS_FEE' && 'Submit Mess Fee Clearance'}
                {activeTab === 'INTERNSHIP' && 'Request Internship Permission'}
                {activeTab === 'LIBRARY' && 'Request Library Access / Clearance'}
              </div>
              <div className="card-subtitle" style={{ fontSize: '12px', marginTop: '2px' }}>
                {activeTab === 'OUTPASS' && 'Request permission to leave campus for personal or official purposes'}
                {activeTab === 'MESS_FEE' && 'Submit your mess fee clearance and verification details'}
                {activeTab === 'INTERNSHIP' && 'Request approval for your internship engagement and duration'}
                {activeTab === 'LIBRARY' && 'Request reading room and library access with official clearance'}
              </div>
            </div>
          </div>
          <div className="student-form-status" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '10px', background: '#eff6ff', border: '1px solid #dbeafe', color: '#1d4ed8', fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap' }}>
            <ShieldCheck size={14} />
            <span>
              {activeTab === 'OUTPASS' && 'Reviewed by Branch CTPO, HOD & Hostel In-charge'}
              {activeTab === 'MESS_FEE' && 'Determines required approval flow'}
              {activeTab === 'INTERNSHIP' && 'Multi-tier verification in progress'}
              {activeTab === 'LIBRARY' && 'Fast-track CTPO verification'}
            </span>
          </div>
        </div>

        {error && <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', borderRadius: '10px', padding: '10px 12px' }}><AlertCircle size={16} /><span>{error}</span></div>}
        {success && <div className="alert alert-success" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', borderRadius: '10px', padding: '10px 12px' }}><CheckCircle2 size={16} /><span>{success}</span></div>}

        <form onSubmit={handleSubmit} className="student-form">
          {activeTab === 'OUTPASS' && (
            <>
              <div className="student-form-section" style={{ border: '1px solid var(--border)', borderRadius: '18px', padding: '18px 18px 16px', background: '#ffffff', marginBottom: '18px' }}>
                <div className="student-form-section-header" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                  <div className="student-form-step" style={{ width: '26px', height: '26px', borderRadius: '8px', background: 'rgba(37, 99, 235, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', fontWeight: 700, fontSize: '12px' }}>1</div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Student Category (Out-Pass Route)</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Select your category to proceed</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div onClick={() => setForm(f => ({ ...f, studentType: 'DAY_SCHOLAR' }))} style={{ cursor: 'pointer', borderRadius: '10px', padding: '12px 14px', border: form.studentType === 'DAY_SCHOLAR' ? '2px solid #2563eb' : '1px solid #e2e8f0', background: form.studentType === 'DAY_SCHOLAR' ? 'rgba(37, 99, 235, 0.04)' : '#f8fafc', transition: 'all 0.2s ease' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><GraduationCap size={18} color="#2563eb" /><strong style={{ fontSize: '13px', color: '#0f172a' }}>Day Scholar</strong></div>
                      {form.studentType === 'DAY_SCHOLAR' && <CheckCircle2 size={16} color="#2563eb" />}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>2-Step: CTPO → HOD → Gate Pass</div>
                  </div>
                  <div onClick={() => setForm(f => ({ ...f, studentType: 'HOSTELER' }))} style={{ cursor: 'pointer', borderRadius: '10px', padding: '12px 14px', border: form.studentType === 'HOSTELER' ? '2px solid #7c3aed' : '1px solid #e2e8f0', background: form.studentType === 'HOSTELER' ? 'rgba(124, 58, 237, 0.04)' : '#f8fafc', transition: 'all 0.2s ease' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Home size={18} color="#7c3aed" /><strong style={{ fontSize: '13px', color: '#0f172a' }}>Hosteler</strong></div>
                      {form.studentType === 'HOSTELER' && <CheckCircle2 size={16} color="#7c3aed" />}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>3-Step: CTPO → HOD → Warden</div>
                  </div>
                </div>
              </div>

              <div className="student-form-section" style={{ border: '1px solid var(--border)', borderRadius: '18px', padding: '18px 18px 16px', background: '#ffffff', marginBottom: '18px' }}>
                <div className="student-form-section-header" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                  <div className="student-form-step" style={{ width: '26px', height: '26px', borderRadius: '8px', background: 'rgba(37, 99, 235, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', fontWeight: 700, fontSize: '12px' }}>2</div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Reason for Leaving Campus</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Clearly mention the reason for your out-pass request</div>
                  </div>
                </div>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}><FileText size={14} color="#2563eb" /><span>Reason for Leaving Campus</span></label>
                <textarea required rows={3} className="form-input" placeholder="Explain the specific reason you need to leave campus..." value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} style={{ borderRadius: '10px', padding: '12px 14px', minHeight: '72px' }} />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
                  {OUTPASS_REASONS.map(preset => (
                    <button key={preset} type="button" onClick={() => setForm(f => ({ ...f, reason: preset }))} style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #dfe7f1', color: '#475569', cursor: 'pointer' }}>+ {preset}</button>
                  ))}
                </div>
              </div>

              <div className="student-form-section" style={{ border: '1px solid var(--border)', borderRadius: '18px', padding: '18px 18px 16px', background: '#ffffff', marginBottom: '18px' }}>
                <div className="student-form-section-header" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                  <div className="student-form-step" style={{ width: '26px', height: '26px', borderRadius: '8px', background: 'rgba(37, 99, 235, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', fontWeight: 700, fontSize: '12px' }}>3</div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Out-Pass Details</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Select your expected out and return date & time</div>
                  </div>
                </div>

                <div className="form-grid" style={{ marginBottom: '14px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={13} color="#2563eb" /><span>Out Date</span></label>
                    <input type="date" required className="form-input" min={getTodayDateString()} value={form.outDate} onChange={e => {
                      const value = e.target.value;
                      const validationError = validateLeaveDateRange(value, form.expectedReturnDate);
                      if (validationError) { setError(validationError); return; }
                      setError('');
                      setForm(f => ({ ...f, outDate: value }));
                    }} style={{ borderRadius: '10px', padding: '10px 12px', height: '44px' }} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={13} color="#2563eb" /><span>Out Time</span></label>
                    <input type="time" required className="form-input" value={form.outTime} onChange={e => setForm(f => ({ ...f, outTime: e.target.value }))} style={{ borderRadius: '10px', padding: '10px 12px', height: '44px' }} />
                  </div>
                </div>

                <div className="form-grid" style={{ marginBottom: 0 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={13} color="#2563eb" /><span>Return Date</span></label>
                    <input type="date" required className="form-input" min={form.outDate || getTodayDateString()} value={form.expectedReturnDate} onChange={e => {
                      const value = e.target.value;
                      const validationError = validateLeaveDateRange(form.outDate, value);
                      if (validationError) { setError(validationError); return; }
                      setError('');
                      setForm(f => ({ ...f, expectedReturnDate: value }));
                    }} style={{ borderRadius: '10px', padding: '10px 12px', height: '44px' }} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={13} color="#2563eb" /><span>Return Time</span></label>
                    <input type="time" required className="form-input" value={form.expectedReturnTime} onChange={e => setForm(f => ({ ...f, expectedReturnTime: e.target.value }))} style={{ borderRadius: '10px', padding: '10px 12px', height: '44px' }} />
                  </div>
                </div>
              </div>

              <div className="student-form-section" style={{ border: '1px solid var(--border)', borderRadius: '18px', padding: '18px 18px 16px', background: '#ffffff', marginBottom: '18px' }}>
                <div className="student-form-section-header" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                  <div className="student-form-step" style={{ width: '26px', height: '26px', borderRadius: '8px', background: 'rgba(37, 99, 235, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', fontWeight: 700, fontSize: '12px' }}>4</div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Emergency Contact</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Provide parent/guardian contact number for emergency communication</div>
                  </div>
                </div>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}><Phone size={13} color="#2563eb" /><span>Emergency Contact / Parent Phone</span></label>
                <input type="tel" required className="form-input" placeholder="e.g. 9392393340" value={form.emergencyContact} onChange={e => setForm(f => ({ ...f, emergencyContact: e.target.value }))} style={{ borderRadius: '10px', padding: '10px 12px', height: '44px' }} />
              </div>
            </>
          )}

          {activeTab === 'MESS_FEE' && (
            <>
              <div style={{ border: '1px solid #dfe7f1', borderRadius: '14px', padding: '16px', background: '#ffffff', marginBottom: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '8px', background: 'rgba(5, 150, 105, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669', fontWeight: 700, fontSize: '12px' }}>1</div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Clearance Purpose</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Provide the mess fee clearance reason</div>
                  </div>
                </div>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}><Receipt size={14} color="#059669" /><span>Clearance Reason / Purpose</span></label>
                <textarea required rows={2} className="form-input" placeholder="e.g. Mess Fee Settlement for Fall Semester 2026..." value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} style={{ borderRadius: '10px', padding: '12px 14px', minHeight: '70px' }} />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
                  {MESS_REASONS.map(preset => (
                    <button key={preset} type="button" onClick={() => setForm(f => ({ ...f, reason: preset }))} style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #dfe7f1', color: '#475569', cursor: 'pointer' }}>+ {preset}</button>
                  ))}
                </div>
              </div>

              <div style={{ border: '1px solid #dfe7f1', borderRadius: '14px', padding: '16px', background: '#ffffff', marginBottom: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '8px', background: 'rgba(5, 150, 105, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669', fontWeight: 700, fontSize: '12px' }}>2</div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Period Details</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Select the relevant clearance period</div>
                  </div>
                </div>
                <div className="form-grid" style={{ marginBottom: 0 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={13} color="#059669" /><span>Period Start Date</span></label><input type="date" required className="form-input" min={getTodayDateString()} value={form.startDate} onChange={e => { const value = e.target.value; const validationError = validateLeaveDateRange(value, form.endDate); if (validationError) { setError(validationError); return; } setError(''); setForm(f => ({ ...f, startDate: value })); }} style={{ borderRadius: '10px', padding: '10px 12px', height: '44px' }} /></div>
                  <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={13} color="#059669" /><span>Period End Date</span></label><input type="date" required className="form-input" min={form.startDate || getTodayDateString()} value={form.endDate} onChange={e => { const value = e.target.value; const validationError = validateLeaveDateRange(form.startDate, value); if (validationError) { setError(validationError); return; } setError(''); setForm(f => ({ ...f, endDate: value })); }} style={{ borderRadius: '10px', padding: '10px 12px', height: '44px' }} /></div>
                </div>
              </div>

              <div style={{ border: '1px solid #dfe7f1', borderRadius: '14px', padding: '16px', background: '#ffffff', marginBottom: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '8px', background: 'rgba(5, 150, 105, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669', fontWeight: 700, fontSize: '12px' }}>3</div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Payment Details</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Enter the amount and payment status</div>
                  </div>
                </div>
                <div className="form-grid" style={{ marginBottom: 0 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><DollarSign size={13} color="#059669" /><span>Mess Fee Amount (₹)</span></label><input type="number" required min="0" step="1" placeholder="e.g. 5200" className="form-input" value={form.messAmount} onChange={e => setForm(f => ({ ...f, messAmount: e.target.value }))} style={{ borderRadius: '10px', padding: '10px 12px', height: '44px' }} /></div>
                  <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><CheckCircle2 size={13} color="#059669" /><span>Payment Status</span></label><select className="form-input" value={form.paidStatus} onChange={e => setForm(f => ({ ...f, paidStatus: e.target.value }))} style={{ borderRadius: '10px', padding: '10px 12px', height: '44px' }}><option value="Paid">Paid (Full Payment Done)</option><option value="Partially Paid">Partially Paid</option><option value="Not Paid">Not Paid (Pending Verification)</option></select></div>
                </div>
              </div>

              <div style={{ border: '1px solid #dfe7f1', borderRadius: '14px', padding: '16px', background: '#ffffff' }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}><span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><UploadCloud size={14} color="#059669" /><span>Payment Proof / Receipt (Optional)</span></span><span style={{ fontSize: '11px', color: '#64748b' }}>PDF, PNG, JPG (max 10MB)</span></label>
                {form.documentUrl ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '10px', background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}><Check size={16} color="#059669" /><span style={{ fontSize: '13px', fontWeight: 600, color: '#065f46', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{form.documentName || 'Attached Document'}</span></div>
                    <button type="button" onClick={handleRemoveFile} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '4px' }} title="Remove file"><Trash2 size={14} /></button>
                  </div>
                ) : (
                  <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px', borderRadius: '10px', border: '2px dashed #dfe7f1', background: '#f8fafc', cursor: uploadingDoc ? 'wait' : 'pointer', transition: 'border-color 0.2s' }}>
                    <input type="file" accept=".pdf,.png,.jpg,.jpeg" style={{ display: 'none' }} disabled={uploadingDoc} onChange={handleFileUpload} />
                    <UploadCloud size={22} color={uploadingDoc ? '#059669' : '#64748b'} />
                    <span style={{ fontSize: '12px', marginTop: '6px', color: '#475569' }}>{uploadingDoc ? 'Uploading receipt...' : 'Click to attach payment receipt or bank challan'}</span>
                  </label>
                )}
              </div>
            </>
          )}

          {activeTab === 'INTERNSHIP' && (
            <>
              <div style={{ border: '1px solid #dfe7f1', borderRadius: '14px', padding: '16px', background: '#ffffff', marginBottom: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '8px', background: 'rgba(37, 99, 235, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', fontWeight: 700, fontSize: '12px' }}>1</div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Company Information</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Enter the internship details</div>
                  </div>
                </div>
                <div className="form-grid" style={{ marginBottom: 0 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Building size={13} color="#2563eb" /><span>Company Name</span></label><input type="text" required placeholder="e.g. Google, TCS, Infosys" className="form-input" value={form.companyName} onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))} style={{ borderRadius: '10px', padding: '10px 12px', height: '44px' }} /></div>
                  <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={13} color="#2563eb" /><span>Company Location</span></label><input type="text" required placeholder="e.g. Hyderabad, Bangalore, Remote" className="form-input" value={form.companyLocation} onChange={e => setForm(f => ({ ...f, companyLocation: e.target.value }))} style={{ borderRadius: '10px', padding: '10px 12px', height: '44px' }} /></div>
                </div>
              </div>

              <div style={{ border: '1px solid #dfe7f1', borderRadius: '14px', padding: '16px', background: '#ffffff', marginBottom: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '8px', background: 'rgba(37, 99, 235, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', fontWeight: 700, fontSize: '12px' }}>2</div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Role & Mode</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Specify the internship role and mode</div>
                  </div>
                </div>
                <div className="form-grid" style={{ marginBottom: 0 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Briefcase size={13} color="#2563eb" /><span>Internship Role / Position</span></label><input type="text" required placeholder="e.g. Software Engineer Intern" className="form-input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} style={{ borderRadius: '10px', padding: '10px 12px', height: '44px' }} /></div>
                  <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Laptop size={13} color="#2563eb" /><span>Internship Mode</span></label><select className="form-input" value={form.internshipMode} onChange={e => setForm(f => ({ ...f, internshipMode: e.target.value }))} style={{ borderRadius: '10px', padding: '10px 12px', height: '44px' }}><option value="Offline">Offline (Onsite)</option><option value="Online">Online (Work from Home)</option><option value="Hybrid">Hybrid</option></select></div>
                </div>
              </div>

              <div style={{ border: '1px solid #dfe7f1', borderRadius: '14px', padding: '16px', background: '#ffffff', marginBottom: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '8px', background: 'rgba(37, 99, 235, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', fontWeight: 700, fontSize: '12px' }}>3</div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Internship Duration</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Select the internship start and end dates</div>
                  </div>
                </div>
                <div className="form-grid" style={{ marginBottom: 0 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={13} color="#2563eb" /><span>Internship Start Date</span></label><input type="date" required className="form-input" min={getTodayDateString()} value={form.startDate} onChange={e => { const value = e.target.value; const validationError = validateLeaveDateRange(value, form.endDate); if (validationError) { setError(validationError); return; } setError(''); setForm(f => ({ ...f, startDate: value })); }} style={{ borderRadius: '10px', padding: '10px 12px', height: '44px' }} /></div>
                  <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={13} color="#2563eb" /><span>Internship End Date</span></label><input type="date" required className="form-input" min={form.startDate || getTodayDateString()} value={form.endDate} onChange={e => { const value = e.target.value; const validationError = validateLeaveDateRange(form.startDate, value); if (validationError) { setError(validationError); return; } setError(''); setForm(f => ({ ...f, endDate: value })); }} style={{ borderRadius: '10px', padding: '10px 12px', height: '44px' }} /></div>
                </div>
              </div>

              <div style={{ border: '1px solid #dfe7f1', borderRadius: '14px', padding: '16px', background: '#ffffff' }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}><span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><UploadCloud size={14} color="#2563eb" /><span>Offer Letter / Selection Email (Optional)</span></span><span style={{ fontSize: '11px', color: '#64748b' }}>PDF, PNG, JPG (max 10MB)</span></label>
                {form.documentUrl ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '10px', background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}><Check size={16} color="#2563eb" /><span style={{ fontSize: '13px', fontWeight: 600, color: '#1e40af', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{form.documentName || 'Attached Offer Letter'}</span></div>
                    <button type="button" onClick={handleRemoveFile} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '4px' }} title="Remove file"><Trash2 size={14} /></button>
                  </div>
                ) : (
                  <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px', borderRadius: '10px', border: '2px dashed #dfe7f1', background: '#f8fafc', cursor: uploadingDoc ? 'wait' : 'pointer', transition: 'border-color 0.2s' }}>
                    <input type="file" accept=".pdf,.png,.jpg,.jpeg" style={{ display: 'none' }} disabled={uploadingDoc} onChange={handleFileUpload} />
                    <UploadCloud size={22} color={uploadingDoc ? '#2563eb' : '#64748b'} />
                    <span style={{ fontSize: '12px', marginTop: '6px', color: '#475569' }}>{uploadingDoc ? 'Uploading document...' : 'Click to attach internship offer letter or email'}</span>
                  </label>
                )}
              </div>
            </>
          )}

          {activeTab === 'LIBRARY' && (
            <>
              <div style={{ border: '1px solid #dfe7f1', borderRadius: '14px', padding: '16px', background: '#fff9eb', marginBottom: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <BookOpen size={18} color="#d97706" />
                  <div style={{ fontSize: '12px', color: '#92400e' }}>Single-stage approval verified directly by your <strong>Year CTPO</strong>. No HOD or warden sign-off required.</div>
                </div>
              </div>

              <div style={{ border: '1px solid #dfe7f1', borderRadius: '14px', padding: '16px', background: '#ffffff', marginBottom: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '8px', background: 'rgba(217, 119, 6, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706', fontWeight: 700, fontSize: '12px' }}>1</div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Library Access Details</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Provide your access information and purpose</div>
                  </div>
                </div>
                <div className="form-grid" style={{ marginBottom: '14px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><User size={13} color="#d97706" /><span>Student Roll Number</span></label>
                    <input type="text" disabled className="form-input" value={user?.rollNo || user?.username || ''} style={{ background: '#f8fafc', cursor: 'not-allowed', borderRadius: '10px', padding: '10px 12px', height: '44px' }} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={13} color="#d97706" /><span>Access / Clearance Date</span></label>
                    <input type="date" required className="form-input" min={getTodayDateString()} value={form.requestDate} onChange={e => { const value = e.target.value; const validationError = validateLeaveDateRange(value, value); if (validationError) { setError(validationError); return; } setError(''); setForm(f => ({ ...f, requestDate: value })); }} style={{ borderRadius: '10px', padding: '10px 12px', height: '44px' }} />
                  </div>
                </div>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}><FileText size={14} color="#d97706" /><span>Purpose / Access Details</span></label>
                <textarea required rows={2} className="form-input" placeholder="Specify books to borrow, reading hall hours, or no-dues requirement..." value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} style={{ borderRadius: '10px', padding: '12px 14px', minHeight: '70px' }} />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
                  {LIBRARY_REASONS.map(preset => (
                    <button key={preset} type="button" onClick={() => setForm(f => ({ ...f, reason: preset }))} style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #dfe7f1', color: '#475569', cursor: 'pointer' }}>+ {preset}</button>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="student-workflow-box" style={{ background: '#f8fafc', border: '1px solid #dfe7f1', borderRadius: '12px', padding: '10px 12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', marginBottom: '16px' }}>
            <Sparkles size={14} color="#2563eb" />
            <div>
              <strong>Workflow: </strong>
              {activeTab === 'OUTPASS' && (form.studentType === 'HOSTELER' ? 'CTPO ➔ HOD ➔ Hostel Warden ➔ QR Gate Pass' : 'CTPO ➔ HOD ➔ QR Gate Pass (Warden skipped for Day Scholar)')}
              {activeTab === 'MESS_FEE' && 'CTPO ➔ HOD ➔ Cleared (Downloadable Confirmation Slip)'}
              {activeTab === 'INTERNSHIP' && 'CTPO ➔ HOD ➔ Placement Officer ➔ Approved (Downloadable Approval Letter)'}
              {activeTab === 'LIBRARY' && 'CTPO ➔ Approved (Downloadable Library Pass - 1 Step)'}
            </div>
          </div>

          <div className="student-form-actions" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', alignItems: 'center' }}>
            <button type="button" onClick={handleReset} className="btn btn-ghost" style={{ minWidth: '110px', padding: '12px 18px', borderRadius: '10px', minHeight: '46px', fontSize: '14px', borderColor: '#dfe7f1' }}>
              Reset
            </button>
            <button type="submit" disabled={submitting || uploadingDoc} className="btn btn-primary" style={{ minWidth: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 18px', borderRadius: '10px', minHeight: '46px', fontSize: '14px' }}>
              {submitting ? (
                <><span className="spinner" style={{ width: 15, height: 15 }} /><span>Submitting Request...</span></>
              ) : (
                <><Sparkles size={16} /><span>{activeTab === 'OUTPASS' && 'Submit Out-Pass Request'}{activeTab === 'MESS_FEE' && 'Submit Mess Fee Clearance'}{activeTab === 'INTERNSHIP' && 'Submit Internship Permission'}{activeTab === 'LIBRARY' && 'Submit Library Request'}</span></>
              )}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
