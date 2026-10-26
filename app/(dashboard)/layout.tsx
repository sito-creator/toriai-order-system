"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    ShoppingBag,
    Users,
    Settings,
    LogOut,
    Menu,
    X,
    FileText,
    Package,
    CreditCard,
    PieChart,
    Truck,
    ShoppingCart,
    Clipboard,
    FileDown,
    Zap,
    Layers,
    Building2
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

const ToriaiLogo = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 12h8l4-4h4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M24 20h-8l-4 4H8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M20 8l4 4-4 4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 16l-4 4 4 4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

type SidebarItem = { name: string; path: string; icon: React.ReactNode; hiddenFromCustomerCompany?: boolean };
type SidebarSection = {
    label: string;
    items: SidebarItem[];
};

// 全メニュー定義（お客様会社はテナント管理のみ非表示）
const allSidebarSections: SidebarSection[] = [
    {
        label: 'メイン',
        items: [
            { name: 'ダッシュボード', path: '/dashboard', icon: <PieChart size={20} /> },
        ],
    },
    {
        label: '業務管理',
        items: [
            { name: 'POSレジ', path: '/pos', icon: <ShoppingCart size={20} /> },
            { name: '受注管理', path: '/orders', icon: <ShoppingBag size={20} /> },
            { name: '見積書管理', path: '/quotes', icon: <Clipboard size={20} /> },
            { name: '請求書管理', path: '/invoices', icon: <FileText size={20} /> },
            { name: '入金確認', path: '/payments', icon: <CreditCard size={20} /> },
            { name: '発注管理', path: '/purchases', icon: <ShoppingCart size={20} /> },
            { name: '仕訳データ出力', path: '/journal', icon: <FileDown size={20} /> },
        ],
    },
    {
        label: 'マスタ',
        items: [
            { name: '顧客管理', path: '/customers', icon: <Users size={20} /> },
            { name: '商品管理', path: '/products', icon: <Package size={20} /> },
            { name: '仕入先管理', path: '/suppliers', icon: <Truck size={20} /> },
            { name: '仕入先商品', path: '/supplier-products', icon: <Layers size={20} /> },
        ],
    },
    {
        label: 'システム',
        items: [
            { name: 'テナント管理', path: '/tenants', icon: <Building2 size={20} />, hiddenFromCustomerCompany: true },
            { name: '設定', path: '/settings', icon: <Settings size={20} /> },
        ],
    },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    // お客様会社かどうかのフラグ（company_type=customerの場合はテナント管理非表示）
    const [isCustomerCompany, setIsCustomerCompany] = useState(false);
    const [displayName, setDisplayName] = useState<string | null>(null);
    const pathname = usePathname();
    const supabase = createClient();
    const router = useRouter();

    // クライアント側でプロフィールとcompany_typeを取得
    useEffect(() => {
        async function fetchRole() {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role, display_name, company_id')
                    .eq('id', user.id)
                    .single();

                if (profile) {
                    setDisplayName(profile.display_name);
                    // company_typeを取得してお客様会社かどうか判定
                    if (profile.company_id) {
                        const { data: company } = await supabase
                            .from('companies')
                            .select('company_type')
                            .eq('id', profile.company_id)
                            .single();
                        setIsCustomerCompany(company?.company_type === 'customer');
                    }
                }
            } catch (e) {
                // プロフィール取得失敗時はデフォルト（全メニュー表示）
                console.log('Profile fetch skipped');
            }
        }
        fetchRole();
    }, []);

    // お客様会社の場合はテナント管理メニューのみ非表示（設定は表示）
    const filteredSections = allSidebarSections
        .map(section => ({
            ...section,
            items: section.items.filter(item =>
                !(isCustomerCompany && item.hiddenFromCustomerCompany)
            ),
        }))
        .filter(section => section.items.length > 0);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
        router.refresh();
    };

    // ユーザーの表示名の頭文字
    const avatarInitial = displayName
        ? displayName.charAt(0)
        : 'T';

    return (
        <div className="flex h-screen bg-slate-50 text-slate-800 font-sans">
            {/* Mobile Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-20 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-slate-900 text-slate-400 transition-transform duration-300 ease-in-out flex flex-col shadow-2xl lg:shadow-none print:hidden ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                    }`}
            >
                <div className="flex flex-col h-full">
                    {/* Brand */}
                    <div className="flex items-center justify-between px-5 py-5 border-b border-white/5 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/25">
                                <ToriaiLogo size={24} />
                            </div>
                            <div>
                                <p className="font-bold text-white text-lg leading-tight tracking-tight">Toriai</p>
                                <p className="text-[11px] text-slate-500 tracking-wide">直感的な受発注・請求管理</p>
                            </div>
                        </div>
                        <button className="lg:hidden p-1 text-slate-400 hover:text-white rounded-md" onClick={() => setIsSidebarOpen(false)}>
                            <X size={20} />
                        </button>
                    </div>

                    {/* Navigation Sections */}
                    <div className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
                        {filteredSections.map((section) => (
                            <div key={section.label}>
                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2">
                                    {section.label}
                                </p>
                                <div className="space-y-0.5">
                                    {section.items.map((item) => {
                                        const isActive = pathname === item.path || pathname.startsWith(item.path + '/');
                                        return (
                                            <Link
                                                key={item.path}
                                                href={item.path}
                                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] transition-all ${isActive
                                                    ? 'bg-indigo-600/90 text-white font-semibold shadow-md shadow-indigo-900/30'
                                                    : 'hover:bg-white/5 hover:text-slate-200'
                                                    }`}
                                                onClick={() => setIsSidebarOpen(false)}
                                            >
                                                <span className={isActive ? 'text-white' : 'text-slate-500'}>{item.icon}</span>
                                                <span>{item.name}</span>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Footer - Logout */}
                    <div className="p-3 border-t border-white/5 shrink-0">
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-500/10 hover:text-red-400 transition-all text-slate-500 text-left text-[14px]"
                        >
                            <LogOut size={20} />
                            <span>ログアウト</span>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50 print:bg-white">
                <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 shrink-0 shadow-sm z-10 print:hidden">
                    <button
                        className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                        onClick={() => setIsSidebarOpen(true)}
                    >
                        <Menu size={24} />
                    </button>

                    <div className="flex-1" />

                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-xs shadow-sm">
                            {avatarInitial}
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-4 lg:p-8">
                    <div className="max-w-6xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
