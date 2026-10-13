import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const { status } = await request.json();
    const supabase = await createClient();

    const validStatuses = ['下書き', '発行済', '送付済', '入金済', '期日超過'];

    if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: '無効なステータスです' }, { status: 400 });
    }

    const { error } = await supabase
        .from('invoices')
        .update({ status })
        .eq('id', id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 請求書管理と入金管理の両ページを再検証して連動させる
    revalidatePath('/invoices');
    revalidatePath('/payments');

    return NextResponse.json({ success: true, status });
}
