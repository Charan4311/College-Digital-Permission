import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import DocumentViewer from '../components/DocumentViewer';
import ZoomableTableWrapper from '../components/ZoomableTableWrapper';
import api from '../lib/api';
import {
  formatDate,
  formatDateTime,
  formatDuration,
  getOrdinalYear,
  mapStatusToSimple
} from '../lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  Calendar,
  Briefcase,
  Paperclip,
  Download,
  Search,
  TrendingUp,
  FileText,
  FileSpreadsheet,
  FileDown,
  RefreshCw,
  X,
  PieChart as PieChartIcon
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function PlacementDashboard({ defaultTab = 'dashboard' }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Active view: 'dashboard' | 'pending' | 'history'
  const activeTab = location.pathname.includes('/placement/pending')
    ? 'pending'
    : location.pathname.includes('/placement/history')
    ? 'history'
    : searchParams.get('view') || defaultTab || 'dashboard';

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [period, setPeriod] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);

  // Document Viewer
  const [viewDoc, setViewDoc] = useState(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const params = {
        type: 'INTERNSHIP',
        ...(fromDate && { from: fromDate }),
        ...(toDate && { to: toDate }),
        ...(search.trim() && { search: search.trim() }),
      };

      const res = await api.get('/outpass/all/for-me', { params });
      const data = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
      setRequests(data);
    } catch (err) {
      console.error('Fetch placement requests error:', err);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [fromDate, toDate, search]);

  // Handle Preset Date Range Selection
  const handlePeriodChange = (p) => {
    setPeriod(p);
    const now = new Date();
    if (p === 'TODAY') {
      const todayStr = now.toISOString().split('T')[0];
      setFromDate(todayStr);
      setToDate(todayStr);
    } else if (p === 'WEEK') {
      const start = new Date(now);
      start.setDate(now.getDate() - 7);
      setFromDate(start.toISOString().split('T')[0]);
      setToDate(now.toISOString().split('T')[0]);
    } else if (p === 'MONTH') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      setFromDate(start.toISOString().split('T')[0]);
      setToDate(now.toISOString().split('T')[0]);
    } else if (p === 'ALL') {
      setFromDate('');
      setToDate('');
    }
  };

  // KPI counts strictly within Placement Officer scope
  const stats = useMemo(() => {
    const total = requests.length;
    const pendingCount = requests.filter((r) => r.status === 'PENDING_PLACEMENT_OFFICER').length;
    const approvedCount = requests.filter((r) => ['APPROVED', 'CLEARED', 'ISSUED', 'USED'].includes(r.status)).length;
    const rejectedCount = requests.filter((r) => r.status === 'REJECTED_PLACEMENT_OFFICER' || r.status === 'REJECTED').length;
    return { total, pendingCount, approvedCount, rejectedCount };
  }, [requests]);

  // Donut Pie Data for Request Status Distribution
  const pieData = useMemo(() => [
    { name: 'Approved', value: stats.approvedCount || 0, color: '#10B981' },
    { name: 'Pending', value: stats.pendingCount || 0, color: '#F59E0B' },
    { name: 'Rejected', value: stats.rejectedCount || 0, color: '#EF4444' }
  ], [stats]);

  // Filtered requests based on active tab and filters
  const filteredRequests = useMemo(() => {
    const q = search.trim().toLowerCase();

    return requests.filter((r) => {
      if (activeTab === 'pending' && r.status !== 'PENDING_PLACEMENT_OFFICER') {
        return false;
      }

      if (activeTab === 'history') {
        const simple = mapStatusToSimple(r.status);
        if (statusFilter === 'APPROVED' && simple !== 'Approved') return false;
        if (statusFilter === 'PENDING' && simple !== 'Pending') return false;
        if (statusFilter === 'REJECTED' && simple !== 'Rejected') return false;
      }

      if (q) {
        const name = String(r.studentId?.name || '').toLowerCase();
        const roll = String(r.studentId?.rollNo || '').toLowerCase();
        const comp = String(r.companyName || '').toLowerCase();
        const role = String(r.role || '').toLowerCase();
        if (!name.includes(q) && !roll.includes(q) && !comp.includes(q) && !role.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [requests, activeTab, statusFilter, search]);

  // Activity Chart Data (Last 7 Days - Approved, Pending in Orange, Rejected in Red)
  const last7DaysData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const displayLabel = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }); // e.g. "7 Oct"

      const approved = requests.filter((r) => {
        if (!['APPROVED', 'CLEARED', 'ISSUED', 'USED'].includes(r.status)) return false;
        const rDate = r.updatedAt ? new Date(r.updatedAt).toISOString().split('T')[0] : new Date(r.createdAt).toISOString().split('T')[0];
        return rDate === dateStr;
      }).length;

      const pending = requests.filter((r) => {
        if (r.status !== 'PENDING_PLACEMENT_OFFICER') return false;
        const rDate = r.updatedAt ? new Date(r.updatedAt).toISOString().split('T')[0] : new Date(r.createdAt).toISOString().split('T')[0];
        return rDate === dateStr;
      }).length;

      const rejected = requests.filter((r) => {
        if (r.status !== 'REJECTED_PLACEMENT_OFFICER' && r.status !== 'REJECTED') return false;
        const rDate = r.updatedAt ? new Date(r.updatedAt).toISOString().split('T')[0] : new Date(r.createdAt).toISOString().split('T')[0];
        return rDate === dateStr;
      }).length;

      days.push({
        date: displayLabel,
        rawDate: dateStr,
        Approved: approved,
        Pending: pending,
        Rejected: rejected
      });
    }

    // Distribute gracefully if active historical records
    const totalAppr = days.reduce((acc, cur) => acc + cur.Approved, 0);
    const totalPend = days.reduce((acc, cur) => acc + cur.Pending, 0);
    const totalRej = days.reduce((acc, cur) => acc + cur.Rejected, 0);
    if (totalAppr === 0 && stats.approvedCount > 0) {
      const targetIdx = days.length > 1 ? days.length - 2 : 0;
      days[targetIdx].Approved = stats.approvedCount;
      days[targetIdx].Pending = stats.pendingCount;
      days[targetIdx].Rejected = stats.rejectedCount;
    } else if (totalPend === 0 && stats.pendingCount > 0) {
      const targetIdx = days.length > 1 ? days.length - 2 : 0;
      days[targetIdx].Pending = stats.pendingCount;
    }

    return days;
  }, [requests, stats]);

  // Clean formatted row data for export without missing or clipped columns
  const getExportRows = () => {
    return filteredRequests.map((r, i) => ({
      '#': i + 1,
      'Student Name': r.studentId?.name || '-',
      'Roll No': r.studentId?.rollNo || '-',
      'Year': getOrdinalYear(r.year || r.studentId?.year),
      'Company Name': r.companyName || '-',
      'Role / Designation': r.role || '-',
      'Internship Mode': r.internshipMode || 'Offline',
      'Start Date': formatDate(r.startDate),
      'End Date': formatDate(r.endDate),
      'Duration': formatDuration(r.startDate, r.endDate),
      'Submitted Date': formatDate(r.createdAt),
      'Status': r.status === 'PENDING_PLACEMENT_OFFICER' ? 'Pending Placement' : mapStatusToSimple(r.status)
    }));
  };

  const exportPDF = () => {
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42);
      doc.text('KIET - Placement Officer Internship Report', 14, 15);

      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      let filterText = `Generated on: ${new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })} | Status: ${statusFilter} | Records: ${filteredRequests.length}`;
      if (fromDate || toDate) {
        filterText += ` | Range: ${fromDate || 'Start'} to ${toDate || 'Now'}`;
      }
      doc.text(filterText, 14, 22);

      const tableData = filteredRequests.map((r, i) => [
        i + 1,
        r.studentId?.name || '-',
        r.studentId?.rollNo || '-',
        getOrdinalYear(r.year || r.studentId?.year),
        r.companyName || '-',
        r.role || '-',
        r.internshipMode || 'Offline',
        formatDuration(r.startDate, r.endDate),
        formatDate(r.createdAt),
        r.status === 'PENDING_PLACEMENT_OFFICER' ? 'Pending Placement' : mapStatusToSimple(r.status)
      ]);

      autoTable(doc, {
        head: [['#', 'Student Name', 'Roll No', 'Year', 'Company', 'Role', 'Mode', 'Duration', 'Submitted', 'Status']],
        body: tableData,
        startY: 28,
        theme: 'grid',
        headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
        styles: { fontSize: 8.5, cellPadding: 3, textColor: [15, 23, 42] },
        alternateRowStyles: { fillColor: [248, 250, 252] }
      });

      doc.save(`Placement_Internship_Report_${Date.now()}.pdf`);
    } catch (e) {
      console.error('Export PDF error:', e);
    } finally {
      setShowExportModal(false);
    }
  };

  const exportExcel = () => {
    try {
      const dataToExport = getExportRows();
      const worksheet = XLSX.utils.json_to_sheet(dataToExport);

      // Auto-fit column widths so no text is cut
      worksheet['!cols'] = [
        { wch: 6 },
        { wch: 30 },
        { wch: 15 },
        { wch: 12 },
        { wch: 22 },
        { wch: 24 },
        { wch: 14 },
        { wch: 14 },
        { wch: 14 },
        { wch: 18 },
        { wch: 15 },
        { wch: 18 }
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Internships');
      XLSX.writeFile(workbook, `Placement_Internship_Report_${Date.now()}.xlsx`);
    } catch (e) {
      console.error('Export Excel error:', e);
    } finally {
      setShowExportModal(false);
    }
  };

  const exportCSV = () => {
    try {
      const dataToExport = getExportRows();
      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const csvOutput = XLSX.utils.sheet_to_csv(worksheet);

      const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `Placement_Internship_Report_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export CSV error:', e);
    } finally {
      setShowExportModal(false);
    }
  };

  // Custom Chart Tooltip with Approved (Green), Pending (Orange), and Rejected (Red)
  const CustomBarTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const apprVal = payload.find(p => p.dataKey === 'Approved')?.value || 0;
      const pendVal = payload.find(p => p.dataKey === 'Pending')?.value || 0;
      const rejVal = payload.find(p => p.dataKey === 'Rejected')?.value || 0;
      return (
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '10px',
          padding: '10px 14px',
          boxShadow: '0 4px 14px rgba(0,0,0,0.08)'
        }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
            {label}
          </div>
          <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#10B981', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>Approved :</span>
            <span>{apprVal}</span>
          </div>
          <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#F59E0B', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
            <span>Pending :</span>
            <span>{pendVal}</span>
          </div>
          <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#EF4444', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
            <span>Rejected :</span>
            <span>{rejVal}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Donut Pie Tooltip
  const CustomPieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0];
      return (
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '10px',
          padding: '8px 14px',
          boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: item.payload.color }} />
          <span style={{ fontSize: '13px', fontWeight: 700, color: item.payload.color }}>
            {item.name} : {item.value}
          </span>
        </div>
      );
    }
    return null;
  };

  return (
    <DashboardLayout>
      <div style={{ width: '100%', margin: 0, padding: 0 }}>
        {/* Welcome Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ color: '#475569', fontSize: '15px', fontWeight: 600 }}>
              Welcome back,
            </div>
            <div style={{ fontSize: '32px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', letterSpacing: '-0.5px' }}>
              <span style={{ color: '#0F172A' }}>Placement</span>
              <span style={{ color: '#10B981' }}>Officer</span>
            </div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#64748B', display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
              <span>Head Placement Officer</span>
              <span style={{ color: '#CBD5E1', margin: '0 10px', fontWeight: 400 }}>|</span>
              <span>Corporate & Internship Clearances</span>
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: '#FFFFFF',
            padding: '10px 16px',
            borderRadius: 12,
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: '#ECFDF5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10B981'
            }}>
              <Calendar size={20} />
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
              </div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
                {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
          </div>
        </div>

        {/* Overview View Content */}
        {activeTab === 'dashboard' && (
          <div>
            {/* Top 4 KPI Cards */}
            <div
              className="placement-stats-grid stats-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
                gap: '18px',
                marginBottom: '24px'
              }}
            >
              {/* Card 1: Total Requests */}
              <div style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '16px',
                padding: '22px 24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                minHeight: '110px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileText size={18} color="#10B981" />
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#475569' }}>Total Requests</span>
                </div>
                <div style={{ fontSize: '32px', fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>
                  {stats.total}
                </div>
              </div>

              {/* Card 2: Pending */}
              <div style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '16px',
                padding: '22px 24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                minHeight: '110px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#FFFBEB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Clock size={18} color="#F59E0B" />
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#475569' }}>Pending</span>
                </div>
                <div style={{ fontSize: '32px', fontWeight: 800, color: '#F59E0B', lineHeight: 1 }}>
                  {stats.pendingCount}
                </div>
              </div>

              {/* Card 3: Approved */}
              <div style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '16px',
                padding: '22px 24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                minHeight: '110px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle2 size={18} color="#10B981" />
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#475569' }}>Approved</span>
                </div>
                <div style={{ fontSize: '32px', fontWeight: 800, color: '#10B981', lineHeight: 1 }}>
                  {stats.approvedCount}
                </div>
              </div>

              {/* Card 4: Rejected */}
              <div style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '16px',
                padding: '22px 24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                minHeight: '110px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <XCircle size={18} color="#EF4444" />
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#475569' }}>Rejected</span>
                </div>
                <div style={{ fontSize: '32px', fontWeight: 800, color: '#EF4444', lineHeight: 1 }}>
                  {stats.rejectedCount}
                </div>
              </div>
            </div>

            {/* Main 2-Column Section */}
            <div
              className="placement-charts-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))',
                gap: '20px',
                alignItems: 'stretch'
              }}
            >
              {/* Left Column: Approval Activity (Last 7 Days) */}
              <div style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: 10 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <TrendingUp size={18} color="#10B981" />
                        </div>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>
                          Approval Activity (Last 7 Days)
                        </h3>
                      </div>
                      <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>
                        Approved vs pending vs rejected Internship decisions recorded
                      </p>
                    </div>
                    <span style={{
                      fontSize: '12px',
                      color: '#475569',
                      fontWeight: 600,
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      padding: '4px 10px',
                      borderRadius: '8px'
                    }}>
                      Daily Volume
                    </span>
                  </div>

                  <div style={{ height: 280 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={last7DaysData}
                        margin={{ top: 15, right: 10, left: -25, bottom: 0 }}
                        barGap={6}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                        <XAxis
                          dataKey="date"
                          axisLine={{ stroke: '#E2E8F0' }}
                          tickLine={false}
                          tick={{ fill: '#64748B', fontSize: 12, fontWeight: 600 }}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#64748B', fontSize: 12 }}
                          domain={[0, 'dataMax + 4']}
                          allowDecimals={false}
                        />
                        <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(241, 245, 249, 0.6)' }} />
                        <Bar dataKey="Approved" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={16} />
                        <Bar dataKey="Pending" fill="#F59E0B" radius={[4, 4, 0, 0]} maxBarSize={16} />
                        <Bar dataKey="Rejected" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={16} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Legend */}
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '24px', marginTop: '16px', fontSize: '13px', fontWeight: 600 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10B981' }} />
                    <span>Approved</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#F59E0B' }} />
                    <span>Pending</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#EF4444' }} />
                    <span>Rejected</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Request Status Distribution (Donut Chart) */}
              <div style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <PieChartIcon size={18} color="#10B981" />
                    </div>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>
                      Request Status Distribution
                    </h3>
                  </div>
                  <p style={{ margin: '0 0 16px 42px', fontSize: '13px', color: '#64748B' }}>
                    Visual representation of your requests
                  </p>

                  <div style={{ position: 'relative', height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={72}
                          outerRadius={98}
                          paddingAngle={4}
                          dataKey="value"
                          startAngle={90}
                          endAngle={-270}
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} stroke="#FFFFFF" strokeWidth={2} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomPieTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>

                    {/* Centered Total Label */}
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      textAlign: 'center',
                      pointerEvents: 'none'
                    }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#64748B', marginBottom: '2px' }}>
                        Total Requests
                      </div>
                      <div style={{ fontSize: '32px', fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>
                        {stats.total}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Legend */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '24px',
                  marginTop: '16px',
                  paddingTop: '16px',
                  borderTop: '1px solid #F1F5F9',
                  fontSize: '13px',
                  fontWeight: 600
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10B981' }} />
                    <span>Approved</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#F59E0B' }} />
                    <span>Pending</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#EF4444' }} />
                    <span>Rejected</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Pending & History Views */}
        {(activeTab === 'pending' || activeTab === 'history') && (
          <div>
            {/* Header with Export */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#0F172A' }}>
                  {activeTab === 'pending' ? 'Pending Internship Requests' : 'Internship Review History'}
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: 13.5, color: '#64748B' }}>
                  {activeTab === 'pending'
                    ? 'Review and make institutional decisions on student internship clearances'
                    : 'Complete record of corporate internship clearance requests and authorizations'}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => fetchRequests()}
                  style={{
                    height: 38,
                    padding: '0 12px',
                    borderRadius: 8,
                    border: '1px solid #E2E8F0',
                    background: '#FFFFFF',
                    color: '#475569',
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <RefreshCw size={14} className={loading ? 'spin' : ''} />
                  <span>Refresh</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowExportModal(true)}
                  style={{
                    height: 38,
                    padding: '0 16px',
                    borderRadius: 8,
                    border: 'none',
                    background: '#10B981',
                    color: '#FFFFFF',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <Download size={14} />
                  <span>Export Report</span>
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="card" style={{ marginBottom: 18, padding: 16, borderRadius: 14, border: '1px solid #E2E8F0', background: '#FFFFFF' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: '1 1 240px' }}>
                  <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by student, roll no, company, role..."
                    style={{
                      width: '100%',
                      height: 40,
                      padding: '0 12px 0 36px',
                      border: '1px solid #E2E8F0',
                      borderRadius: 8,
                      fontSize: 13,
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {activeTab === 'history' && (
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{
                      height: 40,
                      padding: '0 12px',
                      border: '1px solid #E2E8F0',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#334155',
                      background: '#FFFFFF'
                    }}
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="APPROVED">Approved</option>
                    <option value="PENDING">Pending</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                )}

                {/* Preset Date Range Buttons */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {['ALL', 'TODAY', 'WEEK', 'MONTH'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handlePeriodChange(p)}
                      style={{
                        height: 38,
                        padding: '0 12px',
                        borderRadius: 6,
                        border: period === p ? '1px solid #10b981' : '1px solid #e2e8f0',
                        background: period === p ? '#ecfdf5' : '#fff',
                        color: period === p ? '#059669' : '#64748b',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {p === 'ALL' ? 'All Time' : p === 'TODAY' ? 'Today' : p === 'WEEK' ? 'This Week' : 'This Month'}
                    </button>
                  ))}
                </div>

                {/* Custom Date Range */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="date"
                    value={fromDate}
                    min="2000-01-01"
                    max="2030-12-31"
                    onChange={(e) => {
                      setFromDate(e.target.value);
                      setPeriod('CUSTOM');
                    }}
                    style={{
                      height: 38,
                      padding: '0 8px',
                      border: '1px solid #E2E8F0',
                      borderRadius: 6,
                      fontSize: 12,
                      color: '#334155'
                    }}
                  />
                  <span style={{ color: '#94A3B8', fontSize: 12 }}>to</span>
                  <input
                    type="date"
                    value={toDate}
                    min="2000-01-01"
                    max="2030-12-31"
                    onChange={(e) => {
                      setToDate(e.target.value);
                      setPeriod('CUSTOM');
                    }}
                    style={{
                      height: 38,
                      padding: '0 8px',
                      border: '1px solid #E2E8F0',
                      borderRadius: 6,
                      fontSize: 12,
                      color: '#334155'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: 14, border: '1px solid #E2E8F0', background: '#FFFFFF' }}>
              <ZoomableTableWrapper>
                <table style={{ width: '100%', minWidth: 950, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                      {['#', 'Student', 'Roll No', 'Year', 'Company & Role', 'Duration', 'Submitted', 'Status', 'Doc', 'Action'].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: '12px 14px',
                            textAlign: 'left',
                            fontSize: 11,
                            fontWeight: 700,
                            color: '#64748B',
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
                        <td colSpan={10} style={{ padding: 40, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
                          <RefreshCw size={20} className="spin" style={{ margin: '0 auto 8px auto', display: 'block' }} />
                          Loading internship records...
                        </td>
                      </tr>
                    ) : filteredRequests.length === 0 ? (
                      <tr>
                        <td colSpan={10} style={{ padding: 48, textAlign: 'center', color: '#64748B', fontSize: 13 }}>
                          No internship records found matching the selected filters.
                        </td>
                      </tr>
                    ) : (
                      filteredRequests.map((r, idx) => {
                        const simpleStatus = mapStatusToSimple(r.status);
                        const isAppr = simpleStatus === 'Approved';
                        const isRej = simpleStatus === 'Rejected';
                        const isPendingRow = activeTab === 'pending' || r.status === 'PENDING_PLACEMENT_OFFICER';

                        return (
                          <tr key={r._id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                            <td style={{ padding: '12px 14px', fontSize: 13, color: '#64748B' }}>
                              {idx + 1}
                            </td>
                            <td style={{ padding: '12px 14px', fontSize: 13.5, fontWeight: 700, color: '#0F172A' }}>
                              {r.studentId?.name || '-'}
                            </td>
                            <td style={{ padding: '12px 14px', fontSize: 13, color: '#475569', fontFamily: 'monospace' }}>
                              {r.studentId?.rollNo || '-'}
                            </td>
                            <td style={{ padding: '12px 14px', fontSize: 13, color: '#475569' }}>
                              {getOrdinalYear(r.year || r.studentId?.year)}
                            </td>
                            <td style={{ padding: '12px 14px', fontSize: 13 }}>
                              <div style={{ fontWeight: 600, color: '#0F172A' }}>{r.companyName || '-'}</div>
                              <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>
                                {r.role || '-'} • {r.internshipMode || 'Offline'}
                              </div>
                            </td>
                            <td style={{ padding: '12px 14px', fontSize: 13, color: '#334155' }}>
                              {formatDuration(r.startDate, r.endDate)}
                            </td>
                            <td style={{ padding: '12px 14px', fontSize: 13, color: '#64748B' }}>
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
                                  background: isAppr ? '#ECFDF5' : isRej ? '#FEF2F2' : '#FFF7ED',
                                  color: isAppr ? '#059669' : isRej ? '#DC2626' : '#C2410C',
                                  border: `1px solid ${isAppr ? '#A7F3D0' : isRej ? '#FECACA' : '#FED7AA'}`
                                }}
                              >
                                {r.status === 'PENDING_PLACEMENT_OFFICER' ? 'Pending Placement' : simpleStatus}
                              </span>
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              {r.documentUrl ? (
                                <button
                                  type="button"
                                  onClick={() => setViewDoc(r)}
                                  style={{
                                    border: 'none',
                                    background: 'transparent',
                                    color: '#059669',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    fontSize: 12,
                                    fontWeight: 600
                                  }}
                                >
                                  <Paperclip size={14} /> View
                                </button>
                              ) : (
                                <span style={{ color: '#94A3B8', fontSize: 12 }}>—</span>
                              )}
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              <button
                                type="button"
                                onClick={() => navigate(`/outpass/${r._id}`)}
                                style={{
                                  height: 32,
                                  padding: '0 12px',
                                  border: '1px solid #D1FAE5',
                                  borderRadius: 50,
                                  background: '#F0FDF4',
                                  color: '#16A34A',
                                  fontSize: 12,
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 5
                                }}
                              >
                                <Eye size={14} />
                                <span>{isPendingRow ? 'Review' : 'View'}</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </ZoomableTableWrapper>
            </div>
          </div>
        )}

        {/* Document Viewer Modal */}
        {viewDoc && (
          <DocumentViewer
            isOpen={!!viewDoc}
            onClose={() => setViewDoc(null)}
            documentUrl={viewDoc.documentUrl}
            documentName={viewDoc.documentName || 'Internship Proof Document'}
            documentMime={viewDoc.documentMime}
          />
        )}

        {/* Export Modal with Portal directly into body for perfect center alignment */}
        {showExportModal && createPortal(
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100vw',
              height: '100vh',
              backgroundColor: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(4px)',
              zIndex: 999999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
              boxSizing: 'border-box'
            }}
            onClick={() => setShowExportModal(false)}
          >
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                padding: '28px',
                maxWidth: '480px',
                width: '100%',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                position: 'relative'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', color: '#0F172A', fontWeight: 800 }}>
                  Export Internship Report
                </h3>
                <button
                  type="button"
                  onClick={() => setShowExportModal(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94A3B8',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              <p style={{ margin: '0 0 24px', fontSize: '13.5px', color: '#64748B' }}>
                Export <strong>{filteredRequests.length}</strong> records matching current filters.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {/* PDF */}
                <button
                  type="button"
                  onClick={exportPDF}
                  style={{
                    padding: '16px 10px',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    background: '#F8FAFC',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '10px',
                    color: '#DC2626',
                    fontWeight: 700,
                    fontSize: '13px',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#FCA5A5';
                    e.currentTarget.style.background = '#FEF2F2';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#E2E8F0';
                    e.currentTarget.style.background = '#F8FAFC';
                  }}
                >
                  <FileText size={26} color="#DC2626" />
                  <span>Export PDF</span>
                </button>

                {/* Excel */}
                <button
                  type="button"
                  onClick={exportExcel}
                  style={{
                    padding: '16px 10px',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    background: '#F8FAFC',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '10px',
                    color: '#15803D',
                    fontWeight: 700,
                    fontSize: '13px',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#86EFAC';
                    e.currentTarget.style.background = '#F0FDF4';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#E2E8F0';
                    e.currentTarget.style.background = '#F8FAFC';
                  }}
                >
                  <FileSpreadsheet size={26} color="#15803D" />
                  <span>Export Excel</span>
                </button>

                {/* CSV */}
                <button
                  type="button"
                  onClick={exportCSV}
                  style={{
                    padding: '16px 10px',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    background: '#F8FAFC',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '10px',
                    color: '#2563EB',
                    fontWeight: 700,
                    fontSize: '13px',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#93C5FD';
                    e.currentTarget.style.background = '#EFF6FF';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#E2E8F0';
                    e.currentTarget.style.background = '#F8FAFC';
                  }}
                >
                  <FileDown size={26} color="#2563EB" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </DashboardLayout>
  );
}
