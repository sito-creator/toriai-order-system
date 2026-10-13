import { createClient } from '@/utils/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Clock, Package, Calendar, Building2, FileText, Send } from 'lucide-react';

export default async function PurchaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: purchase, error } = await supabase
        .from('purchases')
        .select(`
            *,
            suppliers ( id, company_name, contact_name, email, phone )
        `)
        .eq('id', id)
        .single();

    const { data: purchaseLines } = await supabase
        .from('purchase_lines')
        .select('*, products (product_name)')
        .eq('purchase_id', id);

    if (purchase && purchaseLines) {
        purchase.purchase_lines = purchaseLines;
    }

    if (error || !purchase) {
        console.error("Purchase load error:", error);
        notFound();
    }

    const getStatusConfig = (status: string) => {
        switch (status) {
            case '下書き': return { color: 'bg-slate-100 text-slate-700 border-slate-200', icon: <Package size={16} /> };
            case '承認待ち': return { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: <Clock size={16} /> };
            case '発注済': return { color: 'bg-sky-100 text-sky-700 border-sky-200', icon: <Send size={16} /> };
            case '入荷済': return { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <CheckCircle2 size={16} /> };
            case '検収済': return { color: 'bg-indigo-100 text-indigo-700 border-indigo-200', icon: <CheckCircle2 size={16} /> };
            default: return { color: 'bg-slate-100 text-slate-600 border-slate-200', icon: null };
        }
    };

    const statusConfig = getStatusConfig(purchase.status);

    async function updatePurchaseStatus(formData: FormData) {
        'use server';
        const newStatus = formData.get('status') as string;
        if (!newStatus) return;
        const supabase = await createClient();
        await supabase.from('purchases').update({ status: newStatus }).eq('id', id);
        revalidatePath(`/purchases/${id}`);
        revalidatePath('/purchases');
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/purchases" className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-lg transition-colors">
                    <ArrowLeft size={20} />
                </Link>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-slate-900">{purchase.purchase_number || '発注番号なし'}</h1>
                        <form action={updatePurchaseStatus} className="flex items-center gap-2">
                            <div className={`relative inline-flex items-center rounded-full border ${statusConfig.color} hover:opacity-80 transition-opacity`}>
                                <div className="pl-3 pointer-events-none">
                                    {statusConfig.icon}
                                </div>
                                <select 
                                    name="status" 
                                    defaultValue={purchase.status}
                                    className="appearance-none bg-transparent pl-1.5 pr-8 py-1.5 text-xs font-bold outline-none cursor-pointer"
                                >
                                    <option value="下書き">下書き</option>
                                    <option value="発注済">発注済</option>
                                    <option value="入荷待ち">入荷待ち</option>
                                    <option value="一部入荷">一部入荷</option>
                                    <option value="完了">完了</option>
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
                    <p className="text-slate-500 mt-1">発注の詳細情報と明細を確認できます</p>
                </div>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center gap-2 text-slate-500 mb-3">
                        <Building2 size={16} />
                        <span className="text-xs font-bold uppercase tracking-wider">仕入先</span>
                    </div>
                    <p className="font-bold text-slate-900 text-lg">{(purchase.suppliers as any)?.company_name || '未紐付け'}</p>
                    {(purchase.suppliers as any)?.contact_name && (
                        <p className="text-sm text-slate-500 mt-1">担当: {(purchase.suppliers as any).contact_name}</p>
                    )}
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center gap-2 text-slate-500 mb-3">
                        <Calendar size={16} />
                        <span className="text-xs font-bold uppercase tracking-wider">日程</span>
                    </div>
                    <div className="space-y-2 text-sm">
                        <p><span className="text-slate-400 font-medium mr-2">発注日</span><span className="font-bold text-slate-800">{purchase.purchase_date || '未定'}</span></p>
                        <p><span className="text-slate-400 font-medium mr-2">希望納期</span><span className="font-bold text-slate-800">{purchase.desired_delivery_date || '未定'}</span></p>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center gap-2 text-slate-500 mb-3">
                        <FileText size={16} />
                        <span className="text-xs font-bold uppercase tracking-wider">金額</span>
                    </div>
                    <p className="font-bold text-slate-900 text-2xl tracking-tight">¥{(purchase.total_amount || 0).toLocaleString()}</p>
                </div>
            </div>

            {/* Purchase Lines */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Package size={18} className="text-indigo-600" />
                        発注明細
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
                            {purchase.purchase_lines && (purchase.purchase_lines as any[]).length > 0 ? (
                                (purchase.purchase_lines as any[]).map((line: any, i: number) => (
                                    <tr key={line.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="py-4 px-6 text-slate-400 font-mono">{line.line_no || i + 1}</td>
                                        <td className="py-4 px-6 font-semibold text-slate-900">
                                            {line.products?.product_name || '商品情報なし'}
                                        </td>
                                        <td className="py-4 px-6 text-right font-medium">{line.quantity || 0} {line.unit || ''}</td>
                                        <td className="py-4 px-6 text-right">¥{(line.unit_price || 0).toLocaleString()}</td>
                                        <td className="py-4 px-6 text-right font-bold text-slate-900">¥{(line.amount || 0).toLocaleString()}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center text-slate-500">
                                        <Package size={32} className="mx-auto text-slate-300 mb-3" />
                                        <p className="font-medium">この発注には明細行がまだ登録されていません</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        {purchase.purchase_lines && (purchase.purchase_lines as any[]).length > 0 && (
                            <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                                <tr>
                                    <td colSpan={4} className="py-4 px-6 text-right font-bold text-slate-600">合計</td>
                                    <td className="py-4 px-6 text-right font-bold text-xl text-indigo-700">¥{(purchase.total_amount || 0).toLocaleString()}</td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>

            {/* Notes */}
            {purchase.notes && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">備考・メモ</h2>
                    <p className="text-slate-700 whitespace-pre-wrap">{purchase.notes}</p>
                </div>
            )}
        </div>
    );
}
