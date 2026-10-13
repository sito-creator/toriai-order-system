"use client";

import { useState, useEffect } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import StaffInviteForm from "./StaffInviteForm";
import { useParams } from "next/navigation";

export default function StaffInvitePage() {
    const params = useParams();
    const code = params.code as string;

    const [company, setCompany] = useState<{ id: string; name: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (!code) return;

        const fetchCompany = async () => {
            try {
                const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
                const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

                if (!supabaseUrl || !supabaseKey) {
                    setError(true);
                    setLoading(false);
                    return;
                }

                // staff_invite_code で会社を検索
                const url = `${supabaseUrl}/rest/v1/companies?staff_invite_code=eq.${encodeURIComponent(code)}&select=id,name&limit=1`;

                const res = await fetch(url, {
                    headers: {
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${supabaseKey}`,
                        'Accept': 'application/json',
                    },
                });

                if (!res.ok) {
                    setError(true);
                    setLoading(false);
                    return;
                }

                const data = await res.json();

                if (!data || data.length === 0) {
                    setError(true);
                } else {
                    setCompany({ id: data[0].id, name: data[0].name });
                }
            } catch {
                setError(true);
            } finally {
                setLoading(false);
            }
        };

        fetchCompany();
    }, [code]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-950 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 size={40} className="text-indigo-400 animate-spin" />
                    <p className="text-slate-400 text-sm">招待情報を読み込み中...</p>
                </div>
            </div>
        );
    }

    if (error || !company) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-950 flex items-center justify-center">
                <div className="w-full max-w-md p-10 bg-white/5 border border-white/10 rounded-[24px] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] backdrop-blur-xl text-center">
                    <div className="w-16 h-16 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-5">
                        <AlertCircle size={32} className="text-rose-400" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">無効な招待リンク</h2>
                    <p className="text-slate-400 text-sm mb-6">この招待リンクは有効ではありません。URLが正しいかご確認の上、管理者にお問い合わせください。</p>
                    <Link
                        href="/login"
                        className="inline-block px-6 py-3 bg-white/10 hover:bg-white/15 text-white rounded-xl font-semibold text-sm transition-all border border-white/10"
                    >
                        ログイン画面に戻る
                    </Link>
                </div>
            </div>
        );
    }

    return <StaffInviteForm company={company} code={code} />;
}
