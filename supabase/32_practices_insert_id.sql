-- ============================================================
-- 32_practices_insert_id.sql — 31 버그픽스: 사례 등록 시 id 컬럼 INSERT 권한 누락
--
-- 증상: 인증교사가 사례를 올리면 "permission denied for table practices".
-- 원인: 31 에서 컬럼 단위 INSERT 권한을 줄 때 id 를 빠뜨림(클라이언트가 id 를 만들어 보냄).
-- 적용: Supabase 대시보드 > SQL Editor 에 붙여넣고 실행. 재실행 안전.
-- ============================================================

grant insert (id) on public.practices to authenticated;
