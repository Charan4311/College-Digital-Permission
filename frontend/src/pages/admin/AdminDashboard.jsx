import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import api from '../../lib/api';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LabelList
} from 'recharts';
import {
  Users,
  GraduationCap,
  BarChart2,
  PieChart as PieChartIcon,
  Layers,
  Calendar
} from 'lucide-react';

const BRANCH_FALLBACKS = {
  'CSM': { code: 'CSM', sub: '(AI & ML)', full: 'CSM (AI & ML)' },
  'CAI': { code: 'CAI', sub: '(AI)', full: 'CAI (AI)' },
  'CSD': { code: 'CSD', sub: '(Data Science)', full: 'CSD (Data Science)' },
  'AIDS': { code: 'AIDS', sub: '(AI & Data Science)', full: 'AIDS (AI & Data Science)' },
  'CSC': { code: 'CSC', sub: '(Cyber Security)', full: 'CSC (Cyber Security)' },
  '42': { code: 'CSM', sub: '(AI & ML)', full: 'CSM (AI & ML)' },
  '43': { code: 'CAI', sub: '(AI)', full: 'CAI (AI)' },
  '44': { code: 'CSD', sub: '(Data Science)', full: 'CSD (Data Science)' },
  '45': { code: 'AIDS', sub: '(AI & Data Science)', full: 'AIDS (AI & Data Science)' },
  '46': { code: 'CSC', sub: '(Cyber Security)', full: 'CSC (Cyber Security)' },
};

