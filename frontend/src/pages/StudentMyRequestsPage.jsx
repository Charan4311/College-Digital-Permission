import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import api from '../lib/api';
import {
  FaMagnifyingGlass,
  FaCalendarDays,
  FaChevronDown,
  FaEye,
  FaClock,
  FaCircleCheck,
  FaCircleXmark,
  FaBan,
  FaBriefcase,
  FaBookOpenReader,
  FaFileInvoiceDollar,
  FaBuildingColumns,
  FaArrowLeft,
  FaArrowRight
} from 'react-icons/fa6';

const TYPE_OPTIONS = [
  { value: 'ALL', label: 'All Requests' },
  { value: 'OUTPASS', label: 'Out-Pass' },
  { value: 'MESS_FEE', label: 'Mess Fee' },
  { value: 'INTERNSHIP', label: 'Internship' },
  { value: 'LIBRARY', label: 'Library' }
];

const TYPE_STYLES = {
  OUTPASS: { label: 'Out-Pass', icon: FaBuildingColumns, bg: '#eff6ff', text: '#3B82F6', border: '#cfe0ff' },
  MESS_FEE: { label: 'Mess Fee', icon: FaFileInvoiceDollar, bg: '#fff1f2', text: '#be123c', border: '#fecdd3' },
  INTERNSHIP: { label: 'Internship', icon: FaBriefcase, bg: '#eef9ff', text: '#0369a1', border: '#eff6ff' },
  LIBRARY: { label: 'Library', icon: FaBookOpenReader, bg: '#ecfdf5', text: '#15803d', border: '#dbeafe' }
};

const STATUS_STYLES = {
  PENDING: { label: 'Pending', icon: FaClock, bg: '#fef3c7', text: '#b45309', border: '#fcd34d' },
  APPROVED: { label: 'Approved', icon: FaCircleCheck, bg: '#dcfce7', text: '#15803d', border: '#86efac' },
  REJECTED: { label: 'Rejected', icon: FaCircleXmark, bg: '#fee2e2', text: '#dc2626', border: '#fca5a5' },
  CANCELLED: { label: 'Cancelled', icon: FaBan, bg: '#e2e8f0', text: '#475569', border: '#cbd5e1' }
};

