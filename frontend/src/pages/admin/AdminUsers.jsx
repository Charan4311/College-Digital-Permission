import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import api from '../../lib/api';
import { Users, UserPlus, CheckCircle2, AlertCircle, Shield } from 'lucide-react';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [form, setForm] = useState({
    name: '', username: '', password: '', role: 'CTPO',
    branchId: '', authorityScope: { yearTier: '', studentType: '' }
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const ROLES = ['CTPO', 'HOD', 'HOSTEL_INCHARGE', 'SECURITY', 'ADMIN'];
  const STUDENT_TYPES = ['DAY_SCHOLAR', 'HOSTELER'];

  const fetchData = async () => {
    try {
      const [usersRes, branchRes] = await Promise.all([
        api.get(`/admin/users?${includeInactive ? 'includeInactive=1' : ''}`),
        api.get('/admin/branches')
      ]);
      setUsers(usersRes.data.data);
      setBranches(branchRes.data.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [includeInactive]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess(''); setSubmitting(true);
    try {
      const payload = {
        name: form.name, username: form.username,
        password: form.password, role: form.role,
        ...(form.role === 'CTPO' && form.branchId && { branchId: form.branchId }),
        ...(form.role === 'HOD' && form.authorityScope.yearTier && {
          authorityScope: form.authorityScope
        })
      };
      await api.post('/admin/users', payload);
      setSuccess(`Account "${form.username}" created!`);
      setForm({ name: '', username: '', password: '', role: 'CTPO', branchId: '', authorityScope: { yearTier: '', studentType: '' } });
      fetchData();
    } catch (e) { setError(e.response?.data?.message || 'Error'); }
    finally { setSubmitting(false); }
  };

  const toggleUser = async (user) => {
    try {
      const url = `/admin/users/${user._id}/${user.isActive ? 'deactivate' : 'reactivate'}`;
      await api.patch(url);
      fetchData();
    } catch (e) { alert(e.response?.data?.message || 'Error'); }
  };

  const ROLE_COLORS = { CTPO: 'var(--accent)', HOD: 'var(--purple)', HOSTEL_INCHARGE: 'var(--green)', SECURITY: 'var(--yellow)', ADMIN: 'var(--red)' };

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">Staff Accounts</h1>
        <p className="page-subtitle">Create and manage CTPO, HOD, Hostel In-charge, and Security accounts</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-[24px]">
        {/* Create Form */}
        <div className="card" style={{ height: 'fit-content' }}>
          <div className="card-title" style={{ marginBottom: 20 }}>Create Staff Account</div>
          {error   && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input required className="form-input" placeholder="e.g. Dr. Ramesh Kumar"
                value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input required className="form-input" placeholder="e.g. ctpo_cse"
                value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input required type="password" className="form-input" placeholder="Minimum 6 characters"
                value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Role</label>
              <select className="form-input form-select"
                value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            {/* CTPO: needs branch */}
            {form.role === 'CTPO' && (
              <div className="form-group">
                <label className="form-label">Branch</label>
                <select className="form-input form-select" required
                  value={form.branchId} onChange={e => setForm(f => ({ ...f, branchId: e.target.value }))}>
                  <option value="">Select branch...</option>
                  {branches.map(b => <option key={b._id} value={b._id}>{b.name} ({b.code})</option>)}
                </select>
              </div>
            )}

            {/* HOD: needs authority scope */}
            {form.role === 'HOD' && (
              <>
                <div className="form-group">
                  <label className="form-label">Year Tier</label>
                  <input className="form-input" placeholder="e.g. TIER_4TH"
                    value={form.authorityScope.yearTier}
                    onChange={e => setForm(f => ({ ...f, authorityScope: { ...f.authorityScope, yearTier: e.target.value } }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Student Type Scope</label>
                  <select className="form-input form-select"
                    value={form.authorityScope.studentType}
                    onChange={e => setForm(f => ({ ...f, authorityScope: { ...f.authorityScope, studentType: e.target.value } }))}>
                    <option value="">Select type...</option>
                    {STUDENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </>
            )}

            <button type="submit" disabled={submitting} className="btn btn-primary btn-full">
              {submitting ? 'Creating...' : '+ Create Account'}
            </button>
          </form>
        </div>

        {/* Users List */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Staff Accounts ({users.length})</div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <input type="checkbox" checked={includeInactive} onChange={e => setIncludeInactive(e.target.checked)} />
              Show inactive
            </label>
          </div>
          {loading ? (
            <div className="loading-screen"><div className="spinner spinner-lg" /></div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>Name</th><th>Username</th><th>Role</th><th>Scope/Branch</th><th>Status</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u._id}>
                      <td>{u.name}</td>
                      <td className="td-muted"><code>{u.username}</code></td>
                      <td>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 12, background: (ROLE_COLORS[u.role] || '#64748b') + '22', color: ROLE_COLORS[u.role] || 'var(--text-muted)' }}>
                          {u.role}
                        </span>
                      </td>
                      <td className="td-muted" style={{ fontSize: 12 }}>
                        {u.branchId?.name || (u.authorityScope ? `${u.authorityScope.yearTier} / ${u.authorityScope.studentType}` : '—')}
                      </td>
                      <td>
                        <span className={`badge ${u.isActive ? 'badge-active' : 'badge-inactive'}`}>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <button
                          className={`btn btn-sm ${u.isActive ? 'btn-ghost' : 'btn-success'}`}
                          onClick={() => toggleUser(u)}
                        >
                          {u.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
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
