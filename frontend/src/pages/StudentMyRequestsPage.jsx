import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import StatusBadge from '../components/StatusBadge';
import api from '../lib/api';
import {
  FileText,
  Clock,
  ArrowRight,
  AlertCircle,
  GraduationCap,
  Briefcase,
  BookOpen,
  Receipt
} from 'lucide-react';

export default function StudentMyRequestsPage() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyFilter, setHistoryFilter] = useState('ALL');

  const fetchRequests = async () => {
    try {
      const res = await api.get('/outpass/mine');
      setRequests(res.data.data || []);
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

  const filteredRequests = requests.filter(r => historyFilter === 'ALL' ? true : (r.requestType || 'OUTPASS') === historyFilter);

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
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="page-title">My Request</h1>
          <p className="page-subtitle">Live real-time status updates</p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: '1100px' }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <div className="card-title">My Permission History</div>
            <div className="card-subtitle">All Requests</div>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', background: 'var(--bg-elevated)', padding: '4px 10px', borderRadius: '20px' }}>{filteredRequests.length} of {requests.length} total</span>
        </div>

        <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
          {['ALL', 'OUTPASS', 'MESS_FEE', 'INTERNSHIP', 'LIBRARY'].map(f => (
            <button key={f} type="button" onClick={() => setHistoryFilter(f)} style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '14px', border: historyFilter === f ? '1px solid var(--accent)' : '1px solid var(--border)', background: historyFilter === f ? 'var(--accent)' : 'var(--bg-elevated)', color: historyFilter === f ? '#ffffff' : 'var(--text-secondary)', fontWeight: historyFilter === f ? 600 : 500, cursor: 'pointer', transition: 'all 0.15s ease' }}>
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
            <div className="empty-state-icon" style={{ color: 'var(--text-muted)' }}><FileText size={48} /></div>
            <div className="empty-state-title">No requests found</div>
            <div className="empty-state-desc">{historyFilter === 'ALL' ? 'Submit your first permission request from the New Permission page.' : `No ${historyFilter.replace('_', ' ')} requests submitted yet.`}</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredRequests.map((req) => {
              const reqType = req.requestType || 'OUTPASS';
              const tagColor = getBadgeTypeColor(reqType);
              return (
                <div key={req._id} className="request-card" onClick={() => navigate(`/student/request/${req._id}`)} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderRadius: '10px', background: '#ffffff', border: '1px solid var(--border)', transition: 'all 0.2s ease', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                  <div className="request-card-info" style={{ flex: 1, marginRight: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, background: tagColor.bg, color: tagColor.text, border: `1px solid ${tagColor.border}` }}>
                        {getBadgeTypeIcon(reqType)}
                        <span>{getBadgeTypeLabel(reqType)}</span>
                      </span>

                      {req.resubmitCount > 0 && (
                        <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 6px', borderRadius: '10px', background: '#fef3c7', color: '#92400e' }}>Resubmitted #{req.resubmitCount}</span>
                      )}
                    </div>

                    <div className="request-card-title" style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px', color: 'var(--text-primary)' }}>{req.reason}</div>
                    <div className="request-card-meta" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', color: 'var(--text-muted)' }}>
                      {reqType === 'OUTPASS' && (
                        <>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Clock size={12} />Out: {new Date(req.outDate).toLocaleDateString('en-IN')} {req.outTime}</span>
                          <span>•</span>
                          <span>Return: {new Date(req.expectedReturnDate).toLocaleDateString('en-IN')} {req.expectedReturnTime}</span>
                        </>
                      )}
                      {reqType === 'MESS_FEE' && (
                        <>
                          <span>₹{req.messAmount?.toLocaleString('en-IN') || 0}</span>
                          <span>•</span>
                          <span style={{ fontWeight: 600, color: req.paidStatus === 'Paid' ? 'var(--green)' : 'var(--yellow)' }}>{req.paidStatus}</span>
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
                      {reqType === 'LIBRARY' && <><span>Access Date: {new Date(req.requestDate || req.createdAt).toLocaleDateString('en-IN')}</span></>}
                    </div>

                    {req.status.startsWith('REJECTED') && (
                      <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--red)', background: '#fef2f2', border: '1px solid #fee2e2', padding: '4px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <AlertCircle size={12} />
                        <span><strong>Rejected:</strong> {req.rejectionReason || 'Check remarks'}</span>
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
    </DashboardLayout>
  );
}
