import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import api from '../lib/api';
import {
  ShieldCheck,
  ShieldAlert,
  QrCode,
  Scan,
  Clock,
  User,
  XCircle,
  History,
  RefreshCw,
  Search,
  Filter,
  Camera,
  X,
  ChevronDown,
  CalendarDays,
  Users,
  CheckCircle2
} from 'lucide-react';

function ScanResult({ result, data, errorMsg }) {
  if (!result) return null;
  const isValid = result === 'VALID';

  const config = {
    VALID: {
      title: 'ENTRY ALLOWED — PASS VALID',
      subtitle: 'Student authorized to leave/enter campus gate',
      icon: ShieldCheck,
      color: 'var(--green, #10b981)',
      bg: 'rgba(16, 185, 129, 0.12)',
      border: 'var(--green, #10b981)'
    },
    ALREADY_USED: {
      title: 'ENTRY DENIED — ALREADY USED',
      subtitle: 'This single-use QR pass has already been scanned at the gate',
      icon: ShieldAlert,
      color: 'var(--red, #ef4444)',
      bg: 'rgba(239, 68, 68, 0.12)',
      border: 'var(--red, #ef4444)'
    },
    EXPIRED: {
      title: 'ENTRY DENIED — PASS EXPIRED',
      subtitle: 'The valid time window for this out-pass has expired',
      icon: Clock,
      color: 'var(--yellow, #f59e0b)',
      bg: 'rgba(245, 158, 11, 0.12)',
      border: 'var(--yellow, #f59e0b)'
    },
    INVALID: {
      title: 'ENTRY DENIED — INVALID PASS',
      subtitle: errorMsg || 'Unrecognized QR token or forged digital pass',
      icon: XCircle,
      color: 'var(--red, #ef4444)',
      bg: 'rgba(239, 68, 68, 0.12)',
      border: 'var(--red, #ef4444)'
    }
  };

  const cfg = config[result] || config.INVALID;
  const Icon = cfg.icon;

  return (
    <div style={{
      background: cfg.bg,
      border: `2px solid ${cfg.border}`,
      borderRadius: '16px',
      padding: '24px',
      textAlign: 'center',
      animation: 'fadeIn 0.2s ease-in-out',
      marginBottom: '20px'
    }}>
      <div style={{
        width: '64px',
        height: '64px',
        borderRadius: '50%',
        background: cfg.color,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 16px auto',
        boxShadow: `0 8px 24px ${cfg.color}44`
      }}>
        <Icon size={36} />
      </div>

      <div style={{ fontSize: '20px', fontWeight: 800, color: cfg.color, letterSpacing: '-0.3px', marginBottom: '4px' }}>
        {cfg.title}
      </div>
      <div style={{ fontSize: '13px', color: 'var(--text-secondary, #64748b)', marginBottom: '16px' }}>
        {cfg.subtitle}
      </div>

      {isValid && data && (
        <div style={{
          background: 'var(--bg-surface, #ffffff)',
          border: '1px solid var(--border, #e2e8f0)',
          borderRadius: '12px',
          padding: '16px',
          textAlign: 'left',
          display: 'grid',
          gap: '10px',
          maxWidth: '400px',
          margin: '0 auto'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={15} color="var(--accent, #3b82f6)" />
            <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary, #0f172a)' }}>
              {data.studentId?.name || 'Unknown Student'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
            <span style={{ color: 'var(--text-muted, #94a3b8)' }}>Roll Number:</span>
            <span style={{ fontWeight: 600, color: 'var(--text-primary, #0f172a)' }}><code>{data.studentId?.rollNo || 'N/A'}</code></span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
            <span style={{ color: 'var(--text-muted, #94a3b8)' }}>Out Date & Time:</span>
            <span style={{ fontWeight: 500, color: 'var(--text-primary, #0f172a)' }}>
              {data.outDate ? new Date(data.outDate).toLocaleDateString('en-IN') : 'N/A'} at {data.outTime || 'N/A'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
            <span style={{ color: 'var(--text-muted, #94a3b8)' }}>Expected Return:</span>
            <span style={{ fontWeight: 500, color: 'var(--text-primary, #0f172a)' }}>
              {data.expectedReturnDate ? new Date(data.expectedReturnDate).toLocaleDateString('en-IN') : 'N/A'} at {data.expectedReturnTime || 'N/A'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
            <span style={{ color: 'var(--text-muted, #94a3b8)' }}>Student Type:</span>
            <span style={{ fontWeight: 600, color: 'var(--purple, #8b5cf6)' }}>{data.studentType?.replace('_', ' ') || 'N/A'}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Simple Native QR Scanner implementation using HTML5 Video and BarcodeDetector (if available)
function NativeQRScanner({ onScan, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let intervalId;
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', true);
          videoRef.current.play();

          // Try to use BarcodeDetector if available
          if ('BarcodeDetector' in window) {
            const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
            intervalId = setInterval(async () => {
              if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
                try {
                  const barcodes = await detector.detect(videoRef.current);
                  if (barcodes.length > 0) {
                    clearInterval(intervalId);
                    onScan(barcodes[0].rawValue);
                  }
                } catch (e) {
                  console.error('Barcode detection error:', e);
                }
              }
            }, 500);
          }
        }
      } catch (err) {
        console.error('Camera error:', err);
        setError('Camera access denied or unavailable.');
      }
    }

    startCamera();

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [onScan]);

  return (
    <div className="native-qr-scanner" style={{ position: 'relative', width: '100%', height: '300px', backgroundColor: '#000', borderRadius: '12px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {error ? (
        <div style={{ color: '#fff', textAlign: 'center', padding: '20px' }}>
          <Camera size={48} style={{ opacity: 0.5, margin: '0 auto 10px auto' }} />
          <div>{error}</div>
        </div>
      ) : (
        <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      )}

      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '200px',
        height: '200px',
        border: '2px solid rgba(255,255,255,0.5)',
        borderRadius: '12px',
        boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)'
      }}></div>

      <button
        type="button"
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: 'rgba(0,0,0,0.6)',
          color: '#fff',
          border: 'none',
          borderRadius: '50%',
          width: '36px',
          height: '36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer'
        }}
      >
        <X size={20} />
      </button>
    </div>
  );
}

