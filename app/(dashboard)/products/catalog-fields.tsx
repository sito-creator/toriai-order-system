'use client';
/* eslint-disable @next/next/no-img-element -- Private image endpoints need session cookies; uploads are already resized and encoded as WebP. Blob previews also require a browser image element. */
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Camera, X } from 'lucide-react';
import type { PosCategory } from '@/utils/pos-catalog';

export default function ProductCatalogFields({ categories, enabled, schemaReady, initial }: {
    categories: PosCategory[]; enabled: boolean; schemaReady: boolean;
    initial?: { category_id?: string | null; category?: string; image_url?: string | null; pos_visible?: boolean; pos_favorite?: boolean; pos_sort_order?: number };
}) {
    const input = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState(initial?.image_url || '');
    const [error, setError] = useState('');
    const [removed, setRemoved] = useState(false);
    const blob = useRef<string | null>(null);
    useEffect(() => () => { if (blob.current) URL.revokeObjectURL(blob.current); }, []);
    if (!schemaReady) return <div className="space-y-2 md:col-span-2">
        <label className="block text-sm font-bold">カテゴリー
            <input name="category" defaultValue={initial?.category || ''} className="mt-2 min-h-12 w-full rounded-xl border p-3" />
        </label>
        <p className="text-sm text-amber-800">画像・POS表示設定を使うには、POSカタログのマイグレーション適用が必要です。</p>
    </div>;
    return <section className="space-y-5 border-t border-slate-100 pt-6 md:col-span-2">
        {enabled ? <input type="hidden" name="catalog_fields" value="1" /> : <input type="hidden" name="category" value={initial?.category || ''}/>}
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold">商品画像・POS表示</h2>
            {enabled && <Link href="/products/pos-settings" className="text-sm font-semibold text-indigo-600 underline">カテゴリー・レジ表示設定</Link>}</div>
        {!enabled && <p className="text-sm text-slate-500">画像・カテゴリー・POS表示設定は会社管理者が変更できます。</p>}
        <div className="grid gap-5 sm:grid-cols-[160px_1fr]">
            <div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl border bg-slate-50">
                {preview ? <img src={preview} alt="商品画像プレビュー" className="h-full w-full object-contain" onError={() => setError('保存済み画像を読み込めませんでした。')} /> : <Camera className="text-slate-300" size={38} />}
            </div>
            <div className="space-y-3">
                <label className="block font-semibold">商品画像
                    <input ref={input} disabled={!enabled} name="product_image" type="file" accept="image/jpeg,image/png,image/webp" className="mt-2 block w-full rounded-lg border p-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:p-2 file:text-indigo-700"
                        onChange={event => {
                            const file = event.target.files?.[0]; setError('');
                            if (!file) return;
                            if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024) {
                                setError('JPEG・PNG・WebP（8MB以内）を選択してください。'); event.target.value = ''; return;
                            }
                            if (blob.current) URL.revokeObjectURL(blob.current);
                            blob.current = URL.createObjectURL(file); setPreview(blob.current); setRemoved(false);
                        }} />
                </label>
                <p className="text-xs leading-6 text-slate-500">JPEG・PNG・WebP／8MB以内。保存時に最大800pxのWebPへ圧縮します。画像なしでも同じサイズの商品カードを表示します。</p>
                {preview && enabled && <button type="button" onClick={() => { setPreview(''); setRemoved(true); if(input.current) input.current.value=''; }} className="inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm text-rose-600"><X size={16}/>画像を削除</button>}
                <input type="hidden" name="remove_product_image" value={removed ? '1' : '0'} />
                {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
            </div>
        </div>
        <label className="block text-sm font-semibold">カテゴリー
            <select name="category_id" disabled={!enabled} defaultValue={initial?.category_id || ''} className="mt-2 min-h-12 w-full rounded-xl border bg-white p-3">
                <option value="">未分類</option>{categories.map(cat => <option value={cat.id} key={cat.id}>{cat.name}{!cat.is_visible ? '（タブ非表示）' : ''}</option>)}
            </select>
        </label>
        <div className="flex flex-wrap gap-5">
            <label className="flex min-h-11 items-center gap-3"><input disabled={!enabled} type="checkbox" name="pos_visible" defaultChecked={initial?.pos_visible !== false} className="size-5 accent-indigo-600"/>POSに表示する</label>
            <label className="flex min-h-11 items-center gap-3"><input disabled={!enabled} type="checkbox" name="pos_favorite" defaultChecked={initial?.pos_favorite} className="size-5 accent-indigo-600"/>よく使う商品</label>
            <label className="flex items-center gap-3">表示順<input disabled={!enabled} type="number" name="pos_sort_order" min="0" max="1000000" defaultValue={initial?.pos_sort_order || 0} className="min-h-11 w-28 rounded-xl border p-2"/></label>
        </div>
    </section>;
}
