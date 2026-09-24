import React, { useEffect, useMemo, useState } from "react";

import DashboardLayout from "../../components/DashboardLayout";
import { useAuth } from "../../context/AuthContext";
import api from "../../lib/api";

import {
  LuClipboardList,
  LuClock,
  LuCircleCheck,
  LuCircleX,
  LuBuilding2,
} from "react-icons/lu";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// ============================================================
// CTPO DASHBOARD
// ============================================================

const CTPODashboard = () => {
  // ==========================================================
  // LIVE CTPO DASHBOARD DATA
  // ==========================================================

  const { user, logout } = useAuth();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Use the SAME endpoint used by the working All Requests page.
  // This keeps dashboard cards/charts synchronized with All Requests.
  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const response = await api.get("/outpass/all/for-me");
      const responseData = response?.data;

      const data = Array.isArray(responseData)
        ? responseData
        : Array.isArray(responseData?.data)
          ? responseData.data
          : Array.isArray(responseData?.requests)
            ? responseData.requests
            : Array.isArray(responseData?.data?.requests)
              ? responseData.data.requests
              : [];

      setRequests(data);
    } catch (error) {
      console.error("Failed to load CTPO dashboard data:", error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();

    // Refresh so the dashboard follows new approvals/rejections.
    const interval = setInterval(loadDashboardData, 10000);

    return () => clearInterval(interval);
  }, []);

  // ==========================================================
  // STATUS HELPERS
  // ==========================================================

  const getStatus = (request) => {
    return String(
      request?.status ||
        request?.requestStatus ||
        request?.currentStatus ||
        request?.approvalStatus ||
        "",
    ).toUpperCase();
  };

  // ==========================================================
  // CTPO DECISION HELPERS
  // IMPORTANT:
  // The Approved / Rejected cards must represent ONLY the
  // CTPO's own decision, not the final request status.
  //
  // Example:
  // CTPO APPROVED -> HOD PENDING  => Approved = 1
  // CTPO APPROVED -> HOD APPROVED => Approved = 1
  // CTPO APPROVED -> HOD REJECTED => Approved = 1
  // CTPO REJECTED                  => Rejected = 1
  // ==========================================================

  const getApprovalStages = (request) => {
    const sources = [
      request?.approvalStages,
      request?.approvalHistory,
      request?.approvals,
      request?.workflowStages,
      request?.stages,
      request?.approvalSteps,
      request?.steps,
      request?.workflowHistory,
    ];

    return sources.filter(Array.isArray).flat();
  };

  const normalizeDecision = (value) => {
    const decision = String(value || "")
      .trim()
      .toUpperCase();

    if (
      ["APPROVED", "APPROVE", "ACCEPTED", "ACCEPT", "CLEARED"].includes(
        decision,
      )
    ) {
      return "APPROVED";
    }

    if (["REJECTED", "REJECT", "DENIED", "DENY"].includes(decision)) {
      return "REJECTED";
    }

    return "";
  };

  const getStageRole = (stage) => {
    return String(
      stage?.approverRole ||
        stage?.role ||
        stage?.approver?.role ||
        stage?.authorityRole ||
        stage?.approver?.authorityRole ||
        stage?.approverType ||
        stage?.stepRole ||
        "",
    )
      .trim()
      .toUpperCase();
  };

  const getStageDecision = (stage) => {
    const directDecision = normalizeDecision(
      stage?.decision ||
        stage?.action ||
        stage?.status ||
        stage?.approvalStatus ||
        stage?.result,
    );

    if (directDecision) {
      return directDecision;
    }

    if (stage?.approved === true || stage?.isApproved === true) {
      return "APPROVED";
    }

    if (stage?.rejected === true || stage?.isRejected === true) {
      return "REJECTED";
    }

    return "";
  };

  const getDecisionAuthorityText = (request) => {
    const values = [
      request?.rejectedByRole,
      request?.rejectedBy?.role,
      request?.rejectedBy?.authorityRole,
      request?.lastActionByRole,
      request?.lastDecisionByRole,
      request?.lastApproverRole,
      request?.currentApproverRole,
      request?.currentAuthorityRole,
      request?.currentStage?.role,
      request?.currentStage?.approverRole,
      request?.currentStage?.authorityRole,
      request?.lastStage?.role,
      request?.lastStage?.approverRole,
      request?.lastStage?.authorityRole,
      request?.rejection?.role,
      request?.rejection?.rejectedByRole,
      request?.rejection?.authorityRole,
    ];

    return values
      .filter(Boolean)
      .map((value) => {
        if (typeof value === "object") {
          return [
            value?.role,
            value?.authorityRole,
            value?.name,
            value?.label,
            value?.title,
          ]
            .filter(Boolean)
            .join(" ");
        }

        return String(value);
      })
      .join(" ")
      .trim()
      .toUpperCase();
  };

  const getCTPODecision = (request) => {
    const directDecision = normalizeDecision(
      request?.ctpoDecision ||
        request?.ctpoStatus ||
        request?.ctpoApprovalStatus ||
        request?.ctpoDecisionStatus,
    );

    if (directDecision) {
      return directDecision;
    }

    // --------------------------------------------------------
    // CHECK APPROVAL STAGES
    // --------------------------------------------------------
    const stages = getApprovalStages(request);
    const ctpoStages = stages.filter((stage) => {
      const role = getStageRole(stage);
      return (
        (role === "CTPO" || role.includes("CTPO")) &&
        Boolean(getStageDecision(stage))
      );
    });

    if (ctpoStages.length > 0) {
      return getStageDecision(ctpoStages[ctpoStages.length - 1]);
    }

    // --------------------------------------------------------
    // WORKFLOW STATUS FALLBACK
    // --------------------------------------------------------
    const status = String(
      request?._status ||
        request?.status ||
        request?.requestStatus ||
        request?.currentStatus ||
        request?.approvalStatus ||
        "",
    )
      .trim()
      .toUpperCase();

    // CTPO rejected
    if (
      status === "REJECTED_CTPO" ||
      status === "REJECTED CTPO" ||
      status === "CTPO_REJECTED" ||
      status === "CTPO REJECTED"
    ) {
      return "REJECTED";
    }

    // Still waiting for CTPO
    if (
      status.includes("PENDING_CTPO") ||
      status.includes("PENDING CTPO")
    ) {
      return "";
    }

    // Later workflow means CTPO approved
    if (
      status.includes("HOD") ||
      status.includes("WARDEN") ||
      status.includes("HOSTEL") ||
      status.includes("PLACEMENT") ||
      status.includes("DEAN") ||
      status.includes("PRINCIPAL") ||
      status.includes("SECURITY") ||
      status.includes("FACULTY") ||
      status === "PENDING_HOD" ||
      status === "PENDING_PLACEMENT_OFFICER" ||
      status === "PENDING_HOSTEL_INCHARGE" ||
      status === "APPROVED" ||
      status === "FINALIZED" ||
      status === "COMPLETED" ||
      status === "ISSUED" ||
      status === "VERIFIED" ||
      status === "USED" ||
      status === "RETURNED"
    ) {
      return "APPROVED";
    }

    // Plain rejected
    if (
      status === "REJECTED" ||
      status === "DENIED" ||
      status === "REJECT"
    ) {
      const authorityText = getDecisionAuthorityText(request);

      if (authorityText.includes("CTPO")) {
        return "REJECTED";
      }

      if (
        authorityText.includes("HOD") ||
        authorityText.includes("WARDEN") ||
        authorityText.includes("HOSTEL") ||
        authorityText.includes("PLACEMENT") ||
        authorityText.includes("DEAN") ||
        authorityText.includes("PRINCIPAL") ||
        authorityText.includes("SECURITY") ||
        authorityText.includes("FACULTY")
      ) {
        return "APPROVED";
      }

      if (
        request?.hodDecision ||
        request?.hodStatus ||
        request?.hodApprovalStatus ||
        request?.hodRemarks ||
        request?.hodRejectedAt ||
        request?.hostelDecision ||
        request?.placementDecision
      ) {
        return "APPROVED";
      }
    }

    return "";
  };

  // ONLY CTPO approval counts here.
  const isApproved = (request) => {
    return getCTPODecision(request) === "APPROVED";
  };

  // ONLY CTPO rejection counts here.
  const isRejected = (request) => {
    return getCTPODecision(request) === "REJECTED";
  };

  // Only requests waiting for THIS CTPO are in the CTPO pending queue.
  const isPendingForCTPO = (request) => {
    const status = getStatus(request);

    return status.includes("PENDING_CTPO") || status.includes("PENDING CTPO");
  };

  // ==========================================================
  // SUMMARY CARDS
  // ==========================================================
  //
  // SINGLE SOURCE OF TRUTH:
  // All three counts (approved, rejected, pending) are derived
  // from getCTPODecision() — exactly the same function used by
  // CTPOHistory and CTPOReports. This guarantees:
  //   Total = Approved + Pending + Rejected
  //
  // DO NOT use isPendingForCTPO() here — that only catches
  // PENDING_CTPO statuses and misses requests whose
  // getCTPODecision() returns "" for other reasons.

  const stats = useMemo(() => {
    return {
      total: requests.length,
      pending: requests.filter((r) => getCTPODecision(r) === "").length,
      approved: requests.filter(isApproved).length,
      rejected: requests.filter(isRejected).length,
    };
  }, [requests]);

  // ==========================================================
  // PERMISSION TYPE
  // ==========================================================

  const getPermissionType = (request) => {
    const rawType =
      request?.permissionType ||
      request?.requestType ||
      request?.type ||
      request?.permission?.type ||
      request?.permissionTypeId?.name ||
      request?.permissionTypeId?.type ||
      "";

    if (typeof rawType === "object" && rawType !== null) {
      return String(
        rawType?.name || rawType?.label || rawType?.type || "Other",
      );
    }

    const type = String(rawType).trim().toUpperCase();

    if (
      type.includes("OUTPASS") ||
      type.includes("OUT-PASS") ||
      type.includes("OUT_PASS") ||
      type.includes("OUT PASS")
    ) {
      return "Out-Pass";
    }

    if (type.includes("INTERNSHIP")) {
      return "Internship";
    }

    if (type.includes("LIBRARY")) {
      return "Library";
    }

    if (type.includes("MESS")) {
      return "Mess";
    }

    return rawType ? String(rawType) : "Other";
  };

  const permissionTypeData = useMemo(() => {
    const counts = {};

    requests.forEach((request) => {
      const type = getPermissionType(request);
      counts[type] = (counts[type] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [requests]);
  // ==========================================================
  // APPROVAL ACTIVITY - LAST 7 DAYS
  // ==========================================================
  // Uses the SAME request data already loaded by the dashboard.
  //
  // Bucketing strategy: use the request submission date
  // (createdAt / submittedAt) as the bucket key. This is the
  // most reliable date field — the backend always sets it when
  // a student submits a request, whereas CTPO-specific decision
  // timestamps are rarely exposed on the /all/for-me endpoint.
  //
  // The CTPO decision (APPROVED / REJECTED / pending) is still
  // derived from getCTPODecision() so downstream approvals /
  // rejections never affect the graph counts.
  //
  // All 7 days are always present with genuine 0 values on days
  // that have no activity.
  // ==========================================================

  const chartData = useMemo(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const windowStart = new Date(today);
    windowStart.setDate(today.getDate() - 6);
    windowStart.setHours(0, 0, 0, 0);

    // --------------------------------------------------------
    // Build one bucket per calendar day (last 7 days)
    // --------------------------------------------------------
    const bucketKeys = [];
    const cursor = new Date(windowStart);

    while (cursor <= today) {
      bucketKeys.push(cursor.toLocaleDateString("en-CA")); // YYYY-MM-DD
      cursor.setDate(cursor.getDate() + 1);
    }

    const bucketMap = {};
    bucketKeys.forEach((key) => {
      bucketMap[key] = { approved: 0, rejected: 0 };
    });

    // --------------------------------------------------------
    // Bucket each request by its submission date
    // --------------------------------------------------------
    requests.forEach((request) => {
      // Use submission date as the reliable bucket key
      const dateValue =
        request?.createdAt ||
        request?.submittedAt ||
        request?.submittedOn ||
        request?.date ||
        request?.created_at;

      if (!dateValue) return;

      const d = new Date(dateValue);
      if (Number.isNaN(d.getTime())) return;

      // Only include days in the 7-day window
      if (d < windowStart || d > today) return;

      const key = d.toLocaleDateString("en-CA");
      if (!bucketMap[key]) return;

      const decision = getCTPODecision(request);
      if (decision === "APPROVED") {
        bucketMap[key].approved += 1;
      } else if (decision === "REJECTED") {
        bucketMap[key].rejected += 1;
      }
      // Pending requests are not shown on the graph bar
      // (graph tracks CTPO decisions: approve / reject)
    });

    // --------------------------------------------------------
    // Convert to chart-ready array with display labels
    // --------------------------------------------------------
    const result = bucketKeys.map((key) => {
      const { approved, rejected } = bucketMap[key];
      const d = new Date(`${key}T00:00:00`);
      return {
        date: d.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
        }),
        approved,
        rejected,
      };
    });

    console.log("CTPO Approval Activity Chart Data:", result);
    return result;
  }, [requests]);
  
  // ==========================================================
  // CURRENT CTPO IDENTITY
  // ==========================================================

  const getBranchName = () => {
    const possibleBranches = [
      user?.branchName,
      user?.branchCode,
      user?.branch?.name,
      user?.branch?.code,
      user?.branch?.branchName,
      user?.branchId?.name,
      user?.branchId?.code,
      user?.branchId?.branchName,
      user?.organization?.branch?.name,
      user?.organization?.branch?.code,
      user?.organization?.branchName,
      user?.department?.name,
      user?.department?.code,
    ];

    const branch = possibleBranches.find(
      (value) =>
        typeof value === "string" &&
        value.trim() &&
        !/^[a-f\d]{20,}$/i.test(value.trim()),
    );

    if (branch) {
      return String(branch).trim().toUpperCase();
    }

    // If branch is not directly available in user,
    // get it from the CTPO request data.
    const firstRequest = requests[0];

    const requestBranches = [
      firstRequest?.branchName,
      firstRequest?.branchCode,
      firstRequest?.branch?.name,
      firstRequest?.branch?.code,
      firstRequest?.student?.branchName,
      firstRequest?.student?.branchCode,
      firstRequest?.student?.branch?.name,
      firstRequest?.student?.branch?.code,
      firstRequest?.studentId?.branchName,
      firstRequest?.studentId?.branchCode,
      firstRequest?.studentId?.branch?.name,
      firstRequest?.studentId?.branch?.code,
    ];

    const requestBranch = requestBranches.find(
      (value) =>
        typeof value === "string" &&
        value.trim() &&
        !/^[a-f\d]{20,}$/i.test(value.trim()),
    );

    return requestBranch ? String(requestBranch).trim().toUpperCase() : "";
  };

  const getYearLabel = () => {
    const possibleYears = [
      user?.authorityScope?.yearTier,
      user?.assignedYear,
      user?.yearTier,
      user?.academicYear,
      user?.yearLabel,
      user?.year?.name,
      user?.year?.label,
      user?.year?.value,
    ];

    const yearValue = possibleYears.find(
      (value) => value !== null && value !== undefined && String(value).trim(),
    );

    if (!yearValue) return "4th Year";

    const normalizedYear = String(yearValue).trim().toUpperCase();
    const yearNumber = normalizedYear.match(/(?:TIER_|YEAR_)?([1-6])(?:ST|ND|RD|TH)?/i)?.[1];

    if (yearNumber) {
      const suffix = yearNumber === "1" ? "st" : yearNumber === "2" ? "nd" : yearNumber === "3" ? "rd" : "th";
      return `${yearNumber}${suffix} Year`;
    }

    return String(yearValue).trim();
  };

  const getCTPOCode = () => {
    const possibleCodes = [
      user?.ctpoCode,
      user?.ctpo?.code,
      user?.username,
      user?.code,
    ];

    const code = possibleCodes.find(
      (value) =>
        typeof value === "string" &&
        value.trim() &&
        !/^[a-f\d]{20,}$/i.test(value.trim()),
    );

    return code ? String(code).trim().toUpperCase() : "";
  };

  const branchName = getBranchName();
  const yearLabel = getYearLabel();
  const ctpoCode = getCTPOCode();

  const ctpoIdentity = [
    yearLabel,
    branchName,
    "CTPO",
    ctpoCode ? `(${ctpoCode})` : "",
  ]
    .filter(Boolean)
    .join(" ");

  // ==========================================================
  // PIE CHART COLORS
  // ==========================================================

  const PIE_COLORS = ["#8b5cf6", "#10b981", "#f59e0b", "#3b82f6"];

  // ==========================================================
  // CARD STYLE
  // ==========================================================

  const statCardStyle = {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    minHeight: "135px",
    height: "135px",
    padding: "18px 20px",
    boxSizing: "border-box",
    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.06)",
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <DashboardLayout>
      {/* ======================================================
          MAIN CONTAINER
      ====================================================== */}

      <div
        className="ctpo-dashboard"
        style={{
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {/* ====================================================
            HEADER
        ==================================================== */}

        <div
          style={{
            marginBottom: "18px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <LuBuilding2
              size={28}
              strokeWidth={2}
              style={{
                color: "#111827",
              }}
            />

            <h1
              style={{
                margin: 0,
                fontSize: "28px",
                fontWeight: 700,
                color: "#111827",
              }}
            >
              CTPO Dashboard
            </h1>
          </div>

          <p
            style={{
              margin: "5px 0 0 0",
              fontSize: "15px",
              color: "#64748b",
            }}
          >
            Central Training &amp; Placement Office authorization for permissions &amp;
            clearances · Logged in as{" "}
            <strong style={{ color: "#334155" }}>
              {ctpoIdentity || "CTPO"}
            </strong>
          </p>
        </div>

        {/* ====================================================
            TOP SUMMARY CARDS (Display-Only)
        ==================================================== */}

        <div
          className="ctpo-kpi-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: "18px",
            width: "100%",
            marginBottom: "16px",
          }}
        >
          {/* TOTAL REQUESTS */}
          <div style={statCardStyle}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "12px",
              }}
            >
              <div
                style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "9px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#eff6ff",
                  color: "#2563eb",
                }}
              >
                <LuClipboardList size={21} />
              </div>
            </div>

            <div
              style={{
                fontSize: "13px",
                fontWeight: 600,
                letterSpacing: "0.5px",
                textTransform: "uppercase",
                color: "#475569",
              }}
            >
              Total Requests
            </div>

            <div
              style={{
                marginTop: "5px",
                fontSize: "30px",
                lineHeight: 1,
                fontWeight: 700,
                color: "#0f172a",
              }}
            >
              {loading ? "…" : stats.total}
            </div>
          </div>

          {/* PENDING QUEUE */}
          <div style={statCardStyle}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "12px",
              }}
            >
              <div
                style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "9px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#fff7ed",
                  color: "#f59e0b",
                }}
              >
                <LuClock size={21} />
              </div>
            </div>

            <div
              style={{
                fontSize: "13px",
                fontWeight: 600,
                letterSpacing: "0.5px",
                textTransform: "uppercase",
                color: "#475569",
              }}
            >
              Pending
            </div>

            <div
              style={{
                marginTop: "5px",
                fontSize: "30px",
                lineHeight: 1,
                fontWeight: 700,
                color: "#d97706",
              }}
            >
              {loading ? "…" : stats.pending}
            </div>
          </div>

          {/* APPROVED */}
          <div style={statCardStyle}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "12px",
              }}
            >
              <div
                style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "9px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#ecfdf5",
                  color: "#059669",
                }}
              >
                <LuCircleCheck size={21} />
              </div>
            </div>

            <div
              style={{
                fontSize: "13px",
                fontWeight: 600,
                letterSpacing: "0.5px",
                textTransform: "uppercase",
                color: "#475569",
              }}
            >
              Approved
            </div>

            <div
              style={{
                marginTop: "5px",
                fontSize: "30px",
                lineHeight: 1,
                fontWeight: 700,
                color: "#059669",
              }}
            >
              {loading ? "…" : stats.approved}
            </div>
          </div>

          {/* REJECTED */}
          <div style={statCardStyle}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "12px",
              }}
            >
              <div
                style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "9px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#fef2f2",
                  color: "#ef4444",
                }}
              >
                <LuCircleX size={21} />
              </div>
            </div>

            <div
              style={{
                fontSize: "13px",
                fontWeight: 600,
                letterSpacing: "0.5px",
                textTransform: "uppercase",
                color: "#475569",
              }}
            >
              Rejected
            </div>

            <div
              style={{
                marginTop: "5px",
                fontSize: "30px",
                lineHeight: 1,
                fontWeight: 700,
                color: "#dc2626",
              }}
            >
              {loading ? "…" : stats.rejected}
            </div>
          </div>
        </div>

        {/* ====================================================
            CHARTS SECTION
        ==================================================== */}

        <div
          className="ctpo-charts-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 2fr) minmax(300px, 1fr)",
            gap: "18px",
            width: "100%",
            marginBottom: "16px",
          }}
        >
          {/* ==================================================
              APPROVAL ACTIVITY
          ================================================== */}

          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "14px",
              padding: "20px 24px",
              boxSizing: "border-box",
              minHeight: "300px",
              boxShadow: "0 1px 3px rgba(15, 23, 42, 0.05)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "8px",
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: "18px",
                    fontWeight: 700,
                    color: "#0f172a",
                  }}
                >
                  Approval Activity (Last 7 Days)
                </h2>

                <p
                  style={{
                    margin: "5px 0 0 0",
                    fontSize: "14px",
                    color: "#64748b",
                  }}
                >
                  Daily count of approved and rejected decisions
                </p>
              </div>

              <span
                style={{
                  fontSize: "13px",
                  color: "#94a3b8",
                  paddingTop: "2px",
                }}
              >
                Daily Volume
              </span>
            </div>

            <div
              style={{
                width: "100%",
                height: "220px",
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{
                    top: 10,
                    right: 10,
                    left: 0,
                    bottom: 0,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#e2e8f0"
                  />

                  <XAxis
                    dataKey="date"
                    tick={{
                      fontSize: 12,
                      fill: "#64748b",
                    }}
                    axisLine={{
                      stroke: "#94a3b8",
                    }}
                    tickLine={false}
                  />

                  <YAxis
                    allowDecimals={false}
                    tick={{
                      fontSize: 12,
                      fill: "#64748b",
                    }}
                    axisLine={{
                      stroke: "#94a3b8",
                    }}
                    tickLine={false}
                  />

                  <Tooltip />

                  <Legend
                    verticalAlign="bottom"
                    height={28}
                    iconType="square"
                  />

                  <Bar
                    dataKey="approved"
                    name="Approved"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                    barSize={38}
                  />

                  <Bar
                    dataKey="rejected"
                    name="Rejected"
                    fill="#ef4444"
                    radius={[4, 4, 0, 0]}
                    barSize={38}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ==================================================
              REQUESTS BY PERMISSION TYPE
          ================================================== */}

          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "14px",
              padding: "20px 24px",
              boxSizing: "border-box",
              minHeight: "300px",
              boxShadow: "0 1px 3px rgba(15, 23, 42, 0.05)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "4px",
              }}
            >
              <h2
                style={{
                  margin: 0,
                  maxWidth: "220px",
                  fontSize: "18px",
                  lineHeight: 1.35,
                  fontWeight: 700,
                  color: "#0f172a",
                }}
              >
                Requests by Permission Type
              </h2>

              <span
                style={{
                  fontSize: "13px",
                  lineHeight: 1.4,
                  color: "#64748b",
                  textAlign: "left",
                  maxWidth: "110px",
                }}
              >
                Distribution of requests
              </span>
            </div>

            <div
              className="ctpo-pie-wrapper"
              style={{
                width: "100%",
                height: "220px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={permissionTypeData}
                    dataKey="value"
                    nameKey="name"
                    cx="48%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={78}
                    paddingAngle={2}
                  >
                    {permissionTypeData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              {/* LEGEND */}

              <div
                className="ctpo-pie-legend"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "7px",
                  marginLeft: "-5px",
                  minWidth: "105px",
                }}
              >
                {permissionTypeData.map((item, index) => (
                  <div
                    key={item.name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "7px",
                      fontSize: "13px",
                      color: PIE_COLORS[index % PIE_COLORS.length],
                    }}
                  >
                    <span
                      style={{
                        width: "14px",
                        height: "14px",
                        display: "inline-block",
                        background: PIE_COLORS[index % PIE_COLORS.length],
                      }}
                    />

                    {item.name}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
};

export default CTPODashboard;
