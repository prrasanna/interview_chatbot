// src/pages/admin/InternsPage.jsx — Full intern management with CSV import
import { useState, useEffect, useRef } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { Home, Upload, Plus, Search, Pencil, Ban, Users } from 'lucide-react';

const STATUS_COLORS = { active: 'status-active', completed: 'status-completed', deactivated: 'status-overdue', on_hold: 'status-in_progress' };

export default function InternsPage() {
  const [interns, setInterns] = useState([]);
  const [pagination, setPagination] = useState({});
  const [mentors, setMentors] = useState([]);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editIntern, setEditIntern] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', password: 'Intern@1234', phone: '', college: '', joiningDate: '', endDate: '', moduleId: '', mentorId: '', skillLevel: 'beginner' });
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const csvRef = useRef();

  const fetchInterns = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15, ...(search && { search }), ...(statusFilter && { status: statusFilter }) };
      const r = await api.get('/interns', { params });
      setInterns(r.data.data);
      setPagination(r.data.pagination);
    } catch { toast.error('Failed to load interns'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchInterns(); }, [page, search, statusFilter]);
  useEffect(() => {
    api.get('/mentors').then(r => setMentors(r.data.data));
    setModules([
      { _id: null, name: 'Frontend Development' }, { _id: null, name: 'Backend Development' },
      { _id: null, name: 'Full-Stack Development' }, { _id: null, name: 'Python Programming' },
      { _id: null, name: 'AI and Machine Learning' }, { _id: null, name: 'UI/UX Design' },
      { _id: null, name: 'Digital Marketing' }, { _id: null, name: 'Software Testing' },
      { _id: null, name: 'Cloud Computing' },
    ]);
  }, []);

  const openCreate = () => {
    setEditIntern(null);
    setForm({ name: '', email: '', password: 'Intern@1234', phone: '', college: '', joiningDate: '', endDate: '', moduleId: '', mentorId: '', skillLevel: 'beginner' });
    setShowModal(true);
  };
  const openEdit = (intern) => {
    setEditIntern(intern);
    setForm({ name: intern.name, phone: intern.phone || '', college: intern.college || '', endDate: intern.endDate?.slice(0, 10) || '', moduleId: intern.currentModule?._id || '', mentorId: intern.assignedMentor?._id || '', skillLevel: intern.skillLevel || 'beginner', status: intern.status });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editIntern) {
        await api.patch(`/interns/${editIntern._id}`, form);
        toast.success('Intern updated!');
      } else {
        await api.post('/interns', form);
        toast.success('Intern created! Welcome email sent.');
      }
      setShowModal(false);
      fetchInterns();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  const handleDeactivate = async (id, name) => {
    if (!confirm(`Deactivate intern "${name}"? They will lose dashboard access.`)) return;
    try {
      await api.delete(`/interns/${id}`);
      toast.success('Intern deactivated.');
      fetchInterns();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleCsvImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    setImporting(true);
    try {
      const r = await api.post('/interns/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(r.data.message);
      fetchInterns();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed');
    } finally {
      setImporting(false);
      csvRef.current.value = '';
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-top">
          <div>
            <p className="breadcrumb"><Home size={13} /> <span>Admin</span> / Interns</p>
            <h1 className="page-title">Intern Management</h1>
            <p className="page-subtitle">Manage all {pagination.total || 0} interns in your program</p>
          </div>
          <div className="flex-gap">
            <input type="file" ref={csvRef} accept=".csv,.xlsx" onChange={handleCsvImport} style={{ display: 'none' }} />
            <button className="btn-secondary" onClick={() => csvRef.current.click()} disabled={importing}>
              {importing ? <><span className="spinner-sm spinner" /> Importing...</> : <><Upload size={14} /> Import CSV</>}
            </button>
            <button className="btn-primary" onClick={openCreate}><Plus size={14} /> Add Intern</button>
          </div>
        </div>
      </div>

      <div className="table-container">
        <div className="table-header">
          <div className="search-wrapper">
            <span className="search-icon"><Search size={16} /></span>
            <input className="search-input" placeholder="Search by name, email, college..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <div className="flex-gap">
            <select className="form-control" style={{ width: 150, padding: '8px 12px' }} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="on_hold">On Hold</option>
              <option value="deactivated">Deactivated</option>
            </select>
          </div>
        </div>

        <div className="table-wrapper">
          {loading ? (
            <div className="loading-overlay"><div className="spinner" /></div>
          ) : !interns.length ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Users size={48} opacity={0.3} /></div>
              <h3>No interns found</h3>
              <p>Add interns manually or import a CSV file to get started.</p>
              <button className="btn-primary" onClick={openCreate}>Add First Intern</button>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Module</th>
                  <th>Mentor</th>
                  <th>Skill</th>
                  <th>Progress</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {interns.map((intern) => {
                  const progress = intern.totalTasksCount ? Math.round((intern.completedTasksCount / intern.totalTasksCount) * 100) : 0;
                  return (
                    <tr key={intern._id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{intern.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{intern.college || '—'}</div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{intern.email}</td>
                      <td><span className="tag tag-module" style={{ fontSize: 11 }}>{intern.currentModule?.name || '—'}</span></td>
                      <td style={{ fontSize: 13 }}>{intern.assignedMentor?.name || <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>}</td>
                      <td><span style={{ textTransform: 'capitalize', fontSize: 12, color: 'var(--text-secondary)' }}>{intern.skillLevel}</span></td>
                      <td style={{ width: 120 }}>
                        <div className="progress-bar-container" style={{ marginBottom: 4 }}>
                          <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{intern.completedTasksCount}/{intern.totalTasksCount} tasks ({progress}%)</div>
                      </td>
                      <td><span className={`status-badge ${STATUS_COLORS[intern.status] || 'status-assigned'}`}>{intern.status}</span></td>
                      <td>
                        <div className="flex-gap">
                          <button className="btn-secondary btn-sm btn-icon" onClick={() => openEdit(intern)} title="Edit intern">
                            <Pencil size={13} />
                          </button>
                          {intern.status !== 'deactivated' && (
                            <button className="btn-danger btn-sm btn-icon" onClick={() => handleDeactivate(intern._id, intern.name)} title="Deactivate intern">
                              <Ban size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'center', gap: 8, borderTop: '1px solid var(--border)' }}>
            <button className="btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
            <span style={{ padding: '6px 12px', fontSize: 13, color: 'var(--text-muted)' }}>Page {page} of {pagination.pages}</span>
            <button className="btn-secondary btn-sm" disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">
                {editIntern ? <><Pencil size={16} /> Edit Intern</> : <><Plus size={16} /> Add New Intern</>}
              </h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Full Name *</label>
                    <input className="form-control" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required disabled={!!editIntern} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email *</label>
                    <input type="email" className="form-control" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required disabled={!!editIntern} />
                  </div>
                </div>
                {!editIntern && (
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Initial Password</label>
                      <input className="form-control" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />
                      <p className="form-hint">Intern must change on first login</p>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Phone</label>
                      <input className="form-control" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
                    </div>
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">College / Institution</label>
                  <input className="form-control" value={form.college} onChange={e => setForm(p => ({ ...p, college: e.target.value }))} />
                </div>
                {!editIntern && (
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Joining Date *</label>
                      <input type="date" className="form-control" value={form.joiningDate} onChange={e => setForm(p => ({ ...p, joiningDate: e.target.value }))} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">End Date *</label>
                      <input type="date" className="form-control" value={form.endDate} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))} required />
                    </div>
                  </div>
                )}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Skill Level</label>
                    <select className="form-control" value={form.skillLevel} onChange={e => setForm(p => ({ ...p, skillLevel: e.target.value }))}>
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Assign Mentor</label>
                    <select className="form-control" value={form.mentorId} onChange={e => setForm(p => ({ ...p, mentorId: e.target.value }))}>
                      <option value="">— No Mentor —</option>
                      {mentors.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
                    </select>
                  </div>
                </div>
                {editIntern && (
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-control" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="on_hold">On Hold</option>
                    </select>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? <><span className="spinner-sm spinner" /> Saving...</> : editIntern ? 'Update Intern' : 'Create Intern'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
