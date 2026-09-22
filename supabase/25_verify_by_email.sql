-- ============================================================
-- 25_verify_by_email.sql — 교사인증 방식 변경: 자동인증 폐지 + 이메일 제출·수동 승인
--
-- 변경 요약
--  1) @gw1.kr 자동인증(10_auto_verify.sql) 트리거 제거.
--     이미 자동인증된 계정은 그대로 유지(값을 되돌리지 않는다).
--  2) 인증 서류는 더 이상 사이트에 업로드하지 않는다(신청자가 운영자에게 이메일로 제출).
--     verification_requests 는 "신청 기록"만 남긴다 → document_path·region nullable,
--     applicant_name(성함) 추가. 기존 행(서류 업로드 방식)은 그대로 보존.
--  3) 운영진이 회원을 직접 인증/회수하는 RPC set_teacher_verified.
--     is_teacher_verified 는 클라 UPDATE 가 GRANT 로 잠겨 있어(04) 이 RPC 로만 바꾼다.
--     인증 부여 시 그 회원의 심사중 신청은 함께 '승인' 처리한다(대기목록 정리).
--
-- 선행: 09(verification_requests), 10(자동인증), 15(is_staff).
-- 적용: Supabase 대시보드 > SQL Editor 에 붙여넣고 실행. 재실행 안전(idempotent).
-- ============================================================

-- ── 1. 자동인증 제거 ─────────────────────────────────────
drop trigger if exists trg_profile_auto_verify_insert on public.profiles;
drop trigger if exists trg_profile_auto_verify_update on public.profiles;
drop function if exists public.on_profile_auto_verify();

-- ── 2. 신청 기록 스키마 완화 ───────────────────────────────
alter table public.verification_requests
  alter column document_path drop not null,
  alter column region        drop not null,
  add column if not exists applicant_name text;

-- ── 3. 운영진 인증 부여/회수 RPC ──────────────────────────
create or replace function public.set_teacher_verified(target_id uuid, verified boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    raise exception '권한이 없습니다(운영진만 가능).';
  end if;

  update public.profiles set is_teacher_verified = verified where id = target_id;
  if not found then
    raise exception '회원을 찾을 수 없습니다.';
  end if;

  if verified then
    update public.verification_requests
       set status = 'approved',
           reject_reason = null,
           reviewed_by = auth.uid(),
           reviewed_at = now()
     where user_id = target_id and status = 'pending';
  end if;
end;
$$;

revoke execute on function public.set_teacher_verified(uuid, boolean) from anon, public;
grant execute on function public.set_teacher_verified(uuid, boolean) to authenticated;
