-- ============================================================
-- 50_app_files.sql — 자료 등록에 파일 올리기 (웹앱 주소 / 파일 / 둘 다)
--
-- 설계 요약
--  - apps 에 첨부 파일 1개: file_path(저장소 경로)·file_name(원래 이름)·file_size(바이트).
--    웹앱 주소(app_url)와 파일 중 하나 이상은 있어야 한다. 주소 없이 파일만이면 app_url = ''.
--  - 저장소 'app-files' 는 비공개 버킷. 5MB, 문서·자료 형식만(PDF·한글·PPT·워드·엑셀·zip).
--    경로 <uid>/<무작위>.<확장자> — 본인 폴더에만 올리고 지운다.
--  - 내려받기: 화면이 잠깐 쓰는 서명 주소(createSignedUrl)를 만든다. 서명은 select 정책을 통과해야 나온다.
--    읽기 = 본인 폴더 이거나, 그 파일을 단 자료를 apps 에서 읽을 수 있을 때.
--    apps 읽기에는 이미 공개상태(15)·교사 전용 잠금(26 RESTRICTIVE)이 걸려 있어, 잠긴 자료의 파일은 받을 수 없다.
--  - apps_catalog 뷰는 그대로 둔다(파일 정보는 상세 화면이 apps 원본에서 따로 읽는다).
--
-- 선행: 12, 15, 26. 적용: SQL Editor 에 붙여넣고 실행. 재실행 안전.
-- ============================================================
begin;

alter table public.apps add column if not exists file_path text;
alter table public.apps add column if not exists file_name text;
alter table public.apps add column if not exists file_size integer;

-- 파일은 작성자 폴더 안의 것만, 이름·크기와 함께
alter table public.apps drop constraint if exists apps_file_check;
alter table public.apps add constraint apps_file_check check (
  (file_path is null and file_name is null and file_size is null)
  or (
    file_path ~ ('^' || owner_id::text || '/[^/]+$')
    and char_length(file_name) between 1 and 200
    and file_size between 1 and 5242880
  )
);

-- 웹앱 주소와 파일 중 하나 이상
alter table public.apps drop constraint if exists apps_url_or_file;
alter table public.apps add constraint apps_url_or_file
  check (btrim(app_url) <> '' or file_path is not null);

-- ── 비공개 버킷 ──────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'app-files',
  'app-files',
  false,
  5242880, -- 5MB
  array[
    'application/pdf',
    'application/x-hwp', 'application/haansofthwp', 'application/vnd.hancom.hwp',
    'application/vnd.hancom.hwpx', 'application/haansofthwpx',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip', 'application/x-zip-compressed'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 읽기(서명 주소 만들기): 본인 폴더 또는 그 파일을 단 자료를 읽을 수 있을 때(apps RLS 가 공개상태·잠금을 판단)
drop policy if exists "app_files_read" on storage.objects;
create policy "app_files_read" on storage.objects
  for select to anon, authenticated
  using (
    bucket_id = 'app-files'
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or exists (select 1 from public.apps a where a.file_path = storage.objects.name)
    )
  );

-- 올리기: 인증교사가 본인 폴더에만
drop policy if exists "app_files_own_insert" on storage.objects;
create policy "app_files_own_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'app-files'
    and auth.uid()::text = (storage.foldername(name))[1]
    and public.is_verified_teacher()
  );

-- 지우기: 본인 폴더만(파일 바꿀 때 이전 파일 정리)
drop policy if exists "app_files_own_delete" on storage.objects;
create policy "app_files_own_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'app-files'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

commit;

-- 확인(선택): 아래가 'app-files | false | 5242880' 한 줄이면 적용된 것
-- select id, public, file_size_limit from storage.buckets where id = 'app-files';
