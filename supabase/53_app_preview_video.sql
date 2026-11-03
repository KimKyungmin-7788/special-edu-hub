-- ============================================================
-- 53_app_preview_video.sql — 자료 카드 미리보기 영상(마우스를 올리면 재생) (2026-11-03)
--
-- 설계 요약
--  - 자료마다 짧은 미리보기 영상 1개(선택). 목록 카드에 마우스를 올리면 썸네일 자리에서 소리 없이 반복 재생.
--  - apps.preview_url: 영상의 공개 주소. 없으면 null(지금처럼 썸네일만).
--  - 저장소 'app-previews': 공개 버킷(썸네일과 같은 수준), 5MB, MP4·WebM 만. 경로 <uid>/<파일명>.
--    올리기·바꾸기·지우기는 본인 폴더만(12 의 app-thumbnails 와 같은 규칙).
--  - apps_catalog 뷰 끝에 preview_url 을 더한다(37 정의 그대로 + 한 칸).
--    잠긴 자료(교사 전용인데 볼 권한 없음)는 null 로 가린다.
--
-- 적용: Supabase 대시보드 > SQL Editor 에 전체 붙여넣고 실행. 재실행 안전(idempotent).
-- 선행: 12(apps.owner_id·app-thumbnails), 37(apps_catalog).
-- ============================================================
begin;

-- ── 1. 자료에 미리보기 영상 주소 칸 ────────────────────────
alter table public.apps add column if not exists preview_url text;

-- ── 2. 미리보기 영상 공개 저장소 ───────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'app-previews',
  'app-previews',
  true,
  5242880, -- 5MB
  array['video/mp4','video/webm']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 읽기: 누구나(공개 버킷)
drop policy if exists "app_previews_public_read" on storage.objects;
create policy "app_previews_public_read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'app-previews');

-- 올리기: 로그인 사용자가 본인 uid 폴더에만
drop policy if exists "app_previews_own_insert" on storage.objects;
create policy "app_previews_own_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'app-previews'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- 바꾸기: 본인 폴더만
drop policy if exists "app_previews_own_update" on storage.objects;
create policy "app_previews_own_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'app-previews'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- 지우기: 본인 폴더만(바꾸거나 뺀 뒤 이전 영상 정리)
drop policy if exists "app_previews_own_delete" on storage.objects;
create policy "app_previews_own_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'app-previews'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ── 3. 목록 뷰에 preview_url 추가(37 + 맨 끝 한 칸) ─────────
create or replace view public.apps_catalog as
select
  a.id,
  a.title,
  case when l.locked then '' else a.app_url end     as app_url,
  a.thumbnail_url,
  coalesce(nullif(btrim(p.nickname), ''), a.author_name) as author_name,
  case when l.locked then '' else a.description end as description,
  a.category_ids,
  a.view_count,
  a.like_count,
  a.bookmark_count,
  a.created_at,
  a.owner_id,
  a.status,
  a.sort_order,
  a.visibility,
  l.locked,
  p.avatar_url as owner_avatar_url,
  a.summary,
  a.comment_count,
  case when l.locked then '' else a.achievement_standards end as achievement_standards,
  case when l.locked then '' else a.educational_intent end    as educational_intent,
  case when l.locked then '' else a.use_case_type end         as use_case_type,
  case when l.locked then '' else a.use_case end              as use_case,
  case when l.locked then '{}'::text[] else a.achievement_codes end as achievement_codes,
  case when l.locked then null else a.preview_url end         as preview_url
from public.apps a
left join public.profiles p on p.id = a.owner_id
cross join lateral (
  select coalesce(
    a.visibility = 'teachers' and not public.can_view_teacher_content(a.owner_id),
    true  -- 판단 불가면 잠근다
  ) as locked
) l
where a.status = 'published'
   or (a.owner_id is not null and a.owner_id = auth.uid())
   or public.is_staff();

grant select on public.apps_catalog to anon, authenticated;

commit;

-- 확인(선택): 아래가 'app-previews | true | 5242880' 한 줄이면 적용된 것
-- select id, public, file_size_limit from storage.buckets where id = 'app-previews';
