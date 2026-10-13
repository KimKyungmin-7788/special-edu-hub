-- ============================================================
-- 40_comment_likes_edit.sql — 댓글 좋아요 · 댓글 수정 · 받은 좋아요 누계 (트랙 E, 2026-10-13)
--
-- 설계 요약
--  1) 댓글 좋아요: comment_likes(user_id, comment_id) 복합 PK = 1인 1댓글 1회.
--     앱 좋아요(24)와 같은 방식 — 본인 행만 보이고, 숫자는 comments.like_count(트리거 ±1).
--     좋아요는 지금 볼 수 있는 미삭제 댓글에만(잠긴 자료의 댓글은 RLS 로 안 보이므로 불가).
--  2) 댓글 수정: edit_comment RPC(security definer) 로만. 본인만(운영진도 남의 글은 못 고침).
--     comments.edited_at 이 채워지면 화면에 '(수정됨)'. 직접 UPDATE 는 19 에서 이미 막혀 있다.
--  3) 받은 좋아요 누계: received_like_count(사용자) — 그 사람이 올린 앱·수업실천사례·댓글에
--     "다른 사람이" 실제로 누른 좋아요 수의 합. 시드 숫자·자기 좋아요는 제외.
--     매번 세는 방식(저장 안 함) → 좋아요 취소·글 삭제가 자동 반영된다. 삭제된 댓글 몫은 뺀다.
--
-- 적용: Supabase 대시보드 > SQL Editor 에 전체 붙여넣고 실행. 재실행 안전(idempotent).
-- 선행: 19·34·39(comments), 24(likes), 34(practice_likes), 12·31(owner_id).
-- ============================================================

-- ── 1. 댓글 좋아요 ────────────────────────────────────────
alter table public.comments
  add column if not exists like_count integer not null default 0;

create table if not exists public.comment_likes (
  user_id    uuid        not null references public.profiles (id) on delete cascade,
  comment_id uuid        not null references public.comments (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, comment_id)
);
create index if not exists comment_likes_comment_idx on public.comment_likes (comment_id);

alter table public.comment_likes enable row level security;

drop policy if exists "comment_likes_select_own" on public.comment_likes;
create policy "comment_likes_select_own" on public.comment_likes
  for select to authenticated using (auth.uid() = user_id);

-- 볼 수 있는(=comments RLS 통과) 미삭제 댓글에만 본인 명의로.
drop policy if exists "comment_likes_insert_own" on public.comment_likes;
create policy "comment_likes_insert_own" on public.comment_likes
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.comments c
       where c.id = comment_likes.comment_id
         and c.deleted_at is null
    )
  );

drop policy if exists "comment_likes_delete_own" on public.comment_likes;
create policy "comment_likes_delete_own" on public.comment_likes
  for delete to authenticated using (auth.uid() = user_id);

create or replace function public.bump_comment_like_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.comments set like_count = like_count + 1 where id = new.comment_id;
    return new;
  else
    update public.comments set like_count = greatest(like_count - 1, 0) where id = old.comment_id;
    return old;
  end if;
end $$;

drop trigger if exists comment_likes_count_ins on public.comment_likes;
drop trigger if exists comment_likes_count_del on public.comment_likes;
create trigger comment_likes_count_ins after insert on public.comment_likes
  for each row execute function public.bump_comment_like_count();
create trigger comment_likes_count_del after delete on public.comment_likes
  for each row execute function public.bump_comment_like_count();

-- 백필(재실행 시에도 실제 행 수와 맞춘다)
update public.comments c
   set like_count = coalesce(x.cnt, 0)
  from (
    select cm.id, count(cl.user_id) as cnt
      from public.comments cm
      left join public.comment_likes cl on cl.comment_id = cm.id
     group by cm.id
  ) x
 where x.id = c.id
   and c.like_count is distinct from coalesce(x.cnt, 0);

-- ── 2. 댓글 수정 ─────────────────────────────────────────
alter table public.comments
  add column if not exists edited_at timestamptz;

create or replace function public.edit_comment(p_id uuid, p_body text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  c record;
  v_body text := btrim(coalesce(p_body, ''));
begin
  select id, author_id, deleted_at into c
    from public.comments
   where id = p_id;
  if not found or c.deleted_at is not null then
    raise exception 'comment not found';
  end if;
  if auth.uid() is null or auth.uid() <> c.author_id then
    raise exception 'permission denied';
  end if;
  if char_length(v_body) = 0 then
    raise exception 'empty body';
  end if;
  -- 멘션 토큰 몫까지 넉넉히(화면 기준 1000자)
  if char_length(v_body) > 4000 then
    raise exception 'body too long';
  end if;

  update public.comments
     set body = v_body,
         edited_at = now()
   where id = p_id;
end;
$$;

revoke execute on function public.edit_comment(uuid, text) from public, anon;
grant  execute on function public.edit_comment(uuid, text) to authenticated;

-- ── 3. 받은 좋아요 누계 ──────────────────────────────────
create or replace function public.received_like_count(p_user uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select (
    (select count(*) from public.likes l
       join public.apps a on a.id = l.app_id
      where a.owner_id = p_user and l.user_id <> p_user)
  + (select count(*) from public.practice_likes pl
       join public.practices p on p.id = pl.practice_id
      where p.owner_id = p_user and pl.user_id <> p_user)
  + (select count(*) from public.comment_likes cl
       join public.comments c on c.id = cl.comment_id
      where c.author_id = p_user and c.deleted_at is null and cl.user_id <> p_user)
  )::integer;
$$;

revoke execute on function public.received_like_count(uuid) from public;
grant  execute on function public.received_like_count(uuid) to anon, authenticated;
