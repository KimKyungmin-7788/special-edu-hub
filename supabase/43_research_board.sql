-- 42 적용 후 사용자가 SQL Editor에서 전체 실행. 자동 실행하지 않음.
-- 연구회회원은 운영 역할과 겸임 가능한 별도 등급. 관리자도 자동 열람 불가.
begin;
alter table public.profiles add column if not exists is_research_member boolean not null default false;
revoke update (is_research_member) on public.profiles from public, anon, authenticated;
create or replace function public.set_research_member(p_user uuid, p_enabled boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.is_admin() then raise exception '관리자만 연구회회원 등급을 변경할 수 있습니다.'; end if;
  if p_enabled is null then raise exception '등급 값을 확인하세요.'; end if;
  update public.profiles set is_research_member = p_enabled where id = p_user;
  if not found then raise exception '회원을 찾을 수 없습니다.'; end if;
end $$;
revoke all on function public.set_research_member(uuid,boolean) from public, anon;
grant execute on function public.set_research_member(uuid,boolean) to authenticated;

alter table public.boards drop constraint if exists boards_write_permission_check;
alter table public.boards add constraint boards_write_permission_check check (write_permission in ('teacher','staff','research'));
insert into public.boards(slug,name,write_permission) values('research','연구회게시판','research')
on conflict(slug) do update set name=excluded.name, write_permission=excluded.write_permission;

-- boards RLS 내부에서 호출하므로 재귀를 피하기 위한 제한된 boolean 함수.
create or replace function public.can_read_board(p_board uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.boards b where b.id=p_board and
    (b.write_permission <> 'research' or exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_research_member)));
$$;
revoke all on function public.can_read_board(uuid) from public;
grant execute on function public.can_read_board(uuid) to anon, authenticated;
create or replace function public.can_write_board(p_board uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.boards b join public.profiles p on p.id=auth.uid() where b.id=p_board and
    ((b.write_permission='teacher' and p.is_teacher_verified)
    or (b.write_permission='research' and p.is_research_member)
    or (b.write_permission='staff' and public.is_staff())));
$$;
drop policy if exists boards_read on public.boards;
create policy boards_read on public.boards for select to anon, authenticated using(public.can_read_board(id));
drop policy if exists posts_read on public.posts;
create policy posts_read on public.posts for select to anon, authenticated using(deleted_at is null and public.can_read_board(board_id));
-- 42의 comments_board_read/write 정책은 posts RLS와 can_write_board를 통해 함께 보호됨.

create or replace function public.save_board_post_in_board(p_title text,p_body text,p_id uuid default null,p_slug text default 'free')
returns uuid language plpgsql security definer set search_path = public as $$
declare v_board uuid; v_author uuid; v_id uuid; v_scope text;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  if p_id is null then
    select id,write_permission into v_board,v_scope from public.boards where slug=p_slug;
  else
    select p.board_id,p.author_id,b.write_permission into v_board,v_author,v_scope
      from public.posts p join public.boards b on b.id=p.board_id
      where p.id=p_id and p.deleted_at is null and b.slug=p_slug for update of p;
    if not found or v_author <> auth.uid() then raise exception '수정 권한이 없습니다.'; end if;
  end if;
  if not public.can_write_board(v_board) then raise exception '작성 권한이 없습니다.'; end if;
  if p_title is null or char_length(btrim(p_title)) not between 1 and 100 then raise exception '제목은 1~100자로 입력하세요.'; end if;
  if p_body is null or char_length(btrim(p_body)) not between 1 and 100000 or
    btrim(regexp_replace(regexp_replace(p_body,'<[^>]*>','','g'),'&nbsp;|&#160;','','g'))='' then raise exception '본문 내용을 입력하세요.'; end if;
  if v_scope='research' and p_body ~* '<\s*(img|video|audio|iframe|object|embed|svg)\y' then
    raise exception '연구회게시판은 글과 링크만 작성할 수 있습니다.';
  end if;
  if p_id is null then
    insert into public.posts(board_id,author_id,title,body) values(v_board,auth.uid(),btrim(p_title),p_body) returning id into v_id;
  else
    update public.posts set title=btrim(p_title),body=p_body,updated_at=now() where id=p_id;
    v_id:=p_id;
  end if;
  return v_id;
end $$;
revoke all on function public.save_board_post_in_board(text,text,uuid,text) from public,anon;
grant execute on function public.save_board_post_in_board(text,text,uuid,text) to authenticated;
-- 기존 클라이언트와 42 검증 스크립트 호환. 자유게시판만 대상으로 제한.
create or replace function public.save_board_post(p_title text,p_body text,p_id uuid default null)
returns uuid language sql security invoker set search_path = public as $$
  select public.save_board_post_in_board(p_title,p_body,p_id,'free');
