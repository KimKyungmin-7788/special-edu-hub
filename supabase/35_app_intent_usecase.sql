-- ============================================================
-- 35_app_intent_usecase.sql — 자료 등록 폼 개편: 성취기준·교육적 의도·활용사례 (2026-09-29)
--
-- 새 칸 (앱 등록·수정 폼 순서: 앱 이름 → 앱 링크 → 한줄 설명 → 카테고리 → 관련 성취기준(선택)
--        → 교육적 의도(필수) → 활용사례(선택, 종류 토글) → 자세한 설명 → 썸네일)
--  - achievement_standards : 관련 성취기준(선택, 자유 입력, 최대 500자)
--  - educational_intent    : 교육적 의도(폼에서 필수, 최대 1000자). 기존 자료는 '' 로 둔다.
--  - use_case_type         : 'field'(현장 활용 사례) | 'expected'(예상되는 현장 변화) | ''(미입력)
--  - use_case              : 활용사례 본문(선택, 최대 2000자)
--
-- 교사 전용(잠긴) 자료는 소개 본문처럼 이 내용도 뷰에서 가린다(성취기준·의도·활용사례).
-- create or replace view 는 기존 컬럼 뒤에만 붙일 수 있으므로 맨 끝에 추가(30 의 뷰 정의 그대로 + 4칸).
--
-- 적용: Supabase 대시보드 > SQL Editor 에 붙여넣고 실행. 재실행 안전(idempotent).
-- ============================================================

alter table public.apps add column if not exists achievement_standards text not null default '';
alter table public.apps add column if not exists educational_intent    text not null default '';
alter table public.apps add column if not exists use_case_type         text not null default '';
alter table public.apps add column if not exists use_case              text not null default '';

alter table public.apps drop constraint if exists apps_achievement_len;
alter table public.apps add  constraint apps_achievement_len check (char_length(achievement_standards) <= 500);
alter table public.apps drop constraint if exists apps_intent_len;
alter table public.apps add  constraint apps_intent_len check (char_length(educational_intent) <= 1000);
alter table public.apps drop constraint if exists apps_use_case_type_check;
alter table public.apps add  constraint apps_use_case_type_check check (use_case_type in ('', 'field', 'expected'));
alter table public.apps drop constraint if exists apps_use_case_len;
alter table public.apps add  constraint apps_use_case_len check (char_length(use_case) <= 2000);

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
  case when l.locked then '' else a.use_case end              as use_case
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
