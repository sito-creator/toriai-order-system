'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

// 現在のログインユーザーの所属会社情報を取得
export async function getCurrentCompanyInfo() {
    const supabase = await createClient();
    
    // 1. ログインユーザー情報を取得
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        throw new Error('認証されていません');
    }

    // 2. 所属している会社を取得
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id, role, companies (*)')
        .eq('id', user.id)
        .single();

    if (profileError || !profile) {
        return { 
            error: `プロフィールエラー詳細: ${profileError ? JSON.stringify(profileError) : 'データ無し'}` 
        };
    }

    return {
        company: profile.companies,
        myRole: profile.role,
        myProfileId: user.id,
        error: null
    };
}

// 同じ会社に所属する全メンバーを取得
export async function getCompanyMembers(companyId: string) {
    const supabase = await createClient();
    
    const { data: members, error } = await supabase
        .from('profiles')
        .select('id, display_name, email, role, created_at')
        .eq('company_id', companyId)
        .neq('role', 'customer')
        .order('created_at', { ascending: true });

    if (error) {
        throw new Error('メンバーの取得に失敗しました');
    }

    return members;
}

// 会社情報の更新（会社名のみ）
export async function updateCompanyInfo(companyId: string, name: string) {
    const supabase = await createClient();
    
    const { error } = await supabase
        .from('companies')
        .update({ name })
        .eq('id', companyId);

    if (error) {
        throw new Error('会社情報の更新に失敗しました: ' + error.message);
    }
    
    revalidatePath('/settings');
}

// メンバーの権限更新
export async function updateMemberRole(profileId: string, role: string) {
    const supabase = await createClient();
    
    // role validation
    if (!['owner', 'admin', 'member'].includes(role)) {
        throw new Error('不正な権限です');
    }

    const { error } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', profileId);

    if (error) {
        throw new Error('権限の更新に失敗しました');
    }
    
    revalidatePath('/settings');
}

// メンバーを削除（profilesから削除）
// ※RLSをバイパスするためservice role keyを使用
export async function removeMember(profileId: string) {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('認証されていません');
    
    // 自分自身は削除できない
    if (profileId === user.id) {
        throw new Error('自分自身を削除することはできません');
    }
    
    // 自分が同じ会社のowner/adminかチェック
    const { data: myProfile } = await supabase
        .from('profiles')
        .select('role, company_id')
        .eq('id', user.id)
        .single();
    
    if (!myProfile) throw new Error('権限がありません');
    if (myProfile.role !== 'owner' && myProfile.role !== 'admin') {
        throw new Error('管理権限が必要です');
    }

    // Service Role Key を使用してRLSをバイパス
    const { createAdminClient } = await import('@/utils/supabase/admin');
    const adminSupabase = createAdminClient();
    
    // 対象のプロフィールを取得
    const { data: target } = await adminSupabase
        .from('profiles')
        .select('role, company_id')
        .eq('id', profileId)
        .single();
    
    if (!target) throw new Error('対象のメンバーが見つかりません');
    
    // ownerは削除できない
    if (target.role === 'owner') {
        throw new Error('オーナーを削除することはできません');
    }
    
    if (myProfile.company_id !== target.company_id) {
        throw new Error('権限がありません');
    }
    
    const { error } = await adminSupabase
        .from('profiles')
        .delete()
        .eq('id', profileId);
    
    if (error) throw new Error('メンバーの削除に失敗しました: ' + error.message);
    
    revalidatePath('/settings');
}

// 会社への招待一覧を取得
export async function getCompanyInvitations(companyId: string) {
    const supabase = await createClient();
    
    const { data: invitations, error } = await supabase
        .from('company_invitations')
        .select('id, email, role, created_at')
        .eq('company_id', companyId)
        .order('created_at', { ascending: true });

    if (error) {
        // テーブルが存在しない（マイグレーション前）などの場合は空配列を返すなど安全の対応
        console.error('Failed to load invitations:', error);
        return [];
    }

    return invitations || [];
}

// メンバーの招待を発行
export async function inviteUserToCompany(companyId: string, email: string, role: string) {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('認証されていません');

    // Email validation
    if (!email || !email.includes('@')) {
        throw new Error('有効なメールアドレスを入力してください');
    }

    // Role validation
    if (!['admin', 'member'].includes(role)) {
        throw new Error('不正な権限です');
    }

    const { error } = await supabase
        .from('company_invitations')
        .insert({
            company_id: companyId,
            email: email.trim(),
            role,
            created_by: user.id
        });

    if (error) {
        if (error.code === '23505') { // Unique constraint violation
            throw new Error('このメールアドレスは既に招待済みです');
        }
        throw new Error('招待の送信に失敗しました: ' + error.message);
    }
    
    revalidatePath('/settings');
}

