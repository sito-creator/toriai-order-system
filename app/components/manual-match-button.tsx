'use client';

import { useState } from 'react';
import { Link as LinkIcon, AlertCircle, X, CheckCircle2 } from 'lucide-react';
import { updatePaymentMatch } from '@/app/actions/payments';
import { useRouter } from 'next/navigation';

export default function ManualMatchButton({ 
    payment,
    unpaidInvoices
}: {
    payment: any,
    unpaidInvoices: any[]
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleMatch = async () => {
        if (!selectedInvoiceId) return;
        setIsLoading(true);
        try {
            await updatePaymentMatch(payment.id, selectedInvoiceId);
            setIsOpen(false);
            router.refresh();
        } catch (e: any) {
            alert('消込処理に失敗しました: ' + e.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <button 
                onClick={() => setIsOpen(true)}
                title="手動で請求書と紐付け (消込)"
                className="inline-flex items-center text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 p-2 rounded-lg transition-colors"
                disabled={payment.match_status === '消込済'}
            >
                <LinkIcon size={18} />
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div>
                                <h3 className="font-bold text-slate-900 text-lg">手動での入金消込</h3>
                                <p className="text-xs text-slate-500 mt-0.5">入金データと対象の請求書を手動で紐付けます</p>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto space-y-6">
                            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                                <p className="text-xs font-semibold text-indigo-800 mb-2">対象の入金データ</p>
                                <div className="flex justify-between items-end">
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-slate-700">{payment.payer_name || '振込人不明'}</p>
                                        <p className="text-xs text-slate-500">入金日: {payment.payment_date || '不明'}</p>
                                    </div>
                                    <div className="text-xl font-bold text-indigo-700">
                                        ¥{(payment.amount || 0).toLocaleString()}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <p className="text-sm font-bold text-slate-800">紐付ける請求書を選択</p>
                                {unpaidInvoices.length === 0 ? (
                                    <p className="text-sm text-slate-500 p-4 bg-slate-50 rounded-xl text-center">紐付け可能な未入金の請求書がありません</p>
                                ) : (
                                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                        {unpaidInvoices.map(invoice => (
                                            <label 
                                                key={invoice.id} 
                                                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedInvoiceId === invoice.id ? 'border-indigo-500 bg-indigo-50/50 ring-1 ring-indigo-500' : 'border-slate-200 hover:border-indigo-200 hover:bg-slate-50'}`}
                                            >
                                                <input 
                                                    type="radio" 
                                                    name="invoice" 
                                                    value={invoice.id} 
                                                    checked={selectedInvoiceId === invoice.id}
                                                    onChange={() => setSelectedInvoiceId(invoice.id)}
                                                    className="mt-1 accent-indigo-600" 
                                                />
                                                <div className="flex-1">
                                                    <div className="flex justify-between">
                                                        <span className="font-semibold text-slate-900 text-sm">{invoice.invoice_number}</span>
                                                        <span className="font-bold text-slate-900 text-sm">¥{(invoice.total_amount || 0).toLocaleString()}</span>
                                                    </div>
                                                    <p className="text-xs text-slate-500 mt-1 cursor-pointer">{(invoice.customers as any)?.company_name}</p>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
                            <button 
                                onClick={() => setIsOpen(false)}
                                className="px-4 py-2.5 rounded-xl font-medium text-slate-600 hover:bg-slate-200/50 transition-colors bg-white border border-slate-200 shadow-sm"
                            >
                                キャンセル
                            </button>
                            <button 
                                onClick={handleMatch}
                                disabled={!selectedInvoiceId || isLoading}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-sm shadow-indigo-200"
                            >
                                {isLoading ? '処理中...' : (
                                    <>
                                        <CheckCircle2 size={18} />
                                        <span>この請求書で消込する</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
