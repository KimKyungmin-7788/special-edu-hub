-- 62_training_stages.sql — 열린연수방 단계 분류 (선행: 49)
-- SQL Editor에서 실행. 기존 글은 미분류로 보존하며 '전체 연수'에서 열람·수정한다.
-- 이전 클라이언트의 save_training_post와 기존 게시판 권한은 유지한다. 재실행 안전.
begin;

alter table public.posts add column if not exists training_stage text;
alter table public.posts drop constraint if exists posts_training_stage;
alter table public.posts add constraint posts_training_stage
  check (training_stage is null or training_stage in ('vibecoding', 'agent', 'field'));
create index if not exists posts_training_stage_idx
  on public.posts (board_id, training_stage, pinned desc, created_at desc, id desc)
  where deleted_at is null;

create or replace function public.save_training_post_with_stage(
  p_title text, p_body text, p_cover_url text, p_links jsonb, p_stage text, p_id uuid default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  if not exists (select 1 from public.profiles where id = auth.uid() and is_teacher_verified) then
    raise exception '교사인증 회원만 연수를 올릴 수 있습니다.';
  end if;
  if p_stage is null or p_stage not in ('vibecoding', 'agent', 'field') then
    raise exception '연수 단계를 선택해 주세요.';
  end if;
  -- 기존 함수에서 작성자·교사인증·링크·대표 이미지·본문을 검증한다.
  v_id := public.save_training_post(p_title, p_body, p_cover_url, p_links, p_id);
  update public.posts set training_stage = p_stage where id = v_id;
  return v_id;
end $$;
revoke all on function public.save_training_post_with_stage(text, text, text, jsonb, text, uuid) from public, anon;
grant execute on function public.save_training_post_with_stage(text, text, text, jsonb, text, uuid) to authenticated;

commit;
-- 확인: 아래 SELECT를 별도로 실행하면 기존 연수의 단계와 제목을 볼 수 있다.
-- select p.title, p.training_stage from public.posts p join public.boards b on b.id = p.board_id where b.slug = 'training';
