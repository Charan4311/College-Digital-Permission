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

import { useNavigate } from 'react-router-dom';

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
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
    { name: 'Approved', value: stats.approved, color: '#16a34a' },
    { name: 'Rejected', value: stats.rejected, color: '#dc2626' },
    { name: 'Pending', value: stats.pending, color: '#ea580c' }
  ];

  const monthlyOverview = stats.monthlyOverview?.length ? stats.monthlyOverview : monthNames.map((month) => ({ month, total: 0, approved: 0, rejected: 0, pending: 0 }));

  return (
    <DashboardLayout>
      <div className="page-header" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
              <span style={{ fontWeight: 900, letterSpacing: '-0.03em' }}>STUDENT OVERVIEW</span>
            </h1>
            <p className="page-subtitle" style={{ marginTop: '8px' }}>
              Permission Overview for {user?.name || 'student'} ({user?.rollNo || user?.username || 'N/A'})
            </p>
          </div>

          {/* Year filter removed */}
        </div>
      </div>

      {loading ? (
        <div className="loading-screen"><div className="spinner spinner-lg" /></div>
      ) : (
        <>
          <div className="stats-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[18px] mb-[30px] items-stretch">
            <div className="stat-card" onClick={() => navigate('/student/my-request')} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '18px 16px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px', height: '100%', minHeight: '150px', boxShadow: '0 8px 18px rgba(15, 23, 42, 0.04)', cursor: 'pointer', transition: 'all 0.2s ease' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '46px', height: '46px', borderRadius: '14px', background: '#eff6ff', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FaFileLines size={22} />
                </div>
                <div style={{ fontSize: '14px', color: '#475569', fontWeight: 700, lineHeight: 1.3 }}>Total Requests</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: '8px' }}>
                <span style={{ fontSize: '32px', fontWeight: 800, color: '#1f2937', lineHeight: 1 }}>{stats.total}</span>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>100% of total requests</div>
              </div>
            </div>

            <div className="stat-card" onClick={() => navigate('/student/my-request', { state: { status: 'Approved' } })} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '18px 16px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px', height: '100%', minHeight: '150px', boxShadow: '0 8px 18px rgba(15, 23, 42, 0.04)', cursor: 'pointer', transition: 'all 0.2s ease' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '46px', height: '46px', borderRadius: '14px', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FaCircleCheck size={22} />
                </div>
                <div style={{ fontSize: '14px', color: '#475569', fontWeight: 700, lineHeight: 1.3 }}>Approved</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: '8px' }}>
                <span style={{ fontSize: '32px', fontWeight: 800, color: '#1f2937', lineHeight: 1 }}>{stats.approved}</span>
                <div style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600 }}>{stats.total ? `${((stats.approved / stats.total) * 100).toFixed(2)}% of total requests` : '0% of total requests'}</div>
              </div>
            </div>

            <div className="stat-card" onClick={() => navigate('/student/my-request', { state: { status: 'Pending' } })} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '18px 16px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px', height: '100%', minHeight: '150px', boxShadow: '0 8px 18px rgba(15, 23, 42, 0.04)', cursor: 'pointer', transition: 'all 0.2s ease' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '46px', height: '46px', borderRadius: '14px', background: '#ffedd5', color: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FaClock size={22} />
                </div>
                <div style={{ fontSize: '14px', color: '#475569', fontWeight: 700, lineHeight: 1.3 }}>Pending</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: '8px' }}>
                <span style={{ fontSize: '32px', fontWeight: 800, color: '#1f2937', lineHeight: 1 }}>{stats.pending}</span>
                <div style={{ fontSize: '12px', color: '#ea580c', fontWeight: 600 }}>{stats.total ? `${((stats.pending / stats.total) * 100).toFixed(2)}% of total requests` : '0% of total requests'}</div>
              </div>
            </div>

            <div className="stat-card" onClick={() => navigate('/student/my-request', { state: { status: 'Rejected' } })} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '18px 16px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px', height: '100%', minHeight: '150px', boxShadow: '0 8px 18px rgba(15, 23, 42, 0.04)', cursor: 'pointer', transition: 'all 0.2s ease' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '46px', height: '46px', borderRadius: '14px', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FaCircleXmark size={22} />
                </div>
                <div style={{ fontSize: '14px', color: '#475569', fontWeight: 700, lineHeight: 1.3 }}>Rejected</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: '8px' }}>
                <span style={{ fontSize: '32px', fontWeight: 800, color: '#1f2937', lineHeight: 1 }}>{stats.rejected}</span>
                <div style={{ fontSize: '12px', color: '#dc2626', fontWeight: 600 }}>{stats.total ? `${((stats.rejected / stats.total) * 100).toFixed(2)}% of total requests` : '0% of total requests'}</div>
              </div>
            </div>
          </div>

          <div className="dashboard-chart-grid grid grid-cols-1 lg:grid-cols-[1.8fr_1fr] gap-[24px] items-stretch">
            <div className="card dashboard-chart-card" style={{ border: '1px solid #e2e8f0', borderRadius: '18px', padding: '20px 18px 10px', background: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#eff6ff', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FaChartColumn size={17} />
                  </div>
                  <div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#1f2937' }}>Monthly Permission Requests</div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Total, Approved, Pending and Rejected requests per month</div>
                  </div>
                </div>

              </div>

              <div style={{ width: '100%', height: '320px', marginTop: '20px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyOverview} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1d4ed8" stopOpacity={0.12}/>
                        <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorApproved" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#16a34a" stopOpacity={0.12}/>
                        <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ea580c" stopOpacity={0.12}/>
                        <stop offset="95%" stopColor="#ea580c" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorRejected" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#dc2626" stopOpacity={0.12}/>
                        <stop offset="95%" stopColor="#dc2626" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
                    <XAxis 
                      dataKey="month" 
                      tickLine={false} 
                      axisLine={false} 
                      tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }} 
                      minTickGap={10} 
                      dy={10}
                    />
                    <YAxis 
                      allowDecimals={false} 
                      tickLine={false} 
                      axisLine={false} 
                      tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }} 
                      dx={-10}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px rgba(0,0,0,0.08)' }}
                      itemStyle={{ fontWeight: 700, padding: '2px 0' }}
                      labelStyle={{ color: '#64748b', fontWeight: 600, marginBottom: '4px' }}
                    />
                    <Area type="monotone" dataKey="total" name="Total Requests" stroke="#1e3a8a" strokeWidth={1.5} fillOpacity={1} fill="url(#colorTotal)" activeDot={{ r: 5, fill: '#1e3a8a', strokeWidth: 0, boxShadow: '0 0 10px rgba(30,58,138,0.5)' }} />
                    <Area type="monotone" dataKey="approved" name="Approved" stroke="#16a34a" strokeWidth={1.5} fillOpacity={1} fill="url(#colorApproved)" activeDot={{ r: 5, fill: '#16a34a', strokeWidth: 0 }} />
                    <Area type="monotone" dataKey="pending" name="Pending" stroke="#ea580c" strokeWidth={1.5} fillOpacity={1} fill="url(#colorPending)" activeDot={{ r: 5, fill: '#ea580c', strokeWidth: 0 }} />
                    <Area type="monotone" dataKey="rejected" name="Rejected" stroke="#dc2626" strokeWidth={1.5} fillOpacity={1} fill="url(#colorRejected)" activeDot={{ r: 5, fill: '#dc2626', strokeWidth: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap', padding: '16px 0 12px', borderTop: '1px solid #f1f5f9', marginTop: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                  <span style={{ width: '12px', height: '12px', borderRadius: '4px', background: '#1d4ed8', display: 'inline-block' }} />
                  <span>Total</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                  <span style={{ width: '12px', height: '12px', borderRadius: '4px', background: '#16a34a', display: 'inline-block' }} />
                  <span>Approved</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                  <span style={{ width: '12px', height: '12px', borderRadius: '4px', background: '#ea580c', display: 'inline-block' }} />
                  <span>Pending</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                  <span style={{ width: '12px', height: '12px', borderRadius: '4px', background: '#dc2626', display: 'inline-block' }} />
                  <span>Rejected</span>
                </div>
              </div>
            </div>

            <div className="card dashboard-chart-card" style={{ border: '1px solid #e2e8f0', borderRadius: '18px', padding: '20px 18px 10px', background: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#eff6ff', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FaChartPie size={17} />
                  </div>
                  <div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#1f2937' }}>Request Status Distribution</div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Visual representation of your requests</div>
                  </div>
                </div>

              </div>

              <div style={{ position: 'relative', width: '100%', height: '230px', marginTop: '12px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={56}
                      outerRadius={82}
                      paddingAngle={2}
                      stroke="white"
                      strokeWidth={4}
                    >
                      {pieData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>

                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700 }}>Total Requests</div>
                    <div style={{ fontSize: '32px', fontWeight: 800, color: '#1f2937', lineHeight: 1.1 }}>{stats.total}</div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '18px', flexWrap: 'wrap', padding: '0 0 12px' }}>
                {pieData.map((entry) => (
                  <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#475569' }}>
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
