import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const { status } = await request.json();
    const supabase = await createClient();

    const validStatuses = ['下書き', '送付済', '承認済', '失注'];

    if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: '無効なステータスです' }, { status: 400 });
    }

    const { error } = await supabase
        .from('quotes')
        .update({ status })
        .eq('id', id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, status });
}
