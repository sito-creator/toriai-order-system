'use client';

import { useState } from 'react';
import { Download, BookOpen, ArrowUpDown, Search, Filter } from 'lucide-react';

type JournalEntry = {
    id: string; date: string; debit_account: string; credit_account: string;
    amount: number; description: string; source_type: string; source_number: string;
};
type ColumnMapping = { header: string; field: string; fixedValue: string; };
type CsvFormat = { columns: ColumnMapping[]; encoding: string; delimiter: string; };

export default function JournalTable({ entries, csvFormat }: { entries: JournalEntry[]; csvFormat?: CsvFormat }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [filterAccount, setFilterAccount] = useState('');
    const [sortField, setSortField] = useState<'date' | 'amount'>('date');
    const [sortAsc, setSortAsc] = useState(false);

    const allAccounts = [...new Set([...entries.map(e => e.debit_account), ...entries.map(e => e.credit_account)])].filter(Boolean).sort();

    const filteredEntries = entries.filter(entry => {
        const q = searchQuery.toLowerCase();
        const matchSearch = !q || entry.description?.toLowerCase().includes(q) || entry.source_number?.toLowerCase().includes(q) || entry.debit_account?.toLowerCase().includes(q) || entry.credit_account?.toLowerCase().includes(q);
        const matchAccount = !filterAccount || entry.debit_account === filterAccount || entry.credit_account === filterAccount;
        return matchSearch && matchAccount;
    });

    const sortedEntries = [...filteredEntries].sort((a, b) => {
        const cmp = sortField === 'date' ? (a.date || '').localeCompare(b.date || '') : (a.amount || 0) - (b.amount || 0);
        return sortAsc ? cmp : -cmp;
    });

    const totalAmount = filteredEntries.reduce((sum, e) => sum + (e.amount || 0), 0);

    const getFieldValue = (entry: JournalEntry, field: string, fixedValue: string): string => {
        switch (field) {
            case 'date': return entry.date || '';
            case 'debit_account': return entry.debit_account || '';
            case 'credit_account': return entry.credit_account || '';
            case 'amount': return String(entry.amount || 0);
            case 'debit_amount': return String(entry.amount || 0);
            case 'credit_amount': return String(entry.amount || 0);
            case 'description': return entry.description || '';
            case 'source_type': return entry.source_type || '';
            case 'source_number': return entry.source_number || '';
            case 'tax_category': return '対象外';
            case 'fixed': return fixedValue || '';
            case 'empty': return '';
            default: return '';
        }
    };

    const exportCSV = () => {
        const hasCustomFormat = csvFormat?.columns && csvFormat.columns.length > 0;
        const delim = hasCustomFormat ? (csvFormat!.delimiter === '\\t' || csvFormat!.delimiter === '\t' ? '\t' : csvFormat!.delimiter || ',') : ',';

        let headers: string[];
        let rows: string[][];

        if (hasCustomFormat) {
            headers = csvFormat!.columns.map(c => c.header);
            rows = sortedEntries.map(e => csvFormat!.columns.map(c => getFieldValue(e, c.field, c.fixedValue)));
        } else {
            headers = ['日付', '借方勘定', '貸方勘定', '金額', '摘要', '伝票種別', '伝票番号'];
            rows = sortedEntries.map(e => [e.date, e.debit_account, e.credit_account, String(e.amount || 0), e.description, e.source_type, e.source_number]);
        }

        const csvContent = [
            headers.join(delim),
            ...rows.map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(delim))
        ].join('\n');

        const bom = '\uFEFF';
        const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `仕訳元帳_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const toggleSort = (field: 'date' | 'amount') => {
        if (sortField === field) setSortAsc(!sortAsc);
        else { setSortField(field); setSortAsc(false); }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 w-full sm:w-auto">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input type="text" placeholder="摘要・勘定科目で検索..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-9 pr-3 text-sm outline-none focus:bg-white focus:border-indigo-500 focus:ring-2" />
                    </div>
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <select value={filterAccount} onChange={(e) => setFilterAccount(e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded-lg py-2 pl-8 pr-6 text-sm font-medium outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 cursor-pointer appearance-none">
                            <option value="">全勘定科目</option>
                            {allAccounts.map(acc => <option key={acc} value={acc}>{acc}</option>)}
                        </select>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {csvFormat?.columns && csvFormat.columns.length > 0 && (
                        <span className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full font-bold">カスタムフォーマット</span>
                    )}
                    <button onClick={exportCSV} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm shadow-indigo-200 hover:-translate-y-0.5">
                        <Download size={16} /> CSV出力
                    </button>
                </div>
            </div>

            <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-xl px-5 py-3">
                <p className="text-sm text-indigo-700 font-medium">
                    <span className="font-bold">{sortedEntries.length}</span> 件の仕訳
                    {filterAccount && <span className="ml-2 text-xs bg-indigo-100 px-2 py-0.5 rounded-full">{filterAccount}</span>}
                </p>
                <p className="text-sm font-bold text-indigo-800">合計金額: ¥{totalAmount.toLocaleString()}</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
                        <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                            <tr>
                                <th className="font-medium py-3.5 px-5"><button onClick={() => toggleSort('date')} className="flex items-center gap-1 hover:text-indigo-600 transition-colors">日付 <ArrowUpDown size={12} className={sortField === 'date' ? 'text-indigo-600' : 'text-slate-400'} /></button></th>
                                <th className="font-medium py-3.5 px-5">借方</th>
                                <th className="font-medium py-3.5 px-5">貸方</th>
                                <th className="font-medium py-3.5 px-5 text-right"><button onClick={() => toggleSort('amount')} className="flex items-center gap-1 ml-auto hover:text-indigo-600 transition-colors">金額 <ArrowUpDown size={12} className={sortField === 'amount' ? 'text-indigo-600' : 'text-slate-400'} /></button></th>
                                <th className="font-medium py-3.5 px-5">摘要</th>
                                <th className="font-medium py-3.5 px-5">伝票</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {sortedEntries.length > 0 ? sortedEntries.map((entry, i) => (
                                <tr key={entry.id || i} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="py-3.5 px-5 font-mono text-xs text-slate-700 font-medium">{entry.date || '-'}</td>
                                    <td className="py-3.5 px-5"><span className="inline-flex px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-bold border border-blue-100">{entry.debit_account || '-'}</span></td>
                                    <td className="py-3.5 px-5"><span className="inline-flex px-2.5 py-1 bg-rose-50 text-rose-700 rounded-md text-xs font-bold border border-rose-100">{entry.credit_account || '-'}</span></td>
                                    <td className="py-3.5 px-5 text-right font-bold text-slate-900 font-mono">¥{(entry.amount || 0).toLocaleString()}</td>
                                    <td className="py-3.5 px-5 text-slate-600 max-w-[200px] truncate">{entry.description || '-'}</td>
                                    <td className="py-3.5 px-5"><span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded font-medium">{entry.source_type || '-'} {entry.source_number || ''}</span></td>
                                </tr>
                            )) : (
                                <tr><td colSpan={6} className="py-16 text-center text-slate-500">
                                    <BookOpen size={40} className="mx-auto text-slate-300 mb-4" />
                                    <p className="font-bold text-slate-700 text-base">仕訳データがありません</p>
                                    <p className="text-sm mt-1">請求書や入金データから自動生成されます</p>
                                </td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
