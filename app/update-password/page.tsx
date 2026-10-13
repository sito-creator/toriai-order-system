"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function UpdatePasswordPage() {
    const router = useRouter();
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault();
        setLoading(true);
        const supabase = createClient();
        const { error } = await supabase.auth.updateUser({ password });
        if (error) {
            setMessage(error.message);
            setLoading(false);
            return;
        }
        setMessage("パスワードを更新しました。ログイン画面へ移動します。");
        setTimeout(() => router.push('/login'), 1200);
    }

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-950 flex items-center justify-center p-6">
            <form onSubmit={handleSubmit} className="w-full max-w-md p-10 bg-white/5 border border-white/10 rounded-3xl text-white">
                <h1 className="text-2xl font-bold mb-2">新しいパスワード</h1>
                <p className="text-slate-400 text-sm mb-6">6文字以上の新しいパスワードを入力してください。</p>
                <label className="block text-sm text-slate-300 mb-2" htmlFor="password">新しいパスワード</label>
                <input id="password" type="password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 mb-4 outline-none focus:border-indigo-500" />
                <button disabled={loading} className="w-full bg-indigo-600 rounded-xl py-3 font-semibold disabled:opacity-60">{loading ? "更新中..." : "パスワードを更新"}</button>
                {message && <p className="mt-4 text-sm text-slate-300">{message}</p>}
            </form>
        </main>
    );
}
