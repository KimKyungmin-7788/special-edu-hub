-- ============================================================
-- 11_recategorize.sql — 카테고리 재구성 (3단계 진입 전)
--
-- 카테고리 정의(이름·아이콘)는 src/config/categories.ts 에서 관리한다.
-- 여기서는 이미 적용된 apps.category_ids 배열을 새 id 로 옮기기만 한다.
--
--   music + art + pe          → arts            (음악/미술/체육)
--   social + science          → social-science  (사회/과학)
--   career(진로직업→진로와직업) → 이름만 변경, id 유지(작업 없음)
--
-- 적용: Supabase 대시보드 > SQL Editor 에 붙여넣고 실행. 재실행 안전(idempotent).
-- ============================================================

-- music / art / pe → arts (중복 제거)
update public.apps
set category_ids = (
  select array_agg(distinct e)
  from unnest(
    array_replace(array_replace(array_replace(category_ids,
      'music', 'arts'), 'art', 'arts'), 'pe', 'arts')
  ) as e
)
where category_ids && array['music','art','pe'];

-- social / science → social-science (중복 제거)
update public.apps
set category_ids = (
  select array_agg(distinct e)
  from unnest(
    array_replace(array_replace(category_ids,
      'social', 'social-science'), 'science', 'social-science')
  ) as e
)
where category_ids && array['social','science'];
