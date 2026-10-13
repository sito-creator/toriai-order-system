type StripeCheckoutSession = {
    id: string;
    url: string | null;
    expires_at: number;
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
