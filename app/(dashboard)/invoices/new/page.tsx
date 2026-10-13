import { createClient } from '@/utils/supabase/server';
import { getCurrentCompanyId } from '@/utils/auth';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { FileText, Save, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import OrderLinesForm from '../../orders/new/order-lines-form';

export default async function NewInvoicePage({ searchParams }: { searchParams: Promise<{ quoteId?: string, orderId?: string }> }) {
    const resolvedSearchParams = await searchParams;
    const supabase = await createClient();
    const companyId = await getCurrentCompanyId();
    const { data: customers } = await supabase.from('customers').select('id, company_name').eq('company_id', companyId);
    
    const { data: products } = await supabase.from('products').select('*').eq('company_id', companyId).order('product_name');
    const activeProducts = products?.filter(p => p.is_active !== false) || [];
    
    // 見積書または受注からの作成の場合、データを取得
    let sourceData: any = null;
    let initialLines: any[] = [];
    let sourceType: 'quote' | 'order' | null = null;

    if (resolvedSearchParams?.quoteId) {
        const { data: quote } = await supabase.from('quotes').select('*').eq('id', resolvedSearchParams.quoteId).single();
        sourceData = quote;
        sourceType = 'quote';
        
        const { data: quoteLines } = await supabase.from('quote_lines').select('*').eq('quote_id', quote.id).order('line_no');
        if (quoteLines) {
            initialLines = quoteLines.map((l: any) => {
                const matchedProduct = activeProducts.find(p => p.product_name === l.item_name);
                return {
                    product_id: matchedProduct?.id || '',
                    product_name: l.item_name,
                    quantity: l.quantity,
                    unit_price: l.unit_price,
                    amount: l.amount,
                    tax_rate: matchedProduct?.tax_rate || 10,
                    tax_amount: matchedProduct ? Math.floor(l.amount * (matchedProduct.tax_rate || 10) / 100) : Math.floor(l.amount * 0.1),
                    delivery_date: l.delivery_date || new Date().toISOString().split('T')[0],
                    unit: l.unit || matchedProduct?.unit || ''
                };
            });
        }
    } else if (resolvedSearchParams?.orderId) {
        const { data: order } = await supabase.from('orders').select('*').eq('id', resolvedSearchParams.orderId).single();
        sourceData = order;
        sourceType = 'order';
        
        const { data: orderLines } = await supabase.from('order_lines').select('*, products(product_name)').eq('order_id', order.id).order('line_no');
        if (orderLines) {
            initialLines = orderLines.map((l: any) => ({
                product_id: l.product_id || '',
                product_name: l.products?.product_name || `商品ID: ${l.product_id}`,
                quantity: l.quantity,
                unit_price: l.unit_price,
                amount: l.amount,
                tax_rate: l.tax_rate || 10,
                tax_amount: l.tax_amount || 0,
                delivery_date: l.delivery_date || new Date().toISOString().split('T')[0],
                unit: l.unit || ''
            }));
        }
    }

    async function createInvoice(formData: FormData) {
        'use server';
        const supabase = await createClient();
        const companyId = await getCurrentCompanyId();
        const invoice_number = `INV-2024-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
        const source_id = formData.get('source_id') as string;
        const source_type = formData.get('source_type') as string;
        const linesJson = formData.get('lines') as string;
        const linesData = linesJson ? JSON.parse(linesJson) : [];
        
        let subtotal = 0;
        let tax_amount = 0;
        
        if (linesData && linesData.length > 0) {
            subtotal = linesData.reduce((sum: number, l: any) => sum + (Number(l.amount) || 0), 0);
            tax_amount = linesData.reduce((sum: number, l: any) => sum + (Number(l.tax_amount) || 0), 0);
        } else {
            // 互換性のため残す
            subtotal = Number(formData.get('subtotal') || 0);
            tax_amount = Math.floor(subtotal * 0.1);
        }

        const { data: newInvoice, error } = await supabase.from('invoices').insert({
            company_id: companyId,
            invoice_number,
            customer_id: formData.get('customer_id'),
            issue_date: formData.get('issue_date'),
            due_date: formData.get('due_date'),
            total_amount: subtotal + tax_amount,
            status: '下書き'
        }).select().single();

        if (error) {
            console.error('Invoice creation error:', error);
            throw new Error(`Failed to create invoice: ${error.message}`);
        }

        if (newInvoice) {
            // 手入力明細がある場合
            if (linesData && linesData.length > 0) {
                const invoiceLines = linesData.map((line: any, i: number) => ({
                    company_id: companyId,
                    invoice_id: newInvoice.id,
                    line_no: i + 1,
                    item_name: line.product_name || `商品ID: ${line.product_id}`,
                    quantity: line.quantity,
                    unit_price: line.unit_price,
                    amount: line.amount,
                    delivery_date: line.delivery_date || null,
                    tax_rate: Number(line.tax_rate) || 0,
                    tax_amount: Number(line.tax_amount) || 0,
                    unit: line.unit || null
                }));
                const { error: linesError } = await supabase.from('invoice_lines').insert(invoiceLines);
                if (linesError) {
                    console.error('Invoice lines creation error:', linesError);
                }
            } else if (source_id) {
                let lines = null;
                if (source_type === 'quote') {
                    const { data } = await supabase.from('quote_lines').select('*').eq('quote_id', source_id);
                    lines = data;
                } else if (source_type === 'order') {
                    const { data } = await supabase.from('order_lines').select('*, products(product_name)').eq('order_id', source_id);
                    if (data) {
                        lines = data.map((l: any) => ({
                            ...l,
                            item_name: l.products?.product_name || `商品ID: ${l.product_id}`
                        }));
                    }
                }

                if (lines && lines.length > 0) {
                    const invoiceLines = lines.map((line: any, i: number) => ({
                        company_id: companyId,
                        invoice_id: newInvoice.id,
                        line_no: line.line_no || i + 1,
                        item_name: line.item_name || '名称未設定',
                        quantity: line.quantity,
                        unit_price: line.unit_price,
                        amount: line.amount,
                        delivery_date: line.delivery_date || null,
                        tax_rate: Number(line.tax_rate) || 10,
                        tax_amount: Number(line.tax_amount) || Math.floor(Number(line.amount || 0) * (Number(line.tax_rate) || 10) / 100),
                        unit: line.unit || null
                    }));
                    const { error: linesError } = await supabase.from('invoice_lines').insert(invoiceLines);
                    if (linesError) {
                        console.error('Invoice lines creation error from source:', linesError);
                    }
                }
            }
        }

        revalidatePath('/invoices');
        redirect('/invoices');
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/invoices" className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                    <ArrowLeft size={20} />
                </Link>
                <h1 className="text-2xl font-bold text-slate-900">新規請求書作成</h1>
            </div>

            <form action={createInvoice} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 flex flex-col">
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
            </form>
        </div>
    );
}
