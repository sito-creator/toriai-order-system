import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import PrintButton from './print-button';
import StatusChanger from '../../components/status-changer';

const QUOTE_STATUSES = [
    { label: '下書き', color: 'bg-slate-100 text-slate-700 border-slate-200' },
    { label: '送付済', color: 'bg-sky-100 text-sky-700 border-sky-200' },
    { label: '承認済', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    { label: '失注', color: 'bg-rose-100 text-rose-700 border-rose-200' },
];

export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    // 見積書データ取得
    const { data: quote, error } = await supabase
        .from('quotes')
        .select(`
            *,
            customers ( company_name, contact_name, email, phone )
        `)
        .eq('id', id)
        .single();

    // 明細行取得
    const { data: linesData } = await supabase
        .from('quote_lines')
        .select('*')
        .eq('quote_id', id);

    if (error || !quote) {
        return (
            <div className="p-8">
                <h1 className="text-2xl text-red-600 font-bold mb-4">エラーが発生しました</h1>
                <p>見積書情報の取得に失敗しました。以下のエラー詳細を確認してください：</p>
                <pre className="bg-red-50 p-4 mt-4 text-sm text-red-900 rounded-lg overflow-auto">
                    {JSON.stringify(error, null, 2)}
                </pre>
                <p className="mt-4">ID: {id}</p>
                <p className="mt-2">データが存在しない場合もあります。</p>
            </div>
        );
    }

    // 自社情報を取得
    const { data: { user } } = await supabase.auth.getUser();
    let companyInfo: any = null;
    let companySettings: any = null;

    if (user) {
        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('company_id, companies (*)')
                .eq('id', user.id)
                .maybeSingle();

            if (profile?.company_id) {
                companyInfo = profile.companies;

                // 会社設定（ロゴ・社印）
                try {
                    const { data: settings } = await supabase
                        .from('company_settings')
                        .select('*')
                        .eq('company_id', profile.company_id)
                        .maybeSingle();
                    companySettings = settings;
                } catch {
                    // company_settings テーブルが未作成の場合は無視
                }
            }
        } catch {
            // profiles テーブルのクエリに失敗した場合は無視
        }
    }

    const lines = linesData || [];
    const customer = quote.customers as any;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4 print:hidden">
                <Link href="/quotes" className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-lg transition-colors">
                    <ArrowLeft size={20} />
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-slate-900">{quote.quote_number || '見積書'}</h1>
                    <p className="text-slate-500 mt-1">見積書のプレビューとPDF出力</p>
                </div>
                <StatusChanger
                    id={id}
                    currentStatus={quote.status || '下書き'}
                    statuses={QUOTE_STATUSES}
                    type="quote"
                />
                <PrintButton />
            </div>

            {/* Printable Quote */}
            <div id="quote-print-area" className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 print:shadow-none print:border-none print:p-0 print:rounded-none">
                {/* Title */}
                <div className="text-center mb-8 pb-4">
                    <h1 className="text-3xl font-bold text-slate-900 tracking-widest">見積書</h1>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-8">
                    {/* To */}
                    <div>
                        <div className="border-b-2 border-slate-900 pb-2 mb-3">
                            <p className="text-xl font-bold text-slate-900">{customer?.company_name || '名称未設定'} 御中</p>
                        </div>
                        {customer?.contact_name && <p className="text-sm text-slate-600">{customer.contact_name} 様</p>}
                        {customer?.email && <p className="text-sm text-slate-500 mt-1">{customer.email}</p>}
                        {customer?.phone && <p className="text-sm text-slate-500 mt-0.5">{customer.phone}</p>}
                        
                        <div className="mt-6 border-b-2 border-slate-900 pb-2">
                            <p className="text-sm text-slate-700 uppercase tracking-wider">件名</p>
                            <p className="text-lg font-bold text-slate-900">{quote.subject || '（件名なし）'}</p>
                        </div>
                    </div>

                    {/* Quote Details & Issuer Info */}
                    <div className="text-right">
                        {companySettings?.logo_url && (
                            <div className="flex justify-end mb-3">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={companySettings.logo_url} alt="企業ロゴ" className="max-h-14 max-w-[160px] object-contain" />
                            </div>
                        )}
                        <div className="space-y-1 text-sm mb-4">
                            <p className="font-bold text-slate-900 text-base">{companyInfo?.name || '自社名未設定'}</p>
                            {companySettings?.representative_name && (
                                <p className="text-xs text-slate-600">代表 {companySettings.representative_name}</p>
                            )}
                            {companySettings?.address && (
                                <p className="text-xs text-slate-500">{companySettings.address}</p>
                            )}
                            {companySettings?.registration_number && (
                                <p className="text-xs mt-1">
                                    <span className="text-slate-700 mr-1">登録番号</span>
                                    <span className="font-mono font-bold text-slate-900 px-1.5 py-0.5 text-xs">{companySettings.registration_number}</span>
                                </p>
                            )}
                        </div>
                        <div className="space-y-1.5 text-sm pt-3">
                            <p><span className="text-slate-700 mr-3">見積書番号</span><span className="font-bold text-slate-900">{quote.quote_number || '-'}</span></p>
                            <p><span className="text-slate-700 mr-3">発行日</span><span className="font-bold text-slate-900">{new Date(quote.created_at).toLocaleDateString('ja-JP')}</span></p>
                            <p><span className="text-slate-700 mr-3">有効期限</span><span className="font-bold text-slate-900">{quote.valid_until || '-'}</span></p>
                        </div>
                    </div>
                </div>

                {/* Amount Summary */}
                <div className="border border-slate-300 p-4 mb-8">
                    <p className="text-base text-slate-900">
                        <span className="font-bold mr-6">御見積金額</span>
                        <span className="font-bold text-lg">{(quote.total_amount || 0).toLocaleString()} 円</span>
                    </p>
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
                            <td className="py-3 px-2 text-right font-bold text-xl text-slate-900">¥{(quote.total_amount || 0).toLocaleString()}</td>
                        </tr>
                    </tfoot>
                </table>

                {/* Notes */}
                {quote.notes && (
                    <div className="border-t border-slate-200 pt-4 mb-6">
                        <p className="text-xs font-bold text-slate-400 mb-2">備考</p>
                        <p className="text-sm text-slate-600 whitespace-pre-wrap">{quote.notes}</p>
                    </div>
                )}

                {/* Footer: Stamp and Company Info */}
                <div className="flex items-end justify-end border-t border-slate-200 pt-6">
                    <div className="flex flex-col items-center gap-2">
                        {companySettings?.stamp_url && (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={companySettings.stamp_url} alt="社印" className="w-20 h-20 object-contain" />
                        )}
                        <p className="text-xs font-bold text-slate-600">{companyInfo?.name || ''}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
