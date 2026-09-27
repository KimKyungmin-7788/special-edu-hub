-- ============================================================
-- 33_practice_draft_usage.sql — 설계안 AI 초안 사용 기록(하루 사용 한도용) (PRD §13.4)
--
-- 서버 함수 /api/practice-draft 가 "그 교사의 로그인 토큰"으로 호출할 때마다 한 줄 기록하고,
-- 최근 24시간 기록 수로 한도를 판단한다. 사용자는 자기 기록을 넣고 읽기만 할 수 있다
-- (수정·삭제 정책 없음 → 기록을 지워 한도를 우회할 수 없음). 운영진은 전체 조회 가능.
--
-- 적용: Supabase 대시보드 > SQL Editor 에 붙여넣고 실행. 재실행 안전.
-- ============================================================

create table if not exists public.practice_draft_usage (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists practice_draft_usage_user_idx
  on public.practice_draft_usage (user_id, created_at desc);

alter table public.practice_draft_usage enable row level security;

-- 기록: 인증교사가 본인 명의로만
drop policy if exists "draft_usage_insert_own" on public.practice_draft_usage;
create policy "draft_usage_insert_own" on public.practice_draft_usage
  for insert to authenticated
  with check (user_id = auth.uid() and public.is_verified_teacher());

-- 조회: 본인 또는 운영진
drop policy if exists "draft_usage_select_own" on public.practice_draft_usage;
create policy "draft_usage_select_own" on public.practice_draft_usage
  for select to authenticated
  using (user_id = auth.uid() or public.is_staff());

revoke update, delete on public.practice_draft_usage from anon, authenticated;
