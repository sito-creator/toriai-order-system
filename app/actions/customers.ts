'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function dedupeCustomersAction() {
    const supabase = await createClient();

    // まずRPC関数で実行（SECURITY DEFINERでRLS・外部キー制約を適切に処理）
    const { data: rpcResult, error: rpcError } = await supabase
        .rpc('dedupe_customers_simple');

    if (!rpcError) {
        revalidatePath('/customers');
        return { success: true, count: typeof rpcResult === 'number' ? rpcResult : 0 };
    }

    // RPC関数がない場合: アプリ側でフォールバック処理
    const { data: customers, error: fetchError } = await supabase
        .from('customers')
        .select('id, company_name, created_at');

    if (fetchError || !customers) {
        return { error: 'データ取得失敗: ' + (fetchError?.message || '不明'), count: 0, success: false };
    }

    // 重複グループを特定
    const groups = new Map<string, { id: string; company_name: string; created_at: string }[]>();
    for (const c of customers) {
        const key = (c.company_name || '').trim();
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(c);
    }

    let deleted = 0;
    const errors: string[] = [];

    for (const [, list] of groups.entries()) {
        if (list.length <= 1) continue;

        // 最古を残す
        list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        const keeper = list[0];
        const dupes = list.slice(1);
        const dupeIds = dupes.map((d) => d.id);

        // 関連データを keeper に付け替え（外部キー制約対策）
        for (const table of ['orders', 'invoices', 'quotes'] as const) {
            await supabase
                .from(table)
                .update({ customer_id: keeper.id })
                .in('customer_id', dupeIds);
        }

        // 重複を削除
        const { error: deleteError } = await supabase
            .from('customers')
            .delete()
            .in('id', dupeIds);

        if (deleteError) {
            errors.push(`${keeper.company_name}: ${deleteError.message}`);
        } else {
            deleted += dupeIds.length;
        }
    }

    if (errors.length > 0) {
        return {
            error: `一部削除失敗: ${errors.join(' / ')}\n\n→ supabase_dedupe_function.sql をSupabaseのSQL Editorで実行すると確実に削除できます`,
            count: deleted,
            success: deleted > 0,
        };
    }

    revalidatePath('/customers');
    return { success: true, count: deleted };
}
