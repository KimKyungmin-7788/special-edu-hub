-- 61_seedling_apps.sql (2026-11-05, 처음엔 59 로 만들었으나 59_owner_delete·60 과 겹쳐 61 로 옮김)
-- 새싹자료 구분. Supabase SQL Editor에서 실행한다.
-- 기존 등록 권한·소유권·교사 전용 잠금과 저장소 정책은 그대로 유지한다.
-- 선행: 53_app_preview_video.sql. 재실행 가능.
begin;
alter table public.apps add column if not exists is_seedling boolean not null default false;
comment on column public.apps.is_seedling is '새싹자료방 자료 여부';

create or replace view public.apps_catalog as
select
  a.id,
  a.title,
  case when l.locked then '' else a.app_url end     as app_url,
  a.thumbnail_url,
  coalesce(nullif(btrim(p.nickname), ''), a.author_name) as author_name,
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
  a.comment_count,
  case when l.locked then '' else a.achievement_standards end as achievement_standards,
  case when l.locked then '' else a.educational_intent end    as educational_intent,
  case when l.locked then '' else a.use_case_type end         as use_case_type,
  case when l.locked then '' else a.use_case end              as use_case,
  case when l.locked then '{}'::text[] else a.achievement_codes end as achievement_codes,
  case when l.locked then null else a.preview_url end         as preview_url,
  a.is_seedling
from public.apps a
left join public.profiles p on p.id = a.owner_id
cross join lateral (
  select coalesce(
    a.visibility = 'teachers' and not public.can_view_teacher_content(a.owner_id),
    true  -- 판단 불가면 잠근다
  ) as locked
) l
where a.status = 'published'
   or (a.owner_id is not null and a.owner_id = auth.uid())
   or public.is_staff();

grant select on public.apps_catalog to anon, authenticated;
commit;