function formatDate(value) {
  if (!value) return 'N/A';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatTime(value) {
  if (!value) return 'N/A';
  return value;
}

function sortRequests(list, sortBy) {
  const items = [...list];
  if (sortBy === 'oldest') {
    return items.sort((a, b) => new Date(a.createdAt || a.requestDate || a.outDate || 0) - new Date(b.createdAt || b.requestDate || b.outDate || 0));
  }
  return items.sort((a, b) => new Date(b.createdAt || b.requestDate || b.outDate || 0) - new Date(a.createdAt || a.requestDate || a.outDate || 0));
}

export default function StudentMyRequestsPage() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyFilter, setHistoryFilter] = useState('ALL');
  const [searchText, setSearchText] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [sortBy, setSortBy] = useState('latest');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const getDateRangeFilter = (rangeKey) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    const lastWeekStart = new Date(today);
    lastWeekStart.setDate(today.getDate() - today.getDay() - 7);
    const lastWeekEnd = new Date(lastWeekStart);
    lastWeekEnd.setDate(lastWeekStart.getDate() + 6);

    const filterMap = {
      all: null,
      today: { start: today, end: new Date(today.getTime() + 24 * 60 * 60 * 1000) },
      last_week: { start: lastWeekStart, end: new Date(lastWeekEnd.getTime() + 24 * 60 * 60 * 1000) },
      this_week: { start: startOfWeek, end: new Date(endOfWeek.getTime() + 24 * 60 * 60 * 1000) },
      last_month: { start: startOfLastMonth, end: endOfLastMonth }
    };

    return filterMap[rangeKey] || null;
  };

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

  useEffect(() => {
    setCurrentPage(1);
  }, [historyFilter, searchText, dateFilter, sortBy]);

  const filteredRequests = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();
    let data = requests.filter((request) => {
      const matchType = historyFilter === 'ALL' ? true : (request.requestType || 'OUTPASS') === historyFilter;
      if (!matchType) return false;

      if (!normalizedSearch) return true;

      const searchable = [
        request.reason,
        request.companyName,
        request.role,
        request.place,
        request.requestType,
        request.status,
        request.type
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchable.includes(normalizedSearch);
    });

    const range = getDateRangeFilter(dateFilter);
    if (range) {
      data = data.filter((request) => {
        const requestDate = new Date(request.createdAt || request.requestDate || request.outDate || 0);
        return requestDate >= range.start && requestDate <= range.end;
      });
    }

    return sortRequests(data, sortBy);
  }, [requests, historyFilter, searchText, dateFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedRequests = filteredRequests.slice(startIndex, startIndex + pageSize);

  const getTypeDetails = (type) => TYPE_STYLES[type] || TYPE_STYLES.OUTPASS;
  const getStatusDetails = (status) => {
    let key = 'PENDING';
    if (status?.startsWith('REJECTED')) key = 'REJECTED';
    else if (['APPROVED', 'CLEARED', 'ISSUED', 'USED'].includes(status)) key = 'APPROVED';
    else if (status === 'CANCELLED') key = 'CANCELLED';
    return STATUS_STYLES[key] || STATUS_STYLES.PENDING;
  };

  const pageInfoStart = filteredRequests.length === 0 ? 0 : startIndex + 1;
  const pageInfoEnd = Math.min(startIndex + pageSize, filteredRequests.length);

  return (
    <DashboardLayout>
      <div className="card" style={{ maxWidth: '1180px', borderRadius: '18px', border: '1px solid #e2e8f0', boxShadow: '0 18px 45px rgba(15, 23, 42, 0.05)', overflow: 'hidden', background: '#ffffff' }}>
        <div style={{ padding: '20px 18px 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'linear-gradient(135deg, #2563EB 0%, #60a5fa 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 8px 18px rgba(109,40,217,0.2)' }}>
                <FaBuildingColumns size={18} />
              </div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#1f2937', lineHeight: 1.2 }}>My Requests</div>
                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>View all your permission requests and their current status.</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', minWidth: '260px' }}>
                <FaMagnifyingGlass size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Search by purpose, place or status..."
                  style={{ width: '100%', border: '1px solid #dfe6f2', borderRadius: '12px', padding: '10px 14px 10px 38px', fontSize: '14px', color: '#334155', background: '#fff', outline: 'none', boxShadow: '0 2px 6px rgba(15, 23, 42, 0.02)' }}
                />
              </div>

              <div style={{ position: 'relative', minWidth: '150px' }}>
                <FaCalendarDays size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} style={{ width: '100%', appearance: 'none', border: '1px solid #dfe6f2', borderRadius: '12px', padding: '10px 34px 10px 34px', fontSize: '14px', color: '#334155', background: '#fff', outline: 'none' }}>
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="last_week">Last Week</option>
                  <option value="this_week">This Week</option>
                  <option value="last_month">Last Month</option>
                </select>
                <FaChevronDown size={12} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '22px', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {TYPE_OPTIONS.map((option) => {
                const active = option.value === historyFilter;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setHistoryFilter(option.value)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '999px',
                      border: active ? '1px solid transparent' : '1px solid #dfe6f2',
                      background: active ? 'linear-gradient(135deg, #2563EB 0%, #2563eb 100%)' : '#f8fafc',
                      color: active ? '#fff' : '#475569',
                      fontSize: '13px',
                      fontWeight: active ? 700 : 600,
                      boxShadow: active ? '0 8px 18px rgba(109,40,217,0.18)' : 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#475569', fontSize: '13px' }}>
              <span style={{ fontWeight: 600, color: '#334155' }}>Sort by</span>
              <div style={{ position: 'relative' }}>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ appearance: 'none', border: '1px solid #dfe6f2', borderRadius: '10px', background: '#f8fafc', color: '#334155', padding: '8px 32px 8px 12px', fontWeight: 600, outline: 'none' }}>
                  <option value="latest">Latest First</option>
                  <option value="oldest">Oldest First</option>
                </select>
                <FaChevronDown size={12} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '180px' }}>
            <div className="spinner spinner-lg" />
          </div>
        ) : filteredRequests.length === 0 ? (
          <div style={{ padding: '40px 16px 60px', textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>No requests found</div>
            <div>Try a different filter or submit your first permission request.</div>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1040px' }}>
                <thead>
                  <tr style={{ background: '#eff6ff', color: '#334155' }}>
                    {['#', 'Type', 'Purpose / Details', 'Date & Time', 'Status', 'Action'].map((heading) => (
                      <th key={heading} style={{ textAlign: 'left', fontSize: '13px', fontWeight: 800, padding: '14px 16px', borderBottom: '1px solid #e5e7eb' }}>{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedRequests.map((request, index) => {
                    const reqType = request.requestType || 'OUTPASS';
                    const typeDetails = getTypeDetails(reqType);
                    const statusDetails = getStatusDetails(request.status);
                    const Icon = typeDetails.icon;
                    const StatusIcon = statusDetails.icon;
                    const startDate = formatDate(request.outDate || request.startDate || request.requestDate || request.createdAt);
                    const endDate = formatDate(request.expectedReturnDate || request.endDate || request.createdAt);
                    const eventTime = request.outTime || request.createdAt ? (request.outTime || new Date(request.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })) : 'N/A';

                    return (
                      <tr key={request._id} style={{ borderBottom: '1px solid #edf2f7', background: '#fff' }}>
                        <td style={{ padding: '14px 16px', fontWeight: 700, color: '#475569' }}>{String(startIndex + index + 1).padStart(2, '0')}</td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 700, fontSize: '13px', lineHeight: 1.2 }}>
                            {typeDetails.label}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', color: '#0f172a' }}>
                          {reqType === 'INTERNSHIP' ? (
                            <>
                              <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>{request.companyName || 'Company'} - {request.role || 'Role'}</div>
                              <div style={{ color: '#64748b', fontSize: '12px' }}>{request.internshipMode || 'Offline'}</div>
                            </>
                          ) : reqType === 'LIBRARY' ? (
                            <>
                              <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>Library Access</div>
                              <div style={{ color: '#64748b', fontSize: '12px' }}>{request.reason || 'N/A'}</div>
                            </>
                          ) : reqType === 'MESS_FEE' ? (
                            <>
                              <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>Mess Fee Clearance</div>
                              <div style={{ color: '#64748b', fontSize: '12px' }}>{request.reason || 'N/A'}</div>
                            </>
                          ) : (
                            <>
                              <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>{request.reason || 'Out-Pass'}</div>
                              <div style={{ color: '#64748b', fontSize: '12px' }}>{request.place || 'N/A'}</div>
                            </>
                          )}
                        </td>
                        <td style={{ padding: '14px 16px', color: '#475569' }}>
                          <div style={{ display: 'grid', gap: '4px', fontSize: '13px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>{startDate}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>{eventTime}</span>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: statusDetails.bg, color: statusDetails.text, border: `1px solid ${statusDetails.border}`, borderRadius: '999px', padding: '6px 12px', fontSize: '12px', fontWeight: 700 }}>
                            <StatusIcon size={12} />
                            {statusDetails.label}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <button
                            type="button"
                            onClick={() => navigate(`/student/request/${request._id}`)}
                            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '6px 12px', borderRadius: '6px', border: '1px solid #1d4ed8', background: '#fff', color: '#1d4ed8', cursor: 'pointer', fontSize: '13px', fontWeight: 600, transition: 'all 0.2s' }}
                            onMouseOver={(e) => { e.currentTarget.style.background = '#1d4ed8'; e.currentTarget.style.color = '#fff'; }}
                            onMouseOut={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#1d4ed8'; }}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px 18px', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ color: '#64748b', fontSize: '14px' }}>
                Showing {filteredRequests.length === 0 ? 0 : pageInfoStart} to {pageInfoEnd} of {filteredRequests.length} requests
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  style={{ width: '32px', height: '32px', border: '1px solid #dfe6f2', borderRadius: '8px', background: currentPage === 1 ? '#f8fafc' : '#fff', color: currentPage === 1 ? '#a0aec0' : '#334155', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                >
                  <FaArrowLeft size={12} />
                </button>

                <button
                  type="button"
                  style={{ minWidth: '38px', height: '32px', borderRadius: '8px', border: '1px solid #2563EB', background: '#2563EB', color: '#fff', fontWeight: 700, padding: '0 12px' }}
                >
                  {currentPage}
                </button>

                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  style={{ width: '32px', height: '32px', border: '1px solid #dfe6f2', borderRadius: '8px', background: currentPage >= totalPages ? '#f8fafc' : '#fff', color: currentPage >= totalPages ? '#a0aec0' : '#334155', cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer' }}
                >
                  <FaArrowRight size={12} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
