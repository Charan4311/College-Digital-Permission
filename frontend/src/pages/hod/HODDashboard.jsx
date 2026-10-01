import React, {
    useEffect,
    useMemo,
    useState,
} from 'react';

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/DashboardLayout';
import api from '../../lib/api';

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';

import {
    Building2,
    FileText,
    ChevronRight,
    RefreshCw,
    BarChart3,
    ArrowRight,
    Calendar,
} from 'lucide-react';

import {
    FaClipboardList,
    FaClock,
    FaCircleCheck,
    FaCircleXmark
} from 'react-icons/fa6';


// ============================================================
// STUDENT REQUESTS ROUTE
// ============================================================

const STUDENT_REQUESTS_ROUTE = '/hod/student-requests';


// ============================================================
// DEPARTMENT BRANCHES
// ============================================================

const DEPARTMENT_BRANCHES = [
    'CSM',
    'CAI',
    'CSD',
    'AID',
    'CSC',
];


// ============================================================
// COMPONENT
// ============================================================

export default function HODDashboard() {

    const { user } = useAuth();
    const navigate = useNavigate();


    // ========================================================
    // STATE
    // ========================================================

    const [pending, setPending] = useState([]);

    const [history, setHistory] = useState([]);

    const [stats, setStats] = useState(null);

    const [loading, setLoading] = useState(true);

    const [refreshing, setRefreshing] = useState(false);

    const [error, setError] = useState('');


    // ========================================================
    // FETCH DASHBOARD DATA
    // ========================================================

    const fetchDashboard = async (showRefresh = false) => {

        try {

            if (showRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            setError('');

            const [
                pendingRes,
                historyRes,
                statsRes,
            ] = await Promise.all([

                api.get(
                    '/outpass/pending/for-me'
                ),

                api.get(
                    '/outpass/all/for-me'
                ),

                api.get(
                    '/outpass/dashboard-stats'
                ),
            ]);


            const pendingData =
                pendingRes?.data?.data;

            const historyData =
                historyRes?.data?.data;

            const statsData =
                statsRes?.data?.data;

            const isHODVisibleRequest = (request) => {
                const type = String(
                    request?.requestType ||
                    request?.type ||
                    request?.permissionType ||
                    ''
                )
                    .trim()
                    .toUpperCase()
                    .replace(/[\s-]+/g, '_');

                return type !== 'LIBRARY';
            };

            setPending(
                Array.isArray(pendingData)
                    ? pendingData.filter(isHODVisibleRequest)
                    : []
            );

            setHistory(
                Array.isArray(historyData)
                    ? historyData.filter(isHODVisibleRequest)
                    : []
            );

            setStats(
                statsData || {}
            );

        } catch (err) {

            console.error(
                'HOD Dashboard Error:',
                err
            );

            setError(
                err?.response?.data?.message ||
                'Unable to load dashboard data.'
            );

        } finally {

            setLoading(false);
            setRefreshing(false);

        }
    };


    // ========================================================
    // INITIAL LOAD + AUTO REFRESH
    // ========================================================

    useEffect(() => {

        fetchDashboard();

        const interval =
            setInterval(() => {
                fetchDashboard();
            }, 6000);

        return () =>
            clearInterval(interval);

    }, []);


    // ========================================================
    // HELPERS
    // ========================================================

    const getBranchName = (request) => {

        return String(
            request?.branchId?.name ||
            request?.branchId?.code ||
            request?.branch?.name ||
            request?.branch?.code ||
            request?.branchName ||
            ''
        )
            .trim()
            .toUpperCase();
    };


    const getStatus = (request) => {

        return String(
            request?.status || ''
        )
            .trim()
            .toUpperCase();
    };


    // ========================================================
    // STATUS HELPERS
    // ========================================================

    const isRejected = (request) => {

        return getStatus(request)
            .startsWith('REJECTED');
    };


    const isApproved = (request) => {

        const status =
            getStatus(request);

        return [
            'APPROVED',
            'ISSUED',
            'USED',
            'CLEARED',
            'PENDING_HOSTEL_INCHARGE',
            'PENDING_PLACEMENT_OFFICER',
        ].includes(status);
    };


    // ========================================================
    // OVERALL COUNTS
    // ========================================================

    const totalRequests =
        history.length;


    const pendingCount =
        history.filter(
            (request) =>
                getStatus(request).startsWith('PENDING')
        ).length;


    const rejectedCount =
        history.filter(
            (request) =>
                isRejected(request)
        ).length;


    const approvedCount =
        history.filter(
            (request) =>
                isApproved(request)
        ).length;


    // ========================================================
    // KPI NAVIGATION
    // ========================================================

    const handleKpiClick = (status) => {

        if (status === 'ALL') {

            navigate(
                STUDENT_REQUESTS_ROUTE
            );

            return;
        }

        navigate(
            `${STUDENT_REQUESTS_ROUTE}?status=${encodeURIComponent(
                status
            )}`
        );
    };


    // ========================================================
    // BRANCH OVERVIEW
    // ========================================================

    const branchStats =
        useMemo(() => {

            return DEPARTMENT_BRANCHES.map(
                (branch) => {

                    const branchRequests =
                        history.filter(
                            (request) =>
                                getBranchName(
                                    request
                                ) === branch
                        );

                    return {
                        name: branch,
                        hasRequests:
                            branchRequests.length >
                            0,
                    };
                }
            );

        }, [history]);


    // ========================================================
    // APPROVAL ACTIVITY
    // ========================================================

    const chartData =
        useMemo(() => {

            const grouped = {};

            // The dashboard-stats API currently returns KPI totals but does not
            // return approvedPerDay/rejectedPerDay. Build the chart from the
            // already-loaded history so the existing backend does not need
            // to be changed.
            history.forEach((request) => {

                const rawDate =
                    request?.createdAt ||
                    request?.requestDate ||
                    request?.outDate ||
                    request?.date;

                if (!rawDate) return;

                const date = new Date(rawDate);
                if (Number.isNaN(date.getTime())) return;

                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const key = `${year}-${month}-${day}`;

                if (!grouped[key]) {
                    grouped[key] = {
                        Approved: 0,
                        Rejected: 0,
                    };
                }

                const status = getStatus(request);

                if (
                    ['APPROVED', 'ISSUED', 'CLEARED', 'USED'].includes(status)
                ) {
                    grouped[key].Approved += 1;
                } else if (status.startsWith('REJECTED')) {
                    grouped[key].Rejected += 1;
                }
            });

            const result = [];

            // Last 7 days
            for (let i = 6; i >= 0; i--) {

                const date = new Date();
                date.setHours(0, 0, 0, 0);
                date.setDate(date.getDate() - i);

                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const key = `${year}-${month}-${day}`;

                result.push({
                    date: date.toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                    }),
                    Approved: grouped[key]?.Approved || 0,
                    Rejected: grouped[key]?.Rejected || 0,
                });
            }

            return result;

        }, [history]);


    // ========================================================
    // VIEW BRANCH REQUESTS
    // ========================================================

    const handleViewRequests = (
        branchCode
    ) => {

        navigate(
            `/hod/branches/${encodeURIComponent(
                branchCode
            )}/requests`
        );

    };


    // ========================================================
    // RENDER
    // ========================================================

    return (

        <DashboardLayout>

            <div
                className="hod-dashboard-page"
                style={{
                    width: '100%',
                    paddingBottom: 24,
                }}
            >

                {/* ==================================================
                    HEADER
                ================================================== */}

                <div
                    style={{
                        marginBottom: 20,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        flexWrap: 'wrap',
                        gap: '16px'
                    }}
                >

                    <h1
                        style={{
                            margin: 0,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            fontSize: 28,
                            fontWeight: 800,
                            color: '#0f172a',
                            letterSpacing: '-0.5px',
                        }}
                    >

                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '16px', fontWeight: 600, color: '#64748b', letterSpacing: 'normal', marginBottom: '4px' }}>Welcome back,</span>
                            <span>
                                <span style={{ color: '#0f172a' }}>Head of the </span>
                                <span style={{ color: '#059669' }}>Department</span>
                            </span>
                            <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748b', letterSpacing: 'normal', marginTop: '4px' }}>
                                {(() => {
                                    const tier = String(user?.yearTier || '');
                                    const yr = String(user?.year || '');
                                    const name = String(user?.name || '');
                                    if (tier.includes('1') || yr === '1' || name.includes('1st') || name.includes('1')) return '1st Year';
                                    if (tier.includes('2') || yr === '2' || name.includes('2nd') || name.includes('2')) return '2nd Year';
                                    if (tier.includes('3') || yr === '3' || name.includes('3rd') || name.includes('3nd') || name.includes('3')) return '3rd Year';
                                    if (tier.includes('4') || yr === '4' || name.includes('4th') || name.includes('4')) return '4th Year';
                                    return name.replace('Head of Department', '').replace('(', '').replace(')', '').trim() || name;
                                })()}
                            </span>
                        </div>

                    </h1>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', padding: '10px 16px', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                            <Calendar size={20} />
                        </div>
                        <div>
                            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>{new Date().toLocaleDateString('en-US', { weekday: 'long' })}</div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                                {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </div>
                        </div>
                    </div>

                </div>


                {/* ==================================================
                    ERROR
                ================================================== */}

                {error && (

                    <div
                        style={{
                            marginBottom: 16,
                            padding: '10px 13px',
                            borderRadius: 8,
                            border:
                                '1px solid #fecaca',
                            background:
                                '#fef2f2',
                            color:
                                '#b91c1c',
                            fontSize: 12,
                        }}
                    >

                        {error}

                    </div>

                )}


                {/* ==================================================
                    KPI CARDS
                ================================================== */}

                <div
                    className="hod-kpi-grid"
                    style={{
                        display: 'grid',
                        gridTemplateColumns:
                            'repeat(4, minmax(0, 1fr))',
                        gap: 14,
                        marginBottom: 16,
                    }}
                >

                    <DashboardStatCard
                        label="Total Requests"
                        value={
                            loading
                                ? '—'
                                : totalRequests
                        }
                        icon={
                            <FaClipboardList
                                size={20}
                            />
                        }
                        iconBackground="#ecfdf5"
                        iconColor="#10b981"
                        valueColor="#172554"
                        onClick={() =>
                            handleKpiClick(
                                'ALL'
                            )
                        }
                    />


                    <DashboardStatCard
                        label="Pending"
                        value={
                            loading
                                ? '—'
                                : pendingCount
                        }
                        icon={
                            <FaClock
                                size={20}
                            />
                        }
                        iconBackground="#fff7ed"
                        iconColor="#f59e0b"
                        valueColor="#d97706"
                        onClick={() =>
                            handleKpiClick(
                                'PENDING'
                            )
                        }
                    />


                    <DashboardStatCard
                        label="Approved"
                        value={
                            loading
                                ? '—'
                                : approvedCount
                        }
                        icon={
                            <FaCircleCheck
                                size={20}
                            />
                        }
                        iconBackground="#ecfdf5"
                        iconColor="#059669"
                        valueColor="#059669"
                        onClick={() =>
                            handleKpiClick(
                                'APPROVED'
                            )
                        }
                    />


                    <DashboardStatCard
                        label="Rejected"
                        value={
                            loading
                                ? '—'
                                : rejectedCount
                        }
                        icon={
                            <FaCircleXmark
                                size={20}
                            />
                        }
                        iconBackground="#fef2f2"
                        iconColor="#ef4444"
                        valueColor="#dc2626"
                        onClick={() =>
                            handleKpiClick(
                                'REJECTED'
                            )
                        }
                    />

                </div>


                {/* ==================================================
                    MAIN CONTENT
                ================================================== */}

                <div
                    className="hod-main-grid"
                    style={{
                        display: 'grid',
                        gridTemplateColumns:
                            'minmax(0, 1.08fr) minmax(0, 1fr)',
                        gap: 14,
                        marginBottom: 16,
                    }}
                >

                    {/* ==================================================
                        APPROVAL ACTIVITY
                    ================================================== */}

                    <div
                        className="card"
                        style={{
                            padding: 16,
                            minHeight: 330,
                            borderRadius: 10,
                            border:
                                '1px solid #e2e8f0',
                            background: '#fff',
                            boxShadow:
                                '0 1px 2px rgba(15,23,42,0.04)',
                        }}
                    >

                        <div
                            style={{
                                display: 'flex',
                                justifyContent:
                                    'space-between',
                                alignItems:
                                    'flex-start',
                                marginBottom: 12,
                            }}
                        >

                            <div>

                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems:
                                            'center',
                                        gap: 9,
                                    }}
                                >

                                    <div
                                        style={{
                                            width: 34,
                                            height: 34,
                                            borderRadius: 9,
                                            background:
                                                '#ecfdf5',
                                            color:
                                                '#10b981',
                                            display:
                                                'flex',
                                            alignItems:
                                                'center',
                                            justifyContent:
                                                'center',
                                        }}
                                    >

                                        <BarChart3
                                            size={19}
                                        />

                                    </div>


                                    <div>

                                        <h2
                                            style={{
                                                margin: 0,
                                                fontSize: 16,
                                                fontWeight: 800,
                                                color:
                                                    '#0f172a',
                                            }}
                                        >
                                            Approval Activity
                                            (Last 7 Days)
                                        </h2>

                                        <p
                                            style={{
                                                margin:
                                                    '4px 0 0',
                                                fontSize: 12,
                                                color:
                                                    '#64748b',
                                            }}
                                        >
                                            Approved vs
                                            rejected decisions
                                            recorded
                                        </p>

                                    </div>

                                </div>

                            </div>


                            <div
                                style={{
                                    fontSize: 12,
                                    color:
                                        '#64748b',
                                    paddingTop: 4,
                                }}
                            >
                                Daily Volume
                            </div>

                        </div>


                        <div
                            style={{
                                height: 245,
                                width: '100%',
                            }}
                        >

                            <ResponsiveContainer
                                width="100%"
                                height="100%"
                            >

                                <BarChart
                                    data={chartData}
                                    margin={{
                                        top: 8,
                                        right: 8,
                                        left: -18,
                                        bottom: 4,
                                    }}
                                >

                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        stroke="#e2e8f0"
                                        vertical={false}
                                    />

                                    <XAxis
                                        dataKey="date"
                                        tick={{
                                            fontSize: 11,
                                            fill:
                                                '#64748b',
                                        }}
                                        axisLine={{
                                            stroke:
                                                '#cbd5e1',
                                        }}
                                        tickLine={false}
                                    />

                                    <YAxis
                                        allowDecimals={false}
                                        tick={{
                                            fontSize: 11,
                                            fill:
                                                '#64748b',
                                        }}
                                        axisLine={{
                                            stroke:
                                                '#cbd5e1',
                                        }}
                                        tickLine={false}
                                    />

                                    <Tooltip
                                        contentStyle={{
                                            background:
                                                '#ffffff',
                                            border:
                                                '1px solid #e2e8f0',
                                            borderRadius:
                                                8,
                                            boxShadow:
                                                '0 5px 15px rgba(15,23,42,0.08)',
                                            fontSize: 12,
                                        }}
                                        cursor={{
                                            fill:
                                                '#f8fafc',
                                        }}
                                    />

                                    <Legend
                                        wrapperStyle={{
                                            fontSize: 12,
                                            paddingTop: 5,
                                        }}
                                    />

                                    <Bar
                                        dataKey="Approved"
                                        name="Approved"
                                        fill="#10b981"
                                        radius={[
                                            4,
                                            4,
                                            0,
                                            0,
                                        ]}
                                        maxBarSize={28}
                                    />

                                    <Bar
                                        dataKey="Rejected"
                                        name="Rejected"
                                        fill="#ef4444"
                                        radius={[
                                            4,
                                            4,
                                            0,
                                            0,
                                        ]}
                                        maxBarSize={28}
                                    />

                                </BarChart>

                            </ResponsiveContainer>

                        </div>

                    </div>


                    {/* ==================================================
                        BRANCHES
                    ================================================== */}

                    <div
                        className="card"
                        style={{
                            padding: 16,
                            minHeight: 330,
                            borderRadius: 10,
                            border:
                                '1px solid #e2e8f0',
                            background: '#fff',
                            boxShadow:
                                '0 1px 2px rgba(15,23,42,0.04)',
                        }}
                    >

                        <div
                            style={{
                                display: 'flex',
                                alignItems:
                                    'flex-start',
                                gap: 9,
                                marginBottom: 14,
                            }}
                        >

                            <div
                                style={{
                                    width: 34,
                                    height: 34,
                                    borderRadius: 9,
                                    background:
                                        '#ecfdf5',
                                    color:
                                        '#10b981',
                                    display:
                                        'flex',
                                    alignItems:
                                        'center',
                                    justifyContent:
                                        'center',
                                    flexShrink: 0,
                                }}
                            >

                                <Building2
                                    size={19}
                                />

                            </div>


                            <div>

                                <h2
                                    style={{
                                        margin: 0,
                                        fontSize: 16,
                                        fontWeight: 800,
                                        color:
                                            '#0f172a',
                                    }}
                                >
                                    Branches under
                                    Department
                                </h2>

                                <p
                                    style={{
                                        margin:
                                            '4px 0 0',
                                        fontSize: 12,
                                        color:
                                            '#64748b',
                                    }}
                                >
                                    Requests received
                                    from each branch
                                </p>

                            </div>

                        </div>


                        <div
                            className="hod-branch-grid"
                            style={{
                                display: 'grid',
                                gridTemplateColumns:
                                    'repeat(3, minmax(0, 1fr))',
                                gap: 9,
                            }}
                        >

                            {branchStats.map(
                                (branch) => (

                                    <div
                                        key={
                                            branch.name
                                        }
                                        style={{
                                            border:
                                                '1px solid #e2e8f0',
                                            borderRadius:
                                                9,
                                            padding:
                                                11,
                                            minHeight:
                                                130,
                                            display:
                                                'flex',
                                            flexDirection:
                                                'column',
                                        }}
                                    >

                                        <div
                                            style={{
                                                width: 34,
                                                height: 34,
                                                borderRadius:
                                                    9,
                                                background:
                                                    '#ecfdf5',
                                                color:
                                                    '#10b981',
                                                display:
                                                    'flex',
                                                alignItems:
                                                    'center',
                                                justifyContent:
                                                    'center',
                                                marginBottom:
                                                    10,
                                            }}
                                        >

                                            <FileText
                                                size={17}
                                            />

                                        </div>


                                        <div
                                            style={{
                                                fontSize: 15,
                                                fontWeight: 800,
                                                color:
                                                    '#172554',
                                                marginBottom:
                                                    'auto',
                                            }}
                                        >
                                            {
                                                branch.name
                                            }
                                        </div>


                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleViewRequests(
                                                    branch.name
                                                )
                                            }
                                            style={{
                                                marginTop: 10,
                                                width: '100%',
                                                border: 'none',
                                                borderRadius: 6,
                                                padding:
                                                    '7px 5px',
                                                background:
                                                    '#ecfdf5',
                                                color:
                                                    '#10b981',
                                                fontSize: 10,
                                                fontWeight: 700,
                                                cursor:
                                                    'pointer',
                                                display:
                                                    'flex',
                                                alignItems:
                                                    'center',
                                                justifyContent:
                                                    'center',
                                                gap: 3,
                                            }}
                                        >

                                            View Requests

                                            <ChevronRight
                                                size={12}
                                            />

                                        </button>

                                    </div>

                                )
                            )}

                        </div>

                    </div>

                </div>


                {/* ==================================================
                    GET DETAILED INSIGHTS
                ================================================== */}

                <div
                    className="hod-insights-card"
                    style={{
                        borderRadius: 10,
                        border:
                            '1px solid #e4e7ff',
                        background:
                            'linear-gradient(100deg, #ecfdf5 0%, #f8fafc 55%, #ecfdf5 100%)',
                        padding:
                            '15px 18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent:
                            'space-between',
                        gap: 15,
                    }}
                >

                    <div
                        style={{
                            display: 'flex',
                            alignItems:
                                'center',
                            gap: 11,
                            minWidth: 0,
                        }}
                    >

                        <div
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: 10,
                                background:
                                    '#d1fae5',
                                color:
                                    '#1d4ed8',
                                display:
                                    'flex',
                                alignItems:
                                    'center',
                                justifyContent:
                                    'center',
                                flexShrink: 0,
                            }}
                        >

                            <BarChart3
                                size={21}
                            />

                        </div>


                        <div>

                            <div
                                style={{
                                    fontSize: 14,
                                    fontWeight: 800,
                                    color:
                                        '#172554',
                                }}
                            >
                                Get Detailed
                                Insights
                            </div>

                            <div
                                style={{
                                    marginTop: 3,
                                    fontSize: 11,
                                    color:
                                        '#64748b',
                                }}
                            >
                                View detailed
                                analytics and
                                download department
                                reports.
                            </div>

                        </div>

                    </div>


                    <button
                        type="button"
                        onClick={() =>
                            navigate(
                                '/hod/reports'
                            )
                        }
                        style={{
                            border: 'none',
                            borderRadius: 7,
                            background:
                                '#10b981',
                            color:
                                '#ffffff',
                            padding:
                                '9px 14px',
                            fontSize: 11,
                            fontWeight: 800,
                            cursor:
                                'pointer',
                            display:
                                'inline-flex',
                            alignItems:
                                'center',
                            justifyContent:
                                'center',
                            gap: 6,
                            whiteSpace:
                                'nowrap',
                            boxShadow:
                                '0 2px 6px rgba(37,99,235,0.18)',
                        }}
                    >

                        Go to Reports

                        <ArrowRight
                            size={14}
                        />

                    </button>

                </div>


                {/* ==================================================
                    RESPONSIVE STYLES
                ================================================== */}

                <style>
                    {`

                        .hod-dashboard-page button {
                            transition:
                                background-color
                                0.15s ease,
                                transform
                                0.15s ease,
                                box-shadow
                                0.15s ease;
                        }


                        .hod-dashboard-page button:hover {
                            transform:
                                translateY(-1px);
                        }


                        @media (max-width: 1100px) {

                            .hod-kpi-grid {
                                grid-template-columns:
                                    repeat(
                                        2,
                                        minmax(
                                            0,
                                            1fr
                                        )
                                    ) !important;
                            }

                            .hod-main-grid {
                                grid-template-columns:
                                    1fr !important;
                            }

                        }


                        @media (max-width: 700px) {

                            .hod-branch-grid {
                                grid-template-columns:
                                    repeat(
                                        2,
                                        minmax(
                                            0,
                                            1fr
                                        )
                                    ) !important;
                            }

                            .hod-insights-card {
                                flex-direction:
                                    column;
                                align-items:
                                    flex-start !important;
                            }

                            .hod-insights-card button {
                                width: 100%;
                            }

                        }


                        @media (max-width: 500px) {

                            /* Match the compact Hostel In-charge mobile orientation:
                               KPI cards stay in a 2 x 2 grid. */
                            .hod-kpi-grid {
                                grid-template-columns:
                                    repeat(2, minmax(0, 1fr)) !important;
                                gap: 10px !important;
                                margin-bottom: 14px !important;
                            }

                            .hod-kpi-grid .card {
                                min-width: 0 !important;
                                min-height: 96px !important;
                                padding: 12px !important;
                            }

                            /* Branch cards also use a compact 2-column mobile layout. */
                            .hod-branch-grid {
                                grid-template-columns:
                                    repeat(2, minmax(0, 1fr)) !important;
                                gap: 10px !important;
                            }

                            .hod-branch-grid > div {
                                min-width: 0 !important;
                                min-height: 112px !important;
                                padding: 10px !important;
                            }

                        }

                    `}
                </style>

            </div>

        </DashboardLayout>
    );
}


