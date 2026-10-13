"use client";

import { useEffect, useState } from 'react';
import { CheckCircle2, CreditCard, ExternalLink, Loader2, Unplug } from 'lucide-react';

type Integration = {
    provider_account_id: string;
    account_name: string | null;
    account_email: string | null;
    livemode: boolean;
    connected_at: string;
};

export default function StripeConnectSettings() {
    const [integration, setIntegration] = useState<Integration | null>(null);
    const [loading, setLoading] = useState(true);
    const [disconnecting, setDisconnecting] = useState(false);
    const [error, setError] = useState('');

    const loadStatus = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/stripe/connect/status');
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Stripe接続状態を取得できませんでした。');
            setIntegration(data.integration);
        } catch (statusError) {
            setError(statusError instanceof Error ? statusError.message : 'Stripe接続状態を取得できませんでした。');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadStatus(); }, []);

    const disconnect = async () => {
        if (!window.confirm('この会社とStripeの連携を解除しますか？発行済みURLはStripe側で個別に無効化してください。')) return;
        setDisconnecting(true);
        setError('');
        try {
            const response = await fetch('/api/stripe/connect', { method: 'DELETE' });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Stripe連携を解除できませんでした。');
            setIntegration(null);
        } catch (disconnectError) {
            setError(disconnectError instanceof Error ? disconnectError.message : 'Stripe連携を解除できませんでした。');
        } finally {
            setDisconnecting(false);
        }
    };

    return (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><CreditCard size={20} className="text-indigo-600" />オンライン決済連携</h2>
                <p className="text-sm text-slate-500 mt-1">この会社が利用するStripeアカウントを接続します。StripeのAPIキーをToriaiへ入力する必要はありません。</p>
            </div>
            <div className="p-6">
                {loading ? (
                    <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 size={18} className="animate-spin" />接続状態を確認中...</div>
                ) : integration ? (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div>
                                <p className="flex items-center gap-2 font-bold text-emerald-800"><CheckCircle2 size={18} />Stripe連携済み</p>
                                <p className="mt-2 font-bold text-slate-800">{integration.account_name || integration.account_email || 'Stripeアカウント'}</p>
                                {integration.account_email && <p className="text-sm text-slate-600">{integration.account_email}</p>}
                                <p className="mt-1 font-mono text-xs text-slate-500">{integration.provider_account_id}</p>
                                <span className="mt-3 inline-block rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-600">{integration.livemode ? '本番環境' : 'テスト環境'}</span>
                            </div>
                            <button type="button" onClick={disconnect} disabled={disconnecting} className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white px-4 py-2 text-sm font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-50">
                                {disconnecting ? <Loader2 size={16} className="animate-spin" /> : <Unplug size={16} />}連携解除
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                        <p className="font-bold text-slate-800">Stripeアカウントは未連携です</p>
                        <p className="mt-1 text-sm text-slate-500">接続後、この会社のStripeアカウントへ入金される決済URLを請求書から発行できます。</p>
                        <a href="/api/stripe/connect" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#635bff] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#5147e5]">
                            Stripeと連携する <ExternalLink size={16} />
                        </a>
                    </div>
                )}
                {error && <p className="mt-3 text-sm font-medium text-rose-600">{error}</p>}
            </div>
        </div>
    );
}
