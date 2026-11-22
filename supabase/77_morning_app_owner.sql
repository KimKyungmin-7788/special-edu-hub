-- ============================================================
-- 77_morning_app_owner.sql — '아침 열기' 자료 작성자 변경 (2026-11-23, 운영자 요청)
--
-- 특수학급 데일리 루틴앱 "아침 열기" (apps.id c38b35f2-e5a4-4cdd-92b3-b8e6f6a8b7c5)
--   지금 작성자: 김선생      (profiles.id fa5b28bc-c90b-4446-9281-d508b7ba5b0d)
--   바꿀 작성자: 강릉김선생  (profiles.id 02d4adee-e18a-4955-97f4-222feff63718)
--
-- - 목록·상세의 작성자 이름은 작성자 계정의 닉네임을 그대로 보여 주므로(37) owner_id 를 바꾸면 이름도 바뀐다.
--   예비로 저장해 둔 author_name 도 함께 맞춘다.
-- - 공개·점검 상태는 그대로 둔다(68 의 apps_guard_review 가 앱 주소가 같으면 상태를 유지한다).
-- - 지난 안전 확인 정보 이력(declared_by)은 당시 기록이라 고치지 않는다.
-- 적용: Supabase 대시보드 > SQL Editor 에 붙여넣고 실행. 재실행 안전(이미 바뀌었으면 아무것도 안 바뀐다).
-- ============================================================

update public.apps
   set owner_id    = '02d4adee-e18a-4955-97f4-222feff63718',
       author_name = '강릉김선생'
 where id = 'c38b35f2-e5a4-4cdd-92b3-b8e6f6a8b7c5'
   and owner_id = 'fa5b28bc-c90b-4446-9281-d508b7ba5b0d';

-- ── 적용 확인 ────────────────────────────────────────────
-- select a.title, a.owner_id, p.nickname, a.review_status
--   from public.apps a join public.profiles p on p.id = a.owner_id
--  where a.id = 'c38b35f2-e5a4-4cdd-92b3-b8e6f6a8b7c5';
--   → 특수학급 데일리 루틴앱 "아침 열기" | 02d4adee-… | 강릉김선생 | (원래 상태 그대로)
