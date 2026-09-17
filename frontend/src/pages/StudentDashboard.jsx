import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import StatusBadge from '../components/StatusBadge';
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
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Briefcase,
  BookOpen,
  Receipt,
  UploadCloud,
  Trash2,
  ExternalLink,
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

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Active feature tab: 'OUTPASS', 'MESS_FEE', 'INTERNSHIP', 'LIBRARY'
  const [activeTab, setActiveTab] = useState('OUTPASS');
  const [historyFilter, setHistoryFilter] = useState('ALL');

  // Form State
  const [form, setForm] = useState({
    // Common
    requestType: 'OUTPASS',
    studentType: user?.studentType || 'DAY_SCHOLAR',
    reason: '',
    documentUrl: '',
    documentName: '',
    emergencyContact: '',
    // Outpass specific
    outDate: new Date().toISOString().split('T')[0],
    outTime: '17:00',
    expectedReturnDate: new Date().toISOString().split('T')[0],
    expectedReturnTime: '20:00',
    // Mess Fee specific
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    messAmount: '',
    paidStatus: 'Paid',
    // Internship specific
    companyName: '',
    companyLocation: '',
    role: '',
    internshipMode: 'Offline',
    // Library specific
    requestDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (user?.studentType) {
      setForm(f => ({ ...f, studentType: user.studentType }));
    }
  }, [user]);

  // Synchronize form requestType when tab changes
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

  const fetchRequests = async () => {
    try {
      const res = await api.get('/outpass/mine');
      setRequests(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 6000);
    return () => clearInterval(interval);
  }, []);

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
    setSubmitting(true);

    try {
      const payload = {
        ...form,
        requestType: activeTab
      };

      await api.post('/outpass', payload);
      const tabLabels = {
        OUTPASS: 'Campus Out-Pass',
        MESS_FEE: 'Mess Fee Clearance',
        INTERNSHIP: 'Internship Permission',
        LIBRARY: 'Library Permission'
      };
      setSuccess(`${tabLabels[activeTab]} request submitted successfully! Tracking approval progress.`);

      // Reset fields but keep safe defaults
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
      fetchRequests();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  // Metrics
  const activePass = requests.find(r => r.status === 'ISSUED');
  const pendingCount = requests.filter(r => r.status.startsWith('PENDING')).length;
  const approvedCount = requests.filter(r => r.status === 'ISSUED' || r.status === 'USED' || r.status === 'APPROVED').length;

  // Filtered requests list
  const filteredRequests = requests.filter(r => {
    if (historyFilter === 'ALL') return true;
    return (r.requestType || 'OUTPASS') === historyFilter;
  });

  const getBadgeTypeIcon = (type) => {
    switch (type) {
      case 'MESS_FEE': return <Receipt size={12} />;
      case 'INTERNSHIP': return <Briefcase size={12} />;
      case 'LIBRARY': return <BookOpen size={12} />;
      default: return <GraduationCap size={12} />;
    }
  };

  const getBadgeTypeLabel = (type) => {
    switch (type) {
      case 'MESS_FEE': return 'Mess Clearance';
      case 'INTERNSHIP': return 'Internship';
      case 'LIBRARY': return 'Library Pass';
      default: return 'Gate Out-Pass';
    }
  };

  const getBadgeTypeColor = (type) => {
    switch (type) {
      case 'MESS_FEE': return { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' };
      case 'INTERNSHIP': return { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' };
      case 'LIBRARY': return { bg: '#fef3c7', text: '#d97706', border: '#fde68a' };
      default: return { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };
    }
  };

  return (
    <DashboardLayout>
      {/* Header Banner */}
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

          {/* Student Profile Badges */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '20px',
              background: '#ffffff',
              border: '1px solid var(--border)',
              fontSize: '13px',
              color: 'var(--text-secondary)'
            }}>
              <Home size={14} color="var(--purple)" />
              <span>Type: <strong style={{ color: 'var(--text-primary)' }}>{user?.studentType?.replace('_', ' ') || 'Day Scholar'}</strong></span>
            </div>

            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '20px',
              background: '#ffffff',
              border: '1px solid var(--border)',
              fontSize: '13px',
              color: 'var(--text-secondary)'
            }}>
              <Building size={14} color="var(--accent)" />
              <span>Branch: <strong style={{ color: 'var(--text-primary)' }}>{user?.branchName || user?.branchId?.name || 'CSM'}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Active Issued Pass Alert if any */}
      {activePass && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(59, 130, 246, 0.08))',
          border: '1px solid var(--green)',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'var(--green)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <QrCode size={22} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Active Gate Pass Ready
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Approved for {new Date(activePass.outDate).toLocaleDateString('en-IN')} at {activePass.outTime}. Ready to scan at campus security gate.
              </div>
            </div>
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => navigate(`/student/request/${activePass._id}`)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span>View QR Pass</span>
            <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ color: 'var(--accent)' }}>
            <FileText size={22} />
          </div>
          <div className="stat-label">Total Requests</div>
          <div className="stat-value">{requests.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ color: 'var(--yellow)' }}>
            <Clock size={22} />
          </div>
          <div className="stat-label">Pending Approval</div>
          <div className="stat-value" style={{ color: 'var(--yellow)' }}>{pendingCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ color: 'var(--green)' }}>
            <CheckCircle2 size={22} />
          </div>
          <div className="stat-label">Approved & Cleared</div>
          <div className="stat-value" style={{ color: 'var(--green)' }}>{approvedCount}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Create Request Multi-Feature Card */}
        <div className="card" style={{ height: 'fit-content' }}>
          {/* Navigation Tabs for 4 Features */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '6px',
            marginBottom: '18px',
            padding: '4px',
            background: 'var(--bg-elevated)',
            borderRadius: '10px',
            border: '1px solid var(--border)'
          }}>
            <button
              type="button"
              onClick={() => handleTabChange('OUTPASS')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '8px 4px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'OUTPASS' ? '#ffffff' : 'transparent',
                color: activeTab === 'OUTPASS' ? 'var(--accent)' : 'var(--text-secondary)',
                fontWeight: activeTab === 'OUTPASS' ? 700 : 500,
                fontSize: '12px',
                cursor: 'pointer',
                boxShadow: activeTab === 'OUTPASS' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <GraduationCap size={14} />
              <span>Out-Pass</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('MESS_FEE')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '8px 4px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'MESS_FEE' ? '#ffffff' : 'transparent',
                color: activeTab === 'MESS_FEE' ? 'var(--green)' : 'var(--text-secondary)',
                fontWeight: activeTab === 'MESS_FEE' ? 700 : 500,
                fontSize: '12px',
                cursor: 'pointer',
                boxShadow: activeTab === 'MESS_FEE' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <Receipt size={14} />
              <span>Mess Fee</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('INTERNSHIP')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '8px 4px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'INTERNSHIP' ? '#ffffff' : 'transparent',
                color: activeTab === 'INTERNSHIP' ? '#2563eb' : 'var(--text-secondary)',
                fontWeight: activeTab === 'INTERNSHIP' ? 700 : 500,
                fontSize: '12px',
                cursor: 'pointer',
                boxShadow: activeTab === 'INTERNSHIP' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <Briefcase size={14} />
              <span>Internship</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('LIBRARY')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '8px 4px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'LIBRARY' ? '#ffffff' : 'transparent',
                color: activeTab === 'LIBRARY' ? 'var(--yellow)' : 'var(--text-secondary)',
                fontWeight: activeTab === 'LIBRARY' ? 700 : 500,
                fontSize: '12px',
                cursor: 'pointer',
                boxShadow: activeTab === 'LIBRARY' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <BookOpen size={14} />
              <span>Library</span>
            </button>
          </div>

          <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: 0 }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'var(--accent-dim)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent)'
            }}>
              <PlusCircle size={18} />
            </div>
            <div>
              <div className="card-title">
                {activeTab === 'OUTPASS' && 'Apply for Campus Out-Pass'}
                {activeTab === 'MESS_FEE' && 'Submit Mess Fee Clearance'}
                {activeTab === 'INTERNSHIP' && 'Request Internship Permission'}
                {activeTab === 'LIBRARY' && 'Request Library Access / Clearance'}
              </div>
              <div className="card-subtitle">
                {activeTab === 'OUTPASS' && 'Reviewed by Branch CTPO, HOD & Hostel In-charge'}
                {activeTab === 'MESS_FEE' && 'Reviewed by Branch CTPO and HOD for official clearance slip'}
                {activeTab === 'INTERNSHIP' && 'Multi-tier verification: CTPO ➔ HOD ➔ Placement Officer'}
                {activeTab === 'LIBRARY' && 'Fast-track single-stage verification by CTPO'}
              </div>
            </div>
          </div>

          {error && (
            <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="alert alert-success" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <CheckCircle2 size={16} />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* ────────────────── FEATURE 1: OUT-PASS ────────────────── */}
            {activeTab === 'OUTPASS' && (
              <>
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <User size={14} color="var(--accent)" />
                      <span>Student Category (Out-Pass Route)</span>
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Determines required approval flow
                    </span>
                  </label>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '8px' }}>
                    <div
                      onClick={() => setForm(f => ({ ...f, studentType: 'DAY_SCHOLAR' }))}
                      style={{
                        cursor: 'pointer',
                        borderRadius: '10px',
                        padding: '12px',
                        border: form.studentType === 'DAY_SCHOLAR' ? '2px solid var(--accent)' : '1px solid var(--border)',
                        background: form.studentType === 'DAY_SCHOLAR' ? 'rgba(59, 130, 246, 0.06)' : 'var(--bg-elevated)',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <GraduationCap size={18} color="var(--accent)" />
                          <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>Day Scholar</strong>
                        </div>
                        {form.studentType === 'DAY_SCHOLAR' && <CheckCircle2 size={16} color="var(--accent)" />}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        2-Step: CTPO ➔ HOD ➔ Gate Pass
                      </div>
                    </div>

                    <div
                      onClick={() => setForm(f => ({ ...f, studentType: 'HOSTELER' }))}
                      style={{
                        cursor: 'pointer',
                        borderRadius: '10px',
                        padding: '12px',
                        border: form.studentType === 'HOSTELER' ? '2px solid var(--purple)' : '1px solid var(--border)',
                        background: form.studentType === 'HOSTELER' ? 'rgba(168, 85, 247, 0.06)' : 'var(--bg-elevated)',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Home size={18} color="var(--purple)" />
                          <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>Hosteler</strong>
                        </div>
                        {form.studentType === 'HOSTELER' && <CheckCircle2 size={16} color="var(--purple)" />}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        3-Step: CTPO ➔ HOD ➔ Warden
                      </div>
                    </div>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FileText size={14} color="var(--accent)" />
                    <span>Reason for Leaving Campus</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    className="form-input"
                    placeholder="Explain the specific reason you need to leave campus..."
                    value={form.reason}
                    onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                  />
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                    {OUTPASS_REASONS.map(preset => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, reason: preset }))}
                        style={{
                          fontSize: '11px',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border)',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer'
                        }}
                      >
                        + {preset}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-grid" style={{ marginBottom: '14px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={13} color="var(--accent)" />
                      <span>Out Date</span>
                    </label>
                    <input
                      type="date"
                      required
                      className="form-input"
                      value={form.outDate}
                      onChange={e => setForm(f => ({ ...f, outDate: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={13} color="var(--accent)" />
                      <span>Out Time</span>
                    </label>
                    <input
                      type="time"
                      required
                      className="form-input"
                      value={form.outTime}
                      onChange={e => setForm(f => ({ ...f, outTime: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="form-grid" style={{ marginBottom: '16px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={13} color="var(--accent)" />
                      <span>Return Date</span>
                    </label>
                    <input
                      type="date"
                      required
                      className="form-input"
                      value={form.expectedReturnDate}
                      onChange={e => setForm(f => ({ ...f, expectedReturnDate: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={13} color="var(--accent)" />
                      <span>Return Time</span>
                    </label>
                    <input
                      type="time"
                      required
                      className="form-input"
                      value={form.expectedReturnTime}
                      onChange={e => setForm(f => ({ ...f, expectedReturnTime: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Phone size={13} color="var(--accent)" />
                    <span>Emergency Contact / Parent Phone</span>
                  </label>
                  <input
                    type="tel"
                    required
                    className="form-input"
                    placeholder="e.g. 9392393340"
                    value={form.emergencyContact}
                    onChange={e => setForm(f => ({ ...f, emergencyContact: e.target.value }))}
                  />
                </div>
              </>
            )}

            {/* ────────────────── FEATURE 2: MESS FEE CLEARANCE ────────────────── */}
            {activeTab === 'MESS_FEE' && (
              <>
                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Receipt size={14} color="var(--green)" />
                    <span>Clearance Reason / Purpose</span>
                  </label>
                  <textarea
                    required
                    rows={2}
                    className="form-input"
                    placeholder="e.g. Mess Fee Settlement for Fall Semester 2026..."
                    value={form.reason}
                    onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                  />
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                    {MESS_REASONS.map(preset => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, reason: preset }))}
                        style={{
                          fontSize: '11px',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border)',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer'
                        }}
                      >
                        + {preset}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-grid" style={{ marginBottom: '14px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={13} color="var(--green)" />
                      <span>Period Start Date</span>
                    </label>
                    <input
                      type="date"
                      required
                      className="form-input"
                      value={form.startDate}
                      onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={13} color="var(--green)" />
                      <span>Period End Date</span>
                    </label>
                    <input
                      type="date"
                      required
                      className="form-input"
                      value={form.endDate}
                      onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="form-grid" style={{ marginBottom: '16px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <DollarSign size={13} color="var(--green)" />
                      <span>Mess Fee Amount (₹)</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="1"
                      placeholder="e.g. 5200"
                      className="form-input"
                      value={form.messAmount}
                      onChange={e => setForm(f => ({ ...f, messAmount: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle2 size={13} color="var(--green)" />
                      <span>Payment Status</span>
                    </label>
                    <select
                      className="form-input"
                      value={form.paidStatus}
                      onChange={e => setForm(f => ({ ...f, paidStatus: e.target.value }))}
                    >
                      <option value="Paid">Paid (Full Payment Done)</option>
                      <option value="Partially Paid">Partially Paid</option>
                      <option value="Not Paid">Not Paid (Pending Verification)</option>
                    </select>
                  </div>
                </div>

                {/* Optional Document Upload */}
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <UploadCloud size={14} color="var(--accent)" />
                      <span>Payment Proof / Receipt (Optional)</span>
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>PDF, PNG, JPG (max 10MB)</span>
                  </label>

                  {form.documentUrl ? (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: '#ecfdf5',
                      border: '1px solid #a7f3d0'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                        <Check size={16} color="var(--green)" />
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#065f46', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {form.documentName || 'Attached Document'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', padding: '4px' }}
                        title="Remove file"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ) : (
                    <label style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '16px',
                      borderRadius: '8px',
                      border: '2px dashed var(--border)',
                      background: 'var(--bg-elevated)',
                      cursor: uploadingDoc ? 'wait' : 'pointer',
                      transition: 'border-color 0.2s'
                    }}>
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        style={{ display: 'none' }}
                        disabled={uploadingDoc}
                        onChange={handleFileUpload}
                      />
                      <UploadCloud size={22} color={uploadingDoc ? 'var(--accent)' : 'var(--text-muted)'} />
                      <span style={{ fontSize: '12px', marginTop: '6px', color: 'var(--text-secondary)' }}>
                        {uploadingDoc ? 'Uploading receipt...' : 'Click to attach payment receipt or bank challan'}
                      </span>
                    </label>
                  )}
                </div>
              </>
            )}

            {/* ────────────────── FEATURE 3: INTERNSHIP PERMISSION ────────────────── */}
            {activeTab === 'INTERNSHIP' && (
              <>
                <div className="form-grid" style={{ marginBottom: '14px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Building size={13} color="#2563eb" />
                      <span>Company Name</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Google, TCS, Infosys"
                      className="form-input"
                      value={form.companyName}
                      onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MapPin size={13} color="#2563eb" />
                      <span>Company Location</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Hyderabad, Bangalore, Remote"
                      className="form-input"
                      value={form.companyLocation}
                      onChange={e => setForm(f => ({ ...f, companyLocation: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="form-grid" style={{ marginBottom: '14px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Briefcase size={13} color="#2563eb" />
                      <span>Internship Role / Position</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Software Engineer Intern"
                      className="form-input"
                      value={form.role}
                      onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Laptop size={13} color="#2563eb" />
                      <span>Internship Mode</span>
                    </label>
                    <select
                      className="form-input"
                      value={form.internshipMode}
                      onChange={e => setForm(f => ({ ...f, internshipMode: e.target.value }))}
                    >
                      <option value="Offline">Offline (Onsite)</option>
                      <option value="Online">Online (Work from Home)</option>
                      <option value="Hybrid">Hybrid</option>
                    </select>
                  </div>
                </div>

                <div className="form-grid" style={{ marginBottom: '16px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={13} color="#2563eb" />
                      <span>Internship Start Date</span>
                    </label>
                    <input
                      type="date"
                      required
                      className="form-input"
                      value={form.startDate}
                      onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={13} color="#2563eb" />
                      <span>Internship End Date</span>
                    </label>
                    <input
                      type="date"
                      required
                      className="form-input"
                      value={form.endDate}
                      onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Offer Letter Upload */}
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <UploadCloud size={14} color="#2563eb" />
                      <span>Offer Letter / Selection Email (Optional)</span>
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>PDF, PNG, JPG (max 10MB)</span>
                  </label>

                  {form.documentUrl ? (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: '#eff6ff',
                      border: '1px solid #bfdbfe'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                        <Check size={16} color="#2563eb" />
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e40af', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {form.documentName || 'Attached Offer Letter'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', padding: '4px' }}
                        title="Remove file"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ) : (
                    <label style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '16px',
                      borderRadius: '8px',
                      border: '2px dashed var(--border)',
                      background: 'var(--bg-elevated)',
                      cursor: uploadingDoc ? 'wait' : 'pointer',
                      transition: 'border-color 0.2s'
                    }}>
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        style={{ display: 'none' }}
                        disabled={uploadingDoc}
                        onChange={handleFileUpload}
                      />
                      <UploadCloud size={22} color={uploadingDoc ? '#2563eb' : 'var(--text-muted)'} />
                      <span style={{ fontSize: '12px', marginTop: '6px', color: 'var(--text-secondary)' }}>
                        {uploadingDoc ? 'Uploading document...' : 'Click to attach internship offer letter or email'}
                      </span>
                    </label>
                  )}
                </div>
              </>
            )}

            {/* ────────────────── FEATURE 4: LIBRARY PERMISSION ────────────────── */}
            {activeTab === 'LIBRARY' && (
              <>
                <div style={{
                  padding: '12px 14px',
                  borderRadius: '10px',
                  background: '#fffbeb',
                  border: '1px solid #fef3c7',
                  marginBottom: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <BookOpen size={20} color="var(--yellow)" />
                  <div style={{ fontSize: '12px', color: '#92400e' }}>
                    Single-stage approval verified directly by your <strong>Year CTPO</strong>. No HOD or warden sign-off required.
                  </div>
                </div>

                <div className="form-grid" style={{ marginBottom: '14px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <User size={13} color="var(--yellow)" />
                      <span>Student Roll Number</span>
                    </label>
                    <input
                      type="text"
                      disabled
                      className="form-input"
                      value={user?.rollNo || user?.username || ''}
                      style={{ background: 'var(--bg-elevated)', cursor: 'not-allowed' }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={13} color="var(--yellow)" />
                      <span>Access / Clearance Date</span>
                    </label>
                    <input
                      type="date"
                      required
                      className="form-input"
                      value={form.requestDate}
                      onChange={e => setForm(f => ({ ...f, requestDate: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FileText size={14} color="var(--yellow)" />
                    <span>Purpose / Access Details</span>
                  </label>
                  <textarea
                    required
                    rows={2}
                    className="form-input"
                    placeholder="Specify books to borrow, reading hall hours, or no-dues requirement..."
                    value={form.reason}
                    onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                  />
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                    {LIBRARY_REASONS.map(preset => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, reason: preset }))}
                        style={{
                          fontSize: '11px',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border)',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer'
                        }}
                      >
                        + {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Workflow Path Summary Box */}
            <div style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '10px 12px',
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: 'var(--text-secondary)',
              marginBottom: '16px'
            }}>
              <Sparkles size={14} color="var(--accent)" />
              <div>
                <strong>Workflow: </strong>
                {activeTab === 'OUTPASS' && (
                  form.studentType === 'HOSTELER'
                    ? 'CTPO ➔ HOD ➔ Hostel Warden ➔ QR Gate Pass'
                    : 'CTPO ➔ HOD ➔ QR Gate Pass (Warden skipped for Day Scholar)'
                )}
                {activeTab === 'MESS_FEE' && 'CTPO ➔ HOD ➔ Cleared (Downloadable Confirmation Slip)'}
                {activeTab === 'INTERNSHIP' && 'CTPO ➔ HOD ➔ Placement Officer ➔ Approved (Downloadable Approval Letter)'}
                {activeTab === 'LIBRARY' && 'CTPO ➔ Approved (Downloadable Library Pass - 1 Step)'}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || uploadingDoc}
              className="btn btn-primary btn-full"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px' }}
            >
              {submitting ? (
                <>
                  <span className="spinner" style={{ width: 15, height: 15 }} />
                  <span>Submitting Request...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>
                    {activeTab === 'OUTPASS' && 'Submit Out-Pass Request'}
                    {activeTab === 'MESS_FEE' && 'Submit Mess Fee Clearance'}
                    {activeTab === 'INTERNSHIP' && 'Submit Internship Permission'}
                    {activeTab === 'LIBRARY' && 'Submit Library Request'}
                  </span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Requests List Card */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <div className="card-title">My Permission History</div>
              <div className="card-subtitle">Live real-time status updates</div>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', background: 'var(--bg-elevated)', padding: '4px 10px', borderRadius: '20px' }}>
              {filteredRequests.length} of {requests.length} total
            </span>
          </div>

          {/* History Filter Pills */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
            {['ALL', 'OUTPASS', 'MESS_FEE', 'INTERNSHIP', 'LIBRARY'].map(f => (
              <button
                key={f}
                type="button"
                onClick={() => setHistoryFilter(f)}
                style={{
                  fontSize: '11px',
                  padding: '4px 10px',
                  borderRadius: '14px',
                  border: historyFilter === f ? '1px solid var(--accent)' : '1px solid var(--border)',
                  background: historyFilter === f ? 'var(--accent)' : 'var(--bg-elevated)',
                  color: historyFilter === f ? '#ffffff' : 'var(--text-secondary)',
                  fontWeight: historyFilter === f ? 600 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {f === 'ALL' && 'All Requests'}
                {f === 'OUTPASS' && 'Out-Pass'}
                {f === 'MESS_FEE' && 'Mess Fee'}
                {f === 'INTERNSHIP' && 'Internship'}
                {f === 'LIBRARY' && 'Library'}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="loading-screen"><div className="spinner spinner-lg" /></div>
          ) : filteredRequests.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon" style={{ color: 'var(--text-muted)' }}>
                <FileText size={48} />
              </div>
              <div className="empty-state-title">No requests found</div>
              <div className="empty-state-desc">
                {historyFilter === 'ALL'
                  ? 'Use the form on the left to submit your first permission request.'
                  : `No ${historyFilter.replace('_', ' ')} requests submitted yet.`}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredRequests.map((req) => {
                const reqType = req.requestType || 'OUTPASS';
                const tagColor = getBadgeTypeColor(reqType);
                return (
                  <div
                    key={req._id}
                    className="request-card"
                    onClick={() => navigate(`/student/request/${req._id}`)}
                    style={{
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '14px 16px',
                      borderRadius: '10px',
                      background: '#ffffff',
                      border: '1px solid var(--border)',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                    }}
                  >
                    <div className="request-card-info" style={{ flex: 1, marginRight: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        {/* Type badge */}
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: tagColor.bg,
                          color: tagColor.text,
                          border: `1px solid ${tagColor.border}`
                        }}>
                          {getBadgeTypeIcon(reqType)}
                          <span>{getBadgeTypeLabel(reqType)}</span>
                        </span>

                        {req.resubmitCount > 0 && (
                          <span style={{
                            fontSize: '10px',
                            fontWeight: 600,
                            padding: '2px 6px',
                            borderRadius: '10px',
                            background: '#fef3c7',
                            color: '#92400e'
                          }}>
                            Resubmitted #{req.resubmitCount}
                          </span>
                        )}
                      </div>

                      <div className="request-card-title" style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px', color: 'var(--text-primary)' }}>
                        {req.reason}
                      </div>

                      {/* Feature-specific summary snippet */}
                      <div className="request-card-meta" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', color: 'var(--text-muted)' }}>
                        {reqType === 'OUTPASS' && (
                          <>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <Clock size={12} />
                              Out: {new Date(req.outDate).toLocaleDateString('en-IN')} {req.outTime}
                            </span>
                            <span>•</span>
                            <span>Return: {new Date(req.expectedReturnDate).toLocaleDateString('en-IN')} {req.expectedReturnTime}</span>
                          </>
                        )}
                        {reqType === 'MESS_FEE' && (
                          <>
                            <span>₹{req.messAmount?.toLocaleString('en-IN') || 0}</span>
                            <span>•</span>
                            <span style={{ fontWeight: 600, color: req.paidStatus === 'Paid' ? 'var(--green)' : 'var(--yellow)' }}>
                              {req.paidStatus}
                            </span>
                            <span>•</span>
                            <span>{new Date(req.startDate).toLocaleDateString('en-IN')} to {new Date(req.endDate).toLocaleDateString('en-IN')}</span>
                          </>
                        )}
                        {reqType === 'INTERNSHIP' && (
                          <>
                            <span>{req.companyName} ({req.role})</span>
                            <span>•</span>
                            <span>{req.internshipMode}</span>
                            <span>•</span>
                            <span>Starts: {new Date(req.startDate).toLocaleDateString('en-IN')}</span>
                          </>
                        )}
                        {reqType === 'LIBRARY' && (
                          <>
                            <span>Access Date: {new Date(req.requestDate || req.createdAt).toLocaleDateString('en-IN')}</span>
                          </>
                        )}
                      </div>

                      {/* Rejection Alert Preview */}
                      {req.status.startsWith('REJECTED') && (
                        <div style={{
                          marginTop: '8px',
                          fontSize: '11px',
                          color: 'var(--red)',
                          background: '#fef2f2',
                          border: '1px solid #fee2e2',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <AlertCircle size={12} />
                          <span><strong>Rejected:</strong> {req.rejectionReason || 'Check remarks'} — Click to edit & resubmit</span>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <StatusBadge status={req.status} />
                      <ArrowRight size={14} color="var(--text-muted)" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
