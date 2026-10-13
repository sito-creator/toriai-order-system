'use client';

import { useState, useMemo } from 'react';
import {
    ArrowUpRight, DollarSign, Receipt, Package, ShoppingBag,
    TrendingUp, TrendingDown, Calendar, ArrowRight, ChevronLeft,
    ChevronRight, BarChart3, FileText
} from 'lucide-react';
import Link from 'next/link';

type Order = {
    id: string;
    created_at: string;
    total_amount: number;
    status: string;
    order_number: string | null;
    source_type: string | null;
    customer_id: string | null;
    customers: { company_name: string } | null;
};

type Purchase = {
    id: string;
    created_at: string;
    total_amount: number;
};

type Invoice = {
    id: string;
    created_at: string;
    total_amount: number;
    status: string;
};

type ViewMode = 'month' | 'quarter' | 'year' | 'all';

interface Props {
    orders: Order[];
    purchases: Purchase[];
    invoices: Invoice[];
    customerCount: number;
    productCount: number;
}

// ヘルパー: 日付を年月キーに変換
function toYM(dateStr: string) {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function toQuarter(dateStr: string) {
    const d = new Date(dateStr);
    const q = Math.ceil((d.getMonth() + 1) / 3);
    return `${d.getFullYear()}-Q${q}`;
}

function toYear(dateStr: string) {
    return new Date(dateStr).getFullYear().toString();
}

export default function DashboardClient({ orders, purchases, invoices, customerCount, productCount }: Props) {
    const [viewMode, setViewMode] = useState<ViewMode>('month');
    const [selectedDate, setSelectedDate] = useState(() => {
        const now = new Date();
        return { year: now.getFullYear(), month: now.getMonth() + 1 };
    });

    // 表示期間のラベル
    const periodLabel = useMemo(() => {
        if (viewMode === 'all') return '全期間';
        if (viewMode === 'year') return `${selectedDate.year}年`;
        if (viewMode === 'quarter') {
            const q = Math.ceil(selectedDate.month / 3);
            return `${selectedDate.year}年 Q${q}（${(q - 1) * 3 + 1}月〜${q * 3}月）`;
        }
        return `${selectedDate.year}年${selectedDate.month}月`;
    }, [viewMode, selectedDate]);

    // 期間内のデータフィルタリング
    const filterByPeriod = useMemo(() => {
        const isInPeriod = (dateStr: string) => {
            if (viewMode === 'all') return true;
            const d = new Date(dateStr);
            const y = d.getFullYear();
            const m = d.getMonth() + 1;
            if (viewMode === 'year') return y === selectedDate.year;
            if (viewMode === 'quarter') {
                const selectedQ = Math.ceil(selectedDate.month / 3);
                const dataQ = Math.ceil(m / 3);
                return y === selectedDate.year && dataQ === selectedQ;
            }
            return y === selectedDate.year && m === selectedDate.month;
        };
        return {
            orders: orders.filter(o => isInPeriod(o.created_at)),
            purchases: purchases.filter(p => isInPeriod(p.created_at)),
            invoices: invoices.filter(i => isInPeriod(i.created_at)),
        };
    }, [orders, purchases, invoices, viewMode, selectedDate]);

    // 前期間のデータ
    const prevPeriodData = useMemo(() => {
        const isInPrevPeriod = (dateStr: string) => {
            const d = new Date(dateStr);
            const y = d.getFullYear();
            const m = d.getMonth() + 1;
            if (viewMode === 'all') return false;
            if (viewMode === 'year') return y === selectedDate.year - 1;
            if (viewMode === 'quarter') {
                const selectedQ = Math.ceil(selectedDate.month / 3);
                if (selectedQ === 1) {
                    return y === selectedDate.year - 1 && Math.ceil(m / 3) === 4;
                }
                return y === selectedDate.year && Math.ceil(m / 3) === selectedQ - 1;
            }
            // month
            if (selectedDate.month === 1) return y === selectedDate.year - 1 && m === 12;
            return y === selectedDate.year && m === selectedDate.month - 1;
        };
        return {
            orders: orders.filter(o => isInPrevPeriod(o.created_at)),
            purchases: purchases.filter(p => isInPrevPeriod(p.created_at)),
        };
    }, [orders, purchases, viewMode, selectedDate]);

    // KPI計算
    const totalSales = filterByPeriod.orders.reduce((s, o) => s + (Number(o.total_amount) || 0), 0);
    const totalExpenses = filterByPeriod.purchases.reduce((s, p) => s + (Number(p.total_amount) || 0), 0);
    const orderCount = filterByPeriod.orders.length;
    const pendingOrders = filterByPeriod.orders.filter(o => ['確認待ち', '新規受注'].includes(o.status));
    const invoiceTotal = filterByPeriod.invoices.reduce((s, i) => s + (Number(i.total_amount) || 0), 0);
    const profit = totalSales - totalExpenses;

    const prevSales = prevPeriodData.orders.reduce((s, o) => s + (Number(o.total_amount) || 0), 0);
    const prevExpenses = prevPeriodData.purchases.reduce((s, p) => s + (Number(p.total_amount) || 0), 0);
    const prevOrderCount = prevPeriodData.orders.length;

    // 前期比
    const salesChange = prevSales > 0 ? ((totalSales - prevSales) / prevSales) * 100 : null;
    const expenseChange = prevExpenses > 0 ? ((totalExpenses - prevExpenses) / prevExpenses) * 100 : null;
    const orderCountChange = prevOrderCount > 0 ? ((orderCount - prevOrderCount) / prevOrderCount) * 100 : null;

    // 月別推移データ（直近6ヶ月）
    const monthlyTrend = useMemo(() => {
        const months: { key: string; label: string; sales: number; expenses: number; orders: number }[] = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(selectedDate.year, selectedDate.month - 1 - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const label = `${d.getMonth() + 1}月`;
            const sales = orders
                .filter(o => toYM(o.created_at) === key)
                .reduce((s, o) => s + (Number(o.total_amount) || 0), 0);
            const expenses = purchases
                .filter(p => toYM(p.created_at) === key)
                .reduce((s, p) => s + (Number(p.total_amount) || 0), 0);
            const count = orders.filter(o => toYM(o.created_at) === key).length;
            months.push({ key, label, sales, expenses, orders: count });
        }
        return months;
    }, [orders, purchases, selectedDate]);

    const maxTrendValue = Math.max(...monthlyTrend.map(m => Math.max(m.sales, m.expenses)), 1);

    // ナビゲーション
    const navigate = (direction: -1 | 1) => {
        setSelectedDate(prev => {
            if (viewMode === 'year') return { ...prev, year: prev.year + direction };
            if (viewMode === 'quarter') {
                const q = Math.ceil(prev.month / 3) + direction;
                if (q < 1) return { year: prev.year - 1, month: 12 };
                if (q > 4) return { year: prev.year + 1, month: 3 };
                return { ...prev, month: (q - 1) * 3 + 2 }; // 四半期の中央月
            }
            // month
            const newMonth = prev.month + direction;
            if (newMonth < 1) return { year: prev.year - 1, month: 12 };
            if (newMonth > 12) return { year: prev.year + 1, month: 1 };
            return { ...prev, month: newMonth };
        });
    };

    const goToToday = () => {
        const now = new Date();
        setSelectedDate({ year: now.getFullYear(), month: now.getMonth() + 1 });
    };

    // 最近の受注（選択期間内の最新5件）
    const recentOrders = filterByPeriod.orders.slice(0, 5);

    // ステータス別集計
    const statusBreakdown = useMemo(() => {
        const counts: Record<string, number> = {};
        filterByPeriod.orders.forEach(o => {
            counts[o.status] = (counts[o.status] || 0) + 1;
        });
        return Object.entries(counts).sort((a, b) => b[1] - a[1]);
    }, [filterByPeriod.orders]);

    const formatChange = (val: number | null) => {
        if (val === null) return null;
        const sign = val >= 0 ? '+' : '';
        return `${sign}${val.toFixed(1)}%`;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">ダッシュボード</h1>
                    <p className="text-slate-500 mt-1">売上・経費・受注状況の分析</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {/* View Mode Toggle */}
                    <div className="flex bg-slate-100 rounded-xl p-1">
                        {[
                            { key: 'month' as ViewMode, label: '月別' },
                            { key: 'quarter' as ViewMode, label: '四半期' },
                            { key: 'year' as ViewMode, label: '年別' },
                            { key: 'all' as ViewMode, label: '全期間' },
                        ].map(v => (
                            <button
                                key={v.key}
                                onClick={() => setViewMode(v.key)}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${viewMode === v.key
                                    ? 'bg-white text-indigo-700 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                {v.label}
                            </button>
                        ))}
                    </div>
                    {/* Period Navigation */}
                    {viewMode !== 'all' && (
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => navigate(-1)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <div className="flex items-center gap-1.5 text-sm text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-xl font-semibold min-w-[140px] justify-center shadow-sm">
                                <Calendar size={14} className="text-slate-400" />
                                <span>{periodLabel}</span>
                            </div>
                            <button
                                onClick={() => navigate(1)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <ChevronRight size={18} />
                            </button>
                            <button
                                onClick={goToToday}
                                className="px-2.5 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            >
                                今月
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* 売上 */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                        <div className="p-3 rounded-xl bg-emerald-100">
                            <DollarSign className="text-emerald-600" size={24} />
                        </div>
                        {salesChange !== null && (
                            <span className={`text-xs font-bold px-2 py-1 rounded-full flex items-center gap-0.5 ${salesChange >= 0
                                ? 'text-emerald-600 bg-emerald-50'
                                : 'text-rose-600 bg-rose-50'
                                }`}>
                                {salesChange >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                {formatChange(salesChange)}
                            </span>
                        )}
                    </div>
                    <div className="mt-4">
                        <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider">売上（受注総額）</h3>
                        <p className="text-3xl font-bold text-slate-900 mt-1.5 tracking-tight">¥{totalSales.toLocaleString()}</p>
                        {viewMode !== 'all' && (
                            <p className="text-xs text-slate-400 mt-2">{orderCount}件の受注</p>
                        )}
                    </div>
                </div>

                {/* 経費 */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                        <div className="p-3 rounded-xl bg-rose-100">
                            <Receipt className="text-rose-600" size={24} />
                        </div>
                        {expenseChange !== null && (
                            <span className={`text-xs font-bold px-2 py-1 rounded-full flex items-center gap-0.5 ${expenseChange <= 0
                                ? 'text-emerald-600 bg-emerald-50'
                                : 'text-rose-600 bg-rose-50'
                                }`}>
                                {expenseChange <= 0 ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
                                {formatChange(expenseChange)}
                            </span>
                        )}
                    </div>
                    <div className="mt-4">
                        <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider">経費（仕入・発注）</h3>
                        <p className="text-3xl font-bold text-slate-900 mt-1.5 tracking-tight">¥{totalExpenses.toLocaleString()}</p>
                        {viewMode !== 'all' && (
                            <p className="text-xs text-slate-400 mt-2">{filterByPeriod.purchases.length}件の発注</p>
                        )}
                    </div>
                </div>

                {/* 受注件数 */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                        <div className="p-3 rounded-xl bg-indigo-100">
                            <ShoppingBag className="text-indigo-600" size={24} />
                        </div>
                        {orderCountChange !== null && (
                            <span className={`text-xs font-bold px-2 py-1 rounded-full flex items-center gap-0.5 ${orderCountChange >= 0
                                ? 'text-emerald-600 bg-emerald-50'
                                : 'text-rose-600 bg-rose-50'
                                }`}>
                                {orderCountChange >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                {formatChange(orderCountChange)}
                            </span>
                        )}
                    </div>
                    <div className="mt-4">
                        <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider">受注件数</h3>
                        <p className="text-3xl font-bold text-slate-900 mt-1.5 tracking-tight">{orderCount} <span className="text-base font-normal text-slate-400">件</span></p>
                        {viewMode !== 'all' && prevOrderCount > 0 && (
                            <p className="text-xs text-slate-400 mt-2">前期: {prevOrderCount}件</p>
                        )}
                    </div>
                </div>

                {/* 未処理 */}
                <div className={`rounded-2xl p-6 border shadow-sm hover:shadow-md transition-shadow ${pendingOrders.length > 0
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-white border-slate-200'
                    }`}>
                    <div className="flex items-start justify-between">
                        <div className={`p-3 rounded-xl ${pendingOrders.length > 0 ? 'bg-amber-200' : 'bg-amber-100'}`}>
                            <Package className="text-amber-600" size={24} />
                        </div>
                        {pendingOrders.length > 0 && (
                            <Link href="/orders" className="text-xs font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-full transition-colors flex items-center gap-1">
                                対応する <ArrowRight size={12} />
                            </Link>
                        )}
                    </div>
                    <div className="mt-4">
                        <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider">未処理の注文</h3>
                        <p className={`text-3xl font-bold mt-1.5 tracking-tight ${pendingOrders.length > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                            {pendingOrders.length} <span className="text-base font-normal text-slate-400">件</span>
                        </p>
                        <p className="text-xs text-slate-400 mt-2">確認待ち・新規受注</p>
                    </div>
                </div>
            </div>

            {/* Monthly Trend Chart - Full Width */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <BarChart3 size={18} className="text-slate-400" />
                        <h2 className="text-base font-bold text-slate-900">月別推移（直近6ヶ月）</h2>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-400"></span>売上</span>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-rose-400"></span>経費</span>
                    </div>
                </div>
                <div className="flex items-end gap-4" style={{ height: '180px' }}>
                    {monthlyTrend.map((m) => {
                        const BAR_MAX_HEIGHT = 140; // px
                        const salesH = Math.max(Math.round((m.sales / maxTrendValue) * BAR_MAX_HEIGHT), 3);
                        const expensesH = Math.max(Math.round((m.expenses / maxTrendValue) * BAR_MAX_HEIGHT), 3);
                        return (
                            <div key={m.key} className="flex-1 flex flex-col items-center justify-end gap-1.5 h-full">
                                <div className="w-full flex gap-1.5 items-end flex-1">
                                    {/* Sales bar */}
                                    <div className="flex-1 flex items-end justify-center h-full">
                                        <div
                                            className="w-full bg-emerald-400 rounded-t-md transition-all duration-500 hover:bg-emerald-500 relative group cursor-pointer"
                                            style={{ height: `${salesH}px` }}
                                        >
                                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                                ¥{m.sales.toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                    {/* Expenses bar */}
                                    <div className="flex-1 flex items-end justify-center h-full">
                                        <div
                                            className="w-full bg-rose-400 rounded-t-md transition-all duration-500 hover:bg-rose-500 relative group cursor-pointer"
                                            style={{ height: `${expensesH}px` }}
                                        >
                                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                                ¥{m.expenses.toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-center shrink-0">
                                    <p className="text-xs font-bold text-slate-500">{m.label}</p>
                                    <p className="text-[10px] text-slate-400">{m.orders}件</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Info Row: Profit + Status + Master Data */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Profit */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                        利益サマリー
                        <span className="text-[10px] text-slate-400 ml-1.5 normal-case font-normal">{periodLabel}</span>
                    </h2>
                    <div className="flex items-center justify-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="text-center">
                            <div className="flex items-center justify-center gap-2 mb-1.5">
                                {profit >= 0 ? (
                                    <TrendingUp size={16} className="text-emerald-500" />
                                ) : (
                                    <TrendingDown size={16} className="text-rose-500" />
                                )}
                                <p className="text-[11px] text-slate-500 font-bold">売上 − 経費</p>
                            </div>
                            <p className={`text-2xl font-bold tracking-tight ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                ¥{profit.toLocaleString()}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Status Breakdown */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">ステータス別</h2>
                    {statusBreakdown.length > 0 ? (
                        <div className="space-y-2">
                            {statusBreakdown.map(([status, count]) => {
                                const pct = orderCount > 0 ? (count / orderCount) * 100 : 0;
                                let color = 'bg-slate-300';
                                if (status === '確認待ち' || status === '新規受注') color = 'bg-amber-400';
                                if (status === '受注確定') color = 'bg-emerald-400';
                                if (status === '出荷準備中') color = 'bg-sky-400';
                                if (status === '納品済') color = 'bg-slate-400';
                                return (
                                    <div key={status}>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="font-semibold text-slate-700">{status}</span>
                                            <span className="text-slate-500">{count}件（{pct.toFixed(0)}%）</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-sm text-slate-400 text-center py-4">データなし</p>
                    )}
                </div>

                {/* Master Data */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">マスターデータ</h2>
                    <div className="space-y-2">
                        <Link href="/customers" className="flex items-center justify-between p-3 bg-slate-50 hover:bg-indigo-50 rounded-xl transition-colors group">
                            <span className="font-bold text-sm text-slate-700 group-hover:text-indigo-700">顧客マスター</span>
                            <span className="text-lg font-bold text-indigo-600">{customerCount}<span className="text-xs font-normal text-slate-400 ml-1">件</span></span>
                        </Link>
                        <Link href="/products" className="flex items-center justify-between p-3 bg-slate-50 hover:bg-indigo-50 rounded-xl transition-colors group">
                            <span className="font-bold text-sm text-slate-700 group-hover:text-indigo-700">商品マスター</span>
                            <span className="text-lg font-bold text-indigo-600">{productCount}<span className="text-xs font-normal text-slate-400 ml-1">件</span></span>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Recent Orders Table */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <FileText size={16} className="text-slate-400" />
                        {viewMode === 'all' ? '最新の受注データ' : `${periodLabel}の受注データ`}
                        <span className="text-xs font-normal text-slate-400">（最新5件）</span>
                    </h2>
                    <Link href="/orders" className="text-sm text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 transition-colors">
                        すべて見る <ArrowUpRight size={14} />
                    </Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
                        <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                            <tr>
                                <th className="font-medium py-3 px-5">ステータス</th>
                                <th className="font-medium py-3 px-5">受注番号</th>
                                <th className="font-medium py-3 px-5">顧客名</th>
                                <th className="font-medium py-3 px-5 text-right">金額</th>
                                <th className="font-medium py-3 px-5">日付</th>
                                <th className="font-medium py-3 px-5">発生元</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {recentOrders.length > 0 ? recentOrders.map((row) => {
                                let statusColor = 'bg-slate-100 text-slate-700 border-slate-200';
                                if (row.status === '確認待ち' || row.status === '新規受注') statusColor = 'bg-amber-100 text-amber-700 border-amber-200';
                                if (row.status === '受注確定') statusColor = 'bg-emerald-100 text-emerald-700 border-emerald-200';
                                if (row.status === '出荷準備中') statusColor = 'bg-sky-100 text-sky-700 border-sky-200';
                                if (row.status === '納品済') statusColor = 'bg-slate-200 text-slate-700 border-slate-300';

                                return (
                                    <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="py-3.5 px-5">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${statusColor}`}>
                                                {row.status}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-5 font-mono text-xs text-slate-500">{row.order_number || '-'}</td>
                                        <td className="py-3.5 px-5 font-semibold text-slate-900">{(row.customers as any)?.company_name || '未紐付け'}</td>
                                        <td className="py-3.5 px-5 text-right font-bold">¥{(row.total_amount || 0).toLocaleString()}</td>
                                        <td className="py-3.5 px-5 text-xs text-slate-500">
                                            {new Date(row.created_at).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                                        </td>
                                        <td className="py-3.5 px-5">
                                            {row.source_type ? (
                                                <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded">{row.source_type}</span>
                                            ) : (
                                                <span className="text-xs text-slate-500">手動</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan={6} className="py-12 text-center text-slate-400">
                                        <ShoppingBag size={32} className="mx-auto text-slate-300 mb-3" />
                                        <p className="font-medium">この期間の受注データはありません</p>
                                        <p className="text-xs mt-1">期間を変更するか、受注メニューから新規登録してください</p>
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
