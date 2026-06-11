import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { google } from 'googleapis';
import { adminDb } from '@/lib/firebase/admin';
import { oauthClient } from '@/lib/google/oauth';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  if (error) {
    return new NextResponse(`OAuth error: ${error}`, { status: 400 });
  }
  if (!code || !state) {
    return new NextResponse('Missing code/state', { status: 400 });
  }
  let parsed: { doctorId: string; uid: string };
  try {
    parsed = JSON.parse(Buffer.from(state, 'base64url').toString('utf-8'));
  } catch {
    return new NextResponse('Bad state', { status: 400 });
  }

  const client = oauthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) {
    return new NextResponse(
      'No refresh token returned. Revoke the app at https://myaccount.google.com/permissions and try again.',
      { status: 400 },
    );
  }
  client.setCredentials(tokens);

  // Fetch the connected account email for display.
  let connectedEmail = '';
  try {
    const oauth2 = google.oauth2({ version: 'v2', auth: client });
    const me = await oauth2.userinfo.get();
    connectedEmail = me.data.email ?? '';
  } catch {
    /* non-fatal */
  }

  await adminDb()
    .collection('doctors')
    .doc(parsed.doctorId)
    .set(
      {
        googleCalendar: {
          refreshToken: tokens.refresh_token,
          calendarId: 'primary',
          connectedEmail,
          connectedAt: FieldValue.serverTimestamp(),
        },
      },
      { merge: true },
    );

  await adminDb().collection('audit_logs').add({
    actorId: parsed.uid,
    actorRole: 'admin',
    action: 'CONNECT_GOOGLE_CALENDAR',
    targetType: 'doctor',
    targetId: parsed.doctorId,
    meta: { connectedEmail },
    createdAt: FieldValue.serverTimestamp(),
  });

  const dest = `/${parsed.doctorId}/admin/account?google=connected`;
  return NextResponse.redirect(new URL(dest, req.url));
}
