'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * 現在のユーザーの管理レベルを取得
 * system_admin > franchise_admin > owner > admin > member
 */
async function getAdminContext() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('認証されていません');

    const { data: profile } = await supabase
        .from('profiles')
        .select('company_id, role, is_franchise_admin, is_system_admin')
        .eq('id', user.id)
        .single();

    if (!profile?.company_id) throw new Error('会社に所属していません');

    // 自分の会社の franchise_id を取得
    const { data: company } = await supabase
        .from('companies')
        .select('id, franchise_id, franchise_role')
        .eq('id', profile.company_id)
        .single();

    return {
        supabase,
        userId: user.id,
        companyId: profile.company_id,
        franchiseId: company?.franchise_id || null,
        franchiseRole: company?.franchise_role || null,
        role: profile.role,
        isSystemAdmin: profile.is_system_admin || false,
        isFranchiseAdmin: profile.is_franchise_admin || false,
    };
}

/**
 * テナント情報を取得
 * - システム管理者: 全FC + 全会社一覧
 * - FC管理者: 自分のFC配下の会社一覧
 * - 通常ユーザー: 自社のみ
 */
export async function getTenants() {
    const ctx = await getAdminContext();
    const { supabase } = ctx;

    // ===== システム管理者（MoMo）: 全体を俯瞰 =====
    if (ctx.isSystemAdmin) {
        // RLSをバイパスして全会社一覧を取得
        const { createAdminClient } = await import('@/utils/supabase/admin');
        const adminSupabase = createAdminClient();

        const _debug: string[] = [];
        _debug.push(`myCompanyId=${ctx.companyId}`);

        // フル項目でクエリ（新カラム含む）
        let { data: companies, error: err1 } = await adminSupabase
            .from('companies')
            .select(`
                id, name, is_active, created_at, franchise_id, franchise_role, invite_code, staff_invite_code, company_type, parent_company_id,
                profiles ( id, display_name, email, role )
            `)
            .order('created_at', { ascending: true });

        _debug.push(`q1: count=${companies?.length ?? 'null'}, err=${err1?.message ?? 'none'}`);

        // 新カラム(company_type/parent_company_id)がない場合にフォールバック
        if (err1) {
            const { data: c2, error: err2 } = await adminSupabase
                .from('companies')
                .select(`
                    id, name, is_active, created_at, franchise_id, franchise_role, invite_code, staff_invite_code,
                    profiles ( id, display_name, email, role )
                `)
                .order('created_at', { ascending: true });

            _debug.push(`q2: count=${c2?.length ?? 'null'}, err=${err2?.message ?? 'none'}`);

            if (err2) {
                const { data: c3, error: err3 } = await adminSupabase
                    .from('companies')
                    .select('id, name, is_active, created_at, franchise_id, franchise_role, invite_code, staff_invite_code')
                    .order('created_at', { ascending: true });

                _debug.push(`q3: count=${c3?.length ?? 'null'}, err=${err3?.message ?? 'none'}`);

                companies = (c3 || []).map(c => ({
                    ...c,
                    company_type: null,
                    parent_company_id: null,
                    profiles: [],
                }));
            } else {
                companies = (c2 || []).map(c => ({
                    ...c,
                    company_type: null,
                    parent_company_id: null,
                }));
            }
        }

        // 自社（MoMoの会社）は一覧から除外
        const filtered = (companies || []).filter((c: any) => c.id !== ctx.companyId);
        _debug.push(`total=${(companies || []).length}, afterFilter=${filtered.length}`);

        return {
            level: 'system_admin' as const,
            tenants: filtered,
            franchiseId: null,
            isFC: false,
            _debug: _debug.join(' | '),
        };
    }

    // ===== FC管理者: 自社に紐づくお客様を取得 =====
    if (ctx.isFranchiseAdmin || ctx.role === 'owner') {
        const { createAdminClient } = await import('@/utils/supabase/admin');
        const adminSupabase = createAdminClient();

        // 方法1: parent_company_id が自社のお客様を取得
        const { data: customers, error: err1 } = await adminSupabase
            .from('companies')
            .select(`
                id, name, is_active, created_at, franchise_id, franchise_role, invite_code, staff_invite_code, company_type, parent_company_id,
                profiles ( id, display_name, email, role )
            `)
            .eq('parent_company_id', ctx.companyId)
            .order('created_at', { ascending: true });

        // 方法2: 同じfranchise_idの会社も取得（フォールバック）
        let allTenants = customers || [];
        if (ctx.franchiseId) {
            const { data: fcMembers } = await adminSupabase
                .from('companies')
                .select(`
                    id, name, is_active, created_at, franchise_id, franchise_role, invite_code, staff_invite_code, company_type, parent_company_id,
                    profiles ( id, display_name, email, role )
                `)
                .eq('franchise_id', ctx.franchiseId)
                .eq('company_type', 'customer')
                .order('created_at', { ascending: true });

            // 重複を除いてマージ
            const existingIds = new Set(allTenants.map(t => t.id));
            (fcMembers || []).forEach(m => {
                if (!existingIds.has(m.id)) allTenants.push(m);
            });
        }

        return {
            level: 'franchise_admin' as const,
            tenants: allTenants,
            franchiseId: ctx.franchiseId,
            isFC: true,
        };
    }

    // ===== 通常ユーザー（owner含む）: 自社のみ =====
    const { data } = await supabase
        .from('companies')
        .select(`
            id, name, is_active, created_at, franchise_id, franchise_role, invite_code, staff_invite_code, company_type, parent_company_id,
            profiles ( id, display_name, email, role )
        `)
        .eq('id', ctx.companyId)
        .single();

    return {
        level: 'normal' as const,
        tenants: data ? [data] : [],
        franchiseId: ctx.franchiseId,
        isFC: !!ctx.franchiseId,
    };
}

