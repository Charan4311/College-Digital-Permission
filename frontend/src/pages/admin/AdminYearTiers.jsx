import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import api from '../../lib/api';
import { GraduationCap, Info, PlusCircle, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AdminYearTiers() {
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ yearTier: '', years: '', label: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchTiers = async () => {
    try {
      const res = await api.get('/admin/year-tiers');
      setTiers(res.data.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTiers(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError(''); setSuccess(''); setSubmitting(true);
    try {
      // Parse years from comma-separated string like "1,2"
      const yearsArr = form.years.split(',').map(y => parseInt(y.trim())).filter(y => !isNaN(y));
      await api.post('/admin/year-tiers', { yearTier: form.yearTier, years: yearsArr, label: form.label });
      setSuccess(`Year tier "${form.yearTier}" created!`);
      setForm({ yearTier: '', years: '', label: '' });
      fetchTiers();
    } catch (e) { setError(e.response?.data?.message || 'Error'); }
    finally { setSubmitting(false); }
  };

  return (
    <DashboardLayout>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <GraduationCap size={26} color="var(--accent)" />
          <span>Year Tier Management</span>
        </h1>
        <p className="page-subtitle">Map academic years to tier groups for HOD authority scoping</p>
      </div>

      <div className="alert alert-info" style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Info size={16} />
        <span>Year tiers group academic years for HOD authority. Example: TIER_JUNIOR covers years 1 and 2, TIER_SENIOR covers years 3 and 4.</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-[24px]">
        {/* Create Form */}
        <div className="card" style={{ height: 'fit-content' }}>
          <div className="card-title" style={{ marginBottom: 20 }}>Add Year Tier</div>
          {error   && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label className="form-label">Tier ID (e.g. TIER_1)</label>
              <input required className="form-input" placeholder="e.g. TIER_SENIOR"
                value={form.yearTier} onChange={e => setForm(f => ({ ...f, yearTier: e.target.value.toUpperCase() }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Years (comma-separated)</label>
              <input required className="form-input" placeholder="e.g. 3,4"
                value={form.years} onChange={e => setForm(f => ({ ...f, years: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Label</label>
              <input required className="form-input" placeholder="e.g. Senior Years (3rd & 4th)"
                value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} />
            </div>
            <button type="submit" disabled={submitting} className="btn btn-primary btn-full">
              {submitting ? 'Creating...' : '+ Add Year Tier'}
            </button>
          </form>
        </div>

        {/* Tier List */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: 20 }}>Year Tiers ({tiers.length})</div>
          {loading ? (
            <div className="loading-screen"><div className="spinner spinner-lg" /></div>
          ) : tiers.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon" style={{ color: 'var(--text-muted)' }}><GraduationCap size={40} /></div>
              <div className="empty-state-title">No Year Tiers configured yet</div>
              <div className="empty-state-desc">Create at least one tier to enable HOD authority scoping</div>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>Tier ID</th><th>Years</th><th>Label</th></tr>
                </thead>
                <tbody>
                  {tiers.map(t => (
                    <tr key={t._id}>
                      <td><code style={{ background: 'var(--accent-dim)', color: 'var(--accent)', padding: '2px 8px', borderRadius: 4, fontSize: 13 }}>{t.yearTier}</code></td>
                      <td>{t.years?.join(', ')}</td>
                      <td className="td-muted">{t.label}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
