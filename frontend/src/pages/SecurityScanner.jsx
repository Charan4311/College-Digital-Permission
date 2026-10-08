import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { BrowserQRCodeReader } from '@zxing/browser';
import DashboardLayout from '../components/DashboardLayout';
import api from '../lib/api';
import {
  formatDate,
  formatDateTime,
  getOrdinalYear,
  getResidenceTypeLabel
} from '../lib/utils';
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
  Camera,
  Upload,
  X,
  Calendar,
  Users,
  CheckCircle2,
  FileImage
} from 'lucide-react';

function ScanResult({ result, data, errorMsg }) {
  if (!result) return null;
  const isAllowed = result === 'VALID' || result === 'ALLOWED';

  const config = {
    VALID: {
      title: 'ENTRY ALLOWED • PASS VALID',
      subtitle: 'Student is authorized to exit/enter campus gate',
      icon: ShieldCheck,
      color: '#059669',
      bg: 'rgba(5, 150, 105, 0.08)',
      border: '#059669'
    },
    ALLOWED: {
      title: 'ENTRY ALLOWED • PASS VALID',
      subtitle: 'Student is authorized to exit/enter campus gate',
      icon: ShieldCheck,
      color: '#059669',
      bg: 'rgba(5, 150, 105, 0.08)',
      border: '#059669'
    },
    ALREADY_USED: {
      title: 'ENTRY DENIED • ALREADY USED',
      subtitle: 'This single-use QR / pass code has already been used at the gate',
      icon: ShieldAlert,
      color: '#dc2626',
      bg: 'rgba(220, 38, 38, 0.08)',
      border: '#dc2626'
    },
    EXPIRED: {
      title: 'ENTRY DENIED • PASS EXPIRED',
      subtitle: 'The valid time window for this out-pass has expired',
      icon: Clock,
      color: '#d97706',
      bg: 'rgba(217, 119, 6, 0.08)',
      border: '#d97706'
    },
    INVALID: {
      title: 'ENTRY DENIED • INVALID PASS',
      subtitle: errorMsg || 'Unrecognized pass code or invalid digital pass',
      icon: XCircle,
      color: '#dc2626',
      bg: 'rgba(220, 38, 38, 0.08)',
      border: '#dc2626'
    }
  };

  const cfg = config[result] || config.INVALID;
  const Icon = cfg.icon;

  const student = data?.studentId || data?.student;

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
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        background: cfg.color,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 14px auto',
        boxShadow: `0 6px 20px ${cfg.color}33`
      }}>
        <Icon size={32} />
      </div>

      <div style={{ fontSize: '19px', fontWeight: 800, color: cfg.color, letterSpacing: '-0.3px', marginBottom: '4px' }}>
        {cfg.title}
      </div>
      <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
        {cfg.subtitle}
      </div>

      {data && (
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '16px 20px',
          textAlign: 'left',
          display: 'grid',
          gap: '10px',
          maxWidth: '460px',
          margin: '0 auto',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={16} color="#059669" />
              <span style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                {student?.name || 'Unknown Student'}
              </span>
            </div>
            <span style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '12px',
              background: isAllowed ? '#ecfdf5' : '#fef2f2',
              color: isAllowed ? '#059669' : '#dc2626',
              border: `1px solid ${isAllowed ? '#a7f3d0' : '#fecaca'}`
            }}>
              {isAllowed ? 'ALLOWED' : 'REJECTED'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
            <span style={{ color: '#64748b' }}>Roll Number:</span>
            <span style={{ fontWeight: 600, color: '#0f172a' }}><code>{student?.rollNo || 'N/A'}</code></span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
            <span style={{ color: '#64748b' }}>Year & Residence:</span>
            <span style={{ fontWeight: 600, color: '#0f172a' }}>
              {getOrdinalYear(student?.year)} • {getResidenceTypeLabel(student?.residenceType)}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
            <span style={{ color: '#64748b' }}>Reason:</span>
            <span style={{ fontWeight: 500, color: '#0f172a', textAlign: 'right', maxWidth: '240px' }}>
              {data.reason || 'N/A'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
            <span style={{ color: '#64748b' }}>Out Date & Time:</span>
            <span style={{ fontWeight: 600, color: '#0f172a' }}>
              {formatDate(data.outDate)} at {data.outTime || 'N/A'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
            <span style={{ color: '#64748b' }}>Return Date:</span>
            <span style={{ fontWeight: 600, color: '#0f172a' }}>
              {formatDate(data.expectedReturnDate || data.returnDate || data.outDate)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// Robust ZXing QR Scanner with Live Webcam & Image File Decoder
function NativeQRScanner({ onScan, onClose }) {
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const [error, setError] = useState('');
  const [isDecodingFile, setIsDecodingFile] = useState(false);

  useEffect(() => {
    const codeReader = new BrowserQRCodeReader();
    let controls = null;
    let active = true;

    async function startCamera() {
      try {
        setError('');
        controls = await codeReader.decodeFromVideoDevice(
          undefined,
          videoRef.current,
          (result) => {
            if (result && active) {
              active = false;
              if (controls) controls.stop();
              onScan(result.getText());
            }
          }
        );
      } catch (err) {
        console.error('QR camera start error:', err);
        setError('Camera unavailable or permission denied. You can upload a QR image below or enter code manually.');
      }
    }

    startCamera();

    return () => {
      active = false;
      if (controls) {
        try {
          controls.stop();
        } catch {
          // ignore
        }
      }
    };
  }, [onScan]);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsDecodingFile(true);
    setError('');

    try {
      const codeReader = new BrowserQRCodeReader();
      const imageUrl = URL.createObjectURL(file);
      const result = await codeReader.decodeFromImageUrl(imageUrl);
      if (result && result.getText()) {
        onScan(result.getText());
      } else {
        setError('No QR code detected in the uploaded image. Please try a clearer screenshot.');
      }
    } catch (err) {
      console.error('File QR decoding error:', err);
      setError('Could not decode QR code from the image. Please enter the pass code manually.');
    } finally {
      setIsDecodingFile(false);
    }
  };

  return (
    <div style={{
      position: 'relative',
      background: '#0f172a',
      borderRadius: '16px',
      overflow: 'hidden',
      padding: '24px',
      textAlign: 'center',
      color: '#fff',
      boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
      marginBottom: '20px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <QrCode size={18} color="#10b981" />
          <span style={{ fontSize: 14, fontWeight: 700 }}>Scan QR Code</span>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', cursor: 'pointer', padding: '6px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <X size={18} />
        </button>
      </div>

      {error ? (
        <div style={{ padding: '24px', color: '#f87171', fontSize: 13, background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', marginBottom: '16px' }}>
          {error}
        </div>
      ) : (
        <div style={{ position: 'relative', width: '100%', maxWidth: '320px', margin: '0 auto 16px auto' }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ width: '100%', borderRadius: 12, background: '#000', display: 'block', minHeight: '240px', objectFit: 'cover' }}
          />
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '180px',
            height: '180px',
            border: '2px solid #10b981',
            borderRadius: '16px',
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
            pointerEvents: 'none'
          }} />
        </div>
      )}

      {/* Upload QR Image fallback */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleImageUpload}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isDecodingFile}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            background: 'rgba(255,255,255,0.12)',
            color: '#ffffff',
            border: '1px solid rgba(255,255,255,0.2)',
            cursor: 'pointer'
          }}
        >
          <FileImage size={15} color="#10b981" />
          <span>{isDecodingFile ? 'Scanning Image...' : 'Upload QR Image / Screenshot'}</span>
        </button>
      </div>
    </div>
  );
}

export default function SecurityScanner() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const activeView = location.pathname === '/security/history' || searchParams.get('view') === 'history' ? 'history' : 'scanner';

  const [token, setToken] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [scanData, setScanData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [scanning, setScanning] = useState(false);
  const [recentScans, setRecentScans] = useState([]);
  const [activePasses, setActivePasses] = useState([]);
  const [loadingActive, setLoadingActive] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [isCameraOpen, setIsCameraOpen] = useState(false);

  // Filters for Active Passes
  const [activeSearch, setActiveSearch] = useState('');
  const [activeYearFilter, setActiveYearFilter] = useState('All Years');
  const [activeSort, setActiveSort] = useState('Latest to Oldest');

  // Filters for History
  const [historySearch, setHistorySearch] = useState('');
  const [historyDateFilter, setHistoryDateFilter] = useState('Today'); // 'Today', 'This Week', 'This Month', 'All'
  const [historySort, setHistorySort] = useState('Latest to Oldest');

  const fetchRecentScans = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const historyMode = activeView === 'history';
      const res = await api.get(
        historyMode
          ? '/security/recent-scans?history=true&allowedOnly=true'
          : '/security/recent-scans'
      );
      setRecentScans(res.data?.data || []);
    } catch (e) {
      console.error('Fetch recent scans error:', e);
    } finally {
      setLoadingHistory(false);
    }
  }, [activeView]);

  const fetchActivePasses = useCallback(async (showLoading = true) => {
    if (showLoading) setLoadingActive(true);
    try {
      const res = await api.get('/security/active-passes');
      setActivePasses(res.data?.data || []);
    } catch (e) {
      console.error('Fetch active passes error:', e);
    } finally {
      if (showLoading) setLoadingActive(false);
    }
  }, []);

  useEffect(() => {
    fetchRecentScans();
    fetchActivePasses();
    const interval = setInterval(() => {
      fetchRecentScans();
      fetchActivePasses(false);
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchRecentScans, fetchActivePasses]);

  const executeScan = useCallback(async (tokenToScan) => {
    const scannedValue = String(tokenToScan || '').trim();
    if (!scannedValue) return;

    let scanToken = scannedValue;
    try {
      const scanUrl = new URL(scannedValue, window.location.origin);
      const tokenMatch = scanUrl.pathname.match(/(?:^|\/)verify\/([^/]+)\/?$/i);
      if (tokenMatch) scanToken = decodeURIComponent(tokenMatch[1]);
    } catch {
      // Direct pass code or token
    }

    setScanning(true);
    setScanResult(null);
    setScanData(null);
    setErrorMsg('');
    setIsCameraOpen(false);

    try {
      const res = await api.post('/security/scan', { token: scanToken });
      setScanResult(res.data?.scanResult || 'VALID');
      setScanData(res.data?.data || null);
      fetchRecentScans();
      fetchActivePasses(false);
    } catch (e) {
      const errData = e.response?.data;
      setScanResult(errData?.scanResult || 'INVALID');
      setErrorMsg(errData?.message || 'Verification failed');
      setScanData(errData?.data || null);
      fetchRecentScans();
    } finally {
      setScanning(false);
      setToken('');
    }
  }, [fetchRecentScans, fetchActivePasses]);

  const handleFormScan = (e) => {
    e.preventDefault();
    executeScan(token);
  };

  const handleInputChange = (e) => {
    setToken(e.target.value.toUpperCase());
  };

  // Filter Active Passes
  const getFilteredActivePasses = () => {
    let filtered = activePasses.filter(p => {
      const name = p.studentName?.toLowerCase() || '';
      const roll = p.rollNo?.toLowerCase() || '';
      const term = activeSearch.toLowerCase();
      if (term && !name.includes(term) && !roll.includes(term)) return false;

      if (activeYearFilter !== 'All Years') {
        const studentYear = p.year || 0;
        if (activeYearFilter === '1st Year' && studentYear !== 1) return false;
        if (activeYearFilter === '2nd Year' && studentYear !== 2) return false;
        if (activeYearFilter === '3rd Year' && studentYear !== 3) return false;
        if (activeYearFilter === '4th Year' && studentYear !== 4) return false;
      }
      return true;
    });

    filtered.sort((a, b) => {
      const dateA = new Date(a.outDate || a.createdAt || 0).getTime();
      const dateB = new Date(b.outDate || b.createdAt || 0).getTime();
      return activeSort === 'Latest to Oldest' ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  };

  // Filter Permission History: Only show Allowed results
  const getFilteredHistory = () => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfWeek = startOfToday - (now.getDay() * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    let filtered = recentScans.filter(scan => {
      // Show ONLY allowed results in permission history
      const isAllowed = scan.scanResult === 'VALID' || scan.scanResult === 'ALLOWED' || scan.result === 'allowed' || scan.scanResult === 'SUCCESS';
      if (!isAllowed) return false;

      const student = scan.requestId?.studentId || scan.studentId;
      const name = student?.name?.toLowerCase() || '';
      const roll = student?.rollNo?.toLowerCase() || '';
      const code = (scan.passCode || scan.shortCode || scan.requestId?.shortCode || '').toLowerCase();
      const term = historySearch.toLowerCase();
      if (term && !name.includes(term) && !roll.includes(term) && !code.includes(term)) return false;

      const scanTime = new Date(scan.scannedAt || scan.createdAt).getTime();
      if (historyDateFilter === 'Today' && scanTime < startOfToday) return false;
      if (historyDateFilter === 'This Week' && scanTime < startOfWeek) return false;
      if (historyDateFilter === 'This Month' && scanTime < startOfMonth) return false;

      return true;
    });

    filtered.sort((a, b) => {
      const dateA = new Date(a.scannedAt || a.createdAt).getTime();
      const dateB = new Date(b.scannedAt || b.createdAt).getTime();
      return historySort === 'Latest to Oldest' ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  };

  const filteredActivePasses = getFilteredActivePasses();
  const filteredHistory = getFilteredHistory();

  return (
    <DashboardLayout>
      <div className="security-dashboard-page" style={{ width: '100%', paddingBottom: 24 }}>
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ color: '#475569', fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
                Welcome back,
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                Campus Gate <span style={{ color: '#059669' }}>Security</span>
              </h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', padding: '10px 16px', borderRadius: 12, border: '1px solid #e2e8f0' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
                <Calendar size={18} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{new Date().toLocaleDateString('en-US', { weekday: 'long' })}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                  {formatDate(new Date())}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ flex: 1, minWidth: '0' }}>
            {activeView === 'scanner' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Scan / Verify Card */}
                <div className="card" style={{ padding: 20, borderRadius: 12, border: '1px solid #e2e8f0', background: '#fff' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Scan size={18} />
                    </div>
                    <div>
                      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Scan / Verify Out-Pass Token</h2>
                    </div>
                  </div>

                  <form onSubmit={handleFormScan}>
                    <div style={{ marginBottom: '14px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>
                        <span>Enter or Scan QR Token</span>
                      </label>
                      <input
                        className="form-input"
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          fontSize: '14px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          letterSpacing: '0.5px',
                          fontFamily: 'monospace',
                          boxSizing: 'border-box'
                        }}
                        placeholder="Paste QR pass token or scan with gate scanner..."
                        value={token}
                        onChange={handleInputChange}
                        autoCapitalize="characters"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={!token.trim() || scanning}
                      style={{
                        width: '100%',
                        padding: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        background: '#10B981',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14.5px',
                        fontWeight: '600',
                        cursor: token.trim() && !scanning ? 'pointer' : 'not-allowed',
                        opacity: token.trim() && !scanning ? 1 : 0.7,
                        transition: 'background-color 0.15s'
                      }}
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

                {/* QR Scanner Card */}
                <div className="card" style={{ padding: 20, borderRadius: 12, border: '1px solid #e2e8f0', background: '#fff' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 16 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: '#f5f3ff', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <QrCode size={18} />
                    </div>
                    <div>
                      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>QR Scanner</h2>
                    </div>
                  </div>

                  {!isCameraOpen ? (
                    <div style={{
                      border: '1px dashed #cbd5e1',
                      borderRadius: '12px',
                      background: '#f8fafc',
                      padding: '36px 20px',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px'
                    }}>
                      <div style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Camera size={38} strokeWidth={1.5} />
                      </div>
                      <p style={{ margin: 0, fontSize: '13.5px', color: '#64748b', fontWeight: 500 }}>
                        Click &ldquo;Scan Now&rdquo; to start scanning
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsCameraOpen(true)}
                        style={{
                          marginTop: '6px',
                          padding: '10px 22px',
                          background: '#10B981',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '600',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          cursor: 'pointer',
                          boxShadow: '0 2px 6px rgba(16,185,129,0.2)'
                        }}
                      >
                        <Scan size={16} />
                        <span>Scan Now</span>
                      </button>
                    </div>
                  ) : (
                    <div>
                      <NativeQRScanner onScan={executeScan} onClose={() => setIsCameraOpen(false)} />
                    </div>
                  )}
                </div>

                {scanResult && (
                  <ScanResult result={scanResult} data={scanData} errorMsg={errorMsg} />
                )}

                {/* Active Issued Passes (Today's Active Only) */}
                <div className="card" style={{ padding: 18, borderRadius: 12, border: '1px solid #e2e8f0', background: '#fff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 10, background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Users size={18} />
                      </div>
                      <div>
                        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Today's Active Out-Passes</h2>
                      </div>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#059669', background: '#ecfdf5', padding: '4px 10px', borderRadius: '12px', border: '1px solid #a7f3d0' }}>
                      {filteredActivePasses.length} active today
                    </span>
                  </div>

                  {/* Filters */}
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 200px', position: 'relative' }}>
                      <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                      <input
                        type="text"
                        placeholder="Search student or roll no..."
                        value={activeSearch}
                        onChange={e => setActiveSearch(e.target.value)}
                        style={{ width: '100%', padding: '9px 10px 9px 36px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', boxSizing: 'border-box' }}
                      />
                    </div>
                    <select
                      value={activeYearFilter}
                      onChange={e => setActiveYearFilter(e.target.value)}
                      style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', background: '#fff', cursor: 'pointer' }}
                    >
                      <option value="All Years">All Years</option>
                      <option value="1st Year">1st Year</option>
                      <option value="2nd Year">2nd Year</option>
                      <option value="3rd Year">3rd Year</option>
                      <option value="4th Year">4th Year</option>
                    </select>
                  </div>

                  {loadingActive ? (
                    <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}><RefreshCw size={24} className="spin" /></div>
                  ) : filteredActivePasses.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px 20px', color: '#94a3b8', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #e2e8f0' }}>
                      No active out-passes for today.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {filteredActivePasses.map(p => (
                        <div key={p._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', gap: '12px' }}>
                          <div>
                            <div style={{ fontWeight: '700', fontSize: '14.5px', color: '#0f172a', marginBottom: '2px' }}>
                              {p.studentName || 'Student'} ({p.rollNo || 'N/A'})
                            </div>
                            <div style={{ fontSize: '12.5px', color: '#64748b' }}>
                              Pass Code: <strong style={{ color: '#059669', letterSpacing: '0.5px' }}>{p.shortCode || 'N/A'}</strong> • Out: {formatDate(p.outDate)} {p.outTime ? `(${p.outTime})` : ''}
                            </div>
                          </div>
                          <button
                            onClick={() => executeScan(p.shortCode || p.token)}
                            style={{ padding: '6px 14px', background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', borderRadius: '6px', fontSize: '12.5px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}
                          >
                            <Scan size={13} />
                            <span>Verify</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* VIEW: HISTORY (Scanned Logs Only - Allowed Results) */}
            {activeView === 'history' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="card" style={{ padding: 18, borderRadius: 12, border: '1px solid #e2e8f0', background: '#fff' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 16 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <History size={20} />
                    </div>
                    <div>
                      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Gate Permission History</h2>
                      <p style={{ margin: '3px 0 0', fontSize: 12.5, color: '#64748b' }}>
                        Audit trail of authorized students scanned and allowed exit through the security gate
                      </p>
                    </div>
                  </div>

                  {/* Filter Tabs */}
                  <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', marginBottom: '18px' }}>
                    {['Today', 'This Week', 'This Month', 'All'].map(tab => {
                      const isActive = historyDateFilter === tab;
                      return (
                        <button
                          key={tab}
                          onClick={() => setHistoryDateFilter(tab)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            padding: '8px 14px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: isActive ? 700 : 500,
                            color: isActive ? '#059669' : '#64748b',
                            borderBottom: isActive ? '2px solid #059669' : '2px solid transparent',
                            marginBottom: '-1px'
                          }}
                        >
                          {tab}
                        </button>
                      );
                    })}
                  </div>

                  {/* Search Bar */}
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 200px', position: 'relative' }}>
                      <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                      <input
                        type="text"
                        placeholder="Search student name, roll no, or pass code..."
                        value={historySearch}
                        onChange={e => setHistorySearch(e.target.value)}
                        style={{ width: '100%', padding: '9px 10px 9px 36px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>

                  {/* History Records Table */}
                  {loadingHistory ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                      <RefreshCw size={24} className="spin" />
                      <div style={{ marginTop: '8px', fontSize: '13px' }}>Loading permission history...</div>
                    </div>
                  ) : filteredHistory.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #e2e8f0' }}>
                      No allowed permission records found for {historyDateFilter.toLowerCase()}.
                    </div>
                  ) : (
                    <div className="table-wrapper">
                      <table>
                        <thead>
                          <tr>
                            <th>Student</th>
                            <th>Roll No</th>
                            <th>Branch • Year</th>
                            <th>Student Type</th>
                            <th>Scan Time</th>
                            <th>Scanned By</th>
                            <th>Result</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredHistory.map(scan => {
                            const student = scan.requestId?.studentId || scan.studentId;
                            const isSuccess = scan.scanResult === 'VALID' || scan.scanResult === 'ALLOWED' || scan.result === 'allowed' || scan.scanResult === 'SUCCESS';
                            return (
                              <tr key={scan._id}>
                                <td>
                                  <div style={{ fontWeight: 600, color: '#0f172a' }}>{student?.name || 'Student'}</div>
                                  <div style={{ fontSize: 11, color: '#64748b' }}>Pass Code: {scan.passCode || scan.shortCode || scan.requestId?.shortCode || '—'}</div>
                                </td>
                                <td>
                                  <code style={{ fontSize: 12, background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>
                                    {student?.rollNo || 'N/A'}
                                  </code>
                                </td>
                                <td style={{ fontSize: 13, color: '#475569' }}>
                                  {scan.requestId?.branchId?.code || 'CSM'} • {getOrdinalYear(student?.year || scan.requestId?.year)}
                                </td>
                                <td>
                                  <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    padding: '2px 8px',
                                    borderRadius: 12,
                                    fontSize: 11,
                                    fontWeight: 600,
                                    background: '#ecfdf5',
                                    color: '#059669',
                                    border: '1px solid #a7f3d0'
                                  }}>
                                    {getResidenceTypeLabel(student?.residenceType || scan.requestId?.studentId?.residenceType)}
                                  </span>
                                </td>
                                <td style={{ fontSize: 12.5, color: '#0f172a' }}>
                                  {formatDateTime(scan.scannedAt || scan.createdAt)}
                                </td>
                                <td style={{ fontSize: 12.5, color: '#64748b' }}>
                                  {scan.scannedByUserId?.name || scan.scannedBy?.name || 'Security Gate'}
                                </td>
                                <td>
                                  <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    padding: '3px 8px',
                                    borderRadius: '12px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    background: '#ecfdf5',
                                    color: '#059669',
                                    border: '1px solid #a7f3d0'
                                  }}>
                                    <CheckCircle2 size={12} />
                                    <span>Allowed</span>
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
