import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/DashboardLayout";
import api from "../../lib/api";
import {
    Building2,
    ArrowRight,
} from "lucide-react";

const DEPARTMENT_BRANCHES = [
    {
        code: "CSM",
        name: "Computer Science & Machine Learning",
    },
    {
        code: "CAI",
        name: "Computer Science & Artificial Intelligence",
    },
    {
        code: "CSD",
        name: "Computer Science & Data Science",
    },
    {
        code: "AID",
        name: "Artificial Intelligence & Data Science",
    },
    {
        code: "CSC",
        name: "Cyber Security",
    },
];

// Resolve the branch using the branch CODE returned by the backend.
// The backend populates branchId with both name and code.
// ============================================================
// BRANCH RESOLUTION
// ============================================================

const normalizeBranch = (value) =>
    String(value || "")
        .trim()
        .toUpperCase()
        .replace(/\s+/g, " ");

const BRANCH_NAME_TO_CODE = {
    "COMPUTER SCIENCE & MACHINE LEARNING": "CSM",
    "COMPUTER SCIENCE & ENGINEERING (AI & ML)": "CSM",

    "COMPUTER SCIENCE & ARTIFICIAL INTELLIGENCE": "CAI",
    "COMPUTER SCIENCE & ENGINEERING (AI)": "CAI",

    "COMPUTER SCIENCE & DATA SCIENCE": "CSD",
    "COMPUTER SCIENCE & ENGINEERING (DATA SCIENCE)": "CSD",

    "ARTIFICIAL INTELLIGENCE & DATA SCIENCE": "AID",

    "CYBER SECURITY": "CSC",
    "COMPUTER SCIENCE & ENGINEERING": "CSC",
};

const VALID_BRANCH_CODES = ["CSM", "CAI", "CSD", "AID", "CSC"];

const getBranchCode = (request) => {
    if (!request) return "";

    // The normal backend response:
    // request.branchId = { _id, name, code }
    const directCode = normalizeBranch(
        request?.branchId?.code ||
        request?.branch?.code ||
        request?.branchCode
    );

    if (VALID_BRANCH_CODES.includes(directCode)) {
        return directCode;
    }

    // Fallback when the backend sends the populated branch name.
    const branchName = normalizeBranch(
        request?.branchId?.name ||
        request?.branch?.name ||
        request?.branchName ||
        request?.studentId?.branchId?.name ||
        request?.student?.branch?.name
    );

    if (BRANCH_NAME_TO_CODE[branchName]) {
        return BRANCH_NAME_TO_CODE[branchName];
    }

    // Some records may contain the branch code inside a name/string.
    for (const branchCode of VALID_BRANCH_CODES) {
        if (branchName === branchCode || branchName.includes(`(${branchCode})`)) {
            return branchCode;
        }
    }

    return "";
};

// ============================================================
// API RESPONSE EXTRACTION
// ============================================================

const extractRequestArray = (payload) => {
    if (Array.isArray(payload)) {
        return payload;
    }

    if (!payload || typeof payload !== "object") {
        return [];
    }

    if (Array.isArray(payload.requests)) {
        return payload.requests;
    }

    if (Array.isArray(payload.data)) {
        return payload.data;
    }

    if (Array.isArray(payload.results)) {
        return payload.results;
    }

    if (payload.data && typeof payload.data === "object") {
        if (Array.isArray(payload.data.requests)) {
            return payload.data.requests;
        }

        if (Array.isArray(payload.data.results)) {
            return payload.data.results;
        }

        if (Array.isArray(payload.data.data)) {
            return payload.data.data;
        }
    }

    return [];
};

const getStudentType = (request) => {
    return String(
        request?.studentType ||
        request?.student?.studentType ||
        ""
    )
        .trim()
        .toUpperCase();
};

const getStatus = (request) => {
    return String(request?.status || "").toUpperCase();
};

