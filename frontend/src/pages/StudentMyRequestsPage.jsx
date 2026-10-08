import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import StudentLayout from "../components/StudentLayout";
import ZoomableTableWrapper from "../components/ZoomableTableWrapper";
import api from "../lib/api";

import {
  FaMagnifyingGlass,
  FaCalendarDays,
  FaChevronDown,
  FaEye,
  FaBriefcase,
  FaBookOpenReader,
  FaFileInvoiceDollar,
  FaBuildingColumns,
  FaArrowLeft,
  FaArrowRight,
} from "react-icons/fa6";

/* ── CONSTANTS ─────────────────────────────────────────────────── */
const TYPE_OPTIONS = [
  { value:"ALL",        label:"All Requests" },
  { value:"OUTPASS",    label:"Out-Pass"     },
  { value:"MESS_FEE",   label:"Mess Fee"     },
  { value:"INTERNSHIP", label:"Internship"   },
  { value:"LIBRARY",    label:"Library"      },
];

const TYPE_LABELS = {
  OUTPASS:    "Out-Pass",
  MESS_FEE:   "Mess Fee",
  INTERNSHIP: "Internship",
  LIBRARY:    "Library",
};

const STATUS_STYLES = {
  PENDING:   { label:"Pending",   cssClass:"s-badge-pending"   },
  APPROVED:  { label:"Approved",  cssClass:"s-badge-approved"  },
  REJECTED:  { label:"Rejected",  cssClass:"s-badge-rejected"  },
  CANCELLED: { label:"Cancelled", cssClass:"s-badge-cancelled" },
};

function formatDate(v) {
  if (!v) return "N/A";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleDateString("en-IN", { day:"2-digit", month:"2-digit", year:"numeric" });
}

function sortRequests(list, sortBy) {
  const items = [...list];
  const key = r => new Date(r.createdAt || r.requestDate || r.outDate || 0);
  return sortBy === "oldest"
    ? items.sort((a,b) => key(a) - key(b))
    : items.sort((a,b) => key(b) - key(a));
}