const DONUT_COLORS = ['#10b981', '#10B981', '#F59E0B', '#10b981', '#06B6D4'];

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== 'undefined' ? window.innerWidth > 1024 : true
  );

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth > 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchData = async () => {
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
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="loading-screen">
          <div className="spinner spinner-lg" />
        </div>
      </DashboardLayout>
    );
  }

  const branchBarData = (data?.branchDistributionByYear || []).map(item => {
    const fallback = BRANCH_FALLBACKS[item.name] || BRANCH_FALLBACKS[item.code] || {};
    const displayName = item.shortName || fallback.code || item.name;
    const sub = item.sub || fallback.sub || '';
    const full = item.fullName || fallback.full || displayName;
    return {
      ...item,
      displayName,
      sub,
      full
    };
  });

  const pieData = (data?.branchTotalDistribution || []).map((item, idx) => ({
    ...item,
    color: item.color || DONUT_COLORS[idx % DONUT_COLORS.length]
  }));

  const totalStudents = data?.totalStudents || 0;
  const year2 = data?.year2Students || 0;
  const year3 = data?.year3Students || 0;
  const year4 = data?.year4Students || 0;

  return (
    <DashboardLayout>
      {/* Top Header Bar */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ color: '#475569', fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
              Welcome back,
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8, letterSpacing: '-0.5px' }}>
              System <span style={{ color: '#10b981' }}>Administrator</span>
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', padding: '10px 16px', borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
              <Calendar size={18} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{new Date().toLocaleDateString('en-US', { weekday: 'long' })}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top 4 Metrics Cards */}
      <div className="admin-summary-grid">
        {/* Card 1: Total Students */}
        <div style={{
          background: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: '16px',
          padding: '22px 24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          minHeight: '110px',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 6px 18px rgba(15,23,42,0.08)';
          e.currentTarget.style.borderColor = '#bfdbfe';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
          e.currentTarget.style.borderColor = '#E2E8F0';
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: '#ecfdf5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Users size={20} color="#10b981" />
            </div>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#475569' }}>Total Students</span>
          </div>
          <div style={{ marginTop: '12px' }}>
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>
              {totalStudents.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Card 2: 2nd Year Students */}
        <div style={{
          background: '#EFF6FF',
          border: '1px solid #DBEAFE',
          borderRadius: '16px',
          padding: '22px 24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          minHeight: '110px',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 6px 18px rgba(15,23,42,0.08)';
          e.currentTarget.style.borderColor = '#93C5FD';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
          e.currentTarget.style.borderColor = '#DBEAFE';
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: '#DBEAFE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <GraduationCap size={20} color="#3B82F6" />
            </div>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#1D4ED8' }}>2nd Year Students</span>
          </div>
          <div style={{ marginTop: '12px' }}>
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>
              {year2.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Card 3: 3rd Year Students */}
        <div style={{
          background: '#FAF5FF',
          border: '1px solid #F3E8FF',
          borderRadius: '16px',
          padding: '22px 24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          minHeight: '110px',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 6px 18px rgba(15,23,42,0.08)';
          e.currentTarget.style.borderColor = '#bfdbfe';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
          e.currentTarget.style.borderColor = '#F3E8FF';
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: '#F3E8FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <GraduationCap size={20} color="#10b981" />
            </div>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#6B21A8' }}>3rd Year Students</span>
          </div>
          <div style={{ marginTop: '12px' }}>
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>
              {year3.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Card 4: 4th Year Students */}
        <div style={{
          background: '#FFFBEB',
          border: '1px solid #FEF3C7',
          borderRadius: '16px',
          padding: '22px 24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          minHeight: '110px',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 6px 18px rgba(15,23,42,0.08)';
          e.currentTarget.style.borderColor = '#bfdbfe';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
          e.currentTarget.style.borderColor = '#FEF3C7';
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: '#FEF3C7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <GraduationCap size={20} color="#F59E0B" />
            </div>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#92400E' }}>4th Year Students</span>
          </div>
          <div style={{ marginTop: '12px' }}>
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>
              {year4.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="admin-charts-grid">
        {/* Left Chart: Branch-wise Student Distribution (By Year) */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 1px 3px 0 rgba(0,0,0,0.04)'
        }}>
          {/* Card Header with Legend */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '24px',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#ecfdf5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Layers size={18} color="#10b981" />
              </div>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1E293B' }}>
                Branch-wise Student Distribution (By Year)
              </h2>
            </div>

            {/* Custom Legend */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', fontWeight: 600, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#3B82F6' }} />
                <span>2nd Year</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10B981' }} />
                <span>3rd Year</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#F59E0B' }} />
                <span>4th Year</span>
              </div>
            </div>
          </div>

          {/* Grouped Bar Chart */}
          <ResponsiveContainer width="100%" height={340}>
            <BarChart
              data={branchBarData}
              margin={{ top: 25, right: 10, left: -20, bottom: isDesktop ? 35 : 15 }}
              barGap={4}
              barCategoryGap="20%"
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis
                dataKey="displayName"
                interval={0}
                tick={({ x, y, payload }) => {
                  const item = branchBarData.find(b => b.displayName === payload.value);
                  return (
                    <g transform={`translate(${x},${y})`}>
                      <text x={0} y={15} textAnchor="middle" fill="#1E293B" fontSize={13} fontWeight={700}>
                        {payload.value}
                      </text>
                      {isDesktop && item?.sub && (
                        <text className="chart-xaxis-subtext" x={0} y={30} textAnchor="middle" fill="#64748B" fontSize={11} fontWeight={500}>
                          {item.sub}
                        </text>
                      )}
                    </g>
                  );
                }}
                axisLine={{ stroke: '#E2E8F0' }}
                tickLine={false}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748B', fontSize: 12 }}
                domain={[0, 'dataMax + 20']}
              />
              <Tooltip
                cursor={{ fill: 'rgba(241, 245, 249, 0.6)' }}
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '10px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                }}
                labelFormatter={(label, items) => {
                  return items && items[0]?.payload?.full ? items[0].payload.full : label;
                }}
                formatter={(value, name) => [
                  value,
                  name === 'year2' ? '2nd Year' : name === 'year3' ? '3rd Year' : '4th Year'
                ]}
              />
              <Bar dataKey="year2" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={32}>
                {isDesktop && <LabelList className="chart-bar-label" dataKey="year2" position="top" style={{ fontSize: '11px', fontWeight: 700, fill: '#475569' }} />}
              </Bar>
              <Bar dataKey="year3" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={32}>
                {isDesktop && <LabelList className="chart-bar-label" dataKey="year3" position="top" style={{ fontSize: '11px', fontWeight: 700, fill: '#475569' }} />}
              </Bar>
              <Bar dataKey="year4" fill="#F59E0B" radius={[4, 4, 0, 0]} maxBarSize={32}>
                {isDesktop && <LabelList className="chart-bar-label" dataKey="year4" position="top" style={{ fontSize: '11px', fontWeight: 700, fill: '#475569' }} />}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Right Chart: Branch Distribution (Total Students) */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 1px 3px 0 rgba(0,0,0,0.04)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Card Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: '#ecfdf5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <PieChartIcon size={18} color="#10b981" />
            </div>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1E293B' }}>
              Branch Distribution (Total Students)
            </h2>
          </div>

          {/* Donut Chart + Legend Side-by-Side */}
          <div className="admin-donut-wrap" style={{ paddingTop: '10px' }}>
            {/* Donut Chart with Overlay Text */}
            <div style={{ position: 'relative', width: '180px', height: '220px', flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="count"
                    nameKey="fullName"
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={84}
                    paddingAngle={3}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                    }}
                    formatter={(val, name) => [`${val} students`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Center Overlay Text inside Donut Hole */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                pointerEvents: 'none'
              }}>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', lineHeight: 1.1 }}>
                  {totalStudents.toLocaleString()}
                </div>
                <div style={{ fontSize: '11px', fontWeight: 500, color: '#64748B', marginTop: '2px' }}>
                  Total Students
                </div>
              </div>
            </div>

            {/* Detailed Branch Legend Table */}
            <div style={{ flex: 1, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{
                      textAlign: 'left',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#64748B',
                      paddingBottom: '8px',
                      borderBottom: '1px solid #F1F5F9'
                    }}>
                      Branch
                    </th>
                    <th style={{
                      textAlign: 'right',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#64748B',
                      paddingBottom: '8px',
                      borderBottom: '1px solid #F1F5F9'
                    }}>
                      Count
                    </th>
                    <th style={{
                      textAlign: 'right',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#64748B',
                      paddingBottom: '8px',
                      borderBottom: '1px solid #F1F5F9'
                    }}>
                      %
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pieData.map((b, idx) => (
                    <tr key={idx} style={{ borderBottom: idx < pieData.length - 1 ? '1px solid #F8FAFC' : 'none' }}>
                      <td style={{ padding: '8px 0', fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: b.color,
                            flexShrink: 0
                          }} />
                          <span style={{ whiteSpace: 'nowrap' }}>{b.fullName}</span>
                        </div>
                      </td>
                      <td style={{ padding: '8px 0', textAlign: 'right', fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>
                        {b.count}
                      </td>
                      <td style={{ padding: '8px 0', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>
                        {b.percentage}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
