import SaveForm from '@/app/components/save-form';
import { createQuote } from '@/app/actions/save-documents';
import { createClient } from '@/utils/supabase/server';
import { getCurrentCompanyId } from '@/utils/auth';
import { FileText, Save, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import OrderLinesForm from '../../orders/new/order-lines-form';

export default async function NewQuotePage() {
    const supabase = await createClient();
    const companyId = await getCurrentCompanyId();
    const { data: customers } = await supabase.from('customers').select('id, company_name').eq('company_id', companyId);
    const { data: products } = await supabase.from('products').select('*').eq('company_id', companyId).order('product_name');
    const activeProducts = products?.filter(p => p.is_active !== false) || [];

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/quotes" className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                    <ArrowLeft size={20} />
                </Link>
                <h1 className="text-2xl font-bold text-slate-900">新規見積書作成</h1>
            </div>

            <SaveForm action={createQuote} successPath="/quotes" className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 flex flex-col">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">顧客</label>
                        <select name="customer_id" required className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl py-2.5 px-3 focus:bg-white focus:border-indigo-500 focus:ring-2 outline-none">
                            <option value="">選択してください</option>
                            {customers?.map(c => (
                                <option key={c.id} value={c.id}>{c.company_name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">有効期限</label>
                        <input type="date" name="valid_until" required className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl py-2.5 px-3 focus:bg-white focus:border-indigo-500 focus:ring-2 outline-none" />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-medium text-slate-700">件名</label>
                        <input type="text" name="subject" required className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl py-2.5 px-3 focus:bg-white focus:border-indigo-500 focus:ring-2 outline-none" />
                    </div>
                </div>

                <OrderLinesForm products={activeProducts} title="見積明細" />

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
