"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault();
        setLoading(true);
        const supabase = createClient();
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
        });
        setMessage(error ? error.message : "パスワード再設定メールを送信しました。");
        setLoading(false);
    }

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-950 flex items-center justify-center p-6">
            <form onSubmit={handleSubmit} className="w-full max-w-md p-10 bg-white/5 border border-white/10 rounded-3xl text-white">
                <h1 className="text-2xl font-bold mb-2">パスワードを再設定</h1>
                <p className="text-slate-400 text-sm mb-6">登録済みのメールアドレスに再設定リンクを送ります。</p>
                <label className="block text-sm text-slate-300 mb-2" htmlFor="email">メールアドレス</label>
                <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 mb-4 outline-none focus:border-indigo-500" />
                <button disabled={loading} className="w-full bg-indigo-600 rounded-xl py-3 font-semibold disabled:opacity-60">{loading ? "送信中..." : "再設定メールを送信"}</button>
                {message && <p className="mt-4 text-sm text-slate-300">{message}</p>}
                <a href="/login" className="block text-center mt-6 text-sm text-indigo-300">ログインへ戻る</a>
            </form>
        </main>
    );
}
