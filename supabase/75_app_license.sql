-- ============================================================
-- 75_app_license.sql — 자료 이용 조건(CCL) (2026-11-22)
--
-- 설계 요약
--  - 등록 교사가 "다른 선생님이 이 자료를 쓸 수 있는 조건"을 고른다.
--      by        = 출처 표시 (CC BY)
--      by_nc     = 출처 표시 · 비영리 (CC BY-NC)
--      by_nc_nd  = 출처 표시 · 비영리 · 변경 금지 (CC BY-NC-ND)
--      ask       = 허락받고 사용 (모든 권리 보유)
--  - 67 의 app_safety_declarations 에 칸 하나를 더한다. 저장할 때마다 새 줄이 쌓이므로
--    "언제 어떤 조건을 골랐는지" 이력이 그대로 남는다. 읽기·쓰기 권한은 67 정책을 그대로 따른다.
--  - 고른 적 없는 자료(null)는 화면에서 '허락받고 사용'으로 보여 준다(저작권법 기본 상태).
--
-- 선행: 67_app_safety.sql
-- 적용: Supabase 대시보드 > SQL Editor 에 붙여넣고 실행. 재실행 안전(idempotent).
--       ⚠️ 화면 코드 배포보다 먼저 실행한다(없으면 상세 화면의 안전 확인 정보를 읽지 못한다).
-- ============================================================

alter table public.app_safety_declarations
  add column if not exists license text;

alter table public.app_safety_declarations
  drop constraint if exists app_safety_declarations_license_check;
alter table public.app_safety_declarations
  add constraint app_safety_declarations_license_check
  check (license in ('by', 'by_nc', 'by_nc_nd', 'ask'));

-- ── 적용 확인 ────────────────────────────────────────────
-- select column_name, data_type from information_schema.columns
--  where table_schema = 'public' and table_name = 'app_safety_declarations' and column_name = 'license';
--   → license | text
