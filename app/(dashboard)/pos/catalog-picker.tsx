'use client';
/* eslint-disable @next/next/no-img-element -- Private image endpoints need session cookies; uploads are already resized and encoded as WebP. Blob previews also require a browser image element. */
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Search, Star, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';
import type { CatalogProduct, PosCategory, PosDisplaySettings } from '@/utils/pos-catalog';
import { stockAllows, categoryTextColor } from '@/utils/pos-catalog';
export type CatalogData = { products: CatalogProduct[]; categories: PosCategory[]; settings: PosDisplaySettings;
    schemaReady: boolean; canManage: boolean; total: number; page: number; pageSize: number };
const yen = (n: number) => '¥' + n.toLocaleString('ja-JP');
export default function CatalogPicker({ initial, disabled, onAdd, onProducts, quantity, inventory, renderInventory, request = fetch }: {
    initial: CatalogData; request?: typeof fetch; disabled: boolean; onAdd: (p: CatalogProduct) => void;
    onProducts: (p: CatalogProduct[]) => void; quantity: (id: string) => number;
    inventory?: boolean; renderInventory?: (p: CatalogProduct) => ReactNode;
}) {
    const [data, setData] = useState(initial);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('all');
    const [page, setPage] = useState(0);
    const [loading, setLoading] = useState(Boolean(inventory));
    const [error, setError] = useState('');
    const [revision, setRevision] = useState(0);
    const firstLoad = useRef(true);
    const previousSearch = useRef('');
    useEffect(() => {
        // The server already fetched this exact register page. Do not block its
        // ready-to-use cards on a second auth + catalog round-trip.
        if (firstLoad.current) {
            firstLoad.current = false;
            if (!inventory) return;
        }
        const searchChanged = previousSearch.current !== search;
        previousSearch.current = search;
        const abort = new AbortController();
        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const qs = new URLSearchParams({ q: search, category, page: String(page), ...(inventory ? { inventory: '1' } : {}) });
                const r = await request('/api/pos/catalog?' + qs, { cache: 'no-store', signal: abort.signal });
                const next = await r.json(); if (!r.ok) throw new Error(next.error);
                if (!abort.signal.aborted) { setData(next); onProducts(next.products); setError(''); }
            } catch(e) { if (!abort.signal.aborted) setError((e as Error).message); }
            finally { if(!abort.signal.aborted) setLoading(false); }
        }, searchChanged ? 220 : 0);
        return () => { abort.abort(); clearTimeout(timer); };
    }, [search, category, page, inventory, onProducts, revision, request]);
    useEffect(() => {
        const refresh = () => setRevision(x => x + 1);
        window.addEventListener('pos-catalog-refresh', refresh);
        return () => window.removeEventListener('pos-catalog-refresh', refresh);
    }, []);
    const prefs = data.settings;
    const compact = prefs.card_mode === 'compact';
    const hasImages = prefs.show_images && prefs.card_mode === 'image';
    const min = { small: 112, medium: 140, large: 174 }[prefs.card_size];
    return <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 lg:p-5" aria-label={inventory ? '在庫商品一覧' : '商品メニュー'}>
        <div className="mb-4 flex items-center gap-2">
            <label className="relative min-w-0 flex-1"><Search size={19} className="absolute left-3 top-3.5 text-slate-400"/>
                <input aria-label="商品検索" type="search" placeholder="商品名・商品コードで検索" value={search} onChange={e=>{setSearch(e.target.value);setPage(0);}}
                    className="min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"/></label>
            {data.canManage && <Link href="/products/pos-settings" aria-label="カテゴリー・表示設定" className="flex size-12 shrink-0 items-center justify-center rounded-xl border text-slate-500 hover:text-indigo-600"><SlidersHorizontal size={19}/></Link>}
        </div>
        <div role="tablist" aria-label="商品カテゴリー" className="mb-4 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:thin]">
            {[{id:'all',name:'すべて',color:'#4F46E5'},...data.categories.filter(c=>c.is_visible),{id:'uncategorized',name:'未分類',color:'#64748B'}].map(c=>
                <button type="button" role="tab" aria-selected={category===c.id} key={c.id} onClick={()=>{setCategory(c.id);setPage(0);}}
                    style={{'--tab-color':c.color, color:category===c.id?categoryTextColor(c.color):undefined} as CSSProperties}
                    className={`min-h-12 shrink-0 rounded-xl border px-4 text-sm font-bold transition-colors ${category===c.id?'border-[var(--tab-color)] bg-[var(--tab-color)] text-white shadow-sm':'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>{c.name}</button>)}
        </div>
        {!data.schemaReady && <p role="status" className="mb-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">従来の商品一覧を表示中です。画像・タブ設定にはデータベースの更新が必要です。</p>}
        <div className="mb-4 flex flex-wrap justify-between gap-2 text-xs text-slate-500"><span>{data.total.toLocaleString()}商品 ・ 表示価格は税抜</span><span aria-live="polite">{loading?'読み込み中…':error?'読込エラー':`${data.page+1} / ${Math.max(1,Math.ceil(data.total/data.pageSize))}ページ`}</span></div>
        {error && <p role="alert" className="mb-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}<button className="ml-2 underline" onClick={()=>setRevision(x=>x+1)}>再試行</button></p>}
        <div role="tabpanel" aria-label="商品カード一覧" aria-busy={loading} className={inventory ? 'space-y-2' : 'grid gap-3'}
            style={inventory ? undefined : {gridTemplateColumns:`repeat(auto-fill,minmax(min(100%,${min}px),1fr))`}}>
            {data.products.map(p=>inventory ? renderInventory?.(p) : <ProductCard key={p.id+'-'+p.image_url} p={p} compact={compact} size={prefs.card_size} images={hasImages} prices={prefs.show_prices} count={quantity(p.id)}
                disabled={disabled||loading||!!error||!stockAllows(p,quantity(p.id)+1)} add={()=>onAdd(p)} categories={data.categories}/>)}
        </div>
        {!loading && !error && !data.products.length && <div className="py-16 text-center"><p className="font-semibold text-slate-700">該当する商品がありません</p><p className="mt-2 text-sm text-slate-500">検索条件、カテゴリー、商品のPOS表示設定をご確認ください。</p><button className="mt-4 min-h-11 rounded-lg border px-4" onClick={()=>{setSearch('');setCategory('all');setPage(0);}}>絞り込みを解除</button></div>}
        <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <button className="flex min-h-12 items-center gap-1 rounded-xl border px-4 disabled:opacity-30" disabled={loading||page===0} onClick={()=>setPage(x=>x-1)}><ChevronLeft size={18}/>前へ</button>
            <button className="flex min-h-12 items-center gap-1 rounded-xl border px-4 disabled:opacity-30" disabled={loading||(page+1)*data.pageSize>=data.total} onClick={()=>setPage(x=>x+1)}>次へ<ChevronRight size={18}/></button>
        </div>
    </section>;
}
function ProductCard({p,compact,size,images,prices,count,disabled,add,categories}:{p:CatalogProduct;compact:boolean;size:PosDisplaySettings['card_size'];images:boolean;prices:boolean;count:number;disabled:boolean;add:()=>void;categories:PosCategory[]}) {
    const [failed,setFailed]=useState(false);
    const color=categories.find(c=>c.id===p.category_id)?.color || '#64748B';
    return <button aria-label={`${p.name}を追加`} onClick={add} disabled={disabled} style={{height:compact?96:{small:208,medium:240,large:288}[size]}}
        className={`relative flex w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left transition hover:border-indigo-400 hover:shadow-md active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-40 ${compact?'justify-center px-3':''}`}>
        {count>0&&<span className="absolute right-2 top-2 z-10 flex size-7 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white shadow-sm">{count}</span>}
        {!compact && images && p.image_url && !failed ? <img src={p.image_url} alt="" loading="lazy" decoding="async" onError={()=>setFailed(true)} style={{height:{small:64,medium:96,large:144}[size]}} className="w-full shrink-0 bg-slate-50 object-cover"/> : !compact && <div className="flex flex-1 items-center px-4 pt-4"><span className="line-clamp-3 text-lg font-bold leading-snug text-slate-800">{p.name}</span></div>}
        <div className={compact?'':'flex flex-1 flex-col justify-end p-3'}>
            {(!compact&&images&&p.image_url&&!failed||compact)&&<p className="line-clamp-2 text-sm font-bold leading-snug text-slate-800">{p.name}</p>}
            {!compact&&<p className="mt-1 truncate text-xs font-medium" style={{color}}>{p.pos_favorite&&<Star size={12} className="mr-1 inline fill-current"/>}{p.category}</p>}
            {prices&&<p className={`${compact?'mt-1 text-sm':'mt-2 text-lg'} font-bold tabular-nums text-slate-900`}>{yen(p.price)}<span className="ml-1 text-[10px] font-normal text-slate-400">{p.tax_rate}%</span></p>}
            {p.track_inventory&&<p className="mt-1 text-xs text-slate-500">{p.stock ? `在庫 ${p.stock}` : '在庫なし'}</p>}
        </div>
    </button>;
}
