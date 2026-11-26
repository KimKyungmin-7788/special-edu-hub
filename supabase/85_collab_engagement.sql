-- ============================================================
-- 85_collab_engagement.sql — 협업 프로젝트 조회수·좋아요 (게시판 45 와 같은 방식, 2026-11-26)
--
--  - collab_projects.view_count / like_count 추가. 화면에서 직접 못 고치고 아래 함수·트리거로만 바뀐다.
--  - 조회수: increment_collab_view RPC(+1, 비로그인 포함). 새로고침 어뷰징은 화면에서 같은 글 하루 1회로 막는다.
--  - 좋아요: collab_project_likes((user_id, project_id) 복합 PK = 1인 1회), 본인 행만 RLS, 트리거로 like_count ±1.
--    누를 수 있는 사람 = 로그인 회원.
--
-- 선행: 79. 적용: Supabase 대시보드 > SQL Editor 에 붙여넣고 실행. 재실행 안전(idempotent).
-- ============================================================

alter table public.collab_projects add column if not exists view_count integer not null default 0;
alter table public.collab_projects add column if not exists like_count integer not null default 0;

-- ── 좋아요 ──────────────────────────────────────────────
create table if not exists public.collab_project_likes (
  user_id     uuid        not null references public.profiles (id)        on delete cascade,
  project_id  uuid        not null references public.collab_projects (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, project_id)
);
create index if not exists collab_project_likes_project_idx on public.collab_project_likes (project_id);

alter table public.collab_project_likes enable row level security;
revoke all on public.collab_project_likes from anon, authenticated;
grant select, insert, delete on public.collab_project_likes to authenticated;

drop policy if exists "collab_project_likes_select_own" on public.collab_project_likes;
create policy "collab_project_likes_select_own" on public.collab_project_likes
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "collab_project_likes_insert_own" on public.collab_project_likes;
create policy "collab_project_likes_insert_own" on public.collab_project_likes
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "collab_project_likes_delete_own" on public.collab_project_likes;
create policy "collab_project_likes_delete_own" on public.collab_project_likes
  for delete to authenticated using (auth.uid() = user_id);

create or replace function public.bump_collab_like_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.collab_projects set like_count = like_count + 1 where id = new.project_id;
    return new;
  else
    update public.collab_projects set like_count = greatest(like_count - 1, 0) where id = old.project_id;
    return old;
  end if;
end $$;
revoke all on function public.bump_collab_like_count() from public, anon, authenticated;

drop trigger if exists collab_project_likes_count_ins on public.collab_project_likes;
drop trigger if exists collab_project_likes_count_del on public.collab_project_likes;
create trigger collab_project_likes_count_ins after insert on public.collab_project_likes
  for each row execute function public.bump_collab_like_count();
create trigger collab_project_likes_count_del after delete on public.collab_project_likes
  for each row execute function public.bump_collab_like_count();

-- ── 조회수 ──────────────────────────────────────────────
create or replace function public.increment_collab_view(p_project uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.collab_projects set view_count = view_count + 1 where id = p_project;
end $$;
revoke all on function public.increment_collab_view(uuid) from public;
grant execute on function public.increment_collab_view(uuid) to anon, authenticated;
