-- ============================================================
-- 27_fix_visibility_null.sql — 26 버그픽스: 비로그인에게 교사 전용 내용이 노출되던 문제
--
-- 원인: can_view_teacher_content() 가 비로그인(auth.uid()=null)일 때 false 가 아니라
--       null 을 돌려줬다( null = x → null ). apps_catalog 뷰의 locked 가 null 이 되어
--       case when null → else(원문) 로 app_url·description 이 그대로 나갔다.
--       (원본 apps·댓글 RLS 는 null 을 거부로 처리해 막혀 있었음)
-- 해결: 함수 결과를 coalesce(…, false) 로 확정 + 뷰의 locked 계산도 coalesce 로 이중 안전.
--
-- 적용: Supabase 대시보드 > SQL Editor 에 붙여넣고 실행. 재실행 안전(idempotent).
-- ============================================================

create or replace function public.can_view_teacher_content(app_owner uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (app_owner is not null and app_owner = auth.uid())
      or public.is_verified_teacher()
      or public.is_staff(),
    false
  );
$$;

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
  l.locked
from public.apps a
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
