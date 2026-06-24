-- 2단계-B1: profiles 테이블 + RLS + 가입 시 자동 생성 트리거
-- auth.users 1행 ↔ profiles 1행. id 가 곧 auth 사용자 id.
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 Run.
--
-- 권한 설계(중요):
--  - 읽기: 누구나(프로필 미리보기 모달 등에서 타인 프로필 표시 — 묶음 C).
--  - 수정: 본인 행만(RLS).
--  - 단, role / is_teacher_verified 는 일반 사용자가 못 바꾼다(권한 상승 차단).
--    행 권한은 RLS, "어떤 컬럼을 고칠 수 있나"는 GRANT 로 잠근다.
--    교사인증·권한 변경은 관리자(Studio/service_role)만 — 묶음 D에서 사용.

-- ── 테이블 ────────────────────────────────────────────────
create table if not exists public.profiles (
  id                  uuid    primary key references auth.users (id) on delete cascade,
  nickname            text,
  avatar_url          text,
  bio                 text,
  blog_url            text,
  instagram_url       text,
  website_url         text,
  is_teacher_verified boolean not null default false,
  role                text    not null default 'member'
                              check (role in ('member', 'teacher', 'admin')),
  created_at          timestamptz not null default now()
);

-- ── RLS ──────────────────────────────────────────────────
alter table public.profiles enable row level security;

-- 누구나(anon 포함) 읽기
create policy "profiles_public_read"
  on public.profiles
  for select
  to anon, authenticated
  using (true);

-- 본인 행만 수정
create policy "profiles_self_update"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ── 권한 상승 차단(컬럼 단위 GRANT) ───────────────────────
-- 일반 사용자는 아래 "안전한" 컬럼만 UPDATE 가능.
-- role / is_teacher_verified 는 빠져 있어 변경 시 권한 거부된다.
-- service_role(서버·관리자)은 회수 대상이 아니라 전체 수정 가능 → 인증 토글은 관리자만.
revoke update on public.profiles from anon, authenticated;
grant update (nickname, avatar_url, bio, blog_url, instagram_url, website_url)
  on public.profiles to authenticated;

-- ── 가입 시 자동 생성 트리거 ──────────────────────────────
-- security definer: 트리거가 RLS 를 우회해 행을 만든다(클라이언트 INSERT 불필요).
-- 닉네임 기본값: OAuth 이름(있으면) → 없으면 이메일 아이디 부분.
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
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── 백필: 트리거 만들기 전에 이미 가입한 사용자 채우기 ─────
insert into public.profiles (id, nickname)
select u.id,
       coalesce(u.raw_user_meta_data ->> 'full_name', split_part(u.email, '@', 1))
from auth.users u
on conflict (id) do nothing;
