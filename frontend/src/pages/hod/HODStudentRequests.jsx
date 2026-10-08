import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import FilterDropdown from '../../components/FilterDropdown';
import ZoomableTableWrapper from '../../components/ZoomableTableWrapper';
import api from '../../lib/api';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  ClipboardList
} from 'lucide-react';

const PAGE_SIZE = 10;

const STATUS_TABS = [
  { key: 'ALL', label: 'All Requests' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'REJECTED', label: 'Rejected' },
];

const HOD_PERMISSION_OPTIONS = [
  { value: 'ALL', label: 'All Types' },
  { value: 'OUTPASS', label: 'Out-Pass' },
  { value: 'INTERNSHIP', label: 'Internship' },
  { value: 'MESS_FEE', label: 'Mess Fee' },
];

const formatMediumDate = (dateInput) => {
  if (!dateInput) return '—';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '—';
  const day = String(d.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()] || 'Oct';
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
};

const getTypeLabel = (type) => {
  if (!type) return 'Out-Pass';
  const t = String(type).toUpperCase();
  if (t === 'OUTPASS' || t === 'OUT_PASS') return 'Out-Pass';
  if (t === 'INTERNSHIP') return 'Internship';
  if (t === 'MESS_FEE' || t === 'MESS') return 'Mess Fee';
  if (t === 'LIBRARY') return 'Library';
  return type;
};

export const getHODStatusCategory = (status) => {
  if (!status) return 'Pending';
  const s = String(status).toUpperCase();
  if (s.startsWith('REJECT') || s === 'CANCELLED') {
    return 'Rejected';
  }
  if (s === 'PENDING_HOD' || s === 'PENDING_HOD_APPROVAL') {
    return 'Pending';
  }
  if (
    [
      'APPROVED',
      'ISSUED',
      'CLEARED',
      'USED',
      'COMPLETED',
      'PENDING_HOSTEL_INCHARGE',
      'PENDING_PLACEMENT_OFFICER',
      'PENDING_CTPO'
    ].includes(s)
  ) {
    return 'Approved';
  }
  return 'Pending';
};

