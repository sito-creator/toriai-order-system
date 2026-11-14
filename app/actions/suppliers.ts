'use server';
import {createClient} from '@/utils/supabase/server';
import {getCurrentCompanyId} from '@/utils/auth';
import {revalidatePath} from 'next/cache';
export async function createSupplier(form:FormData):Promise<{id?:string;error?:string}> {
    try {
        const companyId=await getCurrentCompanyId();
        const company_name=String(form.get('company_name') || '').trim();
        if(!company_name)return {error:'会社名・屋号を入力してください。'};
        const email=String(form.get('email') || '').trim();
        if(email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return {error:'メールアドレスをご確認ください。'};
        const fields=Object.fromEntries(['department','contact_name','phone','payment_terms'].map(key=>[key,String(form.get(key)||'').trim()||null]));
        const supabase=await createClient();
        const {data,error}=await supabase.from('suppliers').insert({...fields,company_id:companyId,company_name,email:email||null}).select('id').maybeSingle();
        if(error || !data?.id){console.error('Supplier save failed',{code:error?.code});return {error:'仕入先を保存できませんでした。入力内容は保持されています。'};}
        revalidatePath('/suppliers');revalidatePath('/purchases/new');revalidatePath('/supplier-products/new');
        return {id:data.id};
    }catch{return {error:'ログイン状態と入力内容をご確認ください。仕入先は保存できませんでした。'};}
}
export async function createSupplierProduct(form:FormData):Promise<{id?:string;error?:string}> {
    try {
        const companyId=await getCurrentCompanyId();
        const supabase=await createClient();
        const supplierId=String(form.get('supplier_id')||'');
        if(!supplierId)return {error:'仕入先を選択してください。'};
        const {data:supplier,error:supplierError}=await supabase.from('suppliers').select('id').eq('id',supplierId).eq('company_id',companyId).maybeSingle();
        if(supplierError||!supplier)return {error:'仕入先を確認できません。'};
        const productId=String(form.get('product_id')||'');
        let product:{product_name:string;unit?:string|null}|null=null;
        if(productId){
            const result=await supabase.from('products').select('id,product_name,unit').eq('id',productId).eq('company_id',companyId).maybeSingle();
            if(result.error||!result.data)return {error:'紐付け商品を確認できません。'};
            product=result.data;
        }
        const name=String(form.get('supplier_product_name')||'').trim()||product?.product_name||'';
        const price=Number(form.get('purchase_price'));
        const min=Number(form.get('min_order_qty')||1);
        const leadRaw=form.get('lead_time_days');
        const lead=leadRaw==null||leadRaw===''?null:Number(leadRaw);
        if(!name)return {error:'仕入先商品名を入力するか、自社商品を選択してください。'};
        if(form.get('purchase_price')==null||form.get('purchase_price')===''||!Number.isFinite(price)||price<0||!Number.isInteger(min)||min<1||lead!==null&&(!Number.isInteger(lead)||lead<0))return {error:'仕入単価・最小発注数・リードタイムをご確認ください。'};
        const {data,error}=await supabase.from('supplier_products').insert({company_id:companyId,supplier_id:supplierId,product_id:productId||null,product_name:name,supplier_product_name:name,supplier_product_code:String(form.get('supplier_product_code')||'').trim()||null,purchase_price:price,price,min_order_qty:min,lead_time_days:lead,unit:product?.unit||null}).select('id').maybeSingle();
        if(error||!data?.id){console.error('Supplier product save failed',{code:error?.code});return {error:'仕入先商品を保存できませんでした。入力内容は保持されています。'};}
        revalidatePath('/supplier-products');revalidatePath('/purchases/new');
        return {id:data.id};
    }catch{return {error:'ログイン状態と入力内容をご確認ください。仕入先商品は保存できませんでした。'};}
}
