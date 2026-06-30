import 'server-only';
import { google } from 'googleapis';
import { oauthClient } from './oauth';

export type CreatedCalendarEvent = {
  eventId: string;
  meetUrl: string | null;
  htmlLink: string | null;
};

export async function createConsultationEvent(args: {
  refreshToken: string;
  calendarId?: string;
  summary: string;
  description: string;
  startMillis: number;
  endMillis: number;
  timezone: string;
  patientEmail?: string;
  location?: string;
}): Promise<CreatedCalendarEvent> {
  const auth = oauthClient();
  auth.setCredentials({ refresh_token: args.refreshToken });

  const calendar = google.calendar({ version: 'v3', auth });

  // Walk-in (in-clinic) appointment — a calendar event + email invite, no video conference.
  const res = await calendar.events.insert({
    calendarId: args.calendarId || 'primary',
    sendUpdates: 'all',
    requestBody: {
      summary: args.summary,
      description: args.description,
      location: args.location,
      start: { dateTime: new Date(args.startMillis).toISOString(), timeZone: args.timezone },
      end: { dateTime: new Date(args.endMillis).toISOString(), timeZone: args.timezone },
      attendees: args.patientEmail ? [{ email: args.patientEmail }] : undefined,
      reminders: { useDefault: true },
    },
  });

  return {
    eventId: res.data.id ?? '',
    meetUrl: null,
    htmlLink: res.data.htmlLink ?? null,
  };
}
