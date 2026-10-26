// src/pages/intern/InternDashboard.jsx — Personalized intern dashboard with AI voice
import { useState, useEffect, useRef } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import {
  Hand, BookOpen, Zap, GraduationCap, Target, Clock, AlertCircle,
  Mic, Volume2, Square, Upload, Bot, CalendarDays, MessageSquare,
  ChevronRight, Info, X, CheckCircle, Package, ListOrdered, ClipboardList
} from 'lucide-react';

const hasSpeechSynthesis = 'speechSynthesis' in window;

export default function InternDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitForm, setSubmitForm] = useState({ githubLink: '', projectUrl: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [explanation, setExplanation] = useState('');
  const [loadingExplain, setLoadingExplain] = useState(false);
  const [showExplainPanel, setShowExplainPanel] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showFeedbackDetail, setShowFeedbackDetail] = useState(null);

  useEffect(() => {
    api.get('/dashboard/intern').then(r => { setData(r.data.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const speak = (text) => {
    if (!hasSpeechSynthesis) { toast.error('Text-to-speech not supported in this browser.'); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.name.includes('Samantha') || v.name.includes('Google UK English Female') || v.name.includes('Microsoft Zira'));
    if (preferred) utterance.voice = preferred;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => { window.speechSynthesis.cancel(); setIsSpeaking(false); };

  const loadExplanation = async () => {
    if (!data?.activeTask) { toast.error('No active task found.'); return; }
    if (explanation) { setShowExplainPanel(true); return; }
    setLoadingExplain(true);
    setShowExplainPanel(true);
    try {
      const r = await api.post(`/assistant/explain-task/${data.activeTask._id}`);
      setExplanation(r.data.data.explanation);
    } catch { setExplanation('Failed to generate explanation. Please try again.'); }
    finally { setLoadingExplain(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!data?.activeTask) return;
    setSubmitting(true);
    try {
      await api.post('/submissions', { taskId: data.activeTask._id, ...submitForm });
      toast.success('Work submitted successfully! Your mentor will be notified.');
      setShowSubmitModal(false);
      api.get('/dashboard/intern').then(r => setData(r.data.data));
    } catch (err) { toast.error(err.response?.data?.message || 'Submission failed'); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="loading-overlay"><div className="spinner" /><p className="loading-text">Loading your dashboard...</p></div>;
  if (!data) return <div className="alert alert-danger">Failed to load dashboard. Please refresh.</div>;

  const { intern, activeTask, upcomingMeeting, recentReviews, taskHistory, progress } = data;
  const deadlinePassed = activeTask && new Date(activeTask.deadline) < new Date();

  return (
    <div>
      {/* Welcome Header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(108,99,255,0.15), rgba(0,212,170,0.08))',
        border: '1px solid rgba(108,99,255,0.2)',
        borderRadius: 'var(--radius-lg)',
        padding: '28px 32px',
        marginBottom: 24,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 20,
      }}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Hand size={14} /> Welcome back
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>{user?.name}</h1>
          <div className="flex-gap" style={{ flexWrap: 'wrap' }}>
            {intern?.currentModule && (
              <span className="tag tag-module" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <BookOpen size={11} /> {intern.currentModule.name}
              </span>
            )}
            {intern?.skillLevel && (
              <span style={{ background: 'rgba(0,212,170,0.1)', color: 'var(--secondary)', borderRadius: 20, padding: '3px 12px', fontSize: 11, fontWeight: 600, textTransform: 'capitalize', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Zap size={11} /> {intern.skillLevel}
              </span>
            )}
            {intern?.assignedMentor && (
              <span style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <GraduationCap size={14} /> Mentor: <strong style={{ color: 'var(--text-secondary)' }}>{intern.assignedMentor.name}</strong>
              </span>
            )}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--primary-light)' }}>{progress?.percent || 0}%</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Overall Progress</div>
          <div className="progress-bar-container" style={{ width: 160 }}>
            <div className="progress-bar-fill" style={{ width: `${progress?.percent || 0}%` }} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{progress?.completed}/{progress?.total} tasks completed</div>
        </div>
      </div>

      <div className="grid-2 mb-3" style={{ gridTemplateColumns: '3fr 2fr' }}>
        {/* Active Task Card */}
        <div>
          {activeTask ? (
            <div className="task-card" style={{ border: '1px solid rgba(108,99,255,0.3)', background: 'linear-gradient(145deg, var(--bg-card), rgba(108,99,255,0.05))' }}>
              <div className="task-card-header">
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Target size={12} /> Active Task
                  </div>
                  <div className="task-title" style={{ fontSize: 18 }}>{activeTask.title}</div>
                  <div className="task-id">{activeTask.taskId}</div>
                </div>
                <span className={`status-badge status-${activeTask.status}`}>{activeTask.status?.replace(/_/g, ' ')}</span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, margin: '12px 0' }}>
                {activeTask.description?.slice(0, 200)}{activeTask.description?.length > 200 ? '...' : ''}
              </p>
              <div className="task-meta">
                {activeTask.module && <span className="tag tag-module">{activeTask.module.name}</span>}
                {activeTask.difficulty && <span className={`tag tag-difficulty-${activeTask.difficulty}`}>{activeTask.difficulty}</span>}
                {activeTask.priority && <span className={`tag tag-priority-${activeTask.priority}`}>{activeTask.priority}</span>}
              </div>
              {(activeTask.techStack || []).length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '10px 0' }}>
                  {activeTask.techStack.map(t => (
                    <span key={t} style={{ background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 20, padding: '2px 10px', fontSize: 11, color: 'var(--text-muted)' }}>{t}</span>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '10px 0' }}>
                {deadlinePassed
                  ? <AlertCircle size={14} color="var(--accent)" />
                  : <Clock size={14} color="var(--text-muted)" />
                }
                <span style={{ fontSize: 13, color: deadlinePassed ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: deadlinePassed ? 700 : 400 }}>
                  {deadlinePassed ? 'Overdue: ' : 'Due: '}
                  {new Date(activeTask.deadline).toLocaleDateString('en-IN', { dateStyle: 'full' })}
                </span>
              </div>

              {/* AI Explain + Submit buttons */}
              <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
                <button className="btn-primary" onClick={loadExplanation} disabled={loadingExplain}>
                  {loadingExplain ? <><span className="spinner-sm spinner" /> Generating...</> : <><Mic size={14} /> Listen to Task Explanation</>}
                </button>
                {activeTask.status !== 'approved' && (
                  <button className="btn-success" onClick={() => setShowSubmitModal(true)}>
                    <Upload size={14} /> Submit Work
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="empty-state" style={{ padding: '40px 0' }}>
                <div className="empty-state-icon"><Target size={48} opacity={0.3} /></div>
                <h3>No active task</h3>
                <p>Your mentor will assign your next task soon. Use the AI assistant to ask any questions!</p>
              </div>
            </div>
          )}

          {/* AI Explanation Panel */}
          {showExplainPanel && (
            <div className="card mt-2" style={{ border: '1px solid rgba(108,99,255,0.3)', background: 'linear-gradient(145deg, var(--bg-card), rgba(108,99,255,0.05))' }}>
              <div className="flex-between mb-2">
                <h3 style={{ fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Bot size={16} color="var(--primary-light)" /> AI Task Explanation
                </h3>
                <div className="flex-gap">
                  {explanation && !isSpeaking && (
                    <button className="btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 5 }} onClick={() => speak(explanation)}>
                      <Volume2 size={13} /> Read Aloud
                    </button>
                  )}
                  {isSpeaking && (
                    <button className="btn-danger btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 5 }} onClick={stopSpeaking}>
                      <Square size={13} /> Stop
                    </button>
                  )}
                  <button className="btn-secondary btn-sm btn-icon" onClick={() => setShowExplainPanel(false)}>
                    <X size={14} />
                  </button>
                </div>
              </div>
              {loadingExplain ? (
                <div className="loading-overlay" style={{ minHeight: 100 }}><div className="spinner" /><p className="loading-text">AI is generating your explanation...</p></div>
              ) : (
                <>
                  {explanation.includes('[MOCK') && (
                    <div className="alert-mock mb-2" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <AlertCircle size={13} /> MOCK AI response — Configure GEMINI_API_KEY in backend .env for real explanations
                    </div>
                  )}
                  <div style={{ background: 'var(--bg-card2)', borderRadius: 10, padding: '16px 20px', fontSize: 14, lineHeight: 1.9, color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                    {explanation}
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Info size={11} /> You can also ask the AI assistant (mic button, bottom right) any follow-up questions!
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Upcoming Meeting */}
          <div className="card" style={{ border: upcomingMeeting ? '1px solid rgba(0,212,170,0.3)' : '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
              <CalendarDays size={12} /> Next Review Meeting
            </div>
            {upcomingMeeting ? (
              <>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{upcomingMeeting.title}</div>
                <div style={{ fontSize: 13, color: 'var(--secondary)', fontWeight: 600, marginBottom: 8 }}>
                  {new Date(upcomingMeeting.scheduledAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'short' })}
                </div>
                {upcomingMeeting.mentor && (
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <GraduationCap size={13} /> with {upcomingMeeting.mentor.name}
                  </div>
                )}
                {upcomingMeeting.meetingLink && (
                  <a href={upcomingMeeting.meetingLink} target="_blank" rel="noopener noreferrer" className="btn-success btn-sm mt-2" style={{ display: 'inline-flex', marginTop: 12, alignItems: 'center', gap: 6 }}>
                    Join Meeting <ChevronRight size={13} />
                  </a>
                )}
              </>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No upcoming meetings scheduled.</div>
            )}
          </div>

          {/* Latest Feedback */}
          {recentReviews?.length > 0 && (
            <div className="card">
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                <MessageSquare size={12} /> Latest Feedback
              </div>
              {recentReviews.slice(0, 1).map(review => (
                <div key={review._id}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{review.task?.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>by {review.mentor?.name} · {new Date(review.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</div>
                  <div style={{ background: 'var(--bg-card2)', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                    {(review.finalFeedback || review.aiGeneratedFeedback || 'No feedback text').slice(0, 150)}...
                  </div>
                  <button className="btn-secondary btn-sm mt-2" onClick={() => setShowFeedbackDetail(review)} style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
                    Read Full Feedback <ChevronRight size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Mentor Card */}
          {intern?.assignedMentor && (
            <div className="card" style={{ background: 'linear-gradient(135deg, rgba(108,99,255,0.1), rgba(0,212,170,0.05))' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                <GraduationCap size={12} /> Your Mentor
              </div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{intern.assignedMentor.name}</div>
              <a href={`mailto:${intern.assignedMentor.email}`} style={{ fontSize: 13, color: 'var(--primary-light)', marginTop: 4, display: 'block' }}>{intern.assignedMentor.email}</a>
              {intern.assignedMentor.phone && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{intern.assignedMentor.phone}</div>}
            </div>
          )}
        </div>
      </div>

      {/* Task History */}
      {taskHistory?.length > 0 && (
        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <ClipboardList size={18} color="var(--primary)" /> Task History
          </h3>
          <div className="table-wrapper">
            <table className="data-table">
              <thead><tr><th>Task ID</th><th>Title</th><th>Module</th><th>Status</th><th>Deadline</th></tr></thead>
              <tbody>
                {taskHistory.map(task => (
                  <tr key={task._id}>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{task.taskId}</td>
                    <td style={{ fontWeight: 600 }}>{task.title}</td>
                    <td><span className="tag tag-module" style={{ fontSize: 11 }}>{task.module?.name || '—'}</span></td>
                    <td><span className={`status-badge status-${task.status}`}>{task.status?.replace(/_/g, ' ')}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(task.deadline).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Submit Work Modal */}
      {showSubmitModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowSubmitModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title"><Upload size={16} /> Submit Your Work</h3>
              <button className="modal-close" onClick={() => setShowSubmitModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div style={{ padding: '10px 14px', background: 'rgba(108,99,255,0.08)', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
                  Submitting for: <strong>{activeTask?.title}</strong>
                </div>
                <div className="form-group">
                  <label className="form-label">GitHub Repository Link</label>
                  <input className="form-control" type="url" value={submitForm.githubLink} onChange={e => setSubmitForm(p => ({...p, githubLink: e.target.value}))} placeholder="https://github.com/yourname/project" />
                </div>
                <div className="form-group">
                  <label className="form-label">Live Project URL</label>
                  <input className="form-control" type="url" value={submitForm.projectUrl} onChange={e => setSubmitForm(p => ({...p, projectUrl: e.target.value}))} placeholder="https://yourproject.vercel.app" />
                </div>
                <div className="form-group">
                  <label className="form-label">Notes for Mentor</label>
                  <textarea className="form-control" rows={4} value={submitForm.notes} onChange={e => setSubmitForm(p => ({...p, notes: e.target.value}))} placeholder="Explain what you built, any challenges you faced, and what you learned..." />
                </div>
                {(!submitForm.githubLink && !submitForm.projectUrl) && (
                  <div className="alert alert-warning">Please provide at least a GitHub link or live project URL.</div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowSubmitModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={submitting || (!submitForm.githubLink && !submitForm.projectUrl)}>
                  {submitting ? <><span className="spinner-sm spinner" /> Submitting...</> : <><CheckCircle size={14} /> Submit Work</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full Feedback Modal */}
      {showFeedbackDetail && (
        <div className="modal-overlay" onClick={() => setShowFeedbackDetail(null)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title"><MessageSquare size={16} /> Mentor Feedback</h3>
              <button className="modal-close" onClick={() => setShowFeedbackDetail(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
                {showFeedbackDetail.technicalAccuracy && <div style={{ background: 'var(--bg-card2)', borderRadius: 8, padding: '12px 16px', flex: 1, textAlign: 'center' }}><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Technical Accuracy</div><div style={{ fontSize: 22, fontWeight: 700, color: 'var(--primary-light)', marginTop: 4 }}>{showFeedbackDetail.technicalAccuracy}/10</div></div>}
                {showFeedbackDetail.codeQuality && <div style={{ background: 'var(--bg-card2)', borderRadius: 8, padding: '12px 16px', flex: 1, textAlign: 'center' }}><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Code Quality</div><div style={{ fontSize: 22, fontWeight: 700, color: 'var(--secondary)', marginTop: 4 }}>{showFeedbackDetail.codeQuality}/10</div></div>}
                <div style={{ background: 'var(--bg-card2)', borderRadius: 8, padding: '12px 16px', flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Outcome</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: showFeedbackDetail.taskOutcome === 'approved' ? 'var(--secondary)' : 'var(--warning)', marginTop: 4, textTransform: 'capitalize' }}>{showFeedbackDetail.taskOutcome?.replace(/_/g, ' ')}</div>
                </div>
              </div>
              <div style={{ background: 'var(--bg-card2)', borderRadius: 10, padding: '16px 20px', fontSize: 14, lineHeight: 1.9, whiteSpace: 'pre-wrap', marginBottom: 12 }}>
                {showFeedbackDetail.finalFeedback || showFeedbackDetail.aiGeneratedFeedback}
              </div>
              {hasSpeechSynthesis && (
                <button className="btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => speak(showFeedbackDetail.finalFeedback || showFeedbackDetail.aiGeneratedFeedback)}>
                  <Volume2 size={14} /> Read Feedback Aloud
                </button>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowFeedbackDetail(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
