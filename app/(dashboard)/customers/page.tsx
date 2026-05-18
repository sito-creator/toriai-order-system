import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { Building2, Search, Plus, MoreHorizontal, Mail, Phone } from 'lucide-react';

export default async function CustomersPage() {
    const supabase = await createClient();
    // Fetch from the actual Supabase database table we just created!
    const { data: customers } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">顧客管理</h1>
                    <p className="text-slate-500 mt-1">取引先企業の情報を管理・登録します</p>
                </div>
                <Link href="/customers/new" className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-medium transition-colors shadow-sm shadow-indigo-200">
                    <Plus size={18} />
                    <span>新規顧客を登録</span>
                </Link>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                {/* Toolbar */}
                <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="会社名や担当者で検索..."
                            className="w-full bg-slate-50 hover:bg-slate-100/50 border border-slate-200 text-slate-900 rounded-lg py-2.5 pl-10 pr-4 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-sm"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
                        <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                            <tr>
                                <th className="font-medium py-3.5 px-6">企業情報</th>
                                <th className="font-medium py-3.5 px-6">担当者</th>
                                <th className="font-medium py-3.5 px-6">連絡先</th>
                                <th className="font-medium py-3.5 px-6">締日/支払条件</th>
                                <th className="font-medium py-3.5 px-6 text-right">アクション</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {customers && customers.length > 0 ? (
                                customers.map((customer) => (
                                    <tr key={customer.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500 shrink-0 shadow-sm">
                                                    <Building2 size={20} />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-900">{customer.company_name}</p>
                                                    {customer.department && <p className="text-xs text-slate-500 mt-0.5">{customer.department}</p>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className="text-slate-700 font-medium">{customer.contact_name || '未設定'}</span>
                                        </td>
                                        <td className="py-4 px-6 space-y-1.5 text-slate-600">
                                            {customer.email && (
                                                <div className="flex items-center gap-2">
                                                    <Mail size={14} className="text-slate-400" />
                                                    <span className="text-xs">{customer.email}</span>
                                                </div>
                                            )}
                                            {customer.phone && (
                                                <div className="flex items-center gap-2">
                                                    <Phone size={14} className="text-slate-400" />
                                                    <span className="text-xs">{customer.phone}</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="text-xs space-y-1">
                                                <p><span className="text-slate-400 mr-2 font-medium">締日</span>{customer.closing_day || '-'}</p>
                                                <p><span className="text-slate-400 mr-2 font-medium">支払</span>{customer.payment_terms || '-'}</p>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                                                <MoreHorizontal size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="py-16 text-center text-slate-500">
                                        <Building2 size={40} className="mx-auto text-slate-300 mb-4" />
                                        <p className="font-bold text-slate-700 text-base">顧客データがありません</p>
                                        <p className="text-sm mt-1 mb-6 text-slate-500">最初の顧客情報を登録して管理を始めましょう</p>
                                        <button className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:shadow-lg hover:-translate-y-0.5">
                                            <Plus size={16} />
                                            <span>新規登録をおこなう</span>
                                        </button>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
