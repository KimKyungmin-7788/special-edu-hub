-- ============================================================
-- 72_practice_plan.sql — 수업실천사례 지도안 양식 (PRD §13.6)
--
--  - practices.plan : 지도안 양식으로 쓴 사례의 내용(jsonb). null = 자유 본문 글(기존 글 모두).
--      { unit, standards[], goals{ga,na,da}, tools[], groups[{level,performance,content,method,highTouch}],
--        lessons[{minutes, intro{text,tool}, main{text,tool}, wrap{text,tool}}], evaluation, reaction, reflection }
--    등록 자료 연결은 지금처럼 practice_apps(양방향 조회), 바깥 도구 이름만 plan.tools 에 둔다.
--  - 뷰 practices_catalog 끝에 plan 을 붙인다(잠긴 사례는 null — 본문과 같은 규칙).
--
-- 선행: 31. 적용: SQL Editor 에 붙여넣고 실행. 재실행 안전.
-- ============================================================

alter table public.practices
  add column if not exists plan jsonb;

alter table public.practices drop constraint if exists practices_plan_shape;
alter table public.practices
  add constraint practices_plan_shape check (
    plan is null
    or (jsonb_typeof(plan) = 'object' and pg_column_size(plan) <= 65536)
  );

-- 31 이 칼럼별로 쓰기 권한을 주므로 새 칸도 따로 준다.
grant insert (plan), update (plan) on public.practices to authenticated;

create or replace view public.practices_catalog as
select
  pr.id,
  pr.owner_id,
  pr.title,
  pr.summary,
  pr.cover_url,
  pr.category_ids,
  pr.target,
  pr.lesson_count,
  case when l.locked then ''         else pr.body  end as body,
  case when l.locked then '[]'::jsonb else pr.links end as links,
  case when l.locked then '[]'::jsonb else pr.files end as files,
  jsonb_array_length(pr.files) as file_count,
  pr.visibility,
  pr.status,
  pr.view_count,
  pr.like_count,
  pr.bookmark_count,
  pr.comment_count,
  pr.created_at,
  pr.updated_at,
  l.locked,
  p.nickname   as owner_nickname,
  p.avatar_url as owner_avatar_url,
  case when l.locked then null else pr.plan end as plan
from public.practices pr
left join public.profiles p on p.id = pr.owner_id
cross join lateral (
  select coalesce(
    pr.visibility = 'teachers' and not public.can_view_teacher_content(pr.owner_id),
    true
  ) as locked
) l
where pr.status = 'published'
   or pr.owner_id = auth.uid()
   or public.is_staff();

grant select on public.practices_catalog to anon, authenticated;
