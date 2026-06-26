-- ============================================================
-- 10_auto_verify.sql — @gw1.kr 자동 교사인증 (2단계 묶음 D-3)
--
-- profiles INSERT/UPDATE 시 email 이 @gw1.kr 로 끝나면
-- is_teacher_verified 를 자동으로 true 로 설정한다.
--
-- BEFORE 트리거로 new 를 직접 수정 → 별도 UPDATE 불필요.
-- 로그인 방식(이메일·Google OAuth 등)에 무관하게 작동한다.
--
-- 적용: Supabase 대시보드 > SQL Editor 에 붙여넣고 실행. 재실행 안전(idempotent).
-- ============================================================

create or replace function public.on_profile_auto_verify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email ilike '%@gw1.kr' then
    new.is_teacher_verified := true;
  end if;
  return new;
end;
$$;

-- INSERT 시 자동인증
drop trigger if exists trg_profile_auto_verify_insert on public.profiles;
create trigger trg_profile_auto_verify_insert
  before insert on public.profiles
  for each row execute function public.on_profile_auto_verify();

-- UPDATE 시 자동인증 (Google 로그인 추가 등으로 email 갱신되는 경우 대비)
drop trigger if exists trg_profile_auto_verify_update on public.profiles;
create trigger trg_profile_auto_verify_update
  before update of email on public.profiles
  for each row execute function public.on_profile_auto_verify();

-- ── 기존 가입자 소급 적용 ────────────────────────────────
-- 이미 가입된 @gw1.kr 계정이 있을 경우를 대비해 한 번 일괄 갱신한다.
-- 신규 가입만 있다면 0건 업데이트로 무해하게 끝난다.
update public.profiles
set is_teacher_verified = true
where email ilike '%@gw1.kr'
  and is_teacher_verified = false;
