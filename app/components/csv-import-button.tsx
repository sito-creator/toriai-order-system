'use client';
import { useRef, useState } from 'react';
import { Upload, Download } from 'lucide-react';

export default function CsvImportButton({ 
  action, 
  label = "CSV取り込み",
  sampleCsvData,
  sampleCsvName = "sample.csv"
}: { 
  action: (formData: FormData) => Promise<any>, 
  label?: string,
  sampleCsvData?: string,
  sampleCsvName?: string
}) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);

    const downloadSample = () => {
        if (!sampleCsvData) return;
        // 先頭にBOM(0xEF, 0xBB, 0xBF)を付与してエクセルでの文字化けを防ぐ
        const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), sampleCsvData], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = sampleCsvName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="flex items-center gap-2">
            {sampleCsvData && (
                <button 
                    type="button" 
                    onClick={downloadSample}
                    className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl font-medium transition-colors shadow-sm text-sm"
                    title="サンプルCSVのダウンロード"
                >
                    <Download size={16} className="text-slate-400" />
                    <span className="hidden sm:inline">サンプル</span>
                </button>
            )}
            
            <form action={async (formData) => {
                setIsUploading(true);
                try {
                    const res = await action(formData);
                    alert(`取り込みが完了しました！（${res.count}件登録）`);
                } catch (err: any) {
                    alert(`エラーが発生しました:\n${err.message}`);
                } finally {
                    setIsUploading(false);
                    if (fileInputRef.current) {
                        fileInputRef.current.value = ''; // clear input
                    }
                }
            }}>
                <input 
                    type="file" 
                    name="file" 
                    accept=".csv" 
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={(e) => {
                        if (e.target.files?.[0]) {
                            e.target.form?.requestSubmit();
                        }
                    }}
                />
                <button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl font-medium transition-colors shadow-sm disabled:opacity-50"
                >
                    <Upload size={18} className="text-slate-400" />
                    <span>{isUploading ? "処理中..." : label}</span>
                </button>
            </form>
        </div>
    );
}
