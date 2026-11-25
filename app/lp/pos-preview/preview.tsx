'use client';
import { useCallback, useRef, useState } from 'react';
import PosRegister from '@/app/(dashboard)/pos/register';
import CatalogSettings from '@/app/(dashboard)/products/pos-settings/settings';
import ProductCatalogFields from '@/app/(dashboard)/products/catalog-fields';
import type { CatalogData } from '@/app/(dashboard)/pos/catalog-picker';
import { defaultPosSettings, type CatalogProduct } from '@/utils/pos-catalog';
import { posTotals, type PosLine } from '@/utils/pos';
function id(n:number){return '00000000-0000-4000-8000-'+String(n).padStart(12,'0');}
function artwork(kind:number,color:string) {
    const symbol=kind===0?'<path d="M100 60l80 100M180 60l-80 100" stroke="#8d7e72" stroke-width="8"/><circle cx="100" cy="177" r="23" fill="none" stroke="#8d7e72" stroke-width="8"/><circle cx="180" cy="177" r="23" fill="none" stroke="#8d7e72" stroke-width="8"/>':kind===1?'<rect x="106" y="77" width="90" height="148" rx="25" fill="#f9f6ee"/><rect x="131" y="49" width="40" height="32" rx="5" fill="#393c3b"/><rect x="120" y="130" width="62" height="48" rx="4" fill="#b9c9b3"/><text x="151" y="151" font-size="12" fill="#334438" text-anchor="middle">Toriai</text>':'<ellipse cx="152" cy="185" rx="70" ry="34" fill="#f9f7f2"/><path d="M95 170Q150 70 205 170" fill="#faf2df"/><path d="M110 150Q150 105 190 150" fill="#d5ac8a"/>';
    return 'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="260"><rect width="300" height="260" fill="'+color+'"/><circle cx="250" cy="30" r="120" fill="#ffffff" opacity=".25"/>'+symbol+'</svg>');
}
function seed(): CatalogData {
    const categories=['カット','カラー','トリートメント','ヘッドスパ','店販商品','おすすめ'].map((name,i)=>({id:id(100+i),name,color:['#4F46E5','#DB2777','#059669','#0284C7','#D97706','#7C3AED'][i],sort_order:i,is_visible:true}));
    const names=['デザインカット','前髪カット','キッズカット','リタッチカラー','透明感カラー','集中トリートメント','スカルプヘッドスパ','ボタニカルシャンプー','リペアヘアオイル','カット＆ケアセット','炭酸クレンジング','ホームケアマスク'];
    const cats=[0,0,0,1,1,2,3,4,4,5,3,4];
    const prices=[4500,1100,2800,5500,7700,3300,4400,2800,3200,6800,1650,3800];
    const products: CatalogProduct[]=names.map((name,i)=>({id:id(i+1),name,code:'SAL-'+(i+1),price:prices[i],tax_rate:10,category:categories[cats[i]].name,category_id:categories[cats[i]].id,stock:20,track_inventory:cats[i]===4,image_url:[0,7,8,11].includes(i)?artwork(i===0?0:1,['#e7d8cb','#e7eee2','#eadfce','#e5e5f1'][i%4]):null,pos_visible:true,pos_favorite:i===0||i===7,pos_sort_order:i}));
    return {products,categories,settings:{...defaultPosSettings},schemaReady:true,canManage:true,total:products.length,page:0,pageSize:60};
}
export default function PosPreview() {
    const model=useRef(seed());
    const [view,setView]=useState(seed);
    const sales=useRef<Record<string,unknown>[]>([]);
    const [screen,setScreen]=useState('register');
    const [saved,setSaved]=useState(false);
    const request=useCallback<typeof fetch>(async(input,init)=>{
        const url=new URL(String(input),'http://localhost');
        const b=init?.body?JSON.parse(String(init.body)):{};
        const m=model.current;
        if(url.pathname==='/api/pos/catalog/manage') {
            if(b.operation==='settings')m.settings={...b.values};
            if(b.operation==='category-save') {
                if(b.id) {
                    m.categories=m.categories.map(c=>c.id===b.id?{...c,...b.values}:c);
                    m.products=m.products.map(p=>p.category_id===b.id?{...p,category:b.values.name}:p);
                } else m.categories.push({id:crypto.randomUUID(),sort_order:m.categories.length,...b.values});
            }
            if(b.operation==='category-delete'){
                m.categories=m.categories.filter(c=>c.id!==b.id);
                m.products=m.products.map(p=>p.category_id===b.id?{...p,category_id:null,category:'未分類'}:p);
            }
            if(b.operation==='category-reorder')m.categories=b.ids.map((x:string,i:number)=>({...m.categories.find(c=>c.id===x)!,sort_order:i}));
            if(b.operation==='products')m.products=m.products.map(p=>b.ids.includes(p.id)?{...p,...b.values,category:Object.hasOwn(b.values,'category_id')?m.categories.find(c=>c.id===b.values.category_id)?.name||'未分類':p.category}:p);
            return Response.json({ok:true});
        }
        if(url.pathname==='/api/pos/catalog') {
            const management=url.searchParams.get('management')==='1';
            const q=url.searchParams.get('q')||'',category=url.searchParams.get('category')||'all',page=Number(url.searchParams.get('page')||0);
            const products=m.products.filter(p=>(management||p.pos_visible)&&(p.name.includes(q)||p.code?.includes(q))&&(category==='all'||(category==='uncategorized'?!p.category_id:p.category_id===category)));
            products.sort((a,b)=>(m.settings.favorites_first&&!management?Number(b.pos_favorite)-Number(a.pos_favorite):0)||(m.settings.product_sort==='name'?a.name.localeCompare(b.name,'ja'):m.settings.product_sort==='price'?a.price-b.price:a.pos_sort_order-b.pos_sort_order));
            return Response.json({...m,products:products.slice(page*60,(page+1)*60),total:products.length,page});
        }
        if(url.pathname==='/api/pos/inventory') {
            m.products=m.products.map(p=>p.id===b.id?{...p,...b}:p);return Response.json({ok:true});
        }
        if(url.pathname==='/api/pos'&&init?.method==='POST') {
            let sale=sales.current.find(s=>s.id===b.id);
            if(!sale) {
                const totals=posTotals(b.lines as PosLine[]);
                sale={...b,...totals,created_at:new Date().toISOString(),change:b.received-totals.total,status:b.payment_method==='cash'?'paid':'pending',checkout_url:undefined};
                sales.current.push(sale!);
                for(const line of b.lines as PosLine[])m.products=m.products.map(p=>p.id===line.product_id&&p.track_inventory?{...p,stock:(p.stock||0)-line.quantity}:p);
            }
            return Response.json({sale});
        }
        if(url.pathname==='/api/pos'&&init?.method==='PATCH') {
            const sale=sales.current.find(s=>s.id===b.id);if(sale)sale.status='voided';return Response.json({sale});
        }
        return Response.json({sales:sales.current,products:m.products});
    },[]);
    return <div className="min-h-screen bg-slate-50 text-slate-800">
        <nav className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-2 border-b bg-white px-5 py-3">
            <strong className="text-lg tracking-tight text-indigo-600">Toriai <span className="ml-2 text-xs font-normal text-slate-500">POS改善・検証用デモ</span></strong>
            <div className="flex gap-1">{[['register','レジ'],['settings','管理・カテゴリー'],['product','商品画像']].map(([id,label])=><button key={id} onClick={()=>{setView({...model.current});setScreen(id);}} className={`min-h-11 rounded-xl px-4 text-sm font-semibold ${screen===id?'bg-indigo-600 text-white':'text-slate-600'}`}>{label}</button>)}</div>
        </nav>
        <main className="mx-auto max-w-[1320px] p-4 lg:p-7">
            <p className="mb-5 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-900">テストデータ専用です。実際の決済・データベース保存は行いません。写真枠はテスト用イラストです。</p>
            {screen==='register'&&<PosRegister initialCatalog={view} request={request}/>}
            {screen==='settings'&&<CatalogSettings initial={view} request={request}/>}
            {screen==='product'&&<div className="mx-auto max-w-3xl rounded-2xl border bg-white p-6"><h1 className="mb-2 text-2xl font-bold">商品の編集</h1><p className="text-sm text-slate-500">デザインカット／SAL-1</p><form onSubmit={e=>{e.preventDefault();setSaved(true);}}><ProductCatalogFields enabled schemaReady categories={view.categories} initial={{...view.products[0],image_url:view.products[0].image_url}}/><button className="mt-6 min-h-12 rounded-xl bg-indigo-600 px-6 font-semibold text-white">変更を保存（デモ）</button>{saved&&<p className="mt-3 text-sm text-emerald-700">画像プレビューの表示を確認しました。本番保存は行っていません。</p>}</form></div>}
        </main>
    </div>;
}
