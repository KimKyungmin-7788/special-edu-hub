-- ============================================================
-- 58_member_email.sql — 가입 이메일: 관리자만 보기, 공개 프로필 이메일, 문의 답장 주소, 유출 차단
--
-- 배경
--  - 07 에서 profiles.email 에 가입 이메일 사본을 두었지만, 13 이 가입 함수를 다시 만들며 복사가 빠졌다.
--    그 뒤 가입한 회원은 email 이 비어 → 관리자 회원 목록 '—', 로그인 문의 접수 실패('email required').
--  - profiles 는 공개 읽기라, 사본이 남은 회원의 이메일은 공개를 꺼 둬도 누구나 읽을 수 있었다.
--
-- 바꾸는 것 (이메일은 늘 auth.users 원본에서, 함수로만 꺼낸다)
--  1. admin_member_emails(): 관리자(is_admin)만 전체 회원 가입 이메일을 받는다.
--  2. profile_email(id): 이메일 공개를 켠 회원·본인·관리자 것만 돌려준다(프로필 미리보기용).
--  3. submit_inquiry: 로그인 사용자의 답장 주소를 auth.users 에서 가져온다.
--  4. profiles.email 칸은 anon/authenticated 가 직접 읽지 못하게 하고, 남은 사본은 비운다.
--     ⚠️ 이후 profiles 에 칸을 새로 만들면 그 칸의 select 권한도 따로 줘야 한다(아래 4번처럼).
--
-- 선행: 07, 09(is_admin), 21. 적용: SQL Editor 에 붙여넣고 실행. 재실행 안전.
-- 번호: 2026-10-30 에 46 으로 만들었으나 46_comment_images 와 겹쳐 2026-11-04 에 58 로 옮김(내용 같음).
--       47~57 과 부딪히지 않음 확인: 메일 함수(47·48)는 auth.users 에서 이메일을 읽고, submit_inquiry 는 이후에 다시 만들지 않음.
-- ============================================================
begin;

-- ── 1. 관리자용 회원 이메일 ──────────────────────────────
create or replace function public.admin_member_emails()
returns table (id uuid, email text)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception '관리자만 회원 이메일을 볼 수 있습니다.';
  end if;
  return query select u.id, u.email::text from auth.users u;
end $$;
revoke all on function public.admin_member_emails() from public, anon;
grant execute on function public.admin_member_emails() to authenticated;

-- ── 2. 공개 프로필 이메일 ────────────────────────────────
create or replace function public.profile_email(p_id uuid)
returns text
language sql stable security definer set search_path = public, auth as $$
  select u.email::text
  from auth.users u join public.profiles p on p.id = u.id
  where u.id = p_id and (p.email_public or u.id = auth.uid() or public.is_admin());
$$;
revoke all on function public.profile_email(uuid) from public;
grant execute on function public.profile_email(uuid) to anon, authenticated;

-- ── 3. 문의 접수: 답장 주소를 계정 이메일 원본에서 ─────────
create or replace function public.submit_inquiry(
  p_type    text,
  p_subject text,
  p_body    text,
  p_email   text
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid   uuid := auth.uid();
  mail  text := nullif(btrim(coalesce(p_email, '')), '');
begin
  if p_type not in ('suggestion','request','bug','other') then
    raise exception 'invalid type';
  end if;
  if nullif(btrim(coalesce(p_subject, '')), '') is null
     or nullif(btrim(coalesce(p_body, '')), '') is null then
    raise exception 'subject and body required';
  end if;

  -- 로그인 사용자는 계정 이메일로 대체 가능. 비로그인은 이메일 필수.
  if uid is not null and mail is null then
    select u.email::text into mail from auth.users u where u.id = uid;
  end if;
  if mail is null then
    raise exception 'email required';
  end if;

  insert into public.inquiries (user_id, email, type, subject, body)
  values (uid, mail, p_type, btrim(p_subject), btrim(p_body));
end;
$$;
grant execute on function public.submit_inquiry(text, text, text, text) to anon, authenticated;

-- ── 4. profiles.email 직접 읽기 차단 ────────────────────
-- 표 전체 읽기 권한을 거두고, email 을 뺀 나머지 칸만 다시 준다(칸 목록은 지금 표에서 읽는다).
revoke select on public.profiles from anon, authenticated;
do $$
declare c text;
begin
  for c in
    select column_name from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name <> 'email'
  loop
    execute format('grant select (%I) on public.profiles to anon, authenticated', c);
  end loop;
end $$;
update public.profiles set email = null where email is not null;

commit;