export default function SecurityScanner() {
  // The sidebar controls the current view through ?view=history.
  // Keep the view state URL-driven so there is only one sidebar.
  const [searchParams] = useSearchParams();
  const activeView = window.location.pathname === '/security/history' || searchParams.get('view') === 'history' ? 'history' : 'scanner';
  const [token, setToken] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [scanData, setScanData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [scanning, setScanning] = useState(false);
  const [recentScans, setRecentScans] = useState([]);
  const [activePasses, setActivePasses] = useState([]);
  const [loadingActive, setLoadingActive] = useState(false);

  // QR Scanner specific
  const [isCameraOpen, setIsCameraOpen] = useState(false);


  // Filters for Active Passes
  const [activeSearch, setActiveSearch] = useState('');
  const [activeYearFilter, setActiveYearFilter] = useState('All Years');
  const [activeSort, setActiveSort] = useState('Latest to Oldest');

  // Filters for History
  const [historySearch, setHistorySearch] = useState('');
  const [historyDateFilter, setHistoryDateFilter] = useState('Today'); // 'Today', 'This Week', 'This Month'
  const [historySort, setHistorySort] = useState('Latest to Oldest');

  const fetchRecentScans = useCallback(async () => {
    try {
      const historyMode = activeView === 'history';
      const res = await api.get(
        historyMode
          ? '/security/recent-scans?history=true'
          : '/security/recent-scans'
      );
      setRecentScans(res.data?.data || []);
    } catch (e) {
      console.error(e);
    }
  }, [activeView]);

  const fetchActivePasses = useCallback(async () => {
    setLoadingActive(true);
    try {
      const res = await api.get('/security/active-passes');
      setActivePasses(res.data?.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingActive(false);
    }
  }, []);

  useEffect(() => {
    fetchRecentScans();
    fetchActivePasses();
    const interval = setInterval(() => {
      fetchRecentScans();
      fetchActivePasses();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchRecentScans, fetchActivePasses]);

  const executeScan = async (tokenToScan) => {
    if (!tokenToScan) return;
    setScanning(true);
    setScanResult(null);
    setScanData(null);
    setErrorMsg('');
    setIsCameraOpen(false); // Close camera on scan

    try {
      const res = await api.post('/security/scan', { token: tokenToScan.trim() });
      setScanResult(res.data?.scanResult || 'VALID');
      setScanData(res.data?.data || null);
      fetchRecentScans();
      fetchActivePasses();
    } catch (e) {
      const errData = e.response?.data;
      setScanResult(errData?.scanResult || 'INVALID');
      setErrorMsg(errData?.message || 'Verification failed');
      setScanData(null);
      fetchRecentScans();
    } finally {
      setScanning(false);
      setToken('');
    }
  };

  const handleFormScan = (e) => {
    e.preventDefault();
    executeScan(token);
  };

  // Helper to determine year from roll number (assuming format like 23B21A0501 -> 2023)
  const getYearFromRoll = (rollNo) => {
    if (!rollNo || typeof rollNo !== 'string') return 0;
    const match = rollNo.match(/^(\d{2})/);
    if (match) {
      const yearPrefix = parseInt(match[1], 10);
      const currentYear = new Date().getFullYear() % 100;
      // if current year is 26, and prefix is 23, they are in 4th year
      return Math.max(1, currentYear - yearPrefix + 1);
    }
    return 0;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleString('en-US', { month: 'short' });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strHours = hours.toString().padStart(2, '0');
    return `${strHours}:${minutes}:${seconds} ${ampm}`;
  };

  // Filter Active Passes
  const getFilteredActivePasses = () => {
    let filtered = activePasses.filter(p => {
      const name = p.studentName?.toLowerCase() || '';
      const roll = p.rollNo?.toLowerCase() || '';
      const term = activeSearch.toLowerCase();
      if (term && !name.includes(term) && !roll.includes(term)) return false;

      if (activeYearFilter !== 'All Years') {
        const studentYear = getYearFromRoll(p.rollNo);
        if (activeYearFilter === '1st Year' && studentYear !== 1) return false;
        if (activeYearFilter === '2nd Year' && studentYear !== 2) return false;
        if (activeYearFilter === '3rd Year' && studentYear !== 3) return false;
        if (activeYearFilter === '4th Year' && studentYear !== 4) return false;
      }
      return true;
    });

    filtered.sort((a, b) => {
      const dateA = new Date(`${a.outDate}T${a.outTime || '00:00'}`).getTime();
      const dateB = new Date(`${b.outDate}T${b.outTime || '00:00'}`).getTime();
      return activeSort === 'Latest to Oldest' ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  };

  // Filter History
  const getFilteredHistory = () => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfWeek = startOfToday - (now.getDay() * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    let filtered = recentScans.filter(scan => {
      const name = scan.requestId?.studentId?.name?.toLowerCase() || '';
      const roll = scan.requestId?.studentId?.rollNo?.toLowerCase() || '';
      const term = historySearch.toLowerCase();
      if (term && !name.includes(term) && !roll.includes(term)) return false;

      const scanTime = new Date(scan.scannedAt).getTime();
      if (historyDateFilter === 'Today' && scanTime < startOfToday) return false;
      if (historyDateFilter === 'This Week' && scanTime < startOfWeek) return false;
      if (historyDateFilter === 'This Month' && scanTime < startOfMonth) return false;

      return true;
    });

    filtered.sort((a, b) => {
      const dateA = new Date(a.scannedAt).getTime();
      const dateB = new Date(b.scannedAt).getTime();
      return historySort === 'Latest to Oldest' ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  };

  // Calculate stats for History
  const getHistoryStats = () => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfWeek = startOfToday - (now.getDay() * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    let today = 0, week = 0, month = 0;
    recentScans.forEach(scan => {
      const time = new Date(scan.scannedAt).getTime();
      if (time >= startOfToday) today++;
      if (time >= startOfWeek) week++;
      if (time >= startOfMonth) month++;
    });
    return { today, week, month };
  };

  const filteredActivePasses = getFilteredActivePasses();
  const filteredHistory = getFilteredHistory();
  const historyStats = getHistoryStats();

  return (
    <DashboardLayout>
      <style>{`
      /* Responsive layout for Security Scanner — desktop styles and functionality remain unchanged */
      .security-dashboard-page {
        min-width: 0;
        max-width: 100%;
        overflow-x: hidden;
      }

      .security-dashboard-page * {
        box-sizing: border-box;
      }

      @media (max-width: 900px) {
        .security-header-row {
          flex-wrap: wrap !important;
          gap: 12px !important;
        }

        .security-header-row > div:first-child {
          min-width: 0;
          flex: 1 1 260px;
        }

        .security-header-row h1 {
          font-size: 24px !important;
          line-height: 1.2 !important;
        }

        .security-header-row p {
          line-height: 1.45 !important;
        }

        .security-refresh-btn {
          flex-shrink: 0;
        }

        .security-card {
          width: 100%;
          min-width: 0;
        }

        .security-filters {
          align-items: stretch;
        }

        .security-filters > div {
          min-width: 0 !important;
          flex: 1 1 220px !important;
        }

        .security-filters > select {
          flex: 1 1 180px;
          min-width: 0;
        }

        .security-pass-row,
        .security-history-row {
          min-width: 0;
        }

        .security-pass-row > div:first-child,
        .security-history-row > div:first-child {
          min-width: 0;
        }

        .security-pass-row button {
          flex-shrink: 0 !important;
        }

        .native-qr-scanner {
          max-width: 100%;
        }
      }

      @media (max-width: 600px) {
        .security-header {
          margin-bottom: 14px !important;
        }

        .security-header-row {
          align-items: stretch !important;
          flex-direction: column !important;
        }

        .security-header-row > div:first-child {
          flex: none !important;
          width: 100%;
        }

        .security-header-row h1 {
          font-size: 21px !important;
          gap: 7px !important;
        }

        .security-header-row h1 svg {
          width: 23px;
          height: 23px;
          flex-shrink: 0;
        }

        .security-refresh-btn {
          width: 100% !important;
          justify-content: center !important;
          min-height: 42px;
        }

        .security-card {
          padding: 13px !important;
          border-radius: 9px !important;
        }

        .security-card h2 {
          font-size: 15px !important;
          line-height: 1.3 !important;
        }

        .security-filters {
          flex-direction: column !important;
          gap: 9px !important;
          margin-bottom: 14px !important;
        }

        .security-filters > div,
        .security-filters > select {
          width: 100% !important;
          min-width: 0 !important;
          flex: none !important;
        }

        .security-pass-row {
          flex-direction: column !important;
          align-items: stretch !important;
          gap: 11px !important;
          padding: 13px !important;
        }

        .security-pass-row button {
          width: 100% !important;
          justify-content: center !important;
        }

        .security-history-row {
          flex-wrap: wrap !important;
          align-items: flex-start !important;
          gap: 11px !important;
          padding: 13px !important;
        }

        .security-history-row > div:first-child {
          width: 100%;
          flex: none !important;
        }

        .security-history-row > div:nth-child(2) {
          width: auto !important;
          flex: 1 1 140px;
          text-align: left !important;
        }

        .security-history-row > div:last-child {
          margin-left: 0 !important;
        }

        .security-tabs {
          gap: 20px !important;
          overflow-x: auto;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
          white-space: nowrap;
        }

        .security-tabs::-webkit-scrollbar {
          display: none;
        }

        .security-tabs button {
          flex: 0 0 auto;
        }

        .native-qr-scanner {
          height: min(300px, 78vw) !important;
          min-height: 240px;
        }

        .native-qr-scanner > div[style*="width: '200px'"] {
          width: min(200px, 58vw) !important;
          height: min(200px, 58vw) !important;
        }
      }

      @media (max-width: 380px) {
        .security-header-row h1 {
          font-size: 19px !important;
        }

        .security-header-row p {
          font-size: 12px !important;
        }

        .security-card {
          padding: 11px !important;
        }

        .security-tabs {
          gap: 16px !important;
        }

        .security-history-row > div:nth-child(2) {
          flex-basis: 100%;
        }
      }
      `}</style>
      <div className="security-dashboard-page" style={{ width: '100%', paddingBottom: 24 }}>

        {/* Header */}
        <div className="security-header" style={{ marginBottom: 20 }}>
          <div className="security-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10, fontSize: 28, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' }}>
                <ShieldCheck size={28} color="#6366f1" />
                Campus Gate Security Scanner
              </h1>
              <p style={{ margin: '6px 0 0', fontSize: 14, color: '#64748b' }}>
                Real-time gate verification & digital out-pass expiry logging
              </p>
            </div>

          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Main Content Area */}
          <div style={{ flex: 1, minWidth: '0' }}>

            {activeView === 'scanner' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* Scan / Verify Card */}
                <div className="card security-card" style={{ padding: 16, borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', boxShadow: '0 1px 2px rgba(15,23,42,0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: '#f1efff', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Scan size={19} />
                    </div>
                    <div>
                      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Scan / Verify Out-Pass Token</h2>
                    </div>
                  </div>

                  <form onSubmit={handleFormScan}>
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: '500', color: 'var(--text-secondary, #64748b)', marginBottom: '8px' }}>
                        <span>Enter or Scan QR Token</span>
                      </label>
                      <input
                        className="form-input"
                        style={{ width: '100%', padding: '12px', fontSize: '16px', borderRadius: '8px', border: '1px solid var(--border, #e2e8f0)' }}
                        placeholder="Paste QR pass token or scan with gate scanner..."
                        value={token}
                        onChange={e => setToken(e.target.value)}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={!token.trim() || scanning}
                      style={{ width: '100%', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'var(--accent, #3b82f6)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: token.trim() && !scanning ? 'pointer' : 'not-allowed', opacity: token.trim() && !scanning ? 1 : 0.7 }}
                    >
                      {scanning ? (
                        <>
                          <RefreshCw size={18} className="spin" />
                          <span>Verifying...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck size={18} />
                          <span>Verify Pass & Allow Entry</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {scanResult && (
                  <ScanResult result={scanResult} data={scanData} errorMsg={errorMsg} />
                )}

                {/* QR Scanner Camera Section */}
                <div className="card security-card" style={{ padding: 16, borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', boxShadow: '0 1px 2px rgba(15,23,42,0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: '#f1efff', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <QrCode size={19} />
                    </div>
                    <div>
                      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>QR Scanner</h2>
                    </div>
                  </div>

                  {isCameraOpen ? (
                    <NativeQRScanner onScan={executeScan} onClose={() => setIsCameraOpen(false)} />
                  ) : (
                    <div style={{ background: 'var(--bg-elevated, #f8fafc)', border: '2px dashed var(--border, #e2e8f0)', borderRadius: '12px', padding: '40px 20px', textAlign: 'center' }}>
                      <Camera size={40} color="var(--text-muted, #94a3b8)" style={{ margin: '0 auto 12px auto' }} />
                      <div style={{ fontSize: '15px', color: 'var(--text-secondary, #64748b)', marginBottom: '16px' }}>
                        Click "Scan Now" to start scanning
                      </div>
                      <button
                        onClick={() => setIsCameraOpen(true)}
                        style={{ padding: '10px 24px', background: 'var(--accent, #3b82f6)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                      >
                        <Scan size={16} />
                        Scan Now
                      </button>
                    </div>
                  )}
                </div>

                {/* Active Issued Passes */}
                <div className="card security-card" style={{ padding: 16, borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', boxShadow: '0 1px 2px rgba(15,23,42,0.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 9, background: '#f1efff', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Users size={19} />
                      </div>
                      <div>
                        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Active Issued Passes at Gate</h2>
                      </div>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: '#2563eb', background: '#eff6ff', padding: '4px 10px', borderRadius: '12px' }}>
                      {filteredActivePasses.length} ready to scan
                    </span>
                  </div>

                  {/* Filters */}
                  <div className="security-filters" style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1', minWidth: '200px', position: 'relative' }}>
                      <Search size={16} color="var(--text-muted, #94a3b8)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                      <input
                        type="text"
                        placeholder="Search by student name or roll number..."
                        value={activeSearch}
                        onChange={e => setActiveSearch(e.target.value)}
                        style={{ width: '100%', padding: '10px 10px 10px 36px', borderRadius: '8px', border: '1px solid var(--border, #e2e8f0)', fontSize: '14px' }}
                      />
                    </div>
                    <select
                      value={activeYearFilter}
                      onChange={e => setActiveYearFilter(e.target.value)}
                      style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border, #e2e8f0)', fontSize: '14px', background: '#fff', cursor: 'pointer' }}
                    >
                      <option value="All Years">All Years</option>
                      <option value="1st Year">1st Year</option>
                      <option value="2nd Year">2nd Year</option>
                      <option value="3rd Year">3rd Year</option>
                      <option value="4th Year">4th Year</option>
                    </select>
                    <select
                      value={activeSort}
                      onChange={e => setActiveSort(e.target.value)}
                      style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border, #e2e8f0)', fontSize: '14px', background: '#fff', cursor: 'pointer' }}
                    >
                      <option value="Latest to Oldest">Latest to Oldest</option>
                      <option value="Oldest to Latest">Oldest to Latest</option>
                    </select>
                  </div>

                  {loadingActive ? (
                    <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted, #94a3b8)' }}><RefreshCw size={24} className="spin" /></div>
                  ) : filteredActivePasses.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted, #94a3b8)', background: 'var(--bg-elevated, #f8fafc)', borderRadius: '8px', border: '1px dashed var(--border, #e2e8f0)' }}>
                      No active passes found.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {filteredActivePasses.map(p => (
                        <div key={p._id} className="security-pass-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc', gap: '16px' }}>
                          <div>
                            <div style={{ fontWeight: '700', fontSize: '15px', color: '#0f172a', marginBottom: '4px' }}>
                              {p.studentName || 'Unknown Student'} ({p.rollNo || 'N/A'})
                            </div>
                            <div style={{ fontSize: '13px', color: '#64748b' }}>
                              <strong style={{color: '#475569'}}>Ref ID:</strong> {p.referenceId || 'N/A'} &middot; Out: {p.outDate ? formatDate(p.outDate) : 'N/A'}, {p.outTime || 'N/A'} &middot; {p.studentType?.replace('_', ' ') || 'DAY SCHOLAR'}
                            </div>
                          </div>
                          <button
                            onClick={() => setIsCameraOpen(true)}
                            style={{ padding: '8px 16px', background: '#eff6ff', color: '#2563eb', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}
                          >
                            <Scan size={14} />
                            Scan Now
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeView === 'history' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="card security-card" style={{ padding: 16, borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', boxShadow: '0 1px 2px rgba(15,23,42,0.04)' }}>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 16 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: '#f1efff', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <History size={19} />
                    </div>
                    <div>
                      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Permission History</h2>
                      <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>
                        List of students who have successfully scanned and taken permission at the gate
                      </p>
                    </div>
                  </div>

                  {/* Filter Tabs */}
                  <div className="security-tabs" style={{ display: 'flex', gap: '24px', borderBottom: '1px solid #e2e8f0', marginTop: '24px', marginBottom: '24px' }}>
                    {['Today', 'This Week', 'This Month'].map(tab => {
                      const isActive = historyDateFilter === tab;
                      return (
                        <button
                          key={tab}
                          onClick={() => setHistoryDateFilter(tab)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            padding: '0 0 12px 0',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: isActive ? 600 : 500,
                            color: isActive ? '#2563eb' : '#64748b',
                            borderBottom: isActive ? '2px solid #2563eb' : '2px solid transparent',
                            marginBottom: '-1px'
                          }}
                        >
                          {tab}
                        </button>
                      );
                    })}
                  </div>

                  {/* History List Filters */}
                  <div className="security-filters" style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1', minWidth: '200px', position: 'relative' }}>
                      <Search size={16} color="var(--text-muted, #94a3b8)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                      <input
                        type="text"
                        placeholder="Search by student name or roll number..."
                        value={historySearch}
                        onChange={e => setHistorySearch(e.target.value)}
                        style={{ width: '100%', padding: '10px 10px 10px 36px', borderRadius: '8px', border: '1px solid var(--border, #e2e8f0)', fontSize: '14px' }}
                      />
                    </div>
                    <select
                      value={historySort}
                      onChange={e => setHistorySort(e.target.value)}
                      style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border, #e2e8f0)', fontSize: '14px', background: '#fff', cursor: 'pointer' }}
                    >
                      <option value="Latest to Oldest">Latest to Oldest</option>
                      <option value="Oldest to Latest">Oldest to Latest</option>
                    </select>
                  </div>

                  {/* History Records */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {filteredHistory.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted, #94a3b8)', background: 'var(--bg-elevated, #f8fafc)', borderRadius: '8px', border: '1px dashed var(--border, #e2e8f0)' }}>
                        No history records found for the selected filters.
                      </div>
                    ) : (
                      filteredHistory.map(scan => (
                        <div key={scan._id} className="security-history-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc', gap: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <CheckCircle2 size={20} color="#059669" />
                            </div>
                            <div>
                              <div style={{ fontWeight: '700', fontSize: '15px', color: '#0f172a', marginBottom: '4px' }}>
                                {scan.requestId?.studentId?.name || 'Unknown Student'}
                              </div>
                              <div style={{ fontSize: '13px', color: '#64748b' }}>
                                <strong style={{color: '#475569'}}>Ref ID:</strong> {scan.requestId?.referenceId || 'N/A'} &middot; Roll: {scan.requestId?.studentId?.rollNo || 'N/A'}
                              </div>
                            </div>
                          </div>
                          <div style={{ width: '130px', textAlign: 'center', flexShrink: 0 }}>
                            <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a', marginBottom: '4px' }}>
                              {scan.scannedAt ? formatDate(scan.scannedAt) : 'N/A'}
                            </div>
                            <div style={{ fontSize: '13px', color: '#64748b' }}>
                              {scan.scannedAt ? formatTime(scan.scannedAt) : 'N/A'}
                            </div>
                          </div>
                          <div style={{ padding: '6px 12px', background: '#ecfdf5', color: '#059669', borderRadius: '8px', fontSize: '12px', fontWeight: '700', flexShrink: 0, marginLeft: '16px' }}>
                            Scanned
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
