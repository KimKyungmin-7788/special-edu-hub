-- ============================================================
-- 28_catalog_owner_avatar.sql — 목록 카드에 작성자 프로필 사진 표시
--
-- apps_catalog 뷰(26·27)에 작성자 아바타(owner_avatar_url) 컬럼을 덧붙인다.
-- 카드마다 프로필을 따로 불러오지 않도록 뷰에서 profiles 를 함께 조인한다.
-- 아바타는 공개 정보(profiles 공개읽기·avatars 공개버킷)라 잠긴 자료에서도 노출해도 된다.
-- 잠금 마스킹(locked·app_url·description) 로직은 27 그대로 유지.
--
-- create or replace view 는 기존 컬럼 뒤에 새 컬럼을 붙이는 것만 허용 → 맨 끝에 추가.
-- 적용: Supabase 대시보드 > SQL Editor 에 붙여넣고 실행. 재실행 안전(idempotent).
-- ============================================================

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
  p.avatar_url as owner_avatar_url
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
