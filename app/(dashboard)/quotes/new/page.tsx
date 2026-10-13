import { createClient } from '@/utils/supabase/server';
import { getCurrentCompanyId } from '@/utils/auth';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { FileText, Save, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import OrderLinesForm from '../../orders/new/order-lines-form';

export default async function NewQuotePage() {
    const supabase = await createClient();
    const companyId = await getCurrentCompanyId();
    const { data: customers } = await supabase.from('customers').select('id, company_name').eq('company_id', companyId);
    const { data: products } = await supabase.from('products').select('*').eq('company_id', companyId).order('product_name');
    const activeProducts = products?.filter(p => p.is_active !== false) || [];

    async function createQuote(formData: FormData) {
        'use server';
        const supabase = await createClient();
        const companyId = await getCurrentCompanyId();
        const quote_number = `QUO-2024-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
        const linesJson = formData.get('lines') as string;
        const linesData = linesJson ? JSON.parse(linesJson) : [];
        
        let subtotal = 0;
        let tax_amount = 0;
        
        if (linesData && linesData.length > 0) {
            subtotal = linesData.reduce((sum: number, l: any) => sum + (Number(l.amount) || 0), 0);
            tax_amount = linesData.reduce((sum: number, l: any) => sum + (Number(l.tax_amount) || 0), 0);
        } else {
            // 互換性のため残す
            subtotal = Number(formData.get('total_amount') || 0);
            tax_amount = Math.floor(subtotal * 0.1);
        }

        const { data: newQuote, error } = await supabase.from('quotes').insert({
            company_id: companyId,
            quote_number,
            customer_id: formData.get('customer_id'),
            subject: formData.get('subject'),
            total_amount: subtotal + tax_amount,
            status: '下書き',
            valid_until: formData.get('valid_until')
        }).select().single();

        if (!error && newQuote && linesData && linesData.length > 0) {
            const quoteLines = linesData.map((line: any, i: number) => ({
                company_id: companyId,
                quote_id: newQuote.id,
                line_no: i + 1,
                item_name: line.product_name || `商品ID: ${line.product_id}`,
                quantity: line.quantity,
                unit_price: line.unit_price,
                amount: line.amount
            }));
            await supabase.from('quote_lines').insert(quoteLines);
        }

        if (!error) {
            revalidatePath('/quotes');
            redirect('/quotes');
        }
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/quotes" className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                    <ArrowLeft size={20} />
                </Link>
                <h1 className="text-2xl font-bold text-slate-900">新規見積書作成</h1>
            </div>

            <form action={createQuote} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 flex flex-col">
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
            </form>
        </div>
    );
}
