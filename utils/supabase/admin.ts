import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Service Role Key を使用した管理者用Supabaseクライアント
 * RLSをバイパスして管理操作（プロフィール削除等）を実行可能
 * サーバーサイドのみで使用すること（クライアントサイドでは絶対に使わない）
 */
export function createAdminClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    if (!serviceRoleKey) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
    }

    return createSupabaseClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    })
}
