-- 2단계-B3: 아바타용 공개 Storage 버킷 + 정책
-- PRD 11.5: 아바타·썸네일은 "공개" 버킷. (인증 서류는 비공개 — 묶음 D에서 별도)
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 Run.
-- (대안: Storage UI 에서 직접 만들어도 됨 — 아래와 동일하게 public + 정책.)
--
-- 경로 규칙: avatars/<auth uid>/<파일명>
--  → 폴더 첫 칸이 본인 uid 인 경우에만 쓰기 허용(타인 폴더 침범 방지).

-- ── 버킷 ──────────────────────────────────────────────────
-- public=true: 누구나 URL 로 이미지 조회(읽기). 2MB 제한, 이미지 타입만.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152, -- 2MB
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ── 정책(storage.objects) ─────────────────────────────────
-- 읽기: 누구나(공개 버킷이므로 CDN 으로도 열리지만, 명시적으로 SELECT 허용).
create policy "avatars_public_read"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'avatars');

-- 업로드: 로그인 사용자가 "본인 uid 폴더"에만.
create policy "avatars_own_insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- 교체(덮어쓰기): 본인 폴더만.
create policy "avatars_own_update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- 삭제: 본인 폴더만(이전 아바타 정리용).
create policy "avatars_own_delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
