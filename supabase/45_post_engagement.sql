-- ============================================================
-- 45_post_engagement.sql — 게시판 글 조회수·좋아요 (자유·연구회게시판 모두)
--
-- 설계 요약 (앱 24·수업 사례 34와 같은 구조)
--  - posts.view_count / like_count 컬럼. 사용자는 posts 를 직접 고칠 수 없어(42 revoke) 숫자 조작 불가.
--  - 좋아요: post_likes ((user_id, post_id) 복합 PK = 1인 1글 1회), 본인 행만 RLS, 트리거로 like_count ±1.
--    누를 수 있는 사람 = 그 글을 읽을 수 있는 로그인 회원(can_read_board — 연구회 글은 연구회원만).
--  - 조회수: increment_post_view RPC(+1, 비로그인 포함). 읽을 수 없는 글은 오르지 않는다.
--    새로고침 어뷰징은 화면 쪽에서 같은 글 하루 1회로 막는다(localStorage).
--
-- 선행: 42_board.sql, 43_research_board.sql. 적용: SQL Editor 에 붙여넣고 실행. 재실행 안전.
-- ============================================================
begin;

alter table public.posts add column if not exists view_count integer not null default 0;
alter table public.posts add column if not exists like_count integer not null default 0;

-- ── 좋아요 ──────────────────────────────────────────────
create table if not exists public.post_likes (
  user_id    uuid        not null references public.profiles (id) on delete cascade,
  post_id    uuid        not null references public.posts (id)    on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);
create index if not exists post_likes_post_idx on public.post_likes (post_id);
create index if not exists post_likes_user_idx on public.post_likes (user_id, created_at desc);

alter table public.post_likes enable row level security;
revoke all on public.post_likes from anon, authenticated;
grant select, insert, delete on public.post_likes to authenticated;

drop policy if exists "post_likes_select_own" on public.post_likes;
create policy "post_likes_select_own" on public.post_likes
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "post_likes_insert_readable" on public.post_likes;
create policy "post_likes_insert_readable" on public.post_likes
  for insert to authenticated with check (
    auth.uid() = user_id
    and exists (select 1 from public.posts p
      where p.id = post_id and p.deleted_at is null and public.can_read_board(p.board_id))
  );
drop policy if exists "post_likes_delete_own" on public.post_likes;
create policy "post_likes_delete_own" on public.post_likes
  for delete to authenticated using (auth.uid() = user_id);

create or replace function public.bump_post_like_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set like_count = like_count + 1 where id = new.post_id;
    return new;
  else
    update public.posts set like_count = greatest(like_count - 1, 0) where id = old.post_id;
    return old;
  end if;
end $$;
revoke all on function public.bump_post_like_count() from public, anon, authenticated;

drop trigger if exists post_likes_count_ins on public.post_likes;
drop trigger if exists post_likes_count_del on public.post_likes;
create trigger post_likes_count_ins after insert on public.post_likes
  for each row execute function public.bump_post_like_count();
create trigger post_likes_count_del after delete on public.post_likes
  for each row execute function public.bump_post_like_count();

-- ── 조회수 ──────────────────────────────────────────────
create or replace function public.increment_post_view(p_post_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.posts set view_count = view_count + 1
    where id = p_post_id and deleted_at is null and public.can_read_board(board_id);
end $$;
revoke all on function public.increment_post_view(uuid) from public;
grant execute on function public.increment_post_view(uuid) to anon, authenticated;

commit;
