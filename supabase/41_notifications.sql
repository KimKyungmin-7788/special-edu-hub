-- ============================================================
-- 41_notifications.sql — 개인 알림(좋아요·댓글·답글·멘션·쪽지·교사인증·공지) (트랙 E, 2026-10-13)
--
-- 설계 요약
--  - notifications: 받는 사람(user_id)별 한 줄. 만드는 쪽은 전부 DB 트리거·RPC(security definer).
--    사용자는 자기 알림을 읽고(SELECT) '읽음' 처리(RPC)만 한다. 직접 INSERT/UPDATE/DELETE 불가.
--  - 화면에 필요한 글(대상 제목·본문 요약·썸네일)은 만들 때 복사해 둔다(snapshot).
--    → 나중에 원글이 잠기거나 바뀌어도 알림 목록이 다른 표 권한에 흔들리지 않는다.
--    원글(앱·사례·댓글)이 실제로 지워지면 알림도 함께 지워진다(on delete cascade).
--  - 안 보내는 경우: 자기 자신의 행동 / 내가 차단한 사람의 행동.
--  - 같은 좋아요를 눌렀다 취소했다 반복해도 알림은 한 번만(같은 사람·같은 대상이면 건너뜀).
--  - 쪽지는 같은 사람이 연달아 보내면 안 읽은 알림 하나를 최신 내용으로 갱신한다.
--  - 종류
--      app_like / practice_like / comment_like  : 내 앱·사례·댓글에 좋아요
--      comment   : 내 앱·사례에 (최상위) 댓글
--      reply     : 내 댓글에 답글
--      mention   : 댓글에서 나를 @멘션 (위 두 알림을 이미 받는 사람은 중복 제외)
--      message   : 새 쪽지
--      verify_approved / verify_rejected : 교사인증 결과
--      notice    : 운영진 공지(send_notice RPC 로 전체 회원에게)
--  - 실시간: supabase_realtime 발행에 추가. Realtime 도 RLS 를 따르므로 내 알림만 받는다.
--
-- 적용: Supabase 대시보드 > SQL Editor 에 전체 붙여넣고 실행. 재실행 안전(idempotent).
-- 선행: 08(messages), 09(verification_requests), 15(is_staff), 16(blocks), 24·34·40(좋아요),
--       19·34·39(comments), 31(practices).
-- ============================================================

-- ── 1. 테이블 ────────────────────────────────────────────
create table if not exists public.notifications (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references public.profiles (id) on delete cascade,
  actor_id      uuid        references public.profiles (id) on delete set null,
  type          text        not null,
  app_id        text        references public.apps (id)      on delete cascade,
  practice_id   uuid        references public.practices (id) on delete cascade,
  comment_id    uuid        references public.comments (id)  on delete cascade,
  title         text        not null default '',  -- 대상 제목 또는 공지 제목
  snippet       text        not null default '',  -- 댓글·쪽지 요약 또는 공지 내용
  thumbnail_url text        not null default '',
  link          text,                              -- 공지용 이동 경로(선택)
  created_at    timestamptz not null default now(),
  read_at       timestamptz,
  constraint notifications_type check (type in (
    'app_like', 'practice_like', 'comment_like', 'comment', 'reply', 'mention',
    'message', 'verify_approved', 'verify_rejected', 'notice'
  ))
);

create index if not exists notifications_user_idx
  on public.notifications (user_id, created_at desc);
create index if not exists notifications_unread_idx
  on public.notifications (user_id) where read_at is null;

-- ── 2. RLS: 내 알림 읽기만 ────────────────────────────────
alter table public.notifications enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own" on public.notifications
  for select to authenticated using (auth.uid() = user_id);

revoke insert, update, delete on public.notifications from anon, authenticated;

