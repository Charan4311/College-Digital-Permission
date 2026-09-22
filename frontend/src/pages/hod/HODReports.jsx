import React, { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import PermissionRequestsTrend from "../../components/PermissionRequestsTrend";
import api from '../../lib/api';

import {
    ResponsiveContainer,
    BarChart,
    Bar,
    LineChart,
    Line,
    AreaChart,
    Area,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    LabelList,
} from 'recharts';

import {
    FileText,
    CheckCircle2,
    Clock3,
    XCircle,
    CalendarDays,
    RefreshCw,
    BarChart3,
    FileSpreadsheet,
    FileDown,
    X,
    Building2,
    ChevronDown,
} from 'lucide-react';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';


// ============================================================
// CONSTANTS
// ============================================================

const BRANCHES = [
    'CSM',
    'CAI',
    'CSD',
    'AID',
    'CSC',
];

const REQUEST_TYPES = [
    {
        value: 'OUTPASS',
        label: 'Out-Pass',
    },
    {
        value: 'MESS_FEE',
        label: 'Mess Fee',
    },
    {
        value: 'INTERNSHIP',
        label: 'Internship',
    },
    {
        value: 'LIBRARY',
        label: 'Library',
    },
];

const PERIODS = [
    {
        value: 'TODAY',
        label: 'Today',
    },
    {
        value: 'THIS_WEEK',
        label: 'This Week',
    },
    {
        value: 'THIS_MONTH',
        label: 'This Month',
    },
    {
        value: 'LAST_MONTH',
        label: 'Last Month',
    },
    {
        value: 'THIS_YEAR',
        label: 'This Year',
    },
];


// ============================================================
// HELPERS
// ============================================================

const normalizeStatus = (value) => {
    return String(value || '')
        .trim()
        .toUpperCase();
};


const normalizeRequestType = (value) => {
    const type = String(value || '')
        .trim()
        .toUpperCase()
        .replace(/[\s-]+/g, '_');

    if (
        type === 'OUTPASS' ||
        type === 'OUT_PASS' ||
        type === 'CAMPUS_OUTPASS' ||
        type === 'CAMPUS_OUT_PASS'
    ) {
        return 'OUTPASS';
    }

    if (
        type === 'MESS' ||
        type === 'MESS_FEE' ||
        type === 'MESSFEE'
    ) {
        return 'MESS_FEE';
    }

    if (type === 'INTERNSHIP') {
        return 'INTERNSHIP';
    }

    if (type === 'LIBRARY') {
        return 'LIBRARY';
    }

    return type || 'OUTPASS';
};


const requestTypeLabel = (value) => {
    const normalized = normalizeRequestType(value);

    const found = REQUEST_TYPES.find(
        (item) => item.value === normalized
    );

    if (found) {
        return found.label;
    }

    return String(value || 'Other')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (letter) =>
            letter.toUpperCase()
        );
};


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


const getStudentName = (request) => {
    return (
        request?.studentId?.name ||
        request?.student?.name ||
        request?.studentName ||
        'Unknown Student'
    );
};


const getRollNumber = (request) => {
    return (
        request?.studentId?.rollNo ||
        request?.student?.rollNo ||
        request?.rollNo ||
        '-'
    );
};


const getYear = (request) => {
    return (
        request?.year ||
        request?.studentId?.year ||
        request?.student?.year ||
        '-'
    );
};


const getStudentType = (request) => {
    const value = String(
        request?.studentType ||
        request?.studentId?.studentType ||
        request?.student?.studentType ||
        ''
    )
        .trim()
        .toUpperCase()
        .replace(/[\s-]+/g, '_');

    if (
        value.includes('HOSTEL') ||
        value.includes('HOSTELER')
    ) {
        return 'Hosteler';
    }

    if (
        value.includes('DAY') ||
        value.includes('SCHOLAR')
    ) {
        return 'Day Scholar';
    }

    return 'Unknown';
};


const getRequestDate = (request) => {
    return (
        request?.createdAt ||
        request?.requestDate ||
        request?.submittedAt ||
        request?.date ||
        null
    );
};


