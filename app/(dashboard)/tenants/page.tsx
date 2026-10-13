"use client";

import { useState, useEffect } from 'react';
import {
    Building2, Plus, Users, ShoppingBag, FileText, Clipboard,
    Loader2, AlertCircle, Power, PowerOff, Eye, X, Copy, Check,
    Shield, Network, Store, BarChart3, ChevronDown, ChevronRight, Link2, Trash2,
    Lightbulb, KeyRound, ShieldCheck, CircleCheck, CircleX
} from 'lucide-react';
import {
    getTenants, createTenant, toggleTenantStatus,
    getTenantDetail, createCustomerCompany, deleteTenant
} from '@/app/actions/tenants';

type Tenant = {
    id: string;
    name: string;
    is_active: boolean;
    created_at: string;
    franchise_id: string | null;
    franchise_role: string | null;
    invite_code: string | null;
    profiles: { id: string; display_name: string; email: string; role: string }[];
    staff_invite_code: string | null;
    company_type: string | null;
    parent_company_id: string | null;
};

type TenantDetail = {
    tenant: any;
    members: any[];
    stats: { orders: number; customers: number; invoices: number; quotes: number };
};

export default function TenantsPage() {
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [level, setLevel] = useState<'system_admin' | 'franchise_admin' | 'normal'>('normal');
    const [isLoading, setIsLoading] = useState(true);
    const [debugInfo, setDebugInfo] = useState('');
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState<'success' | 'error'>('success');

    // Modals
    const [showNewTenant, setShowNewTenant] = useState(false);
    const [showNewCustomer, setShowNewCustomer] = useState(false);
    const [selectedTenant, setSelectedTenant] = useState<TenantDetail | null>(null);
    const [showDetail, setShowDetail] = useState(false);
    const [customerCompanyName, setCustomerCompanyName] = useState('');
    const [customerParentId, setCustomerParentId] = useState('');
    const [createdCustomerInviteCode, setCreatedCustomerInviteCode] = useState<string | null>(null);

    // FC先の展開状態
    const [expandedFC, setExpandedFC] = useState<Set<string>>(new Set());

    // Form states
    const [newName, setNewName] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [newOwnerName, setNewOwnerName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [createdInviteCode, setCreatedInviteCode] = useState<string | null>(null);

    const showMsg = (msg: string, type: 'success' | 'error' = 'success') => {
        setMessage(msg);
        setMessageType(type);
        setTimeout(() => setMessage(''), 4000);
    };

    const loadTenants = async () => {
        try {
            const result = await getTenants();
            setTenants(result.tenants as Tenant[]);
            setLevel(result.level);
            setDebugInfo((result as any)._debug || 'no debug info');
        } catch (err: any) {
            setLevel('normal');
            setTenants([]);
            setDebugInfo('ERROR: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { loadTenants(); }, []);

    const handleCreateTenant = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim()) return;
        setIsSubmitting(true);
        try {
            const result = await createTenant({
                name: newName,
                ownerEmail: newEmail,
                ownerName: newOwnerName,
            });
            setCreatedInviteCode(result.inviteCode);
            showMsg(`「${newName}」を追加しました`);
            setNewName(''); setNewEmail(''); setNewOwnerName('');
            await loadTenants();
        } catch (err: any) {
            showMsg('エラー: ' + err.message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCreateCustomerCompany = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!customerCompanyName.trim() || !customerParentId) return;
        setIsSubmitting(true);
        try {
            const result = await createCustomerCompany({
                name: customerCompanyName,
                parentCompanyId: customerParentId,
            });
            setCreatedCustomerInviteCode(result.inviteCode);
            showMsg(`お客様「${customerCompanyName}」を追加しました`);
            setCustomerCompanyName('');
            setCustomerParentId('');
            await loadTenants();
        } catch (err: any) {
            showMsg('エラー: ' + err.message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleFCExpand = (fcId: string) => {
        setExpandedFC(prev => {
            const next = new Set(prev);
            if (next.has(fcId)) next.delete(fcId);
            else next.add(fcId);
            return next;
        });
    };

    const handleToggleStatus = async (tenantId: string, currentStatus: boolean) => {
        const action = currentStatus ? '無効化' : '有効化';
        if (!confirm(`このテナントを${action}しますか？`)) return;
        try {
            await toggleTenantStatus(tenantId, !currentStatus);
            showMsg(`テナントを${action}しました`);
            await loadTenants();
        } catch (err: any) {
            alert('ステータス切替エラー: ' + (err?.message || String(err)));
            showMsg('エラー: ' + err.message, 'error');
        }
    };

    const handleViewDetail = async (tenantId: string) => {
        try {
            const detail = await getTenantDetail(tenantId);
            setSelectedTenant(detail);
            setShowDetail(true);
        } catch (err: any) {
            alert('詳細取得エラー: ' + (err?.message || String(err)));
            showMsg('詳細取得エラー: ' + err.message, 'error');
        }
    };

    const handleDeleteTenant = async (tenantId: string, tenantName: string) => {
        if (!confirm(`「${tenantName}」を削除しますか？\n\n※ この操作は取り消せません。紐づくユーザーやデータもすべて削除されます。`)) return;
        if (!confirm(`本当に「${tenantName}」を完全に削除してよろしいですか？`)) return;
        try {
            await deleteTenant(tenantId);
            showMsg(`「${tenantName}」を削除しました`);
            await loadTenants();
        } catch (err: any) {
            alert('削除エラー: ' + (err?.message || String(err)));
            showMsg('削除エラー: ' + err.message, 'error');
        }
    };

    const copyInviteUrl = (code: string) => {
        const url = `${window.location.origin}/invite/${code}`;
        navigator.clipboard.writeText(url);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-indigo-600">
                <Loader2 size={32} className="animate-spin mb-4" />
                <p className="font-bold">テナント情報を読み込み中...</p>
            </div>
        );
    }

    // ====================================================
    // システム管理者ビュー（MoMo）
    // ====================================================
    if (level === 'system_admin') {
        const totalMembers = tenants.reduce((s, t) => s + (t.profiles?.length || 0), 0);
        const fcPartnersList = tenants.filter(t => t.company_type !== 'customer');
        const customersList = tenants.filter(t => t.company_type === 'customer');

        // FC先ごとのお客様マップ
        const customersByFC = customersList.reduce((acc, c) => {
            const parentId = c.parent_company_id || 'unlinked';
            if (!acc[parentId]) acc[parentId] = [];
            acc[parentId].push(c);
            return acc;
        }, {} as Record<string, Tenant[]>);

        // FC先名のルックアップ
        const fcNameMap = fcPartnersList.reduce((acc, fc) => {
            acc[fc.id] = fc.name;
            return acc;
        }, {} as Record<string, string>);

        return (
            <div className="space-y-6 max-w-6xl">
                {/* ヘッダー */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <Network className="text-indigo-600" />
                            <span>テナント管理</span>
                        </h1>
                        <p className="text-slate-500 mt-1 flex items-center gap-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                                SYSTEM ADMIN
                            </span>
                            FC先・お客様の管理
                        </p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <button onClick={() => { setShowNewTenant(true); setCreatedInviteCode(null); }} className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white rounded-xl font-bold transition-all shadow-sm hover:-translate-y-0.5 flex items-center gap-2 text-sm">
                            <Plus size={16} /> FC先追加
                        </button>
                        <button onClick={() => { setShowNewCustomer(true); setCreatedCustomerInviteCode(null); setCustomerParentId(''); }} className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl font-bold transition-all shadow-sm hover:-translate-y-0.5 flex items-center gap-2 text-sm">
                            <Plus size={16} /> お客様追加
                        </button>
                    </div>
                </div>

                <MessageBanner message={message} type={messageType} />


                {/* サマリー */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatCard label="FC先数" value={fcPartnersList.length} color="emerald" icon={<Store size={16} />} />
                    <StatCard label="お客様数" value={customersList.length} color="amber" icon={<Users size={16} />} />
                    <StatCard label="総会社数" value={tenants.length} color="indigo" icon={<Building2 size={16} />} />
                    <StatCard label="総ユーザー" value={totalMembers} color="sky" icon={<Users size={16} />} />
                </div>

                {/* FC先 & 紐づくお客様セクション */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                        <h2 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                            <Store size={16} className="text-emerald-500" />
                            FC先 ({fcPartnersList.length}社) ・ お客様 ({customersList.length}社)
                        </h2>
                        <div className="flex gap-2">
                            <button
                                onClick={() => { setShowNewTenant(true); setCreatedInviteCode(null); }}
                                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-all"
                            >
                                <Plus size={14} /> FC先追加
                            </button>
                            <button
                                onClick={() => { setShowNewCustomer(true); setCreatedCustomerInviteCode(null); setCustomerParentId(''); }}
                                className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 hover:bg-amber-50 px-3 py-1.5 rounded-lg transition-all"
                            >
                                <Plus size={14} /> お客様追加
                            </button>
                        </div>
                    </div>
                    {fcPartnersList.length > 0 ? (
                        fcPartnersList.map((fc, i) => {
                            const fcCustomers = customersByFC[fc.id] || [];
                            const isExpanded = expandedFC.has(fc.id);
                            return (
                                <div key={fc.id} className={i < fcPartnersList.length - 1 ? 'border-b border-slate-100' : ''}>
                                    {/* FC先行 */}
                                    <div className="px-6 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => toggleFCExpand(fc.id)}
                                                className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                                            >
                                                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                            </button>
                                            <div className="w-2 h-8 rounded-full bg-emerald-300" />
                                            <div className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600">
                                                {fc.name.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-bold text-slate-800 text-sm">{fc.name}</p>
                                                    <span className="px-1.5 py-0.5 text-[9px] font-bold bg-emerald-100 text-emerald-700 rounded border border-emerald-200">FC先</span>
                                                    {fcCustomers.length > 0 && (
                                                        <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-50 text-amber-600 rounded border border-amber-200">
                                                            お客様{fcCustomers.length}社
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-400">{fc.profiles?.length || 0}名 ・ {new Date(fc.created_at).toLocaleDateString('ja-JP')}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <StatusBadge isActive={fc.is_active !== false} />
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => handleViewDetail(fc.id)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="詳細"><Eye size={15} /></button>
                                                <button onClick={() => handleToggleStatus(fc.id, fc.is_active !== false)} className={`p-2 rounded-lg transition-all ${fc.is_active !== false ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'}`} title={fc.is_active !== false ? '無効化' : '有効化'}>
                                                    {fc.is_active !== false ? <PowerOff size={15} /> : <Power size={15} />}
                                                </button>
                                                <button onClick={() => handleDeleteTenant(fc.id, fc.name)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="削除"><Trash2 size={15} /></button>
                                            </div>
                                        </div>
                                    </div>
                                    {/* お客様サブリスト */}
                                    {isExpanded && (
                                        <div className="bg-amber-50/30">
                                            {fcCustomers.length > 0 ? (
                                                fcCustomers.map((cust, ci) => (
                                                    <div key={cust.id} className={`pl-16 pr-6 py-2.5 flex items-center justify-between hover:bg-amber-50/60 transition-colors ${ci < fcCustomers.length - 1 ? 'border-b border-amber-100/50' : ''}`}>
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-1.5 h-6 rounded-full bg-amber-300" />
                                                            <div className="w-7 h-7 rounded-md flex items-center justify-center font-bold text-xs bg-gradient-to-br from-amber-100 to-orange-200 text-amber-700">
                                                                {cust.name.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-1.5">
                                                                    <p className="font-bold text-slate-700 text-xs">{cust.name}</p>
                                                                    <span className="px-1 py-0.5 text-[8px] font-bold bg-amber-100 text-amber-600 rounded">お客様</span>
                                                                </div>
                                                                <p className="text-[11px] text-slate-400">{cust.profiles?.length || 0}名</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <StatusBadge isActive={cust.is_active !== false} />
                                                            <button onClick={() => handleViewDetail(cust.id)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"><Eye size={13} /></button>
                                                            <button onClick={() => handleToggleStatus(cust.id, cust.is_active !== false)} className={`p-1.5 rounded-lg transition-all ${cust.is_active !== false ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'}`}>
                                                                {cust.is_active !== false ? <PowerOff size={13} /> : <Power size={13} />}
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="pl-16 pr-6 py-4 text-center text-xs text-slate-400">
                                                    まだお客様がいません
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        <div className="px-6 py-8 text-center text-sm text-slate-400">
                            まだFC先がありません。「FC先追加」から追加してください。
                        </div>
                    )}
                </div>

                {/* FC先追加モーダル */}
                {showNewTenant && (
                    <Modal title="新しいFC先を追加" onClose={() => { setShowNewTenant(false); setCreatedInviteCode(null); }}>
                        {createdInviteCode ? (
                            <InviteCodeResult inviteCode={createdInviteCode} isCopied={isCopied} onCopy={() => copyInviteUrl(createdInviteCode)} onClose={() => { setShowNewTenant(false); setCreatedInviteCode(null); }} label="FC先の管理者にこのURLを共有してください" />
                        ) : (
                            <form onSubmit={handleCreateTenant} className="p-6 space-y-4">
                                <InputField label="FC先会社名" required value={newName} onChange={setNewName} placeholder="例: 株式会社〇〇" />
                                <InputField label="管理者のメールアドレス" value={newEmail} onChange={setNewEmail} placeholder="例: owner@example.com（任意）" type="email" hint="招待メールが送信されます" />
                                <InputField label="管理者名" value={newOwnerName} onChange={setNewOwnerName} placeholder="例: 山田 太郎（任意）" />
                                <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3 text-xs text-indigo-700">
                                    <p className="font-bold mb-1 flex items-center gap-1.5"><Lightbulb size={14} className="text-indigo-500" /> FC先の追加</p>
                                    <p>会社を作成し、管理者用の招待URLを発行します。FC先の管理者がURLから登録するとオーナーになります。</p>
                                </div>
                                <ModalFooter onCancel={() => setShowNewTenant(false)} isSubmitting={isSubmitting} submitLabel="FC先を追加" />
                            </form>
                        )}
                    </Modal>
                )}

                {/* お客様追加モーダル（FC先選択付き） */}
                {showNewCustomer && (
                    <Modal title="新しいお客様を追加" onClose={() => { setShowNewCustomer(false); setCreatedCustomerInviteCode(null); }}>
                        {createdCustomerInviteCode ? (
                            <InviteCodeResult inviteCode={createdCustomerInviteCode} isCopied={isCopied} onCopy={() => copyInviteUrl(createdCustomerInviteCode)} onClose={() => { setShowNewCustomer(false); setCreatedCustomerInviteCode(null); }} label="お客様の管理者にこのURLを共有してください" />
                        ) : (
                            <form onSubmit={handleCreateCustomerCompany} className="p-6 space-y-4">
                                {/* FC先選択 */}
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">所属FC先 <span className="text-rose-500">*</span></label>
                                    <select
                                        required
                                        value={customerParentId}
                                        onChange={e => setCustomerParentId(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg py-2.5 px-3 outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all text-sm"
                                    >
                                        <option value="">FC先を選択してください</option>
                                        {fcPartnersList.map(fc => (
                                            <option key={fc.id} value={fc.id}>{fc.name}</option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-slate-400 flex items-center gap-1">
                                        <Link2 size={12} /> このお客様が紐づくFC先を選択してください
                                    </p>
                                </div>
                                <InputField label="お客様会社名" required value={customerCompanyName} onChange={setCustomerCompanyName} placeholder="例: 株式会社△△" />
                                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-700">
                                    <p className="font-bold mb-1 flex items-center gap-1.5"><Lightbulb size={14} className="text-amber-500" /> お客様の追加</p>
                                    <p>選択したFC先に紐づくお客様会社を作成し、管理者用の招待URLを発行します。お客様の管理者がURLから登録するとオーナーになります。メンバーの追加はお客様自身が行います。</p>
                                </div>
                                <ModalFooter onCancel={() => setShowNewCustomer(false)} isSubmitting={isSubmitting} submitLabel="お客様を追加" />
                            </form>
                        )}
                    </Modal>
                )}

                {/* テナント詳細モーダル */}
                {showDetail && selectedTenant && (
                    <DetailModal tenant={selectedTenant} isCopied={isCopied} onCopy={copyInviteUrl} onClose={() => setShowDetail(false)} allTenants={tenants} level="system_admin" />
                )}
            </div>
        );
    }

    // ====================================================
    // FC管理者ビュー: お客様一覧
    // ====================================================
    // FC管理者の場合: getTenants()で既にお客様のみが返されている
    const myCustomers = tenants;
    const activeCustomers = myCustomers.filter(t => t.is_active !== false);
    const inactiveCustomers = myCustomers.filter(t => t.is_active === false);
    const totalCustomerMembers = myCustomers.reduce((s, t) => s + (t.profiles?.length || 0), 0);

    return (
        <div className="space-y-6 max-w-6xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Users className="text-indigo-600" /> <span>お客様管理</span>
                    </h1>
                    <p className="text-slate-500 mt-1">管理者が登録したお客様の一覧</p>
                </div>
            </div>

            <MessageBanner message={message} type={messageType} />

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard label="お客様数" value={myCustomers.length} color="amber" icon={<Users size={16} />} />
                <StatCard label="有効" value={activeCustomers.length} color="emerald" />
                <StatCard label="無効" value={inactiveCustomers.length} color="rose" />
                <StatCard label="総メンバー" value={totalCustomerMembers} color="sky" icon={<Users size={16} />} />
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Store size={16} className="text-amber-500" />
                        お客様一覧
                    </h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                            <tr>
                                <th className="font-medium py-3 px-6">お客様名</th>
                                <th className="font-medium py-3 px-6">種別</th>
                                <th className="font-medium py-3 px-6">メンバー</th>
                                <th className="font-medium py-3 px-6">ステータス</th>
                                <th className="font-medium py-3 px-6">登録日</th>
                                <th className="font-medium py-3 px-6 text-right">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {myCustomers.map(tenant => (
                                <tr key={tenant.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base shadow-sm bg-gradient-to-br from-amber-50 to-amber-100 text-amber-700">
                                                {tenant.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900">{tenant.name}</p>
                                                <p className="text-xs text-slate-400 mt-0.5">{tenant.id.substring(0, 8)}...</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border bg-amber-50 text-amber-700 border-amber-200">
                                            お客様
                                        </span>
                                    </td>
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-1.5 text-slate-600">
                                            <Users size={14} className="text-slate-400" />
                                            <span className="font-bold">{tenant.profiles?.length || 0}</span>名
                                        </div>
                                    </td>
                                    <td className="py-4 px-6"><StatusBadge isActive={tenant.is_active !== false} /></td>
                                    <td className="py-4 px-6 text-slate-500 text-xs">{new Date(tenant.created_at).toLocaleDateString('ja-JP')}</td>
                                    <td className="py-4 px-6 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button onClick={() => handleViewDetail(tenant.id)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="詳細"><Eye size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {myCustomers.length === 0 && <tr><td colSpan={6} className="py-12 text-center text-slate-400">まだお客様が登録されていません<br /><span className="text-xs">お客様の追加は管理者（アドミン）が行います</span></td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>

            {showDetail && selectedTenant && (
                <DetailModal tenant={selectedTenant} isCopied={isCopied} onCopy={copyInviteUrl} onClose={() => setShowDetail(false)} allTenants={tenants} level={level} />
            )}
        </div>
    );
}

// ============================================================
// 共通コンポーネント
// ============================================================

function PageHeader() {
    return (
        <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="text-indigo-600" /> <span>テナント管理</span>
            </h1>
            <p className="text-slate-500 mt-1">FC（フランチャイズ）展開の加盟店を管理します</p>
        </div>
    );
}

function MessageBanner({ message, type }: { message: string; type: 'success' | 'error' }) {
    if (!message) return null;
    return (
        <div className={`px-4 py-3 rounded-lg flex items-center gap-2 text-sm font-bold animate-in fade-in zoom-in-95 ${type === 'error' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
            <AlertCircle size={16} /> {message}
        </div>
    );
}

function StatCard({ label, value, color, icon }: { label: string; value: number; color: string; icon?: React.ReactNode }) {
    const colorMap: Record<string, string> = {
        indigo: 'text-indigo-600', emerald: 'text-emerald-600', rose: 'text-rose-500',
        sky: 'text-sky-600', purple: 'text-purple-600', amber: 'text-amber-600'
    };
    return (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-1.5">
                {icon && <span className="text-slate-400">{icon}</span>}
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</p>
            </div>
            <p className={`text-2xl font-bold mt-1 ${colorMap[color] || 'text-slate-900'}`}>{value}</p>
        </div>
    );
}

function StatusBadge({ isActive }: { isActive: boolean }) {
    return isActive ? (
        <span className="text-emerald-600 font-bold text-xs flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> 有効
        </span>
    ) : (
        <span className="text-rose-500 font-bold text-xs flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-rose-400" /> 無効
        </span>
    );
}

function TenantRow({ tenant, isLast, onView, onToggle, badgeColor }: { tenant: Tenant; isLast: boolean; onView: () => void; onToggle: () => void; badgeColor?: string }) {
    const isCustomer = badgeColor === 'amber' || tenant.company_type === 'customer';
    return (
        <div className={`px-6 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors ${!isLast ? 'border-b border-slate-100' : ''}`}>
            <div className="flex items-center gap-3">
                <div className={`w-2 h-8 rounded-full ${isCustomer ? 'bg-amber-300' : 'bg-emerald-300'}`} />
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm ${isCustomer ? 'bg-gradient-to-br from-amber-100 to-orange-200 text-amber-700' : 'bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600'}`}>
                    {tenant.name.charAt(0)}
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <p className="font-bold text-slate-800 text-sm">{tenant.name}</p>
                        {isCustomer && <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-100 text-amber-700 rounded border border-amber-200">お客様</span>}
                    </div>
                    <p className="text-xs text-slate-400">{tenant.profiles?.length || 0}名 ・ {new Date(tenant.created_at).toLocaleDateString('ja-JP')}</p>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <StatusBadge isActive={tenant.is_active !== false} />
                <div className="flex items-center gap-1">
                    <button onClick={onView} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"><Eye size={15} /></button>
                    <button onClick={onToggle} className={`p-2 rounded-lg transition-all ${tenant.is_active !== false ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'}`}>
                        {tenant.is_active !== false ? <PowerOff size={15} /> : <Power size={15} />}
                    </button>
                </div>
            </div>
        </div>
    );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <h3 className="font-bold text-slate-800">{title}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
                </div>
                {children}
            </div>
        </div>
    );
}

function InputField({ label, value, onChange, placeholder, required, type, hint }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; required?: boolean; type?: string; hint?: string }) {
    return (
        <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">{label} {required && <span className="text-rose-500">*</span>}</label>
            <input type={type || 'text'} required={required} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg py-2.5 px-3 outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all text-sm" />
            {hint && <p className="text-xs text-slate-400">{hint}</p>}
        </div>
    );
}

function ModalFooter({ onCancel, isSubmitting, submitLabel }: { onCancel: () => void; isSubmitting: boolean; submitLabel: string }) {
    return (
        <div className="pt-2 flex justify-end gap-3">
            <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">キャンセル</button>
            <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50">
                {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                {submitLabel}
            </button>
        </div>
    );
}

function InviteCodeResult({ inviteCode, isCopied, onCopy, onClose, label }: { inviteCode: string; isCopied: boolean; onCopy: () => void; onClose: () => void; label?: string }) {
    return (
        <div className="p-6 space-y-4">
            <div className="text-center">
                <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3"><Check size={28} className="text-emerald-600" /></div>
                <h4 className="font-bold text-slate-900 text-lg">作成しました！</h4>
                <p className="text-sm text-slate-500 mt-1">{label || '以下の招待URLを共有してください'}</p>
            </div>
            <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">招待URL</label>
                <div className="flex items-stretch gap-2">
                    <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 font-mono text-xs text-slate-700 truncate flex items-center">
                        {typeof window !== 'undefined' ? `${window.location.origin}/invite/${inviteCode}` : `/invite/${inviteCode}`}
                    </div>
                    <button onClick={onCopy} className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm flex items-center gap-2 whitespace-nowrap shadow-sm transition-all">
                        {isCopied ? <><Check size={14} /> コピー済</> : <><Copy size={14} /> コピー</>}
                    </button>
                </div>
            </div>
            <button onClick={onClose} className="w-full px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200">閉じる</button>
        </div>
    );
}

function DetailModal({ tenant: detail, isCopied, onCopy, onClose, allTenants, level }: { tenant: TenantDetail; isCopied: boolean; onCopy: (code: string) => void; onClose: () => void; allTenants?: Tenant[]; level?: string }) {
    const isSystemAdmin = level === 'system_admin';
    const companyType = detail.tenant.company_type || 'tenant';
    const companyTypeLabel = companyType === 'customer' ? 'お客様' : 'FC先';
    const companyTypeColor = companyType === 'customer' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200';

    // お客様の場合、所属FC先名を取得
    const parentFCName = companyType === 'customer' && detail.tenant.parent_company_id && allTenants
        ? allTenants.find(t => t.id === detail.tenant.parent_company_id)?.name || '不明'
        : null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 max-h-[85vh] overflow-y-auto">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Building2 size={18} className="text-indigo-500" />
                        {detail.tenant.name}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${companyTypeColor}`}>{companyTypeLabel}</span>
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
                </div>
                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <MiniStat icon={<ShoppingBag size={18} />} value={detail.stats.orders} label="受注" color="blue" />
                        <MiniStat icon={<Users size={18} />} value={detail.stats.customers} label="顧客" color="emerald" />
                        <MiniStat icon={<FileText size={18} />} value={detail.stats.invoices} label="請求書" color="amber" />
                        <MiniStat icon={<Clipboard size={18} />} value={detail.stats.quotes} label="見積" color="purple" />
                    </div>
                    <div className="space-y-3">
                        <h4 className="font-bold text-slate-700 text-sm">基本情報</h4>
                        <div className={`grid ${parentFCName ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'} gap-3 text-sm`}>
                            <div className="bg-slate-50 rounded-lg p-3"><p className="text-xs text-slate-500 mb-1">ステータス</p><p className="font-bold flex items-center gap-1.5">{detail.tenant.is_active !== false ? <><CircleCheck size={16} className="text-emerald-500" /> 有効</> : <><CircleX size={16} className="text-rose-500" /> 無効</>}</p></div>
                            <div className="bg-slate-50 rounded-lg p-3"><p className="text-xs text-slate-500 mb-1">登録日</p><p className="font-bold">{new Date(detail.tenant.created_at).toLocaleDateString('ja-JP')}</p></div>
                            <div className="bg-slate-50 rounded-lg p-3"><p className="text-xs text-slate-500 mb-1">会社種別</p><p className="font-bold">{companyTypeLabel}</p></div>
                            {isSystemAdmin && parentFCName && (
                                <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100"><p className="text-xs text-emerald-600 mb-1 flex items-center gap-1"><Link2 size={10} /> 所属FC先</p><p className="font-bold text-emerald-700">{parentFCName}</p></div>
                            )}
                        </div>
                    </div>
                    {/* 管理者招待URL - システム管理者のみ表示 */}
                    {isSystemAdmin && detail.tenant.invite_code && (
                        <div className="space-y-2">
                            <h4 className="font-bold text-slate-700 text-sm flex items-center gap-1.5"><KeyRound size={14} className="text-indigo-500" /> 管理者招待URL</h4>
                            <p className="text-[11px] text-slate-500">この URL で登録すると <span className="text-indigo-600 font-bold">オーナー</span> として参加します</p>
                            <div className="flex items-stretch gap-2">
                                <div className="flex-1 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2 font-mono text-xs text-indigo-700 truncate flex items-center">
                                    {typeof window !== 'undefined' ? `${window.location.origin}/invite/${detail.tenant.invite_code}` : ''}
                                </div>
                                <button onClick={() => onCopy(detail.tenant.invite_code)} className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5">
                                    {isCopied ? <Check size={12} /> : <Copy size={12} />} コピー
                                </button>
                            </div>
                        </div>
                    )}
                    {isSystemAdmin && detail.tenant.staff_invite_code && (
                        <div className="space-y-2">
                            <h4 className="font-bold text-slate-700 text-sm flex items-center gap-1.5"><ShieldCheck size={14} className="text-emerald-500" /> スタッフ招待URL</h4>
                            <p className="text-[11px] text-slate-500">この URL で登録すると <span className="text-emerald-600 font-bold">スタッフ（メンバー）</span> として参加します</p>
                            <div className="flex items-stretch gap-2">
                                <div className="flex-1 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 font-mono text-xs text-emerald-700 truncate flex items-center">
                                    {typeof window !== 'undefined' ? `${window.location.origin}/invite/staff/${detail.tenant.staff_invite_code}` : ''}
                                </div>
                                <button onClick={() => onCopy(detail.tenant.staff_invite_code)} className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5">
                                    {isCopied ? <Check size={12} /> : <Copy size={12} />} コピー
                                </button>
                            </div>
                        </div>
                    )}

                    {/* メンバーセクション */}
                    <div className="space-y-3">
                        <h4 className="font-bold text-slate-700 text-sm">メンバー ({detail.members.length}名)</h4>
                        {detail.members.length > 0 ? (
                            <div className="space-y-2">
                                {detail.members.map((m: any) => (
                                    <div key={m.id} className="flex items-center gap-3 bg-slate-50 rounded-xl p-3">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-sm">{(m.display_name || 'U').charAt(0)}</div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-slate-800 text-sm truncate">{m.display_name || '名前未設定'}</p>
                                            <p className="text-xs text-slate-400 truncate">{m.email}</p>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${m.role === 'owner' ? 'bg-indigo-100 text-indigo-700' : m.role === 'admin' ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-600'}`}>
                                            {m.role === 'owner' ? 'オーナー' : m.role === 'admin' ? '管理者' : 'メンバー'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : <p className="text-sm text-slate-400 text-center py-4">まだメンバーがいません</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}

function MiniStat({ icon, value, label, color }: { icon: React.ReactNode; value: number; label: string; color: string }) {
    const colorMap: Record<string, { bg: string; border: string; text: string; label: string }> = {
        blue: { bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-700', label: 'text-blue-500' },
        emerald: { bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-700', label: 'text-emerald-500' },
        amber: { bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-700', label: 'text-amber-500' },
        purple: { bg: 'bg-purple-50', border: 'border-purple-100', text: 'text-purple-700', label: 'text-purple-500' },
    };
    const c = colorMap[color] || colorMap.blue;
    return (
        <div className={`${c.bg} border ${c.border} rounded-xl p-3 text-center`}>
            <span className={c.label}>{icon}</span>
            <p className={`text-lg font-bold ${c.text}`}>{value}</p>
            <p className={`text-[10px] ${c.label} font-bold uppercase`}>{label}</p>
        </div>
    );
}