/* ── PAGE ──────────────────────────────────────────────────────── */
export default function StudentMyRequestsPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [requests,      setRequests]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [historyFilter, setHistoryFilter] = useState("ALL");
  const [searchText,    setSearchText]    = useState(location.state?.status || "");
  const [dateFilter,    setDateFilter]    = useState("all");
  const [sortBy,        setSortBy]        = useState("latest");
  const [currentPage,   setCurrentPage]   = useState(1);
  const pageSize = 8;

  const getDateRangeFilter = (key) => {
    const now   = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sow   = new Date(today); sow.setDate(today.getDate() - today.getDay());
    const eow   = new Date(sow);   eow.setDate(sow.getDate() + 6);
    const slm   = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const elm   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    const slw   = new Date(today); slw.setDate(today.getDate() - today.getDay() - 7);
    const elw   = new Date(slw);   elw.setDate(slw.getDate() + 6);
    return {
      all:        null,
      today:      { start: today, end: new Date(today.getTime() + 86400000)  },
      this_week:  { start: sow,   end: new Date(eow.getTime()  + 86400000)   },
      last_week:  { start: slw,   end: new Date(elw.getTime()  + 86400000)   },
      last_month: { start: slm,   end: elm },
    }[key] || null;
  };

  const fetchRequests = async () => {
    try {
      const res = await api.get("/outpass/mine");
      setRequests(res.data.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchRequests();
    const iv = setInterval(fetchRequests, 6000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => { setCurrentPage(1); }, [historyFilter, searchText, dateFilter, sortBy]);

  const filteredRequests = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    let data = requests.filter(r => {
      const matchType = historyFilter === "ALL" ? true : (r.requestType || "OUTPASS") === historyFilter;
      if (!matchType) return false;
      if (!q) return true;
      return [r.reason, r.companyName, r.role, r.place, r.requestType, r.status, r.type]
        .filter(Boolean).join(" ").toLowerCase().includes(q);
    });
    const range = getDateRangeFilter(dateFilter);
    if (range) {
      data = data.filter(r => {
        const d = new Date(r.createdAt || r.requestDate || r.outDate || 0);
        return d >= range.start && d <= range.end;
      });
    }
    return sortRequests(data, sortBy);
  }, [requests, historyFilter, searchText, dateFilter, sortBy]);

  const totalPages       = Math.max(1, Math.ceil(filteredRequests.length / pageSize));
  const startIndex       = (currentPage - 1) * pageSize;
  const paginatedRequests = filteredRequests.slice(startIndex, startIndex + pageSize);

  const getStatusDetails = (status) => {
    let key = "PENDING";
    if (status?.startsWith("REJECTED")) key = "REJECTED";
    else if (["APPROVED","CLEARED","ISSUED","USED"].includes(status)) key = "APPROVED";
    else if (status === "CANCELLED") key = "CANCELLED";
    return STATUS_STYLES[key] || STATUS_STYLES.PENDING;
  };

  const pageInfoStart = filteredRequests.length === 0 ? 0 : startIndex + 1;
  const pageInfoEnd   = Math.min(startIndex + pageSize, filteredRequests.length);

  /* Header-right slot: search + date filter */
  const headerRight = (
    <div style={{ display:"flex", alignItems:"center", gap:"10px", flexWrap:"wrap" }}>
      <div className="s-search-box">
        <FaMagnifyingGlass size={13} style={{ color:"#94a3b8", flexShrink:0 }} />
        <input
          type="text"
          className="s-search-input"
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          placeholder="Search by purpose, place or status..."
        />
      </div>
      <div style={{ position:"relative", display:"flex", alignItems:"center" }}>
        <FaCalendarDays size={12} style={{ position:"absolute", left:"11px", color:"#64748b", pointerEvents:"none" }} />
        <select
          className="s-filter-select"
          value={dateFilter}
          onChange={e => setDateFilter(e.target.value)}
          style={{ paddingLeft:"30px", paddingRight:"28px", minWidth:"120px" }}
        >
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="this_week">This Week</option>
          <option value="last_week">Last Week</option>
          <option value="last_month">Last Month</option>
        </select>
        <FaChevronDown size={10} style={{ position:"absolute", right:"10px", color:"#64748b", pointerEvents:"none" }} />
      </div>
    </div>
  );

  return (
    <StudentLayout
      pageTitle="My Requests"
      pageSubtitle="View all your permission requests and their current status."
      headerRight={headerRight}
    >
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:"12px", flexWrap:"wrap", marginBottom:"16px" }}>
        {/* Type filter tabs */}
        <div className="s-tabs">
          {TYPE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              className={"s-tab" + (historyFilter === opt.value ? " active" : "")}
              onClick={() => setHistoryFilter(opt.value)}
              type="button"
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div style={{ display:"flex", alignItems:"center", gap:"8px", fontSize:"13px", color:"#334155", fontWeight:600 }}>
          Sort by
          <div style={{ position:"relative" }}>
            <select
              className="s-filter-select"
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              style={{ paddingRight:"28px", minWidth:"120px" }}
            >
              <option value="latest">Latest First</option>
              <option value="oldest">Oldest First</option>
            </select>
            <FaChevronDown size={10} style={{ position:"absolute", right:"10px", top:"50%", transform:"translateY(-50%)", color:"#64748b", pointerEvents:"none" }} />
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div style={{ background:"rgba(255,255,255,.88)", border:"1px solid rgba(226,232,240,.70)", borderRadius:"16px", overflow:"hidden", boxShadow:"0 2px 10px rgba(15,23,42,.04)" }}>
        {loading ? (
          <div className="s-loading"><div className="s-spinner" /></div>
        ) : paginatedRequests.length === 0 ? (
          <div style={{ padding:"48px 22px", textAlign:"center", color:"#94a3b8", fontSize:"14px" }}>No requests found.</div>
        ) : (
          <ZoomableTableWrapper tableWrapperClass="s-table-wrap">
            <table className="s-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>TYPE</th>
                  <th>PURPOSE / DETAILS</th>
                  <th>DATE</th>
                  <th>TIME</th>
                  <th>STATUS</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRequests.map((req, idx) => {
                  const sd  = getStatusDetails(req.status);
                  const num = String(startIndex + idx + 1).padStart(2, "0");
                  const typeLabel = TYPE_LABELS[req.requestType] || "Out-Pass";
                  return (
                    <tr key={req._id || idx}>
                      <td style={{ color:"#94a3b8", fontWeight:700, fontSize:"12px" }}>{num}</td>
                      <td style={{ fontWeight:600, color:"#334155" }}>{typeLabel}</td>
                      <td style={{ fontWeight:600, color:"#1e293b", maxWidth:"220px" }}>
                        <div style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                          {req.reason || req.companyName || req.role || "—"}
                        </div>
                      </td>
                      <td style={{ whiteSpace:"nowrap", color:"#475569" }}>
                        {formatDate(req.outDate || req.requestDate || req.startDate || req.createdAt)}
                      </td>
                      <td style={{ whiteSpace:"nowrap", color:"#475569" }}>
                        {req.outTime || req.requestTime || "—"}
                      </td>
                      <td>
                        <span className={"s-badge " + sd.cssClass}>{sd.label}</span>
                      </td>
                      <td>
                        <button
                          className="s-view-btn"
                          onClick={() => navigate("/student/request/" + req._id, { state: { request: req } })}
                        >
                          <FaEye size={12} /> View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </ZoomableTableWrapper>
        )}

        {/* PAGINATION */}
        {!loading && filteredRequests.length > 0 && (
          <div className="s-pagination">
            <span>Showing {pageInfoStart} to {pageInfoEnd} of {filteredRequests.length} requests</span>
            <div className="s-page-btns">
              <button className="s-page-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>
                <FaArrowLeft size={11} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .reduce((acc, p, i, arr) => { if (i > 0 && arr[i-1] !== p-1) acc.push("…"); acc.push(p); return acc; }, [])
                .map((p, i) =>
                  p === "…"
                    ? <span key={"e"+i} style={{ padding:"0 3px", color:"#94a3b8" }}>…</span>
                    : <button key={p} className={"s-page-btn" + (currentPage === p ? " active" : "")} onClick={() => setCurrentPage(p)}>{p}</button>
                )}
              <button className="s-page-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>
                <FaArrowRight size={11} />
              </button>
            </div>
          </div>
        )}
      </div>
    </StudentLayout>
  );
}
