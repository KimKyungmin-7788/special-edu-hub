-- ============================================================
-- 37_live_author_nickname.sql — 닉네임을 바꾸면 내가 쓴 자료의 작성자 이름도 함께 바뀜 (2026-10-01)
--
-- 문제: apps.author_name 은 자료를 등록할 때의 닉네임을 "복사해 저장"한 값이라,
--       프로필에서 닉네임을 바꿔도 목록 카드·상세 페이지의 작성자 이름이 그대로였다.
--       (댓글·수업 사례·쪽지는 profiles 를 조인해서 읽으므로 이미 바로 반영된다.)
--
-- 해결: apps_catalog 뷰의 author_name 을 profiles.nickname 에서 읽는다.
--  - 닉네임이 비어 있거나 작성자 프로필이 없으면(시드 자료 등) 저장된 apps.author_name 을 그대로 쓴다.
--  - 테이블 데이터는 건드리지 않는다. 뷰 정의만 바뀌므로 되돌리려면 36 의 뷰 정의를 다시 실행하면 된다.
--  - 컬럼 이름·순서·타입(text)이 36 과 같아서 create or replace view 로 안전하게 교체된다.
--  - 잠금 마스킹·공개 조건은 36 그대로.
--
-- 적용: Supabase 대시보드 > SQL Editor 에 붙여넣고 실행. 재실행 안전(idempotent).
-- ============================================================

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
  case when l.locked then '{}'::text[] else a.achievement_codes end as achievement_codes
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
