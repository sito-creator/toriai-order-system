import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

type OAuthResponse = {
    stripe_user_id?: string;
    livemode?: boolean;
    error?: string;
    error_description?: string;
};

type StripeAccount = {
    id: string;
    email?: string | null;
    business_profile?: { name?: string | null } | null;
    settings?: { dashboard?: { display_name?: string | null } } | null;
};

export async function GET(request: NextRequest) {
    const code = request.nextUrl.searchParams.get('code');
    const state = request.nextUrl.searchParams.get('state');
    const savedState = request.cookies.get('stripe_connect_state')?.value;
    const settingsUrl = new URL('/settings?tab=payments', request.url);

    if (!code || !state || !savedState || state !== savedState) {
        settingsUrl.searchParams.set('stripe', 'invalid_state');
        return NextResponse.redirect(settingsUrl);
    }

    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
        settingsUrl.searchParams.set('stripe', 'not_configured');
        return NextResponse.redirect(settingsUrl);
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.redirect(new URL('/login', request.url));
    const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();
    if (!profile?.company_id) {
        settingsUrl.searchParams.set('stripe', 'company_missing');
        return NextResponse.redirect(settingsUrl);
    }

    const tokenResponse = await fetch('https://connect.stripe.com/oauth/token', {
        method: 'POST',
        headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'authorization_code', code }),
        cache: 'no-store',
    });
    const token = (await tokenResponse.json()) as OAuthResponse;
    if (!tokenResponse.ok || !token.stripe_user_id) {
        settingsUrl.searchParams.set('stripe', token.error || 'oauth_failed');
        return NextResponse.redirect(settingsUrl);
    }

    const accountResponse = await fetch(`https://api.stripe.com/v1/accounts/${encodeURIComponent(token.stripe_user_id)}`, {
        headers: { Authorization: `Bearer ${secretKey}` },
        cache: 'no-store',
    });
    const account = accountResponse.ok ? await accountResponse.json() as StripeAccount : null;
    const accountName = account?.business_profile?.name || account?.settings?.dashboard?.display_name || null;

    const { error } = await supabase.from('company_payment_integrations').upsert({
        company_id: profile.company_id,
        provider: 'stripe',
        provider_account_id: token.stripe_user_id,
        account_name: accountName,
        account_email: account?.email || null,
        livemode: Boolean(token.livemode),
        status: 'connected',
        connected_by: user.id,
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    }, { onConflict: 'company_id,provider' });

    settingsUrl.searchParams.set('stripe', error ? 'save_failed' : 'connected');
    const response = NextResponse.redirect(settingsUrl);
    response.cookies.delete('stripe_connect_state');
    return response;
}
