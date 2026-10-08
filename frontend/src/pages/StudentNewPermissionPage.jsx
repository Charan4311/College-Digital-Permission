import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import StudentLayout from '../components/StudentLayout';
import api from '../lib/api';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building,
  GraduationCap,
  Briefcase,
  BookOpen,
  IndianRupee,
  UploadCloud,
  Trash2,
  Laptop,
  Check,
  Phone,
  MapPin
} from 'lucide-react';

const getTodayDateString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getMaxDateString = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getNextMonthDateString = () => {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getInitialFormState = (tab = 'OUTPASS') => ({
  requestType: tab,
  reason: '',
  documentUrl: '',
  documentName: '',
  emergencyContact: '',
  outDate: '',
  outTime: '',
  expectedReturnDate: '',
  startDate: '',
  endDate: '',
  messAmount: '',
  paidStatus: 'Paid',
  companyName: '',
  companyLocation: '',
  role: '',
  internshipMode: 'Offline',
  sector: '',
  requestDate: ''
});

const PERMISSION_TABS = [
  { key: 'OUTPASS', label: 'Out-Pass', icon: GraduationCap },
  { key: 'MESS_FEE', label: 'Mess Fee', icon: IndianRupee },
  { key: 'INTERNSHIP', label: 'Internship', icon: Briefcase },
  { key: 'LIBRARY', label: 'Library', icon: BookOpen }
];

const SECTOR_OPTIONS = [
  'Software & IT',
  'Core Engineering',
  'Data Science & AI',
  'Finance & Banking',
  'Research & Academia',
  'Government & PSU',
  'Consulting & Operations'
];

export default function StudentNewPermissionPage() {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('OUTPASS');
  const [form, setForm] = useState(() => getInitialFormState('OUTPASS'));

  const todayStr = getTodayDateString();
  const maxDateStr = getMaxDateString();

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setError('');
    setSuccess('');
    setForm(getInitialFormState(tab));
  };

  const handleReset = () => {
    setError('');
    setSuccess('');
    setForm(getInitialFormState(activeTab));
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
      const res = await api.post('/outpass/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setForm(f => ({
        ...f,
        documentUrl: res.data?.data?.fileUrl || res.data?.data?.secure_url,
        documentName: res.data?.data?.fileName || file.name
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

    // Common validations
    if (activeTab === 'OUTPASS') {
      if (!form.outDate || !form.outTime || !form.expectedReturnDate) {
        setError('Please select Out Date, Out Time, and Return Date.');
        return;
      }
      if (!/^\d{10}$/.test(form.emergencyContact)) {
        setError('Parent/Emergency contact number must be exactly 10 digits.');
        return;
      }
      if (form.expectedReturnDate < form.outDate) {
        setError('Return date cannot be earlier than out date.');
        return;
      }
      if (form.outDate === todayStr && form.outTime) {
        const now = new Date();
        const [h, m] = form.outTime.split(':').map(Number);
        const currentHours = now.getHours();
        const currentMinutes = now.getMinutes();
        if (h < currentHours || (h === currentHours && m < currentMinutes)) {
          setError('Out time cannot be in the past for today.');
          return;
        }
      }
    }

    if (activeTab === 'MESS_FEE') {
      if (!form.startDate || !form.endDate) {
        setError('Please select Hostel Entry Date and Vacating Date.');
        return;
      }
      const amt = Number(form.messAmount);
      if (!amt || isNaN(amt) || amt < 100 || amt > 60000 || amt % 100 !== 0) {
        setError('Mess fee amount must be a multiple of 100 between ₹100 and ₹60,000.');
        return;
      }
      if (form.endDate < form.startDate) {
        setError('Vacating date cannot be earlier than entry date.');
        return;
      }
      if (!form.documentUrl) {
        setError('Please upload the required mess fee receipt or clearance document.');
        return;
      }
    }

    if (activeTab === 'INTERNSHIP') {
      if (!form.sector) {
        setError('Please select an industry sector for your internship.');
        return;
      }
      if (!form.startDate || !form.endDate) {
        setError('Please select Internship Start Date and End Date.');
        return;
      }
      if (form.endDate < form.startDate) {
        setError('Internship end date cannot be earlier than start date.');
        return;
      }
      const startD = new Date(form.startDate);
      const endD = new Date(form.endDate);
      const diffMonths = (endD.getFullYear() - startD.getFullYear()) * 12 + (endD.getMonth() - startD.getMonth());
      if (diffMonths > 12) {
        setError('Internship duration cannot exceed 12 months.');
        return;
      }
      if (!form.documentUrl) {
        setError('Please upload the internship offer letter or selection proof.');
        return;
      }
    }

    if (activeTab === 'LIBRARY') {
      if (!form.requestDate) {
        setError('Please select Access Date.');
        return;
      }
      if (form.requestDate < todayStr) {
        setError('Access date cannot be in the past.');
        return;
      }
    }

    setSubmitting(true);

    try {
      const payload = {
        ...form,
        requestType: activeTab
      };

      if (activeTab === 'MESS_FEE') {
        payload.messAmount = Number(form.messAmount);
      }

      if (activeTab === 'INTERNSHIP') {
        payload.reason = `Internship at ${form.companyName} for ${form.role} role (${form.sector})`;
      }

      await api.post('/outpass', payload);

      const tabLabels = {
        OUTPASS: 'Campus Out-Pass',
        MESS_FEE: 'Mess Fee Clearance',
        INTERNSHIP: 'Internship Permission',
        LIBRARY: 'Library Permission'
      };

      setSuccess(`${tabLabels[activeTab]} request submitted successfully! Your request has been routed to CTPO.`);
      setForm(getInitialFormState(activeTab));
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to submit permission request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <StudentLayout pageTitle="New Permission" pageSubtitle="Fill in the details to request permission">
      {/* 4 Permission Tabs - Full Width Pill Bar */}
      <div
        className="s-perm-tabs-bar"
        style={{
          display: 'flex',
          width: '100%',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '6px',
          marginBottom: '20px',
          boxSizing: 'border-box',
          gap: '6px'
        }}
      >
        {PERMISSION_TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            className={"s-perm-tab" + (activeTab === key ? " active" : "")}
            onClick={() => handleTabChange(key)}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 16px',
              borderRadius: '8px',
              fontSize: '13.5px',
              fontWeight: activeTab === key ? 600 : 500,
              background: activeTab === key ? '#059669' : 'transparent',
              color: activeTab === key ? '#ffffff' : '#64748b',
              border: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
              boxShadow: activeTab === key ? '0 1px 3px rgba(5,150,105,0.3)' : 'none'
            }}
          >
            <Icon size={16} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      <div
        className="s-form-card"
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 'calc(100vh - 170px)',
          boxSizing: 'border-box'
        }}
      >
        {error && (
          <div className="s-alert s-alert-error" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '12px 16px', borderRadius: '10px', marginBottom: '20px', fontSize: '13.5px' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="s-alert s-alert-success" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', padding: '12px 16px', borderRadius: '10px', marginBottom: '20px', fontSize: '13.5px' }}>
            <CheckCircle2 size={16} />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="student-form" style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* 1. OUT-PASS FORM */}
            {activeTab === 'OUTPASS' && (
              <>
                {/* Section 1: Reason for Leaving Campus */}
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 20px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', borderRadius: '50%', background: '#ecfdf5', color: '#059669', fontSize: '11.5px', fontWeight: 700 }}>1</span>
                    <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>Reason for Leaving Campus</span>
                  </div>
                  <textarea
                    required
                    rows={3}
                    className="s-form-input"
                    placeholder="Explain the specific reason you need to leave campus..."
                    value={form.reason}
                    onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                    style={{
                      borderRadius: '8px',
                      padding: '12px 14px',
                      border: '1px solid #cbd5e1',
                      background: '#f8fafc',
                      width: '100%',
                      fontSize: '13.5px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Section 2: Out-Pass Details */}
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 20px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', borderRadius: '50%', background: '#ecfdf5', color: '#059669', fontSize: '11.5px', fontWeight: 700 }}>2</span>
                    <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>Out-Pass Details</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                        <Calendar size={14} color="#059669" />
                        <span>Out Date</span>
                      </label>
                      <input
                        type="date"
                        required
                        className="s-form-input"
                        min={todayStr}
                        max={maxDateStr}
                        value={form.outDate}
                        onChange={e => setForm(f => ({ ...f, outDate: e.target.value, expectedReturnDate: f.expectedReturnDate && e.target.value > f.expectedReturnDate ? e.target.value : f.expectedReturnDate }))}
                        style={{ width: '100%', height: '42px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 12px', fontSize: '13.5px', boxSizing: 'border-box' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                        <Clock size={14} color="#059669" />
                        <span>Out Time</span>
                      </label>
                      <input
                        type="time"
                        required
                        className="s-form-input"
                        value={form.outTime}
                        onChange={e => setForm(f => ({ ...f, outTime: e.target.value }))}
                        style={{ width: '100%', height: '42px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 12px', fontSize: '13.5px', boxSizing: 'border-box' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                        <Calendar size={14} color="#059669" />
                        <span>Return Date</span>
                      </label>
                      <input
                        type="date"
                        required
                        className="s-form-input"
                        min={form.outDate || todayStr}
                        max={maxDateStr}
                        value={form.expectedReturnDate}
                        onChange={e => setForm(f => ({ ...f, expectedReturnDate: e.target.value }))}
                        style={{ width: '100%', height: '42px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 12px', fontSize: '13.5px', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Section 3: Emergency Contact */}
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 20px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', borderRadius: '50%', background: '#ecfdf5', color: '#059669', fontSize: '11.5px', fontWeight: 700 }}>3</span>
                    <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>Emergency Contact</span>
                  </div>
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                      <Phone size={14} color="#059669" />
                      <span>Parent Number</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 9392393340"
                      className="s-form-input"
                      maxLength={10}
                      value={form.emergencyContact}
                      onChange={e => setForm(f => ({ ...f, emergencyContact: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                      style={{ width: '100%', height: '42px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 12px', fontSize: '13.5px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </>
            )}

            {/* 2. MESS FEE FORM */}
            {activeTab === 'MESS_FEE' && (
              <>
                {/* Section 1: Clearance Purpose */}
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 20px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', borderRadius: '50%', background: '#ecfdf5', color: '#059669', fontSize: '11.5px', fontWeight: 700 }}>1</span>
                    <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>Clearance Purpose</span>
                  </div>
                  <textarea
                    required
                    rows={3}
                    className="s-form-input"
                    placeholder="e.g. Mess Fee Settlement for Fall Semester 2026..."
                    value={form.reason}
                    onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                    style={{ borderRadius: '8px', padding: '12px 14px', border: '1px solid #cbd5e1', background: '#f8fafc', width: '100%', fontSize: '13.5px', boxSizing: 'border-box' }}
                  />
                </div>

                {/* Section 2: Hostel Staying Period */}
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 20px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', borderRadius: '50%', background: '#ecfdf5', color: '#059669', fontSize: '11.5px', fontWeight: 700 }}>2</span>
                    <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>Hostel Staying Period</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                        <Calendar size={14} color="#059669" />
                        <span>Entry Date</span>
                      </label>
                      <input
                        type="date"
                        required
                        className="s-form-input"
                        min={todayStr}
                        max={maxDateStr}
                        value={form.startDate}
                        onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                        style={{ width: '100%', height: '42px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 12px', fontSize: '13.5px', boxSizing: 'border-box' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                        <Calendar size={14} color="#059669" />
                        <span>Vacating Date</span>
                      </label>
                      <input
                        type="date"
                        required
                        className="s-form-input"
                        min={form.startDate || todayStr}
                        max={maxDateStr}
                        value={form.endDate}
                        onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                        style={{ width: '100%', height: '42px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 12px', fontSize: '13.5px', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Section 3: Payment Details */}
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 20px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', borderRadius: '50%', background: '#ecfdf5', color: '#059669', fontSize: '11.5px', fontWeight: 700 }}>3</span>
                    <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>Payment Details</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                        <IndianRupee size={14} color="#059669" />
                        <span>Mess Fee Amount</span>
                      </label>
                      <input
                        type="number"
                        required
                        min="100"
                        max="60000"
                        step="100"
                        placeholder="e.g. 5200"
                        className="s-form-input"
                        value={form.messAmount}
                        onChange={e => setForm(f => ({ ...f, messAmount: e.target.value }))}
                        style={{ width: '100%', height: '42px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 12px', fontSize: '13.5px', boxSizing: 'border-box' }}
                      />
                      {form.messAmount && (
                        <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                          Amount: ₹{Number(form.messAmount || 0).toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>

                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                        <CheckCircle2 size={14} color="#059669" />
                        <span>Payment Status</span>
                      </label>
                      <select
                        className="s-form-input"
                        value={form.paidStatus || 'Paid'}
                        onChange={e => setForm(f => ({ ...f, paidStatus: e.target.value }))}
                        style={{ width: '100%', height: '42px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 12px', fontSize: '13.5px', background: '#fff', boxSizing: 'border-box' }}
                      >
                        <option value="Paid">Paid (Full Payment Done)</option>
                        <option value="Partially Paid">Partially Paid</option>
                        <option value="Not Paid">Not Paid (Pending Verification)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section 4: Payment Proof / Receipt */}
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 20px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <UploadCloud size={16} color="#059669" />
                      <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>Payment Proof / Receipt *</span>
                    </div>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>PDF, PNG, JPG (max 10MB)</span>
                  </div>

                  {form.documentUrl ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: '8px', background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Check size={16} color="#059669" />
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#065f46' }}>{form.documentName || 'Mess_Receipt.pdf'}</span>
                      </div>
                      <button type="button" onClick={handleRemoveFile} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ) : (
                    <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px', borderRadius: '10px', border: '1.5px dashed #cbd5e1', background: '#f8fafc', cursor: uploadingDoc ? 'wait' : 'pointer' }}>
                      <input type="file" accept=".pdf,.png,.jpg,.jpeg" style={{ display: 'none' }} disabled={uploadingDoc} onChange={handleFileUpload} />
                      <UploadCloud size={24} color={uploadingDoc ? '#059669' : '#94a3b8'} />
                      <span style={{ fontSize: '12.5px', marginTop: '6px', color: '#64748b', fontWeight: 500 }}>
                        {uploadingDoc ? 'Uploading receipt...' : 'Click to attach any proof'}
                      </span>
                    </label>
                  )}
                </div>
              </>
            )}

            {/* 3. INTERNSHIP FORM */}
            {activeTab === 'INTERNSHIP' && (
              <>
                {/* Section 1: Company & Role Details */}
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 20px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', borderRadius: '50%', background: '#ecfdf5', color: '#059669', fontSize: '11.5px', fontWeight: 700 }}>1</span>
                    <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>Company & Role Details</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                        <Building size={14} color="#059669" />
                        <span>Company Name *</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Google, Microsoft, Infosys"
                        className="s-form-input"
                        value={form.companyName}
                        onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))}
                        style={{ width: '100%', height: '42px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 12px', fontSize: '13.5px', boxSizing: 'border-box' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                        <MapPin size={14} color="#059669" />
                        <span>Company Location *</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Hyderabad, Bangalore, Remote"
                        className="s-form-input"
                        value={form.companyLocation}
                        onChange={e => setForm(f => ({ ...f, companyLocation: e.target.value }))}
                        style={{ width: '100%', height: '42px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 12px', fontSize: '13.5px', boxSizing: 'border-box' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                        <Briefcase size={14} color="#059669" />
                        <span>Role / Designation *</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Software Engineer Intern"
                        className="s-form-input"
                        value={form.role}
                        onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                        style={{ width: '100%', height: '42px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 12px', fontSize: '13.5px', boxSizing: 'border-box' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                        <Laptop size={14} color="#059669" />
                        <span>Internship Mode *</span>
                      </label>
                      <select
                        className="s-form-input"
                        value={form.internshipMode}
                        onChange={e => setForm(f => ({ ...f, internshipMode: e.target.value }))}
                        style={{ width: '100%', height: '42px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 12px', fontSize: '13.5px', background: '#fff', boxSizing: 'border-box' }}
                      >
                        <option value="Offline">Offline (Onsite)</option>
                        <option value="Online">Online (Virtual / Remote)</option>
                        <option value="Hybrid">Hybrid</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section 2: Industry Sector */}
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 20px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', borderRadius: '50%', background: '#ecfdf5', color: '#059669', fontSize: '11.5px', fontWeight: 700 }}>2</span>
                    <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>Industry Sector</span>
                  </div>
                  <select
                    required
                    className="s-form-input"
                    value={form.sector}
                    onChange={e => setForm(f => ({ ...f, sector: e.target.value }))}
                    style={{ width: '100%', height: '42px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 12px', fontSize: '13.5px', background: '#fff', boxSizing: 'border-box' }}
                  >
                    <option value="">-- Select Industry Sector --</option>
                    {SECTOR_OPTIONS.map(sec => (
                      <option key={sec} value={sec}>{sec}</option>
                    ))}
                  </select>
                </div>

                {/* Section 3: Internship Duration */}
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 20px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', borderRadius: '50%', background: '#ecfdf5', color: '#059669', fontSize: '11.5px', fontWeight: 700 }}>3</span>
                    <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>Internship Duration</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                        <Calendar size={14} color="#059669" />
                        <span>Start Date * (DD-MM-YYYY)</span>
                      </label>
                      <input
                        type="date"
                        required
                        className="s-form-input"
                        min={todayStr}
                        max={maxDateStr}
                        value={form.startDate}
                        onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                        style={{ width: '100%', height: '42px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 12px', fontSize: '13.5px', boxSizing: 'border-box' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                        <Calendar size={14} color="#059669" />
                        <span>End Date * (DD-MM-YYYY, max 12 mos)</span>
                      </label>
                      <input
                        type="date"
                        required
                        className="s-form-input"
                        min={form.startDate || todayStr}
                        max={maxDateStr}
                        value={form.endDate}
                        onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                        style={{ width: '100%', height: '42px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 12px', fontSize: '13.5px', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Section 4: Offer Letter Upload */}
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 20px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <UploadCloud size={16} color="#059669" />
                      <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>Offer Letter / Selection Proof *</span>
                    </div>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>PDF, PNG, JPG (max 10MB)</span>
                  </div>
                  {form.documentUrl ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: '8px', background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Check size={16} color="#059669" />
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#065f46' }}>{form.documentName || 'Offer_Letter.pdf'}</span>
                      </div>
                      <button type="button" onClick={handleRemoveFile} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ) : (
                    <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px', borderRadius: '10px', border: '1.5px dashed #cbd5e1', background: '#f8fafc', cursor: uploadingDoc ? 'wait' : 'pointer' }}>
                      <input type="file" accept=".pdf,.png,.jpg,.jpeg" style={{ display: 'none' }} disabled={uploadingDoc} onChange={handleFileUpload} />
                      <UploadCloud size={24} color={uploadingDoc ? '#059669' : '#94a3b8'} />
                      <span style={{ fontSize: '12.5px', marginTop: '6px', color: '#64748b', fontWeight: 500 }}>
                        {uploadingDoc ? 'Uploading document...' : 'Click to attach Offer Letter / Email'}
                      </span>
                    </label>
                  )}
                </div>
              </>
            )}

            {/* 4. LIBRARY FORM */}
            {activeTab === 'LIBRARY' && (
              <>
                {/* Section 1: Library Access Purpose */}
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 20px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', borderRadius: '50%', background: '#ecfdf5', color: '#059669', fontSize: '11.5px', fontWeight: 700 }}>1</span>
                    <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>Library Access Purpose</span>
                  </div>
                  <textarea
                    required
                    rows={4}
                    className="s-form-input"
                    placeholder="Specify books to borrow, study room usage, or no-dues clearance..."
                    value={form.reason}
                    onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                    style={{ borderRadius: '8px', padding: '12px 14px', border: '1px solid #cbd5e1', background: '#f8fafc', width: '100%', fontSize: '13.5px', boxSizing: 'border-box' }}
                  />
                </div>

                {/* Section 2: Access Date */}
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 20px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', borderRadius: '50%', background: '#ecfdf5', color: '#059669', fontSize: '11.5px', fontWeight: 700 }}>2</span>
                    <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>Access Date & Timing</span>
                  </div>
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                      <Calendar size={14} color="#059669" />
                      <span>Access Date</span>
                    </label>
                    <input
                      type="date"
                      required
                      className="s-form-input"
                      min={todayStr}
                      max={maxDateStr}
                      value={form.requestDate}
                      onChange={e => setForm(f => ({ ...f, requestDate: e.target.value }))}
                      style={{ width: '100%', height: '42px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 12px', fontSize: '13.5px', boxSizing: 'border-box' }}
                    />
                    <span style={{ fontSize: '11px', color: '#64748b', marginTop: '6px', display: 'block' }}>Defaults to today; future dates up to 1 year allowed</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Form Actions Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', alignItems: 'center', flexWrap: 'wrap', borderTop: '1px solid #f1f5f9', paddingTop: '20px', marginTop: '24px' }}>
            <button
              type="button"
              onClick={handleReset}
              style={{
                padding: '10px 24px',
                borderRadius: '8px',
                fontSize: '13.5px',
                fontWeight: 600,
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#475569',
                cursor: 'pointer'
              }}
            >
              Reset
            </button>

            <button
              type="submit"
              disabled={submitting || uploadingDoc}
              style={{
                padding: '10px 32px',
                borderRadius: '8px',
                fontSize: '13.5px',
                fontWeight: 700,
                border: 'none',
                background: '#059669',
                color: '#ffffff',
                cursor: submitting || uploadingDoc ? 'not-allowed' : 'pointer',
                opacity: submitting || uploadingDoc ? 0.7 : 1,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 8px rgba(5,150,105,0.25)'
              }}
            >
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </StudentLayout>
  );
}
