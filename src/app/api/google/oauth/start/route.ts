import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { getDoctor } from '@/lib/doctors';
import { CALENDAR_SCOPES, oauthClient } from '@/lib/google/oauth';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const doctorSlug = searchParams.get('doctor');
  const idToken = searchParams.get('token');
  if (!doctorSlug || !idToken) {
    return NextResponse.json({ error: 'missing params' }, { status: 400 });
  }
  const doctor = getDoctor(doctorSlug);
  if (!doctor) return NextResponse.json({ error: 'unknown doctor' }, { status: 404 });

  // Verify the caller is the admin for this doctor.
  let decoded;
  try {
    decoded = await adminAuth().verifyIdToken(idToken);
  } catch {
    return NextResponse.json({ error: 'invalid token' }, { status: 401 });
  }
  if (decoded.doctorId !== doctor.id && decoded.admin !== true) {
    return NextResponse.json({ error: 'not authorized' }, { status: 403 });
  }

  // Pack the doctorId into the OAuth state so the callback can route the token.
  const state = Buffer.from(JSON.stringify({ doctorId: doctor.id, uid: decoded.uid })).toString(
    'base64url',
  );

  const url = oauthClient().generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: CALENDAR_SCOPES,
    state,
  });

  return NextResponse.redirect(url);
}
