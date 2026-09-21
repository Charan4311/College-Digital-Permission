import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import StatusBadge from '../components/StatusBadge';
import api from '../lib/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  Clock,
  ClipboardList,
  CheckCircle2,
  XCircle,
  Check,
  X,
  Eye,
  AlertCircle,
  Building,
  User,
  Calendar,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  Receipt,
  Briefcase,
  BookOpen,
  GraduationCap,
  Paperclip,
  ExternalLink
} from 'lucide-react';

const ROLE_LABELS = {
  CTPO: { name: 'CTPO Approval Console', pendingStatus: 'PENDING_CTPO', color: '#7C3AED', desc: 'Department-level review for out-pass, mess, internship & library requests' },
  HOD: { name: 'HOD Approval Console', pendingStatus: 'PENDING_HOD', color: '#8b5cf6', desc: 'Head of Department authorization for permissions & clearances' },
  HOSTEL_INCHARGE: { name: 'Hostel In-charge Console', pendingStatus: 'PENDING_HOSTEL_INCHARGE', color: '#10b981', desc: 'Final gate permission clearance for hosteler students' },
  PLACEMENT_OFFICER: { name: 'Placement Officer Console', pendingStatus: 'PENDING_PLACEMENT_OFFICER', color: '#6D28D9', desc: 'Final institutional authorization for student internships' },
};

