import React, { useEffect, useState } from "react";
import {
    AreaChart,
    Area,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import { TrendingUp, Download } from "lucide-react";
import api from "../lib/api";

const TABS = [
    { label: "Last 7 days", value: "7days" },
    { label: "Last 30 days", value: "30days" },
    { label: "Last 6 months", value: "6months" },
    { label: "This year", value: "thisyear" },
];

const EMPTY_DATA = [];

export default function PermissionRequestsTrend() {
    const [range, setRange] = useState("7days");
    const [data, setData] = useState(EMPTY_DATA);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [exporting, setExporting] = useState(false);

    const fetchTrendData = async (selectedRange = range) => {
        try {
            setLoading(true);
            setError("");

            const response = await api.get(
                `/reports/trend?range=${selectedRange}`
            );

            const result = response?.data;

            if (result?.success) {
                setData(result?.data?.requestsTrend || []);
            } else {
                setData([]);
            }
        } catch (err) {
            console.error("Failed to fetch trend data:", err);
            setError("Unable to load request trend data.");
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTrendData(range);
    }, [range]);

    // Export to Excel Handler
    const handleExport = async () => {
        try {
            setExporting(true);
            const res = await api.get(`/reports/export?range=${range}`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Permission_Trend_Report_${range}_${Date.now()}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Export error:', err);
            alert('Failed to download Excel report.');
        } finally {
            setExporting(false);
        }
    };

    return (
        <div
            style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "16px",
                padding: "24px",
                boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
            }}
        >
            {/* HEADER */}
            <div
                style={{
                    marginBottom: "20px",
                }}
            >
                <h2
                    style={{
                        margin: 0,
                        display: "flex",
                        alignItems: "center",
                        gap: "9px",
                        fontSize: "18px",
                        fontWeight: 700,
                        color: "#0f172a",
                    }}
                >
                    <TrendingUp
                        size={21}
                        color="#2563eb"
                    />

                    Permission Requests Trend
                </h2>

                <p
                    style={{
                        margin: "6px 0 0",
                        fontSize: "13px",
                        color: "#64748b",
                    }}
                >
                    Daily request count and status over time
                </p>
            </div>

            {/* RANGE TABS */}
            <div
                style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "4px",
                    background: "#f1f5f9",
                    borderRadius: "10px",
                    marginBottom: "22px",
                    maxWidth: "100%",
                    overflowX: "auto",
                }}
            >
                {TABS.map((tab) => {
                    const active = range === tab.value;

                    return (
                        <button
                            key={tab.value}
                            type="button"
                            onClick={() => setRange(tab.value)}
                            style={{
                                border: "none",
                                background: active
                                    ? "#2563eb"
                                    : "transparent",
                                color: active
                                    ? "#ffffff"
                                    : "#475569",
                                padding: "8px 16px",
                                borderRadius: "8px",
                                fontSize: "13px",
                                fontWeight: 600,
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                            }}
                        >
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Export Report Button */}
            <button
                onClick={handleExport}
                disabled={exporting}
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#1E293B',
                    cursor: exporting ? 'not-allowed' : 'pointer',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                    transition: 'all 0.15s ease',
                    marginLeft: '10px',
                    marginBottom: '22px'
                }}
            >
                <Download size={14} color="#2563EB" />
                <span>{exporting ? 'Exporting...' : 'Export Report'}</span>
            </button>

            {/* CHART */}
            {error ? (
                <div
                    style={{
                        height: "320px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#64748b",
                        fontSize: "14px",
                    }}
                >
                    {error}
                </div>
            ) : loading ? (
                <div
                    style={{
                        height: "320px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#64748b",
                        fontSize: "14px",
                    }}
                >
                    Loading trend data...
                </div>
            ) : (
                <ResponsiveContainer
                    width="100%"
                    height={320}
                >
                    <AreaChart
                        data={data}
                        margin={{
                            top: 10,
                            right: 10,
                            left: -20,
                            bottom: 5,
                        }}
                    >
                        <defs>
                            <linearGradient
                                id="trendTotalGradient"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                            >
                                <stop
                                    offset="5%"
                                    stopColor="#3b82f6"
                                    stopOpacity={0.25}
                                />

                                <stop
                                    offset="95%"
                                    stopColor="#3b82f6"
                                    stopOpacity={0}
                                />
                            </linearGradient>

                            <linearGradient
                                id="trendApprovedGradient"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                            >
                                <stop
                                    offset="5%"
                                    stopColor="#10b981"
                                    stopOpacity={0.22}
                                />

                                <stop
                                    offset="95%"
                                    stopColor="#10b981"
                                    stopOpacity={0}
                                />
                            </linearGradient>
                        </defs>

                        <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                            stroke="#f1f5f9"
                        />

                        <XAxis
                            dataKey="date"
                            tick={{
                                fill: "#64748b",
                                fontSize: 11,
                            }}
                            axisLine={{
                                stroke: "#e2e8f0",
                            }}
                            tickLine={false}
                            interval="preserveStartEnd"
                        />

                        <YAxis
                            tick={{
                                fill: "#64748b",
                                fontSize: 11,
                            }}
                            axisLine={false}
                            tickLine={false}
                            allowDecimals={false}
                        />

                        <Tooltip
                            contentStyle={{
                                background: "#ffffff",
                                border: "1px solid #e2e8f0",
                                borderRadius: "10px",
                                boxShadow:
                                    "0 4px 14px rgba(0,0,0,0.08)",
                                padding: "10px 14px",
                                fontSize: "13px",
                            }}
                        />

                        {/* TOTAL */}
                        <Area
                            type="monotone"
                            dataKey="Total"
                            stroke="#3b82f6"
                            strokeWidth={2.5}
                            fill="url(#trendTotalGradient)"
                            fillOpacity={1}
                        />

                        {/* APPROVED */}
                        <Area
                            type="monotone"
                            dataKey="Approved"
                            stroke="#10b981"
                            strokeWidth={2.5}
                            fill="url(#trendApprovedGradient)"
                            fillOpacity={1}
                        />

                        {/* PENDING */}
                        <Line
                            type="monotone"
                            dataKey="Pending"
                            stroke="#f59e0b"
                            strokeWidth={2}
                            dot={false}
                        />

                        {/* REJECTED */}
                        <Line
                            type="monotone"
                            dataKey="Rejected"
                            stroke="#ef4444"
                            strokeWidth={2}
                            dot={false}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            )}

            {/* LEGEND */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: "24px",
                    marginTop: "12px",
                    flexWrap: "wrap",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#475569",
                }}
            >
                <LegendItem
                    color="#3b82f6"
                    label="Total"
                />

                <LegendItem
                    color="#10b981"
                    label="Approved"
                />

                <LegendItem
                    color="#f59e0b"
                    label="Pending"
                />

                <LegendItem
                    color="#ef4444"
                    label="Rejected"
                />
            </div>
        </div>
    );
}

function LegendItem({ color, label }) {
    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
            }}
        >
            <span
                style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    background: color,
                    display: "inline-block",
                }}
            />

            <span>{label}</span>
        </div>
    );
}