const parseDate = (value) => {
    if (!value) {
        return null;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date;
};


const toDateInput = (date) => {
    if (!date) {
        return '';
    }

    return `${date.getFullYear()}-${String(
        date.getMonth() + 1
    ).padStart(2, '0')}-${String(
        date.getDate()
    ).padStart(2, '0')}`;
};


const formatDate = (value) => {
    const date = parseDate(value);

    if (!date) {
        return '-';
    }

    return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
};


const formatLongDate = (value) => {
    const date = parseDate(value);

    if (!date) {
        return '-';
    }

    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
};


const getStatusCategory = (request) => {
    const status = normalizeStatus(
        request?.status
    );

    if (status.startsWith('REJECTED')) {
        return 'Rejected';
    }

    if (status.startsWith('PENDING')) {
        return 'Pending';
    }

    if (
        [
            'APPROVED',
            'ISSUED',
            'USED',
            'CLEARED',
            'COMPLETED',
        ].includes(status)
    ) {
        return 'Approved';
    }

    return 'Pending';
};


const getPercentage = (value, total) => {
    if (!total) {
        return 0;
    }

    return Math.round(
        (value / total) * 100
    );
};


// ============================================================
// DATE PERIOD CALCULATOR
// ============================================================

const getPeriodRange = (period) => {
    const now = new Date();

    const start = new Date(now);
    const end = new Date(now);

    if (period === 'TODAY') {
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
    }

    if (period === 'THIS_WEEK') {
        const day = start.getDay();

        const diff =
            day === 0
                ? -6
                : 1 - day;

        start.setDate(
            start.getDate() + diff
        );

        start.setHours(0, 0, 0, 0);

        end.setDate(
            start.getDate() + 6
        );

        end.setHours(
            23,
            59,
            59,
            999
        );
    }

    if (period === 'THIS_MONTH') {
        start.setDate(1);
        start.setHours(0, 0, 0, 0);

        end.setMonth(
            end.getMonth() + 1,
            0
        );

        end.setHours(
            23,
            59,
            59,
            999
        );
    }

    if (period === 'LAST_MONTH') {
        start.setMonth(
            start.getMonth() - 1,
            1
        );

        start.setHours(0, 0, 0, 0);

        end.setMonth(
            end.getMonth(),
            0
        );

        end.setHours(
            23,
            59,
            59,
            999
        );
    }

    if (period === 'THIS_QUARTER') {
        const quarter =
            Math.floor(
                now.getMonth() / 3
            );

        const firstMonth =
            quarter * 3;

        start.setMonth(
            firstMonth,
            1
        );

        start.setHours(
            0,
            0,
            0,
            0
        );

        end.setMonth(
            firstMonth + 3,
            0
        );

        end.setHours(
            23,
            59,
            59,
            999
        );
    }

    if (period === 'THIS_YEAR') {
        start.setMonth(0, 1);

        start.setHours(
            0,
            0,
            0,
            0
        );

        end.setMonth(11, 31);

        end.setHours(
            23,
            59,
            59,
            999
        );
    }

    return {
        start,
        end,
    };
};


// ============================================================
// MAIN COMPONENT
// ============================================================

export default function HODReports() {

    const [requests, setRequests] =
        useState([]);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState('');

    const [period, setPeriod] =
        useState('THIS_MONTH');

    const [fromDate, setFromDate] =
        useState('');

    const [toDate, setToDate] =
        useState('');

    const [branchFilter, setBranchFilter] =
        useState('ALL');

    const [typeFilter, setTypeFilter] =
        useState('ALL');

    const [appliedFilters, setAppliedFilters] =
        useState({
            fromDate: '',
            toDate: '',
            branch: 'ALL',
            type: 'ALL',
        });

    const [showGenerateModal, setShowGenerateModal] =
        useState(false);

    const [downloadLoading, setDownloadLoading] =
        useState('');

    const [trendRange, setTrendRange] =
        useState('30days');

    // ========================================================
    // FETCH DATA
    // ========================================================

    const fetchRequests = async () => {
        try {
            setLoading(true);
            setError('');

            const response = await api.get(
                '/outpass/all/for-me'
            );

            const data =
                response?.data?.data ||
                response?.data?.requests ||
                response?.data ||
                [];

            setRequests(
                Array.isArray(data)
                    ? data
                    : []
            );

        } catch (err) {
            console.error(
                'HOD Reports Error:',
                err
            );

            setError(
                err?.response?.data?.message ||
                'Unable to load report data.'
            );

            setRequests([]);

        } finally {
            setLoading(false);
        }
    };


    useEffect(() => {
        fetchRequests();
    }, []);


    // ========================================================
    // SET DEFAULT THIS MONTH
    // ========================================================

    useEffect(() => {
        if (period === 'CUSTOM') {
            return;
        }

        const range =
            getPeriodRange(period);

        setFromDate(
            toDateInput(range.start)
        );

        setToDate(
            toDateInput(range.end)
        );

    }, [period]);


    // ========================================================
    // GENERATE
    // ========================================================

    const handleGenerate = () => {

        let finalFrom =
            fromDate;

        let finalTo =
            toDate;

        if (period !== 'CUSTOM') {

            const range =
                getPeriodRange(period);

            finalFrom =
                toDateInput(
                    range.start
                );

            finalTo =
                toDateInput(
                    range.end
                );

            setFromDate(
                finalFrom
            );

            setToDate(
                finalTo
            );
        }

        if (
            finalFrom &&
            finalTo &&
            finalFrom > finalTo
        ) {
            setError(
                'From Date cannot be later than To Date.'
            );

            return;
        }

        setError('');

        setAppliedFilters({
            fromDate: finalFrom,
            toDate: finalTo,
            branch: branchFilter,
            type: typeFilter,
        });

        setShowGenerateModal(true);
    };


    // ========================================================
    // FILTER DATA
    // ========================================================

    const filteredRequests = useMemo(() => {

        // These are the LIVE dashboard filters.
        // Charts and KPI cards update immediately when any
        // of these values change.
        const from = fromDate;
        const to = toDate;
        const branch = branchFilter;
        const type = typeFilter;

        const start =
            from
                ? new Date(
                    `${from}T00:00:00`
                )
                : null;

        const end =
            to
                ? new Date(
                    `${to}T23:59:59.999`
                )
                : null;

        return requests.filter(
            (request) => {

                const date =
                    parseDate(
                        getRequestDate(
                            request
                        )
                    );

                if (
                    start &&
                    date &&
                    date < start
                ) {
                    return false;
                }

                if (
                    end &&
                    date &&
                    date > end
                ) {
                    return false;
                }

                if (
                    branch !== 'ALL' &&
                    getBranchName(
                        request
                    ) !== branch
                ) {
                    return false;
                }

                if (
                    type !== 'ALL' &&
                    normalizeRequestType(
                        request?.requestType
                    ) !== type
                ) {
                    return false;
                }

                return true;
            }
        );

    }, [
        requests,
        fromDate,
        toDate,
        branchFilter,
        typeFilter,
    ]);


    // ========================================================
    // FILTERED DATA USED BY KPI CARDS + BRANCH CHART
    // ========================================================
    //
    // These two dashboard sections use the filters that were
    // actually applied with "Generate Report". The Requests
    // Over Time chart is intentionally NOT connected to this
    // data path and keeps its existing trendRange logic.
    //
    const dashboardFilteredRequests = useMemo(() => {
        const hasAppliedFilters =
            Boolean(appliedFilters.fromDate) ||
            Boolean(appliedFilters.toDate) ||
            appliedFilters.branch !== 'ALL' ||
            appliedFilters.type !== 'ALL';

        const filterSet = hasAppliedFilters
            ? appliedFilters
            : {
                fromDate,
                toDate,
                branch: branchFilter,
                type: typeFilter,
            };

        const start = filterSet.fromDate
            ? new Date(`${filterSet.fromDate}T00:00:00`)
            : null;

        const end = filterSet.toDate
            ? new Date(`${filterSet.toDate}T23:59:59.999`)
            : null;

        return requests.filter((request) => {
            const requestDate = parseDate(getRequestDate(request));

            if (start && (!requestDate || requestDate < start)) {
                return false;
            }

            if (end && (!requestDate || requestDate > end)) {
                return false;
            }

            if (
                filterSet.branch !== 'ALL' &&
                getBranchName(request) !== filterSet.branch
            ) {
                return false;
            }

            if (
                filterSet.type !== 'ALL' &&
                normalizeRequestType(request?.requestType) !== filterSet.type
            ) {
                return false;
            }

            return true;
        });
    }, [
        requests,
        appliedFilters,
        fromDate,
        toDate,
        branchFilter,
        typeFilter,
    ]);


    // ========================================================
    // SUMMARY
    // ========================================================

    const summary = useMemo(() => {

        const total =
            dashboardFilteredRequests.length;

        const approved =
            dashboardFilteredRequests.filter(
                (request) =>
                    getStatusCategory(
                        request
                    ) === 'Approved'
            ).length;

        const pending =
            dashboardFilteredRequests.filter(
                (request) =>
                    getStatusCategory(
                        request
                    ) === 'Pending'
            ).length;

        const rejected =
            dashboardFilteredRequests.filter(
                (request) =>
                    getStatusCategory(
                        request
                    ) === 'Rejected'
            ).length;

        return {
            total,
            approved,
            pending,
            rejected,
        };

    }, [dashboardFilteredRequests]);


    // ========================================================
    // TREND DATA
    // ========================================================

    const trendData = useMemo(() => {

        const validRequests =
            filteredRequests
                .map((request) => ({
                    request,
                    date:
                        parseDate(
                            getRequestDate(
                                request
                            )
                        ),
                }))
                .filter(
                    (item) =>
                        item.date
                );

        if (!validRequests.length) {
            return [];
        }

        const start =
            fromDate
                ? new Date(
                    `${fromDate}T00:00:00`
                )
                : validRequests[0]
                    .date;

        const end =
            toDate
                ? new Date(
                    `${toDate}T23:59:59`
                )
                : validRequests[
                    validRequests.length - 1
                ].date;

        const difference =
            Math.ceil(
                (
                    end.getTime() -
                    start.getTime()
                ) /
                86400000
            );

        // DAILY
        if (difference <= 31) {

            const map = {};

            validRequests.forEach(
                ({
                    request,
                    date,
                }) => {

                    const key =
                        toDateInput(
                            date
                        );

                    if (!map[key]) {
                        map[key] = {
                            date,
                            total: 0,
                            approved: 0,
                            pending: 0,
                            rejected: 0,
                        };
                    }

                    map[key].total += 1;

                    const status =
                        getStatusCategory(
                            request
                        );

                    if (
                        status ===
                        'Approved'
                    ) {
                        map[key]
                            .approved += 1;
                    }

                    if (
                        status ===
                        'Pending'
                    ) {
                        map[key]
                            .pending += 1;
                    }

                    if (
                        status ===
                        'Rejected'
                    ) {
                        map[key]
                            .rejected += 1;
                    }
                }
            );

            return Object.values(map)
                .sort(
                    (a, b) =>
                        a.date -
                        b.date
                )
                .map((item) => ({
                    label:
                        item.date.toLocaleDateString(
                            'en-US',
                            {
                                day: '2-digit',
                                month: 'short',
                            }
                        ),
                    total:
                        item.total,
                    approved:
                        item.approved,
                    pending:
                        item.pending,
                    rejected:
                        item.rejected,
                }));
        }


        // MONTHLY
        const map = {};

        validRequests.forEach(
            ({
                request,
                date,
            }) => {

                const key =
                    `${date.getFullYear()}-${date.getMonth()}`;

                if (!map[key]) {
                    map[key] = {
                        date:
                            new Date(
                                date.getFullYear(),
                                date.getMonth(),
                                1
                            ),
                        total: 0,
                        approved: 0,
                        pending: 0,
                        rejected: 0,
                    };
                }

                map[key].total += 1;

                const status =
                    getStatusCategory(
                        request
                    );

                if (
                    status ===
                    'Approved'
                ) {
                    map[key]
                        .approved += 1;
                }

                if (
                    status ===
                    'Pending'
                ) {
                    map[key]
                        .pending += 1;
                }

                if (
                    status ===
                    'Rejected'
                ) {
                    map[key]
                        .rejected += 1;
                }
            }
        );

        return Object.values(map)
            .sort(
                (a, b) =>
                    a.date -
                    b.date
            )
            .map((item) => ({
                label:
                    item.date.toLocaleDateString(
                        'en-US',
                        {
                            month: 'short',
                            day: 'numeric',
                        }
                    ),
                total:
                    item.total,
                approved:
                    item.approved,
                pending:
                    item.pending,
                rejected:
                    item.rejected,
            }));

    }, [
        filteredRequests,
        fromDate,
        toDate,
    ]);

    const rangeTrendData = useMemo(() => {
        const branch = branchFilter;
        const type = typeFilter;

        const now = new Date();
        now.setHours(23, 59, 59, 999);

        let start = new Date(now);
        start.setHours(0, 0, 0, 0);

        let groupType = 'DAY';
        const map = {};

        if (trendRange === '7days') {
            start.setDate(now.getDate() - 6);
            for (let d = new Date(start); d <= now; d.setDate(d.getDate() + 1)) {
                const key = toDateInput(d);
                map[key] = { date: new Date(d), total: 0, approved: 0, pending: 0, rejected: 0 };
            }
        } else if (trendRange === '30days') {
            start.setDate(now.getDate() - 29);
            for (let d = new Date(start); d <= now; d.setDate(d.getDate() + 1)) {
                const key = toDateInput(d);
                map[key] = { date: new Date(d), total: 0, approved: 0, pending: 0, rejected: 0 };
            }
        } else if (trendRange === '6months') {
            start.setMonth(now.getMonth() - 5, 1);
            groupType = 'MONTH';
            for (let d = new Date(start); d <= now; d.setMonth(d.getMonth() + 1)) {
                const key = `${d.getFullYear()}-${d.getMonth()}`;
                map[key] = { date: new Date(d.getFullYear(), d.getMonth(), 1), total: 0, approved: 0, pending: 0, rejected: 0 };
            }
        } else if (trendRange === 'thisyear') {
            start.setMonth(0, 1);
            groupType = 'MONTH';
            for (let d = new Date(start); d <= now; d.setMonth(d.getMonth() + 1)) {
                const key = `${d.getFullYear()}-${d.getMonth()}`;
                map[key] = { date: new Date(d.getFullYear(), d.getMonth(), 1), total: 0, approved: 0, pending: 0, rejected: 0 };
            }
        }

        const validRequests = requests.map((request) => ({
            request,
            date: parseDate(getRequestDate(request)),
        })).filter(item => {
            if (!item.date) return false;
            if (item.date < start || item.date > now) return false;

            if (branch !== 'ALL' && getBranchName(item.request) !== branch) {
                return false;
            }
            if (type !== 'ALL' && normalizeRequestType(item.request?.requestType) !== type) {
                return false;
            }
            return true;
        });

        validRequests.forEach(({ request, date }) => {
            let key;
            if (groupType === 'DAY') {
                key = toDateInput(date);
            } else {
                key = `${date.getFullYear()}-${date.getMonth()}`;
            }

            if (map[key]) {
                map[key].total += 1;
                const status = getStatusCategory(request);
                if (status === 'Approved') map[key].approved += 1;
                if (status === 'Pending') map[key].pending += 1;
                if (status === 'Rejected') map[key].rejected += 1;
            }
        });

        return Object.values(map)
            .sort((a, b) => a.date - b.date)
            .map((item) => {
                let labelStr = '';
                if (groupType === 'DAY') {
                    labelStr = item.date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
                } else {
                    if (trendRange === 'thisyear') {
                        labelStr = item.date.toLocaleDateString('en-US', { month: 'short' });
                    } else {
                        labelStr = item.date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                    }
                }
                return {
                    label: labelStr,
                    total: item.total,
                    approved: item.approved,
                    pending: item.pending,
                    rejected: item.rejected,
                };
            });
    }, [requests, trendRange, branchFilter, typeFilter]);


    // ========================================================
    // BRANCH DATA
    // ========================================================

    const branchData = useMemo(() => {

        // Always show all five configured branches.
        // The counts below use the same applied filter set
        // as the KPI cards. The Requests Over Time chart is
        // intentionally left on its existing independent logic.
        return BRANCHES.map((branch) => {

            const count = dashboardFilteredRequests.filter(
                (request) =>
                    getBranchName(request) === branch
            ).length;

            return {
                branch,
                requests: count,
            };
        });

    }, [dashboardFilteredRequests]);

    // ========================================================
    // TYPE DATA
    // ========================================================

    const requestTypeData =
        useMemo(() => {

            const counts = {};

            filteredRequests.forEach((request) => {
                const type = normalizeRequestType(
                    request?.requestType
                );

                if (!type) return;

                counts[type] =
                    (counts[type] || 0) + 1;
            });

            return Object.entries(counts)
                .sort((a, b) => b[1] - a[1])
                .map(([type, requests]) => ({
                    type: requestTypeLabel(type),
                    requests,
                }));

        }, [filteredRequests]);


    // ========================================================
    // STUDENT TYPE DATA
    // ========================================================

    const studentTypeData =
        useMemo(() => {

            return [
                {
                    name: 'Day Scholar',
                    value:
                        filteredRequests.filter(
                            (request) =>
                                getStudentType(
                                    request
                                ) ===
                                'Day Scholar'
                        ).length,
                },
                {
                    name: 'Hosteler',
                    value:
                        filteredRequests.filter(
                            (request) =>
                                getStudentType(
                                    request
                                ) ===
                                'Hosteler'
                        ).length,
                },
            ];

        }, [filteredRequests]);


    // ========================================================
    // REPORT LABELS
    // ========================================================

    const reportPeriod =
        appliedFilters.fromDate &&
            appliedFilters.toDate
            ? `${formatLongDate(
                appliedFilters.fromDate
            )} – ${formatLongDate(
                appliedFilters.toDate
            )}`
            : 'Selected Period';


    const reportBranch =
        appliedFilters.branch === 'ALL'
            ? 'All Branches'
            : appliedFilters.branch;


    const reportType =
        appliedFilters.type === 'ALL'
            ? 'All Permission Types'
            : requestTypeLabel(
                appliedFilters.type
            );


    // ========================================================
    // PDF
    // ========================================================

    const downloadPDF = () => {

        try {

            setDownloadLoading('pdf');

            const doc =
                new jsPDF({
                    orientation:
                        'landscape',
                    unit: 'mm',
                    format: 'a4',
                });

            doc.setFontSize(20);
            doc.setTextColor(
                40,
                45,
                90
            );

            doc.text(
                'Digital Permission',
                14,
                16
            );

            doc.setFontSize(14);

            doc.text(
                'Department Report',
                14,
                24
            );

            doc.setFontSize(9);

            doc.setTextColor(
                100,
                100,
                110
            );

            doc.text(
                `Period: ${reportPeriod}`,
                14,
                32
            );

            doc.text(
                `Branch: ${reportBranch}`,
                14,
                38
            );

            doc.text(
                `Permission Type: ${reportType}`,
                14,
                44
            );


            doc.setFontSize(12);

            doc.setTextColor(
                40,
                45,
                90
            );

            doc.text(
                'Summary',
                14,
                55
            );


            autoTable(doc, {
                startY: 59,

                head: [
                    [
                        'Total Requests',
                        'Approved',
                        'Pending',
                        'Rejected',
                    ],
                ],

                body: [
                    [
                        summary.total,
                        summary.approved,
                        summary.pending,
                        summary.rejected,
                    ],
                ],

                theme: 'grid',

                headStyles: {
                    fillColor: [
                        91,
                        78,
                        220,
                    ],
                },
            });


            let y =
                doc.lastAutoTable.finalY +
                12;

            doc.text(
                'Branch-wise Requests',
                14,
                y
            );


            autoTable(doc, {
                startY: y + 4,

                head: [
                    [
                        'Branch',
                        'Requests',
                    ],
                ],

                body:
                    branchData.map(
                        (item) => [
                            item.branch,
                            item.requests,
                        ]
                    ),

                theme: 'grid',

                headStyles: {
                    fillColor: [
                        91,
                        78,
                        220,
                    ],
                },
            });


            y =
                doc.lastAutoTable.finalY +
                12;

            doc.text(
                'Permission Type',
                14,
                y
            );


            autoTable(doc, {
                startY: y + 4,

                head: [
                    [
                        'Permission Type',
                        'Requests',
                    ],
                ],

                body:
                    requestTypeData.map(
                        (item) => [
                            item.type,
                            item.requests,
                        ]
                    ),

                theme: 'grid',

                headStyles: {
                    fillColor: [
                        91,
                        78,
                        220,
                    ],
                },
            });


            doc.addPage();

            doc.setFontSize(14);

            doc.text(
                'Request Details',
                14,
                16
            );


            autoTable(doc, {
                startY: 22,

                head: [
                    [
                        '#',
                        'Student',
                        'Roll No',
                        'Branch',
                        'Year',
                        'Student Type',
                        'Permission Type',
                        'Status',
                        'Date',
                    ],
                ],

                body:
                    filteredRequests.map(
                        (
                            request,
                            index
                        ) => [
                                index + 1,
                                getStudentName(
                                    request
                                ),
                                getRollNumber(
                                    request
                                ),
                                getBranchName(
                                    request
                                ),
                                getYear(
                                    request
                                ),
                                getStudentType(
                                    request
                                ),
                                requestTypeLabel(
                                    request?.requestType
                                ),
                                getStatusCategory(
                                    request
                                ),
                                formatDate(
                                    getRequestDate(
                                        request
                                    )
                                ),
                            ]
                    ),

                theme: 'striped',

                styles: {
                    fontSize: 7,
                },

                headStyles: {
                    fillColor: [
                        91,
                        78,
                        220,
                    ],
                    fontSize: 7,
                },
            });


            doc.save(
                `Department_Report_${reportBranch.replace(
                    /\s+/g,
                    '_'
                )}.pdf`
            );

        } catch (err) {

            console.error(
                'PDF Error:',
                err
            );

            setError(
                'Unable to generate PDF.'
            );

        } finally {
            setDownloadLoading('');
        }
    };


    // ========================================================
    // EXCEL
    // ========================================================

    const downloadExcel = () => {

        try {

            setDownloadLoading(
                'excel'
            );

            const workbook =
                XLSX.utils.book_new();


            const summarySheet =
                XLSX.utils.aoa_to_sheet([
                    [
                        'DIGITAL PERMISSION',
                    ],
                    [
                        'DEPARTMENT REPORT',
                    ],
                    [],
                    [
                        'Report Period',
                        reportPeriod,
                    ],
                    [
                        'Branch',
                        reportBranch,
                    ],
                    [
                        'Permission Type',
                        reportType,
                    ],
                    [],
                    [
                        'Metric',
                        'Value',
                        'Percentage',
                    ],
                    [
                        'Total Requests',
                        summary.total,
                        '100%',
                    ],
                    [
                        'Approved',
                        summary.approved,
                        `${getPercentage(
                            summary.approved,
                            summary.total
                        )}%`,
                    ],
                    [
                        'Pending',
                        summary.pending,
                        `${getPercentage(
                            summary.pending,
                            summary.total
                        )}%`,
                    ],
                    [
                        'Rejected',
                        summary.rejected,
                        `${getPercentage(
                            summary.rejected,
                            summary.total
                        )}%`,
                    ],
                ]);


            summarySheet['!cols'] = [
                {
                    width: 28,
                },
                {
                    width: 35,
                },
                {
                    width: 18,
                },
            ];


            XLSX.utils.book_append_sheet(
                workbook,
                summarySheet,
                'Summary'
            );


            const branchSheet =
                XLSX.utils.aoa_to_sheet([
                    [
                        'Branch',
                        'Requests',
                    ],

                    ...branchData.map(
                        (item) => [
                            item.branch,
                            item.requests,
                        ]
                    ),
                ]);


            XLSX.utils.book_append_sheet(
                workbook,
                branchSheet,
                'Branch Analysis'
            );


            const typeSheet =
                XLSX.utils.aoa_to_sheet([
                    [
                        'Permission Type',
                        'Requests',
                    ],

                    ...requestTypeData.map(
                        (item) => [
                            item.type,
                            item.requests,
                        ]
                    ),
                ]);


            XLSX.utils.book_append_sheet(
                workbook,
                typeSheet,
                'Permission Types'
            );


            const studentSheet =
                XLSX.utils.aoa_to_sheet([
                    [
                        'Student Type',
                        'Requests',
                        'Percentage',
                    ],

                    ...studentTypeData.map(
                        (item) => [
                            item.name,
                            item.value,
                            `${getPercentage(
                                item.value,
                                summary.total
                            )}%`,
                        ]
                    ),
                ]);


            XLSX.utils.book_append_sheet(
                workbook,
                studentSheet,
                'Student Type'
            );


            const detailSheet =
                XLSX.utils.aoa_to_sheet([
                    [
                        '#',
                        'Student Name',
                        'Roll Number',
                        'Branch',
                        'Year',
                        'Student Type',
                        'Permission Type',
                        'Status',
                        'Date',
                    ],

                    ...filteredRequests.map(
                        (
                            request,
                            index
                        ) => [
                                index + 1,
                                getStudentName(
                                    request
                                ),
                                getRollNumber(
                                    request
                                ),
                                getBranchName(
                                    request
                                ),
                                getYear(
                                    request
                                ),
                                getStudentType(
                                    request
                                ),
                                requestTypeLabel(
                                    request?.requestType
                                ),
                                getStatusCategory(
                                    request
                                ),
                                formatDate(
                                    getRequestDate(
                                        request
                                    )
                                ),
                            ]
                    ),
                ]);


            detailSheet['!cols'] = [
                { width: 6 },
                { width: 28 },
                { width: 18 },
                { width: 12 },
                { width: 10 },
                { width: 18 },
                { width: 20 },
                { width: 14 },
                { width: 18 },
            ];


            XLSX.utils.book_append_sheet(
                workbook,
                detailSheet,
                'Request Details'
            );


            XLSX.writeFile(
                workbook,
                `Department_Report_${reportBranch.replace(
                    /\s+/g,
                    '_'
                )}.xlsx`
            );

        } catch (err) {

            console.error(
                'Excel Error:',
                err
            );

            setError(
                'Unable to generate Excel.'
            );

        } finally {
            setDownloadLoading('');
        }
    };


    // ========================================================
    // RENDER
    // ========================================================

    return (
        <DashboardLayout>

            <div
                className="page-content"
                style={{
                    paddingBottom: 30,
                }}
            >

                {/* =================================================
                    HEADER
                ================================================= */}

                <div
                    style={{
                        display:
                            'flex',
                        justifyContent:
                            'space-between',
                        alignItems:
                            'flex-start',
                        marginBottom: 15,
                    }}
                >

                    <div>

                        <h1
                            style={{
                                margin: 0,
                                fontSize: 25,
                                fontWeight: 800,
                                color:
                                    'var(--text)',
                                letterSpacing:
                                    '-0.5px',
                            }}
                        >
                            Department Reports
                        </h1>

                        <p
                            style={{
                                margin:
                                    '4px 0 0',
                                fontSize: 12,
                                color:
                                    'var(--text-muted)',
                            }}
                        >
                            Insights and analytics
                            for your department
                        </p>

                    </div>


                    <div
                        style={{
                            fontSize: 9,
                            color:
                                'var(--text-muted)',
                            marginTop: 3,
                        }}
                    >
                        Last updated:{' '}
                        {new Date().toLocaleDateString(
                            'en-GB',
                            {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                            }
                        )}
                    </div>

                </div>


                {/* =================================================
                    FILTERS
                ================================================= */}

                <div
                    className="card"
                    style={{
                        padding:
                            '12px 13px',
                        marginBottom: 12,
                    }}
                >

                    <div
                        style={{
                            fontSize: 10,
                            fontWeight: 800,
                            color:
                                'var(--text)',
                            marginBottom: 7,
                        }}
                    >
                        Filters
                    </div>


                    {/* DATE + FILTERS */}

                    <div
                        className="report-control-grid"
                        style={{
                            display:
                                'grid',
                            gridTemplateColumns:
                                '1fr 1fr 1fr 1fr auto',
                            gap: 8,
                            alignItems:
                                'end',
                        }}
                    >

                        <DateField
                            label="From Date"
                            value={
                                fromDate
                            }
                            onChange={
                                setFromDate
                            }
                        />

                        <DateField
                            label="To Date"
                            value={
                                toDate
                            }
                            onChange={
                                setToDate
                            }
                        />


                        {/* PERMISSION TYPE */}

                        <SelectField
                            label="Permission Type"
                            value={
                                typeFilter
                            }
                            onChange={
                                setTypeFilter
                            }
                            icon={
                                <FileText
                                    size={13}
                                />
                            }
                        >

                            <option value="ALL">
                                All Types
                            </option>

                            {REQUEST_TYPES.map(
                                (item) => (
                                    <option
                                        key={
                                            item.value
                                        }
                                        value={
                                            item.value
                                        }
                                    >
                                        {
                                            item.label
                                        }
                                    </option>
                                )
                            )}

                        </SelectField>


                        {/* BRANCH */}

                        <SelectField
                            label="Branch"
                            value={
                                branchFilter
                            }
                            onChange={
                                setBranchFilter
                            }
                            icon={
                                <Building2
                                    size={13}
                                />
                            }
                        >

                            <option value="ALL">
                                All Branches
                            </option>

                            {BRANCHES.map(
                                (branch) => (
                                    <option
                                        key={
                                            branch
                                        }
                                        value={
                                            branch
                                        }
                                    >
                                        {branch}
                                    </option>
                                )
                            )}

                        </SelectField>


                        <button
                            type="button"
                            onClick={
                                handleGenerate
                            }
                            className="btn btn-primary"
                            style={{
                                height: 36,
                                padding:
                                    '0 14px',
                                display:
                                    'inline-flex',
                                alignItems:
                                    'center',
                                justifyContent:
                                    'center',
                                gap: 6,
                                fontSize: 10,
                                whiteSpace:
                                    'nowrap',
                            }}
                        >
                            <FileDown
                                size={14}
                            />

                            Generate Report
                        </button>

                    </div>

                </div>


                {/* ERROR */}

                {error && (

                    <div
                        style={{
                            padding:
                                '9px 12px',
                            marginBottom: 12,
                            borderRadius: 7,
                            background:
                                '#fef2f2',
                            color:
                                '#dc2626',
                            fontSize: 11,
                        }}
                    >
                        {error}
                    </div>

                )}


                {/* =================================================
                    KPI CARDS
                ================================================= */}

                <div
                    className="report-kpi-grid"
                    style={{
                        display:
                            'grid',
                        gridTemplateColumns:
                            'repeat(4, 1fr)',
                        gap: 9,
                        marginBottom: 11,
                    }}
                >

                    <KpiCard
                        icon={
                            <FileText
                                size={17}
                            />
                        }
                        label="Total Requests"
                        value={
                            summary.total
                        }
                        color="#2563eb"
                        background="#eff6ff"
                        subtitle="selected period"
                    />

                    <KpiCard
                        icon={
                            <CheckCircle2
                                size={17}
                            />
                        }
                        label="Approved"
                        value={
                            summary.approved
                        }
                        color="#10b981"
                        background="#ecfdf5"
                        subtitle={`${getPercentage(
                            summary.approved,
                            summary.total
                        )}% of total`}
                    />

                    <KpiCard
                        icon={
                            <Clock3
                                size={17}
                            />
                        }
                        label="Pending"
                        value={
                            summary.pending
                        }
                        color="#f59e0b"
                        background="#fff7ed"
                        subtitle={`${getPercentage(
                            summary.pending,
                            summary.total
                        )}% of total`}
                    />

                    <KpiCard
                        icon={
                            <XCircle
                                size={17}
                            />
                        }
                        label="Rejected"
                        value={
                            summary.rejected
                        }
                        color="#ef4444"
                        background="#fef2f2"
                        subtitle={`${getPercentage(
                            summary.rejected,
                            summary.total
                        )}% of total`}
                    />

                </div>


                {/* =================================================
                    LOADING
                ================================================= */}

                {loading ? (

                    <div
                        className="card"
                        style={{
                            minHeight: 400,
                            display:
                                'flex',
                            alignItems:
                                'center',
                            justifyContent:
                                'center',
                            flexDirection:
                                'column',
                            gap: 8,
                        }}
                    >

                        <RefreshCw
                            size={24}
                            style={{
                                color:
                                    'var(--accent)',
                                animation:
                                    'hodReportsSpin 1s linear infinite',
                            }}
                        />

                        <span
                            style={{
                                fontSize: 11,
                                color:
                                    'var(--text-muted)',
                            }}
                        >
                            Loading report data...
                        </span>

                    </div>

                ) : !filteredRequests.length ? (

                    <div
                        className="card"
                        style={{
                            minHeight: 380,
                            display:
                                'flex',
                            alignItems:
                                'center',
                            justifyContent:
                                'center',
                            flexDirection:
                                'column',
                            textAlign:
                                'center',
                        }}
                    >

                        <BarChart3
                            size={38}
                            style={{
                                color:
                                    'var(--text-muted)',
                                marginBottom:
                                    8,
                            }}
                        />

                        <h3
                            style={{
                                margin:
                                    '0 0 4px',
                                fontSize: 15,
                                color:
                                    'var(--text)',
                            }}
                        >
                            No Report Data
                        </h3>

                        <p
                            style={{
                                margin: 0,
                                fontSize: 11,
                                color:
                                    'var(--text-muted)',
                            }}
                        >
                            No requests match
                            the selected
                            filters.
                        </p>

                    </div>

                ) : (

                    <>

                        {/* =================================================
                            ROW 1 — TREND + BRANCH
                        ================================================= */}

                        <div
                            className="report-chart-row"
                            style={{
                                display:
                                    'grid',
                                gridTemplateColumns:
                                    '1.45fr 1fr',
                                gap: 10,
                                marginBottom: 10,
                            }}
                        >

                            {/* REQUESTS OVER TIME */}

                            <div
                                className="card"
                                style={{
                                    padding:
                                        '11px 12px 6px',
                                    minWidth:
                                        0,
                                }}
                            >

                                <ChartHeader
                                    title="Requests Over Time"
                                    subtitle="Request activity during the selected period"
                                />

                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        padding: 4,
                                        background: '#f1f5f9',
                                        borderRadius: 10,
                                        marginTop: 10,
                                        marginBottom: 10,
                                        width: 'fit-content'
                                    }}
                                >
                                    {[
                                        { label: 'Last 7 days', value: '7days' },
                                        { label: 'Last 30 days', value: '30days' },
                                        { label: 'Last 6 months', value: '6months' },
                                        { label: 'This year', value: 'thisyear' },
                                    ].map((tab) => {
                                        const active = trendRange === tab.value;
                                        return (
                                            <button
                                                key={tab.value}
                                                type="button"
                                                onClick={() => setTrendRange(tab.value)}
                                                style={{
                                                    border: 'none',
                                                    background: active ? '#2563eb' : 'transparent',
                                                    color: active ? '#ffffff' : '#475569',
                                                    padding: '5px 10px',
                                                    borderRadius: 8,
                                                    fontSize: 9,
                                                    fontWeight: 600,
                                                    cursor: 'pointer',
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                {tab.label}
                                            </button>
                                        );
                                    })}
                                </div>

                                <div
                                    style={{
                                        height: 185,
                                        width:
                                            '100%',
                                    }}
                                >

                                    <DynamicTrendChart
                                        data={rangeTrendData}
                                    />

                                </div>

                            </div>


                            {/* BRANCH */}

                            <div
                                className="card"
                                style={{
                                    padding:
                                        '11px 12px 6px',
                                    minWidth:
                                        0,
                                }}
                            >

                                <ChartHeader
                                    title="Requests by Branch"
                                    subtitle="Branch-wise request count"
                                />

                                <div
                                    style={{
                                        height: 180,
                                    }}
                                >

                                    <ResponsiveContainer
                                        width="100%"
                                        height="100%"
                                    >

                                        <BarChart
                                            data={
                                                branchData
                                            }
                                            margin={{
                                                top: 18,
                                                right: 8,
                                                left: -20,
                                                bottom: 0,
                                            }}
                                        >

                                            <CartesianGrid
                                                strokeDasharray="3 3"
                                                stroke="#e8ebf2"
                                            />

                                            <XAxis
                                                dataKey="branch"
                                                tick={{
                                                    fontSize: 8,
                                                    fill:
                                                        '#7d8497',
                                                }}
                                                axisLine={{
                                                    stroke:
                                                        '#e5e7ef',
                                                }}
                                                tickLine={
                                                    false
                                                }
                                            />

                                            <YAxis
                                                allowDecimals={
                                                    false
                                                }
                                                tick={{
                                                    fontSize: 8,
                                                    fill:
                                                        '#7d8497',
                                                }}
                                                axisLine={
                                                    false
                                                }
                                                tickLine={
                                                    false
                                                }
                                            />

                                            <Tooltip
                                                contentStyle={{
                                                    borderRadius:
                                                        8,
                                                    fontSize:
                                                        10,
                                                }}
                                            />

                                            <Bar
                                                dataKey="requests"
                                                name="Requests"
                                                fill="#9181ed"
                                                radius={[
                                                    4,
                                                    4,
                                                    0,
                                                    0,
                                                ]}
                                                maxBarSize={
                                                    35
                                                }
                                            >
                                                <LabelList
                                                    dataKey="requests"
                                                    position="top"
                                                    fill="#25324b"
                                                    fontSize={9}
                                                    fontWeight={700}
                                                />
                                            </Bar>

                                        </BarChart>

                                    </ResponsiveContainer>

                                </div>

                            </div>



                        </div>


                    </>

                )}

            </div>


            {/* ============================================================
                GENERATE REPORT MODAL
            ============================================================ */}

            {showGenerateModal && (

                <div
                    style={{
                        position:
                            'fixed',
                        inset: 0,
                        zIndex: 9999,
                        background:
                            'rgba(15,23,42,0.45)',
                        backdropFilter:
                            'blur(3px)',
                        display:
                            'flex',
                        alignItems:
                            'center',
                        justifyContent:
                            'center',
                        padding: 20,
                    }}
                    onMouseDown={(event) => {

                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            setShowGenerateModal(
                                false
                            );
                        }

                    }}
                >

                    <div
                        className="card"
                        style={{
                            width:
                                '100%',
                            maxWidth:
                                490,
                            padding: 20,
                            boxShadow:
                                '0 20px 60px rgba(0,0,0,0.18)',
                        }}
                    >

                        {/* HEADER */}

                        <div
                            style={{
                                display:
                                    'flex',
                                justifyContent:
                                    'space-between',
                                alignItems:
                                    'flex-start',
                                marginBottom:
                                    16,
                            }}
                        >

                            <div
                                style={{
                                    display:
                                        'flex',
                                    alignItems:
                                        'center',
                                    gap: 9,
                                }}
                            >

                                <div
                                    style={{
                                        width: 35,
                                        height: 35,
                                        borderRadius:
                                            9,
                                        background:
                                            'var(--accent-dim)',
                                        color:
                                            'var(--accent)',
                                        display:
                                            'flex',
                                        alignItems:
                                            'center',
                                        justifyContent:
                                            'center',
                                    }}
                                >
                                    <FileDown
                                        size={18}
                                    />
                                </div>

                                <div>

                                    <h2
                                        style={{
                                            margin: 0,
                                            fontSize:
                                                17,
                                            fontWeight:
                                                800,
                                            color:
                                                'var(--text)',
                                        }}
                                    >
                                        Generate Report
                                    </h2>

                                    <p
                                        style={{
                                            margin:
                                                '3px 0 0',
                                            fontSize:
                                                10,
                                            color:
                                                'var(--text-muted)',
                                        }}
                                    >
                                        Choose a format
                                        to download
                                        the selected
                                        report.
                                    </p>

                                </div>

                            </div>


                            <button
                                type="button"
                                onClick={() =>
                                    setShowGenerateModal(
                                        false
                                    )
                                }
                                style={{
                                    border:
                                        'none',
                                    background:
                                        '#f3f4f6',
                                    width: 29,
                                    height: 29,
                                    borderRadius:
                                        7,
                                    display:
                                        'flex',
                                    alignItems:
                                        'center',
                                    justifyContent:
                                        'center',
                                    cursor:
                                        'pointer',
                                    color:
                                        '#6b7280',
                                }}
                            >
                                <X
                                    size={15}
                                />
                            </button>

                        </div>


                        {/* REPORT DETAILS */}

                        <div
                            style={{
                                border:
                                    '1px solid var(--border)',
                                borderRadius:
                                    9,
                                padding:
                                    12,
                                marginBottom:
                                    15,
                            }}
                        >

                            <div
                                style={{
                                    display:
                                        'grid',
                                    gridTemplateColumns:
                                        '1fr 1fr',
                                    gap: 12,
                                }}
                            >

                                <InfoItem
                                    label="Report Period"
                                    value={
                                        reportPeriod
                                    }
                                />

                                <InfoItem
                                    label="Branch"
                                    value={
                                        reportBranch
                                    }
                                />

                                <InfoItem
                                    label="Permission Type"
                                    value={
                                        reportType
                                    }
                                />

                                <InfoItem
                                    label="Total Requests"
                                    value={
                                        summary.total
                                    }
                                />

                            </div>

                        </div>


                        {/* INCLUDED */}

                        <div
                            style={{
                                marginBottom:
                                    15,
                            }}
                        >

                            <div
                                style={{
                                    fontSize:
                                        10,
                                    fontWeight:
                                        800,
                                    color:
                                        'var(--text)',
                                    marginBottom:
                                        7,
                                }}
                            >
                                Report Includes
                            </div>

                            <div
                                style={{
                                    display:
                                        'grid',
                                    gridTemplateColumns:
                                        '1fr 1fr',
                                    gap: 6,
                                }}
                            >

                                {[
                                    'Summary',
                                    'Requests Over Time',
                                    'Branch-wise Analysis',
                                    'Permission Type Analysis',
                                    'Student Type Distribution',
                                    'Request Details',
                                ].map(
                                    (
                                        item
                                    ) => (

                                        <div
                                            key={
                                                item
                                            }
                                            style={{
                                                display:
                                                    'flex',
                                                alignItems:
                                                    'center',
                                                gap: 5,
                                                fontSize:
                                                    9,
                                                color:
                                                    'var(--text-muted)',
                                            }}
                                        >

                                            <CheckCircle2
                                                size={12}
                                                style={{
                                                    color:
                                                        '#10b981',
                                                }}
                                            />

                                            {
                                                item
                                            }

                                        </div>

                                    )
                                )}

                            </div>

                        </div>


                        {/* DOWNLOAD */}

                        <div
                            style={{
                                display:
                                    'grid',
                                gridTemplateColumns:
                                    '1fr 1fr',
                                gap: 9,
                            }}
                        >

                            <button
                                type="button"
                                onClick={
                                    downloadPDF
                                }
                                disabled={
                                    !!downloadLoading
                                }
                                style={{
                                    border:
                                        '1px solid #e5e7eb',
                                    background:
                                        '#fff',
                                    borderRadius:
                                        8,
                                    padding:
                                        '11px 8px',
                                    color:
                                        '#dc2626',
                                    fontSize:
                                        10,
                                    fontWeight:
                                        800,
                                    cursor:
                                        downloadLoading
                                            ? 'not-allowed'
                                            : 'pointer',
                                    display:
                                        'flex',
                                    alignItems:
                                        'center',
                                    justifyContent:
                                        'center',
                                    gap: 6,
                                    opacity:
                                        downloadLoading
                                            ? 0.6
                                            : 1,
                                }}
                            >

                                {downloadLoading ===
                                    'pdf' ? (

                                    <RefreshCw
                                        size={15}
                                        style={{
                                            animation:
                                                'hodReportsSpin 1s linear infinite',
                                        }}
                                    />

                                ) : (

                                    <FileText
                                        size={15}
                                    />

                                )}

                                Download PDF

                            </button>


                            <button
                                type="button"
                                onClick={
                                    downloadExcel
                                }
                                disabled={
                                    !!downloadLoading
                                }
                                style={{
                                    border:
                                        '1px solid #e5e7eb',
                                    background:
                                        '#fff',
                                    borderRadius:
                                        8,
                                    padding:
                                        '11px 8px',
                                    color:
                                        '#15803d',
                                    fontSize:
                                        10,
                                    fontWeight:
                                        800,
                                    cursor:
                                        downloadLoading
                                            ? 'not-allowed'
                                            : 'pointer',
                                    display:
                                        'flex',
                                    alignItems:
                                        'center',
                                    justifyContent:
                                        'center',
                                    gap: 6,
                                    opacity:
                                        downloadLoading
                                            ? 0.6
                                            : 1,
                                }}
                            >

                                {downloadLoading ===
                                    'excel' ? (

                                    <RefreshCw
                                        size={15}
                                        style={{
                                            animation:
                                                'hodReportsSpin 1s linear infinite',
                                        }}
                                    />

                                ) : (

                                    <FileSpreadsheet
                                        size={15}
                                    />

                                )}

                                Download Excel

                            </button>

                        </div>

                    </div>

                </div>

            )}


            {/* ============================================================
                RESPONSIVE
            ============================================================ */}

            <style>
                {`

                    @keyframes hodReportsSpin {
                        from {
                            transform: rotate(0deg);
                        }

                        to {
                            transform: rotate(360deg);
                        }
                    }


                    @media (max-width: 1100px) {

                        .report-control-grid {
                            grid-template-columns:
                                1fr 1fr !important;
                        }

                        .report-control-grid
                        button {
                            width: 100%;
                        }

                    }


                    @media (max-width: 850px) {

                        .report-chart-row {
                            grid-template-columns:
                                1fr !important;
                        }

                    }


                    @media (max-width: 650px) {

                        .report-kpi-grid {
                            grid-template-columns:
                                1fr 1fr !important;
                        }

                        .report-control-grid {
                            grid-template-columns:
                                1fr !important;
                        }

                    }


                    @media (max-width: 450px) {

                        .report-kpi-grid {
                            grid-template-columns:
                                1fr !important;
                        }

                    }

                `}
            </style>

        </DashboardLayout>
    );
}


