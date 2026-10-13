'use client';

import { useState, useRef } from 'react';
import { Upload, Plus, Trash2, ArrowUp, ArrowDown, FileSpreadsheet } from 'lucide-react';

const INTERNAL_FIELDS = [
    { value: '', label: '-- 項目を選択 --' },
    { value: 'date', label: '日付' },
    { value: 'debit_account', label: '借方勘定科目' },
    { value: 'credit_account', label: '貸方勘定科目' },
    { value: 'amount', label: '金額' },
    { value: 'debit_amount', label: '借方金額' },
    { value: 'credit_amount', label: '貸方金額' },
    { value: 'description', label: '摘要' },
    { value: 'source_type', label: '伝票種別' },
    { value: 'source_number', label: '伝票番号' },
    { value: 'tax_category', label: '税区分' },
    { value: 'empty', label: '空欄（出力なし）' },
    { value: 'fixed', label: '固定値' },
];

type ColumnMapping = { header: string; field: string; fixedValue: string; };
type CsvFormat = { columns: ColumnMapping[]; encoding: string; delimiter: string; };

export default function CsvFormatConfig({ value, onChange }: { value: CsvFormat; onChange: (v: CsvFormat) => void; }) {
    const fileRef = useRef<HTMLInputElement>(null);
    const columns = value?.columns || [];
    const encoding = value?.encoding || 'utf-8';
    const delimiter = value?.delimiter || ',';

    const update = (cols: ColumnMapping[], enc?: string, delim?: string) => {
        onChange({ columns: cols, encoding: enc || encoding, delimiter: delim || delimiter });
    };

    const parseCSVLine = (line: string, d: string = ','): string[] => {
        const result: string[] = []; let current = '', inQ = false;
        const sep = d === '\\t' ? '\t' : d;
        for (let i = 0; i < line.length; i++) {
            const c = line[i];
            if (c === '"') { if (inQ && line[i + 1] === '"') { current += '"'; i++; } else inQ = !inQ; }
            else if (c === sep && !inQ) { result.push(current); current = ''; }
            else current += c;
        }
        result.push(current);
        return result;
    };

    const handleTemplate = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const text = ev.target?.result as string;
            const lines = text.split(/\r?\n/).filter(l => l.trim());
            if (!lines.length) return;
            const hdrs = parseCSVLine(lines[0], delimiter);
            const newCols: ColumnMapping[] = hdrs.map(h => {
                const l = h.toLowerCase().trim();
                let field = '';
                if (l.includes('日付') || l === 'date') field = 'date';
                else if (l.includes('借方科目') || l.includes('借方勘定')) field = 'debit_account';
                else if (l.includes('貸方科目') || l.includes('貸方勘定')) field = 'credit_account';
                else if (l === '金額' || l === 'amount') field = 'amount';
                else if (l.includes('借方金額')) field = 'debit_amount';
                else if (l.includes('貸方金額')) field = 'credit_amount';
                else if (l.includes('摘要') || l.includes('適用')) field = 'description';
                else if (l.includes('税区分') || l.includes('税')) field = 'tax_category';
                return { header: h.trim(), field, fixedValue: '' };
            });
            update(newCols);
        };
        reader.readAsText(file, 'UTF-8');
        if (e.target) e.target.value = '';
    };

    return (
        <div className="space-y-6">
            {/* Template Upload */}
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-indigo-300 transition-all">
                <input type="file" ref={fileRef} className="hidden" accept=".csv,.tsv,.txt" onChange={handleTemplate} />
                <FileSpreadsheet size={32} className="mx-auto text-slate-400 mb-3" />
                <p className="font-bold text-slate-700 text-sm mb-1">会計ソフトのインポート用CSVテンプレートをアップロード</p>
                <p className="text-xs text-slate-500 mb-4">ヘッダー行を自動読み取りしてカラム設定を生成します（マネーフォワード、TKC、freee、弥生等）</p>
                <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg font-bold text-sm hover:bg-indigo-100 transition-all">
                    <Upload size={16} /> テンプレートCSVを選択
                </button>
            </div>

            {/* Column Mappings */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-slate-700 text-sm">カラムマッピング設定</h4>
                    <button type="button" onClick={() => update([...columns, { header: '', field: '', fixedValue: '' }])} className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-200 transition-all">
                        <Plus size={14} /> 列を追加
                    </button>
                </div>
                {columns.length > 0 ? (
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="py-2.5 px-3 text-left font-medium text-slate-500 w-8">#</th>
                                    <th className="py-2.5 px-3 text-left font-medium text-slate-500">CSVヘッダー名</th>
                                    <th className="py-2.5 px-3 text-left font-medium text-slate-500">データ項目</th>
                                    <th className="py-2.5 px-3 text-left font-medium text-slate-500">固定値</th>
                                    <th className="py-2.5 px-3 text-center font-medium text-slate-500 w-24">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {columns.map((col, i) => (
                                    <tr key={i} className="hover:bg-slate-50/50">
                                        <td className="py-2 px-3 text-slate-400 font-mono text-xs">{i + 1}</td>
                                        <td className="py-2 px-3">
                                            <input type="text" value={col.header} onChange={e => { const c = [...columns]; c[i] = { ...c[i], header: e.target.value }; update(c); }} placeholder="列名" className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-sm outline-none focus:border-indigo-400" />
                                        </td>
                                        <td className="py-2 px-3">
                                            <select value={col.field} onChange={e => { const c = [...columns]; c[i] = { ...c[i], field: e.target.value }; update(c); }} className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-sm outline-none focus:border-indigo-400 cursor-pointer">
                                                {INTERNAL_FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                                            </select>
                                        </td>
                                        <td className="py-2 px-3">
                                            {col.field === 'fixed' ? (
                                                <input type="text" value={col.fixedValue} onChange={e => { const c = [...columns]; c[i] = { ...c[i], fixedValue: e.target.value }; update(c); }} placeholder="出力する値" className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-sm outline-none focus:border-indigo-400" />
                                            ) : <span className="text-xs text-slate-400">-</span>}
                                        </td>
                                        <td className="py-2 px-3 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <button type="button" onClick={() => { if (i === 0) return; const c = [...columns]; [c[i], c[i - 1]] = [c[i - 1], c[i]]; update(c); }} disabled={i === 0} className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-30"><ArrowUp size={14} /></button>
                                                <button type="button" onClick={() => { if (i === columns.length - 1) return; const c = [...columns]; [c[i], c[i + 1]] = [c[i + 1], c[i]]; update(c); }} disabled={i === columns.length - 1} className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-30"><ArrowDown size={14} /></button>
                                                <button type="button" onClick={() => update(columns.filter((_, j) => j !== i))} className="p-1 text-slate-400 hover:text-rose-600"><Trash2 size={14} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="border border-slate-200 rounded-xl p-8 text-center">
                        <p className="text-sm text-slate-500">CSVテンプレートをアップロードするか、手動で列を追加してください</p>
                    </div>
                )}
            </div>

            {/* Options */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">文字エンコーディング</label>
                    <select value={encoding} onChange={e => onChange({ columns, encoding: e.target.value, delimiter })} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm outline-none focus:border-indigo-500 cursor-pointer">
                        <option value="utf-8">UTF-8 (BOM付き)</option>
                        <option value="shift_jis">Shift_JIS</option>
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">区切り文字</label>
                    <select value={delimiter} onChange={e => onChange({ columns, encoding, delimiter: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm outline-none focus:border-indigo-500 cursor-pointer">
                        <option value=",">カンマ (,)</option>
                        <option value="\t">タブ</option>
                    </select>
                </div>
            </div>

            {columns.length > 0 && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                    <p className="text-xs font-bold text-indigo-700 mb-1">💡 CSV出力プレビュー（ヘッダー行）</p>
                    <p className="text-xs text-indigo-600 font-mono break-all">{columns.map(c => c.header).join(delimiter === '\\t' ? '\t' : delimiter)}</p>
                </div>
            )}
        </div>
    );
}
