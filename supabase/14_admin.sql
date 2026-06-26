-- ============================================================
-- 14_admin.sql — 관리자 운영 페이지(/admin) 권한 (범위 a)
--
-- 운영 두 축 중 "교사인증 심사"에 필요한 권한만 추가한다.
--  - 앱 관리(전체 앱 조회·숨김 토글)는 12_apps_owner.sql 의 RLS 에 is_admin()
--    이 이미 포함돼 있어 SQL 불필요(클라 admin 이 그대로 동작).
--  - 09_verification.sql 에는 verification_requests 의 UPDATE 정책이 없어
--    클라이언트 admin 이 승인/반려를 못 한다(지금까지는 Studio service_role 로만).
--    또 verification-docs 버킷은 "본인 폴더만 read" 라 admin 이 서류를 못 본다.
--    → 이 두 가지(심사 UPDATE · 서류 SELECT)만 admin 정책으로 연다.
--
-- 09 의 is_admin()(security definer, profiles.role='admin') 을 재사용한다.
-- 처리 완료 시 서류 자동삭제(Edge Function)는 후속 — 이번엔 보류.
--
-- 적용: Supabase 대시보드 > SQL Editor 에 붙여넣고 실행. 재실행 안전(idempotent).
-- ============================================================

-- ── 1) verification_requests: 관리자 UPDATE (승인/반려) ────
-- 09 는 insert(본인)·select(본인+admin) 만 두고 update 정책이 없었다.
-- 정책이 없으면 RLS 가 모든 update 를 막으므로 클라 admin 도 심사 불가였다.
-- 관리자는 어느 행이든 status·reject_reason·reviewed_by·reviewed_at 을 갱신할 수 있다.
-- (승인 시 09 의 trg_verif_approved 가 profiles.is_teacher_verified 를 자동 반영.)
--
-- 참고: 09 는 verification_requests 에 컬럼단위 GRANT 잠금을 걸지 않았다.
--   Supabase 기본 권한으로 authenticated 에 테이블 UPDATE 권한이 있으므로
--   정책만 추가하면 admin 의 update 가 통과한다(아래 확인 쿼리로 점검 가능).
drop policy if exists "verif_update_admin" on public.verification_requests;
create policy "verif_update_admin" on public.verification_requests
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ── 2) storage verification-docs: 관리자 SELECT (서류 열람) ─
-- 09 는 본인 폴더(<uid>/...)만 read 허용 → admin 이 남의 서류를 못 봤다.
-- 관리자는 이 버킷의 모든 객체를 SELECT(=서명 URL 발급) 할 수 있다.
drop policy if exists "verif_docs_read_admin" on storage.objects;
create policy "verif_docs_read_admin" on storage.objects
  for select to authenticated
  using (bucket_id = 'verification-docs' and public.is_admin());

-- ── (선택) 컬럼단위 GRANT 잠금 점검 ───────────────────────
-- verification_requests 에 컬럼 GRANT 잠금이 없는지 확인하고 싶으면 아래 실행:
--   select grantee, privilege_type, column_name
--   from information_schema.column_privileges
--   where table_schema='public' and table_name='verification_requests'
--     and grantee in ('authenticated','anon');
-- 컬럼별 UPDATE 가 따로 안 잡혀 있으면(테이블 GRANT 만 있으면) 위 정책으로 충분하다.
