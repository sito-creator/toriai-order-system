import { createClient } from '@/utils/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { ArrowLeft, Building2, Mail, Phone, Calendar, MessageSquare, FileText, Upload, Save, AlertTriangle } from 'lucide-react';

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    // 顧客情報の取得
    const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single();

    if (customerError || !customer) {
        notFound();
    }

    // やり取り・ドキュメントの取得 (テーブルが存在しない場合はエラーになるのでハンドリング)
    const { data: interactions, error: interactionsError } = await supabase
        .from('customer_interactions')
        .select('*')
        .eq('customer_id', id)
        .order('interaction_date', { ascending: false });

    const { data: documents, error: documentsError } = await supabase
        .from('customer_documents')
        .select('*')
        .eq('customer_id', id)
        .order('uploaded_at', { ascending: false });

    const isSetupRequired = interactionsError?.code === '42P01' || documentsError?.code === '42P01';

    // サーバーアクション: 引き継ぎ事項の保存
    async function updateHandoverNotes(formData: FormData) {
        'use server';
        const notes = formData.get('handover_notes') as string;
        const supabase = await createClient();
        await supabase.from('customers').update({ handover_notes: notes }).eq('id', id);
        revalidatePath(`/customers/${id}`);
    }

    // サーバーアクション: やり取りの追加
    async function addInteraction(formData: FormData) {
        'use server';
        const supabase = await createClient();
        await supabase.from('customer_interactions').insert({
            customer_id: id,
            interaction_date: formData.get('interaction_date'),
            interaction_type: formData.get('interaction_type'),
            notes: formData.get('notes'),
        });
        revalidatePath(`/customers/${id}`);
    }

    // サーバーアクション: 契約書の追加
    async function addDocument(formData: FormData) {
        'use server';
        const file = formData.get('file') as File;
        if (!file || file.size === 0) return;
        
        // ※今回はStorageなしで簡易的に名前とダミーURLを登録する仕様
        const supabase = await createClient();
        await supabase.from('customer_documents').insert({
            customer_id: id,
            file_name: file.name,
            file_url: `/dummy-storage/${file.name}`,
            document_type: formData.get('document_type') || 'contract'
        });
        revalidatePath(`/customers/${id}`);
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/customers" className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-lg transition-colors">
                    <ArrowLeft size={20} />
                </Link>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500 shadow-sm">
                            <Building2 size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">{customer.company_name}</h1>
                            <p className="text-slate-500 mt-1 flex items-center gap-4 text-sm font-medium">
                                {customer.contact_name && <span>担当: {customer.contact_name}</span>}
                                {customer.email && <span className="flex items-center gap-1"><Mail size={14}/> {customer.email}</span>}
                                {customer.phone && <span className="flex items-center gap-1"><Phone size={14}/> {customer.phone}</span>}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {isSetupRequired && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 shrink-0" size={20} />
                    <div>
                        <p className="font-bold">データベースのセットアップが必要です</p>
                        <p className="text-sm mt-1 opacity-90">機能を利用するには、SupabaseのSQLエディタで「契約書」「やり取り」用のテーブルを作成するSQLを実行してください。</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 左側カラム：基本情報 ＆ 引き継ぎ事項 */}
                <div className="lg:col-span-1 space-y-6">
                    {/* 引き継ぎ事項 */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-2xl shadow-sm p-6 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-yellow-400"></div>
                        <h2 className="text-sm font-bold text-yellow-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <AlertTriangle size={16} />
                            引き継ぎ事項・特記事項
                        </h2>
                        {!isSetupRequired ? (
                            <form action={updateHandoverNotes}>
                                <textarea 
                                    name="handover_notes" 
                                    defaultValue={customer.handover_notes || ''}
                                    placeholder="この顧客に対する重要な引き継ぎ事項を入力..."
                                    rows={5}
                                    className="w-full bg-white/60 border border-yellow-300 text-slate-900 rounded-xl py-2.5 px-3 outline-none focus:bg-white focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 transition-all resize-none text-sm shadow-inner"
                                />
                                <div className="mt-3 flex justify-end">
                                    <button type="submit" className="flex items-center gap-1.5 px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 rounded-lg font-bold text-xs transition-colors shadow-sm">
                                        <Save size={14} /> 保存する
                                    </button>
                                </div>
                            </form>
                        ) : (
                             <p className="text-xs text-yellow-700 opacity-70">セットアップ待ち</p>
                        )}
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
                        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">取引条件</h2>
                        <div className="space-y-4">
                            <div>
                                <p className="text-xs text-slate-400 font-medium mb-1">部署名</p>
                                <p className="text-sm font-bold text-slate-800">{customer.department || '-'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-medium mb-1">請求締日</p>
                                <p className="text-sm font-bold text-slate-800">{customer.closing_day || '-'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-medium mb-1">支払条件</p>
                                <p className="text-sm font-bold text-slate-800">{customer.payment_terms || '-'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 右側カラム：やり取り履歴 ＆ 契約書 */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* 過去のやり取りデータ */}
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[400px]">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <MessageSquare size={18} className="text-indigo-600" />
                                過去のやり取り履歴
                            </h2>
                        </div>
                        
                        <div className="p-4 bg-slate-50 border-b border-slate-100 shrink-0">
                            {!isSetupRequired && (
                                <form action={addInteraction} className="flex gap-3">
                                    <input name="interaction_date" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500" required />
                                    <select name="interaction_type" className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500">
                                        <option value="訪問">訪問</option>
                                        <option value="電話">電話</option>
                                        <option value="メール">メール</option>
                                        <option value="Web会議">Web会議</option>
                                    </select>
                                    <input name="notes" type="text" placeholder="メモを入力..." className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500" required />
                                    <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm">追加</button>
                                </form>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="space-y-4">
                                {interactions && interactions.length > 0 ? (
                                    interactions.map((interaction: any) => (
                                        <div key={interaction.id} className="flex gap-4">
                                            <div className="w-12 text-right shrink-0">
                                                <p className="text-xs font-bold text-slate-400">{new Date(interaction.interaction_date).toLocaleDateString('ja-JP', { month:'short', day:'numeric' })}</p>
                                            </div>
                                            <div className="relative pb-4">
                                                <div className="absolute left-[-17px] top-1 w-3 h-3 bg-indigo-200 border-2 border-white rounded-full"></div>
                                                <div className="absolute left-[-12px] top-4 bottom-0 w-0.5 bg-slate-100"></div>
                                                <div className="bg-white border border-slate-100 shadow-sm rounded-xl p-3 inline-block min-w-[280px]">
                                                    <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold mb-1">{interaction.interaction_type}</span>
                                                    <p className="text-sm text-slate-800">{interaction.notes}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-10 text-slate-400">
                                        <MessageSquare size={32} className="mx-auto mb-3 opacity-50" />
                                        <p className="text-sm">履歴はまだありません</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 契約書・ドキュメント */}
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <FileText size={18} className="text-emerald-600" />
                                契約書・ドキュメント
                            </h2>
                            {!isSetupRequired && (
                                <form action={addDocument} className="flex items-center gap-2">
                                    <select name="document_type" className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 outline-none">
                                        <option value="基本契約書">基本契約書</option>
                                        <option value="NDA">NDA</option>
                                        <option value="覚書">覚書</option>
                                    </select>
                                    <input type="file" name="file" id="file" className="hidden" />
                                    <label htmlFor="file" className="cursor-pointer text-xs flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg font-medium transition-colors">
                                        <Upload size={14} /> ファイル選択
                                    </label>
                                    <button type="submit" className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-bold shadow-sm">
                                        アップロード
                                    </button>
                                </form>
                            )}
                        </div>
                        
                        <div className="p-0">
                            <table className="w-full text-left text-sm text-slate-600">
                                <tbody className="divide-y divide-slate-100">
                                    {documents && documents.length > 0 ? (
                                        documents.map((doc: any) => (
                                            <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="py-3 px-6 w-32">
                                                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-md text-xs font-bold">{doc.document_type}</span>
                                                </td>
                                                <td className="py-3 px-6 font-medium text-slate-900">{doc.file_name}</td>
                                                <td className="py-3 px-6 text-right text-xs text-slate-400">{new Date(doc.uploaded_at).toLocaleDateString()}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={3} className="py-8 text-center text-slate-500">
                                                ドキュメントは登録されていません
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
