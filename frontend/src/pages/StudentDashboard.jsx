import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import api from '../lib/api';
import {
  FaSchool,
  FaCalendarDays,
  FaChevronDown,
  FaFileLines,
  FaCircleCheck,
  FaClock,
  FaCircleXmark,
  FaChartColumn,
  FaChartPie,
  FaArrowTrendUp
} from 'react-icons/fa6';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  AreaChart,
  Area,
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
  const [chartYear, setChartYear] = useState('This Year');

  const fetchStats = async () => {
    try {
      const res = await api.get('/outpass/mine');
      const requests = res.data.data || [];

      const total = requests.length;
      const approved = requests.filter((r) => ['APPROVED', 'CLEARED', 'ISSUED', 'USED'].includes(r.status)).length;
      const rejected = requests.filter((r) => r.status?.startsWith('REJECTED')).length;
      const pending = requests.filter((r) => r.status?.startsWith('PENDING')).length;

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

      setStats({ total, approved, rejected, pending, entries: [], monthlyOverview });
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

  const statCards = [
    {
      label: 'Total Requests',
      value: stats.total,
      icon: FaFileLines,
      bg: '#f3e8ff',
      color: '#6D28D9',
      textColor: '#6D28D9',
      note: '100% of total requests',
      noteColor: '#64748b'
    },
    {
      label: 'Approved',
      value: stats.approved,
      icon: FaCircleCheck,
      bg: '#dcfce7',
      color: '#16a34a',
      textColor: '#16a34a',
      note: stats.total ? `${((stats.approved / stats.total) * 100).toFixed(2)}% of total requests` : '0% of total requests',
      noteColor: '#16a34a'
    },
    {
      label: 'Pending',
      value: stats.pending,
      icon: FaClock,
      bg: '#ffedd5',
      color: '#f59e0b',
      textColor: '#d97706',
      note: stats.total ? `${((stats.pending / stats.total) * 100).toFixed(2)}% of total requests` : '0% of total requests',
      noteColor: '#d97706'
    },
    {
      label: 'Rejected',
      value: stats.rejected,
      icon: FaCircleXmark,
      bg: '#fee2e2',
      color: '#ef4444',
      textColor: '#dc2626',
      note: stats.total ? `${((stats.rejected / stats.total) * 100).toFixed(2)}% of total requests` : '0% of total requests',
      noteColor: '#dc2626'
    }
  ];

  return (
    <DashboardLayout>
      <div style={{ width: '100%' }}>
        <header style={{ marginBottom: '24px', padding: '4px 0 0' }}>
          <h1 style={{ margin: 0, fontSize: '31px', lineHeight: 1.1, letterSpacing: '-0.06em', fontWeight: 800, color: '#0f172a' }}>
            STUDENT OVERVIEW
          </h1>
          <p style={{ margin: '8px 0 0', fontSize: '15px', lineHeight: 1.5, color: '#475569', fontWeight: 500 }}>
            Permission Overview for {user?.name || 'student'} ({user?.rollNo || user?.username || 'N/A'})
          </p>
        </header>

        {loading ? (
          <div className="loading-screen"><div className="spinner spinner-lg" /></div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" style={{ marginBottom: '24px' }}>
              {statCards.map(({ label, value, icon: Icon, bg, color, note, noteColor }) => (
                <div key={label} className="card" style={{ padding: '20px 18px', borderRadius: '18px', boxShadow: '0 8px 18px rgba(15, 23, 42, 0.04)', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '46px', height: '46px', borderRadius: '14px', background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon size={21} />
                      </div>
                      <div style={{ fontSize: '14px', color: '#475569', fontWeight: 700, lineHeight: 1.3 }}>{label}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{value}</span>
                    <div style={{ fontSize: '12px', color: noteColor, fontWeight: 600 }}>{note}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(280px,0.95fr)]">
              <div className="card" style={{ border: '1px solid #e2e8f0', borderRadius: '18px', padding: '20px 18px 14px', background: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: '#eef2ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FaChartColumn size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>Monthly Permission Requests</div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Total, Approved, Pending and Rejected requests per month</div>
                  </div>
                </div>

                <div style={{ width: '100%', height: '320px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyOverview} margin={{ top: 10, right: 18, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6D28D9" stopOpacity={0.18}/>
                          <stop offset="95%" stopColor="#6D28D9" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorApproved" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#059669" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorRejected" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#dc2626" stopOpacity={0.12}/>
                          <stop offset="95%" stopColor="#dc2626" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.8} />
                      <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }} minTickGap={10} dy={10} />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }} dx={-8} />
                      <Tooltip
                        cursor={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                        contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 12px 24px rgba(15, 23, 42, 0.08)', background: '#fff' }}
                        itemStyle={{ fontWeight: 700, color: '#0f172a' }}
                        labelStyle={{ color: '#64748b', fontWeight: 700, marginBottom: 4 }}
                        wrapperStyle={{ outline: 'none' }}
                      />
                      <Area type="monotone" dataKey="total" name="Total Requests" stroke="#6D28D9" strokeWidth={2.2} fillOpacity={1} fill="url(#colorTotal)" activeDot={false} />
                      <Area type="monotone" dataKey="approved" name="Approved" stroke="#059669" strokeWidth={2} fillOpacity={1} fill="url(#colorApproved)" activeDot={false} />
                      <Area type="monotone" dataKey="pending" name="Pending" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorPending)" activeDot={false} />
                      <Area type="monotone" dataKey="rejected" name="Rejected" stroke="#dc2626" strokeWidth={2} fillOpacity={1} fill="url(#colorRejected)" activeDot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '18px', flexWrap: 'wrap', padding: '12px 0 4px', marginTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                  {[
                    { label: 'Total', color: '#6D28D9' },
                    { label: 'Approved', color: '#059669' },
                    { label: 'Pending', color: '#f59e0b' },
                    { label: 'Rejected', color: '#dc2626' }
                  ].map((item) => (
                    <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                      <span style={{ width: '12px', height: '12px', borderRadius: '4px', background: item.color, display: 'inline-block' }} />
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card" style={{ border: '1px solid #e2e8f0', borderRadius: '18px', padding: '20px 18px 14px', background: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: '#eef2ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FaChartPie size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>Request Status Distribution</div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Visual representation of your requests</div>
                  </div>
                </div>

                <div style={{ position: 'relative', width: '100%', height: '240px', marginTop: '8px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={56}
                        outerRadius={82}
                        paddingAngle={3}
                        stroke="white"
                        strokeWidth={4}
                        isAnimationActive={false}
                      >
                        {pieData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                      </Pie>
                      <Tooltip
                        formatter={(value) => [value, 'Requests']}
                        contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 24px rgba(15, 23, 42, 0.08)', background: '#fff' }}
                        itemStyle={{ fontWeight: 700, color: '#0f172a' }}
                        wrapperStyle={{ outline: 'none' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, letterSpacing: '0.04em' }}>Total Requests</div>
                      <div style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>{stats.total}</div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '14px 18px', flexWrap: 'wrap', paddingTop: '4px' }}>
                  {pieData.map((entry) => (
                    <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#475569', fontWeight: 600 }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: entry.color, display: 'inline-block' }} />
                      <span>{entry.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
