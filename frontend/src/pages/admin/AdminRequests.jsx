import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import api from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import {
  LuShieldCheck as ShieldCheck,
  LuCalendar as Calendar,
  LuShare2 as Share2,
  LuFileText as FileText,
  LuChevronsUpDown as ChevronsUpDown,
  LuShield as Shield,
  LuCircleCheck as CheckCircle2,
  LuDownload as Download
} from 'react-icons/lu';

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
            <Select value={selectedYear || 'ALL'} onValueChange={value => setSelectedYear(value === 'ALL' ? '' : value)}>
              <SelectTrigger className="h-[42px] w-full"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="ALL">All years</SelectItem><SelectItem value="2">2nd year</SelectItem><SelectItem value="3">3rd year</SelectItem><SelectItem value="4">4th year</SelectItem></SelectContent>
            </Select>
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
            <Select value={selectedBranch || 'ALL'} onValueChange={value => setSelectedBranch(value === 'ALL' ? '' : value)}>
              <SelectTrigger className="h-[42px] w-full"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="ALL">All branches</SelectItem><SelectItem value="CSM">CSM</SelectItem><SelectItem value="CAI">CAI</SelectItem><SelectItem value="CSD">CSD</SelectItem><SelectItem value="AIDS">AIDS</SelectItem><SelectItem value="CSC">CSC</SelectItem></SelectContent>
            </Select>
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
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="h-[42px] w-full"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All requests</SelectItem><SelectItem value="OUTPASS">Outpass</SelectItem><SelectItem value="MESS_FEE">Mess fee</SelectItem><SelectItem value="INTERNSHIP">Internship</SelectItem><SelectItem value="LIBRARY">Library</SelectItem></SelectContent>
            </Select>
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
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="h-[42px] w-full"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All status</SelectItem><SelectItem value="APPROVED">Approved</SelectItem><SelectItem value="PENDING">Pending</SelectItem><SelectItem value="REJECTED">Rejected</SelectItem></SelectContent>
            </Select>
          </div>

          {/* Export Button */}
          <div className="admin-filter-action" style={{ marginBottom: 0 }}>
            <Button
              onClick={handleExport}
              disabled={exporting}
              variant="outline"
              className="h-10 border-blue-200 bg-white text-blue-600 hover:bg-blue-50"
            >
              <Download size={16} color="#2563eb" />
              <span>{exporting ? 'Exporting...' : 'Export'}</span>
            </Button>
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
            <Table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <TableHeader>
                <TableRow style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <TableHead style={{ padding: '14px 20px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      Roll number <ChevronsUpDown size={14} color="#94a3b8" />
                    </div>
                  </TableHead>
                  <TableHead style={{ padding: '14px 20px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      Name <ChevronsUpDown size={14} color="#94a3b8" />
                    </div>
                  </TableHead>
                  <TableHead style={{ padding: '14px 20px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      Branch <ChevronsUpDown size={14} color="#94a3b8" />
                    </div>
                  </TableHead>
                  <TableHead style={{ padding: '14px 20px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      Year <ChevronsUpDown size={14} color="#94a3b8" />
                    </div>
                  </TableHead>
                  <TableHead style={{ padding: '14px 20px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      Type <ChevronsUpDown size={14} color="#94a3b8" />
                    </div>
                  </TableHead>
                  <TableHead style={{ padding: '14px 20px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      Status <ChevronsUpDown size={14} color="#94a3b8" />
                    </div>
                  </TableHead>
                  <TableHead style={{ padding: '14px 20px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      Requested on <ChevronsUpDown size={14} color="#94a3b8" />
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan="7" style={{ textAlign: 'center', padding: '48px 20px', color: '#94a3b8', fontSize: '14px' }}>
                      No permission requests found for the selected filter criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRequests.map((req) => {
                    const badge = getStatusBadge(req.status);
                    return (
                      <TableRow key={req._id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}>
                        <TableCell style={{ padding: '16px 20px', fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
                          {req.studentId?.rollNo || '21KT1A0501'}
                        </TableCell>
                        <TableCell style={{ padding: '16px 20px', fontSize: '14px', fontWeight: 500, color: '#334155' }}>
                          {req.studentId?.name || 'S. Kavya'}
                        </TableCell>
                        <TableCell style={{ padding: '16px 20px', fontSize: '14px', fontWeight: 600, color: '#475569' }}>
                          {getBranchLabel(req)}
                        </TableCell>
                        <TableCell style={{ padding: '16px 20px', fontSize: '14px', color: '#475569' }}>
                          {getYearLabel(req)}
                        </TableCell>
                        <TableCell style={{ padding: '16px 20px', fontSize: '14px', fontWeight: 500, color: '#334155' }}>
                          {getTypeLabel(req.requestType)}
                        </TableCell>
                        <TableCell style={{ padding: '16px 20px' }}>
                          <Badge variant={badge.label === 'Approved' ? 'success' : badge.label === 'Rejected' ? 'destructive' : 'secondary'} className="text-[11px] font-semibold px-2.5 py-1 rounded-full">
                            {badge.label}
                          </Badge>
                        </TableCell>
                        <TableCell style={{ padding: '16px 20px', fontSize: '14px', color: '#64748b' }}>
                          {formatDate(req.createdAt || req.requestDate)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
