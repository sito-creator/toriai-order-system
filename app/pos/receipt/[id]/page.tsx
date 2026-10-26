import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import { PosLine, posTotals } from '@/utils/pos';
import PrintReceipt from './print';

export default async function Receipt({ params }: { params: Promise<{ id: string }> }) {
    const db = await createClient();
    const { data: { user } } = await db.auth.getUser();
    if (!user) notFound();
    const { data: profile } = await db.from('profiles').select('company_id').eq('id', user.id).single();
    if (!profile?.company_id) notFound();
    const { id } = await params;
    const { data: sale } = await db.from('pos_sales').select('*').eq('id', id).eq('company_id', profile.company_id).single();
    if (!sale) notFound();
    const lines = sale.lines as PosLine[];
    const totals = posTotals(lines);
    const yen = (n: number) => `¥${n.toLocaleString('ja-JP')}`;
    return <main className="mx-auto max-w-md p-8 text-black"><style>{'@media print { @page { size: A5; margin: 12mm; } .receipt-controls { display: none; } body { background: white !important; } }'}</style><PrintReceipt /><h1 className="my-6 text-center text-2xl font-bold">領収書{sale.status === 'voided' ? '（取消済）' : ''}</h1><p className="text-center font-bold">{sale.issuer.name}</p><p className="text-center text-sm">{sale.issuer.address}</p><p className="my-3 text-sm">登録番号：{sale.issuer.registration_number || '未登録（適格請求書ではありません）'}</p><p className="text-sm">取引日時：{new Date(sale.created_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}</p><p className="break-all text-xs">取引番号：{sale.id}</p><div className="my-5 border-y py-3">{lines.map((l, i) => <div key={i} className="mb-3"><p>{l.name}{l.tax_rate === 8 ? ' ※' : ''}</p><p className="flex justify-between text-sm"><span>{yen(l.price)} × {l.quantity}（税抜）</span><span>{yen(l.price * l.quantity)}</span></p></div>)}</div><p className="flex justify-between text-2xl font-bold"><span>合計</span><span>{yen(sale.total)}</span></p>{totals.taxes.map(t => <p key={t.rate} className="my-2 text-sm">{t.rate}%対象（税込） {yen(t.subtotal + t.tax)} / 消費税 {yen(t.tax)}</p>)}<p className="text-xs">※は軽減税率対象</p><div className="my-5 border-t pt-3"><p>お支払い：現金</p><p>お預かり：{yen(sale.received)}</p><p>お釣り：{yen(sale.change)}</p></div>{sale.status === 'voided' && <p>取消理由：{sale.void_reason}</p>}<p className="mt-8 text-center">ありがとうございました。</p></main>;
}
