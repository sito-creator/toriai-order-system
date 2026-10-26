'use client';
export default function PrintReceipt() {
    return <div className="receipt-controls"><button onClick={() => window.print()} className="rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white">印刷・PDF保存</button><p className="mt-2 text-sm text-slate-500">印刷先で「PDFに保存」を選択してください。ヘッダーとフッターは印刷設定でオフにできます。</p></div>;
}
