-- ============================================================
-- 34_practice_engagement.sql — 수업실천사례 좋아요·담기·조회수·댓글 (PRD §13, 묶음 P-5)
--
-- 설계 요약
--  - 좋아요·담기: 앱과 같은 구조의 별도 표 practice_likes / practice_bookmarks
--    ((user_id, practice_id) 복합 PK, 본인 행만 RLS, 트리거로 practices 카운트 ±1).
--  - 조회수: increment_practice_view RPC(+1, 비로그인 포함). 새로고침 어뷰징은 클라 throttle.
--  - 댓글: 기존 comments 표를 넓힌다 — app_id 또는 practice_id 중 정확히 하나.
--    → 삭제(delete_comment)·신고(report_comment)·운영진 신고 큐가 그대로 동작한다.
--    잠금(교사 전용) RESTRICTIVE 정책과 댓글 수 트리거를 두 대상 모두 처리하도록 교체.
--
-- 선행: 19·20·24·26·30(comments·신고·좋아요·잠금·댓글수), 31(practices).
-- 적용: Supabase 대시보드 > SQL Editor 에 붙여넣고 실행. 재실행 안전(idempotent).
-- ============================================================

-- ── 1. 좋아요·담기 ──────────────────────────────────────
create table if not exists public.practice_likes (
  user_id     uuid        not null references public.profiles (id)  on delete cascade,
  practice_id uuid        not null references public.practices (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, practice_id)
);
create table if not exists public.practice_bookmarks (
  user_id     uuid        not null references public.profiles (id)  on delete cascade,
  practice_id uuid        not null references public.practices (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, practice_id)
);
create index if not exists practice_likes_practice_idx     on public.practice_likes (practice_id);
create index if not exists practice_likes_user_idx         on public.practice_likes (user_id, created_at desc);
create index if not exists practice_bookmarks_practice_idx on public.practice_bookmarks (practice_id);
create index if not exists practice_bookmarks_user_idx     on public.practice_bookmarks (user_id, created_at desc);

alter table public.practice_likes     enable row level security;
alter table public.practice_bookmarks enable row level security;

drop policy if exists "practice_likes_select_own" on public.practice_likes;
create policy "practice_likes_select_own" on public.practice_likes
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "practice_likes_insert_own" on public.practice_likes;
create policy "practice_likes_insert_own" on public.practice_likes
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "practice_likes_delete_own" on public.practice_likes;
create policy "practice_likes_delete_own" on public.practice_likes
  for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "practice_bookmarks_select_own" on public.practice_bookmarks;
create policy "practice_bookmarks_select_own" on public.practice_bookmarks
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "practice_bookmarks_insert_own" on public.practice_bookmarks;
create policy "practice_bookmarks_insert_own" on public.practice_bookmarks
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "practice_bookmarks_delete_own" on public.practice_bookmarks;
create policy "practice_bookmarks_delete_own" on public.practice_bookmarks
  for delete to authenticated using (auth.uid() = user_id);

create or replace function public.bump_practice_like_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.practices set like_count = like_count + 1 where id = new.practice_id;
    return new;
  else
    update public.practices set like_count = greatest(like_count - 1, 0) where id = old.practice_id;
    return old;
  end if;
end $$;

create or replace function public.bump_practice_bookmark_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.practices set bookmark_count = bookmark_count + 1 where id = new.practice_id;
    return new;
  else
    update public.practices set bookmark_count = greatest(bookmark_count - 1, 0) where id = old.practice_id;
    return old;
  end if;
end $$;

drop trigger if exists practice_likes_count_ins on public.practice_likes;
drop trigger if exists practice_likes_count_del on public.practice_likes;
create trigger practice_likes_count_ins after insert on public.practice_likes
  for each row execute function public.bump_practice_like_count();
create trigger practice_likes_count_del after delete on public.practice_likes
  for each row execute function public.bump_practice_like_count();

drop trigger if exists practice_bookmarks_count_ins on public.practice_bookmarks;
drop trigger if exists practice_bookmarks_count_del on public.practice_bookmarks;
create trigger practice_bookmarks_count_ins after insert on public.practice_bookmarks
  for each row execute function public.bump_practice_bookmark_count();
create trigger practice_bookmarks_count_del after delete on public.practice_bookmarks
  for each row execute function public.bump_practice_bookmark_count();

-- ── 2. 조회수 ───────────────────────────────────────────
create or replace function public.increment_practice_view(p_practice_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.practices set view_count = view_count + 1
   where id = p_practice_id and status = 'published';
end $$;

grant execute on function public.increment_practice_view(uuid) to anon, authenticated;

-- ── 3. 댓글: comments 를 사례에도 ─────────────────────────
alter table public.comments alter column app_id drop not null;
alter table public.comments
  add column if not exists practice_id uuid references public.practices (id) on delete cascade;

alter table public.comments drop constraint if exists comments_one_target;
alter table public.comments add constraint comments_one_target
  check (num_nonnulls(app_id, practice_id) = 1);

create index if not exists comments_practice_idx
  on public.comments (practice_id, created_at) where deleted_at is null;

-- 잠금 정책(26) 교체: 대상이 앱이면 앱 기준, 사례면 사례 기준으로 판단.
drop policy if exists "comments_teachers_only_read" on public.comments;
create policy "comments_teachers_only_read" on public.comments
  as restrictive
  for select to anon, authenticated
  using (
    (app_id is null or exists (
      select 1 from public.apps a
      where a.id = comments.app_id
        and (a.visibility = 'public' or public.can_view_teacher_content(a.owner_id))
    ))
    and
    (practice_id is null or exists (
      select 1 from public.practices p
      where p.id = comments.practice_id
        and (p.visibility = 'public' or public.can_view_teacher_content(p.owner_id))
    ))
  );

drop policy if exists "comments_teachers_only_insert" on public.comments;
create policy "comments_teachers_only_insert" on public.comments
  as restrictive
  for insert to authenticated
  with check (
    (app_id is null or exists (
      select 1 from public.apps a
      where a.id = comments.app_id
        and (a.visibility = 'public' or public.can_view_teacher_content(a.owner_id))
    ))
    and
    (practice_id is null or exists (
      select 1 from public.practices p
      where p.id = comments.practice_id
        and p.status = 'published'
        and (p.visibility = 'public' or public.can_view_teacher_content(p.owner_id))
    ))
  );

-- 댓글 수 트리거(30) 교체: 앱이면 apps, 사례면 practices 를 갱신.
create or replace function public.bump_comment_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  delta integer := 0;
  r record;
begin
  if tg_op = 'INSERT' then
    r := new;
    if new.deleted_at is null then delta := 1; end if;
  elsif tg_op = 'UPDATE' then
    r := new;
    if old.deleted_at is null and new.deleted_at is not null then delta := -1;
    elsif old.deleted_at is not null and new.deleted_at is null then delta := 1;
    end if;
  else
    r := old;
    if old.deleted_at is null then delta := -1; end if;
  end if;

  if delta <> 0 then
    if r.app_id is not null then
      update public.apps set comment_count = greatest(comment_count + delta, 0) where id = r.app_id;
    elsif r.practice_id is not null then
      update public.practices set comment_count = greatest(comment_count + delta, 0) where id = r.practice_id;
    end if;
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