// ============================================================
// KPI CARD
// ============================================================

function KpiCard({
    icon,
    label,
    value,
    color,
    background,
    subtitle,
}) {
    return (
        <div
            className="stat-card"
            style={{
                minHeight: 68,
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            <div
                className="stat-icon"
                style={{
                    width: 34,
                    height: 34,
                    minWidth: 34,
                    borderRadius: 9,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color,
                    background,
                }}
            >
                {icon}
            </div>

            <div
                style={{
                    minWidth: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    gap: 1,
                }}
            >
                <div
                    className="stat-label"
                    style={{
                        margin: 0,
                        fontSize: 10,
                        lineHeight: 1.15,
                    }}
                >
                    {label}
                </div>

                <div
                    style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: 6,
                        whiteSpace: 'nowrap',
                    }}
                >
                    <div
                        className="stat-value"
                        style={{
                            margin: 0,
                            fontSize: 22,
                            lineHeight: 1,
                            fontWeight: 800,
                            color: label === 'Total Requests'
                                ? 'var(--text-primary)'
                                : color,
                        }}
                    >
                        {value}
                    </div>

                    {subtitle && (
                        <span
                            style={{
                                fontSize: 8,
                                lineHeight: 1.1,
                                color: 'var(--text-muted)',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {subtitle}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

// ============================================================
// DYNAMIC TREND LINE CHART
// ============================================================

function DynamicTrendChart({ data }) {
    const chartData = (data || []).map((item) => ({
        ...item,
        total:
            (Number(item.approved) || 0) +
            (Number(item.pending) || 0) +
            (Number(item.rejected) || 0),
    }));

    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={chartData}
                        margin={{
                            top: 8,
                            right: 8,
                            left: -20,
                            bottom: 2,
                        }}
                    >
                        <defs>
                            <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.22} />
                                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="approvedGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10B981" stopOpacity={0.22} />
                                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                            </linearGradient>
                        </defs>

                        <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                            stroke="#E2E8F0"
                        />

                        <XAxis
                            dataKey="label"
                            tick={{
                                fontSize: 8,
                                fill: '#667085',
                            }}
                            axisLine={{
                                stroke: '#e5e7ef',
                            }}
                            tickLine={false}
                        />

                        <YAxis
                            domain={[0, 'auto']}
                            allowDecimals={false}
                            tick={{
                                fontSize: 8,
                                fill: '#667085',
                            }}
                            axisLine={false}
                            tickLine={false}
                        />

                        <Tooltip
                            contentStyle={{
                                background: '#ffffff',
                                borderRadius: 10,
                                border: '1px solid #E2E8F0',
                                boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
                                padding: '10px 14px',
                                fontSize: 13,
                                color: '#0F172A'
                            }}
                            labelStyle={{
                                fontWeight: 600,
                                marginBottom: 4,
                                color: '#475569'
                            }}
                            formatter={(value, name) => [
                                value,
                                name === 'total'
                                    ? 'Total'
                                    : name.charAt(0).toUpperCase() + name.slice(1),
                            ]}
                        />

                        <Area
                            type="monotone"
                            dataKey="total"
                            name="total"
                            stroke="#3B82F6"
                            strokeWidth={2.5}
                            fillOpacity={1}
                            fill="url(#totalGradient)"
                            activeDot={{ r: 4 }}
                        />

                        <Area
                            type="monotone"
                            dataKey="approved"
                            name="approved"
                            stroke="#10B981"
                            strokeWidth={2.5}
                            fillOpacity={1}
                            fill="url(#approvedGradient)"
                            activeDot={{ r: 4 }}
                        />

                        <Line
                            type="monotone"
                            dataKey="pending"
                            name="pending"
                            stroke="#F59E0B"
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 4 }}
                        />

                        <Line
                            type="monotone"
                            dataKey="rejected"
                            name="rejected"
                            stroke="#EF4444"
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 4 }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 16,
                    marginTop: 8,
                    marginBottom: 4,
                }}
            >
                {[
                    { key: 'approved', label: 'Approved', color: '#10B981' },
                    { key: 'pending', label: 'Pending', color: '#F59E0B' },
                    { key: 'rejected', label: 'Rejected', color: '#EF4444' },
                    { key: 'total', label: 'Total', color: '#3B82F6' },
                ].map((item) => (
                    <div
                        key={item.key}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            fontSize: 9,
                            color: 'var(--text-muted)',
                        }}
                    >
                        <div
                            style={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                background: item.color,
                            }}
                        />
                        {item.label}
                    </div>
                ))}
            </div>
        </div>
    );
}

