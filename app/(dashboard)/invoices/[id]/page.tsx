import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Building2, Calendar, FileText } from 'lucide-react';
import PrintButton from './print-button';

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: invoice, error } = await supabase
        .from('invoices')
        .select(`
            *,
            customers ( company_name, contact_name, postal_code, address ),
            invoice_lines ( * )
        `)
        .eq('id', id)
        .single();

    if (error || !invoice) {
        notFound();
    }

    const lines = (invoice.invoice_lines as any[]) || [];
    const customer = invoice.customers as any;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4 print:hidden">
                <Link href="/invoices" className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-lg transition-colors">
                    <ArrowLeft size={20} />
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-slate-900">{invoice.invoice_number || '請求書'}</h1>
                    <p className="text-slate-500 mt-1">請求書のプレビューとPDF出力</p>
                </div>
                <PrintButton />
            </div>

            {/* Printable Invoice */}
            <div id="invoice-print-area" className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 print:shadow-none print:border-none print:p-0 print:rounded-none">
                {/* Header */}
                <div className="text-center mb-8 pb-6 border-b-2 border-slate-900">
                    <h1 className="text-3xl font-bold text-slate-900 tracking-widest">適格請求書</h1>
                    <p className="text-sm text-slate-500 mt-2">QUALIFIED INVOICE</p>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-8">
                    {/* Bill To */}
                    <div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-3">請求先</p>
                        <div className="border-b-2 border-slate-900 pb-2 mb-3">
                            <p className="text-xl font-bold text-slate-900">{customer?.company_name || '名称未設定'} 御中</p>
                        </div>
                        {customer?.contact_name && <p className="text-sm text-slate-600">{customer.contact_name} 様</p>}
                        {customer?.address && <p className="text-sm text-slate-500 mt-1">{customer.postal_code && `〒${customer.postal_code} `}{customer.address}</p>}
                    </div>

                    {/* Invoice Details */}
                    <div className="text-right">
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-3">請求情報</p>
                        <div className="space-y-2 text-sm">
                            <p><span className="text-slate-400 mr-3">請求書番号</span><span className="font-bold text-slate-900">{invoice.invoice_number || '-'}</span></p>
                            <p><span className="text-slate-400 mr-3">発行日</span><span className="font-bold text-slate-900">{invoice.issue_date || '-'}</span></p>
                            <p><span className="text-slate-400 mr-3">支払期日</span><span className="font-bold text-rose-600">{invoice.due_date || '-'}</span></p>
                            {invoice.issuer_registration_number && (
                                <p><span className="text-slate-400 mr-3">インボイス登録番号</span><span className="font-mono font-bold text-slate-900 bg-yellow-100 px-1 py-0.5 rounded">{invoice.issuer_registration_number}</span></p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Amount Summary */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 mb-8 print:bg-gray-50">
                    <div className="text-center">
                        <p className="text-sm text-slate-500 font-bold mb-2">ご請求金額（税込）</p>
                        <p className="text-4xl font-bold text-slate-900 tracking-tight">¥{(invoice.grand_total || 0).toLocaleString()}</p>
                    </div>
                    <div className="flex justify-center gap-8 mt-4 text-sm text-slate-600">
                        <p>10%対象: ¥{(invoice.subtotal_10 || 0).toLocaleString()} (税: ¥{(invoice.tax_10 || 0).toLocaleString()})</p>
                        <p>8%対象: ¥{(invoice.subtotal_8 || 0).toLocaleString()} (税: ¥{(invoice.tax_8 || 0).toLocaleString()})</p>
                    </div>
                </div>

                {/* Line Items */}
                <table className="w-full text-left text-sm mb-8">
                    <thead>
                        <tr className="border-b-2 border-slate-900 text-slate-500">
                            <th className="py-3 px-2 font-bold text-xs uppercase tracking-wider">#</th>
                            <th className="py-3 px-2 font-bold text-xs uppercase tracking-wider">品目</th>
                            <th className="py-3 px-2 font-bold text-xs uppercase tracking-wider text-right">数量</th>
                            <th className="py-3 px-2 font-bold text-xs uppercase tracking-wider text-right">単価</th>
                            <th className="py-3 px-2 font-bold text-xs uppercase tracking-wider text-right">金額</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {lines.length > 0 ? lines.map((line: any, i: number) => (
                            <tr key={line.id}>
                                <td className="py-3 px-2 text-slate-400 font-mono">{line.line_no || i + 1}</td>
                                <td className="py-3 px-2 font-medium text-slate-900">
                                    {line.item_name || '-'}
                                    {line.item_description && <span className="block text-xs text-slate-400 mt-0.5">{line.item_description}</span>}
                                </td>
                                <td className="py-3 px-2 text-right">{line.quantity || 0} {line.unit || ''}</td>
                                <td className="py-3 px-2 text-right">¥{(line.unit_price || 0).toLocaleString()}</td>
                                <td className="py-3 px-2 text-right font-bold">¥{(line.amount || 0).toLocaleString()}</td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={5} className="py-8 text-center text-slate-400">明細行はまだ登録されていません</td>
                            </tr>
                        )}
                    </tbody>
                    <tfoot className="border-t-2 border-slate-900">
                        <tr>
                            <td colSpan={4} className="py-3 px-2 text-right font-bold text-slate-700">合計（税込）</td>
                            <td className="py-3 px-2 text-right font-bold text-xl text-slate-900">¥{(invoice.grand_total || 0).toLocaleString()}</td>
                        </tr>
                    </tfoot>
                </table>

                {/* Notes */}
                {invoice.notes && (
                    <div className="border-t border-slate-200 pt-4">
                        <p className="text-xs font-bold text-slate-400 mb-2">備考</p>
                        <p className="text-sm text-slate-600 whitespace-pre-wrap">{invoice.notes}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
