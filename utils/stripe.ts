type StripeCheckoutSession = {
    id: string;
    url: string | null;
    expires_at: number;
    payment_status?: string;
    status?: string;
    amount_total?: number;
    currency?: string;
    metadata?: { pos_sale_id?: string };
};

type StripeErrorResponse = {
    error?: { message?: string };
};

function getStripeSecretKey() {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
        throw new Error('Stripeが未設定です。STRIPE_SECRET_KEYを設定してください。');
    }
    return key;
}

export async function createPosCheckout(input: { id: string; amount: number; account: string; origin: string }) {
    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getStripeSecretKey()}`, 'Stripe-Account': input.account, 'Idempotency-Key': `pos-${input.id}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ mode: 'payment', locale: 'ja', success_url: `${input.origin}/pos/payment-result`, cancel_url: `${input.origin}/pos/payment-result?cancelled=1`, 'payment_method_types[0]': 'card', 'metadata[pos_sale_id]': input.id, 'line_items[0][price_data][currency]': 'jpy', 'line_items[0][price_data][unit_amount]': String(input.amount), 'line_items[0][price_data][product_data][name]': `店頭会計 ${input.id.slice(0,8)}`, 'line_items[0][quantity]': '1' }),
        cache: 'no-store',
    });
    const session = await response.json();
    if (!response.ok || !session.url) throw new Error(session.error?.message || '決済URLを発行できません。');
    return session as StripeCheckoutSession;
}

export async function retrievePosCheckout(id: string, account: string) {
    const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${getStripeSecretKey()}`, 'Stripe-Account': account }, cache: 'no-store' });
    if (!response.ok) throw new Error('Stripe決済状態を確認できません。');
    return await response.json() as StripeCheckoutSession;
}

async function stripeRequest<T>(path: string, body: URLSearchParams, stripeAccountId?: string): Promise<T> {
    const headers: Record<string, string> = {
        Authorization: `Bearer ${getStripeSecretKey()}`,
        'Content-Type': 'application/x-www-form-urlencoded',
    };
    if (stripeAccountId) headers['Stripe-Account'] = stripeAccountId;

    const response = await fetch(`https://api.stripe.com/v1${path}`, {
        method: 'POST',
        headers,
        body,
        cache: 'no-store',
    });

    const data = (await response.json()) as T & StripeErrorResponse;
    if (!response.ok) {
        throw new Error(data.error?.message || 'Stripeとの通信に失敗しました。');
    }
    return data;
}

export async function createInvoiceCheckoutSession(input: {
    invoiceId: string;
    invoiceNumber: string;
    customerName: string;
    customerEmail?: string | null;
    amount: number;
    successUrl: string;
    cancelUrl: string;
    stripeAccountId: string;
}) {
    const expiresAt = Math.floor(Date.now() / 1000) + 24 * 60 * 60;
    const body = new URLSearchParams({
        mode: 'payment',
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        client_reference_id: input.invoiceId,
        locale: 'ja',
        expires_at: String(expiresAt),
        'payment_method_types[0]': 'card',
        'metadata[invoice_id]': input.invoiceId,
        'metadata[invoice_number]': input.invoiceNumber,
        'payment_intent_data[metadata][invoice_id]': input.invoiceId,
        'line_items[0][price_data][currency]': 'jpy',
        'line_items[0][price_data][unit_amount]': String(input.amount),
        'line_items[0][price_data][product_data][name]': `請求書 ${input.invoiceNumber}`,
        'line_items[0][price_data][product_data][description]': `${input.customerName} 御中`,
        'line_items[0][quantity]': '1',
    });

    if (input.customerEmail) body.set('customer_email', input.customerEmail);

    const session = await stripeRequest<StripeCheckoutSession>('/checkout/sessions', body, input.stripeAccountId);
    if (!session.url) throw new Error('Stripeから決済URLが返されませんでした。');
    return session;
}

export async function expireCheckoutSession(sessionId: string, stripeAccountId: string) {
    return stripeRequest<StripeCheckoutSession>(
        `/checkout/sessions/${encodeURIComponent(sessionId)}/expire`,
        new URLSearchParams(),
        stripeAccountId,
    );
}
