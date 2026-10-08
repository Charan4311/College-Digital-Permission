import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import FilterDropdown from '../../components/FilterDropdown';
import ZoomableTableWrapper from '../../components/ZoomableTableWrapper';
import api from '../../lib/api';
import {
  formatDate,
  getOrdinalYear,
  getResidenceTypeLabel,
  PERMISSION_OPTIONS,
  mapStatusToSimple
} from '../../lib/utils';
import {
  ArrowLeft,
  Building2,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  Download,
  CalendarDays,
  FileSpreadsheet,
  FileText
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const PAGE_SIZE = 10;

const STATUS_TABS = [
  { key: 'ALL', label: 'All Requests' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'REJECTED', label: 'Rejected' },
];

const BRANCHES = [
  { code: 'CSM', name: 'Computer Science & Machine Learning' },
  { code: 'CAI', name: 'Computer Science & Artificial Intelligence' },
  { code: 'CSD', name: 'Computer Science & Data Science' },
  { code: 'AIDS', name: 'Artificial Intelligence & Data Science' },
  { code: 'CSC', name: 'Cyber Security' },
];

const HOD_PERMISSION_OPTIONS = [
  { value: 'ALL', label: 'All Types' },
  { value: 'OUTPASS', label: 'Out-Pass' },
  { value: 'INTERNSHIP', label: 'Internship' },
  { value: 'MESS_FEE', label: 'Mess Fee' },
];

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

export default function HODBranchRequests() {
  const navigate = useNavigate();
  const { branchCode } = useParams();

  const selectedBranchCode = (branchCode || '').toUpperCase();
  const branch = BRANCHES.find((b) => b.code === selectedBranchCode) || {
    code: selectedBranchCode,
    name: `${selectedBranchCode} Department`
  };

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showExportModal, setShowExportModal] = useState(false);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const params = {
        branchCode: selectedBranchCode,
        ...(typeFilter !== 'ALL' && { type: typeFilter }),
        ...(search.trim() && { search: search.trim() }),
        ...(fromDate && { from: fromDate }),
        ...(toDate && { to: toDate }),
      };

      const res = await api.get('/outpass/all/for-me', { params });
      const rawData = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
      const data = rawData.filter((r) => r.requestType !== 'LIBRARY');
      setRequests(data);
    } catch (err) {
      console.error('HOD branch requests error:', err);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [selectedBranchCode, typeFilter, search, fromDate, toDate]);

  // Tab counts
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
  };

  const exportPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text(`${branch.name} (${branch.code}) - Permission Requests`, 14, 18);

      doc.setFontSize(10);
      let filterText = `Status: ${activeStatus} | Type: ${typeFilter}`;
      if (fromDate) filterText += ` | From: ${fromDate}`;
      if (toDate) filterText += ` | To: ${toDate}`;
      doc.text(filterText, 14, 26);

      const tableColumn = ['#', 'Student Name', 'Roll No', 'Year', 'Type', 'Status', 'Date Submitted'];
      const tableRows = requests.map((r, i) => [
        i + 1,
        r.studentId?.name || '-',
        r.studentId?.rollNo || '-',
        getOrdinalYear(r.year || r.studentId?.year),
        r.requestType === 'OUTPASS' ? 'Out-Pass' : r.requestType === 'MESS_FEE' ? 'Mess Fee' : r.requestType === 'INTERNSHIP' ? 'Internship' : 'Library',
        mapStatusToSimple(r.status),
        formatDate(r.createdAt)
      ]);

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 32,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [5, 150, 105] }
      });

      doc.save(`${branch.code}_Requests_Report.pdf`);
    } catch (e) {
      console.error(e);
    } finally {
      setShowExportModal(false);
    }
  };

  const exportCSV = () => {
    try {
      const exportData = requests.map((r, idx) => ({
        'S.No': idx + 1,
        'Reference ID': r.referenceId || 'N/A',
        'Student Name': r.studentId?.name || '-',
        'Roll Number': r.studentId?.rollNo || '-',
        'Year': getOrdinalYear(r.year || r.studentId?.year),
        'Student Type': getResidenceTypeLabel(r.studentId?.residenceType),
        'Permission Type': r.requestType,
        'Status': mapStatusToSimple(r.status),
        'Date': formatDate(r.createdAt)
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData.length > 0 ? exportData : [{ 'Note': 'No requests found' }]);
      
      const autoFit = (rows, minW = 16) => {
        if (!rows || !rows.length) return [];
        const keys = Object.keys(rows[0]);
        return keys.map((key) => {
          let max = key.toString().length;
          rows.forEach((r) => {
            const v = r[key] !== undefined && r[key] !== null ? r[key].toString() : '';
            if (v.length > max) max = v.length;
          });
          return { wch: Math.max(max + 6, minW) };
        });
      };

      worksheet['!cols'] = autoFit(exportData.length > 0 ? exportData : [{ 'Note': 'No requests found' }], 16);

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Requests');
      XLSX.writeFile(workbook, `${branch.code}_Requests_Report.xlsx`);
    } catch (e) {
      console.error(e);
    } finally {
      setShowExportModal(false);
    }
  };

  return (
    <DashboardLayout>
      <div style={{ padding: '0 4px' }}>
        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              type="button"
              onClick={() => navigate('/hod/branches')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 12px',
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                background: '#fff',
                color: '#475569',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <ArrowLeft size={16} /> Back to Branches
            </button>

            <div>
              <h1 className="page-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Building2 size={24} color="#059669" />
                <span>{branch.code} • All Requests</span>
              </h1>
              <p className="page-subtitle" style={{ margin: '3px 0 0', color: '#64748b', fontSize: 13 }}>
                {branch.name}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowExportModal(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}
          >
            <Download size={16} />
            Export Report
          </button>
        </div>

        {/* Status Tabs */}
        <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid #e2e8f0', marginBottom: 18, overflowX: 'auto' }}>
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
                  padding: '10px 16px',
                  borderRadius: '8px 8px 0 0',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                {tab.label} ({counts[tab.key] ?? 0})
              </button>
            );
          })}
        </div>

        {/* Filters Row */}
        <div className="card" style={{ marginBottom: 18, padding: 14 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            {/* Search */}
            <div style={{ position: 'relative', flex: '1 1 220px' }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search by student name or roll no..."
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

            {/* Custom Green Dropdown */}
            <FilterDropdown
              value={typeFilter}
              onChange={(val) => {
                setTypeFilter(val);
                setCurrentPage(1);
              }}
              options={PERMISSION_OPTIONS}
              style={{ flex: '0 0 160px' }}
            />

            {/* Date Range */}
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
                padding: '0 14px',
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                color: '#64748b',
                cursor: 'pointer'
              }}
            >
              Clear
            </button>
          </div>
        </div>

        {/* Table View */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <ZoomableTableWrapper>
            <table style={{ width: '100%', minWidth: 900, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  {['#', 'Student', 'Roll No', 'Year', 'Type', 'Submitted Date', 'Status', 'Action'].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: '12px 14px',
                        textAlign: 'left',
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#64748b',
                        textTransform: 'uppercase',
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
                      Loading {branch.code} requests...
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

                    const refId = r.referenceId || `KDP-${new Date(r.createdAt).getFullYear()}-${r._id.toString().slice(-6).toUpperCase()}`;

                    return (
                      <tr key={r._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 14px', fontSize: 13, color: '#64748b' }}>
                          {(currentPage - 1) * PAGE_SIZE + idx + 1}
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: 13, fontWeight: 700, color: '#1e293b', textTransform: 'uppercase' }}>
                          {r.studentId?.name || '—'}
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: 13, color: '#475569', fontFamily: 'monospace' }}>
                          {r.studentId?.rollNo || '-'}
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: 13, color: '#475569' }}>
                          {getOrdinalYear(r.year || r.studentId?.year)}
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: 13 }}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 600, color: '#1e293b' }}>
                              {r.requestType === 'OUTPASS' ? 'Out-Pass' : r.requestType === 'MESS_FEE' ? 'Mess Fee' : r.requestType === 'INTERNSHIP' ? 'Internship' : 'Library'}
                            </span>
                            <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>
                              {refId}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: 13, color: '#64748b' }}>
                          {formatDate(r.createdAt)}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '3px 9px',
                              borderRadius: 999,
                              fontSize: 11,
                              fontWeight: 700,
                              background: isAppr ? '#ecfdf5' : isRej ? '#fef2f2' : '#fff7ed',
                              color: isAppr ? '#059669' : isRej ? '#dc2626' : '#c2410c',
                              border: `1px solid ${isAppr ? '#a7f3d0' : isRej ? '#fecaca' : '#fed7aa'}`
                            }}
                          >
                            {statusCategory}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <button
                            type="button"
                            onClick={() => navigate(`/outpass/${r._id}`)}
                            style={{
                              height: 32,
                              padding: '0 12px',
                              border: '1px solid #d1fae5',
                              borderRadius: 50,
                              background: '#f0fdf4',
                              color: '#16a34a',
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: 12, color: '#64748b' }}>
                Showing {(currentPage - 1) * PAGE_SIZE + 1} - {Math.min(currentPage * PAGE_SIZE, requests.length)} of {requests.length}
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

        {/* Export Modal */}
        {showExportModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.6)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16
            }}
            onClick={() => setShowExportModal(false)}
          >
            <div
              style={{
                background: '#fff',
                borderRadius: 12,
                padding: 24,
                maxWidth: 400,
                width: '100%',
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ margin: '0 0 8px', fontSize: 16, color: '#1e293b' }}>Export {branch.code} Report</h3>
              <p style={{ margin: '0 0 20px', fontSize: 13, color: '#64748b' }}>
                Select format to download the filtered report data ({requests.length} requests).
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <button
                  type="button"
                  onClick={exportPDF}
                  style={{
                    padding: '14px',
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    background: '#f8fafc',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8,
                    color: '#dc2626',
                    fontWeight: 600,
                    fontSize: 13
                  }}
                >
                  <FileText size={24} />
                  <span>Download PDF</span>
                </button>

                <button
                  type="button"
                  onClick={exportCSV}
                  style={{
                    padding: '14px',
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    background: '#f8fafc',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8,
                    color: '#15803d',
                    fontWeight: 600,
                    fontSize: 13
                  }}
                >
                  <FileSpreadsheet size={24} />
                  <span>Download Excel</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
