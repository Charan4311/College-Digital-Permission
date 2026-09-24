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

const getPermissionFormState = (tab, studentType = 'DAY_SCHOLAR') => ({
  ...getInitialFormState(studentType),
  requestType: tab,
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

const PERMISSION_META = {
  OUTPASS: {
    title: 'Apply for Campus Out-Pass',
    description: 'Request permission to leave campus for personal or official purposes',
    icon: GraduationCap,
    chips: ['Easy Process', 'Track Status', 'Get Notified'],
    stepLabels: ['Basic Details', 'Out-Pass Details', 'Additional Info', 'Review & Submit']
  },
  MESS_FEE: {
    title: 'Apply for Mess Fee Permission',
    description: 'Submit your mess fee clearance, refund, or related request.',
    icon: Receipt,
    chips: ['Clear Details', 'Document Check', 'Fast Approval'],
    stepLabels: ['Basic Details', 'Hostel Staying Period', 'Payment Details', 'Review & Submit']
  },
  INTERNSHIP: {
    title: 'Apply for Internship Permission',
    description: 'Submit your internship details and request approval.',
    icon: Briefcase,
    chips: ['Verify Details', 'Document Proof', 'Approval Tracking'],
    stepLabels: ['Company Info', 'Role & Mode', 'Duration', 'Review & Submit']
  },
  LIBRARY: {
    title: 'Apply for Library Permission',
    description: 'Request permission for library access and related requirements.',
    icon: BookOpen,
    chips: ['Access Request', 'Purpose Check', 'Status Tracking'],
    stepLabels: ['Basic Details', 'Access Details', 'Review & Submit']
  }
};

export default function StudentNewPermissionPage() {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('OUTPASS');
  const [form, setForm] = useState(() => getInitialFormState(user?.studentType || 'DAY_SCHOLAR'));
  const activePermission = PERMISSION_META[activeTab] || PERMISSION_META.OUTPASS;

  useEffect(() => {
    if (user?.studentType) {
      setForm(f => ({ ...f, studentType: user.studentType }));
    }
  }, [user]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setError('');
    setSuccess('');
    setForm(getPermissionFormState(tab, form.studentType || user?.studentType || 'DAY_SCHOLAR'));
  };

  const handleReset = () => {
    setError('');
    setSuccess('');
    setForm(getPermissionFormState(activeTab, form.studentType || user?.studentType || 'DAY_SCHOLAR'));
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

    if (activeTab === 'MESS_FEE' && (!form.documentUrl || !form.documentName)) {
      setError('Please upload the required mess fee proof document.');
      return;
    }

    if (activeTab === 'INTERNSHIP' && (!form.documentUrl || !form.documentName)) {
      setError('Please upload the required internship proof document.');
      return;
    }

    let dateError = '';
    if (activeTab === 'OUTPASS') {
      if (!/^\d{10}$/.test(form.emergencyContact)) {
        setError('Phone number must be exactly 10 digits.');
        return;
      }
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
      if (activeTab === 'INTERNSHIP') {
        payload.reason = `Internship at ${form.companyName || 'Company'} for ${form.role || 'Role'} role`;
      }
      await api.post('/outpass', payload);
      const tabLabels = {
        OUTPASS: 'Campus Out-Pass',
        MESS_FEE: 'Mess Fee Clearance',
        INTERNSHIP: 'Internship Permission',
        LIBRARY: 'Library Permission'
      };
      setSuccess(`${tabLabels[activeTab]} request submitted successfully! Tracking approval progress.`);
      setForm(getPermissionFormState(activeTab, form.studentType || user?.studentType || 'DAY_SCHOLAR'));
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '0 0 32px' }}>
        <div style={{ marginBottom: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 18px rgba(109, 40, 217, 0.12)' }}>
                <GraduationCap size={22} color="#3B82F6" />
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: '26px', lineHeight: 1.2, fontWeight: 800, letterSpacing: '-0.03em', color: '#1f2937' }}>
                  Digital Permissions & Clearance Hub
                </h1>
                <div style={{ marginTop: '4px', fontSize: '15px', color: '#475569', fontWeight: 500 }}>
                  Logged in as <strong style={{ color: '#0f172a' }}>{user?.name}</strong> ({user?.rollNo || user?.username})
                </div>
              </div>
            </div>

            {/* Simple Requests card removed */}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-[8px]" style={{ marginBottom: '20px', padding: '6px', background: '#f2f5fa', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
          {[
            { key: 'OUTPASS', label: 'Out-Pass', icon: GraduationCap, color: '#3B82F6', activeBg: '#2563EB' },
            { key: 'MESS_FEE', label: 'Mess Fee', icon: Receipt, color: '#3B82F6', activeBg: '#2563EB' },
            { key: 'INTERNSHIP', label: 'Internship', icon: Briefcase, color: '#0f172a', activeBg: '#2563EB' },
            { key: 'LIBRARY', label: 'Library', icon: BookOpen, color: '#0f172a', activeBg: '#2563EB' }
          ].map(({ key, label, icon: Icon, color, activeBg }) => {
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleTabChange(key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px 10px',
                  borderRadius: '10px',
                  border: 'none',
                  background: isActive ? activeBg : '#eff6ff',
                  color: isActive ? '#fff' : '#475569',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  boxShadow: isActive ? '0 6px 12px rgba(109, 40, 217, 0.18)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                <Icon size={15} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px', alignItems: 'start', width: '100%' }}>
          <div>
            {/* Banner and timeline removed */}

            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '20px', boxShadow: '0 10px 24px rgba(109, 40, 217, 0.04)' }}>
              {error && <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', borderRadius: '10px', padding: '10px 12px' }}><AlertCircle size={16} /><span>{error}</span></div>}
              {success && <div className="alert alert-success" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', borderRadius: '10px', padding: '10px 12px' }}><CheckCircle2 size={16} /><span>{success}</span></div>}

              <form onSubmit={handleSubmit} className="student-form">
                {activeTab === 'OUTPASS' && (
                  <>
                    <div style={{ marginBottom: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                        <div style={{ width: '26px', height: '26px', borderRadius: '8px', background: '#eff6ff', color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>1</div>
                        <div>
                          <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>Student Category (Out-Pass Route)</div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>Select your category to proceed</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-[12px]">
                        <div onClick={() => setForm(f => ({ ...f, studentType: 'DAY_SCHOLAR' }))} style={{ cursor: 'pointer', borderRadius: '12px', padding: '14px 16px', border: form.studentType === 'DAY_SCHOLAR' ? '2px solid #2563EB' : '1px solid #e2e8f0', background: form.studentType === 'DAY_SCHOLAR' ? '#eff6ff' : '#f8fafc', boxShadow: form.studentType === 'DAY_SCHOLAR' ? '0 8px 18px rgba(109, 40, 217, 0.08)' : 'none' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><GraduationCap size={18} color="#2563EB" /><strong style={{ fontSize: '14px', color: '#0f172a' }}>Day Scholar</strong></div>
                            {form.studentType === 'DAY_SCHOLAR' && <CheckCircle2 size={16} color="#2563EB" />}
                          </div>
                          {/* Workflow text removed */}
                        </div>

                        <div onClick={() => setForm(f => ({ ...f, studentType: 'HOSTELER' }))} style={{ cursor: 'pointer', borderRadius: '12px', padding: '14px 16px', border: form.studentType === 'HOSTELER' ? '2px solid #2563EB' : '1px solid #e2e8f0', background: form.studentType === 'HOSTELER' ? '#eff6ff' : '#f8fafc', boxShadow: form.studentType === 'HOSTELER' ? '0 8px 18px rgba(109, 40, 217, 0.08)' : 'none' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Home size={18} color="#2563EB" /><strong style={{ fontSize: '14px', color: '#0f172a' }}>Hosteler</strong></div>
                            {form.studentType === 'HOSTELER' && <CheckCircle2 size={16} color="#2563EB" />}
                          </div>
                          {/* Workflow text removed */}
                        </div>
                      </div>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                        <div style={{ width: '26px', height: '26px', borderRadius: '8px', background: '#eff6ff', color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>2</div>
                        <div>
                          <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>Reason for Leaving Campus</div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>Clearly mention the reason for your out-pass request</div>
                        </div>
                      </div>

                      <textarea required rows={3} className="form-input" placeholder="Explain the specific reason you need to leave campus..." value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} style={{ borderRadius: '10px', padding: '12px 14px', minHeight: '76px', border: '1px solid #dfe7f1', background: '#f8fafc', width: '100%' }} />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-[8px] mt-[12px]">
                        {/* Quick reasons removed */}
                      </div>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                        <div style={{ width: '26px', height: '26px', borderRadius: '8px', background: '#eff6ff', color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>3</div>
                        <div>
                          <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>Out-Pass Details</div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>Select your expected out and return date</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-[12px]">
                        <div>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}><Calendar size={13} color="#2563EB" /> Out Date</label>
                          <input type="date" required className="form-input" min={getTodayDateString()} value={form.outDate} onChange={e => { const value = e.target.value; const validationError = validateLeaveDateRange(value, form.expectedReturnDate); if (validationError) { setError(validationError); return; } setError(''); setForm(f => ({ ...f, outDate: value })); }} style={{ borderRadius: '10px', padding: '10px 12px', height: '44px', border: '1px solid #dfe7f1', background: '#f8fafc', width: '100%' }} />
                        </div>
                        <div>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}><Clock size={13} color="#2563EB" /> Out Time</label>
                          <input type="time" required className="form-input" value={form.outTime} onChange={e => setForm(f => ({ ...f, outTime: e.target.value }))} style={{ borderRadius: '10px', padding: '10px 12px', height: '44px', border: '1px solid #dfe7f1', background: '#f8fafc', width: '100%' }} />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}><Calendar size={13} color="#2563EB" /> Return Date</label>
                          <input type="date" required className="form-input" min={form.outDate || getTodayDateString()} value={form.expectedReturnDate} onChange={e => { const value = e.target.value; const validationError = validateLeaveDateRange(form.outDate, value); if (validationError) { setError(validationError); return; } setError(''); setForm(f => ({ ...f, expectedReturnDate: value })); }} style={{ borderRadius: '10px', padding: '10px 12px', height: '44px', border: '1px solid #dfe7f1', background: '#f8fafc', width: '100%' }} />
                        </div>
                      </div>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                        <div style={{ width: '26px', height: '26px', borderRadius: '8px', background: '#eff6ff', color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>4</div>
                        <div>
                          <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>Emergency Contact</div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>Provide parent/guardian contact number for emergency communication</div>
                        </div>
                      </div>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}><Phone size={13} color="#2563EB" /> Parent Number</label>
                      <input type="tel" required className="form-input" placeholder="e.g. 9392393340" value={form.emergencyContact} onChange={e => setForm(f => ({ ...f, emergencyContact: e.target.value.replace(/\D/g, '').slice(0, 10) }))} style={{ borderRadius: '10px', padding: '10px 12px', height: '44px', border: '1px solid #dfe7f1', background: '#f8fafc', width: '100%' }} />
                    </div>
                  </>
                )}

                {activeTab === 'MESS_FEE' && (
                  <>
                    {['Clearance Purpose', 'Hostel Staying Period', 'Payment Details'].map((section, sectionIndex) => (
                      <div key={section} style={{ marginBottom: '18px', padding: '16px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                          <div style={{ width: '24px', height: '24px', borderRadius: '8px', background: '#eff6ff', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>{sectionIndex + 1}</div>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>{section}</div>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>
                              {sectionIndex === 0 && 'Provide the mess fee clearance reason'}
                              {sectionIndex === 1 && 'Select the relevant clearance period'}
                              {sectionIndex === 2 && 'Enter the amount and payment status'}
                            </div>
                          </div>
                        </div>

                        {sectionIndex === 0 && (
                          <>
                            <textarea required rows={2} className="form-input" placeholder="e.g. Mess Fee Settlement for Fall Semester 2026..." value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} style={{ borderRadius: '10px', padding: '12px 14px', minHeight: '70px', border: '1px solid #dfe7f1', background: '#f8fafc', width: '100%' }} />
                            {/* Quick reasons removed */}
                          </>
                        )}

                        {sectionIndex === 1 && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-[12px]">
                            <div>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}><Calendar size={13} color="#2563EB" /> Joining Date</label>
                              <input type="date" required className="form-input" min={getTodayDateString()} value={form.startDate} onChange={e => { const value = e.target.value; const validationError = validateLeaveDateRange(value, form.endDate); if (validationError) { setError(validationError); return; } setError(''); setForm(f => ({ ...f, startDate: value })); }} style={{ borderRadius: '10px', padding: '10px 12px', height: '44px', border: '1px solid #dfe7f1', background: '#f8fafc', width: '100%' }} />
                            </div>
                            <div>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}><Calendar size={13} color="#2563EB" /> Vacating Date</label>
                              <input type="date" required className="form-input" min={form.startDate || getTodayDateString()} value={form.endDate} onChange={e => { const value = e.target.value; const validationError = validateLeaveDateRange(form.startDate, value); if (validationError) { setError(validationError); return; } setError(''); setForm(f => ({ ...f, endDate: value })); }} style={{ borderRadius: '10px', padding: '10px 12px', height: '44px', border: '1px solid #dfe7f1', background: '#f8fafc', width: '100%' }} />
                            </div>
                          </div>
                        )}

                        {sectionIndex === 2 && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-[12px]">
                            <div>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}><DollarSign size={13} color="#2563EB" /> Mess Fee Amount (₹)</label>
                              <input type="number" required min="0" step="1" placeholder="e.g. 5200" className="form-input" value={form.messAmount} onChange={e => setForm(f => ({ ...f, messAmount: e.target.value }))} style={{ borderRadius: '10px', padding: '10px 12px', height: '44px', border: '1px solid #dfe7f1', background: '#f8fafc', width: '100%' }} />
                            </div>
                            <div>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}><CheckCircle2 size={13} color="#2563EB" /> Payment Status</label>
                              <select className="form-input" value={form.paidStatus} onChange={e => setForm(f => ({ ...f, paidStatus: e.target.value }))} style={{ borderRadius: '10px', padding: '10px 12px', height: '44px', border: '1px solid #dfe7f1', background: '#f8fafc', width: '100%' }}><option value="Paid">Paid (Full Payment Done)</option><option value="Partially Paid">Partially Paid</option><option value="Not Paid">Not Paid (Pending Verification)</option></select>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    <div style={{ marginBottom: '18px', padding: '16px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><UploadCloud size={14} color="#2563EB" /> Payment Proof / Receipt *</span>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>PDF, PNG, JPG (max 10MB)</span>
                      </label>

                      {form.documentUrl ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '10px', background: '#eff6ff', border: '1px solid #dbeafe' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}><Check size={16} color="#2563EB" /><span style={{ fontSize: '13px', fontWeight: 600, color: '#1e40af', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{form.documentName || 'Attached Document'}</span></div>
                          <button type="button" onClick={handleRemoveFile} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '4px' }} title="Remove file"><Trash2 size={14} /></button>
                        </div>
                      ) : (
                        <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px', borderRadius: '10px', border: '2px dashed #dfe7f1', background: '#f8fafc', cursor: uploadingDoc ? 'wait' : 'pointer', transition: 'border-color 0.2s' }}>
                          <input type="file" accept=".pdf,.png,.jpg,.jpeg" style={{ display: 'none' }} disabled={uploadingDoc} onChange={handleFileUpload} />
                          <UploadCloud size={22} color={uploadingDoc ? '#2563EB' : '#64748b'} />
                          <span style={{ fontSize: '12px', marginTop: '6px', color: '#475569' }}>{uploadingDoc ? 'Uploading receipt...' : 'Click to attach any proof'}</span>
                        </label>
                      )}
                    </div>
                  </>
                )}

                {activeTab === 'INTERNSHIP' && (
                  <>
                    {[
                      { title: 'Company Information', body: (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-[12px]">
                          <div><label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}><Building size={13} color="#2563EB" /> Company Name</label><input type="text" required placeholder="e.g. Google, TCS, Infosys" className="form-input" value={form.companyName} onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))} style={{ borderRadius: '10px', padding: '10px 12px', height: '44px', border: '1px solid #dfe7f1', background: '#f8fafc', width: '100%' }} /></div>
                          <div><label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}><MapPin size={13} color="#2563EB" /> Company Location</label><input type="text" required placeholder="e.g. Hyderabad, Bangalore, Remote" className="form-input" value={form.companyLocation} onChange={e => setForm(f => ({ ...f, companyLocation: e.target.value }))} style={{ borderRadius: '10px', padding: '10px 12px', height: '44px', border: '1px solid #dfe7f1', background: '#f8fafc', width: '100%' }} /></div>
                        </div>
                      ) },
                      { title: 'Role & Mode', body: (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-[12px]">
                          <div><label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}><Briefcase size={13} color="#2563EB" /> Role</label><input type="text" required placeholder="e.g. Software Engineer Intern" className="form-input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} style={{ borderRadius: '10px', padding: '10px 12px', height: '44px', border: '1px solid #dfe7f1', background: '#f8fafc', width: '100%' }} /></div>
                          <div><label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}><Laptop size={13} color="#2563EB" /> Internship Mode</label><select className="form-input" value={form.internshipMode} onChange={e => setForm(f => ({ ...f, internshipMode: e.target.value }))} style={{ borderRadius: '10px', padding: '10px 12px', height: '44px', border: '1px solid #dfe7f1', background: '#f8fafc', width: '100%' }}><option value="Offline">Offline (Onsite)</option><option value="Online">Online (Work from Home)</option><option value="Hybrid">Hybrid</option></select></div>
                        </div>
                      ) },
                      { title: 'Internship Duration', body: (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-[12px]">
                          <div><label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}><Calendar size={13} color="#2563EB" /> Internship Start Date</label><input type="date" required className="form-input" min={getTodayDateString()} value={form.startDate} onChange={e => { const value = e.target.value; const validationError = validateLeaveDateRange(value, form.endDate); if (validationError) { setError(validationError); return; } setError(''); setForm(f => ({ ...f, startDate: value })); }} style={{ borderRadius: '10px', padding: '10px 12px', height: '44px', border: '1px solid #dfe7f1', background: '#f8fafc', width: '100%' }} /></div>
                          <div><label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}><Calendar size={13} color="#2563EB" /> Internship End Date</label><input type="date" required className="form-input" min={form.startDate || getTodayDateString()} value={form.endDate} onChange={e => { const value = e.target.value; const validationError = validateLeaveDateRange(form.startDate, value); if (validationError) { setError(validationError); return; } setError(''); setForm(f => ({ ...f, endDate: value })); }} style={{ borderRadius: '10px', padding: '10px 12px', height: '44px', border: '1px solid #dfe7f1', background: '#f8fafc', width: '100%' }} /></div>
                        </div>
                      ) }
                    ].map(({ title, body }, idx) => (
                      <div key={title} style={{ marginBottom: '18px', padding: '16px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                          <div style={{ width: '24px', height: '24px', borderRadius: '8px', background: '#eff6ff', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>{idx + 1}</div>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>{title}</div>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>{idx === 0 ? 'Enter the internship details' : idx === 1 ? 'Specify the internship role and mode' : 'Select the internship start and end dates'}</div>
                          </div>
                        </div>
                        {body}
                      </div>
                    ))}

                    <div style={{ marginBottom: '18px', padding: '16px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><UploadCloud size={14} color="#2563EB" /> Offer Letter / Selection Email *</span>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>PDF, PNG, JPG (max 10MB)</span>
                      </label>

                      {form.documentUrl ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '10px', background: '#eff6ff', border: '1px solid #dbeafe' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}><Check size={16} color="#2563EB" /><span style={{ fontSize: '13px', fontWeight: 600, color: '#1e40af', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{form.documentName || 'Attached Offer Letter'}</span></div>
                          <button type="button" onClick={handleRemoveFile} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '4px' }} title="Remove file"><Trash2 size={14} /></button>
                        </div>
                      ) : (
                        <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px', borderRadius: '10px', border: '2px dashed #dfe7f1', background: '#f8fafc', cursor: uploadingDoc ? 'wait' : 'pointer', transition: 'border-color 0.2s' }}>
                          <input type="file" accept=".pdf,.png,.jpg,.jpeg" style={{ display: 'none' }} disabled={uploadingDoc} onChange={handleFileUpload} />
                          <UploadCloud size={22} color={uploadingDoc ? '#2563EB' : '#64748b'} />
                          <span style={{ fontSize: '12px', marginTop: '6px', color: '#475569' }}>{uploadingDoc ? 'Uploading document...' : 'Click to attach internship offer letter or email'}</span>
                        </label>
                      )}
                    </div>
                  </>
                )}

                {activeTab === 'LIBRARY' && (
                  <>
                    {/* Library workflow info removed */}

                    <div style={{ marginBottom: '18px', padding: '16px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '8px', background: '#eff6ff', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>1</div>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>Library Access Details</div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>Provide your access information and purpose</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-[12px] mb-[14px]">
                        <div>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}><User size={13} color="#2563EB" /> Student Roll Number</label>
                          <input type="text" disabled className="form-input" value={user?.rollNo || user?.username || ''} style={{ background: '#f8fafc', cursor: 'not-allowed', borderRadius: '10px', padding: '10px 12px', height: '44px', border: '1px solid #dfe7f1', width: '100%' }} />
                        </div>
                        <div>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}><Calendar size={13} color="#2563EB" /> Access / Clearance Date</label>
                          <input type="date" required className="form-input" min={getTodayDateString()} value={form.requestDate} onChange={e => { const value = e.target.value; const validationError = validateLeaveDateRange(value, value); if (validationError) { setError(validationError); return; } setError(''); setForm(f => ({ ...f, requestDate: value })); }} style={{ borderRadius: '10px', padding: '10px 12px', height: '44px', border: '1px solid #dfe7f1', background: '#f8fafc', width: '100%' }} />
                        </div>
                      </div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}><FileText size={14} color="#2563EB" /> Purpose</label>
                      <textarea required rows={2} className="form-input" placeholder="Specify books to borrow, reading hall hours, or no-dues requirement..." value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} style={{ borderRadius: '10px', padding: '12px 14px', minHeight: '70px', border: '1px solid #dfe7f1', background: '#f8fafc', width: '100%' }} />
                      {/* Quick reasons removed */}
                    </div>
                  </>
                )}

                {/* Final workflow summary removed */}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button type="button" onClick={handleReset} style={{ minWidth: '110px', padding: '12px 18px', borderRadius: '10px', minHeight: '46px', fontSize: '14px', border: '1px solid #dfe7f1', background: '#fff', color: '#334155', cursor: 'pointer' }}>
                    Reset
                  </button>
                  <button type="submit" disabled={submitting || uploadingDoc} style={{ minWidth: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 18px', borderRadius: '10px', minHeight: '46px', fontSize: '14px', background: 'linear-gradient(135deg, #2563EB 0%, #2563eb 100%)', color: '#fff', border: 'none', cursor: submitting || uploadingDoc ? 'not-allowed' : 'pointer', opacity: submitting || uploadingDoc ? 0.8 : 1 }}>
                    {submitting ? (
                      <><span style={{ width: 15, height: 15, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.5)', borderTopColor: '#fff', display: 'inline-block', animation: 'spin 1s linear infinite' }} /> <span>Submitting Request...</span></>
                    ) : (
                      <><Sparkles size={16} /><span>Submit</span></>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <aside style={{ display: 'flex', flexDirection: 'column', gap: '18px' }} />
        </div>
      </div>
    </DashboardLayout>
  );
}
