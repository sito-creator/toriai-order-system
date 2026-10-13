import { createClient } from '@/utils/supabase/server';

/**
 * 現在のログインユーザーの company_id を取得する
 * マルチテナント対応の全クエリで使用する
 */
export async function getCurrentCompanyId(): Promise<string> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('認証されていません');

    const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

    if (!profile?.company_id) throw new Error('会社に所属していません');
    return profile.company_id;
}

/**
 * 現在のログインユーザーの company_id と role を取得する
 */
export async function getCurrentCompanyContext(): Promise<{
    companyId: string;
    role: string;
    isFranchiseAdmin: boolean;
    isSystemAdmin: boolean;
}> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('認証されていません');

    const { data: profile } = await supabase
        .from('profiles')
        .select('company_id, role, is_franchise_admin, is_system_admin')
        .eq('id', user.id)
        .single();

    if (!profile?.company_id) throw new Error('会社に所属していません');
    
    return {
        companyId: profile.company_id,
        role: profile.role || 'member',
        isFranchiseAdmin: profile.is_franchise_admin || false,
        isSystemAdmin: profile.is_system_admin || false,
    };
}
