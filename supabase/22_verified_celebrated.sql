-- ============================================================
-- 22_verified_celebrated.sql — 교사인증 축하 팝업 "최초 1회"를 서버 플래그로 (버그픽스)
--
-- 문제: 축하 팝업 노출 1회 여부를 브라우저 localStorage 로만 기억해
--       다른 브라우저·시크릿창·저장소 정리 시 매번 다시 떴다(계정 기준 1회가 아님).
-- 해결: nickname_set 과 같은 패턴으로 profiles 에 verified_celebrated 플래그를 둔다.
--       팝업을 닫으면 본인 행의 이 값을 true 로 올리고, 이후로는 띄우지 않는다.
--
-- 적용: Supabase 대시보드 > SQL Editor 에 붙여넣고 실행. 재실행 안전(idempotent).
-- 선행: 04_profiles.sql(profiles, self_update 정책), 09/10(is_teacher_verified).
-- ============================================================

-- 축하 팝업을 이미 봤는지(계정 기준). 기본 false.
alter table public.profiles
  add column if not exists verified_celebrated boolean not null default false;

-- 본인이 이 컬럼을 직접 true 로 올릴 수 있게 GRANT 에 추가(profiles_self_update 정책이 본인 행으로 제한).
grant update (verified_celebrated) on public.profiles to authenticated;

-- 기존 인증 사용자는 그동안 (반복) 노출됐으므로 celebrated=true 로 백필 → 더는 안 뜸.
-- 앞으로 새로 인증되는 사용자는 false 로 시작 → 최초 1회만 노출된 뒤 true 가 된다.
update public.profiles
   set verified_celebrated = true
 where is_teacher_verified = true and verified_celebrated = false;
