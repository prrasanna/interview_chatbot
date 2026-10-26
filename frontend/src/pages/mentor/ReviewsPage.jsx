// src/pages/mentor/ReviewsPage.jsx — Full review feedback workflow for mentors
import { useState, useEffect } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { ClipboardList, MessageSquare, Pencil, Share2, Save, Link2, Globe, AlertTriangle, Bot, CheckCircle } from 'lucide-react';

export default function ReviewsPage() {
  const [tab, setTab] = useState('pending'); // 'pending' | 'reviews'
  const [submissions, setSubmissions] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReviewModal, setShowReviewModal] = useState(null); // task object
  const [showFeedbackModal, setShowFeedbackModal] = useState(null); // review object
  const [meetings, setMeetings] = useState([]);
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [form, setForm] = useState({ meetingId: '', taskId: '', completionStatus: 'fully_completed', technicalAccuracy: 7, codeQuality: 7, strengths: '', mistakes: '', improvements: '', learningResources: '', taskOutcome: 'approved', nextSteps: '', nextReviewDate: '', rawMentorNotes: '', generateAiFeedback: true });

  useEffect(() => {
    Promise.all([
      api.get('/submissions').then(r => setSubmissions(r.data.data)),
      api.get('/reviews').then(r => setReviews(r.data.data)),
    ]).finally(() => setLoading(false));
    api.get('/meetings?status=scheduled&limit=50').then(r => setMeetings(r.data.data));
  }, []);

  const openReview = (task) => {
    setShowReviewModal(task);
    setForm(p => ({ ...p, taskId: task.task?._id || task._id }));
  };

  const handleCreateReview = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await api.post('/reviews', {
        ...form,
        learningResources: form.learningResources.split('\n').map(s => s.trim()).filter(Boolean),
      });
      toast.success('Review saved! AI feedback generated. Please review before sharing.');
      setShowReviewModal(null);
      api.get('/reviews').then(r => setReviews(r.data.data));
      setTab('reviews');
      setShowFeedbackModal(r.data.data);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleShare = async (reviewId) => {
    if (!confirm('Share this feedback with the intern? They will receive an email.')) return;
    setSharing(true);
    try {
      await api.post(`/reviews/${reviewId}/share`);
      toast.success('Feedback shared! Intern notified via email.');
      setShowFeedbackModal(null);
      api.get('/reviews').then(r => setReviews(r.data.data));
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSharing(false); }
  };

  const handleEditFeedback = async (reviewId, finalFeedback) => {
    try {
      await api.patch(`/reviews/${reviewId}`, { finalFeedback, aiApprovedByMentor: true });
      toast.success('Feedback updated');
    } catch { toast.error('Failed to update'); }
  };

  if (loading) return <div className="loading-overlay"><div className="spinner" /></div>;

  const pendingSubmissions = submissions.filter(s => !reviews.find(r => r.task?._id === s.task?._id));

  const tabs = [
    ['pending', ClipboardList, 'Pending Reviews'],
    ['reviews', MessageSquare, 'Feedback History'],
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Reviews &amp; Feedback</h1>
        <p className="page-subtitle">Review intern submissions and provide mentor feedback</p>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--bg-card)', borderRadius: 10, padding: 4, width: 'fit-content', border: '1px solid var(--border)' }}>
        {tabs.map(([t, Icon, label]) => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, transition: 'var(--transition)', background: tab === t ? 'var(--primary)' : 'transparent', color: tab === t ? 'white' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 7 }}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {tab === 'pending' ? (
        !submissions.length ? (
          <div className="empty-state"><div className="empty-state-icon"><ClipboardList size={48} opacity={0.3} /></div><h3>No submissions yet</h3><p>Interns' submitted work will appear here.</p></div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
            {submissions.map(sub => (
              <div className="task-card" key={sub._id}>
                <div className="task-card-header">
                  <div>
                    <div className="task-title">{sub.task?.title || 'Task'}</div>
                    <div className="task-id">{sub.intern?.name} · Revision #{sub.revisionNumber}</div>
                  </div>
                  <span className="status-badge status-submitted">submitted</span>
                </div>
                {sub.githubLink && (
                  <div style={{ fontSize: 12, margin: '8px 0', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Link2 size={12} color="var(--primary-light)" />
                    <a href={sub.githubLink} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-light)' }}>GitHub Repo</a>
                  </div>
                )}
                {sub.projectUrl && (
                  <div style={{ fontSize: 12, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Globe size={12} color="var(--secondary)" />
                    <a href={sub.projectUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--secondary)' }}>Live Project</a>
                  </div>
                )}
                {sub.notes && <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.6 }}>{sub.notes}</p>}
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>Submitted {new Date(sub.submittedAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</div>
                <button className="btn-primary btn-sm w-full" style={{ width: '100%', justifyContent: 'center' }} onClick={() => openReview(sub)}>
                  <Pencil size={13} /> Write Review Feedback
                </button>
              </div>
            ))}
          </div>
        )
      ) : (
        !reviews.length ? (
          <div className="empty-state"><div className="empty-state-icon"><MessageSquare size={48} opacity={0.3} /></div><h3>No reviews yet</h3></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {reviews.map(review => (
              <div className="card" key={review._id}>
                <div className="flex-between mb-2">
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{review.task?.title || 'Task'}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{review.intern?.name} · {new Date(review.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</div>
                  </div>
                  <div className="flex-gap">
                    <span className={`status-badge ${review.taskOutcome === 'approved' ? 'status-approved' : review.taskOutcome === 'revision_required' ? 'status-revision_requested' : 'status-assigned'}`}>
                      {review.taskOutcome?.replace(/_/g, ' ')}
                    </span>
                    {review.sharedWithIntern ? (
                      <span className="tag" style={{ background: 'rgba(0,212,170,0.1)', color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <CheckCircle size={12} /> Shared
                      </span>
                    ) : (
                      <button className="btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setShowFeedbackModal(review)}>
                        <Share2 size={13} /> Review &amp; Share
                      </button>
                    )}
                  </div>
                </div>
                <div style={{ background: 'var(--bg-card2)', borderRadius: 8, padding: '12px 14px', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                  {(review.finalFeedback || review.aiGeneratedFeedback || 'No feedback text').slice(0, 200)}...
                </div>
                {review.aiGeneratedFeedback && !review.sharedWithIntern && (
                  <div style={{ fontSize: 11, color: 'var(--warning)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <AlertTriangle size={12} /> AI-generated feedback — please review and edit before sharing
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* Create Review Modal */}
      {showReviewModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowReviewModal(null)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <h3 className="modal-title"><Pencil size={16} /> Write Review Feedback</h3>
              <button className="modal-close" onClick={() => setShowReviewModal(null)}>✕</button>
            </div>
            <form onSubmit={handleCreateReview}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Link to Review Meeting</label>
                  <select className="form-control" value={form.meetingId} onChange={e => setForm(p => ({...p, meetingId: e.target.value}))}>
                    <option value="">— No linked meeting —</option>
                    {meetings.map(m => <option key={m._id} value={m._id}>{m.title} — {new Date(m.scheduledAt).toLocaleDateString('en-IN')}</option>)}
                  </select>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Completion Status *</label>
                    <select className="form-control" value={form.completionStatus} onChange={e => setForm(p => ({...p, completionStatus: e.target.value}))} required>
                      <option value="fully_completed">Fully Completed</option>
                      <option value="partially_completed">Partially Completed</option>
                      <option value="not_completed">Not Completed</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Task Outcome *</label>
                    <select className="form-control" value={form.taskOutcome} onChange={e => setForm(p => ({...p, taskOutcome: e.target.value}))} required>
                      <option value="approved">Approved</option>
                      <option value="revision_required">Revision Required</option>
                      <option value="reassigned">Reassign New Task</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Technical Accuracy (1–10)</label>
                    <input type="range" className="form-control" min={1} max={10} value={form.technicalAccuracy} onChange={e => setForm(p => ({...p, technicalAccuracy: e.target.value}))} style={{ padding: '6px 0' }} />
                    <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--primary-light)' }}>{form.technicalAccuracy}/10</div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Code Quality (1–10)</label>
                    <input type="range" className="form-control" min={1} max={10} value={form.codeQuality} onChange={e => setForm(p => ({...p, codeQuality: e.target.value}))} style={{ padding: '6px 0' }} />
                    <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--primary-light)' }}>{form.codeQuality}/10</div>
                  </div>
                </div>
                <div className="form-group"><label className="form-label">Strengths &amp; Achievements</label><textarea className="form-control" rows={2} value={form.strengths} onChange={e => setForm(p => ({...p, strengths: e.target.value}))} placeholder="What the intern did well..." /></div>
                <div className="form-group"><label className="form-label">Mistakes &amp; Missing Requirements</label><textarea className="form-control" rows={2} value={form.mistakes} onChange={e => setForm(p => ({...p, mistakes: e.target.value}))} /></div>
                <div className="form-group"><label className="form-label">Required Improvements</label><textarea className="form-control" rows={2} value={form.improvements} onChange={e => setForm(p => ({...p, improvements: e.target.value}))} /></div>
                <div className="form-group"><label className="form-label">Raw Mentor Notes (for AI to polish)</label><textarea className="form-control" rows={3} value={form.rawMentorNotes} onChange={e => setForm(p => ({...p, rawMentorNotes: e.target.value}))} placeholder="Write your unformatted notes here — AI will turn them into clear, constructive feedback..." /></div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Next Review Date</label>
                    <input type="date" className="form-control" value={form.nextReviewDate} onChange={e => setForm(p => ({...p, nextReviewDate: e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Learning Resources (URLs, one per line)</label>
                    <textarea className="form-control" rows={2} value={form.learningResources} onChange={e => setForm(p => ({...p, learningResources: e.target.value}))} placeholder="https://..." />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(108,99,255,0.08)', borderRadius: 8, border: '1px solid rgba(108,99,255,0.2)' }}>
                  <input type="checkbox" id="genAi" checked={form.generateAiFeedback} onChange={e => setForm(p => ({...p, generateAiFeedback: e.target.checked}))} />
                  <label htmlFor="genAi" style={{ fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Bot size={14} color="var(--primary-light)" /> Generate AI-polished feedback from my notes (you can edit before sharing)
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowReviewModal(null)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? <><span className="spinner-sm spinner" /> Saving...</> : <><Save size={14} /> Save Review</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review & Share Modal */}
      {showFeedbackModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowFeedbackModal(null)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <h3 className="modal-title"><Share2 size={16} /> Review Feedback Before Sharing</h3>
              <button className="modal-close" onClick={() => setShowFeedbackModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="alert alert-warning" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={15} /> Edit the AI-generated feedback below if needed. This is what will be emailed to the intern.
              </div>
              <div className="form-group">
                <label className="form-label">Final Feedback (editable)</label>
                <textarea
                  className="form-control"
                  rows={10}
                  defaultValue={showFeedbackModal.finalFeedback || showFeedbackModal.aiGeneratedFeedback}
                  onBlur={(e) => handleEditFeedback(showFeedbackModal._id, e.target.value)}
                  style={{ fontFamily: 'Inter', lineHeight: 1.8 }}
                />
                <p className="form-hint">Changes save automatically when you click away</p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowFeedbackModal(null)}>Close</button>
              <button className="btn-success" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => handleShare(showFeedbackModal._id)} disabled={sharing}>
                {sharing ? <><span className="spinner-sm spinner" /> Sharing...</> : <><Share2 size={14} /> Share with Intern</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
