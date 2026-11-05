-- ============================================================
-- 60_admin_member_names.sql — 회원 관리에 구글 이름·인증 실명 보이기 (2026-11-05)
--
-- 설계 요약
--  - admin_member_names(): 관리자(is_admin)만 회원별 이름 두 가지를 받는다.
--      google_name : 구글 가입 때 구글이 넘겨준 계정 이름(auth.users.raw_user_meta_data.full_name)
--      real_name   : 교사인증이 끝난 회원이 인증 신청 때 적은 성함(가장 최근 승인 건)
--  - 이메일(58 의 admin_member_emails)과 같은 범위: 관리자만. 다른 회원·비로그인에게는 보이지 않는다.
--  - 테이블·칸은 새로 만들지 않는다(읽기 함수만).
--
-- 적용: Supabase 대시보드 > SQL Editor 에 전체 붙여넣고 실행. 재실행 안전(idempotent).
-- 선행: 09(verification_requests·is_admin), 25(applicant_name).
-- ============================================================
begin;

create or replace function public.admin_member_names()
returns table (id uuid, google_name text, real_name text)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception '관리자만 회원 이름을 볼 수 있습니다.';
  end if;
  return query
    select u.id,
           nullif(btrim(u.raw_user_meta_data ->> 'full_name'), '')::text,
           case when p.is_teacher_verified then (
             select nullif(btrim(v.applicant_name), '')
             from public.verification_requests v
             where v.user_id = u.id and v.status = 'approved'
             order by v.created_at desc
             limit 1
           ) end::text
    from auth.users u
    join public.profiles p on p.id = u.id;
end $$;
revoke all on function public.admin_member_names() from public, anon;
grant execute on function public.admin_member_names() to authenticated;

commit;

-- 확인(선택): 관리자 계정으로 로그인한 화면에서만 값이 나온다. SQL Editor 에서는 auth.uid() 가 없어 오류가 정상.
