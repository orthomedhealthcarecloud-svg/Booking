import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';

export const runtime = 'nodejs';

let _client: Razorpay | null = null;
function client() {
  if (_client) return _client;
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) throw new Error('Razorpay keys missing');
  _client = new Razorpay({ key_id, key_secret });
  return _client;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      amountInPaise: number;
      doctorId: string;
      type: 'video' | 'text';
      startMillis: number;
      endMillis: number;
    };
    if (!body.amountInPaise || body.amountInPaise < 100) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }
    const order = await client().orders.create({
      amount: body.amountInPaise,
      currency: 'INR',
      receipt: `medi_${body.doctorId}_${body.startMillis}`,
      notes: {
        doctorId: body.doctorId,
        type: body.type,
        startMillis: String(body.startMillis),
        endMillis: String(body.endMillis),
      },
    });
    return NextResponse.json({ id: order.id, amount: order.amount, currency: order.currency });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Razorpay error' },
      { status: 500 },
    );
  }
}
