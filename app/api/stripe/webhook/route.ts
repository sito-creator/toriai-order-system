import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

function verifyStripeSignature(payload: string, signatureHeader: string, secret: string) {
    const parts = signatureHeader.split(',').map((part) => part.split('='));
    const timestamp = parts.find(([key]) => key === 't')?.[1];
    const signatures = parts.filter(([key]) => key === 'v1').map(([, value]) => value);
    if (!timestamp || signatures.length === 0) return false;

    const timestampSeconds = Number(timestamp);
    if (!Number.isFinite(timestampSeconds) || Math.abs(Date.now() / 1000 - timestampSeconds) > 300) return false;

    const expected = createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex');
    const expectedBuffer = Buffer.from(expected, 'hex');
    return signatures.some((signature) => {
        const received = Buffer.from(signature, 'hex');
        return received.length === expectedBuffer.length && timingSafeEqual(received, expectedBuffer);
    });
}

export async function POST(request: NextRequest) {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    const signature = request.headers.get('stripe-signature');
    if (!secret || !signature) return NextResponse.json({ error: 'Webhook設定がありません。' }, { status: 400 });

    const payload = await request.text();
    if (!verifyStripeSignature(payload, signature, secret)) {
        return NextResponse.json({ error: '署名を確認できません。' }, { status: 400 });
    }

    const event = JSON.parse(payload) as {
        account?: string;
        type?: string;
        data?: { object?: { id?: string; metadata?: { invoice_id?: string } } };
    };
    if (event.type !== 'checkout.session.completed') return NextResponse.json({ received: true });

    const session = event.data?.object;
    const invoiceId = session?.metadata?.invoice_id;
    if (!session?.id || !invoiceId) return NextResponse.json({ received: true });

    const supabase = createAdminClient();
    const paidAt = new Date().toISOString();
    await supabase
        .from('invoice_payment_links')
        .update({ status: 'paid', paid_at: paidAt, updated_at: paidAt })
        .eq('provider_payment_id', session.id)
        .eq('provider_account_id', event.account || '');
    await supabase.from('invoices').update({ status: '入金済' }).eq('id', invoiceId);

    return NextResponse.json({ received: true });
}
