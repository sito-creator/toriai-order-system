"use client";

import { useState } from 'react';
import { Settings as SettingsIcon, User, Building2, Bell, Key, Database, Globe, Sliders } from 'lucide-react';

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('company');

    const tabs = [
        { id: 'company', icon: <Building2 size={18} />, label: '会社・基本設定' },
        { id: 'master', icon: <Database size={18} />, label: '全社マスタ管理' },
        { id: 'user', icon: <User size={18} />, label: 'ユーザー・権限設定' },
    ];

    return (
        <div className="space-y-6 max-w-6xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <SettingsIcon className="text-indigo-600" />
                        <span>システム設定・マスタ管理</span>
                    </h1>
                    <p className="text-slate-500 mt-1">会社情報・ユーザー権限・各種共有マスタを管理します</p>
                </div>
                <div className="flex gap-3">
                    <button className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white rounded-xl font-bold transition-all shadow-sm shadow-indigo-200 hover:-translate-y-0.5">
                        設定を保存して適用
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Settings Navigation Sidebar */}
                <div className="md:col-span-1 space-y-1.5">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold transition-all ${activeTab === tab.id
                                    ? 'bg-indigo-50/80 border border-indigo-100/50 text-indigo-700 shadow-sm'
                                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 transparent border border-transparent'
                                }`}
                        >
                            <div className={`transition-colors duration-300 ${activeTab === tab.id ? 'text-indigo-600' : 'text-slate-400'}`}>
                                {tab.icon}
                            </div>
                            <span>{tab.label}</span>
                            {activeTab === tab.id && (
                                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-600 -mr-1"></div>
                            )}
                        </button>
                    ))}
                </div>

                {/* Settings Content Area */}
                <div className="md:col-span-3 space-y-6">

                    {activeTab === 'company' && (
                        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="px-6 py-4 border-b border-slate-100">
                                <h2 className="text-lg font-bold text-slate-800">会社・基本情報の設定</h2>
                                <p className="text-sm text-slate-500 mt-1">請求書や各種帳票に印字される自社の基本情報です。正確に入力してください。</p>
                            </div>
                            <div className="p-6 space-y-5">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700">会社名（正式名称）</label>
                                        <input type="text" defaultValue="株式会社デモ商事" className="w-full bg-slate-50 hover:bg-slate-100/50 border border-slate-200 text-slate-900 rounded-lg py-2.5 px-3 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-sm font-semibold" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700">代表者名</label>
                                        <input type="text" defaultValue="山田 太郎" className="w-full bg-slate-50 hover:bg-slate-100/50 border border-slate-200 text-slate-900 rounded-lg py-2.5 px-3 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-sm" />
                                    </div>
                                    <div className="space-y-2 sm:col-span-2">
                                        <label className="text-sm font-bold text-slate-700">所在地 (住所)</label>
                                        <input type="text" defaultValue="東京都渋谷区デモ 1-2-3 イノベーションビル3F" className="w-full bg-slate-50 hover:bg-slate-100/50 border border-slate-200 text-slate-900 rounded-lg py-2.5 px-3 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-sm" />
                                    </div>
                                    <div className="space-y-2 sm:col-span-2">
                                        <label className="text-sm font-bold text-slate-700">インボイス 適格請求書発行事業者登録番号</label>
                                        <input type="text" defaultValue="T1234567890123" className="w-full bg-slate-50 hover:bg-slate-100/50 border border-slate-200 text-slate-900 rounded-lg py-2.5 px-3 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-sm font-mono tracking-widest font-semibold text-indigo-900" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700">システムデフォルトタイムゾーン</label>
                                        <div className="relative">
                                            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                            <select className="w-full bg-slate-50 hover:bg-slate-100/50 border border-slate-200 text-slate-900 rounded-lg py-2.5 pl-9 pr-3 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-sm appearance-none font-semibold cursor-pointer">
                                                <option>Asia/Tokyo (JST)</option>
                                                <option>UTC</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'master' && (
                        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="px-6 py-4 border-b border-slate-100">
                                <h2 className="text-lg font-bold text-slate-800">全社共通・基礎マスタ</h2>
                                <p className="text-sm text-slate-500 mt-1">税率や振込先口座など、各管理一覧機能で連動する大元の設定です</p>
                            </div>
                            <div className="p-6">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-100/50 transition-all cursor-pointer group">
                                        <div>
                                            <h3 className="font-bold text-slate-800 text-sm group-hover:text-indigo-700 transition-colors">税率・課税マスタ</h3>
                                            <p className="text-xs text-slate-500 mt-1 font-medium">商品登録時に表示される消費税率（10%, 8%）と端数処理フラグ</p>
                                        </div>
                                        <button className="text-sm font-bold text-indigo-600 px-4 py-2 bg-white border border-slate-200 rounded-lg shadow-sm group-hover:shadow group-hover:border-indigo-200 transition-all">開く</button>
                                    </div>
                                    <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-100/50 transition-all cursor-pointer group">
                                        <div>
                                            <h3 className="font-bold text-slate-800 text-sm group-hover:text-indigo-700 transition-colors">自社振込先口座マスタ</h3>
                                            <p className="text-xs text-slate-500 mt-1 font-medium">請求書PDFファイルに印字されるお支払い先・銀行口座情報</p>
                                        </div>
                                        <button className="text-sm font-bold text-indigo-600 px-4 py-2 bg-white border border-slate-200 rounded-lg shadow-sm group-hover:shadow group-hover:border-indigo-200 transition-all">開く</button>
                                    </div>
                                    <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-100/50 transition-all cursor-pointer group">
                                        <div>
                                            <h3 className="font-bold text-slate-800 text-sm group-hover:text-indigo-700 transition-colors">受注ステータスマスタ</h3>
                                            <p className="text-xs text-slate-500 mt-1 font-medium">受注管理で利用される進捗ステータスバッジ（確定, 準備, 完了等）</p>
                                        </div>
                                        <button className="text-sm font-bold text-indigo-600 px-4 py-2 bg-white border border-slate-200 rounded-lg shadow-sm group-hover:shadow group-hover:border-indigo-200 transition-all">開く</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'user' && (
                        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col justify-center items-center py-24 px-4 text-center animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <User size={48} className="text-slate-300 mb-4" />
                            <h3 className="font-bold text-slate-800 text-lg">近日公開予定</h3>
                            <p className="text-sm text-slate-500 mt-1">メンバーの追加や権限レベル（閲覧・編集・管理者など機能制限）の設定機能は現在準備中です</p>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
