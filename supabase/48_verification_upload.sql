-- ============================================================
-- 48_verification_upload.sql — 교사인증 서류를 인증센터에서 바로 올리기 (2026-10-30)
--
-- 설계 요약
--  - 인증센터 입력창에 서류(재직증명서·나이스 캡처)를 끌어다 놓아 올린다.
--    09 의 비공개 버킷 verification-docs 와 운영진 열람 정책(15)을 그대로 쓴다.
--    파일 경로 = <신청자 uid>/<uuid>.<확장자>, verification_requests.document_path 에 남긴다.
--  - 신청 정책 보강: document_path 는 비우거나 "본인 폴더" 경로만(남의 파일을 끼워 넣지 못하게).
--  - 삭제 정책: 신청자는 본인 폴더(신청 실패 시 정리), 운영진은 전체(심사 후 삭제 — 처리방침).
--  - 안내 메일(47): 서류를 올렸는지(hasDocument)를 함께 넘겨 문구를 바꾼다.
--  - 이메일로 서류를 보내는 예전 방식도 대체 경로로 남는다(document_path = null).
--
-- 적용: Supabase 대시보드 > SQL Editor 에 전체 붙여넣고 실행. 재실행 안전(idempotent).
-- 선행: 09·15·25(verification_requests, verification-docs), 47(안내 메일).
-- ============================================================

-- ── 1. 신청 정책 교체 (09 + 서류 경로 검사) ───────────────
drop policy if exists "verif_insert_own" on public.verification_requests;
create policy "verif_insert_own" on public.verification_requests
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and status = 'pending'
    and (
      document_path is null
      or document_path like auth.uid()::text || '/%'
    )
  );

-- ── 2. 서류 파일 삭제 정책 ───────────────────────────────
drop policy if exists "verif_docs_delete_own" on storage.objects;
create policy "verif_docs_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'verification-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "verif_docs_delete_staff" on storage.objects;
create policy "verif_docs_delete_staff" on storage.objects
  for delete to authenticated
  using (bucket_id = 'verification-docs' and public.is_staff());

-- ── 3. 안내 메일: 서류를 올렸는지 함께 넘김 (47 교체) ─────
create or replace function public.email_on_verify_requested()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_doc   text := case when new.document_path is not null then 'yes' else '' end;
begin
  select email into v_email from auth.users where id = new.user_id;
  if v_email is not null then
    perform public.request_email('verify_received', new.user_id, v_email,
      jsonb_build_object('hasDocument', v_doc));
  end if;
  perform public.request_email('staff_new_request', new.user_id, null,
    jsonb_build_object(
      'school', coalesce(new.school, ''),
      'applicantName', coalesce(new.applicant_name, ''),
      'email', coalesce(v_email, ''),
      'hasDocument', v_doc
    ));
  return new;
end;
$$;
