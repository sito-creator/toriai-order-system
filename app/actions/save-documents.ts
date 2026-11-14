'use server';
import {createClient} from '@/utils/supabase/server';
import {getCurrentCompanyId} from '@/utils/auth';
import {documentNumber} from '@/utils/document-number';
import {revalidatePath} from 'next/cache';
async function save(kind:'quote'|'invoice'|'purchase',form:FormData):Promise<{id?:string;error?:string}> {
    try {
        await getCurrentCompanyId();
        const lines=JSON.parse(String(form.get('lines')||'[]'));
        if(!Array.isArray(lines)||!lines.length)return {error:'明細を1行以上入力してください。'};
        for(const line of lines) {
            if(!Number.isFinite(Number(line.quantity))||Number(line.quantity)<=0||!Number.isFinite(Number(line.unit_price))||Number(line.unit_price)<0||![0,8,10].includes(Number(line.tax_rate)))return {error:'明細の数量・単価・税率を確認してください。未確認の税率は選択し直してください。'};
            if(!String(line.product_name||'').trim())return {error:'明細の商品を選択してください。'};
        }
        if(kind!=='purchase' && !form.get('customer_id')) return {error:'顧客を選択してください。'};
        if(kind==='invoice' && (!form.get('issue_date')||!form.get('due_date'))) return {error:'請求日と支払期日を入力してください。'};
        const supabase=await createClient();
        const header=Object.fromEntries(['customer_id','supplier_id','purchase_number','purchase_date','expected_delivery_date','subject','valid_until','issue_date','due_date'].map(key=>[key,form.get(key)||null]));
        if(kind==='quote')header.quote_number=documentNumber('QUO');
        if(kind==='invoice')header.invoice_number=documentNumber('INV');
        const result=kind==='purchase'
            ? await supabase.rpc('create_purchase_with_lines',{p_header:header,p_lines:lines})
            : await supabase.rpc('create_document_with_lines',{p_kind:kind,p_header:header,p_lines:lines});
        if(result.error||!result.data){console.error('Document save failed',{kind,code:result.error?.code});return {error:'保存できませんでした。入力内容は保持されています。再度お試しください。'};}
        const path=kind==='quote'?'/quotes':kind==='invoice'?'/invoices':'/purchases';
        for(const route of [path,'/dashboard','/journal','/payments'])revalidatePath(route);
        return {id:result.data};
    }catch{return {error:'保存できませんでした。ログイン状態と入力内容をご確認ください。'};}
}
export async function createQuote(form:FormData){return save('quote',form);}
export async function createInvoice(form:FormData){return save('invoice',form);}
export async function createPurchase(form:FormData){return save('purchase',form);}
export async function createQuoteForOrder(form:FormData):Promise<{id?:string;error?:string}> {
    try {
        const companyId=await getCurrentCompanyId();
        const supabase=await createClient();
        const {data:order,error}=await supabase.from('orders').select('*, order_lines(*,products(product_name))').eq('id',String(form.get('order_id'))).eq('company_id',companyId).maybeSingle();
        if(error||!order||order.pos_sale_id)return {error:'対象の受注を確認できません。'};
        const quoteForm=new FormData();
        quoteForm.set('customer_id',order.customer_id||'');
        quoteForm.set('subject',`${order.order_number} のお見積り`);
        if(order.delivery_date)quoteForm.set('valid_until',order.delivery_date);
        quoteForm.set('lines',JSON.stringify((order.order_lines||[]).map((line:any)=>({...line,product_name:line.item_name||line.products?.product_name||'名称未設定',tax_rate:line.tax_rate??-1}))));
        return save('quote',quoteForm);
    }catch{return {error:'見積書を保存できませんでした。'};}
}
