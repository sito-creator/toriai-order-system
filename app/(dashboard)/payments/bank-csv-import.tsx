'use client';

import { useState, useRef, useTransition } from 'react';
import { Upload, FileText, CheckCircle2, X, ArrowRight, Banknote, AlertCircle, ChevronDown } from 'lucide-react';
import { markInvoiceAsPaid } from './payment-actions';

type Invoice = { id: string; invoice_number: string; total_amount: number; customer_name: string; due_date: string; };

export default function BankCsvImport({ unpaidInvoices }: { unpaidInvoices: Invoice[] }) {
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState<'upload' | 'configure' | 'match' | 'done'>('upload');
    const [headers, setHeaders] = useState<string[]>([]);
    const [rows, setRows] = useState<string[][]>([]);
    const [dateCol, setDateCol] = useState(-1);
    const [amountCol, setAmountCol] = useState(-1);
    const [descCol, setDescCol] = useState(-1);
    const [matchRows, setMatchRows] = useState<{ date: string; amount: number; desc: string; invoiceId: string; }[]>([]);
    const [isPending, startTransition] = useTransition();
    const [results, setResults] = useState({ success: 0, failed: 0 });
    const fileRef = useRef<HTMLInputElement>(null);

    const parseCSVLine = (line: string): string[] => {
        const result: string[] = [];
        let current = '', inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const c = line[i];
            if (c === '"') { if (inQuotes && line[i + 1] === '"') { current += '"'; i++; } else inQuotes = !inQuotes; }
            else if (c === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
            else current += c;
        }
        result.push(current.trim());
        return result;
    };

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const text = ev.target?.result as string;
            const lines = text.split(/\r?\n/).filter(l => l.trim());
            if (lines.length < 2) return;
            const h = parseCSVLine(lines[0]);
            const r = lines.slice(1).map(l => parseCSVLine(l));
            setHeaders(h); setRows(r);
            // Auto-detect columns
            let dd = -1, da = -1, ds = -1;
            h.forEach((col, i) => {
                const l = col.toLowerCase();
                if (dd < 0 && (l.includes('日付') || l.includes('date') || l.includes('取引日'))) dd = i;
                if (da < 0 && (l.includes('入金') || l.includes('預') || l.includes('お預り') || l.includes('金額'))) da = i;
                if (ds < 0 && (l.includes('摘要') || l.includes('内容') || l.includes('備考'))) ds = i;
            });
            setDateCol(dd); setAmountCol(da); setDescCol(ds);
            setStep('configure');
        };
        reader.readAsText(file, 'UTF-8');
        if (e.target) e.target.value = '';
    };

    const handleConfigure = () => {
        if (amountCol < 0) return;
        const parsed = rows
            .map(row => {
                const amtStr = (row[amountCol] || '').replace(/[,¥￥\s]/g, '');
                const amt = parseFloat(amtStr);
                if (isNaN(amt) || amt <= 0) return null;
                const match = unpaidInvoices.find(inv => inv.total_amount === amt);
                return {
                    date: dateCol >= 0 ? row[dateCol] || '' : '',
                    amount: amt,
                    desc: descCol >= 0 ? row[descCol] || '' : '',
                    invoiceId: match?.id || '',
                };
            })
            .filter(Boolean) as typeof matchRows;
        setMatchRows(parsed);
        setStep('match');
    };

    const handleExecute = () => {
        startTransition(async () => {
            let s = 0, f = 0;
            for (const row of matchRows) {
                if (!row.invoiceId) continue;
                try { await markInvoiceAsPaid(row.invoiceId); s++; } catch { f++; }
            }
            setResults({ success: s, failed: f });
            setStep('done');
        });
    };

    const reset = () => { setStep('upload'); setHeaders([]); setRows([]); setMatchRows([]); setResults({ success: 0, failed: 0 }); };

    if (!open) return (
        <button onClick={() => setOpen(true)} className="flex items-center gap-2 bg-white border border-indigo-200 text-indigo-700 px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-50 transition-all shadow-sm">
            <Upload size={16} /> 銀行CSVインポート
        </button>
    );

    return (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Upload size={18} className="text-indigo-500" /> 銀行CSVインポートで消込
                </h2>
                <button onClick={() => { setOpen(false); reset(); }} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>

            {/* Steps indicator */}
            <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2 text-xs font-bold">
                {['CSVアップロード', 'カラム設定', 'マッチング', '完了'].map((label, i) => {
                    const stepIndex = ['upload', 'configure', 'match', 'done'].indexOf(step);
                    return (
                        <div key={label} className="flex items-center gap-2">
                            {i > 0 && <ArrowRight size={12} className="text-slate-300" />}
                            <span className={i <= stepIndex ? 'text-indigo-600' : 'text-slate-400'}>{label}</span>
                        </div>
                    );
                })}
            </div>

            <div className="p-6">
                {step === 'upload' && (
                    <div className="text-center py-8">
                        <input type="file" ref={fileRef} className="hidden" accept=".csv" onChange={handleFile} />
                        <FileText size={40} className="mx-auto text-slate-300 mb-4" />
                        <p className="font-bold text-slate-700 mb-1">銀行の入出金明細CSVをアップロード</p>
                        <p className="text-sm text-slate-500 mb-6">ネットバンキングからダウンロードしたCSVファイルを選択してください</p>
                        <button onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-all">
                            <Upload size={16} /> CSVファイルを選択
                        </button>
                    </div>
                )}

                {step === 'configure' && (
                    <div className="space-y-4">
                        <p className="text-sm text-slate-600"><span className="font-bold">{rows.length}</span>行のデータを検出しました。各カラムの役割を選択してください。</p>
                        <div className="grid grid-cols-3 gap-4">
                            {[{ label: '日付列', val: dateCol, set: setDateCol }, { label: '入金額列', val: amountCol, set: setAmountCol }, { label: '摘要列', val: descCol, set: setDescCol }].map(({ label, val, set }) => (
                                <div key={label} className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-600">{label}{label === '入金額列' && <span className="text-rose-500">*</span>}</label>
                                    <select value={val} onChange={e => set(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm outline-none focus:border-indigo-500">
                                        <option value={-1}>-- 選択 --</option>
                                        {headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
                                    </select>
                                </div>
                            ))}
                        </div>
                        {/* Preview */}
                        <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-48">
                            <table className="w-full text-xs"><thead className="bg-slate-50 sticky top-0"><tr>{headers.map((h, i) => (
                                <th key={i} className={`py-2 px-3 text-left font-medium whitespace-nowrap ${i === dateCol ? 'bg-blue-50 text-blue-700' : i === amountCol ? 'bg-emerald-50 text-emerald-700' : i === descCol ? 'bg-amber-50 text-amber-700' : 'text-slate-500'}`}>{h}</th>
                            ))}</tr></thead><tbody className="divide-y divide-slate-100">{rows.slice(0, 5).map((row, ri) => (
                                <tr key={ri}>{row.map((cell, ci) => <td key={ci} className={`py-1.5 px-3 whitespace-nowrap ${ci === dateCol ? 'bg-blue-50/50' : ci === amountCol ? 'bg-emerald-50/50' : ci === descCol ? 'bg-amber-50/50' : ''}`}>{cell}</td>)}</tr>
                            ))}</tbody></table>
                        </div>
                        <div className="flex justify-end">
                            <button onClick={handleConfigure} disabled={amountCol < 0} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50 flex items-center gap-2">
                                マッチングへ <ArrowRight size={16} />
                            </button>
                        </div>
                    </div>
                )}

                {step === 'match' && (
                    <div className="space-y-4">
                        <p className="text-sm text-slate-600"><span className="font-bold text-emerald-600">{matchRows.filter(r => r.invoiceId).length}</span>件が自動マッチ / 全{matchRows.length}件</p>
                        <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-[400px]">
                            <table className="w-full text-sm"><thead className="bg-slate-50 border-b border-slate-200 sticky top-0"><tr>
                                <th className="py-2.5 px-4 text-left font-medium text-slate-500">日付</th>
                                <th className="py-2.5 px-4 text-right font-medium text-slate-500">入金額</th>
                                <th className="py-2.5 px-4 text-left font-medium text-slate-500">摘要</th>
                                <th className="py-2.5 px-4 text-left font-medium text-slate-500">マッチ先請求書</th>
                            </tr></thead><tbody className="divide-y divide-slate-100">
                                {matchRows.map((row, i) => (
                                    <tr key={i} className={row.invoiceId ? 'bg-emerald-50/30' : ''}>
                                        <td className="py-2.5 px-4 font-mono text-xs">{row.date || '-'}</td>
                                        <td className="py-2.5 px-4 text-right font-bold font-mono">¥{row.amount.toLocaleString()}</td>
                                        <td className="py-2.5 px-4 text-slate-600 max-w-[200px] truncate">{row.desc || '-'}</td>
                                        <td className="py-2.5 px-4">
                                            <select value={row.invoiceId} onChange={e => { const n = [...matchRows]; n[i] = { ...n[i], invoiceId: e.target.value }; setMatchRows(n); }}
                                                className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs outline-none focus:border-indigo-400">
                                                <option value="">-- 未選択 --</option>
                                                {unpaidInvoices.map(inv => (
                                                    <option key={inv.id} value={inv.id}>{inv.invoice_number || '未発番'} / {inv.customer_name} / ¥{inv.total_amount.toLocaleString()}</option>
                                                ))}
                                            </select>
                                        </td>
                                    </tr>
                                ))}
                            </tbody></table>
                        </div>
                        <div className="flex items-center justify-between">
                            <button onClick={() => setStep('configure')} className="text-sm font-bold text-slate-500 hover:text-slate-700">← 戻る</button>
                            <button onClick={handleExecute} disabled={isPending || matchRows.filter(r => r.invoiceId).length === 0}
                                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50 flex items-center gap-2">
                                {isPending ? '処理中...' : <><Banknote size={16} /> {matchRows.filter(r => r.invoiceId).length}件を消込確定</>}
                            </button>
                        </div>
                    </div>
                )}

                {step === 'done' && (
                    <div className="text-center py-8">
                        <CheckCircle2 size={48} className="mx-auto text-emerald-500 mb-4" />
                        <p className="font-bold text-slate-900 text-lg mb-2">消込処理完了</p>
                        <p className="text-sm text-slate-600 mb-1">成功: <span className="font-bold text-emerald-600">{results.success}件</span></p>
                        {results.failed > 0 && <p className="text-sm text-rose-600 font-bold">失敗: {results.failed}件</p>}
                        <button onClick={() => { setOpen(false); reset(); window.location.reload(); }} className="mt-6 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all">閉じる</button>
                    </div>
                )}
            </div>
        </div>
    );
}
