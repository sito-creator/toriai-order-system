import { createClient } from '@/utils/supabase/server';
import { getCurrentCompanyId } from '@/utils/auth';
import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Clock, AlertCircle, Package, Calendar, Building2, FileText, Truck, FileOutput, Calculator, Pencil } from 'lucide-react';

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: order, error } = await supabase
        .from('orders')
        .select(`
            *,
            customers ( id, company_name, contact_name, email, phone )
        `)
        .eq('id', id)
        .single();

    const { data: orderLines } = await supabase
        .from('order_lines')
        .select('*, products (product_name)')
        .eq('order_id', id);

    if (order && orderLines) {
        order.order_lines = orderLines;
    }

    if (error || !order) {
        console.error("Order load error:", error);
        notFound();
    }

    if (order.pos_sale_id) {
        return <div className="p-8 space-y-6">
            <Link href="/orders" className="text-indigo-600">← 受注一覧</Link>
            <h1 className="text-2xl font-bold">POS連携受注</h1>
            <p>{order.order_number} ／ {order.status}</p>
            <p>会計日：{order.order_date}　店頭のお客様</p>
            <table className="w-full text-left"><thead><tr><th>商品・サービス</th><th>数量</th><th>税抜単価</th><th>税率</th><th>税抜金額</th></tr></thead>
                <tbody>{(orderLines || []).map(line => <tr key={line.id} className="border-b"><td className="py-3">{line.item_name || line.products?.product_name}</td><td>{line.quantity}</td><td>¥{Number(line.unit_price).toLocaleString()}</td><td>{line.tax_rate}%</td><td>¥{Number(line.amount).toLocaleString()}</td></tr>)}</tbody></table>
            <p className="text-xl font-bold">税込合計：¥{Number(order.total_amount).toLocaleString()}</p>
            <p>POS会計と自動同期しています。編集・取消・レシート発行はPOSレジの履歴から行ってください。取消済の会計はダッシュボード売上に含まれません。</p>
            <Link href="/pos" className="text-indigo-600">POSレジ・会計履歴を開く →</Link>
        </div>;
    }

    const getStatusConfig = (status: string) => {
        switch (status) {
            case '確認待ち': return { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: <AlertCircle size={16} /> };
            case '受注確定': return { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <CheckCircle2 size={16} /> };
            case '出荷準備中': return { color: 'bg-sky-100 text-sky-700 border-sky-200', icon: <Truck size={16} /> };
            case '納品済': return { color: 'bg-slate-100 text-slate-700 border-slate-200', icon: <CheckCircle2 size={16} /> };
            default: return { color: 'bg-slate-100 text-slate-600 border-slate-200', icon: null };
        }
    };

    const statusConfig = getStatusConfig(order.status);

    async function updateOrderStatus(formData: FormData) {
        'use server';
        const newStatus = formData.get('status') as string;
        if (!newStatus) return;
        const supabase = await createClient();
        await supabase.from('orders').update({ status: newStatus }).eq('id', id);
        revalidatePath(`/orders/${id}`);
        revalidatePath('/orders');
    }

    async function createQuoteFromOrder() {
        'use server';
        const supabase = await createClient();
        const companyId = await getCurrentCompanyId();
        const quote_number = `QUO-2024-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
        const { data: newQuote, error: quoError } = await supabase.from('quotes').insert({
            company_id: companyId,
            quote_number,
            customer_id: order.customer_id,
            subject: `${order.order_number} のお見積り`,
            total_amount: order.total_amount,
            status: '下書き',
            valid_until: order.delivery_date
        }).select().single();

        if (!quoError && newQuote && order.order_lines && order.order_lines.length > 0) {
            const quoteLines = order.order_lines.map((line: any, i: number) => ({
                company_id: companyId,
                quote_id: newQuote.id,
                line_no: i + 1,
                item_name: line.products?.product_name || `商品ID: ${line.product_id}`,
                quantity: line.quantity,
                unit_price: line.unit_price,
                amount: line.amount
            }));
            // テーブルが存在しない場合を考慮しエラーを無視
            await supabase.from('quote_lines').insert(quoteLines);
        }
        redirect('/quotes');
    }

    async function createInvoiceFromOrder() {
        'use server';
        const supabase = await createClient();
        const {data: currentOrder} = await supabase.from('orders').select('pos_sale_id').eq('id',id).single();
        if (!currentOrder || currentOrder.pos_sale_id) throw new Error('POS会計から重複請求書を作成することはできません。');
        const companyId = await getCurrentCompanyId();
        const invoice_number = `INV-2024-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
        const { data: newInvoice, error: invError } = await supabase.from('invoices').insert({
            company_id: companyId,
            invoice_number,
            customer_id: order.customer_id,
            subtotal: order.total_amount,
            tax_amount: (order.total_amount || 0) * 0.1,
            grand_total: (order.total_amount || 0) * 1.1,
            status: '下書き',
            issue_date: new Date().toISOString().split('T')[0]
        }).select().single();

        if (!invError && newInvoice && order.order_lines && order.order_lines.length > 0) {
            const invoiceLines = order.order_lines.map((line: any, i: number) => ({
                company_id: companyId,
                invoice_id: newInvoice.id,
                line_no: i + 1,
                item_name: line.products?.product_name || `商品ID: ${line.product_id}`,
                quantity: line.quantity,
                unit_price: line.unit_price,
                amount: line.amount
            }));
            await supabase.from('invoice_lines').insert(invoiceLines);
        }
        redirect('/invoices');
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/orders" className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-lg transition-colors">
                    <ArrowLeft size={20} />
                </Link>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-slate-900">{order.order_number || '受注番号なし'}</h1>
                        <form action={updateOrderStatus} className="flex items-center gap-2">
                            <div className={`relative inline-flex items-center rounded-full border ${statusConfig.color} hover:opacity-80 transition-opacity`}>
                                <div className="pl-3 pointer-events-none">
                                    {statusConfig.icon}
                                </div>
                                <select 
                                    name="status" 
                                    defaultValue={order.status}
                                    className="appearance-none bg-transparent pl-1.5 pr-8 py-1.5 text-xs font-bold outline-none cursor-pointer"
                                >
                                    <option value="確認待ち">確認待ち</option>
                                    <option value="新規受注">新規受注</option>
                                    <option value="受注確定">受注確定</option>
                                    <option value="出荷準備中">出荷準備中</option>
                                    <option value="納品済">納品済</option>
                                    <option value="キャンセル">キャンセル</option>
                                </select>
                                <div className="absolute right-2.5 pointer-events-none opacity-50 text-[10px]">
                                    ▼
                                </div>
                            </div>
                            <button type="submit" className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-full font-bold transition-colors shadow-sm">
                                更新
                            </button>
                        </form>
                    </div>
                    <p className="text-slate-500 mt-1">受注の詳細情報と明細を確認できます</p>
                </div>
                <div className="flex items-center gap-2">
                    <Link href={`/orders/${id}/edit`} className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl font-medium transition-colors shadow-sm">
                        <Pencil size={16} className="text-slate-500" />
                        <span>編集</span>
                    </Link>
                    <form action={createQuoteFromOrder}>
                        <button type="submit" className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl font-medium transition-colors shadow-sm">
                            <Calculator size={16} className="text-indigo-500" />
                            <span>見積書作成</span>
                        </button>
                    </form>
                    <Link href={`/invoices/new?orderId=${order.id}`} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white border border-transparent rounded-xl font-medium transition-colors shadow-sm">
                        <FileOutput size={16} />
                        <span>請求書作成</span>
                    </Link>
                </div>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center gap-2 text-slate-500 mb-3">
                        <Building2 size={16} />
                        <span className="text-xs font-bold uppercase tracking-wider">取引先</span>
                    </div>
                    <p className="font-bold text-slate-900 text-lg">{(order.customers as any)?.company_name || '未紐付け'}</p>
                    {(order.customers as any)?.contact_name && (
                        <p className="text-sm text-slate-500 mt-1">担当: {(order.customers as any).contact_name}</p>
                    )}
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center gap-2 text-slate-500 mb-3">
                        <Calendar size={16} />
                        <span className="text-xs font-bold uppercase tracking-wider">日程</span>
                    </div>
                    <div className="space-y-2 text-sm">
                        <p><span className="text-slate-400 font-medium mr-2">受注日</span><span className="font-bold text-slate-800">{order.order_date || '未定'}</span></p>
                        <p><span className="text-slate-400 font-medium mr-2">納品日</span><span className="font-bold text-slate-800">{order.delivery_date || '未定'}</span></p>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center gap-2 text-slate-500 mb-3">
                        <FileText size={16} />
                        <span className="text-xs font-bold uppercase tracking-wider">金額</span>
                    </div>
                    <p className="font-bold text-slate-900 text-2xl tracking-tight">¥{(order.total_amount || 0).toLocaleString()}</p>
                </div>
            </div>

            {/* Order Lines */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Package size={18} className="text-indigo-600" />
                        受注明細
                    </h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                            <tr>
                                <th className="font-medium py-3.5 px-6">#</th>
                                <th className="font-medium py-3.5 px-6">商品名</th>
                                <th className="font-medium py-3.5 px-6 text-right">数量</th>
                                <th className="font-medium py-3.5 px-6 text-right">単価</th>
                                <th className="font-medium py-3.5 px-6 text-right">小計</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {order.order_lines && (order.order_lines as any[]).length > 0 ? (
                                (order.order_lines as any[]).map((line: any, i: number) => (
                                    <tr key={line.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="py-4 px-6 text-slate-400 font-mono">{line.line_no || i + 1}</td>
                                        <td className="py-4 px-6 font-semibold text-slate-900">
                                            {line.products?.product_name || '商品情報なし'}
                                        </td>
                                        <td className="py-4 px-6 text-right font-medium">{line.quantity || 0}</td>
                                        <td className="py-4 px-6 text-right">¥{(line.unit_price || 0).toLocaleString()}</td>
                                        <td className="py-4 px-6 text-right font-bold text-slate-900">¥{(line.amount || 0).toLocaleString()}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center text-slate-500">
                                        <Package size={32} className="mx-auto text-slate-300 mb-3" />
                                        <p className="font-medium">この受注には明細行がまだ登録されていません</p>
                                        <p className="text-xs mt-1 text-slate-400">明細は別途追加が必要です</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        {order.order_lines && (order.order_lines as any[]).length > 0 && (
                            <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                                <tr>
                                    <td colSpan={4} className="py-4 px-6 text-right font-bold text-slate-600">合計</td>
                                    <td className="py-4 px-6 text-right font-bold text-xl text-indigo-700">¥{(order.total_amount || 0).toLocaleString()}</td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>

            {/* Notes */}
            {order.notes && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">備考・メモ</h2>
                    <p className="text-slate-700 whitespace-pre-wrap">{order.notes}</p>
                </div>
            )}
        </div>
    );
}
