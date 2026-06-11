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
}): Promise<CreatedCalendarEvent> {
  const auth = oauthClient();
  auth.setCredentials({ refresh_token: args.refreshToken });

  const calendar = google.calendar({ version: 'v3', auth });
  const requestId = `medi-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const res = await calendar.events.insert({
    calendarId: args.calendarId || 'primary',
    conferenceDataVersion: 1,
    sendUpdates: 'all',
    requestBody: {
      summary: args.summary,
      description: args.description,
      start: { dateTime: new Date(args.startMillis).toISOString(), timeZone: args.timezone },
      end: { dateTime: new Date(args.endMillis).toISOString(), timeZone: args.timezone },
      attendees: args.patientEmail ? [{ email: args.patientEmail }] : undefined,
      conferenceData: {
        createRequest: {
          requestId,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
      reminders: { useDefault: true },
    },
  });

  const meet =
    res.data.conferenceData?.entryPoints?.find((e) => e.entryPointType === 'video')?.uri ??
    res.data.hangoutLink ??
    null;

  return {
    eventId: res.data.id ?? '',
    meetUrl: meet,
    htmlLink: res.data.htmlLink ?? null,
  };
}
