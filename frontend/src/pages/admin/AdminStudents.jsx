import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import api from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { Checkbox } from '../../components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import {
  LuUserCheck as UserCheck,
  LuCircleCheck as CheckCircle2,
  LuCircleAlert as AlertCircle,
  LuPen as Edit2,
  LuSave as Save,
  LuX as X,
  LuDownload as Download
} from 'react-icons/lu';

export default function AdminStudents() {
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
      const params = new URLSearchParams({ page, limit: LIMIT });
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
      setStudents(studRes.data?.data || []);
      setTotal(studRes.data?.total || 0);
      setBranches(branchRes.data?.data || []);
    } catch (e) {
      console.error('fetchData error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filter, page]);

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
          
          {/* Select Year Dropdown */}
          <div className="form-group admin-filter-group" style={{ maxWidth: '240px' }}>
            <label className="form-label" style={{ fontWeight: 700, color: '#1E293B', marginBottom: '6px' }}>Select Year</label>
            <Select value={filter.year || 'ALL'} onValueChange={value => {
                setFilter(f => ({ ...f, year: value === 'ALL' ? '' : value }));
                setPage(1);
              }}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="ALL">All Years</SelectItem><SelectItem value="2">2nd Year</SelectItem><SelectItem value="3">3rd Year</SelectItem><SelectItem value="4">4th Year</SelectItem></SelectContent>
            </Select>
          </div>

          {/* Select Branch Dropdown */}
          <div className="form-group admin-filter-group" style={{ maxWidth: '280px' }}>
            <label className="form-label" style={{ fontWeight: 700, color: '#1E293B', marginBottom: '6px' }}>Select Branch</label>
            <Select value={filter.branchId || 'ALL'} onValueChange={value => {
                setFilter(f => ({ ...f, branchId: value === 'ALL' ? '' : value }));
                setPage(1);
              }}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Branches</SelectItem>
                {branches.length > 0 ? branches.map(b => <SelectItem key={b._id} value={b._id}>{b.name} ({b.code})</SelectItem>) : ['CSM (AI & ML)', 'CAI (AI)', 'CSD (Data Science)', 'AIDS (AI & Data Science)', 'CSC (Cyber Security)'].map(value => <SelectItem key={value} value={value.split(' ')[0]}>{value}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Export Button and Showing count on right side */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', alignSelf: 'flex-end', paddingBottom: '2px' }}>
            <Button
              onClick={handleExport}
              disabled={exporting}
              variant="outline"
              className="h-10 border-blue-200 bg-white text-blue-600 hover:bg-blue-50"
            >
              <Download size={16} />
              <span>{exporting ? 'Exporting...' : 'Export'}</span>
            </Button>
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
          <Select value={bulkType} onValueChange={setBulkType}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="DAY_SCHOLAR">Day Scholar</SelectItem><SelectItem value="HOSTELER">Hosteler</SelectItem></SelectContent>
          </Select>
          <Button className="bg-violet-600 hover:bg-violet-700 text-white" onClick={bulkUpdate}>Apply Bulk Change</Button>
          <Button variant="outline" onClick={() => setSelected([])}>Clear</Button>
        </div>
      )}

      {/* Feedback Alert */}
      {msg && (
        <div className={`alert ${msgType === 'success' ? 'alert-success' : 'alert-error'}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          {msgType === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{msg}</span>
          <Button
            onClick={() => setMsg('')}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
            variant="ghost"
            size="icon"
          >
            <X size={14} />
          </Button>
        </div>
      )}

      {/* Students Data Table */}
      <div className="card">
        {loading ? (
          <div className="loading-screen"><div className="spinner spinner-lg" /></div>
        ) : (
          <>
            <div className="table-wrapper">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead style={{ width: 40 }}><Checkbox checked={selected.length === students.length && students.length > 0} onCheckedChange={toggleAll} /></TableHead>
                    <TableHead>ROLL NUMBER</TableHead>
                    <TableHead>NAME</TableHead>
                    <TableHead>BRANCH</TableHead>
                    <TableHead>YEAR</TableHead>
                    <TableHead>YEAR TIER</TableHead>
                    <TableHead>STUDENT TYPE</TableHead>
                    <TableHead style={{ textAlign: 'center', width: 140 }}>ACTION</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan="8" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                        No enrolled student records found matching the selected filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    students.map(s => {
                      const isEditing = editingId === s._id;
                      return (
                        <TableRow key={s._id}>
                          <TableCell><Checkbox checked={selected.includes(s._id)} onCheckedChange={() => toggleSelect(s._id)} /></TableCell>
                          <TableCell><code style={{ fontWeight: 700, color: '#1E293B', fontSize: '13px' }}>{s.rollNo}</code></TableCell>
                          <TableCell style={{ fontWeight: 600, color: '#0F172A' }}>{s.name}</TableCell>
                          <TableCell>{s.branchId?.name || 'N/A'}</TableCell>
                          <TableCell>Year {s.year}</TableCell>
                          <TableCell><Badge variant="secondary">{s.yearTier || `TIER_${s.year}`}</Badge></TableCell>
                          <TableCell>
                            {isEditing ? (
                              <Select value={editType} onValueChange={setEditType}>
                                <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent><SelectItem value="DAY_SCHOLAR">Day Scholar</SelectItem><SelectItem value="HOSTELER">Hosteler</SelectItem></SelectContent>
                              </Select>
                            ) : s.studentType ? (
                              <Badge variant={s.studentType === 'DAY_SCHOLAR' ? 'secondary' : 'success'}>
                                {s.studentType === 'DAY_SCHOLAR' ? 'Day Scholar' : 'Hosteler'}
                              </Badge>
                            ) : (
                              <span style={{ color: 'var(--yellow)', fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <AlertCircle size={12} /> Unassigned
                              </span>
                            )}
                          </TableCell>
                          <TableCell style={{ textAlign: 'center' }}>
                            {isEditing ? (
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                <Button
                                  className="h-8 px-2 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white"
                                  onClick={() => handleSaveEdit(s._id)}
                                  disabled={saving}
                                >
                                  <Save size={12} /> Save
                                </Button>
                                <Button
                                  variant="outline"
                                  className="h-8 w-8 p-0"
                                  onClick={handleCancelEdit}
                                >
                                  <X size={12} />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="outline"
                                className="h-8 px-2 text-[12px]"
                                onClick={() => handleStartEdit(s)}
                              >
                                <Edit2 size={12} /> Edit
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center', marginTop: 20 }}>
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</Button>
                <span style={{ padding: '8px 12px', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Page {page} of {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next →</Button>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
