-- 자료 첨부를 파일당 10MB로 확대. 파일 3개 제한·권한·허용 형식 유지. 재실행 안전.
begin;

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
      or (f->>'size')::numeric not between 1 and 10485760 then
      return false;
    end if;
  end loop;
  return true;
end $$;

update storage.buckets
set file_size_limit = 10485760
where id = 'app-files';

commit;