// ============================================================
// KPI CARD COMPONENT
// ============================================================

function DashboardStatCard({
    label,
    value,
    icon,
    iconBackground,
    iconColor,
    valueColor,
    onClick,
}) {

    const handleKeyDown = (event) => {

        if (!onClick) {
            return;
        }

        if (
            event.key === 'Enter' ||
            event.key === ' '
        ) {

            event.preventDefault();

            onClick();
        }
    };


    return (

        <div
            className="card"
            onClick={onClick}
            onKeyDown={handleKeyDown}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
            style={{
                background: '#ffffff',
                border:
                    '1px solid #e2e8f0',
                borderRadius: 12,
                padding: '20px 24px',
                minHeight: 100,
                boxShadow:
                    '0 1px 2px rgba(15,23,42,0.04)',
                cursor:
                    onClick
                        ? 'pointer'
                        : 'default',
                transition:
                    'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
            }}
            onMouseEnter={(event) => {

                if (!onClick) {
                    return;
                }

                event.currentTarget.style.transform =
                    'translateY(-2px)';

                event.currentTarget.style.boxShadow =
                    '0 6px 18px rgba(15,23,42,0.08)';

                event.currentTarget.style.borderColor =
                    '#bfdbfe';
            }}
            onMouseLeave={(event) => {

                if (!onClick) {
                    return;
                }

                event.currentTarget.style.transform =
                    'translateY(0)';

                event.currentTarget.style.boxShadow =
                    '0 1px 2px rgba(15,23,42,0.04)';

                event.currentTarget.style.borderColor =
                    '#e2e8f0';
            }}
        >

            <div
                style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background:
                        iconBackground,
                    color:
                        iconColor,
                    display: 'flex',
                    alignItems:
                        'center',
                    justifyContent:
                        'center',
                    flexShrink: 0,
                }}
            >

                {icon}

            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div
                    style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: '#64748b',
                    }}
                >

                    {label}

                </div>


                <div
                    style={{
                        fontSize: 28,
                        lineHeight: 1,
                        fontWeight: 800,
                        color: valueColor,
                    }}
                >

                    {value}

                </div>
            </div>

        </div>
    );
}