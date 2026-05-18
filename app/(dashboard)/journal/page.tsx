import { FileDown, Download, Calendar } from 'lucide-react';

export default function JournalPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">仕訳データ出力</h1>
                    <p className="text-slate-500 mt-1">会計ソフト連携用の仕訳データを出力します</p>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
                <div className="max-w-lg mx-auto space-y-6">
                    <div className="text-center">
                        <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <FileDown size={32} className="text-indigo-600" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900">仕訳データのエクスポート</h2>
                        <p className="text-sm text-slate-500 mt-2">
                            指定した期間の受注・発注・入金データから仕訳データを生成し、CSVファイルとしてダウンロードできます。
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">開始日</label>
                                <input type="date" className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg py-2.5 px-3 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 transition-all font-bold cursor-pointer" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">終了日</label>
                                <input type="date" className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg py-2.5 px-3 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 transition-all font-bold cursor-pointer" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">出力形式</label>
                            <select className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg py-2.5 px-3 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 transition-all font-bold cursor-pointer">
                                <option value="freee">freee</option>
                                <option value="yayoi">弥生会計</option>
                                <option value="moneyforward">マネーフォワード</option>
                                <option value="csv">汎用CSV</option>
                            </select>
                        </div>

                        <button className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-sm shadow-indigo-200 hover:-translate-y-0.5 mt-4">
                            <Download size={18} />
                            <span>仕訳データをダウンロード</span>
                        </button>

                        <p className="text-xs text-center text-slate-400 mt-2">
                            ※ この機能は今後のアップデートで完全対応予定です
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
