// services/calendarService.js — Google Calendar integration (optional, mock mode supported)
// Only creates events when MOCK_CALENDAR=false AND OAuth credentials are configured.

let calendarClient = null;

const getCalendar = () => {
  if (calendarClient) return calendarClient;
  const { google } = require('googleapis');
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  calendarClient = google.calendar({ version: 'v3', auth: oauth2Client });
  return calendarClient;
};

/**
 * Create a Google Calendar event for a review meeting.
 * Returns { eventId, htmlLink } or mock data in mock mode.
 */
exports.createMeetingEvent = async ({ meeting, internEmail, mentorEmail }) => {
  if (process.env.MOCK_CALENDAR === 'true' || !process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_REFRESH_TOKEN) {
    const mockId = `mock-event-${Date.now()}`;
    console.log(`[CALENDAR MOCK] Would create event "${meeting.title}" for ${internEmail}`);
    return { eventId: mockId, htmlLink: '#mock-calendar-link', isMock: true };
  }

  try {
    const calendar = getCalendar();
    const startTime = new Date(meeting.scheduledAt);
    const endTime = new Date(startTime.getTime() + (meeting.duration || 60) * 60 * 1000);

    const event = {
      summary: meeting.title,
      description: meeting.agenda || '',
      start: { dateTime: startTime.toISOString(), timeZone: meeting.timezone || 'Asia/Kolkata' },
      end: { dateTime: endTime.toISOString(), timeZone: meeting.timezone || 'Asia/Kolkata' },
      attendees: [{ email: internEmail }, { email: mentorEmail }],
      conferenceData: meeting.meetingLink
        ? undefined
        : {
            createRequest: {
              requestId: `meet-${meeting._id}`,
              conferenceSolutionKey: { type: 'hangoutsMeet' },
            },
          },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 30 },
        ],
      },
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
      conferenceDataVersion: 1,
      sendUpdates: 'all',
    });

    return {
      eventId: response.data.id,
      htmlLink: response.data.htmlLink,
      meetLink: response.data.conferenceData?.entryPoints?.[0]?.uri,
      isMock: false,
    };
  } catch (err) {
    console.error('[CALENDAR ERROR] createMeetingEvent:', err.message);
    return { eventId: null, htmlLink: null, error: err.message, isMock: false };
  }
};

/**
 * Delete a calendar event (when meeting is cancelled).
 */
exports.deleteMeetingEvent = async (eventId) => {
  if (process.env.MOCK_CALENDAR === 'true' || !eventId || eventId.startsWith('mock-')) {
    console.log(`[CALENDAR MOCK] Would delete event ${eventId}`);
    return { deleted: true, isMock: true };
  }
  try {
    const calendar = getCalendar();
    await calendar.events.delete({ calendarId: 'primary', eventId, sendUpdates: 'all' });
    return { deleted: true, isMock: false };
  } catch (err) {
    console.error('[CALENDAR ERROR] deleteMeetingEvent:', err.message);
    return { deleted: false, error: err.message };
  }
};
