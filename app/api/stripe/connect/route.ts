import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

function appOrigin(request: NextRequest) {
    return process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
}

export async function GET(request: NextRequest) {
    const clientId = process.env.STRIPE_CONNECT_CLIENT_ID;
    if (!clientId) return NextResponse.json({ error: 'STRIPE_CONNECT_CLIENT_IDが未設定です。' }, { status: 503 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.redirect(new URL('/login', request.url));

    const { data: profile } = await supabase
        .from('profiles')
        .select('company_id, companies(name)')
        .eq('id', user.id)
        .single();
    if (!profile?.company_id) return NextResponse.json({ error: '会社情報を取得できません。' }, { status: 403 });

    const state = randomUUID();
    const redirectUri = `${appOrigin(request)}/api/stripe/connect/callback`;
    const company = Array.isArray(profile.companies) ? profile.companies[0] : profile.companies;
    const authorizeUrl = new URL('https://connect.stripe.com/oauth/authorize');
    authorizeUrl.searchParams.set('response_type', 'code');
    authorizeUrl.searchParams.set('client_id', clientId);
    authorizeUrl.searchParams.set('scope', 'read_write');
    authorizeUrl.searchParams.set('state', state);
    authorizeUrl.searchParams.set('redirect_uri', redirectUri);
    authorizeUrl.searchParams.set('stripe_user[email]', user.email || '');
    authorizeUrl.searchParams.set('stripe_user[business_name]', company?.name || '');
    authorizeUrl.searchParams.set('stripe_user[country]', 'JP');
    authorizeUrl.searchParams.set('stripe_user[currency]', 'jpy');

    const response = NextResponse.redirect(authorizeUrl);
    response.cookies.set('stripe_connect_state', state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 10 * 60,
        path: '/',
    });
    return response;
}

export async function DELETE() {
    const clientId = process.env.STRIPE_CONNECT_CLIENT_ID;
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!clientId || !secretKey) return NextResponse.json({ error: 'Stripe Connectが未設定です。' }, { status: 503 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'ログインが必要です。' }, { status: 401 });
    const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();
    if (!profile?.company_id) return NextResponse.json({ error: '会社情報を取得できません。' }, { status: 403 });

    const { data: integration } = await supabase
        .from('company_payment_integrations')
        .select('id, provider_account_id')
        .eq('company_id', profile.company_id)
        .eq('provider', 'stripe')
        .eq('status', 'connected')
        .maybeSingle();
    if (!integration) return NextResponse.json({ error: 'Stripeは連携されていません。' }, { status: 404 });

    const body = new URLSearchParams({ client_id: clientId, stripe_user_id: integration.provider_account_id });
    const stripeResponse = await fetch('https://connect.stripe.com/oauth/deauthorize', {
        method: 'POST',
        headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
        cache: 'no-store',
    });
    if (!stripeResponse.ok) {
        const error = await stripeResponse.json();
        return NextResponse.json({ error: error.error_description || 'Stripe連携を解除できませんでした。' }, { status: 502 });
    }

    await supabase
        .from('company_payment_integrations')
        .update({ status: 'disconnected', updated_at: new Date().toISOString() })
        .eq('id', integration.id);
    return NextResponse.json({ success: true });
}
