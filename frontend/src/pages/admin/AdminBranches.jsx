import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import api from '../../lib/api';

export default function AdminBranches() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ code: '', name: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchBranches = async () => {
    try {
      const res = await api.get('/admin/branches');
      setBranches(res.data.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchBranches(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError(''); setSuccess(''); setSubmitting(true);
    try {
      await api.post('/admin/branches', form);
      setSuccess(`Branch "${form.code}" created!`);
      setForm({ code: '', name: '' });
      fetchBranches();
    } catch (e) { setError(e.response?.data?.message || 'Error'); }
    finally { setSubmitting(false); }
  };

  const toggleActive = async (branch) => {
    try {
      await api.patch(`/admin/branches/${branch._id}`, { isActive: !branch.isActive });
      fetchBranches();
    } catch (e) { alert(e.response?.data?.message || 'Error'); }
  };

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">Branch Management</h1>
        <p className="page-subtitle">Manage department branches</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-[24px]">
        {/* Create Form */}
        <div className="card" style={{ height: 'fit-content' }}>
          <div className="card-title" style={{ marginBottom: 20 }}>Add Branch</div>
          {error   && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label className="form-label">Branch Code</label>
              <input required className="form-input" placeholder="e.g. CSE"
                value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Branch Name</label>
              <input required className="form-input" placeholder="e.g. Computer Science Engineering"
                value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <button type="submit" disabled={submitting} className="btn btn-primary btn-full">
              {submitting ? 'Creating...' : '+ Add Branch'}
            </button>
          </form>
        </div>

        {/* Branch List */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: 20 }}>Branches ({branches.length})</div>
          {loading ? (
            <div className="loading-screen"><div className="spinner spinner-lg" /></div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>Code</th><th>Name</th><th>Status</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {branches.map(b => (
                    <tr key={b._id}>
                      <td><strong>{b.code}</strong></td>
                      <td>{b.name}</td>
                      <td>
                        <span className={`badge ${b.isActive ? 'badge-active' : 'badge-inactive'}`}>
                          {b.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <button className={`btn btn-sm ${b.isActive ? 'btn-ghost' : 'btn-success'}`} onClick={() => toggleActive(b)}>
                          {b.isActive ? 'Deactivate' : 'Activate'}
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
