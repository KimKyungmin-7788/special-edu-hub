-- ============================================================
-- 49_training_share.sql — 열린연수방 '함께 여는 연수' (회원이 연수자료를 올리는 게시판)
--
-- 설계 요약
--  - 게시판(42) 구조를 그대로 쓴다: boards 에 'training' 한 줄. 읽기 누구나, 쓰기 인증 교사(write_permission='teacher').
--    댓글·좋아요·조회수·신고·알림은 42~45 가 게시판 공통으로 처리한다.
--  - posts 에 카드용 대표 사진(cover_url)과 연수 자료 링크(links) 컬럼을 더한다.
--    사용자는 posts 를 직접 고칠 수 없어(42 revoke) save_training_post RPC 만 거친다.
--  - cover_url: 본인 폴더의 app-thumbnails 공개 주소만(12 의 썸네일 저장소를 앱·수업 사례처럼 같이 쓴다).
--  - links: [{kind, label, url}] 최대 10개. kind = slides(HTML 슬라이드)·video(영상)·file(자료)·link(그 밖의 링크),
--    url 은 https 주소만(화면은 새 탭으로 연다), label 은 선택(50자 이하).
--
-- 선행: 12, 42, 43, 45. 적용: SQL Editor 에 붙여넣고 실행. 재실행 안전.
-- ============================================================
begin;

insert into public.boards(slug, name, write_permission) values ('training', '함께 여는 연수', 'teacher')
on conflict (slug) do update set name = excluded.name, write_permission = excluded.write_permission;

alter table public.posts add column if not exists cover_url text;
alter table public.posts add column if not exists links jsonb not null default '[]'::jsonb;
alter table public.posts drop constraint if exists posts_links_array;
alter table public.posts add constraint posts_links_array
  check (jsonb_typeof(links) = 'array' and jsonb_array_length(links) <= 10);

create or replace function public.save_training_post(
  p_title text, p_body text, p_cover_url text, p_links jsonb, p_id uuid default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_link jsonb; v_cover text := nullif(btrim(coalesce(p_cover_url, '')), '');
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  if v_cover is not null and (char_length(v_cover) > 1000
    or v_cover !~ ('^https://[^/]+/storage/v1/object/public/app-thumbnails/' || auth.uid()::text || '/[^/]+$')) then
    raise exception '대표 사진을 다시 올려 주세요.';
  end if;
  if p_links is null or jsonb_typeof(p_links) <> 'array' or jsonb_array_length(p_links) > 10 then
    raise exception '연수 자료 링크는 10개까지 넣을 수 있습니다.';
  end if;
  for v_link in select * from jsonb_array_elements(p_links) loop
    if jsonb_typeof(v_link) <> 'object'
      or coalesce(v_link->>'kind', '') not in ('slides', 'video', 'file', 'link')
      or coalesce(v_link->>'url', '') !~ '^https://[^\s<>"]+$' or char_length(v_link->>'url') > 2000
      or char_length(coalesce(v_link->>'label', '')) > 50 then
      raise exception '연수 자료 링크를 확인하세요(https:// 로 시작하는 주소).';
    end if;
  end loop;
  -- 제목·본문·작성 권한·본인 글 확인은 게시판 공통 저장 함수(43)가 한다
  v_id := public.save_board_post_in_board(p_title, p_body, p_id, 'training');
  update public.posts set cover_url = v_cover,
    links = (select coalesce(jsonb_agg(jsonb_build_object('kind', e->>'kind', 'label', btrim(coalesce(e->>'label', '')), 'url', e->>'url')), '[]'::jsonb)
             from jsonb_array_elements(p_links) e)
  where id = v_id;
  return v_id;
end $$;
revoke all on function public.save_training_post(text, text, text, jsonb, uuid) from public, anon;
grant execute on function public.save_training_post(text, text, text, jsonb, uuid) to authenticated;

commit;

-- 확인(선택): 아래가 '함께 여는 연수 | teacher' 한 줄이면 적용된 것
-- select name, write_permission from public.boards where slug = 'training';
