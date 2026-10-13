"use client";

import { FileOutput } from 'lucide-react';

export default function PrintButton() {
    return (
        <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm shadow-indigo-200 hover:-translate-y-0.5"
        >
            <FileOutput size={18} />
            <span>PDF出力 / 印刷</span>
        </button>
    );
}