-- ── 3. 공통: 알림 한 건 만들기 ────────────────────────────
create or replace function public.notify(
  p_user      uuid,
  p_actor     uuid,
  p_type      text,
  p_app       text,
  p_practice  uuid,
  p_comment   uuid,
  p_title     text,
  p_snippet   text,
  p_thumb     text,
  p_dedupe    boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user is null then return; end if;
  if p_actor is not null and p_actor = p_user then return; end if;
  -- 받는 사람이 행동한 사람을 차단했으면 보내지 않는다
  if p_actor is not null and exists (
    select 1 from public.blocks b where b.blocker_id = p_user and b.blocked_id = p_actor
  ) then
    return;
  end if;
  if p_dedupe and exists (
    select 1 from public.notifications n
     where n.user_id = p_user
       and n.actor_id is not distinct from p_actor
       and n.type = p_type
       and n.app_id      is not distinct from p_app
       and n.practice_id is not distinct from p_practice
       and n.comment_id  is not distinct from p_comment
  ) then
    return;
  end if;

  insert into public.notifications
    (user_id, actor_id, type, app_id, practice_id, comment_id, title, snippet, thumbnail_url)
  values
    (p_user, p_actor, p_type, p_app, p_practice, p_comment,
     coalesce(p_title, ''), left(coalesce(p_snippet, ''), 120), coalesce(p_thumb, ''));
end;
$$;

revoke execute on function public.notify(uuid, uuid, text, text, uuid, uuid, text, text, text, boolean)
  from public, anon, authenticated;

-- 댓글 본문의 멘션 토큰 '@[닉네임](id)' → '@닉네임'
create or replace function public.comment_plain(p_body text)
returns text
language sql
immutable
as $$
  select regexp_replace(coalesce(p_body, ''), '@\[([^\]\n]{1,40})\]\([0-9a-fA-F-]{36}\)', '@\1', 'g');
$$;

-- ── 4. 좋아요 ─────────────────────────────────────────────
create or replace function public.notify_on_app_like()
returns trigger language plpgsql security definer set search_path = public as $$
declare a record;
begin
  select owner_id, title, thumbnail_url into a from public.apps where id = new.app_id;
  if found then
    perform public.notify(a.owner_id, new.user_id, 'app_like', new.app_id, null, null,
                          a.title, '', a.thumbnail_url, true);
  end if;
  return new;
end $$;

create or replace function public.notify_on_practice_like()
returns trigger language plpgsql security definer set search_path = public as $$
declare p record;
begin
  select owner_id, title, cover_url into p from public.practices where id = new.practice_id;
  if found then
    perform public.notify(p.owner_id, new.user_id, 'practice_like', null, new.practice_id, null,
                          p.title, '', p.cover_url, true);
  end if;
  return new;
end $$;

create or replace function public.notify_on_comment_like()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  c record;
  v_title text := '';
  v_thumb text := '';
begin
  select author_id, body, app_id, practice_id into c from public.comments where id = new.comment_id;
  if not found then return new; end if;
  if c.app_id is not null then
    select title, thumbnail_url into v_title, v_thumb from public.apps where id = c.app_id;
  else
    select title, cover_url into v_title, v_thumb from public.practices where id = c.practice_id;
  end if;
  perform public.notify(c.author_id, new.user_id, 'comment_like', c.app_id, c.practice_id,
                        new.comment_id, v_title, public.comment_plain(c.body), v_thumb, true);
  return new;
end $$;

drop trigger if exists notify_app_like on public.likes;
create trigger notify_app_like after insert on public.likes
  for each row execute function public.notify_on_app_like();
drop trigger if exists notify_practice_like on public.practice_likes;
create trigger notify_practice_like after insert on public.practice_likes
  for each row execute function public.notify_on_practice_like();
drop trigger if exists notify_comment_like on public.comment_likes;
create trigger notify_comment_like after insert on public.comment_likes
  for each row execute function public.notify_on_comment_like();

-- ── 5. 댓글·답글·멘션 ─────────────────────────────────────
create or replace function public.notify_on_comment()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_title   text := '';
  v_thumb   text := '';
  v_owner   uuid;
  v_parent  uuid;
  v_snippet text := public.comment_plain(new.body);
  v_done    uuid[] := array[new.author_id];
  m         record;
begin
  if new.app_id is not null then
    select owner_id, title, thumbnail_url into v_owner, v_title, v_thumb
      from public.apps where id = new.app_id;
  else
    select owner_id, title, cover_url into v_owner, v_title, v_thumb
      from public.practices where id = new.practice_id;
  end if;

  if new.parent_id is not null then
    select author_id into v_parent from public.comments where id = new.parent_id;
    if v_parent is not null and not v_parent = any (v_done) then
      perform public.notify(v_parent, new.author_id, 'reply', new.app_id, new.practice_id,
                            new.id, v_title, v_snippet, v_thumb);
      v_done := v_done || v_parent;
    end if;
  elsif v_owner is not null and not v_owner = any (v_done) then
    perform public.notify(v_owner, new.author_id, 'comment', new.app_id, new.practice_id,
                          new.id, v_title, v_snippet, v_thumb);
    v_done := v_done || v_owner;
  end if;

  for m in
    select distinct (regexp_matches(new.body, '@\[[^\]\n]{1,40}\]\(([0-9a-fA-F-]{36})\)', 'g'))[1]::uuid as uid
  loop
    if not m.uid = any (v_done) and exists (select 1 from public.profiles where id = m.uid) then
      perform public.notify(m.uid, new.author_id, 'mention', new.app_id, new.practice_id,
                            new.id, v_title, v_snippet, v_thumb);
      v_done := v_done || m.uid;
    end if;
  end loop;

  return new;
end $$;

drop trigger if exists notify_comment on public.comments;
create trigger notify_comment after insert on public.comments
  for each row execute function public.notify_on_comment();

-- ── 6. 쪽지 ──────────────────────────────────────────────
create or replace function public.notify_on_message()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- 같은 사람이 보낸 안 읽은 쪽지 알림이 있으면 최신 내용으로 갱신(쌓이지 않게)
  update public.notifications
     set snippet = left(new.body, 120), created_at = now()
   where user_id = new.recipient_id
     and actor_id = new.sender_id
     and type = 'message'
     and read_at is null;
  if not found then
    perform public.notify(new.recipient_id, new.sender_id, 'message', null, null, null,
                          '', new.body, '');
  end if;
  return new;
end $$;

drop trigger if exists notify_message on public.messages;
create trigger notify_message after insert on public.messages
  for each row execute function public.notify_on_message();

-- ── 7. 교사인증 결과 ─────────────────────────────────────
-- 승인: 프로필의 인증 표시가 꺼짐→켜짐으로 바뀔 때(운영진 승인·메일 인증 모두 이 길로 온다).
create or replace function public.notify_on_verified()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.is_teacher_verified and not coalesce(old.is_teacher_verified, false) then
    perform public.notify(new.id, null, 'verify_approved', null, null, null,
                          '교사인증', '', '');
  end if;
  return new;
end $$;

drop trigger if exists notify_verified on public.profiles;
create trigger notify_verified after update of is_teacher_verified on public.profiles
  for each row execute function public.notify_on_verified();

-- 반려: 신청 상태가 rejected 로 바뀔 때. 반려 사유를 함께 보여 준다.
create or replace function public.notify_on_verify_rejected()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'rejected' and old.status is distinct from 'rejected' then
    perform public.notify(new.user_id, null, 'verify_rejected', null, null, null,
                          '교사인증', coalesce(new.reject_reason, ''), '');
  end if;
  return new;
end $$;

drop trigger if exists notify_verify_rejected on public.verification_requests;
create trigger notify_verify_rejected after update of status on public.verification_requests
  for each row execute function public.notify_on_verify_rejected();

-- ── 8. 공지(운영진 → 전체 회원) ───────────────────────────
create or replace function public.send_notice(p_title text, p_body text, p_link text default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title text := btrim(coalesce(p_title, ''));
  v_link  text := nullif(btrim(coalesce(p_link, '')), '');
  v_count integer;
begin
  if not public.is_staff() then
    raise exception 'permission denied';
  end if;
  if char_length(v_title) = 0 or char_length(v_title) > 100 then
    raise exception 'title must be 1-100 chars';
  end if;
  -- 사이트 안 경로('/...') 또는 http(s) 주소만
  if v_link is not null and v_link !~ '^(/|https?://)' then
    raise exception 'invalid link';
  end if;

  insert into public.notifications (user_id, actor_id, type, title, snippet, link)
  select p.id, auth.uid(), 'notice', v_title, left(btrim(coalesce(p_body, '')), 300), v_link
    from public.profiles p;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function public.send_notice(text, text, text) from public, anon;
grant  execute on function public.send_notice(text, text, text) to authenticated;

-- ── 9. 읽음 처리 ─────────────────────────────────────────
-- p_ids 가 null 이면 내 알림 전부 읽음.
create or replace function public.mark_notifications_read(p_ids uuid[] default null)
returns void
language sql
security definer
set search_path = public
as $$
  update public.notifications
     set read_at = now()
   where user_id = auth.uid()
     and read_at is null
     and (p_ids is null or id = any (p_ids));
$$;

revoke execute on function public.mark_notifications_read(uuid[]) from public, anon;
grant  execute on function public.mark_notifications_read(uuid[]) to authenticated;

-- ── 10. 실시간 ───────────────────────────────────────────
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
