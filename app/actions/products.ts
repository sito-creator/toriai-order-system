'use server';

import { createClient } from '@/utils/supabase/server';
import { getCurrentCompanyId } from '@/utils/auth';
import { revalidatePath } from 'next/cache';
import { productInput, productSaveError } from '@/utils/product-input';

async function saveProduct(form: FormData, id?: string): Promise<{ id?: string; error?: string }> {
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
        const { company_id, ...fields } = payload;
        // Keep the legacy price in sync: POS falls back to price when standard_price is zero.
        const query = id
            ? supabase.from('products').update({ ...fields, price: fields.standard_price }).eq('id', id).eq('company_id', company_id)
            : supabase.from('products').insert(payload);
        const { data, error } = await query.select('id').maybeSingle();
        if (error) {
            console.error('Product save failed', { code: error.code, operation: id ? 'update' : 'insert' });
            return { error: productSaveError(error.code) };
        }
        if (!data?.id) return { error: id ? '商品が見つからないか、編集権限がありません。商品一覧をご確認ください。' : productSaveError() };
        revalidatePath('/products');
        revalidatePath('/pos');
        revalidatePath('/dashboard');
        if (id) revalidatePath(`/products/${id}`);
        return { id: data.id };
    } catch {
        return { error: productSaveError() };
    }
}

export async function addProduct(form: FormData) {
    return saveProduct(form);
}

export async function updateProduct(id: string, form: FormData) {
    if (typeof id !== 'string' || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) {
        return { error: '商品を特定できません。商品一覧から開き直してください。' };
    }
    return saveProduct(form, id);
}
