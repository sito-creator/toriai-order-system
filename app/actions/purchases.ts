'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updatePurchaseStatus(purchaseId: string, newStatus: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('purchases')
        .update({ status: newStatus })
        .eq('id', purchaseId);

    if (error) {
        throw new Error('ステータス更新失敗: ' + error.message);
    }

    revalidatePath('/purchases');
}
