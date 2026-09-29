-- ============================================================
-- 36_achievement_codes.sql — 관련 성취기준을 코드 목록으로 저장 (2026-09-29)
--
-- 자료 등록 폼의 "관련 성취기준 찾기" 모달에서 고른 성취기준을 코드 배열로 저장한다.
--  - achievement_codes : 성취기준 코드 배열. 배열 순서 = 입력자가 정한 순서. 최대 20개.
--                        예) '{"[12진로04-03]","[9진로04-03]"}'
--                        문장은 저장하지 않는다 — 화면에서 public/standards/standards-lite.json 으로 찾아 붙인다.
--  - 기존 achievement_standards(자유 입력, 35)는 그대로 둔다 → "목록에 없는 성취기준 메모" 용도로 계속 쓴다.
--
-- 코드 형식 검사: [숫자+교과약칭+영역2자리-번호2자리] (2022 개정 특수교육 기본 교육과정 표기)
-- 교사 전용(잠긴) 자료는 35 와 같이 뷰에서 가린다(빈 배열).
-- create or replace view 는 기존 컬럼 뒤에만 붙일 수 있으므로 맨 끝에 추가(35 의 뷰 정의 그대로 + 1칸).
--
-- 적용: Supabase 대시보드 > SQL Editor 에 붙여넣고 실행. 재실행 안전(idempotent).
-- ============================================================

alter table public.apps add column if not exists achievement_codes text[] not null default '{}';

alter table public.apps drop constraint if exists apps_achievement_codes_check;
alter table public.apps add  constraint apps_achievement_codes_check check (
  cardinality(achievement_codes) <= 20
  and array_to_string(achievement_codes, ',') ~ '^(\[[0-9]{1,2}[가-힣]+[0-9]{2}-[0-9]{2}\](,|$))*$'
);

-- 나중에 "이 성취기준과 연관된 자료 모아 보기"에 쓰는 색인
create index if not exists apps_achievement_codes_idx on public.apps using gin (achievement_codes);

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
