import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import api from '../../lib/api';
import {
  ShieldCheck,
  Calendar,
  Share2,
  FileText,
  ChevronsUpDown,
  Shield,
  CheckCircle2,
  Download
} from 'lucide-react';

export default function AdminRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [exporting, setExporting] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedYear) params.append('year', selectedYear);
      if (selectedBranch) params.append('branch', selectedBranch);
      if (selectedType && selectedType !== 'all') params.append('requestType', selectedType);
      if (selectedStatus && selectedStatus !== 'all') params.append('status', selectedStatus);

      const res = await api.get(`/admin/requests?${params.toString()}`);
      if (res.data.success) {
        setRequests(res.data.data || []);
      }
    } catch (e) {
      console.error('Error fetching admin requests:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [selectedYear, selectedBranch, selectedType, selectedStatus]);

  // Status classification helpers (defined here so filteredRequests can use them)
  const _APPROVED_LIST = ['APPROVED', 'CLEARED', 'ISSUED', 'USED'];
  const _PENDING_LIST = ['PENDING_CTPO', 'PENDING_HOD', 'PENDING_HOSTEL_INCHARGE', 'PENDING_PLACEMENT_OFFICER'];

  // Client-side fallback filter for instant reactivity
  const filteredRequests = requests.filter(req => {
    // Year filter
    if (selectedYear && selectedYear !== '') {
      const y = req.year || req.studentId?.year;
      if (String(y) !== String(selectedYear)) return false;
    }

    // Branch filter
    if (selectedBranch && selectedBranch !== '') {
      const branchCode = req.branchId?.code || req.studentId?.branchId?.code;
      const branchName = req.branchId?.name || req.studentId?.branchId?.name;
      const target = selectedBranch.toUpperCase();
      const codeMap = { CSM: '42', CAI: '43', CSD: '44', AIDS: '45', CSC: '46' };
      const isMatch = branchCode === target || branchName === target || branchCode === codeMap[target];
      if (!isMatch) return false;
    }

    // Type filter
    if (selectedType && selectedType !== 'all') {
      if (req.requestType?.toUpperCase() !== selectedType.toUpperCase()) return false;
    }

    // Status filter — inline check to avoid temporal dead zone crash
    if (selectedStatus && selectedStatus !== 'all') {
      const s = (req.status || '').toUpperCase();
      if (selectedStatus === 'APPROVED' && !_APPROVED_LIST.includes(s)) return false;
      if (selectedStatus === 'PENDING' && !_PENDING_LIST.includes(s)) return false;
      if (selectedStatus === 'REJECTED' && !s.startsWith('REJECTED') && s !== 'CANCELLED') return false;
    }

    return true;
  });

  const handleExport = async () => {
    try {
      setExporting(true);
      const params = new URLSearchParams();
      if (selectedYear) params.append('year', selectedYear);
      if (selectedBranch) params.append('branch', selectedBranch);
      if (selectedType && selectedType !== 'all') params.append('requestType', selectedType);
      if (selectedStatus && selectedStatus !== 'all') params.append('status', selectedStatus);

      const res = await api.get(`/admin/requests/export?${params.toString()}`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Filtered_Permission_Requests_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export error:', e);
      alert('Failed to export requests. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const getBranchLabel = (req) => {
    const code = req.branchId?.code || req.studentId?.branchId?.code;
    const name = req.branchId?.name || req.studentId?.branchId?.name;
    if (code === '42' || name === 'CSM') return 'CSM';
    if (code === '43' || name === 'CAI') return 'CAI';
    if (code === '44' || name === 'CSD') return 'CSD';
    if (code === '45' || name === 'AIDS') return 'AIDS';
    if (code === '46' || name === 'CSC') return 'CSC';
    return name || code || 'CSM';
  };

  const getYearLabel = (req) => {
    const y = req.year || req.studentId?.year || 4;
    if (y === 2) return '2nd year';
    if (y === 3) return '3rd year';
    if (y === 4) return '4th year';
    return `${y}th year`;
  };

  const getTypeLabel = (type) => {
    if (!type) return 'Outpass';
    switch (type.toUpperCase()) {
      case 'OUTPASS': return 'Outpass';
      case 'MESS_FEE': return 'Mess fee';
      case 'INTERNSHIP': return 'Internship';
      case 'LIBRARY': return 'Library';
      default: return type;
    }
  };

  const getStatusBadge = (status) => {
    if (!status) return { label: 'Pending', bg: '#fef3c7', color: '#b45309' };
    const s = status.toUpperCase();
    if (['APPROVED', 'CLEARED', 'ISSUED', 'USED'].includes(s)) {
      return { label: 'Approved', bg: '#dcfce7', color: '#15803d' };
    }
    if (s.startsWith('REJECTED') || s === 'CANCELLED') {
      return { label: 'Rejected', bg: '#fee2e2', color: '#b91c1c' };
    }
    return { label: 'Pending', bg: '#fef3c7', color: '#b45309' };
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Sep 26, 2025';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <DashboardLayout>
      {/* Top Header */}
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: '#eff6ff',
            border: '1px solid #dbeafe',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#2563eb'
          }}>
            <Shield size={22} />
          </div>
          <div>
            <h1 className="page-title" style={{ fontSize: '24px', fontWeight: 700, margin: 0, color: '#0f172a' }}>
              Permission Requests
            </h1>
            <p className="page-subtitle" style={{ fontSize: '13px', color: '#64748b', margin: '2px 0 0' }}>
              All recent requests across years, branches and types.
            </p>
          </div>
        </div>
      </div>

      {/* Filter Card */}
      <div className="card" style={{
        marginBottom: '24px',
        padding: '20px 24px',
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)'
      }}>
        <div className="admin-filter-bar">
          {/* Select year */}
          <div className="form-group admin-filter-group">
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#475569',
              marginBottom: '8px'
            }}>
              <Calendar size={16} color="#3b82f6" />
              <span>Select year</span>
            </label>
            <select
              className="form-input form-select"
              style={{
                width: '100%',
                height: '42px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                padding: '0 14px',
                fontSize: '14px',
                fontWeight: 500,
                color: '#0f172a',
                background: '#ffffff',
                cursor: 'pointer'
              }}
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
            >
              <option value="">All years</option>
              <option value="2">2nd year</option>
              <option value="3">3rd year</option>
              <option value="4">4th year</option>
            </select>
          </div>

          {/* Select branch */}
          <div className="form-group admin-filter-group">
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#475569',
              marginBottom: '8px'
            }}>
              <Share2 size={16} color="#3b82f6" />
              <span>Select branch</span>
            </label>
            <select
              className="form-input form-select"
              style={{
                width: '100%',
                height: '42px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                padding: '0 14px',
                fontSize: '14px',
                fontWeight: 500,
                color: '#0f172a',
                background: '#ffffff',
                cursor: 'pointer'
              }}
              value={selectedBranch}
              onChange={e => setSelectedBranch(e.target.value)}
            >
              <option value="">All branches</option>
              <option value="CSM">CSM</option>
              <option value="CAI">CAI</option>
              <option value="CSD">CSD</option>
              <option value="AIDS">AIDS</option>
              <option value="CSC">CSC</option>
            </select>
          </div>

          {/* Select permission type */}
          <div className="form-group admin-filter-group">
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#475569',
              marginBottom: '8px'
            }}>
              <FileText size={16} color="#3b82f6" />
              <span>Select permission type</span>
            </label>
            <select
              className="form-input form-select"
              style={{
                width: '100%',
                height: '42px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                padding: '0 14px',
                fontSize: '14px',
                fontWeight: 500,
                color: '#0f172a',
                background: '#ffffff',
                cursor: 'pointer'
              }}
              value={selectedType}
              onChange={e => setSelectedType(e.target.value)}
            >
              <option value="all">All requests</option>
              <option value="OUTPASS">Outpass</option>
              <option value="MESS_FEE">Mess fee</option>
              <option value="INTERNSHIP">Internship</option>
              <option value="LIBRARY">Library</option>
            </select>
          </div>

          {/* Select status */}
          <div className="form-group admin-filter-group">
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#475569',
              marginBottom: '8px'
            }}>
              <CheckCircle2 size={16} color="#3b82f6" />
              <span>Select status</span>
            </label>
            <select
              className="form-input form-select"
              style={{
                width: '100%',
                height: '42px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                padding: '0 14px',
                fontSize: '14px',
                fontWeight: 500,
                color: '#0f172a',
                background: '#ffffff',
                cursor: 'pointer'
              }}
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
            >
              <option value="all">All status</option>
              <option value="APPROVED">Approved</option>
              <option value="PENDING">Pending</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          {/* Export Button */}
          <div className="admin-filter-action" style={{ marginBottom: 0 }}>
            <button
              onClick={handleExport}
              disabled={exporting}
              style={{
                height: '42px',
                padding: '0 20px',
                borderRadius: '10px',
                border: '1px solid #2563eb',
                background: '#ffffff',
                color: '#2563eb',
                fontSize: '14px',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: exporting ? 'not-allowed' : 'pointer',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                transition: 'all 0.15s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = '#eff6ff';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = '#ffffff';
              }}
            >
              <Download size={16} color="#2563eb" />
              <span>{exporting ? 'Exporting...' : 'Export'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Permission Requests Data Card */}
      <div className="card" style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
        overflow: 'hidden'
      }}>
        {/* Table Inner Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: '#eff6ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#2563eb'
          }}>
            <ShieldCheck size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#0f172a' }}>
              Permission Requests
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '2px 0 0' }}>
              {filteredRequests.length} requests found
            </p>
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="loading-screen" style={{ padding: '60px 0' }}>
            <div className="spinner spinner-lg" />
          </div>
        ) : (
          <div className="table-wrapper" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      Roll number <ChevronsUpDown size={14} color="#94a3b8" />
                    </div>
                  </th>
                  <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      Name <ChevronsUpDown size={14} color="#94a3b8" />
                    </div>
                  </th>
                  <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      Branch <ChevronsUpDown size={14} color="#94a3b8" />
                    </div>
                  </th>
                  <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      Year <ChevronsUpDown size={14} color="#94a3b8" />
                    </div>
                  </th>
                  <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      Type <ChevronsUpDown size={14} color="#94a3b8" />
                    </div>
                  </th>
                  <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      Status <ChevronsUpDown size={14} color="#94a3b8" />
                    </div>
                  </th>
                  <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      Requested on <ChevronsUpDown size={14} color="#94a3b8" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '48px 20px', color: '#94a3b8', fontSize: '14px' }}>
                      No permission requests found for the selected filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((req) => {
                    const badge = getStatusBadge(req.status);
                    return (
                      <tr key={req._id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}>
                        <td style={{ padding: '16px 20px', fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
                          {req.studentId?.rollNo || '21KT1A0501'}
                        </td>
                        <td style={{ padding: '16px 20px', fontSize: '14px', fontWeight: 500, color: '#334155' }}>
                          {req.studentId?.name || 'S. Kavya'}
                        </td>
                        <td style={{ padding: '16px 20px', fontSize: '14px', fontWeight: 600, color: '#475569' }}>
                          {getBranchLabel(req)}
                        </td>
                        <td style={{ padding: '16px 20px', fontSize: '14px', color: '#475569' }}>
                          {getYearLabel(req)}
                        </td>
                        <td style={{ padding: '16px 20px', fontSize: '14px', fontWeight: 500, color: '#334155' }}>
                          {getTypeLabel(req.requestType)}
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <span style={{
                            display: 'inline-block',
                            background: badge.bg,
                            color: badge.color,
                            padding: '4px 12px',
                            borderRadius: '9999px',
                            fontSize: '12px',
                            fontWeight: 600
                          }}>
                            {badge.label}
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px', fontSize: '14px', color: '#64748b' }}>
                          {formatDate(req.createdAt || req.requestDate)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
