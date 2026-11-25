-- ============================================================
-- 79_collab_projects.sql — 협업 프로젝트 1묶음 (PRD §15)
--
-- 설계 요약
--  - collab_projects : 리더가 연 프로젝트 한 건. 이름·비전 한 줄·소개·대표 사진·목업 링크·필요 인원.
--  - 상태(status)    : recruiting(모집 중) → working(작업 중) → done(완성) / stopped(그만둠).
--                      1묶음에서는 모집 중으로만 만든다. 상태 바꾸기·마감일은 2묶음 RPC 로만(컬럼 권한 없음).
--  - 보기 = 누구나. 열기 = 교사인증 회원 + 본인 명의 + 모집 중. 고치기·지우기 = 리더 본인 또는 운영진.
--  - 대표 사진은 app-thumbnails 공개 버킷을 같이 쓴다(경로 <uid>/…). 탈퇴하면 리더 행은 함께 지워진다.
--
-- 선행: 04(profiles), 12(is_verified_teacher), 15(is_staff).
-- 적용: Supabase 대시보드 > SQL Editor 에 붙여넣고 실행. 재실행 안전(idempotent).
-- ============================================================

create table if not exists public.collab_projects (
  id          uuid        primary key default gen_random_uuid(),
  leader_id   uuid        not null references public.profiles (id) on delete cascade,
  title       text        not null,
  vision      text        not null,
  body        text        not null default '',
  cover_url   text        not null default '',
  mockup_url  text        not null default '',
  needed      integer     not null,
  status      text        not null default 'recruiting',
  due_date    date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint collab_projects_title_len  check (char_length(btrim(title)) between 1 and 40),
  constraint collab_projects_vision_len check (char_length(btrim(vision)) between 1 and 60),
  constraint collab_projects_body_len   check (char_length(body) <= 2000),
  constraint collab_projects_mockup_url check (mockup_url = '' or mockup_url ~ '^https://'),
  constraint collab_projects_needed     check (needed between 1 and 10),
  constraint collab_projects_status     check (status in ('recruiting', 'working', 'done', 'stopped'))
);

create index if not exists collab_projects_status_created_idx
  on public.collab_projects (status, created_at desc);
create index if not exists collab_projects_leader_idx
  on public.collab_projects (leader_id);

create or replace function public.touch_collab_project_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_collab_projects_touch on public.collab_projects;
create trigger trg_collab_projects_touch
  before update on public.collab_projects
  for each row execute function public.touch_collab_project_updated_at();

-- ── RLS ─────────────────────────────────────────────────
alter table public.collab_projects enable row level security;

drop policy if exists "collab_projects_read" on public.collab_projects;
create policy "collab_projects_read" on public.collab_projects
  for select to anon, authenticated
  using (true);

drop policy if exists "collab_projects_insert_verified_leader" on public.collab_projects;
create policy "collab_projects_insert_verified_leader" on public.collab_projects
  for insert to authenticated
  with check (
    public.is_verified_teacher()
    and leader_id = auth.uid()
    and status = 'recruiting'
    and due_date is null
  );

drop policy if exists "collab_projects_update_leader_or_staff" on public.collab_projects;
create policy "collab_projects_update_leader_or_staff" on public.collab_projects
  for update to authenticated
  using (leader_id = auth.uid() or public.is_staff())
  with check (leader_id = auth.uid() or public.is_staff());

drop policy if exists "collab_projects_delete_leader_or_staff" on public.collab_projects;
create policy "collab_projects_delete_leader_or_staff" on public.collab_projects
  for delete to authenticated
  using (leader_id = auth.uid() or public.is_staff());

-- 컬럼 권한: 상태·마감일·리더는 클라이언트가 직접 못 바꾼다(2묶음 RPC 로만).
revoke insert, update, delete on public.collab_projects from anon, authenticated;
grant select on public.collab_projects to anon, authenticated;
grant insert (leader_id, title, vision, body, cover_url, mockup_url, needed)
  on public.collab_projects to authenticated;
grant update (title, vision, body, cover_url, mockup_url, needed)
  on public.collab_projects to authenticated;
grant delete on public.collab_projects to authenticated;
