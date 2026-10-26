'use client';

import { useEffect, useRef, useState } from 'react';
import { posTotals, PosLine } from '@/utils/pos';

type Product = { id: string; name: string; price: number; tax_rate: number; category: string };
type Sale = { id: string; created_at: string; lines: PosLine[]; total: number; received: number; change: number; status: string; issuer: { name?: string; address?: string; registration_number?: string } };
const yen = (n: number) => `¥${n.toLocaleString('ja-JP')}`;
const day = (date: string) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(new Date(date));
const button = 'rounded-xl px-4 py-3 font-bold disabled:opacity-40';

export default function PosRegister({ products }: { products: Product[] }) {
    const [cart, setCart] = useState<PosLine[]>([]);
    const [search, setSearch] = useState('');
    const [received, setReceived] = useState('');
    const [sales, setSales] = useState<Sale[]>([]);
    const [receipt, setReceipt] = useState<Sale | null>(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [tab, setTab] = useState('register');
    const [date, setDate] = useState(day(new Date().toISOString()));
    const pending = useRef<string | null>(null);
    const locked = useRef(false);
    const totals = posTotals(cart);
    const paid = Number(received);
    async function load() {
        try {
            const r = await fetch('/api/pos', { cache: 'no-store' });
            const data = await r.json();
            if (!r.ok) throw new Error(data.error);
            setSales(data.sales);
        } catch (e) { setError((e as Error).message); }
    }
    useEffect(() => { void load(); }, []);
    function add(p: Product) {
        if (busy || pending.current) return;
        setCart(prev => prev.some(x => x.product_id === p.id) ? prev.map(x => x.product_id === p.id ? { ...x, quantity: Math.min(999, x.quantity + 1) } : x) : [...prev, { product_id: p.id, name: p.name, price: p.price, quantity: 1, tax_rate: p.tax_rate }]);
    }
    async function checkout() {
        if (locked.current) return;
        locked.current = true;
        setBusy(true); setError('');
        pending.current ||= crypto.randomUUID();
        try {
            const r = await fetch('/api/pos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: pending.current, lines: cart, received: paid, expected_total: totals.total }) });
            const data = await r.json();
            if (!r.ok) {
                if (data.retryable === false) pending.current = null;
                throw new Error(data.error);
            }
            setReceipt(data.sale); setCart([]); setReceived(''); pending.current = null;
            await load();
        } catch (e) { setError(`${(e as Error).message} 同じ会計を再試行できます。`); }
        finally { setBusy(false); locked.current = false; }
    }
    async function cancel(s: Sale) {
        const reason = window.prompt('取消理由を入力してください。現金の返金は別途行ってください。');
        if (!reason?.trim()) return;
        setBusy(true); setError('');
        try {
            const r = await fetch('/api/pos', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: s.id, reason }) });
            const data = await r.json(); if (!r.ok) throw new Error(data.error);
            await load();
        } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
    }
    const daily = sales.filter(s => day(s.created_at) === date);
    const valid = daily.filter(s => s.status === 'paid');
    return <div className="space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-3xl font-bold">POSレジ</h1><p className="mt-2 text-slate-500">サービス・商品の店頭会計</p></div><div className="flex gap-2">{[['register', '会計'], ['history', '売上・日計']].map(([id, title]) => <button key={id} onClick={() => setTab(id)} className={`${button} ${tab === id ? 'bg-indigo-600 text-white' : 'bg-white border'}`}>{title}</button>)}</div></header>
        {error && <div role="alert" className="rounded-xl bg-rose-50 p-4 text-rose-700">{error} <button onClick={load} className="underline">再読み込み</button></div>}
        {tab === 'register' ? <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
            <section className="rounded-2xl border bg-white p-5"><input aria-label="メニュー検索" placeholder="商品・サービスを検索" value={search} onChange={e => setSearch(e.target.value)} className="mb-5 w-full rounded-xl border p-4" /><p className="mb-4 text-sm text-slate-500">表示価格は税抜です。消費税は税率ごとに切り捨てます。</p><div className="grid grid-cols-2 gap-3 md:grid-cols-3">{products.filter(p => p.name.includes(search) || p.category.includes(search)).map(p => <button disabled={busy || !!pending.current} key={p.id} onClick={() => add(p)} className="min-h-32 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 text-left hover:bg-indigo-100 disabled:opacity-40"><span className="text-xs text-indigo-600">{p.category}</span><p className="my-2 font-bold">{p.name}</p><p className="text-xl font-bold">{yen(p.price)} <small className="text-xs font-normal">税率{p.tax_rate}%</small></p></button>)}</div>{!products.length && <p className="p-8 text-center">商品管理で販売中の商品・サービスを登録してください。</p>}</section>
            <section className="rounded-2xl border bg-white p-5"><h2 className="mb-4 text-xl font-bold">お会計</h2><div className="space-y-4">{cart.map(x => <div key={x.product_id} className="border-b pb-4"><p className="font-bold">{x.name}</p><div className="mt-2 flex items-center justify-between"><span>{yen(x.price * x.quantity)}</span><div className="flex items-center gap-3"><button aria-label={`${x.name}を減らす`} disabled={busy || !!pending.current} className="rounded-lg border px-4 py-2" onClick={() => setCart(cart.flatMap(l => l.product_id !== x.product_id ? [l] : l.quantity > 1 ? [{ ...l, quantity: l.quantity - 1 }] : []))}>−</button><span>{x.quantity}</span><button aria-label={`${x.name}を増やす`} disabled={busy || !!pending.current} className="rounded-lg border px-4 py-2" onClick={() => add(products.find(p => p.id === x.product_id)!)}>＋</button></div></div></div>)}</div><dl className="my-5 space-y-2"><div className="flex justify-between"><dt>小計</dt><dd>{yen(totals.subtotal)}</dd></div>{totals.taxes.map(x => <div key={x.rate} className="flex justify-between text-sm text-slate-500"><dt>消費税 {x.rate}%</dt><dd>{yen(x.tax)}</dd></div>)}<div className="flex justify-between border-t pt-4 text-3xl font-bold"><dt>合計</dt><dd>{yen(totals.total)}</dd></div></dl><label className="block font-bold">現金お預かり<input type="number" min="0" max="99999999" step="1" value={received} disabled={busy || !!pending.current} onChange={e => setReceived(e.target.value)} className="my-3 w-full rounded-xl border p-4 text-2xl" /></label><div className="mb-4 flex gap-2">{[totals.total, 5000, 10000].filter((x, i, a) => x >= totals.total && a.indexOf(x) === i).map(n => <button key={n} disabled={busy || !!pending.current} className="rounded-lg bg-slate-100 p-3" onClick={() => setReceived(String(n))}>{yen(n)}</button>)}</div><div className="mb-5 flex justify-between rounded-xl bg-emerald-50 p-4 text-xl font-bold text-emerald-800"><span>お釣り</span><span>{yen(Math.max(0, paid - totals.total))}</span></div><button onClick={checkout} disabled={busy || !cart.length || paid < totals.total || !Number.isSafeInteger(paid) || paid > 99999999} className={`${button} w-full bg-indigo-600 text-white`}>{busy ? '保存中…' : pending.current ? '会計を再試行' : '現金会計を確定'}</button><p className="mt-3 text-xs text-slate-500">カード・在庫連携は準備中です。</p></section>
        </div> : <section className="rounded-2xl border bg-white p-5"><label>営業日（日本時間）<input type="date" value={date} onChange={e => setDate(e.target.value)} className="ml-3 rounded-lg border p-3" /></label><div className="my-6 grid grid-cols-2 gap-4"><div className="rounded-xl bg-indigo-50 p-5">現金売上<p className="text-3xl font-bold">{yen(valid.reduce((sum, s) => sum + s.total, 0))}</p></div><div className="rounded-xl bg-slate-50 p-5">会計件数<p className="text-3xl font-bold">{valid.length}件</p></div></div><p className="mb-4 text-sm text-slate-500">直近300件を表示。取消済みの会計は集計に含みません。</p>{daily.map(s => <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 border-t py-4"><div><p>{new Date(s.created_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })} / {s.status === 'paid' ? '現金・会計済' : '取消済'}</p><p className="font-bold">{yen(s.total)}</p></div><div className="flex gap-2"><button className={`${button} bg-slate-100`} onClick={() => setReceipt(s)}>レシート</button>{s.status === 'paid' && <button disabled={busy} className={`${button} text-rose-600`} onClick={() => cancel(s)}>取消</button>}</div></div>)}</section>}
        {receipt && <div className="fixed inset-0 z-50 overflow-auto bg-slate-900/50 p-4"><div className="mx-auto max-w-md rounded-2xl bg-white p-6"><div className="mb-5 flex gap-3"><a href={`/pos/receipt/${receipt.id}`} target="_blank" rel="noopener noreferrer" className={`${button} bg-indigo-600 text-white`}>レシートを開く・印刷</a><button onClick={() => setReceipt(null)} className={button}>閉じる</button></div><p className="text-center text-xl font-bold">会計{receipt.status === 'voided' ? '取消済' : '完了'}</p><p className="my-5 text-center text-3xl font-bold">{yen(receipt.total)}</p><p>お預かり {yen(receipt.received)}</p><p>お釣り {yen(receipt.change)}</p></div></div>}
    </div>;
}
