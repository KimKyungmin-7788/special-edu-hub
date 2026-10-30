-- ============================================================
-- 47_email_notifications.sql — 단계별 안내 메일 자동 발송 (2026-10-30)
--
-- 설계 요약 (사용자 결정 2026-10-30)
--  - 공식 도메인 개설 전까지 운영자 개인 지메일로 보낸다. 실제 발송은 Vercel 서버 함수
--    api/send-email.ts(nodemailer + 지메일 앱 비밀번호)가 한다. 회원이 답장하면 그 지메일로 온다.
--  - 이 SQL 은 "언제 보낼지"만 정한다. 아래 순간에 DB 트리거가 pg_net 으로 서버 함수를 부른다.
--      welcome           : 가입하고 이메일 확인이 끝난 순간(구글 로그인은 가입 즉시)
--      verify_received   : 교사인증 신청 접수(신청자) + staff_new_request(운영자)
--      verify_approved   : profiles.is_teacher_verified 가 false → true
--      verify_rejected   : verification_requests.status 가 rejected 로 바뀜(사유 포함)
--  - 서버 주소와 비밀값은 Supabase Vault 에 둔다(아래 "적용 순서" 2번). 비어 있으면 아무것도
--    보내지 않는다 → 설정 전에 이 SQL 을 먼저 실행해도 가입·인증은 그대로 동작한다.
--  - 메일 발송이 실패해도 가입·신청·승인은 절대 막지 않는다(예외를 삼킨다).
--  - email_log: 언제 무엇을 누구에게 요청했는지 기록. 운영진만 읽는다.
--  - 공지·뉴스(여러 회원에게 한꺼번에)는 받기 동의·받기 거부가 필요해 다음 묶음에서.
--
-- 적용 순서
--  1) 이 파일 전체를 SQL Editor 에서 실행. 재실행 안전(idempotent).
--  2) Vercel 에 환경변수를 넣고 배포한 뒤, SQL Editor 에서 한 번만 실행(값은 직접 채움):
--       select vault.create_secret('https://<배포 주소>/api/send-email', 'email_webhook_url');
--       select vault.create_secret('<Vercel 의 EMAIL_WEBHOOK_SECRET 과 같은 값>', 'email_webhook_secret');
--     값을 바꿀 때는 vault.update_secret(id, '새 값') — id 는 vault.secrets 에서 name 으로 찾는다.
--
-- 선행: 04·07(profiles), 09·25(verification_requests), 15(is_staff).
-- ============================================================

create extension if not exists pg_net with schema extensions;

-- ── 1. 발송 기록 ─────────────────────────────────────────
create table if not exists public.email_log (
  id          bigint      generated always as identity primary key,
  kind        text        not null,
  user_id     uuid        references public.profiles (id) on delete set null,
  to_email    text,                       -- 운영자 알림은 null(서버가 운영자 주소로 보냄)
  request_id  bigint,                     -- pg_net 요청 번호(net._http_response 에서 결과 확인)
  error       text,                       -- 요청 자체를 못 만든 경우의 오류
  created_at  timestamptz not null default now()
);

alter table public.email_log enable row level security;

drop policy if exists "email_log_staff_read" on public.email_log;
create policy "email_log_staff_read" on public.email_log
  for select to authenticated using (public.is_staff());

revoke insert, update, delete on public.email_log from anon, authenticated;

