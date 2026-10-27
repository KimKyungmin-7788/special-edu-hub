-- 자유게시판: PRD 트랙 D, 2026-10-27.
-- 선행: 01~41. Supabase SQL Editor에서 사용자가 전체 실행. 재실행 가능.
-- 글/댓글 작성: 인증 교사. 읽기: 전체. 수정: 본인. 삭제: 본인/운영진.
-- 새 테이블과 권한 변경을 한 트랜잭션으로 적용한다.
begin;

create table if not exists public.boards (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  write_permission text not null check (write_permission in ('teacher', 'staff'))
);
insert into public.boards (slug, name, write_permission)
values ('free', '자유게시판', 'teacher')
on conflict (slug) do update set write_permission = excluded.write_permission;

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id),
  author_id uuid not null references public.profiles(id),
  title text not null check (char_length(btrim(title)) between 1 and 100),
  body text not null check (char_length(btrim(body)) between 1 and 100000),
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists posts_board_list_idx on public.posts
  (board_id, pinned desc, created_at desc, id desc) where deleted_at is null;
alter table public.boards enable row level security;
alter table public.posts enable row level security;
revoke all on public.boards, public.posts from anon, authenticated;
grant select on public.boards, public.posts to anon, authenticated;

create or replace function public.can_write_board(p_board uuid)
returns boolean language sql stable security invoker set search_path = public as $$
  select exists (
    select 1 from public.boards b join public.profiles p on p.id = auth.uid()
    where b.id = p_board and (
      (b.write_permission = 'teacher' and p.is_teacher_verified)
      or (b.write_permission = 'staff' and public.is_staff())
    )
  );
$$;
revoke all on function public.can_write_board(uuid) from public;
grant execute on function public.can_write_board(uuid) to authenticated;

drop policy if exists boards_read on public.boards;
create policy boards_read on public.boards for select to anon, authenticated using (true);
drop policy if exists posts_read on public.posts;
create policy posts_read on public.posts for select to anon, authenticated using (deleted_at is null);

