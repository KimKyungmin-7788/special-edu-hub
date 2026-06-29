-- ============================================================
-- 24_likes_bookmarks.sql — 좋아요·담기 실동작 + 조회수 누적 (5단계 트랙 B-1)
--
-- 설계 요약
--  - likes / bookmarks: (user_id, app_id) 복합 PK = 1인 1앱 1회(중복 불가).
--  - 카운트는 apps.like_count / bookmark_count 컬럼(시드값)을 기준으로 두고,
--    insert/delete 트리거로 ±1 유지(시드값 유지 + 실집계). 표시 숫자는 컬럼.
--  - 내 좋아요/담기 여부만 본인이 조회(토글 상태용). 카운트는 apps 컬럼(공개)으로 본다.
--  - 조회수: increment_view RPC(+1). 새로고침 어뷰징은 클라에서 세션 throttle(localStorage).
--  - 권한은 전부 RLS/트리거(definer)가 강제.
--
-- 적용: Supabase 대시보드 > SQL Editor 에 붙여넣고 실행. 재실행 안전(idempotent).
-- 선행: 01_schema.sql(apps: like_count/bookmark_count/view_count), 04_profiles.sql.
-- ============================================================

-- ── 테이블 ────────────────────────────────────────────────
create table if not exists public.likes (
  user_id    uuid        not null references public.profiles (id) on delete cascade,
  app_id     text        not null references public.apps (id)     on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, app_id)
);
create table if not exists public.bookmarks (
  user_id    uuid        not null references public.profiles (id) on delete cascade,
  app_id     text        not null references public.apps (id)     on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, app_id)
);

-- 카운트 트리거(app_id)·내 목록(user_id, 최신순) 조회 가속.
create index if not exists likes_app_idx     on public.likes (app_id);
create index if not exists likes_user_idx    on public.likes (user_id, created_at desc);
create index if not exists bookmarks_app_idx  on public.bookmarks (app_id);
create index if not exists bookmarks_user_idx on public.bookmarks (user_id, created_at desc);

-- ── RLS: 본인 행만(토글 상태용). 카운트는 apps 컬럼으로 공개 표시. ──
alter table public.likes     enable row level security;
alter table public.bookmarks enable row level security;

drop policy if exists "likes_select_own" on public.likes;
create policy "likes_select_own" on public.likes
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "likes_insert_own" on public.likes;
create policy "likes_insert_own" on public.likes
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "likes_delete_own" on public.likes;
create policy "likes_delete_own" on public.likes
  for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "bookmarks_select_own" on public.bookmarks;
create policy "bookmarks_select_own" on public.bookmarks
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "bookmarks_insert_own" on public.bookmarks;
create policy "bookmarks_insert_own" on public.bookmarks
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "bookmarks_delete_own" on public.bookmarks;
create policy "bookmarks_delete_own" on public.bookmarks
  for delete to authenticated using (auth.uid() = user_id);

-- ── 카운트 유지 트리거 (definer: RLS 우회해 apps 갱신) ──────
create or replace function public.bump_like_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.apps set like_count = like_count + 1 where id = new.app_id;
    return new;
  else
    update public.apps set like_count = greatest(like_count - 1, 0) where id = old.app_id;
    return old;
  end if;
end $$;

create or replace function public.bump_bookmark_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.apps set bookmark_count = bookmark_count + 1 where id = new.app_id;
    return new;
  else
    update public.apps set bookmark_count = greatest(bookmark_count - 1, 0) where id = old.app_id;
    return old;
  end if;
end $$;

drop trigger if exists likes_count_ins on public.likes;
drop trigger if exists likes_count_del on public.likes;
create trigger likes_count_ins after insert on public.likes
  for each row execute function public.bump_like_count();
create trigger likes_count_del after delete on public.likes
  for each row execute function public.bump_like_count();

drop trigger if exists bookmarks_count_ins on public.bookmarks;
drop trigger if exists bookmarks_count_del on public.bookmarks;
create trigger bookmarks_count_ins after insert on public.bookmarks
  for each row execute function public.bump_bookmark_count();
create trigger bookmarks_count_del after delete on public.bookmarks
  for each row execute function public.bump_bookmark_count();

-- ── 조회수 누적 RPC (definer, 비로그인 포함) ───────────────
create or replace function public.increment_view(p_app_id text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.apps set view_count = view_count + 1 where id = p_app_id;
end $$;

grant execute on function public.increment_view(text) to anon, authenticated;
