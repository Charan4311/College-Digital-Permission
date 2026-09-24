import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import api from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  LuFileText as FileText,
  LuCalendar as Calendar,
  LuClock as Clock,
  LuCirclePlus as PlusCircle,
  LuQrCode as QrCode,
  LuCircleCheck as CheckCircle2,
  LuCircleAlert as AlertCircle,
  LuBuilding as Building,
  LuUser as User,
  LuHouse as Home,
  LuGraduationCap as GraduationCap,
  LuShieldCheck as ShieldCheck,
  LuSparkles as Sparkles,
  LuBriefcase as Briefcase,
  LuBookOpen as BookOpen,
  LuReceipt as Receipt,
  LuCloudUpload as UploadCloud,
  LuTrash2 as Trash2,
  LuDollarSign as DollarSign,
  LuMapPin as MapPin,
  LuLaptop as Laptop,
  LuCheck as Check,
  LuPhone as Phone
} from 'react-icons/lu';

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
  parentNumber: '',
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
  parentNumber: '',
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
      if (!/^\d{10}$/.test(form.parentNumber)) {
        setError('Parent number must be exactly 10 digits.');
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
      <div className="student-permission-page" style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <header className="page-header" style={{ marginBottom: '18px' }}>
          <div className="eyebrow">Student Portal</div>
          <h1 className="page-title">Digital Permissions & Clearance Hub</h1>
          <p className="page-subtitle">
            Logged in as <strong style={{ color: '#0f172a' }}>{user?.name}</strong> ({user?.rollNo || user?.username})
          </p>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-[8px]" style={{ marginBottom: '20px', padding: '6px', background: '#f2f5fa', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
          {[
            { key: 'OUTPASS', label: 'Out-Pass', icon: GraduationCap, color: '#7C3AED', activeBg: '#6D28D9' },
            { key: 'MESS_FEE', label: 'Mess Fee', icon: Receipt, color: '#7C3AED', activeBg: '#6D28D9' },
            { key: 'INTERNSHIP', label: 'Internship', icon: Briefcase, color: '#0f172a', activeBg: '#6D28D9' },
            { key: 'LIBRARY', label: 'Library', icon: BookOpen, color: '#0f172a', activeBg: '#6D28D9' }
          ].map(({ key, label, icon: Icon, color, activeBg }) => {
            const isActive = activeTab === key;
            return (
              <Button
                key={key}
                type="button"
                onClick={() => handleTabChange(key)}
                className={isActive ? 'flex items-center justify-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white shadow-md' : 'flex items-center justify-center gap-2 rounded-xl bg-violet-50 text-slate-700 hover:bg-violet-100'}
              >
                <Icon size={15} />
                <span>{label}</span>
              </Button>
            );
          })}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px', alignItems: 'start', width: '100%' }}>
          <div>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '18px 18px 20px', boxShadow: '0 10px 24px rgba(109, 40, 217, 0.04)' }}>
              {error && <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', borderRadius: '10px', padding: '10px 12px' }}><AlertCircle size={16} /><span>{error}</span></div>}
              {success && <div className="alert alert-success" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', borderRadius: '10px', padding: '10px 12px' }}><CheckCircle2 size={16} /><span>{success}</span></div>}

              <form onSubmit={handleSubmit} className="student-form">
                {activeTab === 'OUTPASS' && (
                  <>
                    <div style={{ marginBottom: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                        <div style={{ width: '26px', height: '26px', borderRadius: '8px', background: '#f3e8ff', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>1</div>
                        <div>
                          <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>Student Category (Out-Pass Route)</div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>Select your category to proceed</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-[12px]">
                        <div onClick={() => setForm(f => ({ ...f, studentType: 'DAY_SCHOLAR' }))} style={{ cursor: 'pointer', borderRadius: '12px', padding: '14px 16px', border: form.studentType === 'DAY_SCHOLAR' ? '2px solid #6D28D9' : '1px solid #e2e8f0', background: form.studentType === 'DAY_SCHOLAR' ? '#f3e8ff' : '#f8fafc', boxShadow: form.studentType === 'DAY_SCHOLAR' ? '0 8px 18px rgba(109, 40, 217, 0.08)' : 'none' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><GraduationCap size={18} color="#6D28D9" /><strong style={{ fontSize: '14px', color: '#0f172a' }}>Day Scholar</strong></div>
                            {form.studentType === 'DAY_SCHOLAR' && <CheckCircle2 size={16} color="#6D28D9" />}
                          </div>
                          {/* Workflow text removed */}
                        </div>

                        <div onClick={() => setForm(f => ({ ...f, studentType: 'HOSTELER' }))} style={{ cursor: 'pointer', borderRadius: '12px', padding: '14px 16px', border: form.studentType === 'HOSTELER' ? '2px solid #6D28D9' : '1px solid #e2e8f0', background: form.studentType === 'HOSTELER' ? '#f3e8ff' : '#f8fafc', boxShadow: form.studentType === 'HOSTELER' ? '0 8px 18px rgba(109, 40, 217, 0.08)' : 'none' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Home size={18} color="#6D28D9" /><strong style={{ fontSize: '14px', color: '#0f172a' }}>Hosteler</strong></div>
                            {form.studentType === 'HOSTELER' && <CheckCircle2 size={16} color="#6D28D9" />}
                          </div>
                          {/* Workflow text removed */}
                        </div>
                      </div>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                        <div style={{ width: '26px', height: '26px', borderRadius: '8px', background: '#f3e8ff', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>2</div>
                        <div>
                          <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>Reason for Leaving Campus</div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>Clearly mention the reason for your out-pass request</div>
                        </div>
                      </div>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}><FileText size={14} color="#6D28D9" /> Reason for Leaving Campus</label>
                      <Textarea required rows={3} className="form-input" placeholder="Explain the specific reason you need to leave campus..." value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-[8px] mt-[12px]">
                        {/* Quick reasons removed */}
                      </div>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                        <div style={{ width: '26px', height: '26px', borderRadius: '8px', background: '#f3e8ff', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>3</div>
                        <div>
                          <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>Out-Pass Details</div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>Select your expected out and return date</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-[12px]">
                        <div>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}><Calendar size={13} color="#6D28D9" /> Out Date</label>
                          <Input type="date" required min={getTodayDateString()} value={form.outDate} onChange={e => { const value = e.target.value; const validationError = validateLeaveDateRange(value, form.expectedReturnDate); if (validationError) { setError(validationError); return; } setError(''); setForm(f => ({ ...f, outDate: value })); }} />
                        </div>
                        <div>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}><Clock size={13} color="#6D28D9" /> Out Time</label>
                          <Input type="time" required value={form.outTime} onChange={e => setForm(f => ({ ...f, outTime: e.target.value }))} />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}><Calendar size={13} color="#6D28D9" /> Return Date</label>
                          <Input type="date" required min={form.outDate || getTodayDateString()} value={form.expectedReturnDate} onChange={e => { const value = e.target.value; const validationError = validateLeaveDateRange(form.outDate, value); if (validationError) { setError(validationError); return; } setError(''); setForm(f => ({ ...f, expectedReturnDate: value })); }} />
                        </div>
                      </div>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                        <div style={{ width: '26px', height: '26px', borderRadius: '8px', background: '#f3e8ff', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>4</div>
                        <div>
                          <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>Parent Number</div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>Provide parent/guardian contact number</div>
                        </div>
                      </div>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}><Phone size={13} color="#6D28D9" /> Parent Phone Number</label>
                      <Input type="tel" required placeholder="e.g. 9392393340" value={form.parentNumber} onChange={e => setForm(f => ({ ...f, parentNumber: e.target.value.replace(/\D/g, '').slice(0, 10) }))} />
                    </div>
                  </>
                )}

                {activeTab === 'MESS_FEE' && (
                  <>
                    {['Clearance Purpose', 'Hostel Staying Period', 'Payment Details'].map((section, sectionIndex) => (
                      <div key={section} style={{ marginBottom: '18px', padding: '16px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                          <div style={{ width: '24px', height: '24px', borderRadius: '8px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>{sectionIndex + 1}</div>
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
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}><Receipt size={14} color="#059669" /> Clearance Reason / Purpose</label>
                            <Textarea required rows={2} placeholder="e.g. Mess Fee Settlement for Fall Semester 2026..." value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
                            {/* Quick reasons removed */}
                          </>
                        )}

                        {sectionIndex === 1 && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-[12px]">
                            <div>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}><Calendar size={13} color="#059669" /> Joining Date</label>
                              <Input type="date" required min={getTodayDateString()} value={form.startDate} onChange={e => { const value = e.target.value; const validationError = validateLeaveDateRange(value, form.endDate); if (validationError) { setError(validationError); return; } setError(''); setForm(f => ({ ...f, startDate: value })); }} />
                            </div>
                            <div>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}><Calendar size={13} color="#059669" /> Vacating Date</label>
                              <Input type="date" required min={form.startDate || getTodayDateString()} value={form.endDate} onChange={e => { const value = e.target.value; const validationError = validateLeaveDateRange(form.startDate, value); if (validationError) { setError(validationError); return; } setError(''); setForm(f => ({ ...f, endDate: value })); }} />
                            </div>
                          </div>
                        )}

                        {sectionIndex === 2 && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-[12px]">
                            <div>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}><DollarSign size={13} color="#059669" /> Mess Fee Amount (₹)</label>
                              <Input type="number" required min="0" step="1" placeholder="e.g. 5200" value={form.messAmount} onChange={e => setForm(f => ({ ...f, messAmount: e.target.value }))} />
                            </div>
                            <div>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}><CheckCircle2 size={13} color="#059669" /> Payment Status</label>
                              <Select value={form.paidStatus} onValueChange={value => setForm(f => ({ ...f, paidStatus: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Paid">Paid (Full Payment Done)</SelectItem><SelectItem value="Partially Paid">Partially Paid</SelectItem><SelectItem value="Not Paid">Not Paid (Pending Verification)</SelectItem></SelectContent></Select>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    <div style={{ marginBottom: '18px', padding: '16px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><UploadCloud size={14} color="#059669" /> Payment Proof / Receipt *</span>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>PDF, PNG, JPG (max 10MB)</span>
                      </label>

                      {form.documentUrl ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '10px', background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}><Check size={16} color="#059669" /><span style={{ fontSize: '13px', fontWeight: 600, color: '#065f46', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{form.documentName || 'Attached Document'}</span></div>
                          <Button type="button" variant="ghost" size="icon" onClick={handleRemoveFile} title="Remove file"><Trash2 size={14} /></Button>
                        </div>
                      ) : (
                        <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px', borderRadius: '10px', border: '2px dashed #dfe7f1', background: '#f8fafc', cursor: uploadingDoc ? 'wait' : 'pointer', transition: 'border-color 0.2s' }}>
                          <input type="file" accept=".pdf,.png,.jpg,.jpeg" style={{ display: 'none' }} disabled={uploadingDoc} onChange={handleFileUpload} />
                          <UploadCloud size={22} color={uploadingDoc ? '#059669' : '#64748b'} />
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
                          <div><label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}><Building size={13} color="#6D28D9" /> Company Name</label><Input type="text" required placeholder="e.g. Google, TCS, Infosys" value={form.companyName} onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))} /></div>
                          <div><label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}><MapPin size={13} color="#6D28D9" /> Company Location</label><Input type="text" required placeholder="e.g. Hyderabad, Bangalore, Remote" value={form.companyLocation} onChange={e => setForm(f => ({ ...f, companyLocation: e.target.value }))} /></div>
                        </div>
                      ) },
                      { title: 'Role & Mode', body: (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-[12px]">
                          <div><label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}><Briefcase size={13} color="#6D28D9" /> Role</label><Input type="text" required placeholder="e.g. Software Engineer Intern" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} /></div>
                          <div><label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}><Laptop size={13} color="#6D28D9" /> Internship Mode</label><Select value={form.internshipMode} onValueChange={value => setForm(f => ({ ...f, internshipMode: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Offline">Offline (Onsite)</SelectItem><SelectItem value="Online">Online (Work from Home)</SelectItem><SelectItem value="Hybrid">Hybrid</SelectItem></SelectContent></Select></div>
                        </div>
                      ) },
                      { title: 'Internship Duration', body: (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-[12px]">
                          <div><label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}><Calendar size={13} color="#6D28D9" /> Internship Start Date</label><Input type="date" required min={getTodayDateString()} value={form.startDate} onChange={e => { const value = e.target.value; const validationError = validateLeaveDateRange(value, form.endDate); if (validationError) { setError(validationError); return; } setError(''); setForm(f => ({ ...f, startDate: value })); }} /></div>
                          <div><label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}><Calendar size={13} color="#6D28D9" /> Internship End Date</label><Input type="date" required min={form.startDate || getTodayDateString()} value={form.endDate} onChange={e => { const value = e.target.value; const validationError = validateLeaveDateRange(form.startDate, value); if (validationError) { setError(validationError); return; } setError(''); setForm(f => ({ ...f, endDate: value })); }} /></div>
                        </div>
                      ) }
                    ].map(({ title, body }, idx) => (
                      <div key={title} style={{ marginBottom: '18px', padding: '16px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                          <div style={{ width: '24px', height: '24px', borderRadius: '8px', background: '#f3e8ff', color: '#6D28D9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>{idx + 1}</div>
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
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><UploadCloud size={14} color="#6D28D9" /> Offer Letter / Selection Email *</span>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>PDF, PNG, JPG (max 10MB)</span>
                      </label>

                      {form.documentUrl ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '10px', background: '#f3e8ff', border: '1px solid #e9d5ff' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}><Check size={16} color="#6D28D9" /><span style={{ fontSize: '13px', fontWeight: 600, color: '#1e40af', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{form.documentName || 'Attached Offer Letter'}</span></div>
                          <Button type="button" onClick={handleRemoveFile} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '4px' }} title="Remove file"><Trash2 size={14} /></Button>
                        </div>
                      ) : (
                        <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px', borderRadius: '10px', border: '2px dashed #dfe7f1', background: '#f8fafc', cursor: uploadingDoc ? 'wait' : 'pointer', transition: 'border-color 0.2s' }}>
                          <input type="file" accept=".pdf,.png,.jpg,.jpeg" style={{ display: 'none' }} disabled={uploadingDoc} onChange={handleFileUpload} />
                          <UploadCloud size={22} color={uploadingDoc ? '#6D28D9' : '#64748b'} />
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
                        <div style={{ width: '24px', height: '24px', borderRadius: '8px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>1</div>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>Library Access Details</div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>Provide your access information and purpose</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-[12px] mb-[14px]">
                        <div>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}><User size={13} color="#d97706" /> Student Roll Number</label>
                          <Input type="text" disabled value={user?.rollNo || user?.username || ''} />
                        </div>
                        <div>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}><Calendar size={13} color="#d97706" /> Access / Clearance Date</label>
                          <Input type="date" required min={getTodayDateString()} value={form.requestDate} onChange={e => { const value = e.target.value; const validationError = validateLeaveDateRange(value, value); if (validationError) { setError(validationError); return; } setError(''); setForm(f => ({ ...f, requestDate: value })); }} />
                        </div>
                      </div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}><FileText size={14} color="#d97706" /> Purpose</label>
                      <Textarea required rows={2} placeholder="Specify books to borrow, reading hall hours, or no-dues requirement..." value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
                      {/* Quick reasons removed */}
                    </div>
                  </>
                )}

                {/* Final workflow summary removed */}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <Button type="button" variant="outline" onClick={handleReset} className="min-w-[110px] min-h-[46px]">
                    Reset
                  </Button>
                  <Button type="submit" disabled={submitting || uploadingDoc} className="min-w-[220px] min-h-[46px] gap-2">
                    {submitting ? (
                      <><span style={{ width: 15, height: 15, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.5)', borderTopColor: '#fff', display: 'inline-block', animation: 'spin 1s linear infinite' }} /> <span>Submitting Request...</span></>
                    ) : (
                      <><Sparkles size={16} /><span>{activeTab === 'OUTPASS' && 'Submit Out-Pass Request'}{activeTab === 'MESS_FEE' && 'Submit Mess Fee Clearance'}{activeTab === 'INTERNSHIP' && 'Submit Internship Permission'}{activeTab === 'LIBRARY' && 'Submit Library Request'}</span></>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}
