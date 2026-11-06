'use server';

import { createClient } from '@/utils/supabase/server';
import { getCurrentCompanyId } from '@/utils/auth';
import { revalidatePath } from 'next/cache';
import { productInput, productSaveError } from '@/utils/product-input';

export async function addProduct(form: FormData): Promise<{ id?: string; error?: string }> {
    let companyId: string;
    try {
        companyId = await getCurrentCompanyId();
    } catch {
        return { error: 'ログインと所属会社を確認できません。再ログインしてください。' };
    }
    let payload;
    try {
        // company_id is derived from the authenticated user, never from the form.
        payload = productInput(form, companyId);
    } catch (error) {
        return { error: (error as Error).message };
    }
    try {
        const supabase = await createClient();
        const { data, error } = await supabase.from('products').insert(payload).select('id').single();
        if (error || !data?.id) {
            console.error('Product insert failed', { code: error?.code });
            return { error: productSaveError(error?.code) };
        }
        revalidatePath('/products');
        revalidatePath('/pos');
        revalidatePath('/dashboard');
        return { id: data.id };
    } catch {
        return { error: productSaveError() };
    }
}
