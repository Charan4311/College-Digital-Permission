import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import api from '../../lib/api';
import { UserCheck, CheckCircle2, AlertCircle, Edit2, Save, X, Download, Search } from 'lucide-react';

export default function AdminStudents() {
  const [allStudents, setAllStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState([]);
  const [filter, setFilter] = useState({ branchId: '', year: '' });
  const [selected, setSelected] = useState([]);
  const [bulkType, setBulkType] = useState('DAY_SCHOLAR');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('success');
  const [editingId, setEditingId] = useState(null);
  const [editType, setEditType] = useState('');
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const LIMIT = 50;

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: 1, limit: 10000 });
      if (filter.branchId) params.set('branchId', filter.branchId);
      if (filter.year) params.set('year', filter.year);

      // Fetch students and branches with error handling for each
      const studPromise = api.get(`/admin/students?${params}`).catch(err => {
        console.error('Error fetching students:', err);
        return { data: { data: [], total: 0 } };
      });
      const branchPromise = api.get('/admin/branches').catch(err => {
        console.error('Error fetching branches:', err);
        return { data: { data: [] } };
      });

      const [studRes, branchRes] = await Promise.all([studPromise, branchPromise]);
      setAllStudents(studRes.data?.data || []);
      setBranches(branchRes.data?.data || []);
    } catch (e) {
      console.error('fetchData error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filter]);

  useEffect(() => {
    const term = searchTerm.toLowerCase().trim();
    const filtered = allStudents.filter(s => 
      (s.name || '').toLowerCase().includes(term) ||
      (s.rollNo || '').toLowerCase().includes(term)
    );
    setTotal(filtered.length);
    const start = (page - 1) * LIMIT;
    setStudents(filtered.slice(start, start + LIMIT));
  }, [allStudents, searchTerm, page]);

  const handleExport = async () => {
    try {
      setExporting(true);
      const params = new URLSearchParams();
      if (filter.year) params.set('year', filter.year);
      if (filter.branchId) params.set('branchId', filter.branchId);

      const res = await api.get(`/admin/students/export?${params.toString()}`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Students_List_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export error:', e);
      setMsg('Failed to export students data. Please try again.');
      setMsgType('error');
    } finally {
      setExporting(false);
    }
  };

  const toggleSelect = (id) => {
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  };

  const toggleAll = () => {
    if (selected.length === students.length && students.length > 0) setSelected([]);
    else setSelected(students.map(s => s._id));
  };

  const bulkUpdate = async () => {
    if (!selected.length) return;
    try {
      await api.patch('/admin/students', { studentIds: selected, studentType: bulkType });
      setMsg(`Successfully updated ${selected.length} students to ${bulkType === 'DAY_SCHOLAR' ? 'Day Scholar' : 'Hosteler'}`);
      setMsgType('success');
      setSelected([]);
      fetchData();
    } catch (e) {
      setMsg(e.response?.data?.message || 'Error updating students');
      setMsgType('error');
    }
  };

  const handleStartEdit = (student) => {
    setEditingId(student._id);
    setEditType(student.studentType || 'DAY_SCHOLAR');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditType('');
  };

  const handleSaveEdit = async (studentId) => {
    setSaving(true);
    try {
      const res = await api.patch(`/admin/students/${studentId}`, { studentType: editType });
      if (res.data.success) {
        setMsg(`Student type updated successfully to ${editType === 'DAY_SCHOLAR' ? 'Day Scholar' : 'Hosteler'}`);
        setMsgType('success');
        setEditingId(null);
        fetchData();
      }
    } catch (e) {
      setMsg(e.response?.data?.message || 'Failed to update student type');
      setMsgType('error');
    } finally {
      setSaving(false);
    }
  };

  const totalPages = Math.ceil(total / LIMIT) || 1;

  return (
    <DashboardLayout>
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
          <UserCheck size={26} color="var(--accent)" />
          <span>Student Directory & Type Assignment</span>
        </h1>
      </div>

      {/* Filters Card */}
      <div className="card" style={{ marginBottom: 20, padding: '20px 24px' }}>
        <div className="admin-filter-bar">
          
          {/* Search Input */}
          <div className="form-group admin-filter-group" style={{ maxWidth: '280px', flex: '1 1 200px' }}>
            <label className="form-label" style={{ fontWeight: 700, color: '#1E293B', marginBottom: '6px' }}>Search Students</label>
            <div style={{ position: 'relative' }}>
              <Search size={18} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                className="form-input"
                placeholder="Search by name or roll..."
                style={{ width: '100%', paddingLeft: '38px', fontWeight: 500 }}
                value={searchTerm}
                onChange={e => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>

          {/* Select Year Dropdown */}
          <div className="form-group admin-filter-group" style={{ maxWidth: '200px', flex: '1 1 150px' }}>
            <label className="form-label" style={{ fontWeight: 700, color: '#1E293B', marginBottom: '6px' }}>Select Year</label>
            <select
              className="form-input form-select"
              style={{ width: '100%', cursor: 'pointer', fontWeight: 500 }}
              value={filter.year}
              onChange={e => {
                setFilter(f => ({ ...f, year: e.target.value }));
                setPage(1);
              }}
            >
              <option value="">All Years</option>
              <option value="2">2nd Year</option>
              <option value="3">3rd Year</option>
              <option value="4">4th Year</option>
            </select>
          </div>

          {/* Select Branch Dropdown */}
          <div className="form-group admin-filter-group" style={{ maxWidth: '220px', flex: '1 1 180px' }}>
            <label className="form-label" style={{ fontWeight: 700, color: '#1E293B', marginBottom: '6px' }}>Select Branch</label>
            <select
              className="form-input form-select"
              style={{ width: '100%', cursor: 'pointer', fontWeight: 500 }}
              value={filter.branchId}
              onChange={e => {
                setFilter(f => ({ ...f, branchId: e.target.value }));
                setPage(1);
              }}
            >
              <option value="">All Branches</option>
              {branches.length > 0 ? (
                branches.map(b => (
                  <option key={b._id} value={b._id}>
                    {b.name} ({b.code})
                  </option>
                ))
              ) : (
                <>
                  <option value="CSM">CSM (AI & ML)</option>
                  <option value="CAI">CAI (AI)</option>
                  <option value="CSD">CSD (Data Science)</option>
                  <option value="AIDS">AIDS (AI & Data Science)</option>
                  <option value="CSC">CSC (Cyber Security)</option>
                </>
              )}
            </select>
          </div>

          {/* Export Button and Showing count on right side */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', alignSelf: 'flex-end', paddingBottom: '2px' }}>
            <button
              onClick={handleExport}
              disabled={exporting}
              style={{
                height: '40px',
                padding: '0 20px',
                borderRadius: '10px',
                border: '1.5px solid #2563eb',
                background: '#ffffff',
                color: '#2563eb',
                fontSize: '14px',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: exporting ? 'not-allowed' : 'pointer',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => {
                if (!exporting) e.currentTarget.style.backgroundColor = '#eff6ff';
              }}
              onMouseLeave={e => {
                if (!exporting) e.currentTarget.style.backgroundColor = '#ffffff';
              }}
            >
              <Download size={16} />
              <span>{exporting ? 'Exporting...' : 'Export'}</span>
            </button>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
              Showing {students.length} of {total} Enrolled Students
            </span>
          </div>

        </div>
      </div>

      {/* Bulk Action Alert */}
      {selected.length > 0 && (
        <div className="alert alert-info" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <span><strong>{selected.length}</strong> selected</span>
          <select
            className="form-input form-select"
            style={{ width: 160, margin: 0, minWidth: 140 }}
            value={bulkType}
            onChange={e => setBulkType(e.target.value)}
          >
            <option value="DAY_SCHOLAR">Day Scholar</option>
            <option value="HOSTELER">Hosteler</option>
          </select>
          <button className="btn btn-primary btn-sm" onClick={bulkUpdate}>Apply Bulk Change</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setSelected([])}>Clear</button>
        </div>
      )}

      {/* Feedback Alert */}
      {msg && (
        <div className={`alert ${msgType === 'success' ? 'alert-success' : 'alert-error'}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          {msgType === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{msg}</span>
          <button
            onClick={() => setMsg('')}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Students Data Table */}
      <div className="card">
        {loading ? (
          <div className="loading-screen"><div className="spinner spinner-lg" /></div>
        ) : (
          <>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 40 }}><input type="checkbox" checked={selected.length === students.length && students.length > 0} onChange={toggleAll} /></th>
                    <th>ROLL NUMBER</th>
                    <th>NAME</th>
                    <th>BRANCH</th>
                    <th>YEAR</th>
                    <th>YEAR TIER</th>
                    <th>STUDENT TYPE</th>
                    <th style={{ textAlign: 'center', width: 140 }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                        {searchTerm ? 'No matching student found.' : 'No enrolled student records found matching the selected filters.'}
                      </td>
                    </tr>
                  ) : (
                    students.map(s => {
                      const isEditing = editingId === s._id;
                      return (
                        <tr key={s._id}>
                          <td><input type="checkbox" checked={selected.includes(s._id)} onChange={() => toggleSelect(s._id)} /></td>
                          <td><code style={{ fontWeight: 700, color: '#1E293B', fontSize: '13px' }}>{s.rollNo}</code></td>
                          <td style={{ fontWeight: 600, color: '#0F172A' }}>{s.name}</td>
                          <td>{s.branchId?.name || 'N/A'}</td>
                          <td>Year {s.year}</td>
                          <td><span className="badge badge-info">{s.yearTier || `TIER_${s.year}`}</span></td>
                          <td>
                            {isEditing ? (
                              <select
                                className="form-input form-select"
                                style={{ width: 140, padding: '4px 8px', fontSize: '12px' }}
                                value={editType}
                                onChange={e => setEditType(e.target.value)}
                              >
                                <option value="DAY_SCHOLAR">Day Scholar</option>
                                <option value="HOSTELER">Hosteler</option>
                              </select>
                            ) : s.studentType ? (
                              <span className={`badge badge-${s.studentType.toLowerCase()}`}>
                                {s.studentType === 'DAY_SCHOLAR' ? 'Day Scholar' : 'Hosteler'}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--yellow)', fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <AlertCircle size={12} /> Unassigned
                              </span>
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {isEditing ? (
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                <button
                                  className="btn btn-success btn-sm"
                                  style={{ padding: '4px 8px', fontSize: '11px' }}
                                  onClick={() => handleSaveEdit(s._id)}
                                  disabled={saving}
                                >
                                  <Save size={12} /> Save
                                </button>
                                <button
                                  className="btn btn-ghost btn-sm"
                                  style={{ padding: '4px 8px', fontSize: '11px' }}
                                  onClick={handleCancelEdit}
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ) : (
                              <button
                                className="btn btn-ghost btn-sm"
                                style={{ padding: '4px 10px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                onClick={() => handleStartEdit(s)}
                              >
                                <Edit2 size={12} /> Edit
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center', marginTop: 20 }}>
                <button className="btn btn-ghost btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                <span style={{ padding: '8px 12px', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Page {page} of {totalPages}</span>
                <button className="btn btn-ghost btn-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
