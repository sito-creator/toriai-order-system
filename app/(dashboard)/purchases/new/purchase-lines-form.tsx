'use client';

import { useState, useRef } from 'react';
import { Plus, Trash2, Package } from 'lucide-react';

type SupplierProduct = {
    id: string;
    supplier_product_name: string;
    supplier_product_code: string | null;
    purchase_price: number | null;
    tax_rate: number | null;
    unit: string | null;
    supplier_id: string | null;
    supplier_name?: string;
};

type Line = {
    supplier_product_id: string;
    product_name: string;
    quantity: number;
    unit: string;
    unit_price: number;
    amount: number;
    tax_rate: number;
    tax_amount: number;
};

export default function PurchaseLinesForm({ 
    supplierProducts, 
    selectedSupplierId 
}: { 
    supplierProducts: SupplierProduct[];
    selectedSupplierId?: string;
}) {
    const [lines, setLines] = useState<Line[]>([]);
    const [supplierId, setSupplierId] = useState(selectedSupplierId || '');

    // 選択中の仕入先の商品だけフィルタリング
    const filteredProducts = supplierId 
        ? supplierProducts.filter(sp => sp.supplier_id === supplierId)
        : supplierProducts;

    const addLine = () => {
        setLines(prev => [...prev, {
            supplier_product_id: '',
            product_name: '',
            quantity: 1,
            unit: '個',
            unit_price: 0,
            amount: 0,
            tax_rate: 10,
            tax_amount: 0,
        }]);
    };

    const removeLine = (index: number) => {
        setLines(prev => prev.filter((_, i) => i !== index));
    };

    const updateLine = (index: number, field: keyof Line, value: any) => {
        setLines(prev => {
            const updated = [...prev];
            const line = { ...updated[index] };

            if (field === 'supplier_product_id') {
                const sp = supplierProducts.find(p => p.id === value);
                if (sp) {
                    line.supplier_product_id = sp.id;
                    line.product_name = sp.supplier_product_name;
                    line.unit_price = Number(sp.purchase_price) || 0;
                    line.tax_rate = Number(sp.tax_rate) || 10;
                    line.unit = sp.unit || '個';
                    line.amount = line.quantity * line.unit_price;
                    line.tax_amount = Math.floor(line.amount * line.tax_rate / 100);
                }
            } else {
                (line as any)[field] = value;
                if (field === 'quantity' || field === 'unit_price') {
                    line.amount = Number(line.quantity) * Number(line.unit_price);
                    line.tax_amount = Math.floor(line.amount * line.tax_rate / 100);
                }
                if (field === 'tax_rate') {
                    line.tax_amount = Math.floor(line.amount * Number(value) / 100);
                }
            }

            updated[index] = line;
            return updated;
        });
    };

    // 仕入先が変更された時にフォームの仕入先IDを更新
    const handleSupplierChange = (newSupplierId: string) => {
        setSupplierId(newSupplierId);
    };

    const subtotal = lines.reduce((sum, l) => sum + l.amount, 0);
    const totalTax = lines.reduce((sum, l) => sum + l.tax_amount, 0);
    const grandTotal = subtotal + totalTax;

    return (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4 mb-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <Package size={16} className="text-indigo-600" />
                    発注明細
                </h2>
                <button type="button" onClick={addLine} className="flex items-center gap-1.5 text-sm font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors">
                    <Plus size={16} />
                    明細を追加
                </button>
            </div>

            {/* hidden input: JSON形式でフォーム送信 */}
            <input type="hidden" name="lines" value={JSON.stringify(lines)} readOnly />
            {/* 仕入先IDの変更を親フォームで検知するためのhidden listener */}
            <input type="hidden" name="supplier_filter_id" value={supplierId} readOnly />

            {lines.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                    <Package size={36} className="mx-auto mb-3 text-slate-300" />
                    <p className="font-medium">明細行がまだありません</p>
                    <p className="text-xs mt-1">「明細を追加」ボタンから商品を追加してください</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {lines.map((line, i) => (
                        <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-4 hover:border-indigo-200 transition-colors">
                            <div className="flex items-start gap-3">
                                <span className="text-xs font-bold text-slate-400 bg-white border border-slate-200 rounded-lg w-7 h-7 flex items-center justify-center mt-6 shrink-0">{i + 1}</span>
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-6 gap-3">
                                    <div className="md:col-span-2 space-y-1">
                                        <label className="text-xs font-bold text-slate-500 flex items-center justify-between">
                                            <span>仕入先商品</span>
                                            <a href="/supplier-products/new" target="_blank" className="text-[10px] text-indigo-600 hover:text-indigo-800 font-normal">マスタ追加</a>
                                        </label>
                                        <select
                                            value={line.supplier_product_id}
                                            onChange={(e) => updateLine(i, 'supplier_product_id', e.target.value)}
                                            className="w-full bg-white border border-slate-200 rounded-lg py-2 px-2.5 text-sm font-bold outline-none focus:border-indigo-500 focus:ring-2 cursor-pointer"
                                        >
                                            <option value="">商品を選択</option>
                                            {filteredProducts.map(sp => (
                                                <option key={sp.id} value={sp.id}>
                                                    {sp.supplier_product_code ? `[${sp.supplier_product_code}] ` : ''}{sp.supplier_product_name}
                                                </option>
                                            ))}
                                            {filteredProducts.length === 0 && (
                                                <option value="" disabled>（仕入先商品が未登録です）</option>
                                            )}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500">数量</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={line.quantity}
                                            onChange={(e) => updateLine(i, 'quantity', Number(e.target.value))}
                                            className="w-full bg-white border border-slate-200 rounded-lg py-2 px-2.5 text-sm font-bold font-mono outline-none focus:border-indigo-500 focus:ring-2"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500">単位</label>
                                        <input
                                            type="text"
                                            value={line.unit}
                                            onChange={(e) => updateLine(i, 'unit', e.target.value)}
                                            className="w-full bg-white border border-slate-200 rounded-lg py-2 px-2.5 text-sm font-bold outline-none focus:border-indigo-500 focus:ring-2"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500">単価</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={line.unit_price}
                                            onChange={(e) => updateLine(i, 'unit_price', Number(e.target.value))}
                                            className="w-full bg-white border border-slate-200 rounded-lg py-2 px-2.5 text-sm font-bold font-mono outline-none focus:border-indigo-500 focus:ring-2"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500">小計</label>
                                        <div className="py-2 px-2.5 bg-white border border-slate-200 rounded-lg text-sm font-bold font-mono text-indigo-700">
                                            ¥{line.amount.toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                                <button type="button" onClick={() => removeLine(i)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors mt-6 shrink-0">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}

                    {/* 合計 */}
                    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mt-4">
                        <div className="flex justify-end gap-8 text-sm">
                            <div className="text-right space-y-1.5">
                                <p className="text-slate-500">小計</p>
                                <p className="text-slate-500">消費税</p>
                                <p className="font-bold text-indigo-700 text-base pt-1 border-t border-indigo-300">合計（税込）</p>
                            </div>
                            <div className="text-right font-mono font-bold space-y-1.5">
                                <p className="text-slate-700">¥{subtotal.toLocaleString()}</p>
                                <p className="text-slate-700">¥{totalTax.toLocaleString()}</p>
                                <p className="text-indigo-700 text-lg pt-1 border-t border-indigo-300">¥{grandTotal.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
