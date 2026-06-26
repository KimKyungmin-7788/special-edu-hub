-- ============================================================
-- 13_nickname_onboarding.sql — 닉네임 첫 로그인 온보딩 (묶음 H)
--
-- 변경 의도
--  - 기존: 가입 트리거가 닉네임을 "구글 이름 → 없으면 이메일 앞자리"로 자동 설정.
--    이메일 앞자리(예: baladunman)가 별로라 → 이메일 앞자리 fallback 제거.
--  - nickname_set: 사용자가 닉네임을 직접 확정했는지 여부.
--    false 인 동안 첫 로그인 온보딩 모달이 닉네임을 묻는다(이름이 있어도 항상).
--  - 트리거는 구글 이름이 있으면 "초기값"으로만 넣어둠(온보딩에서 바꿀 수 있음),
--    없으면 비움(null). 이메일 앞자리는 더 이상 쓰지 않는다.
--
-- 적용: 대시보드 SQL Editor 에 붙여넣고 Run. 재실행 안전(idempotent).
-- 주의: 기존 사용자도 nickname_set 기본 false → 다음 로그인에 한 번 온보딩이 뜬다
--       (현재 닉네임이 초기값으로 채워져 있어 그대로 두거나 바꿔 확정).
-- ============================================================

-- ── 컬럼 추가 ─────────────────────────────────────────────
alter table public.profiles
  add column if not exists nickname_set boolean not null default false;

-- 사용자가 온보딩에서 nickname_set 을 직접 true 로 올릴 수 있게 GRANT 에 추가.
-- (additive — 기존 컬럼 GRANT 는 건드리지 않는다.)
grant update (nickname_set) on public.profiles to authenticated;

-- ── 가입 트리거: 이메일 앞자리 fallback 제거 ──────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nickname)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'full_name', '')  -- 구글 이름 있으면 초기값, 없으면 null
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
