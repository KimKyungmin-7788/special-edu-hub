-- 44 연구회게시판 비공개 사진. 43 적용 후 사용자가 SQL Editor에서 전체 실행. 자동 실행하지 않음.
-- 사진은 비공개 버킷(research-images)에 두고, 본문에는 주소 대신 위치(data-research-path)만 저장한다.
-- 볼 때마다 연구회회원에게만 1시간짜리 서명 주소를 발급(화면 쪽 createSignedUrls). 재실행해도 안전.
begin;

-- storage.objects 정책 안에서 쓰는 연구회회원 판정(profiles RLS와 무관하게 본인 등급만 확인).
create or replace function public.is_research_member()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and is_research_member);
$$;
revoke all on function public.is_research_member() from public;
grant execute on function public.is_research_member() to authenticated;

-- ── 비공개 Storage 버킷 ───────────────────────────────────
-- 2MB, 본문 사진과 같은 4종. public=false.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('research-images', 'research-images', false, 2097152,
        array['image/png','image/jpeg','image/webp','image/gif'])
on conflict (id) do update set public = false,
  file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- 연구회회원만, 본인 폴더(<uid>/...)에만 올린다.
drop policy if exists "research_images_insert_member" on storage.objects;
create policy "research_images_insert_member" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'research-images'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_research_member()
  );

-- 연구회회원만 조회(서명 URL 발급용). 등급이 회수되면 즉시 열람 불가. 관리자도 등급이 있어야 한다.
drop policy if exists "research_images_read_member" on storage.objects;
create policy "research_images_read_member" on storage.objects
  for select to authenticated
  using (bucket_id = 'research-images' and public.is_research_member());

-- ── 저장 규칙: 연구회 글의 사진은 비공개 버킷 위치만 허용 ─────────
-- 43과 같고, 연구회 사진 검사만 바뀌었다(외부·공개 주소, src 가 있는 사진은 거절).
create or replace function public.save_board_post_in_board(p_title text,p_body text,p_id uuid default null,p_slug text default 'free')
returns uuid language plpgsql security definer set search_path = public as $$
declare v_board uuid; v_author uuid; v_id uuid; v_scope text; v_tag text;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  if p_id is null then
    select id,write_permission into v_board,v_scope from public.boards where slug=p_slug;
  else
    select p.board_id,p.author_id,b.write_permission into v_board,v_author,v_scope
      from public.posts p join public.boards b on b.id=p.board_id
      where p.id=p_id and p.deleted_at is null and b.slug=p_slug for update of p;
    if not found or v_author <> auth.uid() then raise exception '수정 권한이 없습니다.'; end if;
  end if;
  if not public.can_write_board(v_board) then raise exception '작성 권한이 없습니다.'; end if;
  if p_title is null or char_length(btrim(p_title)) not between 1 and 100 then raise exception '제목은 1~100자로 입력하세요.'; end if;
  if p_body is null or char_length(btrim(p_body)) not between 1 and 100000 or
    btrim(regexp_replace(regexp_replace(p_body,'<[^>]*>','','g'),'&nbsp;|&#160;','','g'))='' then raise exception '본문 내용을 입력하세요.'; end if;
  if v_scope='research' then
    if p_body ~* '<\s*(video|audio|iframe|object|embed|svg|picture|source)\y' then
      raise exception '연구회게시판에는 글·링크·사진만 넣을 수 있습니다.';
    end if;
    for v_tag in select m[1] from regexp_matches(p_body,'(<\s*img\y[^>]*>)','gi') as m loop
      if v_tag !~* 'data-research-path="[0-9a-f-]{36}/[0-9a-f-]{36}\.(webp|png|jpg|gif)"'
        or v_tag ~* '\y(src|srcset)\s*=' then
        raise exception '연구회게시판 사진은 글쓰기 화면에서 올린 사진만 넣을 수 있습니다.';
      end if;
    end loop;
  end if;
  if p_id is null then
    insert into public.posts(board_id,author_id,title,body) values(v_board,auth.uid(),btrim(p_title),p_body) returning id into v_id;
  else
    update public.posts set title=btrim(p_title),body=p_body,updated_at=now() where id=p_id;
    v_id:=p_id;
  end if;
  return v_id;
end $$;
revoke all on function public.save_board_post_in_board(text,text,uuid,text) from public,anon;
grant execute on function public.save_board_post_in_board(text,text,uuid,text) to authenticated;

commit;
