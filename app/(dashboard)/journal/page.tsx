import { createClient } from '@/utils/supabase/server';
import { BookOpen, Settings } from 'lucide-react';
import Link from 'next/link';
import JournalTable from './journal-table';

export const dynamic = 'force-dynamic';

export default async function JournalPage() {
    const supabase = await createClient();

    // ユーザーの会社設定からCSVフォーマットを取得
    const { data: { user } } = await supabase.auth.getUser();
    let csvFormat = undefined;
    if (user) {
        try {
            const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).maybeSingle();
            if (profile?.company_id) {
                try {
                    const { data: settings } = await supabase.from('company_settings').select('csv_export_format').eq('company_id', profile.company_id).maybeSingle();
                    if (settings?.csv_export_format) {
                        csvFormat = settings.csv_export_format;
                    }
                } catch {
                    // company_settings テーブルが未作成の場合は無視
                }
            }
        } catch {
            // profiles テーブルのクエリに失敗した場合は無視
        }
    }

    // 請求書データ取得
    const { data: invoices } = await supabase.from('invoices').select('*, customers(company_name)').order('issue_date', { ascending: true });

    // 発注データ取得
    const { data: purchases } = await supabase.from('purchases').select('*, suppliers(company_name)').order('purchase_date', { ascending: true });

    // 仕訳データ自動生成
    const journalEntries: any[] = [];

    if (invoices) {
        for (const inv of invoices) {
            if (!inv.total_amount) continue;
            journalEntries.push({
                id: `inv-sale-${inv.id}`, date: inv.issue_date || '',
                debit_account: '売掛金', credit_account: '売上高', amount: inv.total_amount,
                description: `${(inv.customers as any)?.company_name || '不明'} 向け請求`,
                source_type: '請求書', source_number: inv.invoice_number || '',
            });
            if (inv.status === '入金済') {
                journalEntries.push({
                    id: `inv-pay-${inv.id}`, date: inv.issue_date || '',
                    debit_account: '普通預金', credit_account: '売掛金', amount: inv.total_amount,
                    description: `${(inv.customers as any)?.company_name || '不明'} 入金`,
                    source_type: '入金', source_number: inv.invoice_number || '',
                });
            }
        }
    }

    if (purchases) {
        for (const pur of purchases) {
            if (!pur.total_amount) continue;
            journalEntries.push({
                id: `pur-${pur.id}`, date: pur.purchase_date || '',
                debit_account: '仕入高', credit_account: '買掛金', amount: pur.total_amount,
                description: `${(pur.suppliers as any)?.company_name || '不明'} からの仕入`,
                source_type: '発注', source_number: pur.purchase_number || '',
            });
        }
    }

    journalEntries.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    const hasCustomFormat = csvFormat?.columns && csvFormat.columns.length > 0;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <BookOpen size={24} className="text-indigo-600" /> 仕訳元帳
                    </h1>
                    <p className="text-slate-500 mt-1">請求書・発注・入金データから自動生成された仕訳を元帳形式で確認・CSV出力できます</p>
                </div>
                {!hasCustomFormat && (
                    <Link href="/settings" className="flex items-center gap-2 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg hover:bg-amber-100 transition-all">
                        <Settings size={14} />
                        CSV出力フォーマット未設定 → 設定する
                    </Link>
                )}
            </div>

            <JournalTable entries={journalEntries} csvFormat={csvFormat} />
        </div>
    );
}
