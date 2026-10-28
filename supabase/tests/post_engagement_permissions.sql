-- 45 적용 후 실행. 회원 등급·글·좋아요·조회수 변경은 마지막에 ROLLBACK.
begin;
set local statement_timeout='30s';
do $$
declare t uuid; a uuid; staff uuid; free_id uuid; research_id uuid; denied boolean; n integer;
begin
  select id into t from public.profiles where is_teacher_verified limit 1;
  select id into a from public.profiles where role='member' and id<>coalesce(t,'00000000-0000-0000-0000-000000000000') limit 1;
  select id into staff from public.profiles where role='admin' limit 1;
  if t is null or a is null or staff is null then raise exception '테스트에 인증 교사, 다른 회원, 관리자가 필요합니다.'; end if;

  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub',staff::text,true);
  perform public.set_research_member(t,true);
  perform public.set_research_member(a,false);

  perform set_config('request.jwt.claim.sub',t::text,true);
  free_id:=public.save_board_post_in_board('[검증] 자유','<p>본문</p>',null,'free');
  research_id:=public.save_board_post_in_board('[검증] 연구회','<p>본문</p>',null,'research');

  -- 좋아요: 본인 1회, 개수 반영, 취소 시 감소
  insert into public.post_likes(user_id,post_id) values(t,free_id);
  select like_count into n from public.posts where id=free_id;
  if n<>1 then raise exception 'FAIL like count %',n; end if;
  denied:=false;
  begin insert into public.post_likes(user_id,post_id) values(t,free_id); exception when unique_violation then denied:=true; end;
  if not denied then raise exception 'FAIL double like'; end if;
  delete from public.post_likes where user_id=t and post_id=free_id;
  select like_count into n from public.posts where id=free_id;
  if n<>0 then raise exception 'FAIL unlike count %',n; end if;

  -- 숫자 직접 조작 불가
  denied:=false;
  begin update public.posts set like_count=100 where id=free_id; exception when insufficient_privilege then denied:=true; end;
  if not denied then raise exception 'FAIL direct count update'; end if;

  -- 비회원: 자유게시판 좋아요 가능, 연구회 글 좋아요·조회수 불가, 남 대신 좋아요 불가
  perform set_config('request.jwt.claim.sub',a::text,true);
  insert into public.post_likes(user_id,post_id) values(a,free_id);
  denied:=false;
  begin insert into public.post_likes(user_id,post_id) values(a,research_id); exception when insufficient_privilege then denied:=true; end;
  if not denied then raise exception 'FAIL outsider likes research post'; end if;
  denied:=false;
  begin insert into public.post_likes(user_id,post_id) values(t,free_id); exception when insufficient_privilege then denied:=true; end;
  if not denied then raise exception 'FAIL like as someone else'; end if;
  perform public.increment_post_view(research_id);

  -- 비로그인 조회수: 자유 글만 오른다
  execute 'set local role anon';
  perform set_config('request.jwt.claim.sub','',true);
  perform public.increment_post_view(free_id);
  perform public.increment_post_view(research_id);
  execute 'reset role';
  if (select view_count from public.posts where id=free_id)<>1 then raise exception 'FAIL free view count'; end if;
  if (select view_count from public.posts where id=research_id)<>0 then raise exception 'FAIL research view by non-member'; end if;
  if (select like_count from public.posts where id=free_id)<>1 then raise exception 'FAIL outsider like count'; end if;
end $$;
select '게시판 조회수·좋아요 권한 검사 통과 — 모든 변경 롤백' as result;
rollback;
