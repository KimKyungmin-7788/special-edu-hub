-- ============================================================
-- 29_app_summary.sql — 자료 한줄 소개(summary, 최대 40자)
--
--  - apps.summary: 선택 입력(기본 ''). DB 에서도 40자 제한(check) — 폼을 거치지 않은 입력도 차단.
--  - apps_catalog 뷰 맨 끝에 summary 추가. 한줄 소개는 제목처럼 "어떤 자료인지" 알리는
--    공개 정보라 잠긴 자료에서도 마스킹하지 않는다(app_url·description 만 가림, 27 그대로).
--
-- 적용: Supabase 대시보드 > SQL Editor 에 붙여넣고 실행. 재실행 안전(idempotent).
-- ============================================================

alter table public.apps
  add column if not exists summary text not null default '';

alter table public.apps drop constraint if exists apps_summary_length_check;
alter table public.apps
  add constraint apps_summary_length_check check (char_length(summary) <= 40);

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
  a.summary
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
