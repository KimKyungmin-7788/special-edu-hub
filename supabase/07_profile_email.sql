-- ============================================================
-- 07_profile_email.sql — 이메일 공개 토글 (개선)
--
-- 다른 사람이 내 프로필을 봤을 때 이메일이 보이려면 이메일 값이 필요한데,
-- auth.users.email 은 RLS 상 타인이 읽지 못한다. 그래서 profiles 에
-- 이메일 사본을 동기화해 두고, 공개 여부(email_public)로 노출을 제어한다.
--
--   email        : auth 이메일 사본. 본인이 못 바꾼다(GRANT 제외) → 위조/불일치 방지.
--   email_public : 공개 여부. 기본 false(비공개). 본인이 토글 가능.
--
-- 적용: Supabase 대시보드 > SQL Editor 에 붙여넣고 실행. 재실행 안전.
-- ============================================================

-- 1) 컬럼 추가
alter table public.profiles
  add column if not exists email        text,
  add column if not exists email_public boolean not null default false;

-- 2) 가입 트리거: 프로필 생성 시 이메일도 복사 (04_profiles.sql 함수 갱신)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nickname, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

-- 3) 백필: 이미 가입한 사용자 중 email 이 비어 있으면 채운다.
update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id
  and p.email is null;

-- 4) 본인이 토글할 수 있는 컬럼에 email_public 추가.
--    email 은 일부러 제외 — 본인이 못 바꾼다(auth 이메일과 동기 유지).
grant update (email_public) on public.profiles to authenticated;
