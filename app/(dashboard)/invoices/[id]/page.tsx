import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import PrintButton from './print-button';
import PaymentLinkPanel, { type InvoicePaymentLink } from './payment-link-panel';
import StatusChanger from '../../components/status-changer';

const INVOICE_STATUSES = [
    { label: '下書き', color: 'bg-slate-100 text-slate-700 border-slate-200' },
    { label: '発行済', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
    { label: '送付済', color: 'bg-sky-100 text-sky-700 border-sky-200' },
    { label: '入金済', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    { label: '期日超過', color: 'bg-rose-100 text-rose-700 border-rose-200' },
];

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    // 請求書データ取得
    const { data: invoice, error } = await supabase
        .from('invoices')
        .select(`
            *,
            customers ( company_name, contact_name, email, phone )
        `)
        .eq('id', id)
        .single();

    // 明細行取得
    const { data: linesData } = await supabase
        .from('invoice_lines')
        .select('*')
        .eq('invoice_id', id);

    // 決済URL用テーブルが未作成でも請求書自体は表示できるようにする。
    const { data: paymentLinkData } = await supabase
        .from('invoice_payment_links')
        .select('id, payment_url, status, expires_at, amount, currency')
        .eq('invoice_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    const { data: stripeIntegration } = await supabase
        .from('company_payment_integrations')
        .select('status')
        .eq('company_id', invoice?.company_id || '')
        .eq('provider', 'stripe')
        .maybeSingle();

    if (error || !invoice) {
        return (
            <div className="p-8">
                <h1 className="text-2xl text-red-600 font-bold mb-4">エラーが発生しました</h1>
                <p>請求書情報の取得に失敗しました。以下のエラー詳細を確認してください：</p>
                <pre className="bg-red-50 p-4 mt-4 text-sm text-red-900 rounded-lg overflow-auto">
                    {JSON.stringify(error, null, 2)}
                </pre>
                <p className="mt-4">ID: {id}</p>
                <p className="mt-2">データが存在しない場合もあります。</p>
            </div>
        );
    }

    // 自社情報を取得するためにログインユーザーのプロフィール→会社を辿る
    const { data: { user } } = await supabase.auth.getUser();
    let companyInfo: any = null;
    let companySettings: any = null;
    let defaultBank: any = null;

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

                // デフォルト口座情報
                try {
                    const { data: bank } = await supabase
                        .from('bank_accounts')
                        .select('*')
                        .eq('company_id', profile.company_id)
                        .eq('is_default', true)
                        .maybeSingle();
                    
                    if (bank) {
                        defaultBank = bank;
                    } else {
                        // デフォルトがない場合は最初の口座を使用
                        const { data: firstBank } = await supabase
                            .from('bank_accounts')
                            .select('*')
                            .eq('company_id', profile.company_id)
                            .order('created_at', { ascending: true })
                            .limit(1)
                            .maybeSingle();
                        defaultBank = firstBank;
                    }
                } catch {
                    // bank_accounts テーブルが未作成の場合は無視
                }
            }
        } catch {
            // profiles テーブルのクエリに失敗した場合は無視
        }
    }

    const lines = linesData || [];
    const customer = invoice.customers as any;
    const issuerName = companyInfo?.name || '発行事業者名未設定';
    const issuerRegistrationNumber = companySettings?.registration_number || companyInfo?.registration_number || invoice.issuer_registration_number || null;
    const issuerRepresentative = companySettings?.representative_name || companyInfo?.representative_name || null;
    const issuerAddress = companySettings?.address || companyInfo?.address || null;
    const taxBreakdown = [10, 8, 0].map((rate) => {
        const rateLines = lines.filter((line: any) => Number(line.tax_rate ?? 10) === rate);
        const subtotal = rateLines.reduce((sum: number, line: any) => sum + Number(line.amount || 0), 0);
        const tax = rateLines.reduce((sum: number, line: any) => {
            const savedTax = Number(line.tax_amount);
            return sum + (Number.isFinite(savedTax) ? savedTax : Math.floor(Number(line.amount || 0) * rate / 100));
        }, 0);
        return { rate, subtotal, tax, total: subtotal + tax };
    }).filter((row) => row.subtotal !== 0 || row.tax !== 0);
    const calculatedSubtotal = taxBreakdown.reduce((sum, row) => sum + row.subtotal, 0);
    const calculatedTax = taxBreakdown.reduce((sum, row) => sum + row.tax, 0);
    const calculatedTotal = calculatedSubtotal + calculatedTax;
    const paymentUrlForDocument = paymentLinkData
        && (paymentLinkData.status === 'active' || paymentLinkData.status === 'paid')
        ? paymentLinkData.payment_url
        : null;

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
                <StatusChanger
                    id={id}
                    currentStatus={invoice.status || '下書き'}
                    statuses={INVOICE_STATUSES}
                    type="invoice"
                />
                <PrintButton />
            </div>

            <PaymentLinkPanel
                invoiceId={id}
                initialLink={(paymentLinkData as InvoicePaymentLink | null) || null}
                stripeConfigured={Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_CONNECT_CLIENT_ID)}
                stripeConnected={stripeIntegration?.status === 'connected'}
            />

            {/* Printable Invoice */}
            <div id="invoice-print-area" className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 print:shadow-none print:border-none print:p-0 print:rounded-none">
                {/* Title */}
                <div className="text-center mb-8 pb-4">
                    <h1 className="text-3xl font-bold text-slate-900 tracking-widest">請求書</h1>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-8">
                    {/* Bill To */}
                    <div>
                        <p className="text-xs text-slate-700 font-bold uppercase tracking-wider mb-3">請求先</p>
                        <div className="border-b-2 border-slate-900 pb-2 mb-3">
                            <p className="text-xl font-bold text-slate-900">{customer?.company_name || '名称未設定'} 御中</p>
                        </div>
                        {customer?.contact_name && <p className="text-sm text-slate-600">{customer.contact_name} 様</p>}
                        {customer?.email && <p className="text-sm text-slate-500 mt-1">{customer.email}</p>}
                        {customer?.phone && <p className="text-sm text-slate-500 mt-0.5">{customer.phone}</p>}
                    </div>

                    {/* Invoice Details & Issuer Info */}
                    <div className="text-right">
                        {companySettings?.logo_url && (
                            <div className="flex justify-end mb-3">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={companySettings.logo_url} alt="企業ロゴ" className="max-h-14 max-w-[160px] object-contain" />
                            </div>
                        )}
                        <div className="inline-block text-left border border-slate-400 px-4 py-3 mb-4 min-w-[240px]">
                            <p className="text-[10px] font-bold text-slate-500 mb-1">適格請求書発行事業者</p>
                            <p className="font-bold text-slate-900 text-base">{issuerName}</p>
                            {issuerRepresentative && (
                                <p className="text-xs text-slate-600">代表 {issuerRepresentative}</p>
                            )}
                            {issuerAddress && (
                                <p className="text-xs text-slate-500">{issuerAddress}</p>
                            )}
                            <p className="text-xs mt-1">
                                <span className="text-slate-700 mr-1">登録番号</span>
                                <span className="font-mono font-bold text-slate-900 text-xs">{issuerRegistrationNumber || '未設定'}</span>
                            </p>
                        </div>
                        <div className="space-y-1.5 text-sm pt-3">
                            <p><span className="text-slate-700 mr-3">請求書番号</span><span className="font-bold text-slate-900">{invoice.invoice_number || '-'}</span></p>
                            <p><span className="text-slate-700 mr-3">請求日（取引年月日）</span><span className="font-bold text-slate-900">{invoice.issue_date || '-'}</span></p>
                            <p><span className="text-slate-700 mr-3">支払期日</span><span className="font-bold text-slate-900">{invoice.due_date || '-'}</span></p>
                        </div>
                    </div>
                </div>

                {/* Amount Summary */}
                <div className="border border-slate-300 p-4 mb-8">
                    <p className="text-base text-slate-900">
                        <span className="font-bold mr-6">ご請求金額</span>
                        <span className="font-bold text-lg">{calculatedTotal.toLocaleString()} 円</span>
                    </p>
                </div>

                {/* Line Items */}
                <table className="w-full text-left text-sm mb-4">
                    <thead>
                        <tr className="border-b-2 border-slate-900 text-slate-500">
                            <th className="py-3 px-2 font-bold text-xs uppercase tracking-wider w-24">納品日</th>
                            <th className="py-3 px-2 font-bold text-xs uppercase tracking-wider">品目</th>
                            <th className="py-3 px-2 font-bold text-xs uppercase tracking-wider text-right">数量</th>
                            <th className="py-3 px-2 font-bold text-xs uppercase tracking-wider text-right">単価</th>
                            <th className="py-3 px-2 font-bold text-xs uppercase tracking-wider text-right">税率区分</th>
                            <th className="py-3 px-2 font-bold text-xs uppercase tracking-wider text-right">金額</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 border-b-2 border-slate-900">
                        {lines.length > 0 ? lines.map((line: any, i: number) => (
                            <tr key={line.id}>
                                <td className="py-3 px-2 text-slate-600 font-mono text-xs">{line.delivery_date || '-'}</td>
                                <td className="py-3 px-2 font-medium text-slate-900">
                                    {line.item_name || 'テスト品目'}
                                    {line.tax_rate === 8 || line.is_reduced_tax ? ' ※' : ''}
                                    {line.item_description && <span className="block text-xs text-slate-400 mt-0.5">{line.item_description}</span>}
                                </td>
                                <td className="py-3 px-2 text-right">{line.quantity || 1} {line.unit || '個'}</td>
                                <td className="py-3 px-2 text-right">¥{(line.unit_price || 0).toLocaleString()}</td>
                                <td className="py-3 px-2 text-right">{Number(line.tax_rate ?? 10) === 0 ? '非課税' : `${Number(line.tax_rate ?? 10)}%`}</td>
                                <td className="py-3 px-2 text-right font-bold">¥{(line.amount || 0).toLocaleString()}</td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={6} className="py-8 px-2 text-center text-slate-400">請求明細がありません</td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* Tax Breakdown & Totals */}
                <div className="flex justify-between items-start mb-8">
                    {/* 軽減税率の注記と税率別内訳 */}
                    <div className="w-1/2 pr-8">
                        {taxBreakdown.some((row) => row.rate === 8) && (
                            <p className="text-xs font-bold text-slate-700 mb-2 border border-slate-400 inline-block px-2 py-1">「※」は軽減税率対象品目です。</p>
                        )}
                        <div className="border border-slate-400">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-slate-50 border-b border-red-600">
                                    <tr>
                                        <th className="py-2 px-3 font-bold text-slate-700">税率別内訳</th>
                                        <th className="py-2 px-3 font-bold text-slate-700 text-right">税抜金額</th>
                                        <th className="py-2 px-3 font-bold text-slate-700 text-right">消費税額</th>
                                        <th className="py-2 px-3 font-bold text-slate-700 text-right">税込金額</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {taxBreakdown.length > 0 ? taxBreakdown.map((row) => (
                                        <tr key={row.rate}>
                                            <td className="py-2 px-3">{row.rate === 0 ? '非課税' : `${row.rate}%${row.rate === 8 ? '（軽減税率）' : ''}`}</td>
                                            <td className="py-2 px-3 text-right">¥{row.subtotal.toLocaleString()}</td>
                                            <td className="py-2 px-3 text-right">¥{row.tax.toLocaleString()}</td>
                                            <td className="py-2 px-3 text-right">¥{row.total.toLocaleString()}</td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan={4} className="py-3 px-3 text-center text-slate-400">税率別明細なし</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    {/* 合計金額（小計・消費税・合計） */}
                    <div className="w-1/3">
                        <table className="w-full text-sm">
                            <tbody>
                                <tr className="border-b border-slate-200">
                                    <td className="py-2 text-slate-600 font-bold">小計</td>
                                    <td className="py-2 text-right font-mono">¥{calculatedSubtotal.toLocaleString()}</td>
                                </tr>
                                <tr className="border-b border-slate-200">
                                    <td className="py-2 text-slate-600 font-bold">消費税額合計</td>
                                    <td className="py-2 text-right font-mono">¥{calculatedTax.toLocaleString()}</td>
                                </tr>
                                <tr className="border-b-2 border-slate-900">
                                    <td className="py-3 font-bold text-slate-700">合計</td>
                                    <td className="py-3 text-right font-bold text-lg text-slate-900">¥{calculatedTotal.toLocaleString()}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Bank Account Info */}
                {defaultBank && (
                    <div className="border border-slate-200 rounded-xl p-5 mb-6 bg-slate-50/50 print:bg-gray-50">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">お振込先</p>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-sm">
                            <div className="flex">
                                <span className="text-slate-400 w-20 shrink-0">銀行名</span>
                                <span className="font-bold text-slate-900">{defaultBank.bank_name}</span>
                            </div>
                            <div className="flex">
                                <span className="text-slate-400 w-20 shrink-0">支店名</span>
                                <span className="font-bold text-slate-900">{defaultBank.branch_name}</span>
                            </div>
                            <div className="flex">
                                <span className="text-slate-400 w-20 shrink-0">口座種別</span>
                                <span className="font-bold text-slate-900">{defaultBank.account_type}</span>
                            </div>
                            <div className="flex">
                                <span className="text-slate-400 w-20 shrink-0">口座番号</span>
                                <span className="font-bold text-slate-900 font-mono">{defaultBank.account_number}</span>
                            </div>
                            <div className="flex col-span-2">
                                <span className="text-slate-400 w-20 shrink-0">口座名義</span>
                                <span className="font-bold text-slate-900">{defaultBank.account_name}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Notes */}
                {(invoice.notes || paymentUrlForDocument) && (
                    <div className="border-t border-slate-200 pt-4 mb-6">
                        <p className="text-xs font-bold text-slate-400 mb-2">備考</p>
                        {invoice.notes && (
                            <p className="text-sm text-slate-600 whitespace-pre-wrap">{invoice.notes}</p>
                        )}
                        {paymentUrlForDocument && (
                            <div className={invoice.notes ? 'mt-3' : undefined}>
                                <p className="text-xs font-bold text-slate-500 mb-2">クレジットカード決済</p>
                                <a
                                    href={paymentUrlForDocument}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center rounded-md border border-indigo-300 bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-700 underline underline-offset-2 print:border-slate-500 print:bg-white print:text-slate-900"
                                >
                                    クレジットカードで支払う ↗
                                </a>
                                <p className="mt-2 text-[10px] leading-relaxed text-slate-500 break-all">
                                    URL（コピー用）：{paymentUrlForDocument}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Footer: Stamp and Company Info */}
                <div className="flex items-end justify-end border-t border-slate-200 pt-6">
                    <div className="flex flex-col items-center gap-2">
                        {companySettings?.stamp_url && (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={companySettings.stamp_url} alt="社印" className="w-20 h-20 object-contain" />
                        )}
                        <p className="text-xs font-bold text-slate-600">{issuerName}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
