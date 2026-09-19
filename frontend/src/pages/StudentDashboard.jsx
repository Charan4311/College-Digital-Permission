import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import api from '../lib/api';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis
} from 'recharts';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    rejected: 0,
    pending: 0,
    entries: [],
    monthlyOverview: []
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const res = await api.get('/outpass/mine');
      const requests = res.data.data || [];

      const total = requests.length;
      const approved = requests.filter((r) => ['APPROVED', 'CLEARED', 'ISSUED', 'USED'].includes(r.status)).length;
      const rejected = requests.filter((r) => r.status?.startsWith('REJECTED')).length;
      const pending = requests.filter((r) => r.status?.startsWith('PENDING')).length;

      const byMonth = {};
      requests.forEach((req) => {
        const date = new Date(req.createdAt || Date.now());
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        byMonth[key] = (byMonth[key] || 0) + 1;
      });

      const entries = Object.entries(byMonth)
        .map(([key, count]) => ({
          month: new Date(`${key}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
          count
        }))
        .sort((a, b) => new Date(`2025 ${a.month}`) - new Date(`2025 ${b.month}`));

      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthlyOverview = monthNames.map((month, index) => {
        const monthRequests = requests.filter((req) => {
          const date = new Date(req.createdAt || Date.now());
          return date.getMonth() === index;
        });

        const approvedCount = monthRequests.filter((r) => ['APPROVED', 'CLEARED', 'ISSUED', 'USED'].includes(r.status)).length;
        const rejectedCount = monthRequests.filter((r) => r.status?.startsWith('REJECTED')).length;
        const pendingCount = monthRequests.filter((r) => r.status?.startsWith('PENDING')).length;

        return {
          month,
          total: monthRequests.length,
          approved: approvedCount,
          rejected: rejectedCount,
          pending: pendingCount
        };
      });

      setStats({ total, approved, rejected, pending, entries, monthlyOverview });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 15000);
    return () => clearInterval(interval);
  }, []);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const pieData = [
    { name: 'Approved', value: stats.approved, color: '#10b981' },
    { name: 'Rejected', value: stats.rejected, color: '#ef4444' },
    { name: 'Pending', value: stats.pending, color: '#f59e0b' }
  ];

  const monthlyOverview = stats.monthlyOverview?.length ? stats.monthlyOverview : monthNames.map((month) => ({ month, total: 0, approved: 0, rejected: 0, pending: 0 }));

  return (
    <DashboardLayout>
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <GraduationCap size={28} color="var(--accent)" />
              <span>Dashboard</span>
            </h1>
            <p className="page-subtitle">Leave / permission overview for {user?.name || 'student'}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-screen"><div className="spinner spinner-lg" /></div>
      ) : (
        <>
          <div className="stats-grid" style={{ marginBottom: '24px' }}>
            <div className="stat-card">
              <div className="stat-icon" style={{ color: 'var(--accent)' }}>
                <FileText size={22} />
              </div>
              <div className="stat-label">Total Leaves</div>
              <div className="stat-value">{stats.total}</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ color: 'var(--green)' }}>
                <CheckCircle2 size={22} />
              </div>
              <div className="stat-label">Approved Leaves</div>
              <div className="stat-value" style={{ color: 'var(--green)' }}>{stats.approved}</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ color: 'var(--red)' }}>
                <AlertCircle size={22} />
              </div>
              <div className="stat-label">Rejected Leaves</div>
              <div className="stat-value" style={{ color: 'var(--red)' }}>{stats.rejected}</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ color: 'var(--yellow)' }}>
                <Clock size={22} />
              </div>
              <div className="stat-label">Pending Leaves</div>
              <div className="stat-value" style={{ color: 'var(--yellow)' }}>{stats.pending}</div>
            </div>
          </div>

          <div className="dashboard-chart-grid" style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '24px', alignItems: 'stretch' }}>
            <div className="card dashboard-chart-card">
              <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: 0 }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                  <BarChart3 size={18} />
                </div>
                <div>
                  <div className="card-title">Leave Overview</div>
                  <div className="card-subtitle">Total, Approved, Rejected, Pending</div>
                </div>
              </div>
              <div className="dashboard-chart-surface" style={{ width: '100%', height: '260px', minWidth: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyOverview} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} minTickGap={8} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="total" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="approved" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="rejected" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="pending" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '18px', flexWrap: 'wrap', marginTop: '8px', paddingBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />
                  <span>Total</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                  <span>Approved</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
                  <span>Rejected</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
                  <span>Pending</span>
                </div>
              </div>
            </div>

            <div className="card dashboard-chart-card">
              <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: 0 }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                  <TrendingUp size={18} />
                </div>
                <div>
                  <div className="card-title">Leave Status Chart</div>
                  <div className="card-subtitle">Approved vs Rejected vs Pending</div>
                </div>
              </div>
              <div className="dashboard-chart-surface" style={{ width: '100%', height: '220px', minWidth: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={78} paddingAngle={3}>
                      {pieData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '18px', flexWrap: 'wrap', marginTop: '8px' }}>
                {pieData.map((entry) => (
                  <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: entry.color, display: 'inline-block' }} />
                    <span>{entry.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
