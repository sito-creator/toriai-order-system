import { createClient } from '@/utils/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { Save, ArrowLeft, AlertCircle, Building2 } from 'lucide-react';
import Link from 'next/link';
import DeleteMasterButton from '@/app/components/delete-master-button';
import { SUPPLIER_PAYMENT_TERMS, masterTermOptions } from '@/utils/master-term-options';

export const dynamic = 'force-dynamic';

export default async function EditSupplierPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ error?: string; success?: string }>;
}) {
    const { id } = await params;
    const query = await searchParams;
    const supabase = await createClient();

    const { data: supplier, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !supplier) {
        notFound();
    }

    async function updateSupplier(formData: FormData) {
        'use server';
        const supabase = await createClient();
        const { error } = await supabase
            .from('suppliers')
            .update({
                company_name: formData.get('company_name'),
                department: formData.get('department') || null,
                contact_name: formData.get('contact_name') || null,
                email: formData.get('email') || null,
                phone: formData.get('phone') || null,
                payment_terms: formData.get('payment_terms') || null,
            })
            .eq('id', id);

        if (error) {
            redirect(`/suppliers/${id}/edit?error=${encodeURIComponent(error.message)}`);
            return;
        }

        revalidatePath('/suppliers');
        redirect(`/suppliers/${id}/edit?success=1`);
    }

    async function deleteSupplier(formData: FormData) {
        'use server';
        if (formData.get('confirm_delete') !== id) {
            redirect(`/suppliers/${id}/edit?error=${encodeURIComponent('削除確認を行ってください。')}`);
        }
        const supabase = await createClient();
        const { error } = await supabase.from('suppliers').delete().eq('id', id);
        if (error) {
            redirect(`/suppliers/${id}/edit?error=${encodeURIComponent(error.message)}`);
            return;
        }
        revalidatePath('/suppliers');
        redirect('/suppliers');
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/suppliers" className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-lg transition-colors">
                    <ArrowLeft size={20} />
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Building2 size={24} className="text-orange-600" />
                        仕入先情報の編集
                    </h1>
                    <p className="text-slate-500 mt-1">{supplier.company_name} の情報を変更します</p>
                </div>
                <DeleteMasterButton id={id} name={supplier.company_name} entityLabel="仕入先" action={deleteSupplier} />
            </div>

            {query.error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-start gap-2">
                    <AlertCircle size={18} className="mt-0.5 shrink-0" />
                    <div><p className="font-bold">エラー</p><p className="mt-1">{query.error}</p></div>
                </div>
            )}

            {query.success && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm font-bold">
                    ✓ 仕入先情報を更新しました
                </div>
            )}

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <form action={updateSupplier} className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-bold text-slate-700">会社名・屋号 <span className="text-rose-500">*</span></label>
                            <input name="company_name" required type="text" defaultValue={supplier.company_name} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg py-2.5 px-3 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-semibold" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">部署名</label>
                            <input name="department" type="text" defaultValue={supplier.department || ''} placeholder="例: 営業部" className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg py-2.5 px-3 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 transition-all font-medium" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">担当者名</label>
                            <input name="contact_name" type="text" defaultValue={supplier.contact_name || ''} placeholder="例: 鈴木 一郎" className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg py-2.5 px-3 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 transition-all font-medium" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">メールアドレス</label>
                            <input name="email" type="email" defaultValue={supplier.email || ''} placeholder="例: info@example.com" className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg py-2.5 px-3 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 transition-all font-medium" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">電話番号</label>
                            <input name="phone" type="tel" defaultValue={supplier.phone || ''} placeholder="例: 03-1234-5678" className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg py-2.5 px-3 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 transition-all font-medium" />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <label htmlFor="payment_terms" className="text-sm font-bold text-slate-700">支払条件</label>
                            <select id="payment_terms" name="payment_terms" defaultValue={supplier.payment_terms ?? ''} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg py-2.5 px-3 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 transition-all font-bold cursor-pointer">
                                <option value="">未設定</option>
                                {masterTermOptions(supplier.payment_terms, SUPPLIER_PAYMENT_TERMS).map(value => <option key={value} value={value}>{value}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100 flex justify-end gap-3 mt-8">
                        <Link href="/suppliers" className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors">
                            キャンセル
                        </Link>
                        <button type="submit" className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-sm shadow-indigo-200 hover:-translate-y-0.5">
                            <Save size={18} />
                            <span>変更を保存</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
