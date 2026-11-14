import SaveForm from '@/app/components/save-form';
import { createInvoice } from '@/app/actions/save-documents';
import { inheritedLines } from '@/utils/document-lines';
import { notFound } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getCurrentCompanyId } from '@/utils/auth';
import { FileText, Save, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import OrderLinesForm from '../../orders/new/order-lines-form';

export default async function NewInvoicePage({ searchParams }: { searchParams: Promise<{ quoteId?: string, orderId?: string }> }) {
    const resolvedSearchParams = await searchParams;
    const supabase = await createClient();
    const companyId = await getCurrentCompanyId();
    const { data: customers } = await supabase.from('customers').select('id, company_name').eq('company_id', companyId);
    
    const { data: products } = await supabase.from('products').select('*').eq('company_id', companyId).order('product_name');
    
    let sourceData: any = null;
    let initialLines: any[] = [];
    let sourceType: 'quote' | 'order' | null = null;
    let taxNotice = '';
    const today = new Date().toISOString().split('T')[0];
    const sourceId = resolvedSearchParams.quoteId || resolvedSearchParams.orderId;
    if (sourceId) {
        sourceType = resolvedSearchParams.quoteId ? 'quote' : 'order';
        const table = sourceType === 'quote' ? 'quotes' : 'orders';
        const {data:record,error} = await supabase.from(table).select('*').eq('id',sourceId).eq('company_id',companyId).maybeSingle();
        if(error || !record) notFound();
        sourceData=record;
        const {data:lines,error:lineError} = await supabase.from(sourceType==='quote'?'quote_lines':'order_lines').select('*').eq(sourceType==='quote'?'quote_id':'order_id',record.id).eq('company_id',companyId).order('line_no');
        if(lineError) throw new Error('元の明細を取得できませんでした。');
        const inherited=inheritedLines(lines||[],products||[],sourceType,Number(record.total_amount),today);
        initialLines=inherited.lines;
        if(inherited.legacyInferred)taxNotice='旧形式の見積の税率を保存済み合計額から復元しました。税率と金額をご確認ください。';
        if(inherited.needsTaxReview)taxNotice='元の見積に税率情報がありません。各明細の税率を確認・選択してから保存してください。';
    }
    const activeProducts=(products||[]).filter(product=>product.is_active!==false || initialLines.some(line=>line.product_id===product.id));

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/invoices" className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                    <ArrowLeft size={20} />
                </Link>
                <h1 className="text-2xl font-bold text-slate-900">新規請求書作成</h1>
            </div>

            <SaveForm action={createInvoice} successPath="/invoices" className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 flex flex-col">
                {taxNotice && <p role="status" className="p-3 bg-amber-50 text-amber-800 rounded-lg">{taxNotice}</p>}
                {sourceData && (
                    <>
                        <input type="hidden" name="source_id" value={sourceData.id} />
                        <input type="hidden" name="source_type" value={sourceType || ''} />
                    </>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">顧客</label>
                        <select name="customer_id" required defaultValue={sourceData?.customer_id || ''} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl py-2.5 px-3 focus:bg-white focus:border-indigo-500 focus:ring-2 outline-none">
                            <option value="">選択してください</option>
                            {customers?.map(c => (
                                <option key={c.id} value={c.id}>{c.company_name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">請求日（取引年月日）</label>
                        <input type="date" name="issue_date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl py-2.5 px-3 focus:bg-white focus:border-indigo-500 focus:ring-2 outline-none" />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">支払期日</label>
                        <input type="date" name="due_date" required className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl py-2.5 px-3 focus:bg-white focus:border-indigo-500 focus:ring-2 outline-none" />
                    </div>
                </div>

                <OrderLinesForm products={activeProducts} initialLines={initialLines} title="請求明細" showDeliveryDate />

                <div className="pt-4 flex justify-end">
                    <button type="submit" className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-medium transition-colors shadow-sm shadow-indigo-200">
                        <Save size={18} />
                        保存して一覧へ
                    </button>
                </div>
            </SaveForm>
        </div>
    );
}
