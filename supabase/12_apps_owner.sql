-- ============================================================
-- 12_apps_owner.sql — 앱 등록 토대 (3단계 묶음 F-1)
--
-- 설계 요약 (PRD §11.3 / CLAUDE.md)
--  - apps 확장: owner_id(등록자 → profiles, nullable), status(published|hidden).
--    · 기존 시드앱 11개는 owner_id=null, status='published'(default)로 유지.
--    · 삭제 대신 숨김(status='hidden'). 등록자 탈퇴 시 owner_id만 null(앱은 보존).
--  - 썸네일 공개 Storage 버킷 app-thumbnails (05_avatars 와 동일 패턴, <uid>/ 폴더 규칙).
--  - 쓰기 RLS:
--    · SELECT  : status='published' OR 본인 소유 OR 관리자 (숨김앱도 본인·관리자엔 보임)
--    · INSERT  : 인증교사(is_teacher_verified) + owner_id=본인 + status='published'
--    · UPDATE  : 본인 소유 OR 관리자 (내용수정·숨김/복구)
--    · DELETE  : 정책 없음 → 삭제 불가. 숨김만. (관리자는 Studio/service_role)
--
-- 적용: Supabase 대시보드 > SQL Editor 에 붙여넣고 Run. 재실행 안전(idempotent).
-- ============================================================

-- ── 1. apps 컬럼 확장 ─────────────────────────────────────
alter table public.apps
  add column if not exists owner_id uuid
    references public.profiles (id) on delete set null;

alter table public.apps
  add column if not exists status text not null default 'published';

-- status 체크 제약(중복 추가 방지)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'apps_status_check'
  ) then
    alter table public.apps
      add constraint apps_status_check
      check (status in ('published','hidden'));
  end if;
end $$;

-- 공개목록 필터+정렬용 인덱스
create index if not exists apps_status_created_idx
  on public.apps (status, created_at desc);
create index if not exists apps_owner_idx
  on public.apps (owner_id);

-- ── 2. 썸네일 공개 Storage 버킷 ───────────────────────────
-- public=true: 누구나 URL 로 조회. 2MB, 이미지 타입만. 경로 <uid>/<파일명>.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'app-thumbnails',
  'app-thumbnails',
  true,
  2097152, -- 2MB
  array['image/png','image/jpeg','image/webp','image/gif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 읽기: 누구나(공개 버킷)
drop policy if exists "app_thumbnails_public_read" on storage.objects;
create policy "app_thumbnails_public_read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'app-thumbnails');

-- 업로드: 로그인 사용자가 본인 uid 폴더에만
drop policy if exists "app_thumbnails_own_insert" on storage.objects;
create policy "app_thumbnails_own_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'app-thumbnails'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- 교체: 본인 폴더만
drop policy if exists "app_thumbnails_own_update" on storage.objects;
create policy "app_thumbnails_own_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'app-thumbnails'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- 삭제: 본인 폴더만(이전 썸네일 정리용)
drop policy if exists "app_thumbnails_own_delete" on storage.objects;
create policy "app_thumbnails_own_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'app-thumbnails'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ── 3. 인증교사 판별 헬퍼 (09 의 is_admin() 과 같은 꼴) ───
create or replace function public.is_verified_teacher()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_teacher_verified = true
  );
$$;

-- ── 4. apps 쓰기 RLS ──────────────────────────────────────
alter table public.apps enable row level security;

-- 기존 공개읽기 정책(02_rls 의 using(true)) 교체:
-- 숨김앱이 anon 에게 노출되면 안 되므로 status 조건을 건다.
drop policy if exists "apps_public_read" on public.apps;
create policy "apps_public_read" on public.apps
  for select to anon, authenticated
  using (
    status = 'published'
    or owner_id = auth.uid()
    or public.is_admin()
  );

-- 등록: 인증교사 + 본인 소유 + 공개 상태로만(선숨김 차단)
drop policy if exists "apps_insert_verified_owner" on public.apps;
create policy "apps_insert_verified_owner" on public.apps
  for insert to authenticated
  with check (
    public.is_verified_teacher()
    and owner_id = auth.uid()
    and status = 'published'
  );

-- 수정: 본인 소유 또는 관리자(내용수정·숨김/복구)
drop policy if exists "apps_update_owner_or_admin" on public.apps;
create policy "apps_update_owner_or_admin" on public.apps
  for update to authenticated
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

-- DELETE 정책 없음 → 사용자 삭제 불가(숨김만). 관리자는 Studio(service_role).
