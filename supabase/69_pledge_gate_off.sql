-- ============================================================
-- 69_pledge_gate_off.sql — 서약 동의 없이도 자료 등록 허용 (임시, 2026-11-11)
--
-- 로그인 뒤 동의 창(편지)의 문구를 더 다듬는 동안 창을 꺼 둔다(src/config/consents.ts 의
-- CONSENT_DIALOG_ENABLED = false). 창이 없으면 기존 회원은 서약에 동의할 방법이 없으므로,
-- "서약에 동의한 계정만 자료 등록"(66 의 apps_insert_requires_pledge) 조건을 잠시 푼다.
-- 교사 인증 조건(12·15)은 그대로다. 동의 기록·문서(66·68)는 건드리지 않는다.
--
-- 되돌리기(동의 창을 다시 켤 때 실행):
--   create policy "apps_insert_requires_pledge" on public.apps
--     as restrictive for insert to authenticated
--     with check (public.has_current_consent('upload_pledge'));
--
-- 적용: Supabase 대시보드 > SQL Editor 에 붙여넣고 실행. 재실행 안전(idempotent).
-- ============================================================

drop policy if exists "apps_insert_requires_pledge" on public.apps;

-- ── 적용 확인 ────────────────────────────────────────────
-- select polname from pg_policy where polrelid = 'public.apps'::regclass and polcmd = 'a';
--   → apps_insert_requires_pledge 가 없고 apps_insert_verified_owner 만 남아 있으면 적용됨
