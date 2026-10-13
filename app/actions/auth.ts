'use server';

import { createClient } from '@/utils/supabase/server';

/**
 * 現在のログインユーザーの権限情報を取得（サイドバー表示制御用）
 */
export async function getUserPermissions() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { role: 'customer', displayName: null };

        const { data: profile } = await supabase
            .from('profiles')
            .select('role, display_name, is_system_admin, is_franchise_admin')
            .eq('id', user.id)
            .single();

        if (!profile) return { role: 'customer', displayName: null };

        // 実効ロールを判定
        let effectiveRole = profile.role || 'customer';
        if (profile.is_system_admin) effectiveRole = 'system_admin';
        else if (profile.is_franchise_admin) effectiveRole = 'franchise_admin';

        return {
            role: effectiveRole,
            displayName: profile.display_name,
        };
    } catch {
        return { role: 'customer', displayName: null };
    }
}
