import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import api from '../../lib/api';
import { UserCheck, CheckCircle2, AlertCircle, Filter, ArrowLeft, ArrowRight } from 'lucide-react';

export default function AdminStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState([]);
  const [filter, setFilter] = useState({ branchId: '', studentType: '', yearTier: '' });
  const [selected, setSelected] = useState([]);
  const [bulkType, setBulkType] = useState('DAY_SCHOLAR');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('success');
  const LIMIT = 50;

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: LIMIT });
      if (filter.branchId) params.set('branchId', filter.branchId);
      if (filter.studentType) params.set('studentType', filter.studentType);
      if (filter.yearTier) params.set('yearTier', filter.yearTier);
      const [studRes, branchRes] = await Promise.all([
        api.get(`/admin/students?${params}`),
        api.get('/admin/branches')
      ]);
      setStudents(studRes.data.data);
      setTotal(studRes.data.total);
      setBranches(branchRes.data.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [filter, page]);

  const toggleSelect = (id) => {
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  };

  const toggleAll = () => {
    if (selected.length === students.length) setSelected([]);
    else setSelected(students.map(s => s._id));
  };

  const bulkUpdate = async () => {
    if (!selected.length) return;
    try {
      await api.patch('/admin/students', { studentIds: selected, studentType: bulkType });
      setMsg(`Successfully updated ${selected.length} students to ${bulkType.replace('_', ' ')}`);
      setMsgType('success');
      setSelected([]);
      fetchData();
    } catch (e) {
      setMsg(e.response?.data?.message || 'Error updating students');
      setMsgType('error');
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <DashboardLayout>
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <UserCheck size={26} color="var(--accent)" />
          <span>Student Directory & Type Assignment</span>
        </h1>
        <p className="page-subtitle">Assign Day Scholar vs Hosteler status and manage enrolled student accounts</p>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 20, padding: '20px 24px' }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Branch</label>
            <select className="form-input form-select" style={{ width: 180 }}
              value={filter.branchId} onChange={e => { setFilter(f => ({ ...f, branchId: e.target.value })); setPage(1); }}>
              <option value="">All Branches</option>
              {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Student Type</label>
            <select className="form-input form-select" style={{ width: 160 }}
              value={filter.studentType} onChange={e => { setFilter(f => ({ ...f, studentType: e.target.value })); setPage(1); }}>
              <option value="">All Types</option>
              <option value="DAY_SCHOLAR">Day Scholar</option>
              <option value="HOSTELER">Hosteler</option>
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Year Tier</label>
            <input className="form-input" style={{ width: 140 }} placeholder="e.g. TIER_4TH"
              value={filter.yearTier} onChange={e => { setFilter(f => ({ ...f, yearTier: e.target.value })); setPage(1); }} />
          </div>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{total} students</span>
        </div>
      </div>

      {/* Bulk Action */}
      {selected.length > 0 && (
        <div className="alert alert-info" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <span><strong>{selected.length}</strong> selected</span>
          <select className="form-input form-select" style={{ width: 160, margin: 0 }}
            value={bulkType} onChange={e => setBulkType(e.target.value)}>
            <option value="DAY_SCHOLAR">Day Scholar</option>
            <option value="HOSTELER">Hosteler</option>
          </select>
          <button className="btn btn-primary btn-sm" onClick={bulkUpdate}>Apply</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setSelected([])}>Clear</button>
        </div>
      )}

      {msg && (
        <div className={`alert ${msgType === 'success' ? 'alert-success' : 'alert-error'}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          {msgType === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{msg}</span>
        </div>
      )}

      {/* Table */}
      <div className="card">
        {loading ? (
          <div className="loading-screen"><div className="spinner spinner-lg" /></div>
        ) : (
          <>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th><input type="checkbox" checked={selected.length === students.length && students.length > 0} onChange={toggleAll} /></th>
                    <th>Roll Number</th>
                    <th>Name</th>
                    <th>Branch</th>
                    <th>Year</th>
                    <th>Year Tier</th>
                    <th>Student Type</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(s => (
                    <tr key={s._id}>
                      <td><input type="checkbox" checked={selected.includes(s._id)} onChange={() => toggleSelect(s._id)} /></td>
                      <td><code>{s.rollNo}</code></td>
                      <td>{s.name}</td>
                      <td>{s.branchId?.name}</td>
                      <td>Year {s.year}</td>
                      <td><span className="badge badge-info">{s.yearTier}</span></td>
                      <td>
                        {s.studentType ? (
                          <span className={`badge badge-${s.studentType.toLowerCase()}`}>
                            {s.studentType.replace('_', ' ')}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--yellow)', fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <AlertCircle size={12} /> Unassigned
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 20 }}>
                <button className="btn btn-ghost btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                <span style={{ padding: '8px 12px', fontSize: 13, color: 'var(--text-secondary)' }}>Page {page} of {totalPages}</span>
                <button className="btn btn-ghost btn-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
