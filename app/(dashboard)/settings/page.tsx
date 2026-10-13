"use client";

import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, User, Building2, Bell, Key, Database, Globe, Sliders, Palette, Image as ImageIcon, LayoutTemplate, Loader2, AlertCircle, Mail, X, FileDown, Link2, Copy, Check, RefreshCw, CreditCard } from 'lucide-react';
import CsvFormatConfig from './csv-format-config';
import StripeConnectSettings from './stripe-connect-settings';
import { useRef } from 'react';
import { getCurrentCompanyInfo, getCompanyMembers, updateCompanyInfo, getCompanyInvitations, inviteUserToCompany, cancelInvitation, getCompanySettings, updateCompanySettings, getTaxRates, getBankAccounts, saveTaxRate, deleteTaxRate, saveBankAccount, deleteBankAccount, uploadCompanyAsset, getCompanyInviteCode, regenerateInviteCode, removeMember } from '@/app/actions/settings';

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('company');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [company, setCompany] = useState<any>(null);
    const [members, setMembers] = useState<any[]>([]);
    const [invitations, setInvitations] = useState<any[]>([]);
    const [myRole, setMyRole] = useState<string>('');
    const [myId, setMyId] = useState<string>('');
    const [companySettings, setCompanySettings] = useState<any>({ theme_color: '#4f46e5', layout_type: 'modern' });
    const [taxRates, setTaxRates] = useState<any[]>([]);
    const [bankAccounts, setBankAccounts] = useState<any[]>([]);

    // Modals
    const [editingTax, setEditingTax] = useState<any>(null);
    const [editingBank, setEditingBank] = useState<any>(null);

    // Upload
    const logoInputRef = useRef<HTMLInputElement>(null);
    const stampInputRef = useRef<HTMLInputElement>(null);
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);
    const [isUploadingStamp, setIsUploadingStamp] = useState(false);

    const [message, setMessage] = useState('');
    
    const [showInviteForm, setShowInviteForm] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState('member');
    const [isInviting, setIsInviting] = useState(false);
    const [inviteCode, setInviteCode] = useState<string | null>(null);
    const [isCopied, setIsCopied] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);

    const loadSettingsData = async () => {
        try {
            console.log("Loading settings data: Start");
            
            // Promise.raceを追加してサーバーアクションがタイムアウトするか検証します
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error("サーバーの応答がタイムアウトしました。Next.jsサーバーを再起動してみてください。")), 10000)
            );
            
            console.log("Fetching company info...");
            const info: any = await Promise.race([
                getCurrentCompanyInfo(),
                timeoutPromise
            ]);
            
            console.log("Company info loaded:", info);
            
            if (info?.error) {
                throw new Error(info.error);
            }
            
            const comp = Array.isArray(info.company) ? info.company[0] : info.company;
            setCompany(comp);
            setMyRole(info.myRole);
            setMyId(info.myProfileId);
            
            if (comp && comp.id) {
                console.log("Fetching members and invitations...");
                const [memberList, inviteList, settingsData, taxData, bankData]: any = await Promise.race([
                    Promise.all([
                        getCompanyMembers(comp.id),
                        getCompanyInvitations(comp.id),
                        getCompanySettings(comp.id),
                        getTaxRates(comp.id),
                        getBankAccounts(comp.id)
                    ]),
                    timeoutPromise
                ]);
                
                console.log("Members loaded:", memberList?.length);
                setMembers(memberList);
                setInvitations(inviteList);
                setCompanySettings(settingsData);
                setTaxRates(taxData);
                setBankAccounts(bankData);
                
                // 招待コードを取得
                try {
                    const codes = await getCompanyInviteCode(comp.id);
                    setInviteCode(codes?.staffInviteCode || null);
                } catch (e) {
                    console.log('invite_code not available yet');
                }
            }
        } catch (err: any) {
            console.error("Failed to load settings:", err);
            setMessage("エラーが発生しました: " + err.message);
        } finally {
            console.log("Loading settings data: End");
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const requestedTab = new URLSearchParams(window.location.search).get('tab');
        if (requestedTab) setActiveTab(requestedTab);
        loadSettingsData();
    }, []);

    const handleSaveCompany = async () => {
        if (!company || !company.id) return;
        setIsSaving(true);
        setMessage('');
        try {
            // 会社名はcompaniesテーブルに保存
            await updateCompanyInfo(company.id, company.name);
            // 代表者名・住所・登録番号はcompany_settingsに保存
            await updateCompanySettings(company.id, {
                ...companySettings,
                representative_name: companySettings.representative_name || '',
                address: companySettings.address || '',
                registration_number: companySettings.registration_number || '',
            });
            setMessage('会社情報を保存しました！');
            setTimeout(() => setMessage(''), 3000);
        } catch (err: any) {
            setMessage('保存エラー: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveDesign = async () => {
        if (!company || !company.id) return;
        setIsSaving(true);
        setMessage('');
        try {
            await updateCompanySettings(company.id, {
                theme_color: companySettings.theme_color,
                layout_type: companySettings.layout_type
            });
            setMessage('帳票デザインを保存しました！');
            setTimeout(() => setMessage(''), 3000);
        } catch (err: any) {
            setMessage('保存エラー: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveAccounting = async () => {
        if (!company || !company.id) return;
        setIsSaving(true);
        setMessage('');
        try {
            await updateCompanySettings(company.id, {
                csv_export_format: companySettings.csv_export_format || {}
            });
            setMessage('会計連携設定を保存しました！');
            setTimeout(() => setMessage(''), 3000);
        } catch (err: any) {
            setMessage('保存エラー: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveTaxRate = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('');
        try {
            await saveTaxRate(company.id, editingTax);
            setMessage('税率マスタを保存しました');
            setEditingTax(null);
            loadSettingsData();
        } catch (err: any) {
            setMessage('エラー: ' + err.message);
        }
    };

    const handleDeleteTaxRate = async (id: string) => {
        if(!confirm('本当に削除しますか？')) return;
        try {
            await deleteTaxRate(id);
            setMessage('削除しました');
            loadSettingsData();
        } catch (err: any) {
            setMessage('エラー: ' + err.message);
        }
    };

    const handleSaveBankAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('');
        try {
            await saveBankAccount(company.id, editingBank);
            setMessage('口座マスタを保存しました');
            setEditingBank(null);
            loadSettingsData();
        } catch (err: any) {
            setMessage('エラー: ' + err.message);
        }
    };

    const handleDeleteBankAccount = async (id: string) => {
        if(!confirm('本当に削除しますか？')) return;
        try {
            await deleteBankAccount(id);
            setMessage('削除しました');
            loadSettingsData();
        } catch (err: any) {
            setMessage('エラー: ' + err.message);
        }
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!company || !company.id || !inviteEmail) return;
        setIsInviting(true);
        setMessage('');
        try {
            await inviteUserToCompany(company.id, inviteEmail, inviteRole);
            setInviteEmail('');
            setShowInviteForm(false);
            setMessage('招待を送信しました！');
            loadSettingsData();
            setTimeout(() => setMessage(''), 3000);
        } catch (err: any) {
            setMessage('招待エラー: ' + err.message);
        } finally {
            setIsInviting(false);
        }
    };

    const handleCancelInvite = async (inviteId: string) => {
        try {
            await cancelInvitation(inviteId);
            loadSettingsData();
        } catch (err: any) {
            setMessage('取消エラー: ' + err.message);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'stamp') => {
        const file = e.target.files?.[0];
        if (!file || !company || !company.id) return;
        if (type === 'logo') setIsUploadingLogo(true);
        else setIsUploadingStamp(true);
        setMessage('');

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('type', type);

            const publicUrl = await uploadCompanyAsset(company.id, formData);
            
            // UI上の状態も更新
            const newSettings = { ...companySettings, [type === 'logo' ? 'logo_url' : 'stamp_url']: publicUrl };
            setCompanySettings(newSettings);

            // DBに保存
            await updateCompanySettings(company.id, {
                theme_color: companySettings.theme_color,
                layout_type: companySettings.layout_type,
                logo_url: type === 'logo' ? publicUrl : companySettings.logo_url,
                stamp_url: type === 'stamp' ? publicUrl : companySettings.stamp_url
            });

            setMessage(`${type === 'logo' ? '企業ロゴ' : '社印'}をアップロードして保存しました！`);
        } catch (err: any) {
            setMessage('アップロードエラー: ' + err.message);
        } finally {
            if (type === 'logo') setIsUploadingLogo(false);
            else setIsUploadingStamp(false);
            
            // clear value so same file can be uploaded again if needed
            if (e.target) e.target.value = '';
        }
    };

    const tabs = [
        { id: 'company', icon: <Building2 size={18} />, label: '会社・基本設定' },
        { id: 'design', icon: <Palette size={18} />, label: 'デザイン・ロゴ出力設定' },
        { id: 'master', icon: <Database size={18} />, label: '全社マスタ管理' },
        { id: 'accounting', icon: <FileDown size={18} />, label: '会計ソフト連携' },
        { id: 'payments', icon: <CreditCard size={18} />, label: 'オンライン決済連携' },
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
                    <button 
                        onClick={activeTab === 'company' ? handleSaveCompany : activeTab === 'design' ? handleSaveDesign : activeTab === 'accounting' ? handleSaveAccounting : undefined}
                        disabled={isSaving || !['company', 'design', 'accounting'].includes(activeTab)}
                        className={`px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white rounded-xl font-bold transition-all shadow-sm shadow-indigo-200 hover:-translate-y-0.5 flex items-center gap-2 ${isSaving || !['company', 'design', 'accounting'].includes(activeTab) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {isSaving && <Loader2 size={16} className="animate-spin" />}
                        設定を保存して適用
                    </button>
                </div>
            </div>

            {message && (
                <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-3 rounded-lg flex items-center gap-2 text-sm font-bold animate-in fade-in zoom-in-95">
                    <AlertCircle size={16} />
                    {message}
                </div>
            )}

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-indigo-600">
                    <Loader2 size={32} className="animate-spin mb-4" />
                    <p className="font-bold">設定情報を読み込み中...</p>
                </div>
            ) : (
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
                                        <input 
                                            type="text" 
                                            value={company?.name || ''} 
                                            onChange={(e) => setCompany({ ...company, name: e.target.value })}
                                            className="w-full bg-slate-50 hover:bg-slate-100/50 border border-slate-200 text-slate-900 rounded-lg py-2.5 px-3 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-sm font-semibold" 
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700">代表者名</label>
                                        <input 
                                            type="text" 
                                            value={companySettings?.representative_name || ''} 
                                            onChange={(e) => setCompanySettings({ ...companySettings, representative_name: e.target.value })}
                                            placeholder="例: 山田 太郎"
                                            className="w-full bg-slate-50 hover:bg-slate-100/50 border border-slate-200 text-slate-900 rounded-lg py-2.5 px-3 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-sm" 
                                        />
                                    </div>
                                    <div className="space-y-2 sm:col-span-2">
                                        <label className="text-sm font-bold text-slate-700">所在地 (住所)</label>
                                        <input 
                                            type="text" 
                                            value={companySettings?.address || ''} 
                                            onChange={(e) => setCompanySettings({ ...companySettings, address: e.target.value })}
                                            placeholder="例: 東京都渋谷区〇〇 1-2-3 ビル名3F"
                                            className="w-full bg-slate-50 hover:bg-slate-100/50 border border-slate-200 text-slate-900 rounded-lg py-2.5 px-3 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-sm" 
                                        />
                                    </div>
                                    <div className="space-y-2 sm:col-span-2">
                                        <label className="text-sm font-bold text-slate-700">インボイス 適格請求書発行事業者登録番号</label>
                                        <input 
                                            type="text" 
                                            value={companySettings?.registration_number || ''} 
                                            onChange={(e) => setCompanySettings({ ...companySettings, registration_number: e.target.value })}
                                            placeholder="例: T1234567890123"
                                            className="w-full bg-slate-50 hover:bg-slate-100/50 border border-slate-200 text-slate-900 rounded-lg py-2.5 px-3 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-sm font-mono tracking-widest font-semibold text-indigo-900" 
                                        />
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

                    {activeTab === 'design' && (
                        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-800">帳票のデザイン・ロゴ設定</h2>
                                    <p className="text-sm text-slate-500 mt-1">見積書や請求書のPDF出力時のレイアウトや企業ロゴを設定します</p>
                                </div>
                            </div>
                            <div className="p-6 space-y-6">
                                <div className="space-y-4">
                                    <h3 className="font-bold text-slate-700 flex items-center gap-2">
                                        <ImageIcon size={18} className="text-indigo-500" />ロゴ・印影画像
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        {/* Logo Upload */}
                                        <div 
                                            onClick={() => !isUploadingLogo && logoInputRef.current?.click()}
                                            className={`border-2 border-dashed ${companySettings.logo_url ? 'border-indigo-300 bg-indigo-50/30' : 'border-slate-200'} rounded-xl p-6 text-center hover:bg-slate-50 hover:border-indigo-300 transition-all cursor-pointer relative`}
                                        >
                                            <input type="file" ref={logoInputRef} className="hidden" accept="image/png, image/jpeg" onChange={(e) => handleFileUpload(e, 'logo')} />
                                            
                                            {isUploadingLogo ? (
                                                <div className="flex flex-col items-center justify-center py-4">
                                                    <Loader2 className="animate-spin text-indigo-500 mb-2" size={24} />
                                                    <p className="text-sm font-bold text-slate-500">アップロード中...</p>
                                                </div>
                                            ) : companySettings.logo_url ? (
                                                <div className="flex flex-col items-center justify-center">
                                                    <div className="w-full h-24 mb-4 flex items-center justify-center">
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img src={companySettings.logo_url} alt="Logo" className="max-h-full max-w-full object-contain" />
                                                    </div>
                                                    <p className="font-bold text-indigo-700 text-sm">変更するにはクリック</p>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
                                                        <ImageIcon size={24} />
                                                    </div>
                                                    <p className="font-bold text-slate-700 text-sm">企業ロゴファイルのアップロード</p>
                                                    <p className="text-xs text-slate-500 mt-1">PNG, JPG (推奨サイズ: 400x120px)</p>
                                                </>
                                            )}
                                        </div>

                                        {/* Stamp Upload */}
                                        <div 
                                            onClick={() => !isUploadingStamp && stampInputRef.current?.click()}
                                            className={`border-2 border-dashed ${companySettings.stamp_url ? 'border-indigo-300 bg-indigo-50/30' : 'border-slate-200'} rounded-xl p-6 text-center hover:bg-slate-50 hover:border-indigo-300 transition-all cursor-pointer relative`}
                                        >
                                            <input type="file" ref={stampInputRef} className="hidden" accept="image/png" onChange={(e) => handleFileUpload(e, 'stamp')} />
                                            
                                            {isUploadingStamp ? (
                                                <div className="flex flex-col items-center justify-center py-4">
                                                    <Loader2 className="animate-spin text-indigo-500 mb-2" size={24} />
                                                    <p className="text-sm font-bold text-slate-500">アップロード中...</p>
                                                </div>
                                            ) : companySettings.stamp_url ? (
                                                <div className="flex flex-col items-center justify-center">
                                                    <div className="w-24 h-24 mb-4 flex items-center justify-center bg-white rounded-lg p-2 shadow-sm border border-slate-100">
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img src={companySettings.stamp_url} alt="Stamp" className="max-h-full max-w-full object-contain" />
                                                    </div>
                                                    <p className="font-bold text-indigo-700 text-sm">変更するにはクリック</p>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
                                                        <ImageIcon size={24} />
                                                    </div>
                                                    <p className="font-bold text-slate-700 text-sm">社印（角印）のアップロード</p>
                                                    <p className="text-xs text-slate-500 mt-1">透過PNG (推奨サイズ: 200x200px)</p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-100 space-y-4">
                                    <h3 className="font-bold text-slate-700 flex items-center gap-2">
                                        <LayoutTemplate size={18} className="text-indigo-500" />PDFレイアウト設定
                                    </h3>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-slate-700">テーマカラー (帳票のアクセント色)</label>
                                            <div className="flex gap-3 text-sm">
                                                <button onClick={() => setCompanySettings({...companySettings, theme_color: '#1e293b'})} className={`w-8 h-8 rounded-full bg-slate-800 transition-all ${companySettings.theme_color === '#1e293b' ? 'ring-2 ring-offset-2 ring-slate-800' : ''}`}></button>
                                                <button onClick={() => setCompanySettings({...companySettings, theme_color: '#4f46e5'})} className={`w-8 h-8 rounded-full bg-indigo-600 transition-all ${companySettings.theme_color === '#4f46e5' ? 'ring-2 ring-offset-2 ring-indigo-600' : ''}`}></button>
                                                <button onClick={() => setCompanySettings({...companySettings, theme_color: '#2563eb'})} className={`w-8 h-8 rounded-full bg-blue-600 transition-all ${companySettings.theme_color === '#2563eb' ? 'ring-2 ring-offset-2 ring-blue-600' : ''}`}></button>
                                                <button onClick={() => setCompanySettings({...companySettings, theme_color: '#059669'})} className={`w-8 h-8 rounded-full bg-emerald-600 transition-all ${companySettings.theme_color === '#059669' ? 'ring-2 ring-offset-2 ring-emerald-600' : ''}`}></button>
                                                <button onClick={() => setCompanySettings({...companySettings, theme_color: '#e11d48'})} className={`w-8 h-8 rounded-full bg-rose-600 transition-all ${companySettings.theme_color === '#e11d48' ? 'ring-2 ring-offset-2 ring-rose-600' : ''}`}></button>
                                                <input 
                                                    type="color" 
                                                    value={companySettings.theme_color} 
                                                    onChange={(e) => setCompanySettings({...companySettings, theme_color: e.target.value})}
                                                    className="w-8 h-8 rounded-full cursor-pointer border-0 p-0" 
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-slate-700">レイアウトテンプレート</label>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div 
                                                    onClick={() => setCompanySettings({...companySettings, layout_type: 'modern'})}
                                                    className={`border-2 rounded-xl p-4 cursor-pointer relative transition-all ${companySettings.layout_type === 'modern' ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-200 hover:border-indigo-300'}`}
                                                >
                                                    {companySettings.layout_type === 'modern' && (
                                                        <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center">
                                                            <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                                                        </div>
                                                    )}
                                                    <div className="font-bold text-indigo-900 text-sm mb-2">モダン（デフォルト）</div>
                                                    <div className="h-20 bg-white border border-slate-200 rounded flex flex-col p-2 gap-1.5 shadow-sm">
                                                        <div className="w-1/3 h-2 bg-slate-200 rounded"></div>
                                                        <div className="w-full h-1 bg-indigo-500/20 rounded mt-auto"></div>
                                                        <div className="w-full h-1 bg-slate-100 rounded"></div>
                                                        <div className="w-full h-1 bg-slate-100 rounded"></div>
                                                    </div>
                                                </div>
                                                <div 
                                                    onClick={() => setCompanySettings({...companySettings, layout_type: 'classic'})}
                                                    className={`border-2 rounded-xl p-4 cursor-pointer relative transition-all ${companySettings.layout_type === 'classic' ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-200 hover:border-indigo-300'}`}
                                                >
                                                    {companySettings.layout_type === 'classic' && (
                                                        <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center">
                                                            <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                                                        </div>
                                                    )}
                                                    <div className="font-bold text-slate-700 text-sm mb-2">クラシック（従来型）</div>
                                                    <div className="h-20 bg-white border border-slate-200 rounded flex flex-col p-2 gap-1.5">
                                                        <div className="w-full h-2 border-b-2 border-slate-300 mb-1 flex justify-between pr-2">
                                                            <div className="w-1/4 h-1 bg-slate-300"></div>
                                                        </div>
                                                        <div className="w-full h-1 border-b border-slate-200 pb-1 flex justify-between"></div>
                                                        <div className="w-full border border-slate-200 h-6"></div>
                                                    </div>
                                                </div>
                                            </div>
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
                                    {/* 税率・課税マスタ */}
                                    <div className="border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden">
                                        <div className="flex items-center justify-between p-4 bg-slate-50 border-b border-slate-200">
                                            <div>
                                                <h3 className="font-bold text-slate-800 text-sm">税率・課税マスタ</h3>
                                                <p className="text-xs text-slate-500 mt-1">商品登録時に表示される消費税率（10%, 8%）と端数処理フラグ</p>
                                            </div>
                                            <button 
                                                onClick={() => setEditingTax({ name: '', rate: 10, is_default: false })}
                                                className="text-white text-xs font-bold px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-sm transition-all"
                                            >
                                                + 新規追加
                                            </button>
                                        </div>
                                        <div className="p-0">
                                            <table className="w-full text-sm text-left">
                                                <tbody>
                                                    {taxRates.map(tax => (
                                                        <tr key={tax.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                                                            <td className="py-3 px-4 font-bold text-slate-700">
                                                                {tax.name} <span className="text-slate-400 font-normal ml-2">{tax.rate}%</span>
                                                                {tax.is_default && <span className="ml-2 px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] rounded-full">デフォルト</span>}
                                                            </td>
                                                            <td className="py-3 px-4 text-right">
                                                                <button onClick={() => setEditingTax(tax)} className="text-indigo-600 hover:text-indigo-800 text-xs font-bold mr-3">編集</button>
                                                                <button onClick={() => handleDeleteTaxRate(tax.id)} className="text-rose-500 hover:text-rose-700 text-xs font-bold">削除</button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {taxRates.length === 0 && (
                                                        <tr>
                                                            <td colSpan={2} className="py-6 text-center text-slate-400 text-xs text-slate-500">データがありません</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* 振込先口座マスタ */}
                                    <div className="border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden mt-6">
                                        <div className="flex items-center justify-between p-4 bg-slate-50 border-b border-slate-200">
                                            <div>
                                                <h3 className="font-bold text-slate-800 text-sm">自社振込先口座マスタ</h3>
                                                <p className="text-xs text-slate-500 mt-1">請求書PDFファイルに印字されるお支払い先・銀行口座情報</p>
                                            </div>
                                            <button 
                                                onClick={() => setEditingBank({ bank_name: '', branch_name: '', account_type: '普通', account_number: '', account_name: '', is_default: false })}
                                                className="text-white text-xs font-bold px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-sm transition-all"
                                            >
                                                + 新規追加
                                            </button>
                                        </div>
                                        <div className="p-0">
                                            <table className="w-full text-sm text-left">
                                                <tbody>
                                                    {bankAccounts.map(bank => (
                                                        <tr key={bank.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                                                            <td className="py-3 px-4">
                                                                <p className="font-bold text-slate-700">{bank.bank_name} {bank.branch_name}</p>
                                                                <p className="text-xs text-slate-500 mt-0.5">{bank.account_type} {bank.account_number} ({bank.account_name})</p>
                                                            </td>
                                                            <td className="py-3 px-4 text-right align-top">
                                                                {bank.is_default && <span className="mr-3 px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] rounded-full inline-block mb-1">デフォルト</span>}
                                                                <button onClick={() => setEditingBank(bank)} className="text-indigo-600 hover:text-indigo-800 text-xs font-bold mr-3">編集</button>
                                                                <button onClick={() => handleDeleteBankAccount(bank.id)} className="text-rose-500 hover:text-rose-700 text-xs font-bold">削除</button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {bankAccounts.length === 0 && (
                                                        <tr>
                                                            <td colSpan={2} className="py-6 text-center text-slate-400 text-xs text-slate-500">データがありません</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-100/50 transition-all cursor-pointer group disabled opacity-50">
                                        <div>
                                            <h3 className="font-bold text-slate-800 text-sm transition-colors">受注ステータスマスタ (未実装)</h3>
                                            <p className="text-xs text-slate-500 mt-1 font-medium">受注管理で利用される進捗ステータスバッジ（確定, 準備, 完了等）</p>
                                        </div>
                                        <button className="text-sm font-bold text-indigo-600 px-4 py-2 bg-white border border-slate-200 rounded-lg shadow-sm transition-all" disabled>開く</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'accounting' && (
                        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="px-6 py-4 border-b border-slate-100">
                                <h2 className="text-lg font-bold text-slate-800">会計ソフト連携 CSV出力設定</h2>
                                <p className="text-sm text-slate-500 mt-1">お使いの会計ソフト（マネーフォワード、TKC、freee、弥生など）のインポート用CSVテンプレートをアップロードし、出力フォーマットを設定してください</p>
                            </div>
                            <div className="p-6">
                                <CsvFormatConfig
                                    value={companySettings.csv_export_format || { columns: [], encoding: 'utf-8', delimiter: ',' }}
                                    onChange={(format) => setCompanySettings({ ...companySettings, csv_export_format: format })}
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === 'payments' && <StripeConnectSettings />}

                    {activeTab === 'user' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {/* 招待URL セクション */}
                        {(myRole === 'owner' || myRole === 'admin') && (
                            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                                <div className="px-6 py-4 border-b border-slate-100">
                                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                        <Link2 size={20} className="text-indigo-500" />
                        招待URL（スタッフ用）
                                    </h2>
                                    <p className="text-sm text-slate-500 mt-1">このURLを共有すると、新しいスタッフメンバーが会社に参加できます</p>
                                </div>
                                <div className="p-6">
                                    {inviteCode ? (
                                        <div className="space-y-4">
                                            <div className="flex items-stretch gap-2">
                                                <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-mono text-sm text-slate-700 truncate flex items-center">
                                                    {typeof window !== 'undefined' ? `${window.location.origin}/invite/${inviteCode}` : `/invite/${inviteCode}`}
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        const url = `${window.location.origin}/invite/${inviteCode}`;
                                                        navigator.clipboard.writeText(url);
                                                        setIsCopied(true);
                                                        setTimeout(() => setIsCopied(false), 2000);
                                                    }}
                                                    className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all text-sm flex items-center gap-2 whitespace-nowrap shadow-sm"
                                                >
                                                    {isCopied ? <><Check size={16} /> コピー済み</> : <><Copy size={16} /> URLをコピー</>}
                                                </button>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <p className="text-xs text-slate-500">
                                                    ※このURLを知っている人は「スタッフ（一般メンバー）」としてアカウント登録できます。外部に漏れないようご注意ください。
                                                </p>
                                                <button
                                                    onClick={async () => {
                                                        if (!confirm('スタッフ招待URLを再生成すると、以前のURLは無効になります。よろしいですか？')) return;
                                                        setIsRegenerating(true);
                                                        try {
                                                            const newCode = await regenerateInviteCode(company.id, 'staff');
                                                            setInviteCode(newCode);
                                                            setMessage('スタッフ招待URLを再生成しました');
                                                            setTimeout(() => setMessage(''), 3000);
                                                        } catch (err: any) {
                                                            setMessage('エラー: ' + err.message);
                                                        } finally {
                                                            setIsRegenerating(false);
                                                        }
                                                    }}
                                                    disabled={isRegenerating}
                                                    className="text-xs text-slate-400 hover:text-rose-500 font-bold flex items-center gap-1 transition-colors whitespace-nowrap ml-3 disabled:opacity-50"
                                                >
                                                    <RefreshCw size={12} className={isRegenerating ? 'animate-spin' : ''} />
                                                    URLを再生成
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-4">
                                            <p className="text-sm text-slate-500 mb-3">招待URLがまだ生成されていません</p>
                                            <button
                                                onClick={async () => {
                                                    setIsRegenerating(true);
                                                    try {
                                                        const newCode = await regenerateInviteCode(company.id, 'staff');
                                                        setInviteCode(newCode);
                                                        setMessage('スタッフ招待URLを生成しました');
                                                        setTimeout(() => setMessage(''), 3000);
                                                    } catch (err: any) {
                                                        setMessage('エラー: ' + err.message);
                                                    } finally {
                                                        setIsRegenerating(false);
                                                    }
                                                }}
                                                disabled={isRegenerating}
                                                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all text-sm flex items-center gap-2 mx-auto disabled:opacity-50"
                                            >
                                                {isRegenerating ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
                                                招待URLを生成
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* メンバー一覧セクション */}
                        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-800">スタッフメンバー一覧</h2>
                                    <p className="text-sm text-slate-500 mt-1">同じ会社内でシステムを操作できるスタッフメンバーを管理し、権限を付与します</p>
                                </div>
                                <button 
                                    onClick={() => setShowInviteForm(!showInviteForm)}
                                    disabled={myRole !== 'owner' && myRole !== 'admin'}
                                    className={`px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold rounded-xl transition-colors text-sm flex items-center gap-2 border border-indigo-200 ${myRole !== 'owner' && myRole !== 'admin' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {showInviteForm ? <X size={16} /> : <Mail size={16} />} 
                                    {showInviteForm ? 'キャンセル' : 'メールで招待'}
                                </button>
                            </div>
                            
                            {showInviteForm && (
                                <div className="p-6 bg-slate-50 border-b border-slate-100">
                                    <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><Mail size={16} className="text-indigo-500" />メールアドレスで個別招待</h3>
                                    <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
                                        <input 
                                            type="email" 
                                            placeholder="招待する人のメールアドレス" 
                                            required
                                            value={inviteEmail}
                                            onChange={(e) => setInviteEmail(e.target.value)}
                                            className="flex-1 bg-white border border-slate-200 text-slate-900 rounded-lg py-2.5 px-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-sm" 
                                        />
                                        <select 
                                            value={inviteRole}
                                            onChange={(e) => setInviteRole(e.target.value)}
                                            className="w-full sm:w-40 bg-white border border-slate-200 text-slate-900 rounded-lg py-2.5 px-3 outline-none focus:border-indigo-500 transition-all text-sm font-semibold cursor-pointer"
                                        >
                                            <option value="member">一般メンバー</option>
                                            <option value="admin">管理者</option>
                                        </select>
                                        <button 
                                            type="submit"
                                            disabled={isInviting}
                                            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold transition-all text-sm whitespace-nowrap disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {isInviting && <Loader2 size={16} className="animate-spin" />}
                                            招待メールを送信
                                        </button>
                                    </form>
                                    <p className="text-xs text-slate-500 mt-3">※招待されたユーザーがこのメールアドレスで新規登録すると、自動的にあなたの会社に所属します。</p>
                                </div>
                            )}

                            <div className="p-0 overflow-x-auto">
                                <table className="w-full text-left text-sm text-slate-600">
                                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                                        <tr>
                                            <th className="font-medium py-3 px-6">ユーザー / メールアドレス</th>
                                            <th className="font-medium py-3 px-6">権限ロール</th>
                                            <th className="font-medium py-3 px-6">参加ステータス</th>
                                            <th className="font-medium py-3 px-6 text-right">操作</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {members.map((member) => (
                                            <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="py-4 px-6 flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                                                        {(member.display_name || 'U').charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900 leading-tight">
                                                            {member.display_name || '名前未設定'}
                                                            {member.id === myId && <span className="text-xs text-slate-400 font-normal ml-1">(あなた)</span>}
                                                        </p>
                                                        <p className="text-xs text-slate-500 mt-0.5 text-slate-400">{member.email || member.id.substring(0, 8) + '...'}</p>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6">
                                                    {member.role === 'owner' ? (
                                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
                                                            オーナー (所有者)
                                                        </span>
                                                    ) : member.role === 'admin' ? (
                                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-700 border border-sky-200">
                                                            管理者
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                                            一般メンバー
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-4 px-6">
                                                    <span className="text-emerald-600 font-bold text-xs flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> アクティブ</span>
                                                </td>
                                                <td className="py-4 px-6 text-right">
                                                    {member.id !== myId && member.role !== 'owner' && (myRole === 'owner' || myRole === 'admin') ? (
                                                        <button 
                                                            onClick={async () => {
                                                                if (!confirm(`${member.display_name || '名前未設定'} さんを削除しますか？この操作は取り消せません。`)) return;
                                                                try {
                                                                    await removeMember(member.id);
                                                                    setMessage('メンバーを削除しました');
                                                                    setTimeout(() => setMessage(''), 3000);
                                                                    loadSettingsData();
                                                                } catch (err: any) {
                                                                    setMessage('削除エラー: ' + err.message);
                                                                }
                                                            }}
                                                            className="text-rose-400 hover:text-rose-600 transition-colors font-bold text-sm flex ml-auto"
                                                        >
                                                            削除
                                                        </button>
                                                    ) : (
                                                        <span className="text-slate-300 text-sm flex ml-auto">—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        
                                        {invitations.map((invite) => (
                                            <tr key={invite.id} className="hover:bg-slate-50 transition-colors opacity-70">
                                                <td className="py-4 px-6 flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center font-bold text-lg border border-slate-200 border-dashed">
                                                        未
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900 leading-tight text-slate-500">未登録</p>
                                                        <p className="text-xs text-slate-500 mt-0.5">{invite.email}</p>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6">
                                                    {invite.role === 'admin' ? (
                                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-700 border border-sky-200">
                                                            管理者
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                                            一般メンバー
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-4 px-6">
                                                    <span className="text-amber-600 font-bold text-xs flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div> 招待中</span>
                                                </td>
                                                <td className="py-4 px-6 text-right">
                                                    <button 
                                                        onClick={() => handleCancelInvite(invite.id)}
                                                        disabled={myRole !== 'owner' && myRole !== 'admin'}
                                                        className="text-rose-400 hover:text-rose-600 transition-colors font-bold text-sm disabled:opacity-50 flex ml-auto"
                                                    >
                                                        取消
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}

                                        {members.length === 0 && invitations.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="py-8 text-center text-slate-500">
                                                    メンバーがいません
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        </div>
                    )}

                </div>
            </div>
            )}

            {/* Tax Modal */}
            {editingTax && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                            <h3 className="font-bold text-slate-800">{editingTax.id ? '税率を編集' : '新しい税率を登録'}</h3>
                            <button onClick={() => setEditingTax(null)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSaveTaxRate} className="p-6 space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">表示名</label>
                                <input type="text" required value={editingTax.name} onChange={(e) => setEditingTax({...editingTax, name: e.target.value})} placeholder="例: 消費税 10%" className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg py-2 px-3 outline-none focus:border-indigo-500 focus:bg-white text-sm" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">税率 (%)</label>
                                <input type="number" required step="0.1" value={editingTax.rate} onChange={(e) => setEditingTax({...editingTax, rate: parseFloat(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg py-2 px-3 outline-none focus:border-indigo-500 focus:bg-white text-sm" />
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer pt-2">
                                <input type="checkbox" checked={editingTax.is_default} onChange={(e) => setEditingTax({...editingTax, is_default: e.target.checked})} className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
                                <span className="text-sm font-bold text-slate-700">商品登録時のデフォルトにする</span>
                            </label>
                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setEditingTax(null)} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">キャンセル</button>
                                <button type="submit" className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm">保存する</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Bank Modal */}
            {editingBank && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                            <h3 className="font-bold text-slate-800">{editingBank.id ? '口座情報を編集' : '自社の振込先口座を登録'}</h3>
                            <button onClick={() => setEditingBank(null)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSaveBankAccount} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">銀行名</label>
                                    <input type="text" required value={editingBank.bank_name} onChange={(e) => setEditingBank({...editingBank, bank_name: e.target.value})} placeholder="例: 〇〇銀行" className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg py-2 px-3 outline-none focus:border-indigo-500 focus:bg-white text-sm" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">支店名</label>
                                    <input type="text" required value={editingBank.branch_name} onChange={(e) => setEditingBank({...editingBank, branch_name: e.target.value})} placeholder="例: 渋谷支店" className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg py-2 px-3 outline-none focus:border-indigo-500 focus:bg-white text-sm" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">口座種別</label>
                                    <select value={editingBank.account_type} onChange={(e) => setEditingBank({...editingBank, account_type: e.target.value})} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg py-2 px-3 outline-none focus:border-indigo-500 focus:bg-white text-sm">
                                        <option value="普通">普通</option>
                                        <option value="当座">当座</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">口座番号 (半角カナ・数字)</label>
                                    <input type="text" required value={editingBank.account_number} onChange={(e) => setEditingBank({...editingBank, account_number: e.target.value})} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg py-2 px-3 outline-none focus:border-indigo-500 focus:bg-white text-sm font-mono" />
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <label className="text-sm font-bold text-slate-700">口座名義 (カタカナ)</label>
                                    <input type="text" required value={editingBank.account_name} onChange={(e) => setEditingBank({...editingBank, account_name: e.target.value})} placeholder="例: カ）イノベーション" className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg py-2 px-3 outline-none focus:border-indigo-500 focus:bg-white text-sm" />
                                </div>
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer pt-2">
                                <input type="checkbox" checked={editingBank.is_default} onChange={(e) => setEditingBank({...editingBank, is_default: e.target.checked})} className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
                                <span className="text-sm font-bold text-slate-700">請求書PDFにデフォルトで印字する口座にする</span>
                            </label>
                            <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                                <button type="button" onClick={() => setEditingBank(null)} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">キャンセル</button>
                                <button type="submit" className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm">保存する</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
