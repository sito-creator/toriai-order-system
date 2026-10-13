import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'ログインが必要です。' }, { status: 401 });
    const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();
    if (!profile?.company_id) return NextResponse.json({ error: '会社情報を取得できません。' }, { status: 403 });

    const { data, error } = await supabase
        .from('company_payment_integrations')
        .select('provider_account_id, account_name, account_email, livemode, status, connected_at')
        .eq('company_id', profile.company_id)
        .eq('provider', 'stripe')
        .maybeSingle();
    if (error) return NextResponse.json({ error: '決済連携テーブルが未作成です。' }, { status: 503 });
    return NextResponse.json({ integration: data?.status === 'connected' ? data : null });
}