// 招待のキャンセル
export async function cancelInvitation(invitationId: string) {
    const supabase = await createClient();
    
    const { error } = await supabase
        .from('company_invitations')
        .delete()
        .eq('id', invitationId);

    if (error) {
        throw new Error('招待の取り消しに失敗しました');
    }
    
    revalidatePath('/settings');
}

// 会社設定の取得（デザイン等）
export async function getCompanySettings(companyId: string) {
    const supabase = await createClient();
    const { data: settings, error } = await supabase
        .from('company_settings')
        .select('*')
        .eq('company_id', companyId)
        .single();
    
    // まだレコードがない場合はデフォルト値を使うために null エラーは無視
    if (error && error.code !== 'PGRST116') {
        console.error('Failed to load company settings:', error);
    }
    return settings || { theme_color: '#4f46e5', layout_type: 'modern' };
}

// 会社設定の更新
export async function updateCompanySettings(companyId: string, payload: any) {
    const supabase = await createClient();
    
    // upsert (なければ作成、あれば更新)
    const { error } = await supabase
        .from('company_settings')
        .upsert({ 
            company_id: companyId,
            ...payload 
        });

    if (error) throw new Error('会社設定の更新に失敗しました: ' + error.message);
    revalidatePath('/settings');
}

// 税率マスタ一覧取得
export async function getTaxRates(companyId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('tax_rates')
        .select('*')
        .eq('company_id', companyId)
        .order('rate', { ascending: false });

    if (error) console.error('Failed to load tax rates:', error);
    return data || [];
}

export async function saveTaxRate(companyId: string, taxRate: any) {
    const supabase = await createClient();
    if (taxRate.is_default) {
        // 同じ会社の既存のデフォルトをfalseにする
        await supabase.from('tax_rates').update({ is_default: false }).eq('company_id', companyId);
    }
    const { error } = await supabase.from('tax_rates').upsert({ company_id: companyId, ...taxRate });
    if (error) throw new Error(error.message);
}

export async function deleteTaxRate(id: string) {
    const supabase = await createClient();
    await supabase.from('tax_rates').delete().eq('id', id);
}

// 振込先口座マスタ一覧取得
export async function getBankAccounts(companyId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: true });

    if (error) console.error('Failed to load bank accounts:', error);
    return data || [];
}

export async function saveBankAccount(companyId: string, account: any) {
    const supabase = await createClient();
    if (account.is_default) {
        await supabase.from('bank_accounts').update({ is_default: false }).eq('company_id', companyId);
    }
    const { error } = await supabase.from('bank_accounts').upsert({ company_id: companyId, ...account });
    if (error) throw new Error(error.message);
}

export async function deleteBankAccount(id: string) {
    const supabase = await createClient();
    await supabase.from('bank_accounts').delete().eq('id', id);
}

// 会社の招待コードを取得
export async function getCompanyInviteCode(companyId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('companies')
        .select('invite_code, staff_invite_code')
        .eq('id', companyId)
        .single();
    
    if (error) throw new Error('招待コードの取得に失敗しました');
    return {
        inviteCode: data?.invite_code || null,
        staffInviteCode: data?.staff_invite_code || null,
    };
}

// 招待コードを再生成（スタッフ用とお客様用の両方）
export async function regenerateInviteCode(companyId: string, type: 'staff' | 'customer' = 'staff') {
    const supabase = await createClient();
    
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    for (let i = 0; i < 16; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    const field = type === 'staff' ? 'staff_invite_code' : 'invite_code';
    const { error } = await supabase
        .from('companies')
        .update({ [field]: code })
        .eq('id', companyId);
    
    if (error) throw new Error('招待コードの再生成に失敗しました: ' + error.message);
    
    return code;
}

// 招待コードから会社情報を取得（未認証ユーザー向け）
export async function getCompanyByInviteCode(inviteCode: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('companies')
        .select('id, name')
        .eq('invite_code', inviteCode)
        .single();
    
    if (error || !data) {
        return null;
    }
    return data;
}

// ストレージへの画像アップロード
export async function uploadCompanyAsset(companyId: string, formData: FormData) {
    const supabase = await createClient();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string; // 'logo' or 'stamp'
    
    if (!file) throw new Error("No file uploaded");

    // ユニークなファイル名を生成 (キャッシュ対策)
    const fileExt = file.name.split('.').pop();
    const fileName = `${companyId}/${type}_${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
        .from('company_assets')
        .upload(fileName, file, {
            cacheControl: '3600',
            upsert: true
        });

    if (error) {
        throw new Error(error.message);
    }

    // パブリックURLを取得
    const { data: { publicUrl } } = supabase.storage
        .from('company_assets')
        .getPublicUrl(fileName);

    return publicUrl;
}
