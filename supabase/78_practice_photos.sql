-- ============================================================
-- 78_practice_photos.sql — 수업실천사례 실천 기록 활동사진 (PRD §13.8)
--
--  - 사진은 비공개 버킷 practice-photos 의 <작성자 uid>/<uuid>.jpg 에 둔다(JPG, 3MB, 화면이 다시 그려 위치정보 제거).
--  - 사례에는 주소 대신 위치만 저장: practices.plan.photos = [{ "path": "<uid>/<uuid>.jpg" }, …] (2장까지).
--  - 볼 때마다 1시간짜리 서명 주소를 받는다. 발급은 그 사진이 실린 사례를 볼 수 있는 사람에게만:
--      작성자 본인 · 운영진 · 게시 중인 사례의 공개 범위(전체 / 인증교사만)를 통과한 사람.
--    다른 사람 폴더의 사진 위치를 자기 사례에 적어도 열리지 않게, 사진 폴더 = 사례 작성자를 함께 확인한다.
--
-- 선행: 15(is_staff), 26·27(can_view_teacher_content), 31(practices·is_verified_teacher), 72(plan).
-- 적용: SQL Editor 에 붙여넣고 실행. 재실행 안전.
-- ============================================================

-- ── 1. 사진 수 제한(2장) ─────────────────────────────────
alter table public.practices drop constraint if exists practices_plan_photos;
alter table public.practices
  add constraint practices_plan_photos check (
    plan is null
    or plan -> 'photos' is null
    or (jsonb_typeof(plan -> 'photos') = 'array' and jsonb_array_length(plan -> 'photos') <= 2)
  );

-- ── 2. 열람 판정(정책 안에서 practices RLS 와 무관하게 확인) ─────
create or replace function public.can_view_practice_photo(p_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    (storage.foldername(p_name))[1] = auth.uid()::text
    or public.is_staff()
    or exists (
      select 1
      from public.practices pr
      where pr.owner_id::text = (storage.foldername(p_name))[1]
        and pr.status = 'published'
        and pr.plan -> 'photos' @> jsonb_build_array(jsonb_build_object('path', p_name))
        and (pr.visibility = 'public' or public.can_view_teacher_content(pr.owner_id))
    );
$$;
revoke all on function public.can_view_practice_photo(text) from public;
grant execute on function public.can_view_practice_photo(text) to anon, authenticated;

-- ── 3. 비공개 버킷 ───────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('practice-photos', 'practice-photos', false, 3145728, array['image/jpeg'])
on conflict (id) do update
  set public             = false,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 올리기: 인증교사가 본인 폴더에만
drop policy if exists "practice_photos_own_insert" on storage.objects;
create policy "practice_photos_own_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'practice-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_verified_teacher()
  );

-- 보기(서명 주소 발급): 위 판정을 통과한 사람만. 비로그인도 '전체 공개' 사례 사진은 볼 수 있다.
drop policy if exists "practice_photos_read" on storage.objects;
create policy "practice_photos_read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'practice-photos' and public.can_view_practice_photo(name));

-- 지우기: 본인 폴더만(사진 빼기·사례 삭제·탈퇴 때 정리)
drop policy if exists "practice_photos_own_delete" on storage.objects;
create policy "practice_photos_own_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'practice-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
