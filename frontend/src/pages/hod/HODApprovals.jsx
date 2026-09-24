import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import api from '../../lib/api';

import {
    Search,
    RefreshCw,
    Loader2,
    Eye,
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    ClipboardCheck,
    CalendarDays,
} from 'lucide-react';

/* =========================================================
   HELPERS
========================================================= */

const REQUEST_TYPES = [
    { value: 'ALL', label: 'All Request Types' },
    { value: 'OUTPASS', label: 'Out-Pass' },
    { value: 'MESS_FEE', label: 'Mess Fee' },
    { value: 'INTERNSHIP', label: 'Internship' },
    { value: 'LIBRARY', label: 'Library' },
];

const extractData = (response) => {
    if (Array.isArray(response?.data)) {
        return response.data;
    }

    if (Array.isArray(response?.data?.data)) {
        return response.data.data;
    }

    if (Array.isArray(response?.data?.requests)) {
        return response.data.requests;
    }

    if (Array.isArray(response?.data?.results)) {
        return response.data.results;
    }

    return [];
};

const getRequestId = (request) => {
    return (
        request?._id ||
        request?.id ||
        request?.requestId ||
        ''
    );
};

const getStudentName = (request) => {
    return (
        request?.studentId?.name ||
        request?.student?.name ||
        request?.studentName ||
        request?.name ||
        '-'
    );
};

const getRollNumber = (request) => {
    return (
        request?.studentId?.rollNo ||
        request?.studentId?.rollNumber ||
        request?.student?.rollNo ||
        request?.student?.rollNumber ||
        request?.rollNo ||
        request?.rollNumber ||
        '-'
    );
};

const getBranch = (request) => {
    return (
        request?.branchId?.code ||
        request?.branch?.code ||
        request?.branchCode ||
        request?.branchId?.name ||
        request?.branch?.name ||
        request?.branchName ||
        '-'
    );
};

const getYear = (request) => {
    return (
        request?.year ||
        request?.studentId?.year ||
        request?.student?.year ||
        request?.yearTier ||
        '-'
    );
};

const getStudentType = (request) => {
    return (
        request?.studentType ||
        request?.studentId?.studentType ||
        request?.student?.studentType ||
        '-'
    );
};

const normalizeStudentType = (value) => {
    const type = String(value || '')
        .trim()
        .toUpperCase()
        .replace(/_/g, ' ');

    if (type === 'DAY SCHOLAR') {
        return 'DAY SCHOLAR';
    }

    if (type === 'HOSTELER') {
        return 'HOSTELER';
    }

    return type || '-';
};

const getRequestType = (request) => {
    const raw =
        request?.requestType ||
        request?.type ||
        request?.permissionType ||
        request?.permission?.type ||
        '';

    const value = String(raw)
        .trim()
        .toUpperCase()
        .replace(/[\s-]+/g, '_');

    if (value.includes('OUTPASS') || value.includes('OUT_PASS')) {
        return 'OUTPASS';
    }

    if (value.includes('MESS')) {
        return 'MESS_FEE';
    }

    if (value.includes('INTERNSHIP')) {
        return 'INTERNSHIP';
    }

    if (value.includes('LIBRARY')) {
        return 'LIBRARY';
    }

    return value;
};

const getRequestTypeLabel = (request) => {
    const type = getRequestType(request);

    switch (type) {
        case 'OUTPASS':
            return 'Out-Pass';

        case 'MESS_FEE':
            return 'Mess Fee';

        case 'INTERNSHIP':
            return 'Internship';

        case 'LIBRARY':
            return 'Library';

        default:
            return (
                request?.requestType ||
                request?.type ||
                '-'
            );
    }
};

const getRequestDate = (request) => {
    return (
        request?.createdAt ||
        request?.submittedAt ||
        request?.requestDate ||
        request?.date ||
        null
    );
};

const formatDate = (dateValue) => {
    if (!dateValue) {
        return '-';
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return '-';
    }

    return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
};

