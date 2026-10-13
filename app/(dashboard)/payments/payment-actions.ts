'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function markInvoiceAsPaid(invoiceId: string) {
    const supabase = await createClient();
    const { error } = await supabase
        .from('invoices')
        .update({ status: '入金済' })
        .eq('id', invoiceId);
    if (error) throw new Error('入金消込に失敗: ' + error.message);
    revalidatePath('/payments');
    revalidatePath('/invoices');
}

export async function markInvoiceAsUnpaid(invoiceId: string) {
    const supabase = await createClient();
    const { error } = await supabase
        .from('invoices')
        .update({ status: '発行済' })
        .eq('id', invoiceId);
    if (error) throw new Error('消込取消に失敗: ' + error.message);
    revalidatePath('/payments');
    revalidatePath('/invoices');
}
