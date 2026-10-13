"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Layers, Mail, Lock, ArrowRight, Loader2, AlertCircle, LogOut, Check } from "lucide-react";

export default function LoginPage() {
    const router = useRouter();
    const supabase = createClient();

    const [isSignUpMode, setIsSignUpMode] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState({ text: "", type: "" });
    const [loggedInUser, setLoggedInUser] = useState<string | null>(null);

    useEffect(() => {
        async function checkSession() {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                setLoggedInUser(session.user.email ?? null);
            }
        }
        checkSession();
    }, [supabase]);

    useEffect(() => {
        const error = new URLSearchParams(window.location.search).get('error');
        if (error === 'auth_callback_failed') {
            showMessage('認証リンクを確認できませんでした。もう一度お試しください。', 'error');
        } else if (error === 'email_confirmation_failed') {
            showMessage('メール確認リンクが無効または期限切れです。', 'error');
        }
    }, []);

    // ログイン済みユーザーをダッシュボードにリダイレクト
    useEffect(() => {
        if (loggedInUser) {
            const timer = setTimeout(() => {
                router.push('/dashboard');
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [loggedInUser, router]);

    const toggleMode = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsSignUpMode(!isSignUpMode);
        setMessage({ text: "", type: "" });
    };

    const showMessage = (text: string, type: "success" | "error") => {
        setMessage({ text, type });
    };

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isLoading) return;

        setIsLoading(true);
        setMessage({ text: "", type: "" });

        try {
            if (isSignUpMode) {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: `${window.location.origin}/auth/callback`,
                    },
                });

                if (error) throw error;

                if (data.user && data.user.identities && data.user.identities.length === 0) {
                    showMessage("このメールアドレスは既に登録されています。", "error");
                } else {
                    showMessage("登録が完了しました！メールを確認してください。", "success");
                    if (data.session) {
                        setTimeout(() => setLoggedInUser(data.user!.email ?? null), 1500);
                    }
                }
            } else {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (error) {
                    if (error.message.includes("Invalid login credentials")) {
                        throw new Error("メールアドレスまたはパスワードが正しくありません。");
                    }
                    throw error;
                }

                setLoggedInUser(data.user.email ?? null);
            }
        } catch (error: any) {
            showMessage(error.message, "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = async () => {
        setIsLoading(true);
        await supabase.auth.signOut();
        setLoggedInUser(null);
        setEmail("");
        setPassword("");
        setMessage({ text: "", type: "" });
        setIsLoading(false);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-950 flex items-center justify-center relative overflow-hidden font-sans">
            {/* Animated blob background elements */}
            <div className="absolute -top-20 -left-20 w-96 h-96 bg-indigo-600/40 rounded-full blur-[80px] pointer-events-none animate-pulse"></div>
            <div className="absolute -bottom-12 -right-12 w-80 h-80 bg-pink-500/30 rounded-full blur-[80px] pointer-events-none animate-pulse" style={{ animationDelay: '-5s' }}></div>

            <div className="relative z-10 w-full max-w-md p-10 bg-white/5 border border-white/10 rounded-[24px] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-all duration-300">

                {/* Message Box */}
                {message.text && (
                    <div className={`flex items-center gap-2 p-3 mb-5 rounded-lg text-sm transition-opacity duration-300 ${message.type === 'error' ? 'bg-red-500/10 border border-red-500/20 text-red-300' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'}`}>
                        <AlertCircle size={16} />
                        <span>{message.text}</span>
                    </div>
                )}

                {loggedInUser ? (
                    <div className="text-center animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-full flex items-center justify-center mx-auto mb-5 text-white shadow-[0_10px_25px_-5px_rgba(16,185,129,0.4)]">
                            <Check size={40} />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">ログイン成功！</h2>
                        <p className="text-slate-400 text-sm mb-1">ようこそ、<span className="text-white font-medium">{loggedInUser}</span> さん</p>
                        <p className="text-slate-500 text-xs mb-6">ダッシュボードへ移動します...</p>

                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center justify-center gap-2 bg-transparent border border-white/10 hover:bg-white/5 text-white font-semibold text-sm py-3.5 px-4 rounded-xl transition-all"
                        >
                            <LogOut size={16} />
                            <span>ログアウト</span>
                        </button>
                    </div>
                ) : (
                    <div>
                        <div className="text-center mb-6">
                            <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-pink-500 rounded-xl flex items-center justify-center mx-auto mb-4 text-white shadow-[0_10px_25px_-5px_rgba(79,70,229,0.5)]">
                                <Layers size={24} />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">
                                {isSignUpMode ? '新規アカウント作成' : 'Toriai にログイン'}
                            </h2>
                            <p className="text-slate-400 text-sm">アカウント情報を入力して続行してください</p>
                        </div>

                        <form onSubmit={handleAuth} className="space-y-5 text-left">
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
                                        placeholder="••••••••"
                                        className="w-full bg-white/5 border border-white/10 text-white placeholder-slate-500 rounded-xl py-3 pl-10 pr-4 outline-none focus:bg-white/10 focus:border-indigo-500/80 focus:ring-4 focus:ring-indigo-500/15 transition-all"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full flex items-center justify-center gap-2 bg-gradient-to-br from-indigo-600 to-indigo-500 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(79,70,229,0.4)] active:translate-y-0 text-white font-semibold text-[15px] py-3.5 px-4 rounded-xl transition-all shadow-[0_4px_14px_rgba(79,70,229,0.3)] disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
                            >
                                <span>{isLoading ? '処理中...' : (isSignUpMode ? '登録する' : 'ログイン')}</span>
                                {isLoading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
                            </button>
                        </form>

                        <div className="text-center mt-6 text-sm text-slate-400">
                            <span>{isSignUpMode ? 'すでにアカウントをお持ちですか？' : 'アカウントをお持ちでないですか？'}</span>
                            <button
                                onClick={toggleMode}
                                className="text-indigo-300 font-medium ml-1.5 hover:text-white transition-colors outline-none"
                            >
                                {isSignUpMode ? 'ログイン' : '新規登録'}
                            </button>
                        </div>
                        {!isSignUpMode && (
                            <div className="text-center mt-3 text-sm">
                                <a href="/forgot-password" className="text-indigo-300 hover:text-white transition-colors">
                                    パスワードをお忘れですか？
                                </a>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