$$;

-- DB 관리자 권한으로 실행되는 기존 RPC에도 회원 범위를 강제한다.
create or replace function public.delete_board_post(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  update public.posts set deleted_at=now() where id=p_id and deleted_at is null
    and public.can_read_board(board_id) and (author_id=auth.uid() or public.is_staff());
  if not found then raise exception '글이 없거나 삭제 권한이 없습니다.'; end if;
end $$;
create or replace function public.pin_board_post(p_id uuid,p_pinned boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.is_staff() then raise exception '운영진만 고정할 수 있습니다.'; end if;
  update public.posts set pinned=p_pinned where id=p_id and deleted_at is null and public.can_read_board(board_id);
  if not found then raise exception '글이 없거나 권한이 없습니다.'; end if;
end $$;

-- 알림/신고의 스냅샷도 소속 게시판 권한을 따름. 탈퇴 후 기존 알림·신고도 읽을 수 없음.
alter table public.notifications add column if not exists board_id uuid references public.boards(id);
alter table public.reports add column if not exists board_id uuid references public.boards(id);
create or replace function public.board_notification_context()
returns trigger language plpgsql security definer set search_path = public as $$
declare p record;
begin
  if new.comment_id is not null then
    select posts.id,posts.title,posts.board_id,b.write_permission into p
      from public.comments c join public.posts on posts.id=c.post_id join public.boards b on b.id=posts.board_id where c.id=new.comment_id;
    if found then
      if p.write_permission='research' and not exists(select 1 from public.profiles where id=new.user_id and is_research_member) then return null; end if;
      new.board_id:=p.board_id; new.link:='/board/'||p.id::text; new.title:=p.title;
    end if;
  end if;
  return new;
end $$;
drop policy if exists notifications_board_read on public.notifications;
create policy notifications_board_read on public.notifications as restrictive for select to authenticated
  using(board_id is null or public.can_read_board(board_id));

create or replace function public.board_report_scope()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_board uuid;
begin
  if new.target_type='post' then
    select board_id into v_board from public.posts where id::text=new.target_id;
  elsif new.target_type='comment' then
    select p.board_id into v_board from public.comments c join public.posts p on p.id=c.post_id where c.id::text=new.target_id;
  end if;
  new.board_id:=v_board;
  if v_board is not null and not public.can_read_board(v_board) then raise exception '접근 권한이 없습니다.'; end if;
  return new;
end $$;
revoke all on function public.board_report_scope() from public,anon,authenticated;
drop trigger if exists board_report_scope on public.reports;
create trigger board_report_scope before insert on public.reports for each row execute function public.board_report_scope();
drop policy if exists reports_board_read on public.reports;
create policy reports_board_read on public.reports as restrictive for select to authenticated
  using(board_id is null or public.can_read_board(board_id));

-- 댓글 삭제 RPC는 RLS를 우회하므로 비회원 운영진의 연구회 댓글 삭제도 차단.
create or replace function public.delete_comment(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare c record;
begin
  select c1.author_id,c1.deleted_at,p.board_id into c from public.comments c1 left join public.posts p on p.id=c1.post_id where c1.id=p_id;
  if not found or auth.uid() is null then raise exception '권한이 없습니다.'; end if;
  if c.board_id is not null and not public.can_read_board(c.board_id) then raise exception '권한이 없습니다.'; end if;
  if auth.uid() <> c.author_id and not public.is_staff() then raise exception '권한이 없습니다.'; end if;
  update public.comments set deleted_at=coalesce(deleted_at,now()) where id=p_id;
end $$;
revoke all on function public.delete_comment(uuid) from public,anon;
grant execute on function public.delete_comment(uuid) to authenticated;
-- 답글 대상 검사도 비회원에게 존재 여부를 공개하지 않는다.
create or replace function public.can_reply_to_board_comment(p_parent uuid,p_post uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.comments c join public.posts p on p.id=c.post_id
    where c.id=p_parent and c.post_id=p_post and c.parent_id is null and c.deleted_at is null
      and p.deleted_at is null and public.can_read_board(p.board_id));
$$;

-- 이미 존재하는 스냅샷도 게시판 범위 연결(재실행 안전).
update public.notifications n set board_id=p.board_id from public.comments c join public.posts p on p.id=c.post_id where n.comment_id=c.id and n.board_id is distinct from p.board_id;
update public.reports r set board_id=p.board_id from public.posts p where r.target_type='post' and r.target_id=p.id::text and r.board_id is distinct from p.board_id;
update public.reports r set board_id=p.board_id from public.comments c join public.posts p on p.id=c.post_id where r.target_type='comment' and r.target_id=c.id::text and r.board_id is distinct from p.board_id;
commit;
