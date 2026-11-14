'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { getCurrentCompanyId } from '@/utils/auth';
import { bankSelectionError } from '@/utils/bank-matching';
import { isPostedInvoice } from '@/utils/accounting-status';

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

// Validate the whole selection before writing; compare status again at update time.
export async function reconcileBankRows(rows:{invoiceId:string;amount:number}[]) {
    if(!Array.isArray(rows)||!rows.length||rows.length>1000||rows.some(row=>!row||typeof row.invoiceId!=='string'||!row.invoiceId))throw new Error('消込対象をご確認ください。');
    const invalid=bankSelectionError(rows);
    if(invalid)throw new Error(invalid);
    const companyId=await getCurrentCompanyId();
    const db=await createClient();
    const {data,error}=await db.from('invoices').select('id,total_amount,status').eq('company_id',companyId).in('id',rows.map(row=>row.invoiceId));
    if(error||!data||data.length!==rows.length||data.some(inv=>!isPostedInvoice(inv)||inv.status==='入金済')||bankSelectionError(rows,data))throw new Error('請求書の金額・状態が変わったか、対象を確認できません。再読み込みして選択し直してください。');
    let success=0,failed=0;
    for(const row of rows){
        const original=data.find(inv=>inv.id===row.invoiceId)!;
        const result=await db.from('invoices').update({status:'入金済'}).eq('id',row.invoiceId).eq('company_id',companyId).eq('status',original.status).eq('total_amount',row.amount).select('id').maybeSingle();
        if(result.error||!result.data)failed++;else success++;
    }
    for(const path of ['/payments','/invoices','/journal'])revalidatePath(path);
    return {success,failed};
}
