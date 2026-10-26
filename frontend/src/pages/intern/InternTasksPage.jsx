// src/pages/intern/InternTasksPage.jsx — Intern task list with AI explanation
import { useState, useEffect } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { ClipboardList, Clock, AlertCircle, Bot, Volume2, Square, Package, ListOrdered, X } from 'lucide-react';

export default function InternTasksPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);
  const [explanation, setExplanation] = useState('');
  const [loadingExplain, setLoadingExplain] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    api.get('/tasks/assignments').then(r => { setTasks(r.data.data); setLoading(false); });
  }, []);

  const filtered = statusFilter ? tasks.filter(t => t.status === statusFilter) : tasks;

  const openTask = async (task) => {
    setSelectedTask(task);
    setExplanation('');
    if (task.aiExplanationText) { setExplanation(task.aiExplanationText); return; }
    setLoadingExplain(true);
    try {
      const r = await api.post(`/assistant/explain-task/${task._id}`);
      setExplanation(r.data.data.explanation);
    } catch { setExplanation('Could not generate explanation. Ask the AI assistant instead.'); }
    finally { setLoadingExplain(false); }
  };

  const speak = (text) => {
    if (!('speechSynthesis' in window)) { toast.error('TTS not supported'); return; }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.onstart = () => setIsSpeaking(true);
    u.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(u);
  };

  if (loading) return <div className="loading-overlay"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-top">
          <div>
            <h1 className="page-title">My Tasks</h1>
            <p className="page-subtitle">All tasks assigned to you</p>
          </div>
          <select className="form-control" style={{ width: 180, padding: '8px 12px' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            {['assigned','in_progress','submitted','under_review','revision_requested','approved','overdue'].map(s => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
      </div>

      {!filtered.length ? (
        <div className="empty-state">
          <div className="empty-state-icon"><ClipboardList size={48} opacity={0.3} /></div>
          <h3>No tasks found</h3>
          <p>Tasks assigned by your mentor will appear here.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {filtered.map(task => {
            const isOverdue = new Date(task.deadline) < new Date() && task.status !== 'approved';
            return (
              <div className="task-card" key={task._id} onClick={() => openTask(task)} style={{ cursor: 'pointer', borderColor: isOverdue ? 'rgba(255,107,107,0.4)' : undefined }}>
                <div className="task-card-header">
                  <div style={{ flex: 1 }}>
                    <div className="task-title">{task.title}</div>
                    <div className="task-id">{task.taskId}</div>
                  </div>
                  <span className={`status-badge status-${task.status}`}>{task.status?.replace(/_/g, ' ')}</span>
                </div>
                <div className="task-meta">
                  {task.module && <span className="tag tag-module">{task.module.name}</span>}
                  {task.difficulty && <span className={`tag tag-difficulty-${task.difficulty}`}>{task.difficulty}</span>}
                </div>
                <div style={{ fontSize: 12, color: isOverdue ? 'var(--accent)' : 'var(--text-muted)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                  {isOverdue
                    ? <AlertCircle size={12} color="var(--accent)" />
                    : <Clock size={12} />
                  }
                  {isOverdue ? 'Overdue: ' : 'Due: '}
                  {new Date(task.deadline).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                </div>
                <div style={{ marginTop: 12, fontSize: 12, color: 'var(--primary-light)', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Bot size={12} /> Click to view AI explanation
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Task Detail & Explanation Side Panel */}
      {selectedTask && (
        <div className="modal-overlay" onClick={() => { setSelectedTask(null); window.speechSynthesis?.cancel(); setIsSpeaking(false); }}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{selectedTask.title}</h3>
              <button className="modal-close" onClick={() => { setSelectedTask(null); window.speechSynthesis?.cancel(); setIsSpeaking(false); }}>✕</button>
            </div>
            <div className="modal-body">
              <div className="flex-gap mb-2">
                <span className={`status-badge status-${selectedTask.status}`}>{selectedTask.status?.replace(/_/g, ' ')}</span>
                {selectedTask.module && <span className="tag tag-module">{selectedTask.module.name}</span>}
                {selectedTask.difficulty && <span className={`tag tag-difficulty-${selectedTask.difficulty}`}>{selectedTask.difficulty}</span>}
              </div>

              {selectedTask.description && (
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 16 }}>{selectedTask.description}</p>
              )}

              {selectedTask.deliverables?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Package size={12} /> Deliverables
                  </div>
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {selectedTask.deliverables.map((d, i) => (
                      <li key={i} style={{ display: 'flex', gap: 8, fontSize: 13, color: 'var(--text-secondary)', alignItems: 'flex-start' }}>
                        <span style={{ color: 'var(--secondary)', marginTop: 2, flexShrink: 0 }}>✓</span>{d}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedTask.stepByStep?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <ListOrdered size={12} /> Step-by-Step
                  </div>
                  <ol style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {selectedTask.stepByStep.map((step, i) => (
                      <li key={i} style={{ display: 'flex', gap: 10, fontSize: 13, color: 'var(--text-secondary)', alignItems: 'flex-start' }}>
                        <span style={{ background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--primary-light)', flexShrink: 0 }}>{i + 1}</span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* AI Explanation */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <div className="flex-between mb-2">
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary-light)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Bot size={15} /> AI Voice Explanation
                  </div>
                  {explanation && (
                    <div className="flex-gap">
                      {!isSpeaking ? (
                        <button className="btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 5 }} onClick={() => speak(explanation)}>
                          <Volume2 size={13} /> Read Aloud
                        </button>
                      ) : (
                        <button className="btn-danger btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 5 }} onClick={() => { window.speechSynthesis.cancel(); setIsSpeaking(false); }}>
                          <Square size={13} /> Stop
                        </button>
                      )}
                    </div>
                  )}
                </div>
                {loadingExplain ? (
                  <div className="loading-overlay" style={{ minHeight: 80 }}><div className="spinner" /><p className="loading-text">AI generating explanation...</p></div>
                ) : (
                  <div style={{ background: 'var(--bg-card2)', borderRadius: 10, padding: 16, fontSize: 13, lineHeight: 1.9, color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                    {explanation || 'Click the task card to load AI explanation.'}
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => { setSelectedTask(null); window.speechSynthesis?.cancel(); setIsSpeaking(false); }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
