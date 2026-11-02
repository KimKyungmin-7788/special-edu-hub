-- ============================================================
-- 52_account_delete_school.sql — 회원 탈퇴 + 소속 학교(운영진만 보기)
--
-- 설계 요약
--  1. member_schools: 회원의 소속 학교 한 줄. 본인과 운영진(is_staff)만 읽는다.
--     profiles 는 누구나 읽는 표라 학교를 거기 두지 않고 따로 둔다.
--     새 가입자·기존 회원 모두 로그인 뒤 학교를 묻는 창에서 넣는다(구글 가입도 같은 길).
--  2. delete_my_account(): 본인 탈퇴. 올린 글을 모두 지운 뒤 계정을 지운다.
--     - 게시판 글(posts)은 작성자 삭제 규칙이 없어(42) 먼저 지운다. 댓글·좋아요는 함께 지워진다.
--     - 자료(apps)는 작성자가 사라지면 남는 규칙(12)이라 먼저 지운다.
--     - 수업실천사례·댓글·쪽지·좋아요·알림·인증 신청 등은 계정을 지우면 함께 지워진다(on delete cascade).
--     - 운영진으로 처리한 기록(인증 심사·신고·문의 처리자)은 처리자 칸만 비운다.
--     - 관리자(admin)는 탈퇴할 수 없다(관리자가 사라지는 일을 막기 위해 먼저 권한을 넘긴다).
--     ※ 저장소 파일은 SQL 로 지울 수 없어 화면이 탈퇴 전에 본인 폴더 파일을 먼저 지운다.
--
-- 선행: 15(is_staff), 42. 적용: SQL Editor 에 붙여넣고 실행. 재실행 안전.
-- ============================================================
begin;

-- ── 1. 소속 학교 ─────────────────────────────────────────
create table if not exists public.member_schools (
  user_id    uuid        primary key references auth.users (id) on delete cascade,
  school     text        not null check (char_length(btrim(school)) between 2 and 60),
  updated_at timestamptz not null default now()
);
alter table public.member_schools enable row level security;

drop policy if exists "member_schools_read" on public.member_schools;
create policy "member_schools_read" on public.member_schools
  for select to authenticated
  using (user_id = auth.uid() or public.is_staff());

drop policy if exists "member_schools_insert_own" on public.member_schools;
create policy "member_schools_insert_own" on public.member_schools
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "member_schools_update_own" on public.member_schools;
create policy "member_schools_update_own" on public.member_schools
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

revoke all on public.member_schools from anon;
grant select, insert, update on public.member_schools to authenticated;

-- ── 2. 탈퇴 ──────────────────────────────────────────────
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception '로그인이 필요합니다.'; end if;
  if exists (select 1 from public.profiles where id = v_uid and role = 'admin') then
    raise exception '관리자는 탈퇴하기 전에 다른 회원에게 관리자 권한을 넘겨 주세요.';
  end if;

  update public.verification_requests set reviewed_by = null where reviewed_by = v_uid;
  update public.reports set handled_by = null where handled_by = v_uid;
  update public.inquiries set handled_by = null where handled_by = v_uid;

  delete from public.posts where author_id = v_uid;
  delete from public.apps where owner_id = v_uid;

  -- profiles 와 나머지 기록은 on delete cascade 로 함께 지워진다
  delete from auth.users where id = v_uid;
end $$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

commit;

-- 확인(선택): 아래가 두 줄이면 적용된 것
-- select 'member_schools' from information_schema.tables where table_name = 'member_schools'
-- union all select proname from pg_proc where proname = 'delete_my_account';
