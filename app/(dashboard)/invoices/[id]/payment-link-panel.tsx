"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Copy, CreditCard, ExternalLink, Link2Off, Loader2 } from 'lucide-react';

export type InvoicePaymentLink = {
    id: string;
    payment_url: string;
    status: 'active' | 'paid' | 'expired' | 'disabled';
    expires_at: string | null;
    amount: number;
    currency: string;
};

export default function PaymentLinkPanel({
    invoiceId,
    initialLink,
    stripeConfigured,
    stripeConnected,
}: {
    invoiceId: string;
    initialLink: InvoicePaymentLink | null;
    stripeConfigured: boolean;
    stripeConnected: boolean;
}) {
    const router = useRouter();
    const [paymentLink, setPaymentLink] = useState(initialLink);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState('');

    const issueLink = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await fetch(`/api/invoices/${invoiceId}/payment-link`, { method: 'POST' });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || '決済URLを発行できませんでした。');
            setPaymentLink(data.paymentLink);
            router.refresh();
        } catch (issueError) {
            setError(issueError instanceof Error ? issueError.message : '決済URLを発行できませんでした。');
        } finally {
            setLoading(false);
        }
    };

    const copyLink = async () => {
        if (!paymentLink) return;
        await navigator.clipboard.writeText(paymentLink.payment_url);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
    };

    const disableLink = async () => {
        if (!window.confirm('この決済URLを無効化しますか？')) return;
        setLoading(true);
        setError('');
        try {
            const response = await fetch(`/api/invoices/${invoiceId}/payment-link`, { method: 'DELETE' });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || '決済URLを無効化できませんでした。');
            setPaymentLink((current) => current ? { ...current, status: 'disabled' } : current);
            router.refresh();
        } catch (disableError) {
            setError(disableError instanceof Error ? disableError.message : '決済URLを無効化できませんでした。');
        } finally {
            setLoading(false);
        }
    };

    const isActive = paymentLink?.status === 'active' && (!paymentLink.expires_at || new Date(paymentLink.expires_at) > new Date());

    return (
        <section className="print:hidden bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <div className="flex items-center gap-2 text-slate-900">
                        <CreditCard size={20} className="text-indigo-600" />
                        <h2 className="font-bold">クレジットカード請求</h2>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">Stripeの安全な決済ページを、この請求書専用URLとして発行します。</p>
                </div>
                {!isActive && (
                    <button
                        type="button"
                        onClick={issueLink}
                        disabled={loading || !stripeConfigured || !stripeConnected}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {loading ? <Loader2 size={17} className="animate-spin" /> : <CreditCard size={17} />}
                        決済URLを発行
                    </button>
                )}
            </div>

            {!stripeConfigured && (
                <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    Stripe Connectのプラットフォーム設定が未完了です。
                </p>
            )}

            {stripeConfigured && !stripeConnected && (
                <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    設定画面の「オンライン決済連携」から、この会社のStripeアカウントを接続してください。
                </p>
            )}

            {paymentLink && (
                <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-2 flex items-center justify-between gap-4">
                        <p className="text-sm font-bold text-slate-700">支払いリンクURL</p>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${isActive ? 'bg-emerald-100 text-emerald-700' : paymentLink.status === 'paid' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'}`}>
                            {isActive ? '未払い・有効' : paymentLink.status === 'paid' ? '支払済み' : '無効'}
                        </span>
                    </div>
                    <div className="flex flex-col gap-2 md:flex-row">
                        <input readOnly value={paymentLink.payment_url} className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700" />
                        <button type="button" onClick={copyLink} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100">
                            {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                            {copied ? 'コピー済み' : 'コピー'}
                        </button>
                        {isActive && (
                            <a href={paymentLink.payment_url} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-700 hover:bg-indigo-100">
                                <ExternalLink size={16} /> 開く
                            </a>
                        )}
                    </div>
                    {paymentLink.expires_at && isActive && (
                        <p className="mt-2 text-xs text-slate-500">有効期限：{new Date(paymentLink.expires_at).toLocaleString('ja-JP')}</p>
                    )}
                    {isActive && (
                        <div className="mt-4 flex justify-end">
                            <button type="button" onClick={disableLink} disabled={loading} className="inline-flex items-center gap-2 text-sm font-bold text-rose-600 hover:text-rose-700 disabled:opacity-50">
                                <Link2Off size={16} /> 決済URLを無効化
                            </button>
                        </div>
                    )}
                </div>
            )}

            {error && <p className="mt-3 text-sm font-medium text-rose-600">{error}</p>}
        </section>
    );
}
