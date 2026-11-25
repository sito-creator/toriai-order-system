'use client';
/* eslint-disable @next/next/no-img-element -- Private image endpoints need session cookies; uploads are already resized and encoded as WebP. Blob previews also require a browser image element. */
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowDown, ArrowUp, GripVertical, Plus, Save, Trash2, Star } from 'lucide-react';
import type { CatalogData } from '../../pos/catalog-picker';
import { categoryColors, type PosCategory, type PosDisplaySettings } from '@/utils/pos-catalog';
const field='min-h-11 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm';
const button='inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold disabled:opacity-40';

export default function CatalogSettings({ initial, request=fetch }: { initial: CatalogData; request?: typeof fetch }) {
    const [data,setData]=useState(initial);
    const [prefs,setPrefs]=useState<PosDisplaySettings>(initial.settings);
    const [search,setSearch]=useState('');
    const [page,setPage]=useState(0);
    const [busy,setBusy]=useState(false);
    const lock=useRef(false);
    const [error,setError]=useState('');
    const [message,setMessage]=useState('');
    const [selected,setSelected]=useState<string[]>([]);
    const [bulkCategory,setBulkCategory]=useState('');
    const drag=useRef<number|null>(null);
    const seq=useRef(0);
    const invalidate=useCallback(()=>{seq.current++;},[]);
    const refresh=useCallback(async(q=search,p=page) => {
        const token=++seq.current;
        const r=await request('/api/pos/catalog?'+new URLSearchParams({management:'1',q,page:String(p)}),{cache:'no-store'});
        const next=await r.json();
        if(!r.ok)throw new Error(next.error);
        if(token===seq.current)setData(next);
    },[search,page,request]);
    useEffect(()=>{
        let active=true;
        const timer=setTimeout(()=>void refresh(search,page).catch(e=>{if(active)setError(e.message);}),250);
        return()=>{active=false;clearTimeout(timer);invalidate();};
    },[search,page,refresh,invalidate]);
    async function mutate(operation: string, values: Record<string,unknown>) {
        if(lock.current)return false;
        lock.current=true;setBusy(true);setError('');setMessage('');
        try {
            const r=await request('/api/pos/catalog/manage',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({operation,...values})});
            const result=await r.json();if(!r.ok)throw new Error(result.error);
            await refresh();setMessage('保存しました。POS画面は再読み込みすると反映されます。');setSelected([]);
            return true;
        }catch(e){setError((e as Error).message);return false;}
        finally{lock.current=false;setBusy(false);}
    }
    async function reorder(from:number,to:number) {
        if(from===to||to<0||to>=data.categories.length)return;
        const ids=data.categories.map(c=>c.id);const [id]=ids.splice(from,1);ids.splice(to,0,id);
        await mutate('category-reorder',{ids});
    }
    return <div className="space-y-6">
        <header className="flex flex-wrap justify-between gap-4"><div><Link href="/products" className="mb-3 inline-flex min-h-11 items-center gap-2 text-sm text-slate-500"><ArrowLeft size={16}/>商品管理</Link><h1 className="text-2xl font-bold text-slate-900">カテゴリー・POS表示設定</h1><p className="mt-2 text-sm text-slate-500">事業者共通の設定です。再ログイン後も保持されます。</p></div><Link href="/pos" className={button+' self-end bg-indigo-600 text-white'}>POSレジを開く</Link></header>
        {error&&<p role="alert" className="rounded-xl bg-rose-50 p-4 text-rose-700">{error}</p>}
        {message&&<p role="status" className="rounded-xl bg-emerald-50 p-4 text-emerald-800">{message}</p>}
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-bold">レジの商品カード</h2><p className="mt-1 text-sm text-slate-500">画像のない商品も同じカードサイズで表示します。</p>
            <form onSubmit={async e=>{e.preventDefault();await mutate('settings',{values:prefs});}} className="mt-5">
                <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-3">
                    <label className="space-y-2 text-sm font-semibold"><span className="block">表示形式</span><select aria-label="表示形式" className={field+' w-full'} value={prefs.card_mode} onChange={e=>setPrefs({...prefs,card_mode:e.target.value as PosDisplaySettings['card_mode']})}><option value="image">画像＋商品名＋価格</option><option value="text">商品名＋価格</option><option value="compact">コンパクト表示</option></select></label>
                    <label className="space-y-2 text-sm font-semibold"><span className="block">カードサイズ</span><select aria-label="カードサイズ" className={field+' w-full'} value={prefs.card_size} onChange={e=>setPrefs({...prefs,card_size:e.target.value as PosDisplaySettings['card_size']})}><option value="small">小</option><option value="medium">標準</option><option value="large">大</option></select></label>
                    <label className="space-y-2 text-sm font-semibold"><span className="block">商品の並び順</span><select aria-label="商品の並び順" className={field+' w-full'} value={prefs.product_sort} onChange={e=>setPrefs({...prefs,product_sort:e.target.value as PosDisplaySettings['product_sort']})}><option value="manual">指定した表示順</option><option value="name">商品名順</option><option value="price">価格の低い順</option></select></label>
                    {([['show_images','商品画像を表示'],['show_prices','商品価格を表示'],['favorites_first','よく使う商品を先に表示']] as const).map(([k,label])=><label key={k} className="flex min-h-12 items-center gap-3 text-sm"><input type="checkbox" className="size-5 accent-indigo-600" checked={prefs[k]} onChange={e=>setPrefs({...prefs,[k]:e.target.checked})}/>{label}</label>)}
                    <div className="sm:col-span-3"><button disabled={busy} className={button+' bg-indigo-600 text-white'}><Save size={16}/>表示設定を保存</button></div>
                </fieldset>
            </form>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-bold">カテゴリータブ</h2><p className="mt-1 text-sm leading-6 text-slate-500">PCでは左のハンドルをドラッグ、タッチ操作では上下ボタンで並べ替えできます。非表示はタブのみを隠します。削除しても商品は残り、「未分類」になります。</p>
            <div className="mt-5 space-y-3">
                {data.categories.map((c,i)=><div key={c.id+'-'+c.name+'-'+c.color+'-'+c.is_visible} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();if(drag.current!==null&&!busy)void reorder(drag.current,i);drag.current=null;}}
                    className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 p-3">
                    <span draggable={!busy} onDragStart={e=>{drag.current=i;e.dataTransfer.setData('text/plain',c.id);}} onDragEnd={()=>{drag.current=null;}} className="cursor-grab p-2 text-slate-400" aria-label={c.name+'の並べ替えハンドル'}><GripVertical size={20}/></span>
                    <div className="flex gap-1"><button className={button} disabled={busy||i===0} aria-label={c.name+'を上へ'} onClick={()=>void reorder(i,i-1)}><ArrowUp size={16}/></button><button className={button} disabled={busy||i===data.categories.length-1} aria-label={c.name+'を下へ'} onClick={()=>void reorder(i,i+1)}><ArrowDown size={16}/></button></div>
                    <CategoryForm initial={c} busy={busy} save={values=>mutate('category-save',{id:c.id,values})}/>
                    <button disabled={busy} aria-label={c.name+'を削除'} className={button+' text-rose-600'} onClick={()=>{if(window.confirm(`「${c.name}」を削除しますか？商品は削除されず未分類になります。`))void mutate('category-delete',{id:c.id});}}><Trash2 size={16}/></button>
                </div>)}
                {!data.categories.length&&<p className="py-5 text-sm text-slate-500">カテゴリーを作成するとPOSのタブに表示されます。</p>}
            </div>
            <div className="mt-5 rounded-xl bg-slate-50 p-3"><p className="mb-3 text-sm font-semibold">カテゴリーを追加</p><CategoryForm busy={busy} save={values=>mutate('category-save',{values})}/></div>
        </section>
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="space-y-4 p-5"><h2 className="text-lg font-bold">商品との紐付け・一括変更</h2>
                <input type="search" aria-label="管理商品の検索" placeholder="商品名・商品コードで検索" className={field+' w-full'} value={search} onChange={e=>{setSearch(e.target.value);setPage(0);setSelected([]);}}/>
                <div className="flex flex-wrap items-center gap-3 rounded-xl bg-indigo-50 p-3"><span className="text-sm font-semibold">{selected.length}件選択中</span><select aria-label="一括変更先カテゴリー" className={field} value={bulkCategory} onChange={e=>setBulkCategory(e.target.value)}><option value="">未分類</option>{data.categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
                    <button className={button+' bg-white'} disabled={busy||!selected.length} onClick={()=>void mutate('products',{ids:selected,values:{category_id:bulkCategory||null}})}>カテゴリーを一括変更</button>
                    <button className={button+' bg-white'} disabled={busy||!selected.length} onClick={()=>void mutate('products',{ids:selected,values:{pos_visible:true}})}>POSに表示</button>
                    <button className={button+' bg-white'} disabled={busy||!selected.length} onClick={()=>void mutate('products',{ids:selected,values:{pos_visible:false}})}>POSで非表示</button>
                </div>
            </div>
            <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-slate-50 text-slate-500"><tr><th className="p-3"><input aria-label="このページの商品をすべて選択" type="checkbox" className="size-5" checked={!!data.products.length&&selected.length===data.products.length} onChange={e=>setSelected(e.target.checked?data.products.map(p=>p.id):[])}/></th><th className="p-3">商品</th><th className="p-3">カテゴリー</th><th className="p-3">POS表示</th><th className="p-3">よく使う</th><th className="p-3">表示順</th></tr></thead>
                <tbody>{data.products.map(p=><tr key={p.id} className="border-t border-slate-100"><td className="p-3"><input aria-label={p.name+'を選択'} disabled={busy} type="checkbox" className="size-5" checked={selected.includes(p.id)} onChange={e=>setSelected(e.target.checked?[...selected,p.id]:selected.filter(id=>id!==p.id))}/></td>
                    <td className="p-3"><Link href={'/products/'+p.id} className="inline-flex min-h-12 items-center gap-3 font-semibold text-slate-800">{p.image_url&&<img src={p.image_url} alt="" loading="lazy" className="size-12 rounded-lg object-cover"/>}{p.name}</Link></td>
                    <td className="p-3"><select aria-label={p.name+'のカテゴリー'} disabled={busy} className={field+' max-w-40'} value={p.category_id||''} onChange={e=>void mutate('products',{ids:[p.id],values:{category_id:e.target.value||null}})}><option value="">未分類</option>{data.categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></td>
                    <td className="p-3"><input aria-label={p.name+'のPOS表示'} disabled={busy} className="size-5 accent-indigo-600" type="checkbox" checked={p.pos_visible} onChange={e=>void mutate('products',{ids:[p.id],values:{pos_visible:e.target.checked}})}/></td>
                    <td className="p-3"><button aria-label={p.name+'の優先表示'} aria-pressed={p.pos_favorite} disabled={busy} className={button} onClick={()=>void mutate('products',{ids:[p.id],values:{pos_favorite:!p.pos_favorite}})}><Star size={18} className={p.pos_favorite?'fill-amber-400 text-amber-500':'text-slate-400'}/></button></td>
                    <td className="p-3"><input key={p.pos_sort_order} aria-label={p.name+'の表示順'} disabled={busy} type="number" min="0" max="1000000" defaultValue={p.pos_sort_order} className={field+' w-24'} onBlur={e=>{const n=Number(e.target.value);if(n!==p.pos_sort_order)void mutate('products',{ids:[p.id],values:{pos_sort_order:n}});}}/></td>
                </tr>)}</tbody>
            </table></div>
            {!data.products.length&&<p className="p-6 text-center text-slate-500">該当する商品がありません。</p>}
            <div className="flex justify-between p-4"><button className={button} disabled={busy||page===0} onClick={()=>{setPage(x=>x-1);setSelected([]);}}>前へ</button><span className="p-3 text-sm text-slate-500">{page+1} / {Math.max(1,Math.ceil(data.total/data.pageSize))}</span><button className={button} disabled={busy||(page+1)*data.pageSize>=data.total} onClick={()=>{setPage(x=>x+1);setSelected([]);}}>次へ</button></div>
        </section>
    </div>;
}
function CategoryForm({initial,busy,save}:{initial?:PosCategory;busy:boolean;save:(v:Record<string,unknown>)=>Promise<boolean>}) {
    async function submit(e:FormEvent<HTMLFormElement>) {
        e.preventDefault();const form=e.currentTarget;const f=new FormData(form);
        if(await save({name:f.get('name'),color:f.get('color'),is_visible:f.get('visible')==='on'}))if(!initial)form.reset();
    }
    return <form onSubmit={submit} className="min-w-0 flex-1"><fieldset disabled={busy} className="flex flex-wrap items-center gap-3">
        <input name="color" aria-label={(initial?.name||'新規カテゴリー')+'の色'} type="color" defaultValue={initial?.color||categoryColors[0]} className="size-11 cursor-pointer rounded-lg border bg-white p-1"/>
        <input name="name" aria-label={initial?'カテゴリー名を変更':'新規カテゴリー名'} required maxLength={60} defaultValue={initial?.name||''} placeholder="例：カット・カラー・店販商品" className={field+' min-w-32 flex-1'}/>
        <label className="flex min-h-11 items-center gap-2 text-sm"><input name="visible" type="checkbox" defaultChecked={initial?.is_visible!==false} className="size-5 accent-indigo-600"/>タブ表示</label>
        <button className={button+' bg-white'}>{initial?<Save size={16}/>:<Plus size={16}/>}<span>{initial?'保存':'追加'}</span></button>
    </fieldset></form>;
}
