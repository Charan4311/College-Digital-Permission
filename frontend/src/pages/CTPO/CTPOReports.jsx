import React, { useEffect, useMemo, useState } from "react";

import {
  LuClipboardList,
  LuCircleCheck,
  LuClock,
  LuCircleX,
  LuDownload,
  LuCalendarDays,
  LuFileText,
  LuTrendingUp,
  LuChartPie as PieChartIcon,
} from "react-icons/lu";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import DashboardLayout from "../../components/DashboardLayout";
import api from "../../lib/api";
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';

// ============================================================
// CTPO REPORTS
// ============================================================

export default function CTPOReports() {
  // ==========================================================
  // STATE
  // ==========================================================

  const [period, setPeriod] = useState("Last 30 Days");

  const [fromDate, setFromDate] = useState("2026-09-01");

  const [toDate, setToDate] = useState("2026-09-30");

  const [permissionType, setPermissionType] = useState("All Types");

  const [requests, setRequests] = useState([]);

  // Requests currently waiting for THIS CTPO.
  // This comes from the same endpoint used by the CTPO Pending page.
  const [ctpoPendingIds, setCtpoPendingIds] = useState(new Set());

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Chart period toggle (controls which slice of reportData.daily is shown)
  const [chartPeriod, setChartPeriod] = useState("last7");

  // ==========================================================
  // DATE HELPERS
  // ==========================================================

  const formatInputDate = (date) => {
    const year = date.getFullYear();

    const month = String(date.getMonth() + 1).padStart(2, "0");

    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const getPeriodDates = (selectedPeriod) => {
    const today = new Date();

    today.setHours(0, 0, 0, 0);

    let start = new Date(today);
    let end = new Date(today);

    // --------------------------------------------------------
    // TODAY
    // --------------------------------------------------------

    if (selectedPeriod === "Today") {
      start = new Date(today);
      end = new Date(today);
    }

    // --------------------------------------------------------
    // THIS WEEK
    // Monday -> Today
    // --------------------------------------------------------
    else if (selectedPeriod === "This Week") {
      const day = today.getDay();

      const difference = day === 0 ? 6 : day - 1;

      start = new Date(today);

      start.setDate(today.getDate() - difference);

      end = new Date(today);
    }

    // --------------------------------------------------------
    // THIS MONTH
    // --------------------------------------------------------
    else if (selectedPeriod === "This Month") {
      start = new Date(today.getFullYear(), today.getMonth(), 1);

      end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    }

    // --------------------------------------------------------
    // LAST MONTH
    // --------------------------------------------------------
    else if (selectedPeriod === "Last Month") {
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1);

      end = new Date(today.getFullYear(), today.getMonth(), 0);
    }

    // --------------------------------------------------------
    // LAST 7 DAYS
    // --------------------------------------------------------
    else if (selectedPeriod === "Last 7 Days") {
      start = new Date(today);
      start.setDate(today.getDate() - 6);
      end = new Date(today);
    }

    // --------------------------------------------------------
    // LAST 30 DAYS
    // --------------------------------------------------------
    else if (selectedPeriod === "Last 30 Days") {
      start = new Date(today);
      start.setDate(today.getDate() - 29);
      end = new Date(today);
    }

    // --------------------------------------------------------
    // LAST 6 MONTHS
    // --------------------------------------------------------
    else if (selectedPeriod === "Last 6 Months") {
      start = new Date(today.getFullYear(), today.getMonth() - 5, 1);
      end = new Date(today);
    }

    // --------------------------------------------------------
    // THIS YEAR
    // --------------------------------------------------------
    else if (selectedPeriod === "This Year") {
      start = new Date(today.getFullYear(), 0, 1);

      end = new Date(today.getFullYear(), 11, 31);
    }

    return {
      from: formatInputDate(start),
      to: formatInputDate(end),
    };
  };

  // ==========================================================
  // PERIOD BUTTON CLICK
  // ==========================================================

  const handlePeriodChange = (selectedPeriod) => {
    setPeriod(selectedPeriod);

    const dates = getPeriodDates(selectedPeriod);

    setFromDate(dates.from);
    setToDate(dates.to);
  };

  // ==========================================================
  // LOAD CTPO REQUESTS
  // ==========================================================

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError("");

      // ------------------------------------------------------
      // 1. Load all requests for this CTPO
      // ------------------------------------------------------
      const allResponse = await api.get("/outpass/all/for-me");

      const allData = allResponse?.data;

      let loadedRequests = [];

      if (Array.isArray(allData)) {
        loadedRequests = allData;
      } else if (Array.isArray(allData?.requests)) {
        loadedRequests = allData.requests;
      } else if (Array.isArray(allData?.data)) {
        loadedRequests = allData.data;
      } else if (Array.isArray(allData?.data?.requests)) {
        loadedRequests = allData.data.requests;
      } else if (Array.isArray(allData?.results)) {
        loadedRequests = allData.results;
      }

      // ------------------------------------------------------
      // 2. Load ONLY requests currently pending for this CTPO
      // ------------------------------------------------------
      // IMPORTANT: Do not calculate CTPO pending as
      // "anything that is not approved/rejected".
      // That was causing HOD/Placement/etc. pending requests
      // to be counted as CTPO pending.
      const pendingResponse = await api.get("/outpass/pending/for-me");

      const pendingData = pendingResponse?.data;
      let pendingRequests = [];

      if (Array.isArray(pendingData)) {
        pendingRequests = pendingData;
      } else if (Array.isArray(pendingData?.requests)) {
        pendingRequests = pendingData.requests;
      } else if (Array.isArray(pendingData?.data)) {
        pendingRequests = pendingData.data;
      } else if (Array.isArray(pendingData?.data?.requests)) {
        pendingRequests = pendingData.data.requests;
      }

      const getRequestId = (request) =>
        String(request?._id || request?.id || request?.requestId || "");

      const pendingIds = new Set(
        pendingRequests.map(getRequestId).filter(Boolean),
      );

      setRequests(Array.isArray(loadedRequests) ? loadedRequests : []);

      setCtpoPendingIds(pendingIds);
      setLastUpdated(new Date());

      console.log("CTPO REPORT - all requests:", loadedRequests);

      console.log("CTPO REPORT - pending for me:", pendingRequests);
    } catch (err) {
      console.error("CTPO Reports Error:", err);

      setRequests([]);
      setCtpoPendingIds(new Set());

      setError(err?.response?.data?.message || "Failed to load report data.");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // INITIAL LOAD + AUTO REFRESH
  // ==========================================================

  useEffect(() => {
    loadRequests();

    // Refresh the report data periodically so newly submitted
    // requests are reflected in the counters without changing
    // any existing report/filter functionality.
    const refreshTimer = setInterval(() => {
      loadRequests();
    }, 30000);

    // Refresh immediately when the user returns to this tab.
    const handleWindowFocus = () => {
      loadRequests();
    };

    window.addEventListener("focus", handleWindowFocus);

    return () => {
      clearInterval(refreshTimer);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, []);

  // ==========================================================
  // NORMALIZE REQUEST DATA
  // ==========================================================

  const normalizedRequests = useMemo(() => {
    return requests.map((request) => {
      // ----------------------------------------------------
      // STATUS
      // ----------------------------------------------------

      const status = String(
        request?.status ||
          request?.approvalStatus ||
          request?.requestStatus ||
          request?.currentStatus ||
          "",
      ).toUpperCase();

      // ----------------------------------------------------
      // PERMISSION TYPE
      // ----------------------------------------------------

      let rawType =
        request?.permissionType?.name ||
        request?.permissionType?.label ||
        request?.permissionTypeName ||
        request?.requestType ||
        request?.type ||
        request?.permissionType ||
        "Other";

      let permissionType = String(rawType);

      const typeMap = {
        OUTPASS: "Out-Pass",

        OUT_PASS: "Out-Pass",

        OUT_PASS_REQUEST: "Out-Pass",

        MESS: "Mess Fee",

        MESS_FEE: "Mess Fee",

        INTERNSHIP: "Internship",

        LIBRARY: "Library",

        WORKSHOP: "Workshop / Seminar",

        SEMINAR: "Workshop / Seminar",

        EVENT: "Event",

        INDUSTRIAL_VISIT: "Industrial Visit",

        HOSTEL_LEAVE: "Hostel Leave",
      };

      const normalizedTypeKey = permissionType
        .trim()
        .toUpperCase()
        .replace(/[\s-]+/g, "_");

      permissionType = typeMap[normalizedTypeKey] || permissionType;

      // ----------------------------------------------------
      // STUDENT TYPE
      // ----------------------------------------------------

      const studentTypeRaw =
        request?.studentType ||
        request?.student?.studentType ||
        request?.student?.type ||
        request?.requestData?.studentType ||
        "";

      const studentType = String(studentTypeRaw).toUpperCase();

      // ----------------------------------------------------
      // DATE
      // ----------------------------------------------------

      const submittedDate =
        request?.createdAt ||
        request?.submittedAt ||
        request?.submittedOn ||
        request?.date ||
        request?.created_at;

      // ----------------------------------------------------
      // REQUEST ID
      // ----------------------------------------------------

      const id = request?._id || request?.id || request?.requestId;

      return {
        ...request,

        _id: id,

        _status: status,

        _permissionType: permissionType,

        _studentType: studentType,

        _submittedDate: submittedDate,
      };
    });
  }, [requests]);

  // ==========================================================
  // CTPO PENDING STATUS
  // ==========================================================

  const isPendingForThisCTPO = (request) => {
    const id = String(request?._id || "");
    return id && ctpoPendingIds.has(id);
  };

  // ==========================================================
  // FILTER BY DATE + PERMISSION TYPE
  // ==========================================================

  const filteredRequests = useMemo(() => {
    const start = fromDate ? new Date(`${fromDate}T00:00:00`) : null;

    const end = toDate ? new Date(`${toDate}T23:59:59`) : null;

    return normalizedRequests.filter((request) => {
      // ----------------------------------------------------
      // DATE FILTER
      // ----------------------------------------------------

      let matchesDate = true;

      if (request._submittedDate) {
        const requestDate = new Date(request._submittedDate);

        if (!Number.isNaN(requestDate.getTime())) {
          if (start && requestDate < start) {
            matchesDate = false;
          }

          if (end && requestDate > end) {
            matchesDate = false;
          }
        }
      }

      // ----------------------------------------------------
      // PERMISSION TYPE FILTER
      // ----------------------------------------------------

      let matchesType = true;

      if (permissionType !== "All Types") {
        matchesType = request._permissionType
          .toLowerCase()
          .includes(permissionType.toLowerCase());
      }

      return matchesDate && matchesType;
    });
  }, [normalizedRequests, fromDate, toDate, permissionType]);

  // ==========================================================
  // CTPO DECISION HELPERS
  // ==========================================================

  const getApprovalStages = (request) => {
    const sources = [
      request?.approvalStages,
      request?.approvalHistory,
      request?.approvals,
      request?.workflowStages,
      request?.stages,
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

  const getStageRole = (stage) =>
    String(
      stage?.approverRole ||
        stage?.role ||
        stage?.approver?.role ||
        stage?.authorityRole ||
        stage?.approver?.authorityRole ||
        stage?.approverType ||
        "",
    )
      .trim()
      .toUpperCase();

  const getStageDecision = (stage) =>
    normalizeDecision(
      stage?.decision ||
        stage?.action ||
        stage?.status ||
        stage?.approvalStatus,
    );

  // IMPORTANT:
  // Reports measure the CTPO's own decision.
  // CTPO APPROVED -> HOD REJECTED remains CTPO Approved.
  // Only CTPO REJECTED is counted as CTPO Rejected.
  //
  // SINGLE SOURCE OF TRUTH: This logic is kept identical to
  // CTPOHistory's getCTPODecision() so that Dashboard, History,
  // and Reports always produce the same counts.
  const getCTPODecision = (request) => {
    // --------------------------------------------------------
    // 1. DIRECT CTPO DECISION FIELD
    // --------------------------------------------------------
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
    // 2. APPROVAL STAGES
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
    // 3. STATUS FALLBACK
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

    // CTPO explicitly rejected
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

    // Later workflow stage means CTPO already approved
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
      status === "CLEARED" ||
      status === "FINALIZED" ||
      status === "COMPLETED" ||
      status === "ISSUED" ||
      status === "VERIFIED" ||
      status === "USED" ||
      status === "RETURNED"
    ) {
      return "APPROVED";
    }

    // Generic REJECTED — use rejectedByRole to determine who rejected
    if (
      status === "REJECTED" ||
      status === "DENIED" ||
      status === "REJECT"
    ) {
      const rejectedByRole = String(
        request?.rejectedByRole ||
          request?.rejectedBy?.role ||
          request?.rejectedBy?.authorityRole ||
          request?.lastActionByRole ||
          request?.lastDecisionByRole ||
          request?.lastApproverRole ||
          "",
      )
        .trim()
        .toUpperCase();

      if (
        rejectedByRole === "CTPO" ||
        rejectedByRole.includes("CTPO")
      ) {
        return "REJECTED";
      }

      if (
        rejectedByRole.includes("HOD") ||
        rejectedByRole.includes("WARDEN") ||
        rejectedByRole.includes("HOSTEL") ||
        rejectedByRole.includes("PLACEMENT") ||
        rejectedByRole.includes("DEAN") ||
        rejectedByRole.includes("PRINCIPAL") ||
        rejectedByRole.includes("SECURITY") ||
        rejectedByRole.includes("FACULTY")
      ) {
        // Another authority rejected after CTPO approved
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

  const getCTPODecisionDate = (request, decision) => {
    const stage = getApprovalStages(request).find((item) => {
      const role = getStageRole(item);

      return (
        (role === "CTPO" || role.includes("CTPO")) &&
        getStageDecision(item) === decision
      );
    });

    if (stage) {
      const stageDate =
        stage?.decidedAt ||
        stage?.decisionAt ||
        (decision === "APPROVED" ? stage?.approvedAt : stage?.rejectedAt);

      if (stageDate) {
        return stageDate;
      }
    }

    if (decision === "APPROVED") {
      return (
        request?.ctpoApprovedAt ||
        request?.ctpoApprovalAt ||
        request?.approvedAt ||
        null
      );
    }

    return (
      request?.ctpoRejectedAt ||
      request?.ctpoRejectionAt ||
      request?.rejectedAt ||
      null
    );
  };

  // ==========================================================
  // STATUS HELPERS
  // ==========================================================

  const isApproved = (request) => {
    return getCTPODecision(request) === "APPROVED";
  };

  const isRejected = (request) => {
    return getCTPODecision(request) === "REJECTED";
  };

  // isPending now uses getCTPODecision() === "" — same as
  // CTPOHistory — for a single source of truth.
  const isPending = (request) => {
    return getCTPODecision(request) === "";
  };

  // ==========================================================
  // REPORT DATA
  // ==========================================================

  const reportData = useMemo(() => {
    const total = filteredRequests.length;

    // SINGLE SOURCE OF TRUTH:
    // All three counts use getCTPODecision() — identical to
    // CTPOHistory's counting logic. This guarantees:
    //   Total = Approved + Pending + Rejected
    // across Dashboard, History, and Reports.

    const pending = filteredRequests.filter((request) =>
      getCTPODecision(request) === "",
    ).length;

    const rejected = filteredRequests.filter((request) =>
      isRejected(request),
    ).length;

    const approved = filteredRequests.filter((request) =>
      isApproved(request),
    ).length;

    // --------------------------------------------------------
    // STUDENT TYPE
    // --------------------------------------------------------

    let dayScholar = 0;
    let hosteller = 0;

    filteredRequests.forEach((request) => {
      const type = request._studentType;

      if (type.includes("HOSTEL")) {
        hosteller += 1;
      } else if (type.includes("DAY") || type.includes("SCHOLAR")) {
        dayScholar += 1;
      }
    });

    // --------------------------------------------------------
    // PERMISSION TYPES
    // --------------------------------------------------------

    const permissionTypes = {};

    filteredRequests.forEach((request) => {
      const type = request._permissionType || "Other";

      permissionTypes[type] = (permissionTypes[type] || 0) + 1;
    });

    // --------------------------------------------------------
    // DAILY CTPO ACTIVITY
    // --------------------------------------------------------

    const dailyMap = {};

    filteredRequests.forEach((request) => {
      const decision = getCTPODecision(request);

      // Pending has no decision yet, so keep it on the submitted date.
      // Approved / Rejected use the CTPO decision date when available.
      const dateValue =
        decision === "APPROVED" || decision === "REJECTED"
          ? getCTPODecisionDate(request, decision)
          : request._submittedDate;

      if (!dateValue) {
        return;
      }

      const date = new Date(dateValue);

      if (Number.isNaN(date.getTime())) {
        return;
      }

      const key = date.toLocaleDateString("en-CA");

      if (!dailyMap[key]) {
        dailyMap[key] = {
          date: date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
          }),

          approved: 0,

          pending: 0,

          rejected: 0,
        };
      }

      if (decision === "REJECTED") {
        dailyMap[key].rejected += 1;
      } else if (decision === "") {
        // Pending = no CTPO decision yet (matches CTPOHistory counting)
        dailyMap[key].pending += 1;
      } else if (decision === "APPROVED") {
        dailyMap[key].approved += 1;
      }
    });

    const daily = Object.keys(dailyMap)
      .sort()
      .map((key) => dailyMap[key]);

    return {
      total,

      approved,

      pending,

      rejected,

      studentType: {
        dayScholar,

        hosteller,
      },

      permissionTypes,

      daily,
    };
  }, [filteredRequests]);

  // ==========================================================
  // MAX DAILY VALUE
  // ==========================================================

  const maxDailyValue = Math.max(
    ...reportData.daily.map((item) =>
      Math.max(item.approved, item.pending, item.rejected),
    ),

    1,
  );

  // ==========================================================
  // CHART COLORS
  // ==========================================================

  const DONUT_COLORS = [
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#06b6d4",
    "#ec4899",
    "#64748b",
  ];

  // ==========================================================
  // CHART PERIOD DATA
  //
  // This is INDEPENDENT of the date/type filter above.
  // The chart period toggle (Last 7 days, Last 30 days, …)
  // always operates on ALL normalizedRequests so the chart
  // reflects a rolling time window regardless of what is
  // selected in the Report Period / From-To / Type filters.
  //
  // Rules:
  //  - Each calendar day (or month for last6m/year) in the
  //    window gets exactly one data point.
  //  - Days with no requests show 0 — never fake values.
  //  - Requests are bucketed by their submission date.
  //  - Approved / Pending / Rejected use getCTPODecision().
  //  - total = approved + pending + rejected.
  // ==========================================================

  const visibleChartData = useMemo(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    // --------------------------------------------------------
    // Determine window start and grouping granularity
    // --------------------------------------------------------
    let windowStart;
    let granularity; // "day" | "month"

    if (chartPeriod === "last7") {
      windowStart = new Date(today);
      windowStart.setDate(today.getDate() - 6);
      windowStart.setHours(0, 0, 0, 0);
      granularity = "day";
    } else if (chartPeriod === "last30") {
      windowStart = new Date(today);
      windowStart.setDate(today.getDate() - 29);
      windowStart.setHours(0, 0, 0, 0);
      granularity = "day";
    } else if (chartPeriod === "last6m") {
      windowStart = new Date(today.getFullYear(), today.getMonth() - 5, 1);
      windowStart.setHours(0, 0, 0, 0);
      granularity = "month";
    } else {
      // "year" — 1 Jan of the current year
      windowStart = new Date(today.getFullYear(), 0, 1);
      windowStart.setHours(0, 0, 0, 0);
      granularity = "month";
    }

    // --------------------------------------------------------
    // Build the ordered set of bucket keys covering the window
    // --------------------------------------------------------
    const bucketKeys = [];

    if (granularity === "day") {
      const cursor = new Date(windowStart);
      while (cursor <= today) {
        bucketKeys.push(cursor.toLocaleDateString("en-CA")); // YYYY-MM-DD
        cursor.setDate(cursor.getDate() + 1);
      }
    } else {
      // month buckets: YYYY-MM
      const cursor = new Date(
        windowStart.getFullYear(),
        windowStart.getMonth(),
        1,
      );
      const endMonth = new Date(
        today.getFullYear(),
        today.getMonth(),
        1,
      );
      while (cursor <= endMonth) {
        const y = cursor.getFullYear();
        const m = String(cursor.getMonth() + 1).padStart(2, "0");
        bucketKeys.push(`${y}-${m}`);
        cursor.setMonth(cursor.getMonth() + 1);
      }
    }

    // Initialise all buckets with zeros
    const bucketMap = {};
    bucketKeys.forEach((key) => {
      bucketMap[key] = { approved: 0, pending: 0, rejected: 0 };
    });

    // --------------------------------------------------------
    // Bucket ALL requests by their submitted date
    // --------------------------------------------------------
    normalizedRequests.forEach((request) => {
      const dateValue = request._submittedDate;
      if (!dateValue) return;

      const d = new Date(dateValue);
      if (Number.isNaN(d.getTime())) return;

      // Only count requests inside the window
      if (d < windowStart || d > today) return;

      let key;
      if (granularity === "day") {
        key = d.toLocaleDateString("en-CA"); // YYYY-MM-DD
      } else {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        key = `${y}-${m}`;
      }

      if (!bucketMap[key]) return; // outside window (safety)

      const decision = getCTPODecision(request);
      if (decision === "APPROVED") {
        bucketMap[key].approved += 1;
      } else if (decision === "REJECTED") {
        bucketMap[key].rejected += 1;
      } else {
        bucketMap[key].pending += 1;
      }
    });

    // --------------------------------------------------------
    // Convert to chart-ready array with display labels
    // --------------------------------------------------------
    return bucketKeys.map((key) => {
      const { approved, pending, rejected } = bucketMap[key];
      const total = approved + pending + rejected;

      let label;
      if (granularity === "day") {
        // "DD MMM"  e.g. "15 Sep"
        const d = new Date(`${key}T00:00:00`);
        label = d.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
        });
      } else {
        // "MMM YY"  e.g. "Apr 26"
        const [y, m] = key.split("-");
        const d = new Date(Number(y), Number(m) - 1, 1);
        label = d.toLocaleDateString("en-IN", {
          month: "short",
          year: "2-digit",
        });
      }

      return { date: label, total, approved, pending, rejected };
    });
  }, [normalizedRequests, chartPeriod]);

  // ==========================================================
  // PIE / DONUT DATA
  // ==========================================================

  const pieData = useMemo(
    () =>
      Object.entries(reportData.permissionTypes).map(([name, value]) => ({
        name,
        value,
      })),
    [reportData.permissionTypes],
  );

  // ==========================================================
  // PERCENTAGE
  // ==========================================================

  const percentage = (value) => {
    if (!reportData.total) {
      return 0;
    }

    return Math.round((value / reportData.total) * 100);
  };

  // ==========================================================
  // FORMAT DATE
  // ==========================================================

  const formatDateForDisplay = (value) => {
    if (!value) {
      return "-";
    }

    const date = new Date(`${value}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // ==========================================================
  // GENERATE PRINT / PDF REPORT
  // ==========================================================

  const generatePdfReport = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.setTextColor(15, 23, 42);
      doc.text("CTPO Class Permission Report", 14, 20);

      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text("Period: " + period + " (" + fromDate + " to " + toDate + ") | Scope: " + permissionType, 14, 28);
      doc.text("Generated: " + new Date().toLocaleString("en-IN"), 14, 34);

      // Summary statistics
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(
        "Total: " + reportData.total + "   |   Approved: " + reportData.approved + "   |   Pending: " + reportData.pending + "   |   Rejected: " + reportData.rejected,
        14,
        44
      );

      // Permission Breakdown Table
      const permissionHeaders = [["Permission Type", "Count"]];
      const permissionData = Object.entries(reportData.permissionTypes).map(([type, count]) => [type, count]);

      autoTable(doc, {
        head: permissionHeaders,
        body: permissionData,
        startY: 50,
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [79, 70, 229], textColor: 255 },
      });

      // Daily Activity Table
      const dailyHeaders = [["Date", "Approved", "Pending", "Rejected"]];
      const dailyData = reportData.daily.map((item) => [item.date, item.approved, item.pending, item.rejected]);

      autoTable(doc, {
        head: dailyHeaders,
        body: dailyData,
        startY: (doc.lastAutoTable?.finalY || 100) + 12,
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [79, 70, 229], textColor: 255 },
      });

      doc.save("ctpo-report-" + period.toLowerCase().replace(/\s+/g, "-") + ".pdf");
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to generate PDF. Please try again.");
    }
  };

  // ==========================================================
  // GENERATE REPORT BUTTON
  // ==========================================================

  const handleGenerateReport = () => {
    generatePdfReport();
  };

  // ==========================================================
  // DOWNLOAD REPORT BUTTON
  // ==========================================================

  const handleDownload = () => {
    generatePdfReport();
  };

  // ==========================================================
  // LAST UPDATED
  // ==========================================================

  const formattedLastUpdated = lastUpdated.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <DashboardLayout>
        <div
          style={{
            padding: "40px",
            textAlign: "center",
          }}
        >
          Loading report data...
        </div>
      </DashboardLayout>
    );
  }

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <DashboardLayout>
      <div className="ctpo-reports-page">
        {/* =====================================================
            HEADER
        ===================================================== */}

        <div className="ctpo-reports-header">
          <div className="ctpo-reports-title-row">
            <div>
              <h1>Reports &amp; Analytics</h1>

              <p>
                Monitor permission activity, approval status and request trends.
              </p>
            </div>
          </div>

          <div className="ctpo-header-right">
            <div className="ctpo-last-updated">
              Last updated: {formattedLastUpdated}
            </div>

            {/* PERIOD DROPDOWN + EXPORT BUTTON */}
            <div className="ctpo-header-controls">
              <div className="ctpo-period-dropdown-wrap">
                <LuCalendarDays size={15} className="ctpo-period-dropdown-icon" />
                <Select
                  id="ctpo-report-period-select"
                  className="ctpo-period-dropdown"
                  value={period}
                  onValueChange={handlePeriodChange}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["Today", "Last 7 Days", "Last 30 Days", "Last 6 Months", "This Year"].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <Button
                type="button"
                id="ctpo-export-report-btn"
                className="ctpo-export-button"
                onClick={handleDownload}
              >
                <LuDownload size={15} />
                Export Report
              </Button>
            </div>
          </div>
        </div>

        {/* =====================================================
            ERROR
        ===================================================== */}

        {error && (
          <div
            style={{
              marginBottom: "15px",
              padding: "12px 15px",
              borderRadius: "8px",
              background: "#fef2f2",
              color: "#b91c1c",
              border: "1px solid #fecaca",
              fontSize: "13px",
            }}
          >
            {error}
          </div>
        )}

        {/* =====================================================
            REPORT FILTER
        ===================================================== */}



        {/* =====================================================
            SUMMARY CARDS
        ===================================================== */}

        <div className="ctpo-report-summary-grid">
          {/* TOTAL */}

          <div className="ctpo-summary-card">
            <div className="ctpo-summary-icon blue">
              <LuClipboardList size={21} />
            </div>

            <div>
              <span>Total Requests</span>

              <strong>{reportData.total}</strong>

              <small>selected period</small>
            </div>
          </div>

          {/* APPROVED */}

          <div className="ctpo-summary-card">
            <div className="ctpo-summary-icon green">
              <LuCircleCheck size={21} />
            </div>

            <div>
              <span>Approved</span>

              <strong>{reportData.approved}</strong>

              <small>{percentage(reportData.approved)}% of total</small>
            </div>
          </div>

          {/* PENDING */}

          <div className="ctpo-summary-card">
            <div className="ctpo-summary-icon orange">
              <LuClock size={21} />
            </div>

            <div>
              <span>Pending</span>

              <strong>{reportData.pending}</strong>

              <small>{percentage(reportData.pending)}% of total</small>
            </div>
          </div>

          {/* REJECTED */}

          <div className="ctpo-summary-card">
            <div className="ctpo-summary-icon red">
              <LuCircleX size={21} />
            </div>

            <div>
              <span>Rejected</span>

              <strong>{reportData.rejected}</strong>

              <small>{percentage(reportData.rejected)}% of total</small>
            </div>
          </div>
        </div>

        {/* =====================================================
            CHART SECTION — Recharts
        ===================================================== */}

        <div className="ctpo-report-main-grid">

          {/* CHART 1 — PERMISSION REQUESTS TREND */}

          <div className="ctpo-report-card">
            <div className="ctpo-trend-header">
              <div>
                <h2 className="ctpo-trend-title">
                  <LuTrendingUp size={18} />
                  Permission Requests Trend
                </h2>
                <p className="ctpo-trend-subtitle">
                  Daily request count and status over time
                </p>
              </div>

              <div className="ctpo-chart-period-btns">
                {[
                  { key: "last7",  label: "Last 7 days" },
                  { key: "last30", label: "Last 30 days" },
                  { key: "last6m", label: "Last 6 months" },
                  { key: "year",   label: "This year" },
                ].map(({ key, label }) => (
                  <Button
                    key={key}
                    type="button"
                    className={chartPeriod === key ? "ctpo-cpbtn active" : "ctpo-cpbtn"}
                    onClick={() => setChartPeriod(key)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            {visibleChartData.length === 0 ? (
              <div className="ctpo-chart-empty">
                No data available for the selected period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart
                  data={visibleChartData}
                  margin={{ top: 8, right: 16, left: -8, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradApproved" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.22} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradPending" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.22} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradRejected" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.22} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    tickLine={false}
                    axisLine={{ stroke: "#e2e8f0" }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#fff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "10px",
                      fontSize: "12px",
                      boxShadow: "0 4px 16px rgba(15,23,42,0.08)",
                    }}
                    itemStyle={{ color: "#334155" }}
                    labelStyle={{ color: "#0f172a", fontWeight: 700 }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
                    iconType="circle"
                    iconSize={8}
                  />
                  <Area type="monotone" dataKey="total"    name="Total"    stroke="#3b82f6" strokeWidth={2} fill="url(#gradTotal)"    dot={false} activeDot={{ r: 5 }} />
                  <Area type="monotone" dataKey="approved" name="Approved" stroke="#10b981" strokeWidth={2} fill="url(#gradApproved)" dot={false} activeDot={{ r: 5 }} />
                  <Area type="monotone" dataKey="pending"  name="Pending"  stroke="#f59e0b" strokeWidth={2} fill="url(#gradPending)"  dot={false} activeDot={{ r: 5 }} />
                  <Area type="monotone" dataKey="rejected" name="Rejected" stroke="#ef4444" strokeWidth={2} fill="url(#gradRejected)" dot={false} activeDot={{ r: 5 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* CHART 2 — PERMISSION TYPE DISTRIBUTION */}


          <div className="ctpo-report-card">
            <div className="ctpo-card-header">
              <div>
                <h2>Requests by Permission Type</h2>

                <p>Distribution of class requests</p>
              </div>
            </div>

            {pieData.length === 0 ? (
              <div className="ctpo-chart-empty">
                No data available for the selected period
              </div>
            ) : (
              <div className="ctpo-donut-wrapper">
                {/* Recharts PieChart donut with center label */}
                <div className="ctpo-recharts-donut">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={58}
                        outerRadius={88}
                        paddingAngle={2}
                        dataKey="value"
                        nameKey="name"
                        strokeWidth={0}
                      >
                        {pieData.map((entry, index) => (
                          <Cell
                            key={`cell-${entry.name}`}
                            fill={DONUT_COLORS[index % DONUT_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "#fff",
                          border: "1px solid #e2e8f0",
                          borderRadius: "10px",
                          fontSize: "12px",
                          boxShadow: "0 4px 16px rgba(15,23,42,0.08)",
                        }}
                        formatter={(value, name) => [
                          `${value} (${percentage(value)}%)`,
                          name,
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Dynamic center label */}
                  <div className="ctpo-donut-center-label">
                    <strong>{reportData.total}</strong>
                    <span>Total Requests</span>
                  </div>
                </div>

                {/* Legend list */}
                <div className="ctpo-type-list">
                  {pieData.map((entry, index) => (
                    <div className="ctpo-type-item" key={entry.name}>
                      <div>
                        <i
                          style={{
                            background:
                              DONUT_COLORS[index % DONUT_COLORS.length],
                          }}
                        />
                        <span>{entry.name}</span>
                      </div>
                      <div className="ctpo-type-counts">
                        <strong>{entry.value}</strong>
                        <em>{percentage(entry.value)}%</em>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* =====================================================
          STYLES
      ===================================================== */}

      <style>{`

        .ctpo-reports-page {
          width: 100%;
          max-width: 1600px;
          margin: 0 auto;
          padding: 28px 32px 40px;
          box-sizing: border-box;
          background: #f8fafc;
          min-height: 100%;
          color: #0f172a;
        }

        .ctpo-reports-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 24px;
          margin-bottom: 22px;
        }

        .ctpo-reports-header h1 {
          margin: 0;
          font-size: clamp(25px, 2vw, 31px);
          line-height: 1.15;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: #0f172a;
        }

        .ctpo-reports-header p {
          margin: 8px 0 0;
          color: #64748b;
          font-size: 14px;
          line-height: 1.5;
        }

        .ctpo-last-updated {
          color: #94a3b8;
          font-size: 12px;
          padding-top: 7px;
          white-space: nowrap;
        }

        /* ====== HEADER RIGHT CONTROLS ====== */

        .ctpo-header-right {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 10px;
          flex-shrink: 0;
        }

        .ctpo-header-controls {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: nowrap;
        }

        .ctpo-period-dropdown-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .ctpo-period-dropdown-icon {
          position: absolute;
          left: 10px;
          color: #64748b;
          pointer-events: none;
        }

        .ctpo-period-dropdown {
          height: 38px;
          padding: 0 12px 0 30px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background: #fff;
          color: #334155;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          outline: none;
          appearance: auto;
          box-shadow: 0 1px 3px rgba(15,23,42,.05);
          transition: border-color .15s ease, box-shadow .15s ease;
        }

        .ctpo-period-dropdown:focus {
          border-color: #60a5fa;
          box-shadow: 0 0 0 3px rgba(37,99,235,.12);
        }

        .ctpo-export-button {
          height: 38px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 0 16px;
          border: 1px solid #2563eb;
          border-radius: 8px;
          background: #2563eb;
          color: #ffffff;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          box-shadow: 0 2px 5px rgba(37,99,235,0.2);
          transition: background .18s ease, box-shadow .18s ease, transform .18s ease;
        }

        .ctpo-export-button:hover {
          background: #1d4ed8;
          border-color: #1d4ed8;
          box-shadow: 0 4px 10px rgba(37,99,235,0.28);
        }

        .ctpo-export-button:active {
          transform: translateY(1px);
        }

        /* ====== FILTER CARD ====== */

        .ctpo-report-filter-card {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 16px 20px;
          margin-bottom: 18px;
          box-shadow: 0 1px 3px rgba(15,23,42,.04);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }

        .ctpo-report-filter-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 700;
          color: #334155;
          font-size: 14px;
        }

        .ctpo-period-selected-label {
          background: #eff6ff;
          color: #2563eb;
          border: 1px solid #bfdbfe;
          border-radius: 20px;
          padding: 2px 10px;
          font-size: 11px;
          font-weight: 700;
          margin-left: 2px;
        }

        .ctpo-report-filter-action {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .ctpo-report-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .ctpo-report-field label {
          font-size: 11px;
          font-weight: 700;
          color: #94a3b8;
        }

        .ctpo-date-input {
          height: 40px;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 10px;
          border: 1px solid #dbe3ef;
          border-radius: 8px;
          background: #fff;
        }

        .ctpo-date-input input {
          border: none;
          outline: none;
          width: 100%;
          color: #334155;
        }

        .ctpo-report-field select {
          height: 40px;
          border: 1px solid #dbe3ef;
          border-radius: 8px;
          padding: 0 10px;
          background: #fff;
          color: #334155;
          outline: none;
        }

        .ctpo-generate-button {
          min-width: 170px;
          height: 40px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 0 18px;
          border: 1px solid #2563eb;
          border-radius: 8px;
          background: #2563eb;
          color: #ffffff;
          font-size: 13px;
          font-weight: 700;
          line-height: 1;
          cursor: pointer;
          box-shadow: 0 2px 5px rgba(37, 99, 235, 0.18);
          transition: background .18s ease, box-shadow .18s ease, transform .18s ease;
        }

        .ctpo-generate-button:hover {
          background: #1d4ed8;
          border-color: #1d4ed8;
          box-shadow: 0 4px 10px rgba(37, 99, 235, 0.22);
        }

        .ctpo-generate-button:active {
          transform: translateY(1px);
        }

        .ctpo-generate-button svg {
          flex-shrink: 0;
        }

        .ctpo-report-summary-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 16px;
        }

        .ctpo-summary-card {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 17px;
          display: flex;
          align-items: center;
          gap: 13px;
        }

        .ctpo-summary-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .ctpo-summary-icon.blue {
          background: #eff6ff;
          color: #2563eb;
        }

        .ctpo-summary-icon.green {
          background: #ecfdf5;
          color: #10b981;
        }

        .ctpo-summary-icon.orange {
          background: #fff7ed;
          color: #f59e0b;
        }

        .ctpo-summary-icon.red {
          background: #fef2f2;
          color: #ef4444;
        }

        .ctpo-summary-card span {
          display: block;
          color: #94a3b8;
          font-size: 11px;
          margin-bottom: 3px;
        }

        .ctpo-summary-card strong {
          display: block;
          font-size: 24px;
          color: #0f172a;
        }

        .ctpo-summary-card small {
          color: #94a3b8;
          font-size: 10px;
        }

        .ctpo-report-info {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 15px;
          margin-bottom: 16px;
          border-radius: 9px;
          background: #eff6ff;
          color: #475569;
          border: 1px solid #dbeafe;
          font-size: 13px;
        }

        .ctpo-report-main-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.65fr) minmax(340px, 1fr);
          gap: 16px;
          align-items: stretch;
          margin-bottom: 16px;
        }


        .ctpo-report-card {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 20px;
          box-sizing: border-box;
          min-width: 0;
          overflow: hidden;
        }

        .ctpo-card-header {
          display: flex;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 18px;
        }

        .ctpo-card-header h2 {
          margin: 0;
          font-size: 17px;
          color: #0f172a;
        }

        .ctpo-card-header p {
          margin: 5px 0 0;
          color: #94a3b8;
          font-size: 11px;
        }

        .ctpo-card-header > span {
          color: #94a3b8;
          font-size: 12px;
        }

        .ctpo-chart {
          height: 220px;
          display: flex;
          min-width: 0;
        }

        /* ====== TREND CHART HEADER ====== */

        .ctpo-trend-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 14px;
          flex-wrap: wrap;
          margin-bottom: 16px;
        }

        .ctpo-trend-title {
          margin: 0;
          font-size: 16px;
          font-weight: 700;
          color: #0f172a;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .ctpo-trend-subtitle {
          margin: 5px 0 0;
          color: #94a3b8;
          font-size: 12px;
        }

        /* ====== CHART PERIOD TOGGLE BUTTONS ====== */

        .ctpo-chart-period-btns {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
          align-items: center;
        }

        .ctpo-cpbtn {
          height: 30px;
          padding: 0 11px;
          border: 1px solid #e2e8f0;
          background: #fff;
          color: #64748b;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          font-size: 11px;
          transition: all 0.15s ease;
          white-space: nowrap;
        }

        .ctpo-cpbtn:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
        }

        .ctpo-cpbtn.active {
          background: #2563eb;
          color: #fff;
          border-color: #2563eb;
          box-shadow: 0 2px 6px rgba(37,99,235,0.22);
        }

        /* ====== CHART EMPTY STATE ====== */

        .ctpo-chart-empty {
          height: 200px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #94a3b8;
          font-size: 13px;
        }

        /* ====== DONUT CHART (Recharts) ====== */

        .ctpo-donut-wrapper {
          display: flex;
          align-items: flex-start;
          gap: 20px;
          padding: 8px 0;
          flex-wrap: wrap;
        }

        .ctpo-recharts-donut {
          position: relative;
          flex-shrink: 0;
          width: 200px;
          min-width: 160px;
        }

        .ctpo-donut-center-label {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          text-align: center;
        }

        .ctpo-donut-center-label strong {
          font-size: 22px;
          font-weight: 800;
          color: #0f172a;
          line-height: 1;
        }

        .ctpo-donut-center-label span {
          font-size: 10px;
          color: #94a3b8;
          margin-top: 3px;
          white-space: nowrap;
        }

        /* ====== TYPE LIST (legend) ====== */

        .ctpo-type-list {
          flex: 1;
          min-width: 130px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: 200px;
          overflow-y: auto;
        }

        .ctpo-type-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          font-size: 12px;
        }

        .ctpo-type-item div {
          display: flex;
          align-items: center;
          gap: 7px;
          color: #475569;
          flex: 1;
          min-width: 0;
        }

        .ctpo-type-item span {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .ctpo-type-item i {
          width: 9px;
          height: 9px;
          border-radius: 2px;
          flex-shrink: 0;
        }

        .ctpo-type-counts {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .ctpo-type-counts strong {
          font-weight: 700;
          color: #0f172a;
          font-size: 13px;
          min-width: 22px;
          text-align: right;
        }

        .ctpo-type-counts em {
          font-style: normal;
          color: #94a3b8;
          font-size: 11px;
          min-width: 36px;
          text-align: right;
        }






        .day-scholar-dot,
        .hosteller-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .day-scholar-dot {
          background: #2563eb;
        }

        .hosteller-dot {
          background: #10b981;
        }






        @media (max-width: 1200px) {

          .ctpo-report-summary-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .ctpo-report-filter-row {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .ctpo-generate-button {
            width: 100%;
          }

          .ctpo-report-main-grid {
            grid-template-columns: minmax(0, 1.4fr) minmax(300px, 1fr);
          }

          .ctpo-header-controls {
            flex-wrap: wrap;
          }

        }

        @media (max-width: 900px) {

          .ctpo-reports-page {
            padding: 22px 20px 32px;
          }

          .ctpo-report-main-grid {
            grid-template-columns: 1fr;
          }

          .ctpo-reports-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .ctpo-header-right {
            align-items: flex-start;
            width: 100%;
          }

          .ctpo-header-controls {
            width: 100%;
          }

          .ctpo-last-updated {
            padding-top: 0;
          }

        }

        @media (max-width: 600px) {

          .ctpo-reports-page {
            padding: 16px 12px 28px;
          }

          .ctpo-reports-header {
            margin-bottom: 16px;
          }

          .ctpo-reports-title-row {
            display: flex;
            align-items: center;
            gap: 10px;
          }

          .ctpo-reports-header h1 {
            font-size: 22px;
          }

          .ctpo-reports-header p {
            font-size: 13px;
          }

          .ctpo-header-controls {
            flex-direction: column;
            align-items: stretch;
            gap: 8px;
          }

          .ctpo-period-dropdown-wrap,
          .ctpo-period-dropdown {
            width: 100%;
          }

          .ctpo-export-button {
            width: 100%;
            justify-content: center;
          }

          .ctpo-report-filter-card,
          .ctpo-report-card {
            border-radius: 12px;
            padding: 15px;
          }

          .ctpo-period-buttons {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .ctpo-period-button {
            width: 100%;
          }

          .ctpo-report-filter-row,
          .ctpo-report-summary-grid {
            grid-template-columns: 1fr;
          }

          .ctpo-summary-card {
            padding: 15px;
          }

          .ctpo-trend-header {
            flex-direction: column;
            gap: 10px;
          }

          .ctpo-chart-period-btns {
            width: 100%;
          }

          .ctpo-cpbtn {
            flex: 1;
          }

          .ctpo-card-header {
            align-items: flex-start;
          }

          .ctpo-donut-wrapper {
            flex-direction: column;
            align-items: center;
          }

          .ctpo-recharts-donut {
            width: 100%;
            max-width: 240px;
          }

          .ctpo-type-list {
            width: 100%;
            max-height: 220px;
          }

        }

            `}</style>
    </DashboardLayout>
  );
}
