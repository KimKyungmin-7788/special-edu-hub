-- ============================================================
-- 83_collab_body_richtext.sql — 협업 프로젝트 소개를 자료 작성과 같은 편집기(HTML)로 (2026-11-26)
--
-- 소개(body)가 사진·링크·서식이 들어간 HTML 이 되므로 길이 제한을 2000자 → 100000자로 늘린다
-- (게시판 42 와 같은 한도). 화면은 저장 전에 DOMPurify 로 정화하고, 보여 줄 때도 다시 정화한다.
--
-- 선행: 79. 적용: Supabase 대시보드 > SQL Editor 에 붙여넣고 실행. 재실행 안전(idempotent).
-- ============================================================

alter table public.collab_projects drop constraint if exists collab_projects_body_len;
alter table public.collab_projects add constraint collab_projects_body_len check (char_length(body) <= 100000);
