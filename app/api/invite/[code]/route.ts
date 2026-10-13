import { NextRequest, NextResponse } from 'next/server';

// 未認証ユーザーでもinvite_codeから会社情報を取得可能にするAPIルート
// Supabase REST APIを直接呼び出してRLSの互換性問題を回避
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ code: string }> }
) {
    const { code } = await params;

    if (!code || code.length < 6) {
        return NextResponse.json({ error: '無効な招待コード' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    try {
        // Supabase REST APIを直接呼び出し（is_activeフィルタを一旦除外してデバッグ）
        const url = `${supabaseUrl}/rest/v1/companies?invite_code=eq.${encodeURIComponent(code)}&select=id,name,invite_code,is_active&limit=1`;
        
        console.log('[invite API] Fetching:', url);
        console.log('[invite API] Key type:', supabaseKey?.substring(0, 15) + '...');
        
        const response = await fetch(url, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            cache: 'no-store',
        });

        const responseText = await response.text();
        console.log('[invite API] Status:', response.status);
        console.log('[invite API] Response:', responseText);

        if (!response.ok) {
            return NextResponse.json({ error: '招待コードの検証に失敗しました', debug: responseText }, { status: 500 });
        }

        const data = JSON.parse(responseText);

        if (!data || data.length === 0) {
            return NextResponse.json({ error: '招待コードが見つかりません', debug: 'empty result' }, { status: 404 });
        }

        return NextResponse.json({ id: data[0].id, name: data[0].name });
    } catch (err) {
        console.error('[invite API] Error:', err);
        return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
    }
}
