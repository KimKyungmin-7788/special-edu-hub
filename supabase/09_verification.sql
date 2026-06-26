-- ============================================================
-- 09_verification.sql — 교사인증 신청 인프라 (2단계 묶음 D-1)
--
-- 설계 요약 (PRD §11.2 교사인증)
--  - 비공개 버킷 verification-docs: 재직/경력증명서. 본인 폴더(<uid>/...)에만
--    업로드·조회. 가렸어도 개인정보 → 공개 금지. 열람은 서명 URL 로만.
--  - verification_requests: 신청 이력(승인/반려/재신청을 행으로 누적).
--  - RLS: 조회=본인(+관리자) / 신청=본인·status=pending 강제 / 수정 정책 없음
--    (제출 후 사용자 변경 불가). 심사는 관리자가 Studio(service_role, RLS 우회).
--  - 승인 시 profiles.is_teacher_verified 자동 반영(트리거).
--  - 서류 자동 삭제(처리 완료 시)는 Storage 라 DB 로 안 됨 → 후속(Edge Function/운영).
--
-- 적용: Supabase 대시보드 > SQL Editor 에 붙여넣고 실행. 재실행 안전(idempotent).
-- ============================================================

-- ── 비공개 Storage 버킷 ───────────────────────────────────
-- 5MB, 이미지/PDF 만. public=false.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('verification-docs', 'verification-docs', false, 5242880,
        array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do nothing;

-- 본인 폴더(<uid>/...)에만 업로드
drop policy if exists "verif_docs_insert_own" on storage.objects;
create policy "verif_docs_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'verification-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 본인 폴더만 조회(서명 URL 발급용). 관리자는 Studio(service_role)가 우회.
drop policy if exists "verif_docs_read_own" on storage.objects;
create policy "verif_docs_read_own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'verification-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── verification_requests 테이블 ──────────────────────────
create table if not exists public.verification_requests (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references public.profiles (id) on delete cascade,
  document_path text        not null,                 -- Storage 경로 <uid>/<file>
  region        text        not null,                 -- 근무 지역
  school        text        not null,                 -- 학교
  status        text        not null default 'pending'
                            check (status in ('pending','approved','rejected')),
  reject_reason text,
  reviewed_by   uuid        references public.profiles (id),
  reviewed_at   timestamptz,
  created_at    timestamptz not null default now()
);

-- 사용자당 '심사중'은 동시에 하나만. 반려/승인 후엔 새 행으로 재신청 → 이력 누적.
create unique index if not exists verif_one_pending
  on public.verification_requests (user_id) where status = 'pending';

-- ── RLS ──────────────────────────────────────────────────
alter table public.verification_requests enable row level security;

-- 관리자 판별 헬퍼(재사용). profiles.role = 'admin'.
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- 조회: 본인 신청 or 관리자
drop policy if exists "verif_select_own_or_admin" on public.verification_requests;
create policy "verif_select_own_or_admin" on public.verification_requests
  for select to authenticated
  using (auth.uid() = user_id or public.is_admin());

-- 신청: 본인 것으로만, 상태는 pending 강제(위조·선승인 차단)
drop policy if exists "verif_insert_own" on public.verification_requests;
create policy "verif_insert_own" on public.verification_requests
  for insert to authenticated
  with check (auth.uid() = user_id and status = 'pending');

-- UPDATE/DELETE 정책 없음 → 사용자는 제출 후 못 고친다.
-- 심사(승인/반려)는 관리자가 Studio(service_role, RLS 우회)로 처리. (/admin 은 후속)

-- ── 승인 시 is_teacher_verified 자동 반영 ─────────────────
create or replace function public.on_verif_approved()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'approved' and coalesce(old.status, '') <> 'approved' then
    update public.profiles set is_teacher_verified = true where id = new.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_verif_approved on public.verification_requests;
create trigger trg_verif_approved
  after update on public.verification_requests
  for each row execute function public.on_verif_approved();
