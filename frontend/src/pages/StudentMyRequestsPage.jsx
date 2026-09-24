import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import api from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Card } from '../components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from '../components/ui/table';
import {
  FaMagnifyingGlass,
  FaCalendarDays,
  FaChevronDown,
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
  OUTPASS: { label: 'Out-Pass', icon: FaBuildingColumns, bg: '#f3e8ff', text: '#7C3AED', border: '#cfe0ff' },
  MESS_FEE: { label: 'Mess Fee', icon: FaFileInvoiceDollar, bg: '#fff1f2', text: '#be123c', border: '#fecdd3' },
  INTERNSHIP: { label: 'Internship', icon: FaBriefcase, bg: '#eef9ff', text: '#0369a1', border: '#f3e8ff' },
  LIBRARY: { label: 'Library', icon: FaBookOpenReader, bg: '#ecfdf5', text: '#15803d', border: '#e9d5ff' }
};

const STATUS_STYLES = {
  PENDING_CTPO: { label: 'Pending CTPO', icon: FaClock, bg: '#fef3c7', text: '#b45309', border: '#fcd34d' },
  PENDING_HOD: { label: 'Pending HOD', icon: FaClock, bg: '#fef3c7', text: '#b45309', border: '#fcd34d' },
  PENDING_HOSTEL_INCHARGE: { label: 'Pending Hostel', icon: FaClock, bg: '#fef3c7', text: '#b45309', border: '#fcd34d' },
  PENDING_PLACEMENT_OFFICER: { label: 'Pending Placement', icon: FaClock, bg: '#fef3c7', text: '#b45309', border: '#fcd34d' },
  APPROVED: { label: 'Approved / Cleared', icon: FaCircleCheck, bg: '#dcfce7', text: '#15803d', border: '#86efac' },
  ISSUED: { label: 'Issued (Active)', icon: FaCircleCheck, bg: '#dcfce7', text: '#15803d', border: '#86efac' },
  USED: { label: 'Used / Gate Passed', icon: FaCircleCheck, bg: '#dcfce7', text: '#15803d', border: '#86efac' },
  REJECTED_CTPO: { label: 'Rejected (CTPO)', icon: FaCircleXmark, bg: '#fee2e2', text: '#dc2626', border: '#fca5a5' },
  REJECTED_HOD: { label: 'Rejected (HOD)', icon: FaCircleXmark, bg: '#fee2e2', text: '#dc2626', border: '#fca5a5' },
  REJECTED_HOSTEL_INCHARGE: { label: 'Rejected (Hostel)', icon: FaCircleXmark, bg: '#fee2e2', text: '#dc2626', border: '#fca5a5' },
  REJECTED_PLACEMENT_OFFICER: { label: 'Rejected (Placement)', icon: FaCircleXmark, bg: '#fee2e2', text: '#dc2626', border: '#fca5a5' },
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
  const getStatusDetails = (status) => STATUS_STYLES[status] || { label: String(status || 'Pending').replace(/_/g, ' '), icon: FaClock, bg: '#f8fafc', text: '#475569', border: '#cbd5e1' };

  const pageInfoStart = filteredRequests.length === 0 ? 0 : startIndex + 1;
  const pageInfoEnd = Math.min(startIndex + pageSize, filteredRequests.length);

  return (
    <DashboardLayout>
      <header className="page-header" style={{ marginBottom: '18px' }}>
        <div className="eyebrow">Student Requests</div>
        <h1 className="page-title">My Permission History</h1>
        <p className="page-subtitle">View all your permission requests and their current status.</p>
      </header>

      <Card className="student-requests-card" style={{ maxWidth: '1180px', borderRadius: '18px', border: '1px solid #e2e8f0', boxShadow: '0 18px 45px rgba(15, 23, 42, 0.05)', overflow: 'hidden', background: '#ffffff' }}>
        <div style={{ padding: '20px 18px 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'linear-gradient(135deg, #6D28D9 0%, #60a5fa 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 8px 18px rgba(109,40,217,0.2)' }}>
                <FaBuildingColumns size={18} />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', minWidth: '260px' }}>
                <FaMagnifyingGlass size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <Input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Search by purpose, place or status..."
                  className="h-10 pl-9 pr-3 text-sm rounded-xl border-slate-200 bg-white shadow-sm focus-visible:ring-violet-500"
                />
              </div>

              <div style={{ position: 'relative', minWidth: '150px' }}>
                <FaCalendarDays size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All Time</SelectItem><SelectItem value="today">Today</SelectItem><SelectItem value="last_week">Last Week</SelectItem><SelectItem value="this_week">This Week</SelectItem><SelectItem value="last_month">Last Month</SelectItem></SelectContent>
                </Select>
                <FaChevronDown size={12} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '22px', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {TYPE_OPTIONS.map((option) => {
                const active = option.value === historyFilter;
                return (
                  <Button
                    key={option.value}
                    type="button"
                    variant={active ? 'default' : 'outline'}
                    onClick={() => setHistoryFilter(option.value)}
                    className={active ? 'rounded-full bg-violet-600 hover:bg-violet-700 text-white shadow-md' : 'rounded-full border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'}
                  >
                    {option.label}
                  </Button>
                );
              })}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#475569', fontSize: '13px' }}>
              <span style={{ fontWeight: 600, color: '#334155' }}>Sort by</span>
              <div style={{ position: 'relative' }}>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="latest">Latest First</SelectItem><SelectItem value="oldest">Oldest First</SelectItem></SelectContent>
                </Select>
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
              <Table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1040px' }}>
                <TableHeader>
                  <TableRow style={{ background: '#eef2ff', color: '#334155' }}>
                    {['#', 'Type', 'Purpose / Title', 'Details', 'Date & Time', 'Status', 'Action'].map((heading) => (
                      <TableHead key={heading} style={{ textAlign: 'left', fontSize: '13px', fontWeight: 800, padding: '14px 16px', borderBottom: '1px solid #e5e7eb' }}>{heading}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRequests.map((request, index) => {
                    const reqType = request.requestType || 'OUTPASS';
                    const typeDetails = getTypeDetails(reqType);
                    const statusDetails = getStatusDetails(request.status);
                    const StatusIcon = statusDetails.icon;
                    const purpose = request.reason || 'Permission Request';
                    const subPurpose = request.companyName || request.place || request.role || 'N/A';
                    const startDate = formatDate(request.outDate || request.startDate || request.requestDate || request.createdAt);
                    const eventTime = request.outTime || request.createdAt ? (request.outTime || new Date(request.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })) : 'N/A';

                    return (
                      <TableRow key={request._id} style={{ borderBottom: '1px solid #edf2f7', background: '#fff' }}>
                        <TableCell style={{ padding: '14px 16px', fontWeight: 700, color: '#475569' }}>{String(startIndex + index + 1).padStart(2, '0')}</TableCell>
                        <TableCell style={{ padding: '14px 16px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 700, fontSize: '13px', lineHeight: 1.2 }}>
                            {typeDetails.label}
                          </span>
                        </TableCell>
                        <TableCell style={{ padding: '14px 16px', color: '#0f172a' }}>
                          <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '4px' }}>{purpose}</div>
                          <div style={{ color: '#64748b', fontSize: '12px' }}>{subPurpose}</div>
                        </TableCell>
                        <TableCell style={{ padding: '14px 16px', color: '#475569', fontSize: '13px' }}>
                          {reqType === 'INTERNSHIP' ? (
                            <div style={{ display: 'grid', gap: '4px' }}>
                              <div>{request.companyName || 'Company'} / {request.role || 'Role'}</div>
                              <div>{request.internshipMode || 'Offline'}</div>
                            </div>
                          ) : (
                            <div>{request.reason || 'N/A'}</div>
                          )}
                        </TableCell>
                        <TableCell style={{ padding: '14px 16px', color: '#475569' }}>
                          <div style={{ display: 'grid', gap: '4px', fontSize: '13px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>{startDate}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>{eventTime}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell style={{ padding: '14px 16px' }}>
                          <Badge variant={statusDetails.bg.includes('dcfce7') ? 'success' : statusDetails.bg.includes('fee2e2') ? 'destructive' : 'secondary'} className="gap-1.5 px-2.5 py-1 text-[11px] font-semibold">
                            <StatusIcon size={12} />
                            {statusDetails.label}
                          </Badge>
                        </TableCell>
                        <TableCell style={{ padding: '14px 16px' }}>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => navigate(`/student/request/${request._id}`)}
                            className="h-8 px-3 text-xs font-semibold text-violet-700 border-violet-200 hover:bg-violet-50"
                            aria-label="View request"
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px 18px', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ color: '#64748b', fontSize: '14px' }}>
                Showing {filteredRequests.length === 0 ? 0 : pageInfoStart} to {pageInfoEnd} of {filteredRequests.length} requests
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="h-8 w-8 rounded-md border-slate-200 bg-white disabled:opacity-50"
                >
                  <FaArrowLeft size={12} />
                </Button>

                <Button
                  type="button"
                  className="h-8 min-w-10 rounded-md bg-violet-600 hover:bg-violet-700 text-white px-3"
                >
                  {currentPage}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="h-8 w-8 rounded-md border-slate-200 bg-white disabled:opacity-50"
                >
                  <FaArrowRight size={12} />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </DashboardLayout>
  );
}