export default function HODStudentRequests() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const urlStatus = String(searchParams.get('status') || 'ALL').toUpperCase();
  const branchFilter = String(searchParams.get('branch') || '').trim().toUpperCase();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState(
    STATUS_TABS.some((t) => t.key === urlStatus) ? urlStatus : 'ALL'
  );
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const params = {
        ...(branchFilter && { branchCode: branchFilter }),
        ...(typeFilter !== 'ALL' && { type: typeFilter }),
        ...(search.trim() && { search: search.trim() }),
        ...(fromDate && { from: fromDate }),
        ...(toDate && { to: toDate }),
      };

      const res = await api.get('/outpass/all/for-me', { params });
      const rawData = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
      // Ensure Library requests are excluded from HOD jurisdiction
      const data = rawData.filter((r) => r.requestType !== 'LIBRARY');
      setRequests(data);
    } catch (err) {
      console.error('HOD student requests error:', err);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [branchFilter, typeFilter, search, fromDate, toDate]);

  useEffect(() => {
    const status = String(searchParams.get('status') || 'ALL').toUpperCase();
    if (STATUS_TABS.some((t) => t.key === status)) {
      setActiveStatus(status);
    }
    setCurrentPage(1);
  }, [searchParams]);

  // Live dynamic counts computed from all active filtered requests
  const counts = useMemo(() => {
    return requests.reduce(
      (acc, r) => {
        const cat = getHODStatusCategory(r.status);
        acc.ALL += 1;
        if (cat === 'Approved') acc.APPROVED += 1;
        else if (cat === 'Pending') acc.PENDING += 1;
        else if (cat === 'Rejected') acc.REJECTED += 1;
        return acc;
      },
      { ALL: 0, APPROVED: 0, PENDING: 0, REJECTED: 0 }
    );
  }, [requests]);

  // Filter requests based on the selected status tab
  const displayedRequests = useMemo(() => {
    if (activeStatus === 'ALL') return requests;
    return requests.filter(
      (r) => getHODStatusCategory(r.status).toUpperCase() === activeStatus
    );
  }, [requests, activeStatus]);

  const totalPages = Math.max(1, Math.ceil(displayedRequests.length / PAGE_SIZE));
  const pageRequests = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return displayedRequests.slice(start, start + PAGE_SIZE);
  }, [displayedRequests, currentPage]);

  const clearFilters = () => {
    setSearch('');
    setTypeFilter('ALL');
    setFromDate('');
    setToDate('');
    setActiveStatus('ALL');
    setCurrentPage(1);
    if (branchFilter) setSearchParams({});
  };

  const currentTabLabel =
    activeStatus === 'APPROVED'
      ? 'Approved Requests'
      : activeStatus === 'PENDING'
      ? 'Pending Requests'
      : activeStatus === 'REJECTED'
      ? 'Rejected Requests'
      : 'All Requests';

  return (
    <DashboardLayout>
      <div style={{ padding: '0 4px', width: '100%' }}>
        {/* Page Header */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px' }}>
            Student Requests {branchFilter ? `• ${branchFilter}` : ''}
          </h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13, fontWeight: 500 }}>
            View and manage all student requests under your department
          </p>
        </div>

        {/* Status Tabs */}
        <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid #e2e8f0', marginBottom: 20, overflowX: 'auto' }}>
          {STATUS_TABS.map((tab) => {
            const active = activeStatus === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setActiveStatus(tab.key);
                  setCurrentPage(1);
                }}
                style={{
                  border: 'none',
                  borderBottom: active ? '3px solid #10b981' : '3px solid transparent',
                  background: active ? '#ecfdf5' : 'transparent',
                  color: active ? '#047857' : '#64748b',
                  padding: '10px 18px',
                  borderRadius: '8px 8px 0 0',
                  fontSize: 13.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.label} ({counts[tab.key] ?? 0})
              </button>
            );
          })}
        </div>

        {/* Search & Filters Bar */}
        <div className="card" style={{ marginBottom: 20, padding: 16 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: '1 1 260px' }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8'
                }}
              />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search by name or roll number..."
                style={{
                  width: '100%',
                  height: 40,
                  padding: '0 12px 0 36px',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  fontSize: 13,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <FilterDropdown
              value={typeFilter}
              onChange={(val) => {
                setTypeFilter(val);
                setCurrentPage(1);
              }}
              options={HOD_PERMISSION_OPTIONS}
              style={{ flex: '0 0 160px' }}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="date"
                value={fromDate}
                min="2000-01-01"
                max="2030-12-31"
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  height: 40,
                  padding: '0 10px',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  fontSize: 12,
                  outline: 'none',
                  color: '#334155'
                }}
              />
              <span style={{ color: '#94a3b8', fontSize: 12 }}>to</span>
              <input
                type="date"
                value={toDate}
                min="2000-01-01"
                max="2030-12-31"
                onChange={(e) => {
                  setToDate(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  height: 40,
                  padding: '0 10px',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  fontSize: 12,
                  outline: 'none',
                  color: '#334155'
                }}
              />
            </div>

            <button
              type="button"
              onClick={clearFilters}
              style={{
                height: 40,
                padding: '0 16px',
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: 600,
                color: '#64748b',
                cursor: 'pointer'
              }}
            >
              Clear
            </button>
          </div>
        </div>

        {/* Requests Table Card matching Reference */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Card Header inside Table */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '16px 20px',
              borderBottom: '1px solid #f1f5f9'
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                background: '#ecfdf5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#059669'
              }}
            >
              <ClipboardList size={18} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                {currentTabLabel}
              </h2>
              <p style={{ margin: '1px 0 0', fontSize: 12, color: '#64748b' }}>
                {displayedRequests.length} requests
              </p>
            </div>
          </div>

          <ZoomableTableWrapper>
            <table style={{ width: '100%', minWidth: 850, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  {['#', 'STUDENT NAME', 'ROLL NO', 'BRANCH', 'TYPE', 'DATE', 'STATUS', 'ACTION'].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: '12px 16px',
                        textAlign: h === 'ACTION' ? 'center' : 'left',
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#64748b',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                      Loading requests...
                    </td>
                  </tr>
                ) : pageRequests.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: 48, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
                      No requests found matching the selected filters.
                    </td>
                  </tr>
                ) : (
                  pageRequests.map((r, idx) => {
                    const statusCategory = getHODStatusCategory(r.status);
                    const isAppr = statusCategory === 'Approved';
                    const isRej = statusCategory === 'Rejected';

                    return (
                      <tr
                        key={r._id}
                        style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s ease' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ padding: '14px 16px', fontSize: 13, color: '#64748b' }}>
                          {(currentPage - 1) * PAGE_SIZE + idx + 1}
                        </td>
                        <td
                          style={{
                            padding: '14px 16px',
                            fontSize: 13,
                            fontWeight: 700,
                            color: '#1e293b',
                            textTransform: 'uppercase'
                          }}
                        >
                          {r.studentId?.name || '—'}
                        </td>
                        <td
                          style={{
                            padding: '14px 16px',
                            fontSize: 13,
                            color: '#475569',
                            fontFamily: 'monospace'
                          }}
                        >
                          {r.studentId?.rollNo || '—'}
                        </td>
                        <td
                          style={{
                            padding: '14px 16px',
                            fontSize: 13,
                            fontWeight: 600,
                            color: '#334155'
                          }}
                        >
                          {r.branchId?.name || r.branchId?.code || '—'}
                        </td>
                        <td
                          style={{
                            padding: '14px 16px',
                            fontSize: 13,
                            color: '#334155',
                            fontWeight: 500
                          }}
                        >
                          {getTypeLabel(r.requestType)}
                        </td>
                        <td
                          style={{
                            padding: '14px 16px',
                            fontSize: 13,
                            color: '#475569',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {formatMediumDate(r.createdAt)}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '3px 10px',
                              borderRadius: 999,
                              fontSize: 11.5,
                              fontWeight: 600,
                              background: isAppr ? '#ecfdf5' : isRej ? '#fef2f2' : '#fff7ed',
                              color: isAppr ? '#047857' : isRej ? '#b91c1c' : '#c2410c',
                              border: `1px solid ${isAppr ? '#a7f3d0' : isRej ? '#fecaca' : '#fed7aa'}`
                            }}
                          >
                            {statusCategory}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => navigate(`/outpass/${r._id}`)}
                            style={{
                              height: 30,
                              padding: '0 14px',
                              border: '1px solid #a7f3d0',
                              borderRadius: 50,
                              background: '#ecfdf5',
                              color: '#059669',
                              fontSize: 12.5,
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#d1fae5';
                              e.currentTarget.style.borderColor = '#6ee7b7';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = '#ecfdf5';
                              e.currentTarget.style.borderColor = '#a7f3d0';
                            }}
                          >
                            <Eye size={14} />
                            <span>Review</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </ZoomableTableWrapper>

          {totalPages > 1 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderTop: '1px solid #e2e8f0'
              }}
            >
              <span style={{ fontSize: 12, color: '#64748b' }}>
                Showing {(currentPage - 1) * PAGE_SIZE + 1} -{' '}
                {Math.min(currentPage * PAGE_SIZE, displayedRequests.length)} of {displayedRequests.length}
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  style={{
                    padding: '6px 10px',
                    border: '1px solid #e2e8f0',
                    borderRadius: 6,
                    background: '#fff',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    color: currentPage === 1 ? '#cbd5e1' : '#334155'
                  }}
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  style={{
                    padding: '6px 10px',
                    border: '1px solid #e2e8f0',
                    borderRadius: 6,
                    background: '#fff',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    color: currentPage === totalPages ? '#cbd5e1' : '#334155'
                  }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
