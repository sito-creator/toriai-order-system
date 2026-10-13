-- ============================================================
-- 菊池社長のロールを owner に修正
-- スタッフ招待URLで最初に登録した人が member になっている問題を修正
-- ============================================================

-- 菊池社長のメールアドレスで検索してroleをownerに変更
UPDATE public.profiles
SET role = 'owner'
WHERE email = '20200721.momo@gmail.com'
  AND role = 'member';

-- 確認: 修正後の状態を表示
SELECT id, display_name, email, role, company_id
FROM public.profiles
WHERE email = '20200721.momo@gmail.com';
