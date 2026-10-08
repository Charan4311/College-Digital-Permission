import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import api from '../lib/api';
import {
  formatDate,
  formatDateTime,
  getOrdinalYear,
  getResidenceTypeLabel,
  mapStatusToSimple
} from '../lib/utils';
import {
  Calendar,
  Eye,
  Car,
  Briefcase,
  Receipt,
  BookOpen,
  GraduationCap,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  ClipboardList,
  XCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function ApproverDashboard({ defaultTab }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Determine active tab: 'overview' | 'pending' | 'history'
  const tab = useMemo(() => {
    if (location.pathname.includes('/hostel/pending')) return 'pending';
    if (location.pathname.includes('/hostel/history')) return 'history';
    const view = searchParams.get('view');
    if (view === 'pending') return 'pending';
    if (view === 'history') return 'history';
    if (defaultTab) return defaultTab;
    return 'overview';
  }, [location.pathname, searchParams, defaultTab]);

  const [pendingList, setPendingList] = useState([]);
  const [allList, setAllList] = useState([]);
  const [statsData, setStatsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('ALL'); // Default 'All Types'
  const [kpiFilter, setKpiFilter] = useState('TOTAL');

  const [summaryStats, setSummaryStats] = useState({
    week: { total: 0, approved: 0, pending: 0, rejected: 0 },
    month: { total: 0, approved: 0, pending: 0, rejected: 0 }
  });

  const isPendingHostelStatus = (status) => {
    const normalized = String(status || '').toUpperCase();
    return normalized === 'PENDING_HOSTEL' || normalized === 'PENDING_HOSTEL_INCHARGE';
  };

  const isRejectedHostelStatus = (status, rejectedByRole) => {
    const normalized = String(status || '').toUpperCase();
    if (normalized === 'REJECTED_HOSTEL' || normalized === 'REJECTED_HOSTEL_INCHARGE') return true;
    if (normalized === 'REJECTED' || normalized === 'CANCELLED') {
      if (!rejectedByRole) return true;
      const roleNorm = String(rejectedByRole).toUpperCase();
      return roleNorm.includes('HOSTEL');
    }
    return false;
  };

  const isApprovedHostelStatus = (status) => {
    const normalized = String(status || '').toUpperCase();
    return (
      normalized === 'APPROVED' ||
      normalized === 'GATE_PASS_ISSUED' ||
      normalized === 'GATE_PASS_USED' ||
      normalized === 'ISSUED' ||
      normalized === 'CLEARED' ||
      normalized === 'USED'
    );
  };

  const isHostelRelevantRequest = (request) => {
    const residence = request?.studentId?.residenceType || request?.student?.residenceType;
    const isHosteler = residence && ['hosteler', 'HOSTELER'].includes(String(residence));
    const reqType = (request?.requestType || 'OUTPASS').toUpperCase();
    return Boolean(isHosteler && reqType === 'OUTPASS');
  };

  // Fetch data
  const fetchData = async () => {
    try {
      const [pendingRes, allRes, statsRes, summaryRes] = await Promise.all([
        api.get('/outpass/pending/for-me').catch(() => ({ data: { data: [] } })),
        api.get('/outpass/all/for-me').catch(() => ({ data: { data: [] } })),
        api.get('/outpass/dashboard-stats').catch(() => ({ data: { data: null } })),
        api.get('/reports/hostel-summary').catch(() => api.get('/hostel/summary').catch(() => ({ data: { data: null } })))
      ]);

      const rawPending = pendingRes.data?.data || [];
      const rawAll = allRes.data?.data || [];

      const filteredPending = rawPending.filter((r) => isPendingHostelStatus(r?.status) && isHostelRelevantRequest(r));
      const filteredAll = rawAll.filter((r) => isHostelRelevantRequest(r));

      setPendingList(filteredPending);
      setAllList(filteredAll);

      if (statsRes.data?.data) {
        setStatsData(statsRes.data.data);
      }

      if (summaryRes.data?.data) {
        setSummaryStats(summaryRes.data.data);
      }
    } catch (err) {
      console.error('Error fetching hostel dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, []);

  // Combined unique requests
  const combinedRequests = useMemo(() => {
    const map = new Map();
    [...pendingList, ...allList].forEach((req) => {
      if (req && req._id && isHostelRelevantRequest(req)) {
        map.set(String(req._id), req);
      }
    });
    return Array.from(map.values());
  }, [pendingList, allList]);

  // Derived counts
  const totalApproved = useMemo(() => {
    return combinedRequests.filter((r) => isApprovedHostelStatus(r.status)).length;
  }, [combinedRequests]);

  const totalPending = useMemo(() => {
    return pendingList.length;
  }, [pendingList]);

  const totalRejected = useMemo(() => {
    return combinedRequests.filter((r) => isRejectedHostelStatus(r.status, r.rejectedByRole)).length;
  }, [combinedRequests]);

  const totalAll = useMemo(() => {
    return totalApproved + totalPending + totalRejected;
  }, [totalApproved, totalPending, totalRejected]);

  const statsCount = useMemo(() => {
    if (statsData && typeof statsData.total === 'number') {
      const pending = statsData.pending ?? 0;
      const approved = statsData.approved ?? 0;
      const rejected = statsData.rejected ?? 0;
      return {
        total: statsData.total ?? (approved + pending + rejected),
        approved,
        pending,
        rejected
      };
    }
    return {
      total: totalAll,
      approved: totalApproved,
      pending: totalPending,
      rejected: totalRejected
    };
  }, [statsData, totalAll, totalApproved, totalPending, totalRejected]);

  // Filter requests based on tab & type filter and sort newest first
  const displayedRequests = useMemo(() => {
    let list = [];
    if (tab === 'pending') {
      list = pendingList;
    } else if (tab === 'history') {
      list = combinedRequests.filter((r) => !isPendingHostelStatus(r.status));
    } else {
      // Overview
      list = combinedRequests;
    }

    if (typeFilter !== 'ALL') {
      list = list.filter((r) => {
        const t = (r.requestType || 'OUTPASS').toUpperCase();
        return t === typeFilter;
      });
    }

    // Sort strictly newest first (createdAt descending)
    return list.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.outDate || a.startDate || 0).getTime();
      const dateB = new Date(b.createdAt || b.outDate || b.startDate || 0).getTime();
      return dateB - dateA;
    });
  }, [tab, pendingList, combinedRequests, typeFilter]);

  // Helper date formatters
  const formatSlashDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  };

  const formatPeriodTime = (req) => {
    const reqType = (req.requestType || 'OUTPASS').toUpperCase();
    if (reqType === 'OUTPASS') {
      if (req.outTime && (req.inTime || req.expectedInTime)) {
        return `${req.outTime} to ${req.inTime || req.expectedInTime}`;
      }
      if (req.outTime) return req.outTime;
      return '';
    }
    if (reqType === 'INTERNSHIP' || reqType === 'MESS_FEE') {
      if (req.startDate && req.endDate) {
        return `${formatSlashDate(req.startDate)} to ${formatSlashDate(req.endDate)}`;
      }
      return '';
    }
    return '';
  };

  const getStudentBranch = (req) => {
    return (
      req.branchId?.code ||
      req.studentId?.branchId?.code ||
      req.studentId?.branch?.code ||
      req.studentId?.branch ||
      req.branchCode ||
      req.studentId?.branchCode ||
      'CAI'
    );
  };

  // Export handlers
  const exportReport = () => {
    const rows = displayedRequests.map((req, idx) => ({
      '#': idx + 1,
      'Reference ID': req.referenceId || req._id?.toString().slice(-6) || '—',
      'Student Name': req.studentId?.name || '—',
      'Roll Number': req.studentId?.rollNo || '—',
      'Branch': getStudentBranch(req),
      'Year': getOrdinalYear(req.studentId?.year),
      'Permission Type': req.requestType || 'OUTPASS',
      'Date': formatSlashDate(req.outDate || req.startDate || req.requestDate || req.createdAt),
      'Time / Period': formatPeriodTime(req) || '—',
      'Reason': req.reason || '—',
      'Status': mapStatusToSimple(req.status)
    }));

    const ws = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{ Note: 'No requests found' }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Hostel Requests');
    XLSX.writeFile(wb, `Hostel_Requests_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const today = new Date();
  const weekday = today.toLocaleDateString('en-US', { weekday: 'long' });
  const formattedHeaderDate = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  // Status renderer
  const renderStatusBadge = (status) => {
    const norm = String(status || '').toUpperCase();
    if (isPendingHostelStatus(norm) || norm.includes('PENDING')) {
      return (
        <span
          style={{
            background: '#fef3c7',
            color: '#d97706',
            border: '1px solid #fde68a',
            padding: '3px 12px',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.3px',
            display: 'inline-block'
          }}
        >
          PENDING
        </span>
      );
    }
    if (isRejectedHostelStatus(norm)) {
      return (
        <span
          style={{
            background: '#fee2e2',
            color: '#dc2626',
            border: '1px solid #fecaca',
            padding: '3px 12px',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.3px',
            display: 'inline-block'
          }}
        >
          REJECTED
        </span>
      );
    }
    if (norm === 'GATE_PASS_ISSUED' || norm === 'GATE PASS ISSUED' || norm === 'APPROVED' || norm === 'ISSUED' || norm === 'CLEARED' || norm === 'USED') {
      return (
        <span
          style={{
            color: '#0f172a',
            fontSize: '11.5px',
            fontWeight: 800,
            letterSpacing: '0.2px',
            display: 'inline-block'
          }}
        >
          GATE PASS ISSUED
        </span>
      );
    }
    return (
      <span
        style={{
          color: '#0f172a',
          fontSize: '11.5px',
          fontWeight: 800,
          letterSpacing: '0.2px',
          display: 'inline-block'
        }}
      >
        {mapStatusToSimple(status)}
      </span>
    );
  };

  return (
    <DashboardLayout>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Top Header */}
        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ color: '#475569', fontSize: '14px', fontWeight: 500, marginBottom: '2px' }}>
              Welcome back,
            </div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.5px', lineHeight: 1.2 }}>
              Hostel <span style={{ color: '#059669' }}>In-charge</span>
            </h1>
          </div>

          {/* Date Widget */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              background: '#ffffff',
              padding: '8px 16px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: '#ecfdf5',
                border: '1px solid #d1fae5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#059669'
              }}
            >
              <Calendar size={18} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>{weekday}</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{formattedHeaderDate}</div>
            </div>
          </div>
        </div>

        {/* 4 Stats Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: '16px',
            marginBottom: '24px'
          }}
        >
          {[
            { key: 'TOTAL', label: 'TOTAL REQUESTS', value: statsCount.total, iconBg: '#f0f9ff', iconColor: '#3b82f6', valueColor: '#0f172a', icon: ClipboardList },
            { key: 'APPROVED', label: 'APPROVED', value: statsCount.approved, iconBg: '#ecfdf5', iconColor: '#10b981', valueColor: '#059669', icon: CheckCircle2 },
            { key: 'PENDING', label: 'PENDING', value: statsCount.pending, iconBg: '#fff7ed', iconColor: '#f59e0b', valueColor: '#d97706', icon: Clock },
            { key: 'REJECTED', label: 'REJECTED', value: statsCount.rejected, iconBg: '#fef2f2', iconColor: '#ef4444', valueColor: '#dc2626', icon: XCircle },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.key}
                onClick={() => {
                  setKpiFilter(card.key);
                  if (card.key === 'PENDING' && tab !== 'pending') navigate('/hostel/pending');
                  else if (card.key === 'TOTAL' && tab !== 'overview') navigate('/hostel/dashboard');
                }}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '16px 20px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                }}
              >
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    background: card.iconBg,
                    color: card.iconColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <Icon size={18} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', letterSpacing: '0.4px' }}>
                    {card.label}
                  </div>
                  <div style={{ fontSize: '26px', lineHeight: 1, fontWeight: 800, color: card.valueColor }}>
                    {card.value}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Details Heading */}
        <div style={{ marginBottom: tab === 'history' ? '14px' : '18px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>
            Details
          </h2>
        </div>

        {/* Review History Summary Bar */}
        {tab === 'history' && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px'
            }}
          >
            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
              This week: <strong style={{ color: '#0f172a', fontWeight: 700 }}>{summaryStats?.week?.total ?? 0}</strong>
              &nbsp;&nbsp;&nbsp;&nbsp;
              This month: <strong style={{ color: '#0f172a', fontWeight: 700 }}>{summaryStats?.month?.total ?? 0}</strong>
            </div>
            <button
              type="button"
              onClick={exportReport}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                background: '#059669',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(5,150,105,0.2)',
                transition: 'background 0.15s ease'
              }}
            >
              <FileSpreadsheet size={16} />
              <span>Export report</span>
            </button>
          </div>
        )}

        {/* Table Container */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}
        >
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
              <div className="spinner" style={{ margin: '0 auto 12px' }} />
              <div>Loading requests...</div>
            </div>
          ) : displayedRequests.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center' }}>
              <div style={{ color: '#059669', marginBottom: '12px' }}>
                <CheckCircle2 size={40} style={{ margin: '0 auto' }} />
              </div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                {tab === 'pending' ? 'No pending requests' : 'No requests found'}
              </div>
              <div style={{ fontSize: '13px', color: '#64748b' }}>
                {tab === 'pending'
                  ? 'There are no pending requests waiting for your clearance.'
                  : 'No hosteller out-pass requests found matching the current filter.'}
              </div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f4faf7', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '14px 20px', fontSize: '11.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                      TYPE
                    </th>
                    <th style={{ padding: '14px 20px', fontSize: '11.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                      STUDENT
                    </th>
                    <th style={{ padding: '14px 20px', fontSize: '11.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                      REASON / DETAILS
                    </th>
                    <th style={{ padding: '14px 20px', fontSize: '11.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                      DATE / PERIOD
                    </th>
                    <th style={{ padding: '14px 20px', fontSize: '11.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                      STATUS
                    </th>
                    {tab !== 'overview' && (
                      <th style={{ padding: '14px 20px', fontSize: '11.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px', textAlign: 'right' }}>
                        ACTION
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {displayedRequests.map((req) => {
                    return (
                      <tr
                        key={req._id}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          transition: 'background 0.15s ease'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        {/* TYPE */}
                        <td style={{ padding: '16px 20px', verticalAlign: 'middle' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '4px 12px',
                              borderRadius: '20px',
                              fontSize: '12px',
                              fontWeight: 600,
                              background: '#f8fafc',
                              color: '#334155',
                              border: '1px solid #cbd5e1'
                            }}
                          >
                            <Car size={13} style={{ color: '#475569' }} />
                            <span>Out-Pass</span>
                          </span>
                        </td>

                        {/* STUDENT */}
                        <td style={{ padding: '16px 20px', verticalAlign: 'middle' }}>
                          <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#0f172a', textTransform: 'uppercase' }}>
                            {req.studentId?.name || '—'}
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                            {req.studentId?.rollNo || '—'} | {getStudentBranch(req)}
                          </div>
                        </td>

                        {/* REASON / DETAILS */}
                        <td style={{ padding: '16px 20px', verticalAlign: 'middle', maxWidth: '240px' }}>
                          <div style={{ fontSize: '13px', color: '#334155', fontWeight: 500 }}>
                            {req.reason || '—'}
                          </div>
                        </td>

                        {/* DATE / PERIOD */}
                        <td style={{ padding: '16px 20px', verticalAlign: 'middle' }}>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                            {formatSlashDate(req.outDate || req.requestDate || req.createdAt)}
                          </div>
                          {formatPeriodTime(req) && (
                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                              {formatPeriodTime(req)}
                            </div>
                          )}
                        </td>

                        {/* STATUS */}
                        <td style={{ padding: '16px 20px', verticalAlign: 'middle' }}>
                          {renderStatusBadge(req.status)}
                        </td>

                        {/* ACTION */}
                        {tab !== 'overview' && (
                          <td style={{ padding: '16px 20px', verticalAlign: 'middle', textAlign: 'right' }}>
                            <button
                              type="button"
                              onClick={() => navigate(`/outpass/${req._id}`)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '5px 14px',
                                background: '#dcfce7',
                                color: '#059669',
                                border: '1px solid #bbf7d0',
                                borderRadius: '20px',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#bbf7d0';
                                e.currentTarget.style.borderColor = '#86efac';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#dcfce7';
                                e.currentTarget.style.borderColor = '#bbf7d0';
                              }}
                            >
                              <Eye size={14} />
                              <span>View</span>
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
