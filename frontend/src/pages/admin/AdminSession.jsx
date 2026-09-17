import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import api from '../../lib/api';
import { Calendar, CheckCircle2, AlertCircle, Save } from 'lucide-react';

export default function AdminSession() {
  const [session, setSession] = useState(null);
  const [year, setYear] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    api.get('/admin/academic-session').then(res => {
      const s = res.data.data;
      setSession(s);
      if (s?.currentSessionYear) setYear(String(s.currentSessionYear));
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSubmitting(true); setResult(null);
    try {
      const res = await api.patch('/admin/academic-session', { currentSessionYear: parseInt(year) });
      setSession(res.data.data.session);
      setResult({ success: true, msg: `Academic session successfully updated to ${year}. ${res.data.data.studentsRecomputed} student records recomputed.` });
    } catch (e) { setResult({ success: false, msg: e.response?.data?.message || 'Error updating session' }); }
    finally { setSubmitting(false); }
  };

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">Academic Session</h1>
        <p className="page-subtitle">Set the current academic year to automatically recompute student year and tier</p>
      </div>

      <div style={{ maxWidth: 480 }}>
        <div className="card">
          <div className="card-title" style={{ marginBottom: 20 }}>Current Session Settings</div>

          {loading ? (
            <div className="loading-screen"><div className="spinner spinner-lg" /></div>
          ) : (
            <>
              {session && (
                <div className="alert alert-info" style={{ marginBottom: 20 }}>
                  Currently set to: <strong>{session.currentSessionYear}</strong>
                </div>
              )}

              {result && (
                <div className={`alert ${result.success ? 'alert-success' : 'alert-error'}`}>
                  {result.msg}
                </div>
              )}

              <form onSubmit={handleSave}>
                <div className="form-group">
                  <label className="form-label">Academic Year (e.g. 2025)</label>
                  <input
                    required type="number" className="form-input"
                    placeholder="Enter year like 2025"
                    min="2020" max="2040"
                    value={year} onChange={e => setYear(e.target.value)}
                  />
                  <div className="form-error" style={{ color: 'var(--text-muted)', marginTop: 8, fontSize: 12, display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                    <Calendar size={14} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>Saving this will automatically recompute the "year" and "yearTier" fields for all active students based on their roll number admission year.</span>
                  </div>
                </div>
                <button type="submit" disabled={submitting || !year} className="btn btn-primary btn-full" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  {submitting ? (
                    <>
                      <span className="spinner" style={{ width: 14, height: 14 }} />
                      <span>Saving & Recomputing...</span>
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      <span>Save & Recompute Student Years</span>
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
