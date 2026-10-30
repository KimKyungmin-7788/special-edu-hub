-- ============================================================
-- 46_comment_images.sql — 댓글·답글 이미지 첨부 (트랙 E, 2026-10-16)
--
-- 설계 요약 (사용자 결정 2026-10-16)
--  - 댓글·답글 하나에 이미지 최대 4장. 첨부는 "인증교사만"(글만 쓰는 건 지금처럼 로그인 전체).
--  - comments.images = Storage 경로 배열(text[]). 경로 규칙 <작성자 uid>/<uuid>.<확장자>.
--    주소(URL)는 화면이 경로로 만든다 → 남의 파일·외부 주소를 끼워 넣을 수 없다.
--  - 사진만 있는 댓글 허용: 본문 또는 이미지 중 하나는 있어야 한다.
--  - 공개 버킷 comment-images, 파일당 5MB, 이미지 형식만. 화면에서 긴 변 1600px 로 줄여 올린다.
--    ⚠️ 수업실천사례 첨부(31)와 같이, 교사 전용 사례의 댓글이라도 파일 주소 자체는 공개.
--  - 학생 개인정보 확인 체크는 화면에서 필수(첨부할 때마다).
--  - 수정: edit_comment 에 p_images 를 더한다(null = 이미지 그대로). 새 이미지를 더할 때만
--    인증교사 검사. 빼는 건 누구나(본인).
--  - 댓글을 지워도(소프트삭제) 파일은 남긴다 — 신고 처리 때 운영진이 확인할 수 있게.
--  - 게시판 글(post_id) 댓글에는 사진을 붙일 수 없다 — 연구회게시판은 비공개인데 이 버킷은 공개라서.
--
-- 적용: Supabase 대시보드 > SQL Editor 에 전체 붙여넣고 실행. 재실행 안전(idempotent).
-- 선행: 12(is_verified_teacher), 19·34·39(comments), 40(edit_comment), 42(게시판 댓글 post_id).
-- ============================================================

-- ── 1. 칼럼 ──────────────────────────────────────────────
alter table public.comments
  add column if not exists images text[] not null default '{}';

-- ── 2. 경로 검사 함수 ────────────────────────────────────
-- 최대 4장 + 모든 경로가 "<작성자 uid>/<uuid>.<이미지 확장자>" 꼴인지.
create or replace function public.valid_comment_images(p_images text[], p_author uuid)
returns boolean
language sql
immutable
set search_path = public
as $$
  select coalesce(cardinality(p_images), 0) <= 4
     and not exists (
       select 1
         from unnest(coalesce(p_images, '{}'::text[])) as p(path)
        where p.path is null
           or p.path !~ ('^' || p_author::text || '/[0-9a-f-]{36}\.(jpg|jpeg|png|webp|gif)$')
     );
$$;

-- ── 3. 작성 정책 교체 (42_board 의 정책 + 이미지 조건) ───
drop policy if exists "comments_insert_own" on public.comments;
create policy "comments_insert_own"
  on public.comments
  for insert
  to authenticated
  with check (
    auth.uid() = author_id
    and (char_length(btrim(body)) > 0 or cardinality(images) > 0)
    and public.valid_comment_images(images, author_id)
    and (cardinality(images) = 0 or (post_id is null and public.is_verified_teacher()))
    and (
      parent_id is null
      or (post_id is not null and public.can_reply_to_board_comment(parent_id, post_id))
      or (post_id is null and public.can_reply_to_comment(parent_id, app_id, practice_id))
    )
  );

-- ── 4. 수정 RPC 교체 (40 의 edit_comment + 이미지) ───────
drop function if exists public.edit_comment(uuid, text);

create or replace function public.edit_comment(
  p_id     uuid,
  p_body   text,
  p_images text[] default null   -- null = 이미지 그대로
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  c record;
  v_body   text   := btrim(coalesce(p_body, ''));
  v_images text[];
begin
  select id, author_id, deleted_at, images, post_id into c
    from public.comments
   where id = p_id;
  if not found or c.deleted_at is not null then
    raise exception 'comment not found';
  end if;
  if auth.uid() is null or auth.uid() <> c.author_id then
    raise exception 'permission denied';
  end if;

  v_images := coalesce(p_images, c.images);
  if not public.valid_comment_images(v_images, c.author_id) then
    raise exception 'invalid images';
  end if;
  -- 새 이미지를 더할 때만 인증교사 검사(빼기만 하는 건 허용)
  if not (v_images <@ c.images) and (c.post_id is not null or not public.is_verified_teacher()) then
    raise exception 'teacher only';
  end if;

  if char_length(v_body) = 0 and cardinality(v_images) = 0 then
    raise exception 'empty body';
  end if;
  -- 멘션 토큰 몫까지 넉넉히(화면 기준 1000자)
  if char_length(v_body) > 4000 then
    raise exception 'body too long';
  end if;

  update public.comments
     set body = v_body,
         images = v_images,
         edited_at = now()
   where id = p_id;
end;
$$;

revoke execute on function public.edit_comment(uuid, text, text[]) from public, anon;
grant  execute on function public.edit_comment(uuid, text, text[]) to authenticated;

-- ── 5. Storage 버킷 ──────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'comment-images',
  'comment-images',
  true,
  5242880, -- 5MB
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "comment_images_public_read" on storage.objects;
create policy "comment_images_public_read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'comment-images');

-- 업로드: 인증교사가 본인 uid 폴더에만
drop policy if exists "comment_images_teacher_insert" on storage.objects;
create policy "comment_images_teacher_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'comment-images'
    and auth.uid()::text = (storage.foldername(name))[1]
    and public.is_verified_teacher()
  );

-- 삭제: 본인 폴더만(수정 때 뺀 사진, 등록 실패 정리용)
drop policy if exists "comment_images_own_delete" on storage.objects;
create policy "comment_images_own_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'comment-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
