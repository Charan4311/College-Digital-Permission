import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import api from '../../lib/api';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import {
  GraduationCap,
  FileText,
  Clock,
  QrCode,
  CheckCircle2,
  BarChart3,
  Sparkles,
  Layers,
  Calendar
} from 'lucide-react';

const STATUS_LABELS = {
  PENDING_CTPO: 'Pending CTPO',
  PENDING_HOD: 'Pending HOD',
  PENDING_HOSTEL_INCHARGE: 'Pending Hostel',
  ISSUED: 'Issued',
  USED: 'Used',
  REJECTED_CTPO: 'Rejected (CTPO)',
  REJECTED_HOD: 'Rejected (HOD)',
  REJECTED_HOSTEL_INCHARGE: 'Rejected (Hostel)',
};

const STATUS_COLORS = {
  PENDING_CTPO: '#f59e0b',
  PENDING_HOD: '#f59e0b',
  PENDING_HOSTEL_INCHARGE: '#f59e0b',
  ISSUED: 'var(--purple)',
  USED: '#10b981',
  REJECTED_CTPO: '#ef4444',
  REJECTED_HOD: '#ef4444',
  REJECTED_HOSTEL_INCHARGE: '#ef4444',
};

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    try {
      const res = await api.get('/admin/overview');
      setData(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch();
    const interval = setInterval(fetch, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return (
    <DashboardLayout>
      <div className="loading-screen"><div className="spinner spinner-lg" /></div>
    </DashboardLayout>
  );

  const byStageData = data?.byStage
    ? Object.entries(data.byStage).map(([status, count]) => ({
        name: STATUS_LABELS[status] || status,
        count,
        fill: STATUS_COLORS[status] || '#64748b'
      }))
    : [];

  const dailyData = (data?.dailyRequests || []).map(d => ({
    date: d._id.slice(5), // MM-DD
    requests: d.count
  }));

  const totalRequests = byStageData.reduce((sum, s) => sum + s.count, 0);
  const pendingTotal = Object.entries(data?.byStage || {})
    .filter(([s]) => s.startsWith('PENDING'))
    .reduce((sum, [, v]) => sum + v, 0);
  const issuedCount = data?.byStage?.ISSUED || 0;
  const usedCount = data?.byStage?.USED || 0;

  return (
    <DashboardLayout>
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <BarChart3 size={26} color="var(--accent)" />
          <span>System Overview & Analytics</span>
        </h1>
        <p className="page-subtitle">Real-time live campus telemetry — auto-synchronizes every 10 seconds</p>
      </div>

      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ color: 'var(--accent)' }}>
            <GraduationCap size={24} />
          </div>
          <div className="stat-label">Total Students Enrolled</div>
          <div className="stat-value">{data?.totalStudents ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ color: 'var(--purple)' }}>
            <FileText size={24} />
          </div>
          <div className="stat-label">Requests Today</div>
          <div className="stat-value" style={{ color: 'var(--accent)' }}>{data?.totalRequestsToday ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ color: 'var(--yellow)' }}>
            <Clock size={24} />
          </div>
          <div className="stat-label">Total Pending in Flow</div>
          <div className="stat-value" style={{ color: 'var(--yellow)' }}>{pendingTotal}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ color: '#2563eb' }}>
            <QrCode size={24} />
          </div>
          <div className="stat-label">Active Passes Issued</div>
          <div className="stat-value" style={{ color: '#2563eb' }}>{issuedCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ color: 'var(--green)' }}>
            <CheckCircle2 size={24} />
          </div>
          <div className="stat-label">Used / Gate Scanned</div>
          <div className="stat-value" style={{ color: 'var(--green)' }}>{usedCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ color: 'var(--text-secondary)' }}>
            <Layers size={24} />
          </div>
          <div className="stat-label">All-Time Requests</div>
          <div className="stat-value">{totalRequests}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[24px]">
        {/* Stage bar chart */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <BarChart3 size={18} color="var(--accent)" />
            <div className="card-title" style={{ margin: 0, fontSize: '15px' }}>Out-Pass Volume by Stage</div>
          </div>
          {byStageData.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-desc">No requests recorded yet in the database.</div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byStageData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} width={120} />
                <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8 }} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {byStageData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Daily line chart */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Calendar size={18} color="var(--purple)" />
            <div className="card-title" style={{ margin: 0, fontSize: '15px' }}>Request Trends (Last 14 Days)</div>
          </div>
          {dailyData.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-desc">No trend data logged yet.</div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8 }} />
                <Line type="monotone" dataKey="requests" stroke="var(--accent)" strokeWidth={2} dot={{ fill: 'var(--accent)', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
