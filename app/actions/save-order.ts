'use server';
import { createClient } from '@/utils/supabase/server';
import { getCurrentCompanyId } from '@/utils/auth';
import { revalidatePath } from 'next/cache';

export async function saveOrder(id: string | null, form: FormData): Promise<{id?: string; error?: string}> {
    try {
        await getCurrentCompanyId();
        const lines = JSON.parse(String(form.get('lines') || '[]'));
        if (!Array.isArray(lines) || !lines.length) return {error:'明細を1行以上入力してください。'};
        for (const line of lines) {
            if (!Number.isFinite(Number(line.quantity)) || Number(line.quantity) <= 0 ||
                !Number.isFinite(Number(line.unit_price)) || Number(line.unit_price) < 0 ||
                ![0,8,10].includes(Number(line.tax_rate))) return {error:'数量・単価・税率を確認してください。'};
        }
        const supabase = await createClient();
        const {data, error} = await supabase.rpc('save_order_with_lines', {
            p_order_id: id,
            p_header: {order_number:form.get('order_number'), customer_id:form.get('customer_id'), order_date:form.get('order_date'), delivery_date:form.get('delivery_date')},
            p_lines: lines,
        });
        if (error || !data) {
            console.error('Order save failed', {code:error?.code});
            return {error:'受注を保存できませんでした。入力内容は保持されています。再度お試しください。'};
        }
        for (const path of ['/orders','/dashboard',`/orders/${data}`]) revalidatePath(path);
        return {id:data};
    } catch {
        return {error:'受注を保存できませんでした。ログイン状態と入力内容をご確認ください。'};
    }
}
