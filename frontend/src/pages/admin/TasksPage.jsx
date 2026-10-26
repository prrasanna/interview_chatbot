// src/pages/admin/TasksPage.jsx — Task templates + assignment management
import { useState, useEffect } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { FileText, ClipboardList, Bot, Mail, Sparkles, Clock, BarChart2 } from 'lucide-react';

const MODULES = ['Frontend Development','Backend Development','Full-Stack Development','Python Programming','AI and Machine Learning','UI/UX Design','Digital Marketing','Software Testing','Cloud Computing'];
const STATUS_MAP = { assigned:'status-assigned',in_progress:'status-in_progress',submitted:'status-submitted',under_review:'status-under_review',approved:'status-approved',revision_requested:'status-revision_requested',overdue:'status-overdue' };

export default function TasksPage() {
  const [tab, setTab] = useState('assignments'); // 'assignments' | 'templates'
  const [assignments, setAssignments] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [interns, setInterns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showExplainModal, setShowExplainModal] = useState(null);
  const [explanation, setExplanation] = useState('');
  const [loadingExplain, setLoadingExplain] = useState(false);
  const [form, setForm] = useState({ internIds: [], templateId: '', title: '', description: '', moduleId: '', difficulty: 'medium', priority: 'medium', techStack: '', deliverables: '', stepByStep: '', startDate: '', deadline: '', mentorId: '' });
  const [tplForm, setTplForm] = useState({ title:'', description:'', moduleId:'', difficulty:'medium', priority:'medium', estimatedDays:7, techStack:'', deliverables:'', stepByStep:'' });
  const [saving, setSaving] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [loadingRec, setLoadingRec] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/tasks/assignments?limit=50').then(r => setAssignments(r.data.data)),
      api.get('/tasks/templates?limit=50').then(r => setTemplates(r.data.data)),
      api.get('/interns?limit=100').then(r => setInterns(r.data.data)),
    ]).finally(() => setLoading(false));
  }, []);

  const refreshAssignments = () => api.get('/tasks/assignments?limit=50').then(r => setAssignments(r.data.data));

  const handleAssign = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        techStack: form.techStack.split(',').map(s => s.trim()).filter(Boolean),
        deliverables: form.deliverables.split('\n').map(s => s.trim()).filter(Boolean),
        stepByStep: form.stepByStep.split('\n').map(s => s.trim()).filter(Boolean),
      };
      const r = await api.post('/tasks/assignments', payload);
      toast.success(r.data.message);
      setShowAssignModal(false);
      refreshAssignments();
    } catch (err) { toast.error(err.response?.data?.message || 'Assignment failed'); }
    finally { setSaving(false); }
  };

  const handleCreateTemplate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/tasks/templates', {
        ...tplForm,
        techStack: tplForm.techStack.split(',').map(s => s.trim()).filter(Boolean),
        deliverables: tplForm.deliverables.split('\n').map(s => s.trim()).filter(Boolean),
        stepByStep: tplForm.stepByStep.split('\n').map(s => s.trim()).filter(Boolean),
      });
      toast.success('Template created!');
      setShowTemplateModal(false);
      api.get('/tasks/templates?limit=50').then(r => setTemplates(r.data.data));
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const loadExplanation = async (taskId) => {
    setShowExplainModal(taskId);
    setExplanation('');
    setLoadingExplain(true);
    try {
      const r = await api.get(`/tasks/assignments/${taskId}/explanation`);
      setExplanation(r.data.data.explanation);
    } catch { setExplanation('Failed to generate explanation.'); }
    finally { setLoadingExplain(false); }
  };

  const getRecommendations = async (internId) => {
    if (!internId) return;
    setLoadingRec(true);
    try {
      const r = await api.post('/tasks/assignments/recommend', { internId });
      setRecommendations(r.data.data);
      toast.success('AI recommendations loaded!');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setLoadingRec(false); }
  };

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/tasks/assignments/${id}/status`, { status });
      toast.success('Status updated');
      refreshAssignments();
    } catch { toast.error('Failed to update status'); }
  };

  if (loading) return <div className="loading-overlay"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-top">
          <div>
            <h1 className="page-title">Task Management</h1>
            <p className="page-subtitle">Create templates, assign tasks, track progress</p>
          </div>
          <div className="flex-gap">
            <button className="btn-secondary" onClick={() => setShowTemplateModal(true)}>
              <FileText size={14} /> New Template
            </button>
            <button className="btn-primary" onClick={() => setShowAssignModal(true)}>
              <ClipboardList size={14} /> Assign Task
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--bg-card)', borderRadius: 10, padding: 4, width: 'fit-content', border: '1px solid var(--border)' }}>
        {[['assignments', ClipboardList, 'Assignments'], ['templates', FileText, 'Templates']].map(([t, Icon, label]) => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, transition: 'var(--transition)', background: tab === t ? 'var(--primary)' : 'transparent', color: tab === t ? 'white' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 7 }}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {tab === 'assignments' ? (
        <div className="table-container">
          <div className="table-wrapper">
            {!assignments.length ? (
              <div className="empty-state"><div className="empty-state-icon"><ClipboardList size={48} opacity={0.3} /></div><h3>No tasks assigned yet</h3><p>Assign a task to an intern to get started.</p><button className="btn-primary" onClick={() => setShowAssignModal(true)}>Assign First Task</button></div>
            ) : (
              <table className="data-table">
                <thead><tr><th>Task</th><th>Intern</th><th>Module</th><th>Deadline</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {assignments.map(task => (
                    <tr key={task._id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{task.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{task.taskId}</div>
                      </td>
                      <td style={{ fontSize: 13 }}>{task.intern?.name || '—'}</td>
                      <td><span className="tag tag-module">{task.module?.name || '—'}</span></td>
                      <td style={{ fontSize: 12, color: new Date(task.deadline) < new Date() && task.status !== 'approved' ? 'var(--accent)' : 'var(--text-secondary)' }}>
                        {new Date(task.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td>
                        <select
                          className="form-control" style={{ padding: '4px 8px', fontSize: 12, width: 'auto' }}
                          value={task.status}
                          onChange={e => updateStatus(task._id, e.target.value)}
                        >
                          {['assigned','in_progress','submitted','under_review','approved','revision_requested','overdue'].map(s => (
                            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <button className="btn-secondary btn-sm btn-icon" onClick={() => loadExplanation(task._id)} title="View AI Explanation">
                          <Bot size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {!templates.length ? (
            <div className="empty-state"><div className="empty-state-icon"><FileText size={48} opacity={0.3} /></div><h3>No templates yet</h3></div>
          ) : templates.map(t => (
            <div className="task-card" key={t._id}>
              <div className="task-card-header">
                <div>
                  <div className="task-title">{t.title}</div>
                  <div className="task-id">{t.module?.name}</div>
                </div>
                <span className={`tag tag-difficulty-${t.difficulty}`}>{t.difficulty}</span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 12 }}>{t.description.slice(0, 120)}...</p>
              <div className="task-meta">
                {(t.techStack || []).slice(0, 4).map(tech => <span key={tech} style={{ background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 20, padding: '2px 10px', fontSize: 11, color: 'var(--text-muted)' }}>{tech}</span>)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Clock size={12} /> {t.estimatedDays} days · {t.deliverables?.length || 0} deliverables
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAssignModal(false)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <h3 className="modal-title"><ClipboardList size={16} /> Assign Task to Intern(s)</h3>
              <button className="modal-close" onClick={() => setShowAssignModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAssign}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Select Intern(s) *</label>
                  <select multiple className="form-control" style={{ height: 120 }} value={form.internIds} onChange={e => setForm(p => ({ ...p, internIds: Array.from(e.target.selectedOptions, o => o.value) }))}>
                    {interns.map(i => <option key={i._id} value={i._id}>{i.name} — {i.email}</option>)}
                  </select>
                  <p className="form-hint">Hold Ctrl/Cmd to select multiple interns for bulk assignment</p>
                </div>

                <div className="form-group">
                  <label className="form-label">Use Task Template (optional)</label>
                  <select className="form-control" value={form.templateId} onChange={e => {
                    const tmpl = templates.find(t => t._id === e.target.value);
                    if (tmpl) setForm(p => ({ ...p, templateId: tmpl._id, title: tmpl.title, description: tmpl.description, moduleId: tmpl.module?._id || '', difficulty: tmpl.difficulty, techStack: (tmpl.techStack||[]).join(', '), deliverables: (tmpl.deliverables||[]).join('\n'), stepByStep: (tmpl.stepByStep||[]).join('\n') }));
                    else setForm(p => ({ ...p, templateId: '' }));
                  }}>
                    <option value="">— Custom task —</option>
                    {templates.map(t => <option key={t._id} value={t._id}>{t.title}</option>)}
                  </select>
                </div>

                {form.internIds.length === 1 && (
                  <div className="form-group">
                    <button type="button" className="btn-secondary btn-sm" onClick={() => getRecommendations(form.internIds[0])} disabled={loadingRec}>
                      {loadingRec ? <><span className="spinner-sm spinner" /> Getting AI suggestions...</> : <><Sparkles size={13} /> Get AI Recommendations</>}
                    </button>
                    {recommendations.length > 0 && (
                      <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {recommendations.map(r => (
                          <div key={r.id} onClick={() => { const t = templates.find(t => t._id === r.id); if(t) { setForm(p => ({...p, templateId: t._id, title: t.title, description: t.description})); } }} style={{ padding: '8px 12px', background: 'var(--bg-card2)', borderRadius: 8, cursor: 'pointer', border: '1px solid var(--border)', fontSize: 13, transition: 'var(--transition)' }} onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                            <strong>{r.title}</strong> — <span style={{ color: 'var(--text-muted)' }}>{r.reason}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Task Title *</label>
                  <input className="form-control" value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Description *</label>
                  <textarea className="form-control" rows={3} value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Start Date *</label>
                    <input type="date" className="form-control" value={form.startDate} onChange={e => setForm(p => ({...p, startDate: e.target.value}))} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Deadline *</label>
                    <input type="date" className="form-control" value={form.deadline} onChange={e => setForm(p => ({...p, deadline: e.target.value}))} required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Difficulty</label>
                    <select className="form-control" value={form.difficulty} onChange={e => setForm(p => ({...p, difficulty: e.target.value}))}>
                      <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <select className="form-control" value={form.priority} onChange={e => setForm(p => ({...p, priority: e.target.value}))}>
                      <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Tech Stack (comma-separated)</label>
                  <input className="form-control" value={form.techStack} onChange={e => setForm(p => ({...p, techStack: e.target.value}))} placeholder="React, Node.js, MongoDB" />
                </div>
                <div className="form-group">
                  <label className="form-label">Deliverables (one per line)</label>
                  <textarea className="form-control" rows={3} value={form.deliverables} onChange={e => setForm(p => ({...p, deliverables: e.target.value}))} placeholder={"Working web app\nGitHub repo link\nREADME documentation"} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowAssignModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving || !form.internIds.length}>
                  {saving ? <><span className="spinner-sm spinner" /> Assigning...</> : <><Mail size={14} /> Assign to {form.internIds.length} Intern(s)</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowTemplateModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title"><FileText size={16} /> Create Task Template</h3>
              <button className="modal-close" onClick={() => setShowTemplateModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateTemplate}>
              <div className="modal-body">
                <div className="form-group"><label className="form-label">Title *</label><input className="form-control" value={tplForm.title} onChange={e => setTplForm(p => ({...p, title: e.target.value}))} required /></div>
                <div className="form-group"><label className="form-label">Description *</label><textarea className="form-control" rows={3} value={tplForm.description} onChange={e => setTplForm(p => ({...p, description: e.target.value}))} required /></div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Difficulty</label><select className="form-control" value={tplForm.difficulty} onChange={e => setTplForm(p => ({...p, difficulty: e.target.value}))}><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></div>
                  <div className="form-group"><label className="form-label">Est. Days</label><input type="number" className="form-control" value={tplForm.estimatedDays} onChange={e => setTplForm(p => ({...p, estimatedDays: e.target.value}))} min={1} /></div>
                </div>
                <div className="form-group"><label className="form-label">Tech Stack (comma-separated)</label><input className="form-control" value={tplForm.techStack} onChange={e => setTplForm(p => ({...p, techStack: e.target.value}))} placeholder="React, CSS, HTML" /></div>
                <div className="form-group"><label className="form-label">Deliverables (one per line)</label><textarea className="form-control" rows={3} value={tplForm.deliverables} onChange={e => setTplForm(p => ({...p, deliverables: e.target.value}))} /></div>
                <div className="form-group"><label className="form-label">Step-by-Step Guide (one per line)</label><textarea className="form-control" rows={3} value={tplForm.stepByStep} onChange={e => setTplForm(p => ({...p, stepByStep: e.target.value}))} /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowTemplateModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Create Template'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Explanation Modal */}
      {showExplainModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowExplainModal(null)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <h3 className="modal-title"><Bot size={16} /> AI Task Explanation</h3>
              <button className="modal-close" onClick={() => setShowExplainModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              {loadingExplain ? (
                <div className="loading-overlay"><div className="spinner" /><p className="loading-text">Generating AI explanation...</p></div>
              ) : (
                <div style={{ background: 'var(--bg-card2)', borderRadius: 10, padding: 20, fontSize: 14, lineHeight: 1.8, color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                  {explanation}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowExplainModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
