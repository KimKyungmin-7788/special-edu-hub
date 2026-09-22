-- ============================================================
-- 30_comment_count.sql — 자료별 댓글 수(comment_count) 자동 집계
--
--  - apps.comment_count: 삭제되지 않은 댓글 수. 좋아요(24)와 같은 트리거 방식.
--    작성 +1 / 소프트삭제(deleted_at 채워짐) -1 / 실제 삭제(cascade 등) -1.
--  - 기존 댓글 수는 아래 백필 UPDATE 로 한 번 채운다.
--  - apps_catalog 뷰 맨 끝에 comment_count 추가. 잠긴 자료도 "개수"는 공개(내용은 26 RLS 가 가림).
--
-- 적용: Supabase 대시보드 > SQL Editor 에 전체 붙여넣고(선택 영역 없이) 실행. 재실행 안전.
-- ============================================================

alter table public.apps
  add column if not exists comment_count integer not null default 0;

create or replace function public.bump_comment_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.deleted_at is null then
      update public.apps set comment_count = comment_count + 1 where id = new.app_id;
    end if;
    return new;
  elsif tg_op = 'UPDATE' then
    if old.deleted_at is null and new.deleted_at is not null then
      update public.apps set comment_count = greatest(comment_count - 1, 0) where id = new.app_id;
    elsif old.deleted_at is not null and new.deleted_at is null then
      update public.apps set comment_count = comment_count + 1 where id = new.app_id;
    end if;
    return new;
  else
    if old.deleted_at is null then
      update public.apps set comment_count = greatest(comment_count - 1, 0) where id = old.app_id;
    end if;
    return old;
  end if;
end;
$$;

drop trigger if exists comments_count_ins on public.comments;
drop trigger if exists comments_count_upd on public.comments;
drop trigger if exists comments_count_del on public.comments;
create trigger comments_count_ins after insert on public.comments
  for each row execute function public.bump_comment_count();
create trigger comments_count_upd after update of deleted_at on public.comments
  for each row execute function public.bump_comment_count();
create trigger comments_count_del after delete on public.comments
  for each row execute function public.bump_comment_count();

-- 백필: 기존 댓글 수 반영
update public.apps a
   set comment_count = coalesce(c.cnt, 0)
  from (
    select ap.id, count(cm.id) as cnt
      from public.apps ap
      left join public.comments cm on cm.app_id = ap.id and cm.deleted_at is null
     group by ap.id
  ) c
 where c.id = a.id;

create or replace view public.apps_catalog as
select
  a.id,
  a.title,
  case when l.locked then '' else a.app_url end     as app_url,
  a.thumbnail_url,
  a.author_name,
  case when l.locked then '' else a.description end as description,
  a.category_ids,
  a.view_count,
  a.like_count,
  a.bookmark_count,
  a.created_at,
  a.owner_id,
  a.status,
  a.sort_order,
  a.visibility,
  l.locked,
  p.avatar_url as owner_avatar_url,
  a.summary,
  a.comment_count
from public.apps a
left join public.profiles p on p.id = a.owner_id
cross join lateral (
  select coalesce(
    a.visibility = 'teachers' and not public.can_view_teacher_content(a.owner_id),
    true
  ) as locked
) l
where a.status = 'published'
   or (a.owner_id is not null and a.owner_id = auth.uid())
   or public.is_staff();

grant select on public.apps_catalog to anon, authenticated;