/**
 * 新しいFC先を追加 — システム管理者専用
 */
export async function createTenant(formData: {
    name: string;
    ownerEmail: string;
    ownerName: string;
}) {
    const ctx = await getAdminContext();

    if (!ctx.isSystemAdmin) {
        throw new Error('FC先追加はシステム管理者のみ実行できます');
    }

    // RLSをバイパスして他社のレコードを作成
    const { createAdminClient } = await import('@/utils/supabase/admin');
    const adminSupabase = createAdminClient();

    // 1. 新しい会社を作成（company_type = 'tenant' = FC先）
    const { data: newCompany, error: companyError } = await adminSupabase
        .from('companies')
        .insert({
            name: formData.name,
            company_type: 'tenant',
            is_active: true,
        })
        .select()
        .single();

    if (companyError) throw new Error('FC先の作成に失敗: ' + companyError.message);

    // 2. 招待レコードを作成
    if (formData.ownerEmail) {
        await adminSupabase
            .from('invitations')
            .insert({
                company_id: newCompany.id,
                email: formData.ownerEmail,
                role: 'owner',
                status: 'pending',
            });
    }

    // 3. invite_code と staff_invite_code を生成
    const inviteCode = crypto.randomUUID().replace(/-/g, '').substring(0, 12);
    const staffInviteCode = crypto.randomUUID().replace(/-/g, '').substring(0, 12);
    await adminSupabase
        .from('companies')
        .update({ invite_code: inviteCode, staff_invite_code: staffInviteCode })
        .eq('id', newCompany.id);

    revalidatePath('/tenants');
    return { company: newCompany, inviteCode };
}

/**
 * テナントの有効/無効を切り替え
 */
