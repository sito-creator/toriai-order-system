'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function bulkDeleteOrders(ids: string[]) {
    if (!ids.length) return;
    const supabase = await createClient();

    // 明細行を先に削除
    await supabase.from('order_lines').delete().in('order_id', ids);
    const { error } = await supabase.from('orders').delete().in('id', ids);
    if (error) throw new Error('削除に失敗しました: ' + error.message);
    revalidatePath('/orders');
}

export async function bulkDeleteQuotes(ids: string[]) {
    if (!ids.length) return;
    const supabase = await createClient();

    await supabase.from('quote_lines').delete().in('quote_id', ids);
    const { error } = await supabase.from('quotes').delete().in('id', ids);
    if (error) throw new Error('削除に失敗しました: ' + error.message);
    revalidatePath('/quotes');
}

export async function bulkDeleteInvoices(ids: string[]) {
    if (!ids.length) return;
    const supabase = await createClient();

    await supabase.from('invoice_lines').delete().in('invoice_id', ids);
    const { error } = await supabase.from('invoices').delete().in('id', ids);
    if (error) throw new Error('削除に失敗しました: ' + error.message);
    revalidatePath('/invoices');
    revalidatePath('/payments');
}

export async function bulkDeletePurchases(ids: string[]) {
    if (!ids.length) return;
    const supabase = await createClient();

    await supabase.from('purchase_lines').delete().in('purchase_id', ids);
    const { error } = await supabase.from('purchases').delete().in('id', ids);
    if (error) throw new Error('削除に失敗しました: ' + error.message);
    revalidatePath('/purchases');
}

export async function bulkDeletePaymentInvoices(ids: string[]) {
    // 入金管理の場合は invoices を削除する
    if (!ids.length) return;
    const supabase = await createClient();

    await supabase.from('invoice_lines').delete().in('invoice_id', ids);
    const { error } = await supabase.from('invoices').delete().in('id', ids);
    if (error) throw new Error('削除に失敗しました: ' + error.message);
    revalidatePath('/payments');
    revalidatePath('/invoices');
}
