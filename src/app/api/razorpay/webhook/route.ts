import { NextResponse } from 'next/server';
import { createHmac } from 'node:crypto';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const signature = req.headers.get('x-razorpay-signature') ?? '';
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const raw = await req.text();
  if (!secret) return NextResponse.json({ ok: false, reason: 'no secret' }, { status: 500 });
  const expected = createHmac('sha256', secret).update(raw).digest('hex');
  if (expected !== signature) {
    return NextResponse.json({ ok: false, reason: 'bad signature' }, { status: 400 });
  }
  // Fallback handler: in the happy path our /verify route already finalises the booking.
  // This webhook exists so we don't miss settlements if the browser closes after payment but
  // before signature verification reaches our server. Future: reconcile by orderId.
  return NextResponse.json({ ok: true });
}
