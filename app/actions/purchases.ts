'use server';
import { PURCHASE_STATUSES } from '@/utils/purchase-status';
import { getCurrentCompanyId } from '@/utils/auth';


import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updatePurchaseStatus(purchaseId: string, newStatus: string) {
    if (!PURCHASE_STATUSES.includes(newStatus as typeof PURCHASE_STATUSES[number])) throw new Error('不正なステータスです');
    const companyId = await getCurrentCompanyId();
    const supabase = await createClient();

    const { error } = await supabase
        .from('purchases')
        .update({ status: newStatus })
        .eq('id', purchaseId).eq('company_id', companyId);

    if (error) {
        throw new Error('ステータス更新失敗: ' + error.message);
    }

    revalidatePath('/purchases');
    revalidatePath(`/purchases/${purchaseId}`);
    revalidatePath('/dashboard');
    revalidatePath('/journal');
}