const getDateOnly = (dateValue) => {
    if (!dateValue) {
        return '';
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return '';
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
};

const getStatus = (request) => {
    return String(request?.status || '').trim().toUpperCase();
};

/*
 * The pending endpoint is already scoped to the logged-in HOD.
 * This additional check makes sure the UI only shows requests
 * that are explicitly at the HOD approval stage when the backend
 * returns a broader pending list.
 */
const isHODPending = (request) => {
    const status = getStatus(request);

    return (
        status === 'PENDING_HOD' ||
        status === 'PENDING_HOD_APPROVAL'
    );
};


/* =========================================================
   COMPONENT
========================================================= */

export default function HODApprovals() {
    const navigate = useNavigate();

    const [requests, setRequests] = useState([]);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [error, setError] = useState('');

    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('ALL');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    const [page, setPage] = useState(1);

    const PAGE_SIZE = 10;


    /* =====================================================
       FETCH PENDING APPROVALS
    ===================================================== */

    const fetchApprovals = async (showRefresh = false) => {
        try {
            if (showRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            setError('');

            // Use the same endpoint that the HOD Dashboard uses
            const response = await api.get(
                '/outpass/all/for-me'
            );

            const data = extractData(response);

            // Keep only requests that are currently pending and not LIBRARY
            const pendingRequests = data.filter((request) => {
                const status = String(request?.status || '').trim().toUpperCase();
                const reqType = getRequestType(request);
                
                return status.startsWith('PENDING') && reqType !== 'LIBRARY';
            });

            setRequests(pendingRequests);

        } catch (err) {
            console.error(
                'HOD approvals API error:',
                err
            );

            setError(
                err?.response?.data?.message ||
                'Unable to load pending approvals.'
            );

            setRequests([]);

        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };


    /* =====================================================
       INITIAL LOAD + AUTO REFRESH
    ===================================================== */

    useEffect(() => {
        fetchApprovals();

        const interval = setInterval(() => {
            fetchApprovals(true);
        }, 6000);

        return () => clearInterval(interval);
    }, []);


    /* =====================================================
       FILTERING
    ===================================================== */

    const filteredRequests = useMemo(() => {
        const query = search.trim().toLowerCase();

        return requests.filter((request) => {
            const studentName =
                getStudentName(request).toLowerCase();

            const rollNumber =
                getRollNumber(request).toLowerCase();

            const branch =
                String(getBranch(request)).toLowerCase();

            const requestType =
                getRequestType(request);

            const searchableText =
                `${studentName} ${rollNumber} ${branch} ${requestType}`
                    .toLowerCase();

            /* Search */
            if (
                query &&
                !searchableText.includes(query)
            ) {
                return false;
            }

            /* Request type */
            if (
                typeFilter !== 'ALL' &&
                requestType !== typeFilter
            ) {
                return false;
            }

            /* From date */
            const requestDate =
                getDateOnly(getRequestDate(request));

            if (
                fromDate &&
                requestDate &&
                requestDate < fromDate
            ) {
                return false;
            }

            /* To date */
            if (
                toDate &&
                requestDate &&
                requestDate > toDate
            ) {
                return false;
            }

            return true;
        });

    }, [
        requests,
        search,
        typeFilter,
        fromDate,
        toDate,
    ]);


    /* =====================================================
       PAGINATION
    ===================================================== */

    const totalPages = Math.max(
        1,
        Math.ceil(
            filteredRequests.length / PAGE_SIZE
        )
    );

    const paginatedRequests = useMemo(() => {
        const start =
            (page - 1) * PAGE_SIZE;

        return filteredRequests.slice(
            start,
            start + PAGE_SIZE
        );
    }, [
        filteredRequests,
        page,
    ]);

    useEffect(() => {
        setPage(1);
    }, [
        search,
        typeFilter,
        fromDate,
        toDate,
    ]);

    useEffect(() => {
        if (page > totalPages) {
            setPage(totalPages);
        }
    }, [
        page,
        totalPages,
    ]);


    /* =====================================================
       CLEAR FILTERS
    ===================================================== */

    const clearFilters = () => {
        setSearch('');
        setTypeFilter('ALL');
        setFromDate('');
        setToDate('');
        setPage(1);
    };


    /* =====================================================
       LOADING STATE
    ===================================================== */

    if (loading) {
        return (
            <DashboardLayout>
                <div className="hod-approvals-page" style={styles.page}>

                    <Header
                        refreshing={false}
                        onRefresh={() =>
                            fetchApprovals(true)
                        }
                    />

                    <div style={styles.loadingCard}>
                        <Loader2
                            size={28}
                            style={{
                                animation:
                                    'spin 1s linear infinite',
                            }}
                        />

                        <p style={styles.loadingText}>
                            Loading pending approvals...
                        </p>
                    </div>

                </div>

                <style>
                    {`
                        @keyframes spin {
                            from {
                                transform: rotate(0deg);
                            }
                            to {
                                transform: rotate(360deg);
                            }
                        }
                    `}
                </style>
            </DashboardLayout>
        );
    }


    /* =====================================================
       MAIN UI
    ===================================================== */

    return (
        <DashboardLayout>

            <div style={styles.page}>

                {/* HEADER */}
                <Header
                    refreshing={refreshing}
                    onRefresh={() =>
                        fetchApprovals(true)
                    }
                />


                {/* ERROR */}
                {error && (
                    <div style={styles.errorBox}>
                        <AlertCircle size={18} />

                        <span>
                            {error}
                        </span>

                        <button
                            type="button"
                            onClick={() =>
                                fetchApprovals(true)
                            }
                            style={styles.errorRetry}
                        >
                            Retry
                        </button>
                    </div>
                )}


                {/* FILTERS */}
                <div className="hod-approval-filter" style={styles.filterCard}>

                    {/* SEARCH */}
                    <div style={styles.searchWrapper}>

                        <Search
                            size={18}
                            color="#64748b"
                            style={
                                styles.searchIcon
                            }
                        />

                        <input
                            type="text"
                            value={search}
                            onChange={(event) =>
                                setSearch(
                                    event.target.value
                                )
                            }
                            placeholder="Search by student name or roll number..."
                            style={styles.searchInput}
                        />

                    </div>


                    {/* TYPE */}
                    <div style={styles.filterField}>

                        <select
                            value={typeFilter}
                            onChange={(event) =>
                                setTypeFilter(
                                    event.target.value
                                )
                            }
                            style={styles.select}
                        >
                            {REQUEST_TYPES.map(
                                (type) => (
                                    <option
                                        key={
                                            type.value
                                        }
                                        value={
                                            type.value
                                        }
                                    >
                                        {type.label}
                                    </option>
                                )
                            )}
                        </select>

                    </div>


                    {/* FROM DATE */}
                    <div style={styles.dateWrapper}>

                        <CalendarDays
                            size={17}
                            color="#64748b"
                        />

                        <input
                            type="date"
                            value={fromDate}
                            onChange={(event) =>
                                setFromDate(
                                    event.target.value
                                )
                            }
                            style={styles.dateInput}
                        />

                    </div>


                    {/* TO DATE */}
                    <div style={styles.dateWrapper}>

                        <CalendarDays
                            size={17}
                            color="#64748b"
                        />

                        <input
                            type="date"
                            value={toDate}
                            onChange={(event) =>
                                setToDate(
                                    event.target.value
                                )
                            }
                            style={styles.dateInput}
                        />

                    </div>


                    {/* CLEAR */}
                    <button
                        type="button"
                        onClick={clearFilters}
                        style={styles.clearButton}
                    >
                        Clear
                    </button>

                </div>


                {/* TABLE / EMPTY STATE */}
                {requests.length === 0 ? (

                    <EmptyState
                        onRefresh={() =>
                            fetchApprovals(true)
                        }
                        refreshing={refreshing}
                    />

                ) : filteredRequests.length === 0 ? (

                    <NoResults
                        onClear={clearFilters}
                    />

                ) : (

                    <>

                        {/* MOBILE REQUEST CARDS */}
                        <div className="hod-approval-mobile-list">
                            {paginatedRequests.map((request, index) => {
                                const id = getRequestId(request);
                                const studentName = getStudentName(request);
                                const rollNumber = getRollNumber(request);
                                const branch = getBranch(request);
                                const year = getYear(request);
                                const studentType = normalizeStudentType(getStudentType(request));
                                const requestType = getRequestTypeLabel(request);
                                const requestDate = formatDate(getRequestDate(request));

                                return (
                                    <div
                                        className="hod-approval-mobile-card"
                                        key={
                                            id ||
                                            `mobile-${index}-${rollNumber}`
                                        }
                                    >
                                        <div className="hod-mobile-card-top">
                                            <div className="hod-mobile-student-wrap">
                                                <div className="hod-mobile-avatar">
                                                    {String(studentName).charAt(0).toUpperCase()}
                                                </div>
                                                <div className="hod-mobile-student-details">
                                                    <div className="hod-mobile-student-name">
                                                        {studentName}
                                                    </div>
                                                    <div className="hod-mobile-roll">
                                                        {rollNumber}
                                                    </div>
                                                </div>
                                            </div>

                                            <span className="hod-mobile-type">
                                                {requestType}
                                            </span>
                                        </div>

                                        <div className="hod-mobile-meta-grid">
                                            <div>
                                                <span>Branch</span>
                                                <strong>{branch}</strong>
                                            </div>
                                            <div>
                                                <span>Year</span>
                                                <strong>{year}</strong>
                                            </div>
                                            <div>
                                                <span>Student Type</span>
                                                <strong>{studentType}</strong>
                                            </div>
                                            <div>
                                                <span>Request Date</span>
                                                <strong>{requestDate}</strong>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            className="hod-mobile-view-button"
                                            onClick={() =>
                                                navigate(
                                                    `/outpass/${id}?mode=approval`
                                                )
                                            }
                                        >
                                            <Eye size={15} />
                                            View Request
                                        </button>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="hod-approval-table-card" style={styles.tableCard}>

                            {/* TABLE HEADER */}
                            <div style={styles.tableHeader}>

                                <div>
                                    <h2
                                        style={
                                            styles.tableTitle
                                        }
                                    >
                                        Pending Approvals
                                    </h2>

                                    <p
                                        style={
                                            styles.tableSubtitle
                                        }
                                    >
                                        {filteredRequests.length}{' '}
                                        {filteredRequests.length ===
                                            1
                                            ? 'request'
                                            : 'requests'}{' '}
                                        waiting for your approval
                                    </p>
                                </div>

                                <div
                                    style={
                                        styles.pendingBadge
                                    }
                                >
                                    <ClipboardCheck
                                        size={16}
                                    />

                                    {filteredRequests.length}
                                </div>

                            </div>


                            {/* TABLE */}
                            <div
                                style={
                                    styles.tableScroll
                                }
                            >
                                <table
                                    style={
                                        styles.table
                                    }
                                >

                                    <thead>
                                        <tr>

                                            <th
                                                style={
                                                    styles.th
                                                }
                                            >
                                                #
                                            </th>

                                            <th
                                                style={
                                                    styles.th
                                                }
                                            >
                                                STUDENT
                                            </th>

                                            <th
                                                style={
                                                    styles.th
                                                }
                                            >
                                                ROLL NO
                                            </th>

                                            <th
                                                style={
                                                    styles.th
                                                }
                                            >
                                                BRANCH
                                            </th>

                                            <th
                                                style={
                                                    styles.th
                                                }
                                            >
                                                YEAR
                                            </th>

                                            <th
                                                style={
                                                    styles.th
                                                }
                                            >
                                                STUDENT TYPE
                                            </th>

                                            <th
                                                style={
                                                    styles.th
                                                }
                                            >
                                                REQUEST TYPE
                                            </th>

                                            <th
                                                style={
                                                    styles.th
                                                }
                                            >
                                                REQUEST DATE
                                            </th>

                                            <th
                                                style={{
                                                    ...styles.th,
                                                    textAlign:
                                                        'center',
                                                }}
                                            >
                                                ACTION
                                            </th>

                                        </tr>
                                    </thead>


                                    <tbody>

                                        {paginatedRequests.map(
                                            (
                                                request,
                                                index
                                            ) => {

                                                const id =
                                                    getRequestId(
                                                        request
                                                    );


                                                return (
                                                    <tr
                                                        key={
                                                            id ||
                                                            `${index}-${getRollNumber(
                                                                request
                                                            )}`
                                                        }
                                                        style={
                                                            styles.tr
                                                        }
                                                    >

                                                        {/* NUMBER */}
                                                        <td
                                                            style={
                                                                styles.td
                                                            }
                                                        >
                                                            {(page -
                                                                1) *
                                                                PAGE_SIZE +
                                                                index +
                                                                1}
                                                        </td>


                                                        {/* STUDENT */}
                                                        <td
                                                            style={
                                                                styles.td
                                                            }
                                                        >
                                                            <div
                                                                style={
                                                                    styles.studentCell
                                                                }
                                                            >
                                                                <div
                                                                    style={
                                                                        styles.avatar
                                                                    }
                                                                >
                                                                    {String(
                                                                        getStudentName(
                                                                            request
                                                                        )
                                                                    )
                                                                        .charAt(
                                                                            0
                                                                        )
                                                                        .toUpperCase()}
                                                                </div>

                                                                <div
                                                                    style={
                                                                        styles.studentName
                                                                    }
                                                                >
                                                                    {
                                                                        getStudentName(
                                                                            request
                                                                        )
                                                                    }
                                                                </div>
                                                            </div>
                                                        </td>


                                                        {/* ROLL */}
                                                        <td
                                                            style={
                                                                styles.td
                                                            }
                                                        >
                                                            <span
                                                                style={
                                                                    styles.roll
                                                                }
                                                            >
                                                                {
                                                                    getRollNumber(
                                                                        request
                                                                    )
                                                                }
                                                            </span>
                                                        </td>


                                                        {/* BRANCH */}
                                                        <td
                                                            style={
                                                                styles.td
                                                            }
                                                        >
                                                            <span
                                                                style={
                                                                    styles.branchBadge
                                                                }
                                                            >
                                                                {
                                                                    getBranch(
                                                                        request
                                                                    )
                                                                }
                                                            </span>
                                                        </td>


                                                        {/* YEAR */}
                                                        <td
                                                            style={
                                                                styles.td
                                                            }
                                                        >
                                                            {
                                                                getYear(
                                                                    request
                                                                )
                                                            }
                                                        </td>


                                                        {/* STUDENT TYPE */}
                                                        <td
                                                            style={
                                                                styles.td
                                                            }
                                                        >
                                                            {
                                                                normalizeStudentType(
                                                                    getStudentType(
                                                                        request
                                                                    )
                                                                )
                                                            }
                                                        </td>


                                                        {/* TYPE */}
                                                        <td
                                                            style={
                                                                styles.td
                                                            }
                                                        >
                                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '6px' }}>
                                                                <span
                                                                    style={
                                                                        styles.typeBadge
                                                                    }
                                                                >
                                                                    {
                                                                        getRequestTypeLabel(
                                                                            request
                                                                        )
                                                                    }
                                                                </span>
                                                                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500, fontFamily: 'monospace' }}>
                                                                    Ref: {request?.referenceId || request?.refId || 'N/A'}
                                                                </span>
                                                            </div>
                                                        </td>


                                                        {/* DATE */}
                                                        <td
                                                            style={
                                                                styles.td
                                                            }
                                                        >
                                                            {
                                                                formatDate(
                                                                    getRequestDate(
                                                                        request
                                                                    )
                                                                )
                                                            }
                                                        </td>


                                                        {/* ACTION */}
                                                        <td
                                                            style={{
                                                                ...styles.td,
                                                                textAlign: 'center',
                                                            }}
                                                        >
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    navigate(`/outpass/${id}?mode=approval`)
                                                                }
                                                                style={styles.viewButton}
                                                            >
                                                                <Eye size={15} />
                                                                View
                                                            </button>
                                                        </td>

                                                    </tr>
                                                );
                                            }
                                        )}

                                    </tbody>

                                </table>
                            </div>


                            {/* PAGINATION */}
                            <div
                                style={
                                    styles.pagination
                                }
                            >

                                <div
                                    style={
                                        styles.paginationText
                                    }
                                >
                                    Showing{' '}
                                    {filteredRequests.length ===
                                        0
                                        ? 0
                                        : (page - 1) *
                                        PAGE_SIZE +
                                        1}{' '}
                                    to{' '}
                                    {Math.min(
                                        page *
                                        PAGE_SIZE,
                                        filteredRequests.length
                                    )}{' '}
                                    of{' '}
                                    {
                                        filteredRequests.length
                                    }{' '}
                                    requests
                                </div>


                                <div
                                    style={
                                        styles.paginationControls
                                    }
                                >

                                    <button
                                        type="button"
                                        disabled={
                                            page === 1
                                        }
                                        onClick={() =>
                                            setPage(
                                                (current) =>
                                                    Math.max(
                                                        1,
                                                        current -
                                                        1
                                                    )
                                            )
                                        }
                                        style={{
                                            ...styles.pageButton,
                                            opacity:
                                                page === 1
                                                    ? 0.45
                                                    : 1,
                                        }}
                                    >
                                        <ChevronLeft
                                            size={16}
                                        />
                                    </button>


                                    {Array.from(
                                        {
                                            length:
                                                totalPages,
                                        },
                                        (_, index) =>
                                            index + 1
                                    ).map(
                                        (pageNumber) => (
                                            <button
                                                key={
                                                    pageNumber
                                                }
                                                type="button"
                                                onClick={() =>
                                                    setPage(
                                                        pageNumber
                                                    )
                                                }
                                                style={{
                                                    ...styles.pageButton,
                                                    ...(pageNumber ===
                                                        page
                                                        ? styles.activePageButton
                                                        : {}),
                                                }}
                                            >
                                                {
                                                    pageNumber
                                                }
                                            </button>
                                        )
                                    )}


                                    <button
                                        type="button"
                                        disabled={
                                            page ===
                                            totalPages
                                        }
                                        onClick={() =>
                                            setPage(
                                                (current) =>
                                                    Math.min(
                                                        totalPages,
                                                        current +
                                                        1
                                                    )
                                            )
                                        }
                                        style={{
                                            ...styles.pageButton,
                                            opacity:
                                                page ===
                                                    totalPages
                                                    ? 0.45
                                                    : 1,
                                        }}
                                    >
                                        <ChevronRight
                                            size={16}
                                        />
                                    </button>

                                </div>

                            </div>

                        </div>

                    </>
                )}

            </div>


            <style>
                {`
                    @keyframes spin {
                        from {
                            transform: rotate(0deg);
                        }
                        to {
                            transform: rotate(360deg);
                        }
                    }

                    .hod-approval-mobile-list {
                        display: none;
                    }

                    @media (max-width: 768px) {
                        .hod-approvals-page {
                            width: 100%;
                            max-width: 100%;
                            min-width: 0;
                            box-sizing: border-box;
                        }

                        .hod-approvals-header {
                            align-items: flex-start !important;
                            gap: 12px !important;
                            margin-bottom: 16px !important;
                        }

                        .hod-approvals-header h1 {
                            font-size: 21px !important;
                            line-height: 1.25 !important;
                        }

                        .hod-approvals-header p {
                            font-size: 12px !important;
                            line-height: 1.45 !important;
                            max-width: 210px;
                        }

                        .hod-approvals-header button {
                            flex-shrink: 0 !important;
                            height: 38px !important;
                            padding: 0 10px !important;
                            font-size: 11px !important;
                        }

                        .hod-approval-filter {
                            grid-template-columns: 1fr !important;
                            gap: 8px !important;
                            padding: 12px !important;
                            margin-bottom: 12px !important;
                        }

                        .hod-approval-filter input,
                        .hod-approval-filter select,
                        .hod-approval-filter button {
                            width: 100% !important;
                            max-width: 100% !important;
                            min-width: 0 !important;
                            box-sizing: border-box !important;
                        }

                        .hod-approval-filter input,
                        .hod-approval-filter select {
                            height: 40px !important;
                            font-size: 12px !important;
                        }

                        /* Hide the complete desktop approvals table on mobile.
                           The mobile request cards above are the mobile layout. */
                        .hod-approval-table-card {
                            display: none !important;
                        }

                        .hod-approval-mobile-list {
                            display: flex !important;
                            flex-direction: column;
                            gap: 10px;
                        }

                        .hod-approval-mobile-card {
                            width: 100%;
                            min-width: 0;
                            box-sizing: border-box;
                            background: #ffffff;
                            border: 1px solid #e2e8f0;
                            border-radius: 10px;
                            padding: 13px;
                            box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
                        }

                        .hod-mobile-card-top {
                            display: flex;
                            align-items: flex-start;
                            justify-content: space-between;
                            gap: 8px;
                        }

                        .hod-mobile-student-wrap {
                            display: flex;
                            align-items: center;
                            gap: 9px;
                            min-width: 0;
                            flex: 1;
                        }

                        .hod-mobile-avatar {
                            width: 34px;
                            height: 34px;
                            min-width: 34px;
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            background: #eff6ff;
                            color: #2563eb;
                            font-size: 12px;
                            font-weight: 700;
                        }

                        .hod-mobile-student-details {
                            min-width: 0;
                        }

                        .hod-mobile-student-name {
                            color: #0f172a;
                            font-size: 12px;
                            line-height: 1.35;
                            font-weight: 700;
                            word-break: break-word;
                        }

                        .hod-mobile-roll {
                            margin-top: 2px;
                            color: #64748b;
                            font-size: 10px;
                            font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
                            word-break: break-word;
                        }

                        .hod-mobile-type {
                            flex-shrink: 0;
                            max-width: 92px;
                            padding: 4px 7px;
                            border-radius: 6px;
                            background: #f8fafc;
                            border: 1px solid #e2e8f0;
                            color: #334155;
                            font-size: 9px;
                            line-height: 1.2;
                            font-weight: 700;
                            text-align: center;
                            word-break: break-word;
                        }

                        .hod-mobile-meta-grid {
                            display: grid;
                            grid-template-columns: 1fr 1fr;
                            gap: 9px 12px;
                            margin-top: 12px;
                            padding-top: 10px;
                            border-top: 1px solid #f1f5f9;
                        }

                        .hod-mobile-meta-grid > div {
                            min-width: 0;
                        }

                        .hod-mobile-meta-grid span {
                            display: block;
                            margin-bottom: 3px;
                            color: #94a3b8;
                            font-size: 8px;
                            line-height: 1.2;
                            font-weight: 700;
                            letter-spacing: 0.3px;
                            text-transform: uppercase;
                        }

                        .hod-mobile-meta-grid strong {
                            display: block;
                            color: #475569;
                            font-size: 10px;
                            line-height: 1.35;
                            font-weight: 600;
                            word-break: break-word;
                        }

                        .hod-mobile-view-button {
                            width: 100%;
                            height: 34px;
                            margin-top: 12px;
                            border: 1px solid #bfdbfe;
                            border-radius: 7px;
                            background: #eff6ff;
                            color: #2563eb;
                            display: inline-flex;
                            align-items: center;
                            justify-content: center;
                            gap: 5px;
                            font-size: 11px;
                            font-weight: 700;
                            cursor: pointer;
                        }
                    }

                    @media (max-width: 400px) {
                        .hod-approvals-header {
                            gap: 8px !important;
                        }

                        .hod-approvals-header h1 {
                            font-size: 20px !important;
                        }

                        .hod-approvals-header p {
                            font-size: 11px !important;
                            max-width: 195px;
                        }

                        .hod-approvals-header button {
                            height: 36px !important;
                            padding: 0 9px !important;
                        }

                        .hod-approval-filter {
                            padding: 10px !important;
                            gap: 7px !important;
                        }

                        .hod-approval-mobile-card {
                            padding: 12px;
                        }

                        .hod-mobile-student-name {
                            font-size: 11px;
                        }

                        .hod-mobile-meta-grid {
                            gap: 8px 10px;
                        }
                    }
                `}
            </style>

        </DashboardLayout >
    );
}


/* =========================================================
   HEADER
========================================================= */

function Header({
    refreshing,
    onRefresh,
}) {
    return (
        <div className="hod-approvals-header" style={styles.header}>

            <div>

                <h1 style={styles.pageTitle}>
                    My Approvals
                </h1>

                <p style={styles.pageSubtitle}>
                    Review and take action on requests
                    waiting for your approval
                </p>

            </div>



        </div>
    );
}


/* =========================================================
   EMPTY STATE
========================================================= */

function EmptyState({
    onRefresh,
    refreshing,
}) {
    return (
        <div style={styles.emptyCard}>

            <div style={styles.emptyIcon}>
                <ClipboardCheck
                    size={32}
                />
            </div>

            <h2 style={styles.emptyTitle}>
                No Pending Approvals
            </h2>

            <p style={styles.emptyText}>
                There are no requests waiting for
                your approval right now.
            </p>

            <p style={styles.emptySubText}>
                You'll see student requests here
                when they reach your approval stage.
            </p>



        </div>
    );
}


/* =========================================================
   NO SEARCH RESULTS
========================================================= */

function NoResults({
    onClear,
}) {
    return (
        <div style={styles.emptyCard}>

            <div
                style={{
                    ...styles.emptyIcon,
                    background:
                        '#f1f5f9',
                    color: '#64748b',
                }}
            >
                <Search size={30} />
            </div>

            <h2 style={styles.emptyTitle}>
                No Matching Requests
            </h2>

            <p style={styles.emptyText}>
                No pending approvals match your
                current search or filters.
            </p>

            <button
                type="button"
                onClick={onClear}
                style={styles.emptyRefreshButton}
            >
                Clear Filters
            </button>

        </div>
    );
}


/* =========================================================
   STYLES
========================================================= */

const styles = {
    page: {
        padding: '28px 32px 40px',
        background: '#f8fafc',
        minHeight: '100vh',
        boxSizing: 'border-box',
    },

    header: {
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 20,
        marginBottom: 24,
    },

    pageTitle: {
        margin: 0,
        fontSize: 28,
        lineHeight: 1.2,
        fontWeight: 700,
        color: '#0f172a',
        letterSpacing: '-0.5px',
    },

    pageSubtitle: {
        margin: '7px 0 0',
        fontSize: 14,
        color: '#64748b',
        lineHeight: 1.5,
    },

    refreshButton: {
        border: '1px solid #dbe3ee',
        background: '#ffffff',
        color: '#334155',
        borderRadius: 9,
        padding: '10px 15px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
    },

    errorBox: {
        background: '#fef2f2',
        border: '1px solid #fecaca',
        color: '#b91c1c',
        borderRadius: 10,
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        fontSize: 13,
        marginBottom: 18,
    },

    errorRetry: {
        marginLeft: 'auto',
        border: 'none',
        background: 'transparent',
        color: '#b91c1c',
        fontWeight: 700,
        cursor: 'pointer',
    },

    filterCard: {
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        padding: 16,
        display: 'grid',
        gridTemplateColumns:
            'minmax(280px, 1.8fr) minmax(170px, 1fr) minmax(150px, 0.8fr) minmax(150px, 0.8fr) auto',
        gap: 10,
        marginBottom: 18,
        boxShadow:
            '0 1px 2px rgba(15, 23, 42, 0.03)',
    },

    searchWrapper: {
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
    },

    searchIcon: {
        position: 'absolute',
        left: 12,
        pointerEvents: 'none',
    },

    searchInput: {
        width: '100%',
        height: 42,
        boxSizing: 'border-box',
        border: '1px solid #dbe3ee',
        borderRadius: 8,
        outline: 'none',
        padding: '0 13px 0 38px',
        fontSize: 13,
        color: '#0f172a',
        background: '#ffffff',
    },

    filterField: {
        minWidth: 0,
    },

    select: {
        width: '100%',
        height: 42,
        boxSizing: 'border-box',
        border: '1px solid #dbe3ee',
        borderRadius: 8,
        outline: 'none',
        padding: '0 12px',
        fontSize: 13,
        color: '#334155',
        background: '#ffffff',
        cursor: 'pointer',
    },

    dateWrapper: {
        height: 42,
        boxSizing: 'border-box',
        border: '1px solid #dbe3ee',
        borderRadius: 8,
        padding: '0 10px',
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        background: '#ffffff',
    },

    dateInput: {
        width: '100%',
        height: '100%',
        border: 'none',
        outline: 'none',
        fontSize: 12,
        color: '#334155',
        background: 'transparent',
        minWidth: 0,
    },

    clearButton: {
        height: 42,
        border: '1px solid #dbe3ee',
        borderRadius: 8,
        padding: '0 15px',
        background: '#ffffff',
        color: '#475569',
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
    },

    tableCard: {
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow:
            '0 1px 2px rgba(15, 23, 42, 0.03)',
    },

    tableHeader: {
        padding: '17px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #eef2f7',
    },

    tableTitle: {
        margin: 0,
        fontSize: 16,
        fontWeight: 700,
        color: '#0f172a',
    },

    tableSubtitle: {
        margin: '4px 0 0',
        fontSize: 12,
        color: '#64748b',
    },

    pendingBadge: {
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        background: '#eff6ff',
        color: '#2563eb',
        border: '1px solid #dbeafe',
        borderRadius: 20,
        padding: '7px 11px',
        fontSize: 12,
        fontWeight: 700,
    },

    tableScroll: {
        width: '100%',
        overflowX: 'hidden',
        overflowY: 'hidden',
        boxSizing: 'border-box',
    },

    table: {
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        tableLayout: 'auto',
        borderCollapse: 'collapse',
    },

    th: {
        background: '#f8fafc',
        color: '#64748b',
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.5px',
        padding: '12px 13px',
        textAlign: 'left',
        borderBottom: '1px solid #e2e8f0',
        whiteSpace: 'nowrap',
    },

    tr: {
        borderBottom:
            '1px solid #f1f5f9',
    },

    td: {
        padding: '13px',
        fontSize: 12,
        color: '#475569',
        verticalAlign: 'middle',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },

    studentCell: {
        display: 'flex',
        alignItems: 'center',
        gap: 9,
    },

    avatar: {
        width: 32,
        height: 32,
        borderRadius: '50%',
        background: '#eff6ff',
        color: '#2563eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        fontWeight: 700,
        flexShrink: 0,
    },

    studentName: {
        color: '#0f172a',
        fontWeight: 600,
        maxWidth: 230,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },

    roll: {
        fontFamily:
            'ui-monospace, SFMono-Regular, Menlo, monospace',
        color: '#475569',
        fontSize: 11,
    },

    branchBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f1f5f9',
        border: '1px solid #e2e8f0',
        color: '#475569',
        borderRadius: 6,
        padding: '4px 7px',
        fontSize: 10,
        fontWeight: 700,
    },

    typeBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        color: '#334155',
        borderRadius: 6,
        padding: '4px 7px',
        fontSize: 10,
        fontWeight: 600,
    },

    viewButton: {
        height: 32,
        border: '1px solid #bfdbfe',
        background: '#eff6ff',
        color: '#2563eb',
        borderRadius: 7,
        padding: '0 12px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        fontSize: 11,
        fontWeight: 700,
        cursor: 'pointer',
    },

    pagination: {
        padding: '13px 18px',
        borderTop: '1px solid #eef2f7',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 15,
    },

    paginationText: {
        fontSize: 12,
        color: '#64748b',
    },

    paginationControls: {
        display: 'flex',
        alignItems: 'center',
        gap: 5,
    },

    pageButton: {
        minWidth: 32,
        height: 32,
        border: '1px solid #dbe3ee',
        borderRadius: 7,
        background: '#ffffff',
        color: '#475569',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        fontWeight: 600,
        cursor: 'pointer',
    },

    activePageButton: {
        background: '#2563eb',
        borderColor: '#2563eb',
        color: '#ffffff',
    },

    loadingCard: {
        minHeight: 420,
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#2563eb',
    },

    loadingText: {
        margin: '12px 0 0',
        color: '#64748b',
        fontSize: 13,
    },

    emptyCard: {
        minHeight: 430,
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: 30,
        boxSizing: 'border-box',
        boxShadow:
            '0 1px 2px rgba(15, 23, 42, 0.03)',
    },

    emptyIcon: {
        width: 68,
        height: 68,
        borderRadius: '50%',
        background: '#eff6ff',
        color: '#2563eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 17,
    },

    emptyTitle: {
        margin: 0,
        fontSize: 18,
        fontWeight: 700,
        color: '#0f172a',
    },

    emptyText: {
        margin: '8px 0 0',
        fontSize: 13,
        color: '#475569',
    },

    emptySubText: {
        margin: '5px 0 18px',
        fontSize: 12,
        color: '#94a3b8',
    },

    emptyRefreshButton: {
        height: 38,
        padding: '0 14px',
        border: '1px solid #bfdbfe',
        borderRadius: 8,
        background: '#eff6ff',
        color: '#2563eb',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        fontSize: 12,
        fontWeight: 700,
        cursor: 'pointer',
    },

};