// ============================================================
// CHART HEADER
// ============================================================

function ChartHeader({
    title,
    subtitle,
}) {
    return (
        <div
            style={{
                marginBottom: 2,
            }}
        >

            <h3
                style={{
                    margin: 0,
                    fontSize: 11,
                    fontWeight: 800,
                    color:
                        'var(--text)',
                }}
            >
                {title}
            </h3>

            <p
                style={{
                    margin:
                        '2px 0 0',
                    fontSize: 8,
                    color:
                        'var(--text-muted)',
                }}
            >
                {subtitle}
            </p>

        </div>
    );
}


// ============================================================
// DATE FIELD
// ============================================================

function DateField({
    label,
    value,
    onChange,
}) {
    return (
        <div>

            <label
                style={{
                    display:
                        'block',
                    fontSize: 9,
                    fontWeight: 700,
                    color:
                        'var(--text-muted)',
                    marginBottom: 4,
                }}
            >
                {label}
            </label>

            <div
                style={{
                    position:
                        'relative',
                }}
            >

                <CalendarDays
                    size={13}
                    style={{
                        position:
                            'absolute',
                        left: 9,
                        top: '50%',
                        transform:
                            'translateY(-50%)',
                        color:
                            'var(--text-muted)',
                        pointerEvents:
                            'none',
                    }}
                />

                <input
                    type="date"
                    value={value}
                    onChange={(event) =>
                        onChange(
                            event.target.value
                        )
                    }
                    style={{
                        width:
                            '100%',
                        height: 36,
                        padding:
                            '0 9px 0 29px',
                        border:
                            '1px solid var(--border)',
                        borderRadius: 7,
                        background:
                            'var(--surface)',
                        color:
                            'var(--text)',
                        fontSize: 10,
                        outline:
                            'none',
                    }}
                />

            </div>

        </div>
    );
}