const HODBranches = () => {
    const navigate = useNavigate();

    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");

    const fetchBranchData = async (isRefresh = false) => {
        try {
            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            setError("");

            const response = await api.get(
                "/outpass/all/for-me"
            );

            // The backend returns the real request records here.
            // Handle the possible response wrappers used by the API.
            const allRequests = extractRequestArray(response?.data);

            console.log(
                "[HOD Branches] /outpass/all/for-me response:",
                response?.data
            );

            console.log(
                "[HOD Branches] extracted requests:",
                allRequests
            );

            // Helpful diagnostic: shows which branch each fetched request
            // is being mapped to. These are real backend records only.
            console.table(
                allRequests.map((request) => ({
                    id: request?._id || request?.id || "-",
                    branchCode: getBranchCode(request) || "-",
                    branchIdCode: request?.branchId?.code || "-",
                    branchIdName: request?.branchId?.name || "-",
                    branchCodeField: request?.branchCode || "-",
                    student: request?.studentId?.name || request?.studentName || "-",
                    rollNo: request?.studentId?.rollNo || request?.rollNo || "-",
                    status: request?.status || "-",
                }))
            );

            setRequests(allRequests);
        } catch (err) {
            console.error(
                "Failed to load branch data:",
                err
            );

            setError(
                err?.response?.data?.message ||
                "Unable to load branch information."
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchBranchData();

        const interval = setInterval(() => {
            fetchBranchData(true);
        }, 6000);

        return () => clearInterval(interval);
    }, []);

    const branchStats = useMemo(() => {
        return DEPARTMENT_BRANCHES.map((branch) => {
            const branchRequests = requests.filter(
                (request) => {
                    const requestBranch =
                        getBranchCode(request);

                    return requestBranch === branch.code;
                }
            );

            const hostelRequests =
                branchRequests.filter((request) => {
                    const type =
                        getStudentType(request);

                    return (
                        type === "HOSTELER" ||
                        type === "HOSTEL" ||
                        type === "HOSTELLER"
                    );
                });

            const dayScholarRequests =
                branchRequests.filter((request) => {
                    const type =
                        getStudentType(request);

                    return (
                        type === "DAY_SCHOLAR" ||
                        type === "DAY SCHOLAR" ||
                        type === "DAY-SCHOLAR" ||
                        type === "DAYSCHOLAR"
                    );
                });

            const pending = branchRequests.filter(
                (request) =>
                    getStatus(request).includes("PENDING")
            );

            const approved = branchRequests.filter(
                (request) =>
                    [
                        "APPROVED",
                        "ISSUED",
                        "USED",
                        "CLEARED",
                    ].includes(getStatus(request))
            );

            const rejected = branchRequests.filter(
                (request) =>
                    getStatus(request).includes("REJECTED")
            );

            return {
                code: branch.code,
                name: branch.name,
                hostel: hostelRequests.length,
                dayScholar: dayScholarRequests.length,
                total: branchRequests.length,
                pending: pending.length,
                approved: approved.length,
                rejected: rejected.length,
            };
        });
    }, [requests]);

    useEffect(() => {
        if (!loading) {
            console.log(
                "[HOD Branches] calculated branch statistics:",
                branchStats
            );
        }
    }, [branchStats, loading]);

    const handleViewRequests = (branchCode) => {
        navigate(
            `/hod/branches/${encodeURIComponent(
                String(branchCode).trim().toUpperCase()
            )}/requests`
        );
    };

    return (
        <DashboardLayout>
            {/* PAGE HEADER */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        Branches
                    </h1>

                    <p className="page-subtitle">
                        View request activity across your department branches
                    </p>
                </div>


            </div>

            {/* ERROR */}
            {error && (
                <div
                    className="card"
                    style={{
                        marginBottom: "20px",
                        padding: "14px 16px",
                        background: "#fef2f2",
                        borderColor: "#fecaca",
                        color: "#b91c1c",
                    }}
                >
                    {error}
                </div>
            )}

            {/* BRANCH GRID */}
            <div
                className="hod-branch-grid"
                style={{
                    display: "grid",
                    gridTemplateColumns:
                        "repeat(3, minmax(0, 1fr))",
                    gap: "18px",
                    alignItems: "stretch",
                }}
            >
                {branchStats.map((branch) => (
                    <div
                        key={branch.code}
                        className="card"
                        style={{
                            padding: "18px",
                            minHeight: "190px",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                        }}
                    >
                        {/* Branch Header */}
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "12px",
                            }}
                        >
                            <div
                                style={{
                                    width: "46px",
                                    height: "46px",
                                    borderRadius: "12px",
                                    background: "#eff6ff",
                                    color: "#2563eb",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                }}
                            >
                                <Building2 size={22} />
                            </div>

                            <div>
                                <h2
                                    style={{
                                        margin: 0,
                                        fontSize: "20px",
                                        fontWeight: 700,
                                        color: "#0f172a",
                                    }}
                                >
                                    {branch.code}
                                </h2>

                                <p
                                    style={{
                                        margin: "4px 0 0",
                                        fontSize: "12px",
                                        color: "#64748b",
                                    }}
                                >
                                    {branch.name}
                                </p>
                            </div>
                        </div>

                        {/* View Requests */}
                        <button
                            className="btn btn-primary"
                            style={{
                                width: "100%",
                                justifyContent: "center",
                                marginTop: "18px",
                            }}
                            onClick={() =>
                                handleViewRequests(branch.code)
                            }
                        >
                            View Requests
                            <ArrowRight size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </DashboardLayout>
    );
};

/*
 * HOD BRANCHES MOBILE
 * The desktop grid remains unchanged.
 * The global index.css should contain the mobile .hod-branch-grid override.
 */
export default HODBranches;