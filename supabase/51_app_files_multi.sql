-- ============================================================
-- 51_app_files_multi.sql — 자료 파일을 여러 개(최대 3개)로
--
-- 설계 요약
--  - 50 의 파일 한 개 칸(file_path·file_name·file_size)을 apps.files jsonb 배열 하나로 바꾼다.
--    files = [{path, name, size}] 최대 3개. 각 파일 5MB(버킷 제한 그대로), 경로는 작성자 폴더 안.
--  - 이미 올린 파일 한 개는 files 로 옮긴 뒤 옛 칸을 지운다.
--  - 웹앱 주소와 파일 중 하나 이상(50 과 같은 규칙).
--  - 저장소 읽기 정책은 "그 파일을 files 에 담은 자료를 읽을 수 있을 때"로 바꾼다(잠금 규칙은 apps RLS 그대로).
--
-- 선행: 50. 적용: SQL Editor 에 붙여넣고 실행. 재실행 안전.
-- ※ 적용 직후 바로 배포해 주세요(옛 화면은 file_path 칸을 찾다 파일을 못 보여 줍니다).
-- ============================================================
begin;

alter table public.apps add column if not exists files jsonb not null default '[]'::jsonb;

-- 50 의 파일 한 개를 files 로 옮기기(옛 칸이 남아 있을 때만)
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'apps' and column_name = 'file_path') then
    update public.apps
       set files = jsonb_build_array(jsonb_build_object('path', file_path, 'name', file_name, 'size', file_size))
     where file_path is not null and files = '[]'::jsonb;
  end if;
end $$;

-- 저장소 읽기(옛 칸을 지우기 전에 바꾼다 — 50 의 정책이 file_path 를 쓰고 있어서): 본인 폴더 또는 그 파일을 files 에 담은 자료를 읽을 수 있을 때
drop policy if exists "app_files_read" on storage.objects;
create policy "app_files_read" on storage.objects
  for select to anon, authenticated
  using (
    bucket_id = 'app-files'
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or exists (
        select 1 from public.apps a
        where a.files @> jsonb_build_array(jsonb_build_object('path', storage.objects.name))
      )
    )
  );

alter table public.apps drop constraint if exists apps_url_or_file;
alter table public.apps drop constraint if exists apps_file_check;
alter table public.apps drop column if exists file_path;
alter table public.apps drop column if exists file_name;
alter table public.apps drop column if exists file_size;

-- files 모양 검사: 배열 3개 이하, 각 {path(작성자 폴더), name(1~200자), size(1~5MB)}
create or replace function public.apps_files_valid(p_files jsonb, p_owner uuid)
returns boolean language plpgsql immutable as $$
declare f jsonb;
begin
  if jsonb_typeof(p_files) <> 'array' or jsonb_array_length(p_files) > 3 then return false; end if;
  for f in select * from jsonb_array_elements(p_files) loop
    if jsonb_typeof(f) <> 'object'
      or coalesce(f->>'path', '') !~ ('^' || coalesce(p_owner::text, '-') || '/[^/]+$')
      or char_length(coalesce(f->>'name', '')) not between 1 and 200
      or jsonb_typeof(f->'size') <> 'number'
      or (f->>'size')::numeric not between 1 and 5242880 then
      return false;
    end if;
  end loop;
  return true;
end $$;

alter table public.apps drop constraint if exists apps_files_check;
alter table public.apps add constraint apps_files_check check (public.apps_files_valid(files, owner_id));

alter table public.apps add constraint apps_url_or_file
  check (btrim(app_url) <> '' or jsonb_array_length(files) > 0);

commit;

-- 확인(선택): 아래가 한 줄(files | jsonb)이면 적용된 것
-- select column_name, data_type from information_schema.columns where table_name = 'apps' and column_name = 'files';
