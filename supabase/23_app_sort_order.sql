-- ============================================================
-- 23_app_sort_order.sql — 앱 수동 정렬(과목 페이지 순서 조정) (5단계)
--
-- 설계 요약
--  - 운영진이 과목 페이지의 앱 노출 순서를 직접 조정할 수 있게 한다.
--  - 전역 단일 정수 sort_order 1개(앱은 보통 한 과목에만 속하므로 사실상 과목별 순서).
--  - 정렬 기준: sort_order ASC NULLS LAST, created_at DESC
--    (아직 순서 미지정 앱은 기존처럼 최신순으로 뒤에 붙는다).
--  - 쓰기 권한: apps UPDATE 정책이 이미 owner 또는 staff(15_roles) → 추가 권한 불필요.
--    운영진이 sort_order 만 바꾸는 것도 이 정책으로 허용된다.
--
-- 적용: Supabase 대시보드 > SQL Editor 에 붙여넣고 실행. 재실행 안전(idempotent).
-- 선행: 01_schema.sql(apps), 12/15(apps 쓰기 정책).
-- ============================================================

alter table public.apps
  add column if not exists sort_order integer;

-- 목록 정렬 가속(미지정은 뒤로).
create index if not exists apps_sort_order_idx
  on public.apps (sort_order asc nulls last, created_at desc);