// ============================================================
// SELECT FIELD
// ============================================================

function SelectField({
    label,
    value,
    onChange,
    icon,
    children,
}) {
    return (
        <div>

            <label
                style={{
                    display:
                        'block',
                    fontSize: 9,
                    fontWeight: 700,
                    color:
                        'var(--text-muted)',
                    marginBottom: 4,
                }}
            >
                {label}
            </label>

            <div
                style={{
                    position:
                        'relative',
                }}
            >

                {icon && (

                    <div
                        style={{
                            position:
                                'absolute',
                            left: 9,
                            top: '50%',
                            transform:
                                'translateY(-50%)',
                            color:
                                'var(--text-muted)',
                            pointerEvents:
                                'none',
                            display:
                                'flex',
                        }}
                    >
                        {icon}
                    </div>

                )}

                <select
                    value={value}
                    onChange={(event) =>
                        onChange(
                            event.target.value
                        )
                    }
                    style={{
                        width:
                            '100%',
                        height: 36,
                        padding:
                            icon
                                ? '0 27px 0 28px'
                                : '0 27px 0 9px',
                        border:
                            '1px solid var(--border)',
                        borderRadius: 7,
                        background:
                            'var(--surface)',
                        color:
                            'var(--text)',
                        fontSize: 10,
                        outline:
                            'none',
                        appearance:
                            'none',
                    }}
                >
                    {children}
                </select>

                <ChevronDown
                    size={13}
                    style={{
                        position:
                            'absolute',
                        right: 8,
                        top: '50%',
                        transform:
                            'translateY(-50%)',
                        color:
                            'var(--text-muted)',
                        pointerEvents:
                            'none',
                    }}
                />

            </div>

        </div>
    );
}


// ============================================================
// INFO ITEM
// ============================================================

function InfoItem({
    label,
    value,
}) {
    return (
        <div>

            <div
                style={{
                    fontSize: 8,
                    fontWeight: 700,
                    color:
                        'var(--text-muted)',
                    marginBottom: 3,
                }}
            >
                {label}
            </div>

            <div
                style={{
                    fontSize: 10,
                    fontWeight: 800,
                    color:
                        'var(--text)',
                }}
            >
                {value}
            </div>

        </div>
    );
}