export async function toggleTenantStatus(tenantId: string, isActive: boolean) {
    const ctx = await getAdminContext();

    if (!ctx.isSystemAdmin) {
        throw new Error('この操作はシステム管理者のみ実行できます');
    }

    const { createAdminClient } = await import('@/utils/supabase/admin');
    const adminSupabase = createAdminClient();

    const { error } = await adminSupabase
        .from('companies')
        .update({ is_active: isActive })
        .eq('id', tenantId);

    if (error) throw new Error('ステータス変更に失敗: ' + error.message);

    revalidatePath('/tenants');
    return { success: true };
}

/**
 * テナント（FC先 or お客様）を削除 — システム管理者専用
 * 紐づくプロファイル、招待、子会社（お客様）も削除
 */
export async function deleteTenant(tenantId: string) {
    const ctx = await getAdminContext();

    if (!ctx.isSystemAdmin) {
        throw new Error('この操作はシステム管理者のみ実行できます');
    }

    if (tenantId === ctx.companyId) {
        throw new Error('自社は削除できません');
    }

    const { createAdminClient } = await import('@/utils/supabase/admin');
    const adminSupabase = createAdminClient();

    // === 循環参照の解決: companies ↔ franchises ===
    // まず対象会社の franchise_id を取得
    const { data: targetCompany } = await adminSupabase
        .from('companies')
        .select('id, franchise_id')
        .eq('id', tenantId)
        .single();

    const franchiseId = targetCompany?.franchise_id;

    // 1. 紐づくお客様会社を処理
    const { data: childCompanies } = await adminSupabase
        .from('companies')
        .select('id, franchise_id')
        .eq('parent_company_id', tenantId);

    if (childCompanies && childCompanies.length > 0) {
        const childIds = childCompanies.map(c => c.id);
        await adminSupabase.from('profiles').delete().in('company_id', childIds);
        // 子会社の franchise_id 参照を解除してから削除
        await adminSupabase.from('companies').update({ franchise_id: null }).in('id', childIds);
        await adminSupabase.from('franchises').delete().in('owner_company_id', childIds);
        await adminSupabase.from('companies').delete().in('id', childIds);
    }

    // 2. プロファイルを削除
    await adminSupabase.from('profiles').delete().eq('company_id', tenantId);

    // 3. 招待レコードを削除
    await adminSupabase.from('company_invitations').delete().eq('company_id', tenantId);

    // 4. franchise_membersを削除
    await adminSupabase.from('franchise_members').delete().eq('company_id', tenantId);

    // 5. ★ 循環参照の解決 ★
    // (a) 対象会社の franchise_id を null にする（companies → franchises の参照を切る）
    await adminSupabase.from('companies').update({ franchise_id: null }).eq('id', tenantId);

    // (b) 同じfranchiseを参照している他の会社の franchise_id も null にする
    if (franchiseId) {
        await adminSupabase.from('companies').update({ franchise_id: null }).eq('franchise_id', franchiseId);
    }

    // 6. franchisesレコードを削除（もう参照がないので安全）
    await adminSupabase.from('franchises').delete().eq('owner_company_id', tenantId);
    if (franchiseId) {
        await adminSupabase.from('franchises').delete().eq('id', franchiseId);
    }

    // 7. 会社本体を削除
    const { error } = await adminSupabase
        .from('companies')
        .delete()
        .eq('id', tenantId);

    if (error) {
        throw new Error('削除に失敗: ' + error.message);
    }

    revalidatePath('/tenants');
    return { success: true };
}

/**
 * テナントの詳細情報を取得
 */
