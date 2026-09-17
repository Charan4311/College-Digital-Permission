import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import api from '../lib/api';
import {
  ShieldCheck,
  ShieldAlert,
  QrCode,
  Scan,
  Clock,
  User,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  History,
  Sparkles,
  RefreshCw,
  Zap,
  Building,
  CheckCheck
} from 'lucide-react';

function ScanResult({ result, data, errorMsg }) {
  if (!result) return null;
  const isValid = result === 'VALID';
  const isUsed = result === 'ALREADY_USED';
  const isExpired = result === 'EXPIRED';

  const config = {
    VALID: {
      title: 'ENTRY ALLOWED — PASS VALID',
      subtitle: 'Student authorized to leave/enter campus gate',
      icon: ShieldCheck,
      color: 'var(--green)',
      bg: 'rgba(16, 185, 129, 0.12)',
      border: 'var(--green)'
    },
    ALREADY_USED: {
      title: 'ENTRY DENIED — ALREADY USED',
      subtitle: 'This single-use QR pass has already been scanned at the gate',
      icon: ShieldAlert,
      color: 'var(--red)',
      bg: 'rgba(239, 68, 68, 0.12)',
      border: 'var(--red)'
    },
    EXPIRED: {
      title: 'ENTRY DENIED — PASS EXPIRED',
      subtitle: 'The valid time window for this out-pass has expired',
      icon: Clock,
      color: 'var(--yellow)',
      bg: 'rgba(245, 158, 11, 0.12)',
      border: 'var(--yellow)'
    },
    INVALID: {
      title: 'ENTRY DENIED — INVALID PASS',
      subtitle: errorMsg || 'Unrecognized QR token or forged digital pass',
      icon: XCircle,
      color: 'var(--red)',
      bg: 'rgba(239, 68, 68, 0.12)',
      border: 'var(--red)'
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
      animation: 'fadeIn 0.2s ease-in-out'
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
      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
        {cfg.subtitle}
      </div>

      {isValid && data && (
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '16px',
          textAlign: 'left',
          display: 'grid',
          gap: '10px',
          maxWidth: '400px',
          margin: '0 auto'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={15} color="var(--accent)" />
            <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {data.studentId?.name}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Roll Number:</span>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}><code>{data.studentId?.rollNo}</code></span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Out Date & Time:</span>
            <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
              {new Date(data.outDate).toLocaleDateString('en-IN')} at {data.outTime}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Expected Return:</span>
            <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
              {new Date(data.expectedReturnDate).toLocaleDateString('en-IN')} at {data.expectedReturnTime}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Student Type:</span>
            <span style={{ fontWeight: 600, color: 'var(--purple)' }}>{data.studentType?.replace('_', ' ')}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SecurityScanner() {
  const [token, setToken] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [scanData, setScanData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [scanning, setScanning] = useState(false);
  const [recentScans, setRecentScans] = useState([]);
  const [activePasses, setActivePasses] = useState([]);
  const [loadingActive, setLoadingActive] = useState(false);

  const fetchRecentScans = useCallback(async () => {
    try {
      const res = await api.get('/security/recent-scans');
      setRecentScans(res.data.data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchActivePasses = useCallback(async () => {
    setLoadingActive(true);
    try {
      const res = await api.get('/security/active-passes');
      setActivePasses(res.data.data);
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

    try {
      const res = await api.post('/security/scan', { token: tokenToScan.trim() });
      setScanResult(res.data.scanResult || 'VALID');
      setScanData(res.data.data);
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

  const RESULT_BADGE_STYLE = {
    VALID: { bg: 'rgba(16,185,129,0.15)', color: 'var(--green)', icon: CheckCircle2 },
    ALREADY_USED: { bg: 'rgba(239,68,68,0.15)', color: 'var(--red)', icon: ShieldAlert },
    EXPIRED: { bg: 'rgba(245,158,11,0.15)', color: 'var(--yellow)', icon: Clock },
    INVALID: { bg: 'rgba(239,68,68,0.15)', color: 'var(--red)', icon: XCircle },
  };

  return (
    <DashboardLayout>
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldCheck size={28} color="var(--accent)" />
              <span>Campus Gate Security Scanner</span>
            </h1>
            <p className="page-subtitle">Real-time gate verification & digital out-pass expiry logging</p>
          </div>

          <button
            className="btn btn-ghost btn-sm"
            onClick={() => { fetchRecentScans(); fetchActivePasses(); }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} />
            <span>Refresh Gate Feed</span>
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '24px' }}>
        {/* Left Column: Scanner + Active Passes Queue */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Scanner Card */}
          <div className="card">
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Scan size={18} color="var(--accent)" />
              <div className="card-title" style={{ margin: 0 }}>Scan / Verify Out-Pass Token</div>
            </div>

            <form onSubmit={handleFormScan}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <QrCode size={14} color="var(--accent)" />
                  <span>Enter or Scan QR Token</span>
                </label>
                <input
                  autoFocus
                  className="form-input"
                  style={{ fontSize: 16, letterSpacing: '0.5px', fontFamily: 'monospace' }}
                  placeholder="Paste QR pass token or scan with gate scanner..."
                  value={token}
                  onChange={e => setToken(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={!token.trim() || scanning}
                className="btn btn-primary btn-full"
                style={{ fontSize: 15, padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                {scanning ? (
                  <>
                    <span className="spinner" style={{ width: 16, height: 16 }} />
                    <span>Verifying with Database...</span>
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

          {/* Result Display */}
          {scanResult && (
            <ScanResult result={scanResult} data={scanData} errorMsg={errorMsg} />
          )}

          {!scanResult && (
            <div className="card" style={{ textAlign: 'center', padding: '36px 20px', background: 'var(--bg-elevated)' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'var(--accent-dim)',
                color: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px auto'
              }}>
                <QrCode size={28} />
              </div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                Ready to Scan at Campus Gate
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                Enter the digital token from the student's mobile screen or choose from active passes below.
              </div>
            </div>
          )}

          {/* Active Passes at Gate Quick Test Section */}
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={16} color="var(--yellow)" />
                <div className="card-title" style={{ margin: 0, fontSize: '15px' }}>Active Issued Passes at Gate</div>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: '12px' }}>
                {activePasses.length} ready to scan
              </span>
            </div>

            {loadingActive ? (
              <div style={{ textAlign: 'center', padding: '16px' }}><span className="spinner" /></div>
            ) : activePasses.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)', fontSize: '13px' }}>
                No active approved passes currently waiting at the gate.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {activePasses.map(p => (
                  <div
                    key={p._id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border)',
                      gap: '10px'
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.studentName || 'Student'} ({p.rollNo})
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Out: {new Date(p.outDate).toLocaleDateString('en-IN')} {p.outTime} · {p.studentType?.replace('_', ' ')}
                      </div>
                    </div>

                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => executeScan(p.token)}
                      style={{ fontSize: '12px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Scan size={12} />
                      <span>Scan Now</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Recent Gate Scans Log */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <History size={18} color="var(--accent)" />
              <div className="card-title" style={{ margin: 0 }}>Live Gate Scan Logs</div>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', background: 'var(--bg-elevated)', padding: '3px 8px', borderRadius: '12px' }}>
              {recentScans.length} logged
            </span>
          </div>

          {recentScans.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon" style={{ color: 'var(--text-muted)' }}>
                <History size={40} />
              </div>
              <div className="empty-state-title">No scans logged yet</div>
              <div className="empty-state-desc">Scans conducted at this gate will appear here in real-time.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {recentScans.map((scan) => {
                const badge = RESULT_BADGE_STYLE[scan.scanResult] || RESULT_BADGE_STYLE.INVALID;
                const Icon = badge.icon;
                const studentName = scan.requestId?.studentId?.name || 'Gate Pass Scan';
                const rollNo = scan.requestId?.studentId?.rollNo || 'Unknown';

                return (
                  <div
                    key={scan._id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border)'
                    }}
                  >
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: badge.bg,
                      color: badge.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Icon size={16} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {studentName}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Roll: {rollNo} · {new Date(scan.scannedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </div>
                    </div>

                    <span style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '12px',
                      background: badge.bg,
                      color: badge.color,
                      whiteSpace: 'nowrap'
                    }}>
                      {scan.scanResult}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
