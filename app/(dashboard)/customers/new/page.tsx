import { createClient } from '@/utils/supabase/server';
import { getCurrentCompanyId } from '@/utils/auth';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { Save, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewCustomerPage() {
    async function addCustomer(formData: FormData) {
        'use server';
        const supabase = await createClient();
        const companyId = await getCurrentCompanyId();
        const { error } = await supabase.from('customers').insert([{
            company_id: companyId,
            company_name: formData.get('company_name'),
            department: formData.get('department'),
            contact_name: formData.get('contact_name'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            closing_day: formData.get('closing_day'),
            payment_terms: formData.get('payment_terms')
        }]);

        if (!error) {
            revalidatePath('/customers');
            redirect('/customers');
        } else {
            console.error(error);
        }
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/customers" className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-lg transition-colors">
                    <ArrowLeft size={20} />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">新規顧客の登録</h1>
                    <p className="text-slate-500 mt-1">取引先企業の情報をマスタに追加し、受注・請求で利用できるようにします</p>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <form action={addCustomer} className="p-6 space-y-6">
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

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">請求締日</label>
                            <select name="closing_day" className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg py-2.5 px-3 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 transition-all font-bold cursor-pointer">
                                <option value="月末締め">月末締め</option>
                                <option value="20日締め">20日締め</option>
                                <option value="15日締め">15日締め</option>
                                <option value="随時">随時</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">支払条件（回収日）</label>
                            <select name="payment_terms" className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg py-2.5 px-3 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 transition-all font-bold cursor-pointer">
                                <option value="翌月末払い">翌月末払い</option>
                                <option value="翌々月末払い">翌々月末払い</option>
                                <option value="翌月20日払い">翌月20日払い</option>
                            </select>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100 flex justify-end gap-3 mt-8">
                        <Link href="/customers" className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors">
                            キャンセル
                        </Link>
                        <button type="submit" className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-sm shadow-indigo-200 hover:-translate-y-0.5">
                            <Save size={18} />
                            <span>本番データベースに登録</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