export default function ApproverDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const role = user?.role;
  const cfg = ROLE_LABELS[role] || ROLE_LABELS.CTPO;

  const [pending, setPending] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('pending');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [history, setHistory] = useState([]);

  const [rejectModal, setRejectModal] = useState(null); // { id, remarks, requestType }
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  const fetchAll = async () => {
    try {
      const [pendingRes, statsRes] = await Promise.all([
        api.get('/outpass/pending/for-me'),
        api.get('/outpass/dashboard-stats')
      ]);
      setPending(pendingRes.data.data);
      setStats(statsRes.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await api.get('/outpass/all/for-me');
      setHistory(res.data.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 6000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (tab === 'history') fetchHistory();
  }, [tab]);

  const handleApprove = async (id) => {
    setActionLoading(true);
    setActionMsg('');
    try {
      await api.post(`/outpass/${id}/approve`, { remarks: 'Approved' });
      setActionMsg('Request approved successfully!');
      fetchAll();
    } catch (e) {
      setActionMsg(e.response?.data?.message || 'Error approving request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectModal?.remarks?.trim()) return;
    setActionLoading(true);
    setActionMsg('');
    try {
      await api.post(`/outpass/${rejectModal.id}/reject`, { remarks: rejectModal.remarks });
      setRejectModal(null);
      setActionMsg('Request rejected with reason.');
      fetchAll();
    } catch (e) {
      setActionMsg(e.response?.data?.message || 'Error rejecting request');
    } finally {
      setActionLoading(false);
    }
  };

  // Build continuous 7-day Recharts data from approvedPerDay
  const chartData = [];
  const byDate = {};
  if (stats?.approvedPerDay) {
    stats.approvedPerDay.forEach(({ _id, count }) => {
      if (!byDate[_id.date]) byDate[_id.date] = { Approved: 0, Rejected: 0 };
      byDate[_id.date][_id.decision === 'APPROVED' ? 'Approved' : 'Rejected'] = count;
    });
  }

  // Generate continuous 7 days ending today
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateKey = d.toISOString().split('T')[0];
    const displayLabel = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    chartData.push({
      date: displayLabel,
      Approved: byDate[dateKey]?.Approved || 0,
      Rejected: byDate[dateKey]?.Rejected || 0
    });
  }

  const hasActivity = chartData.some(d => d.Approved > 0 || d.Rejected > 0);

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
      case 'MESS_FEE': return 'Mess Fee';
      case 'INTERNSHIP': return 'Internship';
      case 'LIBRARY': return 'Library';
      default: return 'Out-Pass';
    }
  };

  const getBadgeTypeColor = (type) => {
    switch (type) {
      case 'MESS_FEE': return { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' };
      case 'INTERNSHIP': return { bg: '#f3e8ff', text: '#6D28D9', border: '#e9d5ff' };
      case 'LIBRARY': return { bg: '#fef3c7', text: '#d97706', border: '#fde68a' };
      default: return { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };
    }
  };

  // Filter pending and history by selected type filter
  const filteredPending = pending.filter(r => {
    if (typeFilter === 'ALL') return true;
    return (r.requestType || 'OUTPASS') === typeFilter;
  });

  const filteredHistory = history.filter(r => {
    if (typeFilter === 'ALL') return true;
    return (r.requestType || 'OUTPASS') === typeFilter;
  });

  return (
    <DashboardLayout>
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Building size={26} color={cfg.color} />
          <span>{cfg.name}</span>
        </h1>
        <p className="page-subtitle">{cfg.desc} · Logged in as <strong>{user?.name}</strong></p>
      </div>

      {actionMsg && (
        <div
          className={`alert ${actionMsg.includes('approved') ? 'alert-success' : 'alert-error'}`}
          style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          {actionMsg.includes('approved') ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{actionMsg}</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ color: 'var(--yellow)' }}>
            <Clock size={22} />
          </div>
          <div className="stat-label">Pending Queue</div>
          <div className="stat-value" style={{ color: 'var(--yellow)' }}>{stats?.pendingCount ?? pending.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ color: 'var(--accent)' }}>
            <ClipboardList size={22} />
          </div>
          <div className="stat-label">Total Requests</div>
          <div className="stat-value">{stats?.totalRequests ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ color: 'var(--green)' }}>
            <CheckCircle2 size={22} />
          </div>
          <div className="stat-label">7-Day Decisions</div>
          <div className="stat-value" style={{ color: 'var(--green)' }}>
            {chartData.reduce((acc, curr) => acc + curr.Approved + curr.Rejected, 0)}
          </div>
        </div>
      </div>

      {/* 7-day Activity Chart */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="card-title">Approval Activity (Last 7 Days)</div>
            <div className="card-subtitle">Approved vs Rejected decisions recorded</div>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Daily Volume</span>
        </div>
        {hasActivity ? (
          <div style={{ height: 220, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(109, 40, 217, 0.08)',
                    color: '#0f172a'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                <Bar dataKey="Approved" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar dataKey="Rejected" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{
            height: 120,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: '8px',
            color: 'var(--text-muted)',
            fontSize: '13px'
          }}>
            <Sparkles size={20} color="var(--text-muted)" />
            <span>No approvals or rejections recorded in the last 7 days yet.</span>
          </div>
        )}
      </div>

      {/* Main Tabs (Pending vs History) & Feature Filter Pills */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <div className="tabs" style={{ marginBottom: 0 }}>
          <button
            className={`tab ${tab === 'pending' ? 'active' : ''}`}
            onClick={() => setTab('pending')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Clock size={14} />
            <span>Pending Queue ({pending.length})</span>
          </button>
          <button
            className={`tab ${tab === 'history' ? 'active' : ''}`}
            onClick={() => setTab('history')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <ClipboardList size={14} />
            <span>Review History</span>
          </button>
        </div>

        {/* Feature Filter Pills */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {['ALL', 'OUTPASS', 'MESS_FEE', 'INTERNSHIP', 'LIBRARY'].map(f => (
            <button
              key={f}
              type="button"
              onClick={() => setTypeFilter(f)}
              style={{
                fontSize: '11px',
                padding: '4px 10px',
                borderRadius: '14px',
                border: typeFilter === f ? '1px solid var(--accent)' : '1px solid var(--border)',
                background: typeFilter === f ? 'var(--accent)' : '#ffffff',
                color: typeFilter === f ? '#ffffff' : 'var(--text-secondary)',
                fontWeight: typeFilter === f ? 600 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {f === 'ALL' && 'All Types'}
              {f === 'OUTPASS' && 'Out-Pass'}
              {f === 'MESS_FEE' && 'Mess Fee'}
              {f === 'INTERNSHIP' && 'Internship'}
              {f === 'LIBRARY' && 'Library'}
            </button>
          ))}
        </div>
      </div>

      {/* Pending Queue Table */}
      {tab === 'pending' && (
        <div className="card">
          {loading ? (
            <div className="loading-screen"><div className="spinner spinner-lg" /></div>
          ) : filteredPending.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon" style={{ color: 'var(--green)' }}>
                <CheckCircle2 size={48} />
              </div>
              <div className="empty-state-title">All caught up!</div>
              <div className="empty-state-desc">
                {typeFilter === 'ALL'
                  ? 'No permission requests currently waiting in your queue.'
                  : `No ${typeFilter.replace('_', ' ')} requests pending in your queue.`}
              </div>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Student</th>
                    <th>Request Details</th>
                    <th>Period / Schedule</th>
                    <th>Attachment</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPending.map(req => {
                    const reqType = req.requestType || 'OUTPASS';
                    const tag = getBadgeTypeColor(reqType);
                    return (
                      <tr key={req._id}>
                        <td>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 700,
                            background: tag.bg,
                            color: tag.text,
                            border: `1px solid ${tag.border}`
                          }}>
                            {getBadgeTypeIcon(reqType)}
                            <span>{getBadgeTypeLabel(reqType)}</span>
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{req.studentId?.name}</div>
                          <div className="td-muted" style={{ fontSize: 12 }}>
                            <code>{req.studentId?.rollNo}</code> · {req.branchId?.name || 'CSM'}
                          </div>
                        </td>
                        <td style={{ maxWidth: 220 }}>
                          <div style={{ fontWeight: 500, color: 'var(--text-primary)', marginBottom: '2px' }}>
                            {req.reason}
                          </div>
                          {reqType === 'MESS_FEE' && (
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                              Amount: <strong>₹{req.messAmount?.toLocaleString('en-IN')}</strong> ·{' '}
                              <span style={{ color: req.paidStatus === 'Paid' ? 'var(--green)' : 'var(--yellow)', fontWeight: 600 }}>
                                {req.paidStatus}
                              </span>
                            </div>
                          )}
                          {reqType === 'INTERNSHIP' && (
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                              <strong>{req.companyName}</strong> ({req.role}) · {req.internshipMode}
                            </div>
                          )}
                        </td>
                        <td className="td-muted">
                          {reqType === 'OUTPASS' && (
                            <>
                              <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                                {new Date(req.outDate).toLocaleDateString('en-IN')}
                              </div>
                              <div style={{ fontSize: 11 }}>{req.outTime} → {req.expectedReturnTime}</div>
                            </>
                          )}
                          {(reqType === 'MESS_FEE' || reqType === 'INTERNSHIP') && (
                            <>
                              <div style={{ fontSize: 12, color: 'var(--text-primary)' }}>
                                {new Date(req.startDate).toLocaleDateString('en-IN')} to
                              </div>
                              <div style={{ fontSize: 12, color: 'var(--text-primary)' }}>
                                {new Date(req.endDate).toLocaleDateString('en-IN')}
                              </div>
                            </>
                          )}
                          {reqType === 'LIBRARY' && (
                            <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                              {new Date(req.requestDate || req.createdAt).toLocaleDateString('en-IN')}
                            </div>
                          )}
                        </td>
                        <td>
                          {req.documentUrl ? (
                            <a
                              href={buildFileUrl(req.documentUrl)}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '11px',
                                color: 'var(--accent)',
                                textDecoration: 'none',
                                background: 'var(--accent-dim)',
                                padding: '3px 8px',
                                borderRadius: '6px'
                              }}
                            >
                              <Paperclip size={12} />
                              <span>View Doc</span>
                            </a>
                          ) : (
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>None</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <button
                              className="btn btn-success btn-sm"
                              disabled={actionLoading}
                              onClick={() => handleApprove(req._id)}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 10px' }}
                            >
                              <Check size={14} />
                              <span>Approve</span>
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              disabled={actionLoading}
                              onClick={() => setRejectModal({ id: req._id, remarks: '', requestType: reqType })}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 10px' }}
                            >
                              <X size={14} />
                              <span>Reject</span>
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => navigate(`/outpass/${req._id}`)}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 10px' }}
                            >
                              <Eye size={14} />
                              <span>View</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {tab === 'history' && (
        <div className="card">
          {filteredHistory.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon" style={{ color: 'var(--text-muted)' }}>
                <ClipboardList size={40} />
              </div>
              <div className="empty-state-title">No historical requests found</div>
              <div className="empty-state-desc">Reviewed requests will appear here once processed.</div>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Student</th>
                    <th>Reason / Details</th>
                    <th>Date / Period</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map(req => {
                    const reqType = req.requestType || 'OUTPASS';
                    const tag = getBadgeTypeColor(reqType);
                    return (
                      <tr key={req._id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/outpass/${req._id}`)}>
                        <td>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 700,
                            background: tag.bg,
                            color: tag.text,
                            border: `1px solid ${tag.border}`
                          }}>
                            {getBadgeTypeIcon(reqType)}
                            <span>{getBadgeTypeLabel(reqType)}</span>
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{req.studentId?.name}</div>
                          <div className="td-muted" style={{ fontSize: 12 }}><code>{req.studentId?.rollNo}</code></div>
                        </td>
                        <td style={{ maxWidth: 220 }}>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200, color: 'var(--text-primary)' }}>
                            {req.reason}
                          </div>
                        </td>
                        <td className="td-muted">
                          {reqType === 'OUTPASS' && (new Date(req.outDate).toLocaleDateString('en-IN'))}
                          {reqType === 'MESS_FEE' && (`${new Date(req.startDate).toLocaleDateString('en-IN')} - ${new Date(req.endDate).toLocaleDateString('en-IN')}`)}
                          {reqType === 'INTERNSHIP' && (`${new Date(req.startDate).toLocaleDateString('en-IN')} - ${new Date(req.endDate).toLocaleDateString('en-IN')}`)}
                          {reqType === 'LIBRARY' && (new Date(req.requestDate || req.createdAt).toLocaleDateString('en-IN'))}
                        </td>
                        <td><StatusBadge status={req.status} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setRejectModal(null)}>
          <div className="modal">
            <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--red)' }}>
              <ShieldAlert size={20} />
              <span>Reject {getBadgeTypeLabel(rejectModal.requestType)} Request</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20 }}>
              Specify the official reason for rejection. This remark will be recorded and visible to the student for corrections and resubmission.
            </p>
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label">Rejection Remarks (Mandatory)</label>
              <textarea
                rows={3}
                className="form-input"
                placeholder="e.g. Incomplete documentation, unpaid arrears, signature mismatch..."
                value={rejectModal.remarks}
                onChange={e => setRejectModal(m => ({ ...m, remarks: e.target.value }))}
              />
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn btn-ghost" onClick={() => setRejectModal(null)}>Cancel</button>
              <button
                className="btn btn-danger"
                disabled={!rejectModal.remarks.trim() || actionLoading}
                onClick={handleReject}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                {actionLoading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <X size={14} />}
                <span>Confirm Rejection</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