export async function getTenantDetail(tenantId: string) {
    const ctx = await getAdminContext();

    if (!ctx.isSystemAdmin && !ctx.isFranchiseAdmin && ctx.role !== 'owner') {
        throw new Error('この操作の権限がありません');
    }

    // Service Role Key を使用してRLSをバイパス
    const { createAdminClient } = await import('@/utils/supabase/admin');
    const adminSupabase = createAdminClient();

    // 新カラム含むクエリ
    let { data: tenant, error: tErr } = await adminSupabase
        .from('companies')
        .select('id, name, franchise_id, franchise_role, is_active, created_at, invite_code, staff_invite_code, company_type, parent_company_id')
        .eq('id', tenantId)
        .single();

    // 新カラムが存在しない場合のフォールバック
    if (tErr) {
        const { data: t2 } = await adminSupabase
            .from('companies')
            .select('id, name, franchise_id, franchise_role, is_active, created_at, invite_code, staff_invite_code')
            .eq('id', tenantId)
            .single();
        tenant = t2 ? { ...t2, company_type: null, parent_company_id: null } : null;
    }

    if (!tenant) throw new Error('テナントが見つかりません');

    // メンバー一覧
    const { data: members } = await adminSupabase
        .from('profiles')
        .select('id, display_name, email, role')
        .eq('company_id', tenantId);

    // データ件数集計（テーブルが存在しない場合もエラーにならないよう個別try）
    let ordersCount = 0, customersCount = 0, invoicesCount = 0, quotesCount = 0;
    try {
        const [orders, customers, invoices, quotes] = await Promise.all([
            adminSupabase.from('orders').select('id', { count: 'exact', head: true }).eq('company_id', tenantId),
            adminSupabase.from('customers').select('id', { count: 'exact', head: true }).eq('company_id', tenantId),
            adminSupabase.from('invoices').select('id', { count: 'exact', head: true }).eq('company_id', tenantId),
            adminSupabase.from('quotes').select('id', { count: 'exact', head: true }).eq('company_id', tenantId),
        ]);
        ordersCount = orders.count || 0;
        customersCount = customers.count || 0;
        invoicesCount = invoices.count || 0;
        quotesCount = quotes.count || 0;
    } catch {}

    return {
        tenant,
        members: members || [],
        stats: {
            orders: ordersCount,
            customers: customersCount,
            invoices: invoicesCount,
            quotes: quotesCount,
        }
    };
}

/**
 * お客様会社を作成してURL発行（テナント追加と同じ流れだが company_type = 'customer'）
 */
export async function createCustomerCompany(formData: {
    name: string;
    parentCompanyId: string; // 必須: 紐づくFC先のcompany_id
}) {
    const ctx = await getAdminContext();

    if (!ctx.isSystemAdmin && !ctx.isFranchiseAdmin) {
        throw new Error('お客様追加の権限がありません');
    }

    if (!formData.parentCompanyId) {
        throw new Error('紐づくFC先を選択してください');
    }

    const { createAdminClient } = await import('@/utils/supabase/admin');
    const adminSupabase = createAdminClient();

    // FC先のfranchise_idを取得してお客様にも同じfranchise_idを設定
    const { data: parentCompany } = await adminSupabase
        .from('companies')
        .select('id, franchise_id')
        .eq('id', formData.parentCompanyId)
        .single();

    if (!parentCompany) throw new Error('指定されたFC先が見つかりません');

    // 1. 新しい会社を作成（company_type = 'customer', parent_company_id = FC先）
    const { data: newCompany, error: companyError } = await adminSupabase
        .from('companies')
        .insert({
            name: formData.name,
            franchise_id: parentCompany.franchise_id,
            franchise_role: 'member',
            company_type: 'customer',
            parent_company_id: formData.parentCompanyId,
            is_active: true,
        })
        .select()
        .single();

    if (companyError) throw new Error('お客様会社の作成に失敗: ' + companyError.message);

    // 2. invite_code と staff_invite_code を生成
    const inviteCode = crypto.randomUUID().replace(/-/g, '').substring(0, 12);
    const staffInviteCode = crypto.randomUUID().replace(/-/g, '').substring(0, 12);
    await adminSupabase
        .from('companies')
        .update({ invite_code: inviteCode, staff_invite_code: staffInviteCode })
        .eq('id', newCompany.id);

    revalidatePath('/tenants');
    return { company: newCompany, inviteCode };
}

