'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updatePaymentMatch(paymentId: string, invoiceId: string) {
    const supabase = await createClient();
    
    // 1. Get the target invoice
    const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .single();
        
    if (invoiceError || !invoice) {
        throw new Error('対象の請求書が見つかりません');
    }
    
    // 2. Fetch the payment to double check
    const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .single();
        
    if (paymentError || !payment) {
        throw new Error('対象の入金が見つかりません');
    }

    // 3. Update the payment record to link it and update status
    let matchStatus = '消込済';
    if (payment.amount < invoice.total_amount) {
        matchStatus = '一部消込';
    }
    
    const { error: updateError } = await supabase
        .from('payments')
        .update({
            invoice_id: invoiceId,
            customer_id: invoice.customer_id,
            match_status: matchStatus,
        })
        .eq('id', paymentId);
        
    if (updateError) {
        throw new Error('消込処理に失敗しました: ' + updateError.message);
    }
    
    // 4. Update the invoice status as well
    let invoiceStatus = '入金済';
    if (matchStatus === '一部消込') {
        invoiceStatus = '一部入金';
    }
    
    await supabase
        .from('invoices')
        .update({ status: invoiceStatus })
        .eq('id', invoiceId);
    
    revalidatePath('/payments');
}
