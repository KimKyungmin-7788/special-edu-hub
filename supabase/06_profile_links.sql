-- ============================================================
-- 06_profile_links.sql — profiles 홍보 링크 정리 (2단계 묶음 C 후속)
--
-- 변경 내용
--   1) youtube_url 컬럼 추가 (홍보 링크: 블로그·인스타·유튜브·사이트)
--   2) 본인이 수정 가능한 "안전한" 컬럼 목록(GRANT)에 youtube_url 추가
--
-- 한 줄 소개(bio)는 더 이상 편집/표시하지 않지만,
-- 데이터 보존을 위해 컬럼은 그대로 둔다(DROP 하지 않음).
--
-- 적용: Supabase 대시보드 > SQL Editor 에 붙여넣고 실행.
-- 여러 번 실행해도 안전(idempotent).
-- ============================================================

-- 1) 유튜브 채널 링크 컬럼
alter table public.profiles
  add column if not exists youtube_url text;

-- 2) 본인이 UPDATE 할 수 있는 컬럼에 youtube_url 추가.
--    (04_profiles.sql 의 grant update 와 누적된다. role/is_teacher_verified 는
--     계속 제외되어 권한 상승은 차단된 상태 그대로 유지.)
grant update (youtube_url) on public.profiles to authenticated;
