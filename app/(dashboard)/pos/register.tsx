'use client';
import { useEffect, useRef, useState } from 'react';
import { posTotals, PosLine } from '@/utils/pos';

type Product = { id:string; name:string; price:number; tax_rate:number; category:string; stock:number|null; track_inventory:boolean };
type Sale = { id:string; created_at:string; lines:PosLine[]; total:number; received:number; change:number; status:string; payment_method:string; checkout_url?:string };
const yen = (n:number) => `¥${n.toLocaleString('ja-JP')}`;
const day = (d:string) => new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo'}).format(new Date(d));
const btn = 'rounded-xl px-4 py-3 font-bold disabled:opacity-40';
const label = (s:Sale) => s.status==='pending'?'カード・決済待ち':s.status==='voided'?'取消済':`${s.payment_method==='card'?'カード':'現金'}・会計済`;

export default function PosRegister({products:initial}:{products:Product[]}) {
    const [products,setProducts]=useState(initial);
    const [cart,setCart]=useState<PosLine[]>([]);
    const [search,setSearch]=useState('');
    const [received,setReceived]=useState('');
    const [method,setMethod]=useState('cash');
    const [sales,setSales]=useState<Sale[]>([]);
    const [receipt,setReceipt]=useState<Sale|null>(null);
    const [error,setError]=useState('');
    const [busy,setBusy]=useState(false);
    const [tab,setTab]=useState('register');
    const [date,setDate]=useState(day(new Date().toISOString()));
    const pending=useRef<string|null>(null);
    const locked=useRef(false);
    let totals={subtotal:0,tax:0,total:0,taxes:[] as {rate:number;subtotal:number;tax:number}[]};
    let calcError='';
    try {totals=posTotals(cart);} catch(e) {calcError=(e as Error).message;}
    const paid=Number(received);
    async function load() {
        try {
            const r=await fetch('/api/pos',{cache:'no-store'}); const d=await r.json();
            if(!r.ok)throw new Error(d.error);
            setSales(d.sales);
            if(d.products)setProducts(prev=>prev.map(p=>({...p,...d.products.find((x:Product)=>x.id===p.id)})));
        } catch(e){setError((e as Error).message);}
    }
    useEffect(()=>{
        void load();
        const id=new URLSearchParams(window.location.search).get('payment');
        if(id)void fetch('/api/pos',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error);setReceipt(d.sale);void load();}).catch(e=>setError(e.message));
    },[]);
    const pollingId=receipt?.status==='pending'?receipt.id:null;
    useEffect(()=>{
        if(!pollingId)return;
        let active=true;
        const timer=setInterval(async()=>{
            try {
                const r=await fetch('/api/pos',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:pollingId})}); const d=await r.json();
                if(!r.ok)throw new Error(d.error);
                if(active){setReceipt(d.sale);if(d.sale.status!=='pending')void load();}
            }catch(e){if(active)setError((e as Error).message);}
        },10000);
        return()=>{active=false;clearInterval(timer);};
    },[pollingId]);
    function add(p:Product) {
        if(busy||pending.current)return;
        setCart(prev=>prev.some(x=>x.product_id===p.id)?prev.map(x=>x.product_id===p.id?{...x,quantity:Math.min(999,x.quantity+1)}:x):[...prev,{product_id:p.id,name:p.name,price:p.price,quantity:1,tax_rate:p.tax_rate}]);
    }
    async function checkout() {
        if(locked.current)return;
        locked.current=true;setBusy(true);setError(''); pending.current ||= crypto.randomUUID();
        try {
            const r=await fetch('/api/pos',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:pending.current,lines:cart,received:paid,expected_total:totals.total,payment_method:method})});const d=await r.json();
            if(!r.ok){if(d.retryable===false)pending.current=null;throw new Error(d.error);}
            setReceipt(d.sale);setCart([]);setReceived('');pending.current=null;await load();
        }catch(e){setError((e as Error).message);}finally{locked.current=false;setBusy(false);}
    }
    async function check(s:Sale) {
        setBusy(true);setError('');
        try {const r=await fetch('/api/pos',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:s.id})});const d=await r.json();if(!r.ok)throw new Error(d.error);setReceipt(d.sale);await load();}
        catch(e){setError((e as Error).message);}finally{setBusy(false);}
    }
    async function cancel(s:Sale) {
        const reason=window.prompt('取消理由を入力してください。現金会計の場合は返金を別途行ってください。');if(!reason?.trim())return;
        setBusy(true);setError('');
        try {const r=await fetch('/api/pos',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:s.id,reason})});const d=await r.json();if(!r.ok)throw new Error(d.error);if(receipt?.id===s.id)setReceipt(d.sale);await load();}
        catch(e){setError((e as Error).message);}finally{setBusy(false);}
    }
    async function saveInventory(p:Product,track:boolean,stock:number) {
        setBusy(true);setError('');
        try {const r=await fetch('/api/pos/inventory',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:p.id,track_inventory:track,stock,previous_stock:p.stock})});const d=await r.json();if(!r.ok)throw new Error(d.error);await load();}
        catch(e){setError((e as Error).message);}finally{setBusy(false);}
    }
    const daily=sales.filter(s=>day(s.created_at)===date);
    const valid=daily.filter(s=>s.status==='paid');
    return <div className="space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-3xl font-bold">POSレジ</h1><p className="mt-2 text-slate-500">サービス・商品の店頭会計</p></div><div className="flex flex-wrap gap-2">{[['register','会計'],['history','売上・日計'],['inventory','在庫設定']].map(([id,title])=><button key={id} onClick={()=>setTab(id)} className={`${btn} ${tab===id?'bg-indigo-600 text-white':'border bg-white'}`}>{title}</button>)}</div></header>
        {(error||calcError)&&<div role="alert" className="rounded-xl bg-rose-50 p-4 text-rose-700">{error||calcError} <button className="underline" onClick={load}>再読み込み</button></div>}
        {tab==='register'&&<div className="grid gap-6 xl:grid-cols-[1fr_420px]">
            <section className="rounded-2xl border bg-white p-5"><input aria-label="メニュー検索" placeholder="商品・サービスを検索" value={search} onChange={e=>setSearch(e.target.value)} className="mb-5 w-full rounded-xl border p-4"/><p className="mb-4 text-sm text-slate-500">表示価格は税抜です。消費税は税率ごとに切り捨てます。</p><div className="grid grid-cols-2 gap-3 md:grid-cols-3">{products.filter(p=>p.name.includes(search)||p.category.includes(search)).map(p=><button key={p.id} disabled={busy||!!pending.current||(p.track_inventory&&!p.stock)} onClick={()=>add(p)} className="min-h-32 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 text-left hover:bg-indigo-100 disabled:opacity-40"><span className="text-xs text-indigo-600">{p.category}</span><p className="my-2 font-bold">{p.name}</p><p className="text-xl font-bold">{yen(p.price)} <small className="text-xs font-normal">税率{p.tax_rate}%</small></p>{p.track_inventory&&<p className="mt-2 text-sm">在庫 {p.stock||0}</p>}</button>)}</div>{!products.length&&<p className="p-8 text-center">商品管理で販売中の商品・サービスを登録してください。</p>}</section>
            <section className="rounded-2xl border bg-white p-5"><h2 className="mb-4 text-xl font-bold">お会計</h2>{cart.map(x=><div key={x.product_id} className="mb-4 border-b pb-4"><p className="font-bold">{x.name}</p><div className="mt-2 flex items-center justify-between"><span>{yen(x.price*x.quantity)}</span><div className="flex items-center gap-3"><button aria-label={`${x.name}を減らす`} disabled={busy||!!pending.current} className="rounded-lg border px-4 py-2" onClick={()=>setCart(cart.flatMap(l=>l.product_id!==x.product_id?[l]:l.quantity>1?[{...l,quantity:l.quantity-1}]:[]))}>−</button><span>{x.quantity}</span><button aria-label={`${x.name}を増やす`} disabled={busy||!!pending.current} className="rounded-lg border px-4 py-2" onClick={()=>add(products.find(p=>p.id===x.product_id)!)}>＋</button></div></div></div>)}
                <dl className="my-5 space-y-2"><div className="flex justify-between"><dt>小計</dt><dd>{yen(totals.subtotal)}</dd></div>{totals.taxes.map(x=><div key={x.rate} className="flex justify-between text-sm text-slate-500"><dt>消費税 {x.rate}%</dt><dd>{yen(x.tax)}</dd></div>)}<div className="flex justify-between border-t pt-4 text-3xl font-bold"><dt>合計</dt><dd>{yen(totals.total)}</dd></div></dl>
                <label className="block font-bold">支払方法<select value={method} disabled={busy||!!pending.current} onChange={e=>setMethod(e.target.value)} className="my-3 w-full rounded-xl border p-4"><option value="cash">現金</option><option value="card">クレジットカード（Stripe）</option></select></label>
                {method==='cash'?<><label className="block font-bold">現金お預かり<input type="number" min="0" max="99999999" step="1" value={received} disabled={busy||!!pending.current} onChange={e=>setReceived(e.target.value)} className="my-3 w-full rounded-xl border p-4 text-2xl"/></label><div className="mb-4 flex gap-2">{[totals.total,5000,10000].filter((x,i,a)=>x>=totals.total&&a.indexOf(x)===i).map(n=><button key={n} disabled={busy||!!pending.current} className="rounded-lg bg-slate-100 p-3" onClick={()=>setReceived(String(n))}>{yen(n)}</button>)}</div><div className="mb-5 flex justify-between rounded-xl bg-emerald-50 p-4 text-xl font-bold text-emerald-800"><span>お釣り</span><span>{yen(Math.max(0,paid-totals.total))}</span></div></>:<p className="mb-4 text-sm text-slate-500">Stripeの決済画面で支払います。支払完了を確認して売上に計上します。店頭カード端末には対応していません。</p>}
                <button onClick={checkout} disabled={busy||!!calcError||!cart.length||!totals.total||(method==='cash'&&(paid<totals.total||!Number.isSafeInteger(paid)||paid>99999999))} className={`${btn} w-full bg-indigo-600 text-white`}>{busy?'処理中…':pending.current?'会計を再試行':method==='card'?'Stripe決済URLを発行':'現金会計を確定'}</button>
            </section></div>}
        {tab==='history'&&<section className="rounded-2xl border bg-white p-5"><label>営業日（日本時間）<input type="date" value={date} onChange={e=>setDate(e.target.value)} className="ml-3 rounded-lg border p-3"/></label><div className="my-6 grid grid-cols-2 gap-4">{['cash','card'].map(m=><div key={m} className="rounded-xl bg-indigo-50 p-5">{m==='cash'?'現金売上':'カード売上'}<p className="text-3xl font-bold">{yen(valid.filter(s=>s.payment_method===m).reduce((sum,s)=>sum+s.total,0))}</p></div>)}</div><p className="mb-4 text-sm text-slate-500">直近300件中の集計。決済待ち・取消済みは売上に含みません。</p>{daily.map(s=><div key={s.id} className="flex flex-wrap items-center justify-between gap-3 border-t py-4"><div><p>{new Date(s.created_at).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo'})} / {label(s)}</p><p className="font-bold">{yen(s.total)}</p></div><div className="flex gap-2"><button disabled={busy} className={`${btn} bg-slate-100`} onClick={()=>s.status==='pending'?check(s):setReceipt(s)}>{s.status==='pending'?'決済状況・URL':'レシート'}</button>{(s.status==='pending'||(s.status==='paid'&&s.payment_method==='cash'))&&<button disabled={busy} className={`${btn} text-rose-600`} onClick={()=>cancel(s)}>取消</button>}</div></div>)}</section>}
        {tab==='inventory'&&<section className="rounded-2xl border bg-white p-5"><h2 className="text-xl font-bold">物販商品の在庫設定</h2><p className="my-4 text-sm text-slate-500">会社オーナー・管理者が設定できます。サービスは管理なしで利用してください。カード決済待ちの間も在庫を確保します。初期在庫・棚卸し数は確保済み数量を除いた販売可能数で入力してください。</p>{products.map(p=><InventoryRow key={`${p.id}-${p.stock}-${p.track_inventory}`} p={p} busy={busy} save={saveInventory}/>)}</section>}
        {receipt&&<div className="fixed inset-0 z-50 overflow-auto bg-slate-900/50 p-4"><div className="mx-auto max-w-md rounded-2xl bg-white p-6"><button onClick={()=>setReceipt(null)} className={`${btn} mb-4 bg-slate-100`}>閉じる</button><p className="text-center text-xl font-bold">{label(receipt)}</p><p className="my-5 text-center text-3xl font-bold">{yen(receipt.total)}</p>{receipt.status==='pending'?<><p className="mb-4 text-sm">10秒ごとに支払状態を確認します。お客様には以下のURLを案内してください。</p>{receipt.checkout_url&&<><a href={receipt.checkout_url} target="_blank" rel="noopener noreferrer" className={`${btn} block bg-indigo-600 text-center text-white`}>Stripe決済画面を開く</a><input aria-label="Stripe決済URL" readOnly value={receipt.checkout_url} className="my-4 w-full rounded-lg border p-3" onFocus={e=>e.target.select()}/><button className={`${btn} bg-slate-100`} onClick={()=>navigator.clipboard.writeText(receipt.checkout_url!).catch(()=>setError('URL欄を選択してコピーしてください。'))}>URLをコピー</button></>}<button disabled={busy} className={btn} onClick={()=>check(receipt)}>支払状況を確認</button><button disabled={busy} className={`${btn} text-rose-600`} onClick={()=>cancel(receipt)}>未払い会計を取消</button></>:<><a href={`/pos/receipt/${receipt.id}`} target="_blank" rel="noopener noreferrer" className={`${btn} block bg-indigo-600 text-center text-white`}>レシートを開く・印刷</a>{receipt.payment_method==='cash'&&<div className="mt-4"><p>お預かり {yen(receipt.received)}</p><p>お釣り {yen(receipt.change)}</p></div>}{receipt.payment_method==='card'&&receipt.status==='paid'&&<p className="mt-4 text-sm">返金はStripeダッシュボードで対応してください。返金時の在庫自動復元には未対応です。</p>}</>}</div></div>}
    </div>;
}
function InventoryRow({p,busy,save}:{p:Product;busy:boolean;save:(p:Product,track:boolean,stock:number)=>Promise<void>}) {
    const [track,setTrack]=useState(p.track_inventory); const [stock,setStock]=useState(String(p.stock??0));
    return <div className="flex flex-wrap items-center gap-4 border-t py-4"><p className="min-w-48 flex-1 font-bold">{p.name}</p><label className="flex items-center gap-2"><input type="checkbox" checked={track} onChange={e=>setTrack(e.target.checked)} disabled={busy}/>在庫管理する</label><label>販売可能数<input aria-label={`${p.name}の在庫数`} type="number" min="0" max="999999" value={stock} onChange={e=>setStock(e.target.value)} className="ml-2 w-28 rounded-lg border p-3" disabled={busy}/></label><button disabled={busy||stock===''} onClick={()=>save(p,track,Number(stock))} className={`${btn} bg-indigo-600 text-white`}>保存</button></div>;
}
