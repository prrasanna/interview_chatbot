// src/pages/shared/MeetingsPage.jsx — Calendar view + meeting scheduling (used by admin & mentor)
import { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const STATUS_COLORS = { scheduled: '#6c63ff', completed: '#00d4aa', cancelled: '#ff6b6b', rescheduled: '#ffd93d' };

export default function MeetingsPage() {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState([]);
  const [interns, setInterns] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [form, setForm] = useState({ title: '', agenda: '', internId: '', mentorId: '', scheduledAt: '', duration: 60, timezone: 'Asia/Kolkata', meetingLink: '', location: '' });
  const [saving, setSaving] = useState(false);

  const fetchMeetings = () => {
    api.get('/meetings?limit=200').then(r => {
      setMeetings(r.data.data);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchMeetings();
    if (user.role === 'admin') {
      api.get('/interns?limit=200').then(r => setInterns(r.data.data));
      api.get('/mentors').then(r => setMentors(r.data.data));
    } else if (user.role === 'mentor') {
      api.get('/interns?limit=200').then(r => setInterns(r.data.data));
    }
  }, []);

  const calendarEvents = meetings.map(m => ({
    id: m._id,
    title: `${m.title} — ${m.intern?.name || ''}`,
    start: m.scheduledAt,
    end: new Date(new Date(m.scheduledAt).getTime() + (m.duration || 60) * 60000).toISOString(),
    backgroundColor: STATUS_COLORS[m.status] || '#6c63ff',
    borderColor: 'transparent',
    extendedProps: m,
  }));

  const handleEventClick = ({ event }) => setSelectedMeeting(event.extendedProps);

  const handleSchedule = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/meetings', form);
      toast.success('Meeting scheduled! Invite email sent 📧');
      setShowModal(false);
      fetchMeetings();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleCancel = async (id) => {
    if (!confirm('Cancel this meeting? The intern will be notified.')) return;
    try {
      await api.patch(`/meetings/${id}`, { status: 'cancelled', cancelReason: 'Cancelled by organiser' });
      toast.success('Meeting cancelled. Intern notified.');
      setSelectedMeeting(null);
      fetchMeetings();
    } catch { toast.error('Failed'); }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-top">
          <div>
            <h1 className="page-title">Review Meetings</h1>
            <p className="page-subtitle">Schedule and manage all intern review meetings</p>
          </div>
          {user.role !== 'intern' && (
            <button className="btn-primary" onClick={() => setShowModal(true)}>📅 Schedule Meeting</button>
          )}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: color }} />
            <span style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{status}</span>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: 20 }}>
          {loading ? <div className="loading-overlay"><div className="spinner" /></div> : (
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }}
              events={calendarEvents}
              eventClick={handleEventClick}
              height={620}
              eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: true }}
            />
          )}
        </div>
      </div>

      {/* Meeting Detail Popup */}
      {selectedMeeting && (
        <div className="modal-overlay" onClick={() => setSelectedMeeting(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">📅 {selectedMeeting.title}</h3>
              <button className="modal-close" onClick={() => setSelectedMeeting(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  ['Intern', selectedMeeting.intern?.name],
                  ['Mentor', selectedMeeting.mentor?.name],
                  ['Date & Time', new Date(selectedMeeting.scheduledAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'short' })],
                  ['Duration', `${selectedMeeting.duration || 60} minutes`],
                  ['Status', selectedMeeting.status],
                  ['Meeting Link', selectedMeeting.meetingLink],
                  ['Location', selectedMeeting.location],
                  ['Agenda', selectedMeeting.agenda],
                ].map(([label, value]) => value ? (
                  <div key={label} style={{ display: 'flex', gap: 12, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: 13, width: 110, flexShrink: 0 }}>{label}</span>
                    <span style={{ fontSize: 13, color: 'var(--text-primary)', wordBreak: 'break-all' }}>{label === 'Meeting Link' ? <a href={value} target="_blank" rel="noopener noreferrer">{value}</a> : value}</span>
                  </div>
                ) : null)}
              </div>
            </div>
            <div className="modal-footer">
              {selectedMeeting.status === 'scheduled' && user.role !== 'intern' && (
                <button className="btn-danger" onClick={() => handleCancel(selectedMeeting._id)}>❌ Cancel Meeting</button>
              )}
              <button className="btn-secondary" onClick={() => setSelectedMeeting(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <h3 className="modal-title">📅 Schedule Review Meeting</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSchedule}>
              <div className="modal-body">
                <div className="form-group"><label className="form-label">Meeting Title *</label><input className="form-control" value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} required placeholder="Week 2 Review" /></div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Intern *</label>
                    <select className="form-control" value={form.internId} onChange={e => setForm(p => ({...p, internId: e.target.value}))} required>
                      <option value="">Select intern...</option>
                      {interns.map(i => <option key={i._id} value={i._id}>{i.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Mentor *</label>
                    {user.role === 'admin' ? (
                      <select className="form-control" value={form.mentorId} onChange={e => setForm(p => ({...p, mentorId: e.target.value}))} required>
                        <option value="">Select mentor...</option>
                        {mentors.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
                      </select>
                    ) : (
                      <input className="form-control" value="You (current mentor)" disabled />
                    )}
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Date & Time *</label><input type="datetime-local" className="form-control" value={form.scheduledAt} onChange={e => setForm(p => ({...p, scheduledAt: e.target.value}))} required /></div>
                  <div className="form-group"><label className="form-label">Duration (minutes)</label><input type="number" className="form-control" value={form.duration} onChange={e => setForm(p => ({...p, duration: e.target.value}))} min={15} step={15} /></div>
                </div>
                <div className="form-group"><label className="form-label">Meeting Link (Google Meet / Zoom)</label><input className="form-control" value={form.meetingLink} onChange={e => setForm(p => ({...p, meetingLink: e.target.value}))} placeholder="https://meet.google.com/..." /></div>
                <div className="form-group"><label className="form-label">Or Physical Location</label><input className="form-control" value={form.location} onChange={e => setForm(p => ({...p, location: e.target.value}))} placeholder="Conference Room A, 3rd Floor" /></div>
                <div className="form-group"><label className="form-label">Agenda / Notes</label><textarea className="form-control" rows={3} value={form.agenda} onChange={e => setForm(p => ({...p, agenda: e.target.value}))} placeholder="Review Portfolio Website, discuss next task..." /></div>
                <div className="alert alert-info" style={{ marginTop: 8 }}>📧 An invitation email will be sent to the intern automatically when you schedule this meeting.</div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? <><span className="spinner-sm spinner" /> Scheduling...</> : '📅 Schedule & Notify'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
