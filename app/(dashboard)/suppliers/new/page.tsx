import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { Save, ArrowLeft, Building2 } from 'lucide-react';
import Link from 'next/link';

export default function NewSupplierPage() {
    async function addSupplier(formData: FormData) {
        'use server';
        const supabase = await createClient();
        const { error } = await supabase.from('suppliers').insert([{
            company_name: formData.get('company_name'),
            department: formData.get('department'),
            contact_name: formData.get('contact_name'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            payment_terms: formData.get('payment_terms')
        }]);

        if (!error) {
            revalidatePath('/suppliers');
            redirect('/suppliers');
        } else {
            console.error(error);
        }
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/suppliers" className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-lg transition-colors">
                    <ArrowLeft size={20} />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Building2 size={24} className="text-indigo-600" />
                        新規仕入先の登録
                    </h1>
                    <p className="text-slate-500 mt-1">仕入先企業の情報をマスタに追加し、発注作成で利用できるようにします</p>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <form action={addSupplier} className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-bold text-slate-700">会社名・屋号 <span className="text-rose-500">*</span></label>
                            <input name="company_name" required type="text" placeholder="例: 株式会社ミライテクノロジー" className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg py-2.5 px-3 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-semibold" />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">部署名</label>
                            <input name="department" type="text" placeholder="例: 購買部" className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg py-2.5 px-3 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 transition-all font-medium" />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">担当者名</label>
                            <input name="contact_name" type="text" placeholder="例: 鈴木 一郎" className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg py-2.5 px-3 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 transition-all font-medium" />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">メールアドレス</label>
                            <input name="email" type="email" placeholder="例: info@example.com" className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg py-2.5 px-3 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 transition-all font-medium" />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">電話番号</label>
                            <input name="phone" type="tel" placeholder="例: 03-1234-5678" className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg py-2.5 px-3 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 transition-all font-medium" />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-bold text-slate-700">支払条件</label>
                            <select name="payment_terms" className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg py-2.5 px-3 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 transition-all font-bold cursor-pointer">
                                <option value="月末締め翌月末払い">月末締め翌月末払い</option>
                                <option value="月末締め翌々月末払い">月末締め翌々月末払い</option>
                                <option value="20日締め翌月20日払い">20日締め翌月20日払い</option>
                                <option value="前払い">前払い</option>
                                <option value="代金引換">代金引換</option>
                            </select>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100 flex justify-end gap-3 mt-8">
                        <Link href="/suppliers" className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors">
                            キャンセル
                        </Link>
                        <button type="submit" className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-sm shadow-indigo-200 hover:-translate-y-0.5">
                            <Save size={18} />
                            <span>仕入先を登録</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
