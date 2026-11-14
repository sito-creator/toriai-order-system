import {PURCHASE_STATUSES} from '@/utils/purchase-status';
import {createClient} from '@/utils/supabase/server';
import {getCurrentCompanyId} from '@/utils/auth';
import {revalidatePath} from 'next/cache';
export async function changeDocumentStatus(kind:'invoice'|'quote'|'order'|'purchase',id:string,status:unknown) {
    const allowed:readonly string[]=kind==='invoice'?['下書き','発行済','送付済','入金済','期日超過']:kind==='quote'?['下書き','送付済','承認済','失注']:kind==='order'?['確認待ち','新規受注','受注確定','出荷準備中','納品済','キャンセル']:PURCHASE_STATUSES;
    if(typeof status!=='string'||!allowed.includes(status))return {error:'無効なステータスです。',code:400};
    let companyId:string;
    try{companyId=await getCurrentCompanyId();}catch{return {error:'ログインと所属会社をご確認ください。',code:401};}
    const table={invoice:'invoices',quote:'quotes',order:'orders',purchase:'purchases'}[kind];
    try{
        const db=await createClient();
        let query=db.from(table).update({status}).eq('id',id).eq('company_id',companyId);
        if(kind==='order')query=query.is('pos_sale_id',null);
        const {data,error}=await query.select('id').maybeSingle();
        if(error)return {error:'状態を保存できませんでした。再度お試しください。',code:500};
        if(!data)return {error:'更新対象が見つからないか、更新する権限がありません。',code:404};
        for(const path of [`/${table}`,`/${table}/${id}`,...(kind==='invoice'?['/payments','/journal']:kind==='quote'?[]:['/dashboard','/journal'])])revalidatePath(path);
        return {success:true,status,code:200};
    }catch{return {error:'状態を保存できませんでした。再度お試しください。',code:500};}
}
