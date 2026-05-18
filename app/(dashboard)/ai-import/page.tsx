"use client";

import { useState } from 'react';
import { UploadCloud, FileText, CheckCircle2, Cpu, Loader2, Play, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { parseOrderDocument, registerParsedOrderToDB } from './actions';

export default function AIImportPage() {
    const router = useRouter();
    const [file, setFile] = useState<File | null>(null);
    const [inputText, setInputText] = useState('');
    const [inputType, setInputType] = useState<'text' | 'file'>('text');

    const [isParsing, setIsParsing] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);
    const [parseResult, setParseResult] = useState<any | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setErrorMessage(null);
        }
    };

    const startParsing = async () => {
        setIsParsing(true);
        setErrorMessage(null);
        try {
            const formData = new FormData();
            if (inputType === 'text' && inputText) {
                formData.append('text', inputText);
            } else if (inputType === 'file' && file) {
                let base64String = '';
                let finalMimeType = file.type;

                if (file.type.startsWith('image/')) {
                    // 超高速化のため、クライアントサイドで画像を圧縮・リサイズしてから送信する
                    base64String = await new Promise((resolve, reject) => {
                        const img = new window.Image();
                        img.onload = () => {
                            const canvas = document.createElement('canvas');
                            const MAX_WIDTH = 1200;
                            const MAX_HEIGHT = 1200;
                            let width = img.width;
                            let height = img.height;

                            if (width > height) {
                                if (width > MAX_WIDTH) {
                                    height *= MAX_WIDTH / width;
                                    width = MAX_WIDTH;
                                }
                            } else {
                                if (height > MAX_HEIGHT) {
                                    width *= MAX_HEIGHT / height;
                                    height = MAX_HEIGHT;
                                }
                            }
                            canvas.width = width;
                            canvas.height = height;

                            const ctx = canvas.getContext('2d');
                            ctx?.drawImage(img, 0, 0, width, height);
                            // 画質 0.7 で圧縮（ファイルサイズが劇的に小さくなり、通信・解析がハイスピードになります）
                            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                            resolve(dataUrl.split(',')[1]);
                            URL.revokeObjectURL(img.src);
                        };
                        img.onerror = () => reject(new Error('画像の読み込みに失敗しました'));
                        img.src = URL.createObjectURL(file);
                    });
                    finalMimeType = 'image/jpeg';
                } else {
                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    await new Promise((resolve, reject) => {
                        reader.onload = resolve;
                        reader.onerror = reject;
                    });
                    base64String = (reader.result as string).split(',')[1];
                }

                formData.append('fileBase64', base64String);
                formData.append('fileMimeType', finalMimeType);
            }

            // Next.js Server Action 呼び出し！
            const result = await parseOrderDocument(formData);
            setParseResult(result);
        } catch (err: any) {
            console.error(err);
            setErrorMessage(err.message || '予期せぬエラーが発生しました。');
        } finally {
            setIsParsing(false);
        }
    };

    const executeRegistration = async () => {
        if (!parseResult) return;
        setIsRegistering(true);
        setErrorMessage(null);
        try {
            // データベース登録 Server Action 呼び出し
            const res = await registerParsedOrderToDB(parseResult);
            if (res.success) {
                alert(
                    res.customerFound
                        ? "受注データとして正常に登録されました。"
                        : "登録完了。ただし会社名が事前の顧客マスタに存在しないため、受注管理画面から顧客情報をマニュアルで紐づけてください。"
                );
                router.push('/orders'); // 受注管理画面へリダイレクト
            }
        } catch (err: any) {
            console.error(err);
            setErrorMessage(err.message || 'データベース登録処理でエラーが発生しました。');
        } finally {
            setIsRegistering(false);
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Cpu className="text-indigo-600" />
                        <span>AI発注書自動解析（Gemini直結モジュール）</span>
                    </h1>
                    <p className="text-slate-500 mt-1">テキスト・FAX・メール等の発注書を最新のAIモデルが自動で読み取り、構造化データを出力します</p>
                </div>
            </div>

            {errorMessage && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl flex items-center gap-3">
                    <AlertCircle size={20} className="shrink-0" />
                    <span className="font-bold text-sm tracking-wide">{errorMessage}</span>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* === Input Region === */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col h-[650px]">
                    <div className="flex bg-slate-100 p-1.5 rounded-xl mb-6 shrink-0">
                        <button
                            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${inputType === 'text' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                            onClick={() => setInputType('text')}
                        >
                            テキスト・メール本文
                        </button>
                        <button
                            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${inputType === 'file' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                            onClick={() => setInputType('file')}
                        >
                            画像・PDFファイル (FAX)
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {inputType === 'text' ? (
                            <textarea
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                placeholder="メール本文やチャットで届いた発注依頼文をそのまま貼り付けてください...&#10;&#10;例: 取引先のミライテクノロジーです。以下の内容で発注お願いします。&#10;・PCモニター 3台&#10;・HDMIケーブル 3本&#10;来週の火曜までに納品希望です。合計金額は適当に計算しておいてください。"
                                className="w-full h-full min-h-[400px] p-5 bg-slate-50 border border-slate-200 rounded-xl resize-none outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-mono text-sm leading-relaxed"
                            />
                        ) : (
                            <div className="h-full min-h-[400px] border-2 border-dashed border-slate-300 hover:border-indigo-400 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 bg-slate-50 hover:bg-indigo-50/50 rounded-xl flex items-center justify-center transition-all cursor-pointer relative group">
                                <input
                                    type="file"
                                    accept="image/jpeg, image/png, application/pdf"
                                    onChange={handleFileUpload}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                />
                                <div className="text-center p-6 pointer-events-none group-hover:-translate-y-1 transition-transform">
                                    <div className="w-20 h-20 bg-white border border-slate-200 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm group-hover:shadow group-hover:text-indigo-500 transition-all">
                                        {file ? <FileText size={36} className="text-indigo-500" /> : <UploadCloud size={36} />}
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-700">{file ? file.name : 'ファイルをドラッグ＆ドロップ'}</h3>
                                    <p className="text-sm text-slate-500 mt-2">
                                        {file ? `${(file.size / 1024).toFixed(1)} KB` : 'またはクリックしてファイルを選択 (PDF, JPG, PNG)'}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-6 shrink-0">
                        <button
                            onClick={startParsing}
                            disabled={isParsing || isRegistering || (inputType === 'text' && !inputText) || (inputType === 'file' && !file)}
                            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white rounded-xl font-bold text-lg shadow-[0_8px_20px_rgba(79,70,229,0.3)] hover:-translate-y-0.5 transition-all text-center flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:transform-none"
                        >
                            {isParsing ? (
                                <>
                                    <Loader2 size={24} className="animate-spin" />
                                    <span>Geminiがファイルを解析中...</span>
                                </>
                            ) : (
                                <>
                                    <Play size={20} />
                                    <span>AI解析をスタート</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* === Results Region === */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl shadow-xl w-full p-6 flex flex-col h-[650px] overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none"></div>

                    <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2 z-10 shrink-0">
                        <CheckCircle2 className="text-emerald-400" />
                        <span>AI 解析結果ビューア</span>
                    </h2>

                    <div className="flex-1 overflow-y-auto z-10 pr-2">
                        {!parseResult && !isParsing ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
                                <Cpu size={64} className="text-slate-800" />
                                <p>AIが文書を解析し、ここに構造化データを出力します</p>
                            </div>
                        ) : isParsing ? (
                            <div className="h-full flex flex-col items-center justify-center text-indigo-300 space-y-8">
                                <div className="relative">
                                    <div className="w-20 h-20 border-4 border-indigo-500/20 rounded-full"></div>
                                    <div className="w-20 h-20 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin absolute inset-0"></div>
                                    <Cpu size={28} className="absolute inset-0 m-auto text-indigo-400 animate-pulse" />
                                </div>
                                <div className="text-center max-w-xs">
                                    <p className="font-bold text-white text-lg animate-pulse mb-2">文脈を理解・計算中...</p>
                                    <p className="text-xs text-indigo-200/70">商品名、個数、住所、金額の整合性をチェックしています。この処理には数秒〜十数秒かかります。</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-500">
                                <div className="flex items-center justify-between p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                                    <div>
                                        <p className="text-emerald-400 text-sm font-semibold mb-1">AI 確信度スコア</p>
                                        <p className="text-white font-mono text-2xl font-bold">{parseResult.confidence}% <span className="text-emerald-500 text-base font-medium ml-1">Detected</span></p>
                                    </div>
                                    <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                        <CheckCircle2 size={32} className="text-emerald-400" />
                                    </div>
                                </div>

                                <div className="space-y-5 text-sm">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-slate-900 rounded-xl border border-slate-800">
                                            <p className="text-slate-400 text-xs font-semibold mb-1">抽出された顧客名</p>
                                            <p className="text-white font-medium text-base">{parseResult.customer_name || '名称不明'}</p>
                                        </div>
                                        <div className="p-4 bg-slate-900 rounded-xl border border-slate-800">
                                            <p className="text-slate-400 text-xs font-semibold mb-1">納品希望日</p>
                                            <p className="text-white font-medium text-base">{parseResult.delivery_date || '不明 (未記載)'}</p>
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        <p className="text-slate-300 font-bold mb-3">読み取った商品明細</p>
                                        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                                            <table className="w-full text-left">
                                                <thead className="bg-slate-800/80 text-slate-400 text-xs">
                                                    <tr>
                                                        <th className="py-3 px-4 font-semibold">商品名</th>
                                                        <th className="py-3 px-4 font-semibold text-right">数量</th>
                                                        <th className="py-3 px-4 font-semibold text-right">小計</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-800 text-slate-200">
                                                    {parseResult.items && parseResult.items.length > 0 ? parseResult.items.map((item: any, i: number) => (
                                                        <tr key={i} className="hover:bg-slate-800/50">
                                                            <td className="py-3.5 px-4">{item.name}</td>
                                                            <td className="py-3.5 px-4 text-right font-medium">{item.quantity}</td>
                                                            <td className="py-3.5 px-4 text-right font-medium">¥{(item.amount || 0).toLocaleString()}</td>
                                                        </tr>
                                                    )) : (
                                                        <tr>
                                                            <td colSpan={3} className="py-6 text-center text-slate-500 text-xs">商品の記載を特定できませんでした</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                                <tfoot className="border-t-2 border-slate-800 bg-slate-900">
                                                    <tr>
                                                        <td colSpan={2} className="py-4 px-4 text-right font-semibold text-slate-400">算出・抽出された合計額</td>
                                                        <td className="py-4 px-4 text-right font-bold text-emerald-400 text-lg tracking-tight">¥{(parseResult.total_amount || 0).toLocaleString()}</td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-6 shrink-0 mt-auto">
                                    <button
                                        onClick={executeRegistration}
                                        disabled={isRegistering}
                                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-[0_8px_20px_rgba(16,185,129,0.2)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:transform-none"
                                    >
                                        {isRegistering ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle2 size={20} />}
                                        <span>{isRegistering ? 'データベースへ送信中...' : 'この内容で「確認待ちデータ」としてDBに登録する'}</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
