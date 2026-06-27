-- ============================================================
-- 16_blocks.sql — 차단(block) : 테이블 + RLS + 쪽지 발신 차단 (묶음 R-1)
--
-- 설계 요약 (신고/차단 — 공개 확대 전 안전 전제)
--  - 차단 = 사용자가 스스로 막는 도구. 신고(reports)는 별도(17_reports.sql).
--  - MVP 범위: 쪽지 발신 차단. 차단당하면 그 사람에게 쪽지를 못 보낸다.
--  - 차단 방향 = 양방향: A 가 B 를 차단하면 B→A 발신 거부 + A→B 발신도 막는다
--    (차단한 상대에게 굳이 보내지 않음). 단순하고 안전하다.
--  - 차단 목록은 본인(blocker)만 관리·조회. 권한은 RLS 가 강제(UI 아님).
--
-- 적용: Supabase 대시보드 > SQL Editor 에 붙여넣고 실행. 재실행 안전(idempotent).
-- 선행: 08_messages.sql(messages 테이블·정책)이 이미 적용돼 있어야 한다
--       (이 파일이 messages 의 발신 정책을 차단 검사 포함으로 교체한다).
-- ============================================================

-- ── 테이블 ────────────────────────────────────────────────
-- 복합 PK 가 곧 unique → 같은 사람 중복 차단 불가.
create table if not exists public.blocks (
  blocker_id uuid        not null references public.profiles (id) on delete cascade,
  blocked_id uuid        not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint blocks_no_self check (blocker_id <> blocked_id)
);

-- 내 차단 목록(blocker 기준) 최신순 조회용.
create index if not exists blocks_blocker_idx on public.blocks (blocker_id, created_at desc);
-- is_blocked 의 역방향(blocked 기준) 조회 가속.
create index if not exists blocks_blocked_idx on public.blocks (blocked_id);

-- ── RLS ──────────────────────────────────────────────────
alter table public.blocks enable row level security;

-- 조회: 내가 차단한 목록만(내가 blocker). 남이 나를 차단했는지는 안 보인다.
drop policy if exists "blocks_select_own" on public.blocks;
create policy "blocks_select_own"
  on public.blocks
  for select
  to authenticated
  using (auth.uid() = blocker_id);

-- 차단 추가: 내가 blocker 인 행만(위조 차단).
drop policy if exists "blocks_insert_own" on public.blocks;
create policy "blocks_insert_own"
  on public.blocks
  for insert
  to authenticated
  with check (auth.uid() = blocker_id);

-- 차단 해제: 내가 blocker 인 행만.
drop policy if exists "blocks_delete_own" on public.blocks;
create policy "blocks_delete_own"
  on public.blocks
  for delete
  to authenticated
  using (auth.uid() = blocker_id);

-- 차단 행은 만들거나 지우기만 한다(상태 변경 없음) → UPDATE 정책 없음.

-- ── 양방향 차단 판별 헬퍼 ─────────────────────────────────
-- 두 사람 사이에 (어느 방향이든) 차단이 있으면 true.
-- security definer 인 이유: 발신 정책은 sender 권한으로 평가되는데,
-- "recipient 가 sender 를 차단했는지"(상대의 차단 행)는 blocks RLS 로는 못 본다.
-- 그래서 RLS 를 우회해 양방향을 확인할 수 있는 정의자 권한 함수가 필요하다.
create or replace function public.is_blocked(p_a uuid, p_b uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.blocks
     where (blocker_id = p_a and blocked_id = p_b)
        or (blocker_id = p_b and blocked_id = p_a)
  );
$$;

-- ── 쪽지 발신 정책 교체(차단 검사 추가) ───────────────────
-- 08_messages.sql 의 messages_insert_self 를 덮어쓴다.
-- 발신자 위조 차단(=나) + 차단 관계면 발신 거부.
drop policy if exists "messages_insert_self" on public.messages;
create policy "messages_insert_self"
  on public.messages
  for insert
  to authenticated
  with check (
    auth.uid() = sender_id
    and not public.is_blocked(sender_id, recipient_id)
  );
