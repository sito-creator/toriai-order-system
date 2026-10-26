import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function PATCH(request: Request) {
    const db = await createClient();
    const { data: { user } } = await db.auth.getUser();
    if (!user) return Response.json({error:'ログインが必要です。'},{status:401});
    const {data:profile} = await db.from('profiles').select('company_id,role').eq('id',user.id).single();
    if (!profile?.company_id || !['owner','admin'].includes(profile.role)) return Response.json({error:'会社オーナー・管理者のみ設定できます。'},{status:403});
    const body = await request.json();
    if (typeof body.track_inventory !== 'boolean' || !Number.isSafeInteger(body.stock) || body.stock < 0 || body.stock > 999999) return Response.json({error:'在庫数は0〜999999の整数で入力してください。'},{status:400});
    // 在庫数の上書きは比較更新し、会計と同時操作した際の在庫消失を防止。
    let query = createAdminClient().from('products').update({track_inventory:body.track_inventory,stock:body.stock}).eq('id',body.id).eq('company_id',profile.company_id);
    query = body.previous_stock === null ? query.is('stock',null) : query.eq('stock',body.previous_stock);
    const {data,error} = await query.select('id,stock,track_inventory').single();
    if (error) return Response.json({error:'在庫が更新されました。再読み込みして設定し直してください。'},{status:409});
    return Response.json({product:data});
}
