"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShoppingBag, FileText, CreditCard, Clipboard, ShoppingCart, FileDown,
  Users, Package, Truck, Building2, Zap, Shield,
  ArrowRight, Check, ChevronDown, Star, BarChart3, Clock,
  TrendingUp, Menu, X, KeyRound, Globe, Layers
} from "lucide-react";

const ToriaiLogo = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect width="32" height="32" rx="8" fill="#4f46e5" />
    <path d="M8 12h8l4-4h4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M24 20h-8l-4 4H8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M20 8l4 4-4 4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 16l-4 4 4 4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function LandingPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "pack">("pack");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 補助金計算ヘルパー: インボイス枠の段階補助率
  // 50万以下: 3/4、50万超〜350万: 2/3
  const calcSubsidy = (total: number) => {
    if (total <= 500000) {
      return { amount: Math.floor(total * 3 / 4), rate: "3/4" };
    }
    // 50万以下分: 3/4 = 375,000 + 超過分: 2/3
    const base = 500000 * 3 / 4; // 375,000
    const over = Math.min(total - 500000, 3125000) * 2 / 3; // 上限350万 - 37.5万 = 312.5万分
    const amount = Math.min(Math.floor(base + over), 3500000);
    return { amount, rate: "3/4 + 2/3" };
  };

  const plansRaw = [
    {
      name: "スタンダード",
      description: "小規模事業者向け",
      monthlyPrice: 19800,
      setupFee: 0,
      setupLabel: "",
      features: [
        "ユーザー5名まで",
        "月間受注200件",
        "見積書・請求書作成",
        "入金管理 + 銀行CSV照合",
        "仕訳データ出力",
        "メール・チャットサポート",
      ],
      cta: "申し込む",
      popular: false,
    },
    {
      name: "プロフェッショナル",
      description: "成長企業に最適",
      monthlyPrice: 49800,
      setupFee: 304800,
      setupLabel: "導入コンサル・データ移行",
      features: [
        "ユーザー20名まで",
        "月間受注無制限",
        "見積書・請求書・発注書",
        "入金管理 + 仕訳出力",
        "仕入先・仕入商品管理",
        "AIデータ解析・自動仕訳",
        "導入コンサルティング付",
        "優先サポート",
      ],
      cta: "申し込む",
      popular: true,
    },
    {
      name: "エンタープライズ",
      description: "補助金上限フル活用",
      monthlyPrice: 148000,
      setupFee: 1948000,
      setupLabel: "導入支援・カスタマイズ・研修",
      features: [
        "ユーザー無制限",
        "月間受注無制限",
        "全機能利用可能",
        "マルチテナント管理",
        "API連携・カスタマイズ",
        "専任導入コンサルタント",
        "専任サポート担当",
      ],
      cta: "お問い合わせ",
      popular: false,
    },
  ];

  const plans = plansRaw.map((p) => {
    const saasTotal = p.monthlyPrice * 24;
    const packTotal = saasTotal + p.setupFee;
    const subsidy = calcSubsidy(packTotal);
    const realCost = packTotal - subsidy.amount;
    return {
      ...p,
      saasTotal,
      packTotal,
      subsidyRate: packTotal <= 500000 ? "3/4" : "3/4 + 2/3",
      subsidyAmount: subsidy.amount,
      realCost,
      realMonthly: Math.round(realCost / 24),
    };
  });

  const features = [
    { icon: <ShoppingBag size={22} />, title: "受注管理", description: "受注の作成から納品まで一元管理。ステータス追跡でミスを防止します。" },
    { icon: <Clipboard size={22} />, title: "見積書作成", description: "テンプレートからワンクリックで見積書を作成。そのまま受注に変換できます。" },
    { icon: <FileText size={22} />, title: "請求書管理", description: "受注データから自動生成。送付・入金確認まで追跡します。" },
    { icon: <CreditCard size={22} />, title: "入金確認", description: "入金予定と実績を一目で把握。未回収の見える化で回収率を改善。" },
    { icon: <ShoppingCart size={22} />, title: "発注管理", description: "仕入先への発注を効率化。在庫とコストの最適化を支援します。" },
    { icon: <FileDown size={22} />, title: "仕訳データ出力", description: "会計ソフト連携用の仕訳データをワンクリックで出力。経理業務を自動化。" },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900" style={{ fontFamily: "'Inter', 'Noto Sans JP', system-ui, sans-serif" }}>
      {/* Nav */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-100" : "bg-transparent"}`}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/lp" className="flex items-center gap-2.5">
            <ToriaiLogo size={32} />
            <span className="text-lg font-bold tracking-tight text-slate-900">Toriai</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-[13px] text-slate-500 hover:text-slate-900 transition-colors font-medium">機能</a>
            <a href="#pricing" className="text-[13px] text-slate-500 hover:text-slate-900 transition-colors font-medium">料金</a>
            <a href="#faq" className="text-[13px] text-slate-500 hover:text-slate-900 transition-colors font-medium">FAQ</a>
            <Link href="/login" className="text-[13px] text-slate-500 hover:text-slate-900 transition-colors font-medium">ログイン</Link>
            <Link href="/login" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[13px] font-semibold rounded-lg transition-colors">
              申し込む
            </Link>
          </div>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 text-slate-600">
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-slate-100 px-6 py-5 space-y-3">
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block text-slate-600 hover:text-slate-900 py-1.5 text-sm">機能</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="block text-slate-600 hover:text-slate-900 py-1.5 text-sm">料金</a>
            <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="block text-slate-600 hover:text-slate-900 py-1.5 text-sm">FAQ</a>
            <Link href="/login" className="block text-slate-600 hover:text-slate-900 py-1.5 text-sm">ログイン</Link>
            <Link href="/login" className="block w-full text-center px-4 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg text-sm mt-2">申し込む</Link>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 md:pt-40 md:pb-28">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-[56px] font-extrabold tracking-tight leading-[1.15] mb-6 text-slate-900">
            受発注業務を、
            <br />
            <span className="text-indigo-600">もっとシンプルに。</span>
          </h1>

          <p className="text-base md:text-lg text-slate-500 max-w-xl mx-auto mb-10 leading-relaxed">
            見積もり・受注・請求・入金を一気通貫で管理。
            <br className="hidden md:inline" />
            煩雑なバックオフィス業務をスマートに効率化します。
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/login"
              className="group px-7 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all flex items-center gap-2.5 text-[15px]"
            >
              申し込む
              <ArrowRight size={17} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <a
              href="#features"
              className="px-7 py-3.5 border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 rounded-xl transition-all font-semibold text-[15px] hover:bg-slate-50"
            >
              機能を見る
            </a>
          </div>
        </div>

        {/* Dashboard mockup */}
        <div className="max-w-5xl mx-auto px-6 mt-16">
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xl shadow-slate-200/50 bg-white">
            <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-slate-100 bg-slate-50">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
              <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
              <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
              <span className="ml-3 text-[11px] text-slate-400 font-medium">Toriai — ダッシュボード</span>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "今月の売上", value: "¥4,280,000", change: "+23%", dotColor: "bg-indigo-500" },
                  { label: "受注件数", value: "142件", change: "+18%", dotColor: "bg-emerald-500" },
                  { label: "未回収額", value: "¥850,000", change: "-12%", dotColor: "bg-amber-500" },
                  { label: "顧客数", value: "56社", change: "+8%", dotColor: "bg-violet-500" },
                ].map((stat, i) => (
                  <div key={i} className="border border-slate-100 rounded-xl p-3.5">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${stat.dotColor}`} />
                      <p className="text-[11px] text-slate-400 font-medium">{stat.label}</p>
                    </div>
                    <p className="text-lg font-bold text-slate-800">{stat.value}</p>
                    <p className="text-[11px] text-emerald-600 font-medium mt-0.5">{stat.change}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2 border border-slate-100 rounded-xl p-4 h-36">
                  <p className="text-xs text-slate-400 font-medium mb-3">売上推移</p>
                  <div className="flex items-end gap-1 h-20">
                    {[40, 55, 45, 60, 75, 65, 85, 70, 90, 80, 95, 88].map((h, i) => (
                      <div key={i} className="flex-1 rounded-t bg-indigo-500/80" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                </div>
                <div className="border border-slate-100 rounded-xl p-4 h-36">
                  <p className="text-xs text-slate-400 font-medium mb-3">最近の受注</p>
                  <div className="space-y-2.5">
                    {["株式会社ABC", "△△商事", "〇〇工業"].map((name, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">{name}</span>
                        <span className="text-xs text-slate-800 font-semibold">¥{["380,000", "245,000", "520,000"][i]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-14 border-y border-slate-100 bg-slate-50/50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: "85%", label: "業務時間削減", icon: <Clock size={18} /> },
              { value: "3x", label: "処理速度向上", icon: <TrendingUp size={18} /> },
              { value: "99.9%", label: "稼働率", icon: <Shield size={18} /> },
              { value: "500+", label: "導入企業数", icon: <Building2 size={18} /> },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-white border border-slate-100 text-indigo-600 mb-2.5">
                  {stat.icon}
                </div>
                <p className="text-2xl md:text-3xl font-extrabold text-slate-900">{stat.value}</p>
                <p className="text-sm text-slate-400 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold text-indigo-600 tracking-wider uppercase mb-3">Features</p>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">
              業務を変える6つの機能
            </h2>
            <p className="text-slate-500 max-w-md mx-auto text-sm">
              受注から仕訳まで、バックオフィス業務を一気通貫でカバーします。
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <div key={i} className="group border border-slate-100 rounded-2xl p-6 hover:border-slate-200 hover:shadow-lg hover:shadow-slate-100/80 transition-all duration-300">
                <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                  {f.icon}
                </div>
                <h3 className="text-base font-bold mb-1.5 text-slate-800">{f.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: <Users size={16} />, label: "顧客管理" },
              { icon: <Package size={16} />, label: "商品管理" },
              { icon: <Truck size={16} />, label: "仕入先管理" },
              { icon: <Building2 size={16} />, label: "マルチテナント" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2.5 border border-slate-100 rounded-xl px-4 py-3 bg-slate-50/50">
                <span className="text-indigo-500">{item.icon}</span>
                <span className="text-sm font-semibold text-slate-600">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>



      {/* Pricing */}
      <section id="pricing" className="py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold text-indigo-600 tracking-wider uppercase mb-3">Pricing</p>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">
              AI導入補助金対応プラン
            </h2>
            <p className="text-slate-500 max-w-lg mx-auto text-sm mb-8">
              2年パックならAI導入補助金（インボイス枠）で最大350万円の補助を受けられます。
            </p>

            <div className="inline-flex items-center bg-slate-100 rounded-xl p-1">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                  billingCycle === "monthly" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                月額プラン
              </button>
              <button
                onClick={() => setBillingCycle("pack")}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                  billingCycle === "pack" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                2年パック
                <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-bold rounded">補助金対応</span>
              </button>
            </div>
          </div>

          {/* Subsidy info banner */}
          {billingCycle === "pack" && (
            <div className="max-w-4xl mx-auto mb-8 bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100 rounded-2xl p-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <Shield size={20} className="text-indigo-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-800 mb-1">デジタル化・AI導入補助金（インボイス枠）対応</p>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    受発注ソフト・請求書管理・会計連携が対象。50万円以下は<strong>補助率3/4</strong>、50万円超は<strong>補助率2/3</strong>で最大<strong>350万円</strong>まで補助されます。
                    2年パックはSaaS利用料＋導入支援費を含む補助金申請対応パッケージです。
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto">
            {plans.map((plan, i) => (
              <div
                key={i}
                className={`relative border rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 ${
                  plan.popular
                    ? "border-indigo-200 shadow-lg shadow-indigo-100/50 bg-white ring-1 ring-indigo-100"
                    : "border-slate-150 bg-white hover:shadow-md hover:shadow-slate-100/80"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-indigo-600 rounded-full">
                    <span className="text-[11px] font-semibold text-white flex items-center gap-1">
                      <Star size={9} /> 人気No.1
                    </span>
                  </div>
                )}

                <div className="mb-5">
                  <h3 className="text-lg font-bold text-slate-900 mb-0.5">{plan.name}</h3>
                  <p className="text-xs text-slate-400">{plan.description}</p>
                </div>

                {billingCycle === "monthly" ? (
                  <div className="mb-5">
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-3xl font-extrabold text-slate-900">
                        ¥{plan.monthlyPrice.toLocaleString()}
                      </span>
                      <span className="text-slate-400 text-sm font-medium">/月</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">税別</p>
                  </div>
                ) : (
                  <div className="mb-5">
                    <div className="space-y-1 mb-2">
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>SaaS利用料（¥{plan.monthlyPrice.toLocaleString()} × 24ヶ月）</span>
                        <span>¥{plan.saasTotal.toLocaleString()}</span>
                      </div>
                      {plan.setupFee > 0 && (
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>{plan.setupLabel}</span>
                          <span>¥{plan.setupFee.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                        <span className="text-xs font-bold text-slate-700">パック総額（税別）</span>
                        <span className="text-lg font-extrabold text-slate-900">¥{plan.packTotal.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] text-slate-500">補助金（{plan.subsidyRate}）</span>
                        <span className="text-sm font-bold text-emerald-700">-¥{plan.subsidyAmount.toLocaleString()}</span>
                      </div>
                      <div className="border-t border-emerald-200 pt-1.5 flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-700">実質負担額</span>
                        <span className="text-lg font-extrabold text-indigo-700">¥{plan.realCost.toLocaleString()}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 text-right">
                        月額換算 約¥{plan.realMonthly.toLocaleString()}/月
                      </p>
                    </div>
                  </div>
                )}

                <ul className="space-y-2.5 mb-6">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-slate-600">
                      <Check size={14} className="text-indigo-500 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all ${
                    plan.popular
                      ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>

          {billingCycle === "pack" && (
            <p className="text-center text-[11px] text-slate-400 mt-6 max-w-xl mx-auto">
              ※ 補助金額は小規模事業者のインボイス枠（インボイス対応類型）の場合の目安です。実際の補助率・上限額は申請内容や事業者区分により異なります。
              詳細は<a href="https://it-shien.smrj.go.jp/" target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">公式サイト</a>でご確認ください。
            </p>
          )}

          {/* Options */}
          <div className="mt-16 max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <p className="text-xs font-semibold text-indigo-600 tracking-wider uppercase mb-2">Options</p>
              <h3 className="text-2xl font-extrabold tracking-tight mb-2">オプション一覧</h3>
              <p className="text-sm text-slate-500">2年パックと組み合わせて補助金申請に含めることができます</p>
            </div>
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left py-3 px-5 font-semibold text-slate-700 text-xs">カテゴリ</th>
                    <th className="text-left py-3 px-5 font-semibold text-slate-700 text-xs">オプション名</th>
                    <th className="text-right py-3 px-5 font-semibold text-slate-700 text-xs">料金（税別）</th>
                    <th className="text-center py-3 px-5 font-semibold text-slate-700 text-xs">補助金対象</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { cat: "導入支援", name: "初期設定・データ移行支援", price: "¥150,000", subsidy: true },
                    { cat: "導入支援", name: "操作研修（オンサイト / 半日）", price: "¥100,000", subsidy: true },
                    { cat: "導入支援", name: "操作研修（オンライン / 2時間）", price: "¥50,000", subsidy: true },
                    { cat: "導入支援", name: "導入コンサルティング", price: "¥200,000", subsidy: true },
                    { cat: "拡張機能", name: "追加ユーザー（5名単位）", price: "¥5,000/月", subsidy: true },
                    { cat: "拡張機能", name: "API連携・外部システム接続", price: "¥300,000", subsidy: true },
                    { cat: "拡張機能", name: "カスタム帳票テンプレート作成", price: "¥50,000/件", subsidy: true },
                    { cat: "セキュリティ", name: "IPアドレス制限", price: "¥10,000/月", subsidy: true },
                    { cat: "セキュリティ", name: "二要素認証（2FA）追加", price: "¥5,000/月", subsidy: true },
                    { cat: "セキュリティ", name: "監査ログ・操作ログ出力", price: "¥20,000/月", subsidy: true },
                    { cat: "サポート", name: "優先サポート（専任担当付）", price: "¥30,000/月", subsidy: true },
                  ].map((opt, i, arr) => {
                    const prevCat = i > 0 ? arr[i - 1].cat : "";
                    const showCat = opt.cat !== prevCat;
                    return (
                      <tr key={i} className={`border-b border-slate-100 last:border-0 ${showCat && i > 0 ? "border-t border-slate-200" : ""}`}>
                        <td className="py-3 px-5 text-slate-500 text-xs font-medium">
                          {showCat ? opt.cat : ""}
                        </td>
                        <td className="py-3 px-5 text-slate-800 font-medium">{opt.name}</td>
                        <td className="py-3 px-5 text-right text-slate-700 font-semibold whitespace-nowrap">{opt.price}</td>
                        <td className="py-3 px-5 text-center">
                          {opt.subsidy ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                              <Check size={10} /> 対象
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-slate-400 mt-4 text-center">
              ※ オプション料金は2年パックに加算して補助金申請に含めることが可能です（対象マーク付きのもの）。
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 md:py-28 bg-slate-50/70 border-y border-slate-100">
        <div className="max-w-2xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">
              よくあるご質問
            </h2>
          </div>
          <div className="space-y-2">
            {[
              { q: "AI導入補助金は誰でも申請できますか？", a: "中小企業・小規模事業者が対象です。GビズIDプライムアカウントとSECURITY ACTION宣言が必要です。IT導入支援事業者との共同申請となりますので、導入時にサポートいたします。" },
              { q: "2年パック終了後はどうなりますか？", a: "2年パック終了後は月額プランに自動移行します。継続利用の場合は通常の月額料金でご利用いただけます。もちろん、解約も自由です。" },
              { q: "補助金の実際の補助率はどのくらいですか？", a: "インボイス枠の場合、50万円以下は3/4（小規模事業者は4/5）、50万円超は2/3が補助されます。エンタープライズプランなら上限350万円のフル活用が可能です。" },
              { q: "申し込み後すぐに利用できますか？", a: "はい、お申し込み完了後すぐにアカウントが発行され、即日ご利用いただけます。導入支援付きプランの場合は、担当者が初期設定をサポートいたします。" },
              { q: "既存の会計ソフトとの連携は可能ですか？", a: "仕訳データ出力機能により、freee、マネーフォワード、弥生会計などの主要な会計ソフトにCSVインポートできます。" },
              { q: "データのセキュリティは大丈夫ですか？", a: "すべてのデータは暗号化されて保存され、行レベルセキュリティ（RLS）で会社間のデータは完全に分離されています。" },
            ].map((faq, i) => (
              <FAQItem key={i} question={faq.q} answer={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-28">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4 text-slate-900">
            今すぐ始めて、
            <br />業務をスマートに。
          </h2>
          <p className="text-slate-500 max-w-md mx-auto mb-8 text-[15px]">
            補助金活用で導入コストを大幅削減。
            <br />まずはお気軽にご相談ください。
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2.5 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors text-[15px]"
          >
            お申し込み・ご相談
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-12 bg-slate-50/50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2.5 mb-3">
                <ToriaiLogo size={28} />
                <span className="text-base font-bold text-slate-900">Toriai</span>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-xs mb-3 text-slate-800 uppercase tracking-wider">プロダクト</h4>
              <ul className="space-y-2">
                <li><a href="#features" className="text-sm text-slate-400 hover:text-slate-700 transition-colors">機能</a></li>
                <li><a href="#pricing" className="text-sm text-slate-400 hover:text-slate-700 transition-colors">料金</a></li>
                <li><a href="#faq" className="text-sm text-slate-400 hover:text-slate-700 transition-colors">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-xs mb-3 text-slate-800 uppercase tracking-wider">サポート</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-sm text-slate-400 hover:text-slate-700 transition-colors">ヘルプセンター</a></li>
                <li><a href="#" className="text-sm text-slate-400 hover:text-slate-700 transition-colors">お問い合わせ</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-xs mb-3 text-slate-800 uppercase tracking-wider">法的情報</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-sm text-slate-400 hover:text-slate-700 transition-colors">利用規約</a></li>
                <li><a href="#" className="text-sm text-slate-400 hover:text-slate-700 transition-colors">プライバシーポリシー</a></li>
                <li><a href="#" className="text-sm text-slate-400 hover:text-slate-700 transition-colors">特定商取引法</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-100 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-xs text-slate-400">© {new Date().getFullYear()} Toriai. All rights reserved.</p>
            <div className="flex items-center gap-1.5">
              <Shield size={11} className="text-slate-400" />
              <span className="text-xs text-slate-400">SSL暗号化 ・ SOC2準拠</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-slate-100 rounded-xl overflow-hidden bg-white hover:border-slate-200 transition-colors">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-5 py-4 text-left">
        <span className="font-semibold text-sm text-slate-700 pr-4">{question}</span>
        <ChevronDown size={16} className={`text-slate-400 transition-transform duration-200 flex-shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>
      <div className={`overflow-hidden transition-all duration-200 ${open ? "max-h-40 opacity-100" : "max-h-0 opacity-0"}`}>
        <p className="px-5 pb-4 text-sm text-slate-500 leading-relaxed">{answer}</p>
      </div>
    </div>
  );
}
