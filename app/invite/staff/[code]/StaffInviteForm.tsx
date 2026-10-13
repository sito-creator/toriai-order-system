"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Mail, Lock, ArrowRight, Loader2, AlertCircle, Building2, Check, Users, Shield } from "lucide-react";

interface StaffInviteFormProps {
    company: { id: string; name: string };
    code: string;
}

export default function StaffInviteForm({ company, code }: StaffInviteFormProps) {
    const router = useRouter();
    const supabase = createClient();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [message, setMessage] = useState({ text: "", type: "" });
    const [isComplete, setIsComplete] = useState(false);

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;

        setIsSubmitting(true);
        setMessage({ text: "", type: "" });

        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        invite_code: code,
                        invite_role: 'staff',
                        display_name: displayName,
                    },
                },
            });

            if (error) throw error;

            if (data.user && data.user.identities && data.user.identities.length === 0) {
                setMessage({ text: "このメールアドレスは既に登録されています。ログインしてください。", type: "error" });
            } else {
                setIsComplete(true);
                if (data.session) {
                    setTimeout(() => router.push("/dashboard"), 2000);
                }
            }
        } catch (error: any) {
            setMessage({ text: error.message, type: "error" });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-950 flex items-center justify-center relative overflow-hidden font-sans">
            <div className="absolute -top-20 -left-20 w-96 h-96 bg-indigo-600/40 rounded-full blur-[80px] pointer-events-none animate-pulse"></div>
            <div className="absolute -bottom-12 -right-12 w-80 h-80 bg-emerald-500/30 rounded-full blur-[80px] pointer-events-none animate-pulse" style={{ animationDelay: '-5s' }}></div>

            <div className="relative z-10 w-full max-w-md p-10 bg-white/5 border border-white/10 rounded-[24px] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-all duration-300">

                {message.text && (
                    <div className={`flex items-center gap-2 p-3 mb-5 rounded-lg text-sm ${message.type === 'error' ? 'bg-red-500/10 border border-red-500/20 text-red-300' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'}`}>
                        <AlertCircle size={16} />
                        <span>{message.text}</span>
                    </div>
                )}

                {isComplete ? (
                    <div className="text-center">
                        <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-full flex items-center justify-center mx-auto mb-5 text-white shadow-[0_10px_25px_-5px_rgba(16,185,129,0.4)]">
                            <Check size={40} />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">登録完了！</h2>
                        <p className="text-slate-400 text-sm mb-1">
                            <span className="text-emerald-400 font-semibold">{company.name}</span> にスタッフとして参加しました
                        </p>
                        <p className="text-slate-500 text-xs mb-6">メールを確認してアカウントを有効化してください。</p>
                        <button
                            onClick={() => router.push("/login")}
                            className="w-full flex items-center justify-center gap-2 bg-gradient-to-br from-indigo-600 to-indigo-500 hover:-translate-y-0.5 text-white font-semibold text-[15px] py-3.5 px-4 rounded-xl transition-all shadow-[0_4px_14px_rgba(79,70,229,0.3)]"
                        >
                            ログイン画面へ
                            <ArrowRight size={18} />
                        </button>
                    </div>
                ) : (
                    <div>
                        <div className="flex items-center gap-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 mb-6">
                            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 shrink-0">
                                <Building2 size={22} />
                            </div>
                            <div>
                                <p className="text-xs text-indigo-300 font-medium">招待先の会社</p>
                                <p className="text-white font-bold text-lg leading-tight">{company.name}</p>
                            </div>
                        </div>

                        <div className="text-center mb-6">
                            <div className="flex items-center justify-center gap-2 mb-2">
                                <Shield size={20} className="text-emerald-400" />
                                <h2 className="text-xl font-bold text-white tracking-tight">スタッフ登録</h2>
                            </div>
                            <p className="text-slate-400 text-sm">スタッフとしてアカウントを作成します</p>
                            <p className="text-emerald-400/70 text-xs mt-1">※ 全ての業務機能にアクセスできます</p>
                        </div>

                        <form onSubmit={handleSignUp} className="space-y-4 text-left">
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-400">表示名</label>
                                <div className="relative">
                                    <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        placeholder="例: 山田 太郎"
                                        className="w-full bg-white/5 border border-white/10 text-white placeholder-slate-500 rounded-xl py-3 pl-10 pr-4 outline-none focus:bg-white/10 focus:border-indigo-500/80 focus:ring-4 focus:ring-indigo-500/15 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-400">メールアドレス</label>
                                <div className="relative">
                                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        placeholder="name@example.com"
                                        className="w-full bg-white/5 border border-white/10 text-white placeholder-slate-500 rounded-xl py-3 pl-10 pr-4 outline-none focus:bg-white/10 focus:border-indigo-500/80 focus:ring-4 focus:ring-indigo-500/15 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-400">パスワード</label>
                                <div className="relative">
                                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        minLength={6}
                                        placeholder="6文字以上"
                                        className="w-full bg-white/5 border border-white/10 text-white placeholder-slate-500 rounded-xl py-3 pl-10 pr-4 outline-none focus:bg-white/10 focus:border-indigo-500/80 focus:ring-4 focus:ring-indigo-500/15 transition-all"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full flex items-center justify-center gap-2 bg-gradient-to-br from-emerald-600 to-emerald-500 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(16,185,129,0.4)] active:translate-y-0 text-white font-semibold text-[15px] py-3.5 px-4 rounded-xl transition-all shadow-[0_4px_14px_rgba(16,185,129,0.3)] disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none mt-2"
                            >
                                <span>{isSubmitting ? '登録中...' : 'スタッフとして参加'}</span>
                                {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
                            </button>
                        </form>

                        <div className="text-center mt-6 text-sm text-slate-400">
                            <span>すでにアカウントをお持ちですか？</span>
                            <button
                                onClick={() => router.push("/login")}
                                className="text-indigo-300 font-medium ml-1.5 hover:text-white transition-colors outline-none"
                            >
                                ログイン
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