-- ── 2. 발송 요청 함수 ────────────────────────────────────
-- p_to 가 null 이면 운영자 알림. 회원 메일은 auth.users 의 이메일을 쓴다(위조 불가).
create or replace function public.request_email(
  p_kind  text,
  p_user  uuid,
  p_to    text,
  p_data  jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url      text;
  v_secret   text;
  v_nickname text;
  v_req      bigint;
begin
  select decrypted_secret into v_url
    from vault.decrypted_secrets where name = 'email_webhook_url';
  select decrypted_secret into v_secret
    from vault.decrypted_secrets where name = 'email_webhook_secret';
  if v_url is null or v_secret is null then
    return; -- 아직 설정 전: 조용히 건너뛴다
  end if;

  select nickname into v_nickname from public.profiles where id = p_user;

  begin
    select net.http_post(
      url     := v_url,
      body    := jsonb_build_object(
                   'kind', p_kind,
                   'to', p_to,
                   'nickname', coalesce(v_nickname, ''),
                   'data', coalesce(p_data, '{}'::jsonb)
                 ),
      headers := jsonb_build_object(
                   'Content-Type', 'application/json',
                   'x-email-secret', v_secret
                 ),
      timeout_milliseconds := 10000
    ) into v_req;

    insert into public.email_log (kind, user_id, to_email, request_id)
    values (p_kind, p_user, p_to, v_req);
  exception when others then
    insert into public.email_log (kind, user_id, to_email, error)
    values (p_kind, p_user, p_to, sqlerrm);
  end;
exception when others then
  -- 기록조차 실패해도 원래 작업(가입·신청·승인)은 계속된다
  return;
end;
$$;

revoke execute on function public.request_email(text, uuid, text, jsonb) from public, anon, authenticated;

-- ── 3. 가입 환영 ─────────────────────────────────────────
-- 이메일 가입: 확인 링크를 누른 순간(email_confirmed_at 이 채워질 때).
-- 구글 로그인: 가입하면서 바로 확인됨(insert 때 이미 채워져 있음).
-- profiles 행은 04 의 on_auth_user_created 가 먼저 만든다(트리거는 이름 순으로 실행).
create or replace function public.email_on_user_confirmed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email_confirmed_at is not null
     and (tg_op = 'INSERT' or old.email_confirmed_at is null)
     and new.email is not null then
    perform public.request_email('welcome', new.id, new.email);
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_welcome on auth.users;
create trigger on_auth_user_email_welcome
  after insert or update of email_confirmed_at on auth.users
  for each row execute function public.email_on_user_confirmed();

-- ── 4. 교사인증 신청 접수 (신청자 + 운영자) ─────────────
create or replace function public.email_on_verify_requested()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  select email into v_email from auth.users where id = new.user_id;
  if v_email is not null then
    perform public.request_email('verify_received', new.user_id, v_email);
  end if;
  perform public.request_email('staff_new_request', new.user_id, null,
    jsonb_build_object(
      'school', coalesce(new.school, ''),
      'applicantName', coalesce(new.applicant_name, ''),
      'email', coalesce(v_email, '')
    ));
  return new;
end;
$$;

drop trigger if exists email_verify_requested on public.verification_requests;
create trigger email_verify_requested
  after insert on public.verification_requests
  for each row execute function public.email_on_verify_requested();

-- ── 5. 교사인증 승인 ─────────────────────────────────────
-- set_teacher_verified(25) 와 신청 승인(09 트리거) 모두 결국 이 칼럼을 바꾼다 → 한 번만 보낸다.
create or replace function public.email_on_verified()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  if new.is_teacher_verified and not coalesce(old.is_teacher_verified, false) then
    select email into v_email from auth.users where id = new.id;
    if v_email is not null then
      perform public.request_email('verify_approved', new.id, v_email);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists email_verified on public.profiles;
create trigger email_verified
  after update of is_teacher_verified on public.profiles
  for each row execute function public.email_on_verified();

-- ── 6. 교사인증 반려 ─────────────────────────────────────
create or replace function public.email_on_verify_rejected()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  if new.status = 'rejected' and coalesce(old.status, '') <> 'rejected' then
    select email into v_email from auth.users where id = new.user_id;
    if v_email is not null then
      perform public.request_email('verify_rejected', new.user_id, v_email,
        jsonb_build_object('reason', coalesce(new.reject_reason, '')));
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists email_verify_rejected on public.verification_requests;
create trigger email_verify_rejected
  after update of status on public.verification_requests
  for each row execute function public.email_on_verify_rejected();