-- 쓰기는 RPC만 허용. 작성자·게시판·고정·시각은 DB에서 결정한다.
create or replace function public.save_board_post(p_title text, p_body text, p_id uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_board uuid; v_id uuid; v_author uuid;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  if p_id is null then
    select id into v_board from public.boards where slug = 'free';
  else
    select board_id, author_id into v_board, v_author from public.posts
      where id = p_id and deleted_at is null for update;
    if not found or v_author <> auth.uid() then raise exception '수정 권한이 없습니다.'; end if;
  end if;
  if not public.can_write_board(v_board) then raise exception '인증 교사만 글을 작성할 수 있습니다.'; end if;
  if p_title is null or char_length(btrim(p_title)) not between 1 and 100 then
    raise exception '제목은 1~100자로 입력하세요.';
  end if;
  if p_body is null or char_length(btrim(p_body)) not between 1 and 100000
    or btrim(regexp_replace(regexp_replace(p_body, '<[^>]*>', '', 'g'), '&nbsp;|&#160;', '', 'g')) = '' then
    raise exception '본문 내용을 입력하세요. (최대 100,000자)';
  end if;
  if p_id is null then
    insert into public.posts (board_id, author_id, title, body)
      values (v_board, auth.uid(), btrim(p_title), p_body) returning id into v_id;
  else
    update public.posts set title = btrim(p_title), body = p_body, updated_at = now() where id = p_id;
    v_id := p_id;
  end if;
  return v_id;
end $$;

create or replace function public.delete_board_post(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  update public.posts set deleted_at = now()
    where id = p_id and deleted_at is null and (author_id = auth.uid() or public.is_staff());
  if not found then raise exception '글이 없거나 삭제 권한이 없습니다.'; end if;
end $$;

create or replace function public.pin_board_post(p_id uuid, p_pinned boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.is_staff() then raise exception '운영진만 고정할 수 있습니다.'; end if;
  update public.posts set pinned = p_pinned where id = p_id and deleted_at is null;
  if not found then raise exception '글을 찾을 수 없습니다.'; end if;
end $$;
revoke all on function public.save_board_post(text, text, uuid), public.delete_board_post(uuid), public.pin_board_post(uuid, boolean) from public, anon;
grant execute on function public.save_board_post(text, text, uuid), public.delete_board_post(uuid), public.pin_board_post(uuid, boolean) to authenticated;

-- 기존 댓글 인프라: 정확히 한 대상, 같은 글의 최상위 댓글에만 답글.
alter table public.comments add column if not exists post_id uuid references public.posts(id) on delete cascade;
alter table public.comments drop constraint if exists comments_one_target;
alter table public.comments add constraint comments_one_target check (num_nonnulls(app_id, practice_id, post_id) = 1);
create index if not exists comments_post_idx on public.comments(post_id, created_at) where deleted_at is null;

create or replace function public.can_reply_to_board_comment(p_parent uuid, p_post uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.comments c where c.id = p_parent
    and c.parent_id is null and c.deleted_at is null and c.post_id = p_post);
$$;
revoke all on function public.can_reply_to_board_comment(uuid, uuid) from public, anon;
grant execute on function public.can_reply_to_board_comment(uuid, uuid) to authenticated;

drop policy if exists comments_insert_own on public.comments;
create policy comments_insert_own on public.comments for insert to authenticated with check (
  auth.uid() = author_id and char_length(btrim(body)) > 0 and (
    parent_id is null
    or (post_id is not null and public.can_reply_to_board_comment(parent_id, post_id))
    or (post_id is null and public.can_reply_to_comment(parent_id, app_id, practice_id))
  )
);
drop policy if exists comments_board_read on public.comments;
create policy comments_board_read on public.comments as restrictive for select to anon, authenticated
  using (post_id is null or exists (select 1 from public.posts p where p.id = post_id and p.deleted_at is null));
drop policy if exists comments_board_write on public.comments;
create policy comments_board_write on public.comments as restrictive for insert to authenticated
  with check (post_id is null or exists (
    select 1 from public.posts p where p.id = post_id and p.deleted_at is null and public.can_write_board(p.board_id)
  ));
-- edit_comment는 SECURITY DEFINER이므로 인증 회수와 삭제된 원글도 트리거에서 검사한다.
create or replace function public.check_board_comment_body()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.post_id is not null then
    if auth.uid() is null or auth.uid() <> new.author_id or not exists (
      select 1 from public.posts p where p.id = new.post_id and p.deleted_at is null
        and public.can_write_board(p.board_id)
    ) then raise exception '인증 교사만 댓글을 작성·수정할 수 있습니다.'; end if;
    if char_length(btrim(new.body)) not between 1 and 4000 then raise exception '댓글 길이를 확인해 주세요.'; end if;
  end if;
  return new;
end $$;
drop trigger if exists board_comment_body on public.comments;
create trigger board_comment_body before insert or update of body on public.comments
  for each row execute function public.check_board_comment_body();
revoke all on function public.check_board_comment_body() from public, anon, authenticated;

-- 신고 큐 재사용. 스냅샷은 DB에서 만들어 위조를 막는다.
alter table public.reports drop constraint if exists reports_target_type_check;
alter table public.reports add constraint reports_target_type_check check (target_type in ('user','app','message','comment','post'));
create or replace function public.report_board_post(p_id uuid, p_reason text, p_detail text)
returns void language plpgsql security definer set search_path = public as $$
declare p record;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  select * into p from public.posts where id = p_id and deleted_at is null;
  if not found then raise exception '글을 찾을 수 없습니다.'; end if;
  if char_length(coalesce(p_detail, '')) > 1000 then raise exception '상세 내용은 1000자 이하로 입력하세요.'; end if;
  insert into public.reports (reporter_id, target_type, target_id, reported_user_id, target_snapshot, reason, detail)
    values (auth.uid(), 'post', p.id::text, p.author_id, p.title || E'\n' || left(regexp_replace(p.body, '<[^>]*>', '', 'g'), 4000), p_reason, p_detail)
    on conflict (reporter_id, target_type, target_id) where status = 'pending' do nothing;
end $$;
revoke all on function public.report_board_post(uuid, text, text) from public, anon;
grant execute on function public.report_board_post(uuid, text, text) to authenticated;

-- 기존 알림(답글/멘션/댓글 좋아요)은 comment_id에서 게시글 경로·제목을 보충.
create or replace function public.board_notification_context()
returns trigger language plpgsql security definer set search_path = public as $$
declare p record;
begin
  if new.comment_id is not null then
    select posts.id, posts.title into p from public.comments c join public.posts on posts.id = c.post_id where c.id = new.comment_id;
    if found then new.link := '/board/' || p.id::text; new.title := p.title; end if;
  end if;
  return new;
end $$;
drop trigger if exists board_notification_context on public.notifications;
create trigger board_notification_context before insert on public.notifications for each row execute function public.board_notification_context();
revoke all on function public.board_notification_context() from public, anon, authenticated;

-- 게시글 작성자에게 댓글 알림. 기존 중복 억제·차단 규칙 유지.
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
  elsif new.post_id is not null then
    select author_id, title into v_owner, v_title from public.posts where id = new.post_id;
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


commit;
