-- 63 적용 후 실행. 실제 데이터 변경은 마지막 ROLLBACK으로 취소한다.
begin;
set local statement_timeout = '30s';
do $$
declare a uuid; b uuid; u uuid; v_post uuid; v_comment uuid; failed boolean;
begin
  select id into a from public.profiles where is_teacher_verified order by id limit 1;
  select id into b from public.profiles where is_teacher_verified and id <> a order by id limit 1;
  select id into u from public.profiles where not is_teacher_verified order by id limit 1;
  if a is null or b is null or u is null then raise exception '인증 교사 2명·미인증 회원 1명이 필요합니다.'; end if;
  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', a::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub',a,'role','authenticated')::text,true);
  v_post := public.save_training_post_with_visibility('[검증] 비공개', '<p>비공개 본문</p>', null, '[]', 'vibecoding', 'private');
  if not exists(select 1 from public.posts where id=v_post and visibility='private') then raise exception '작성자 비공개 조회 실패'; end if;
  insert into public.comments(post_id,author_id,body) values(v_post,a,'검증 댓글') returning id into v_comment;
  -- 구형 저장 API가 비공개를 자동 공개로 바꾸지 않아야 한다.
  perform public.save_training_post_with_stage('[검증] 구형 저장', '<p>비공개 본문</p>', null, '[]', 'vibecoding', v_post);
  if not exists(select 1 from public.posts where id=v_post and visibility='private') then raise exception '구형 API가 공개 범위를 변경함'; end if;

  perform set_config('request.jwt.claim.sub', b::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub',b,'role','authenticated')::text,true);
  if exists(select 1 from public.posts where id=v_post) or public.can_read_post(v_post) then raise exception '다른 교사에게 비공개 글 노출'; end if;
  if exists(select 1 from public.comments where post_id=v_post) then raise exception '비공개 댓글 노출'; end if;
  if public.can_reply_to_board_comment(v_comment,v_post) then raise exception '비공개 답글 조회 우회'; end if;
  perform public.increment_post_view(v_post);
  failed:=false;
  begin perform public.save_training_post_with_visibility('[검증] 타인 수정','<p>본문</p>',null,'[]','vibecoding','public',v_post);
  exception when raise_exception then failed:=true; end;
  if not failed then raise exception '타인이 비공개 글 공개 전환'; end if;
  failed:=false;
  begin insert into public.post_likes(user_id,post_id) values(b,v_post);
  exception when insufficient_privilege then failed:=true; end;
  if not failed then raise exception '타인 비공개 좋아요 허용'; end if;
  failed:=false;
  begin perform public.report_board_post(v_post,'other','검증');
  exception when raise_exception then failed:=true; end;
  if not failed then raise exception '비공개 신고 스냅샷 우회'; end if;

  execute 'set local role anon';
  perform set_config('request.jwt.claim.sub','',true);
  perform set_config('request.jwt.claims','{"role":"anon"}',true);
  if exists(select 1 from public.posts where id=v_post) then raise exception '비로그인 비공개 조회'; end if;
  if exists(select 1 from public.comments where post_id=v_post) then raise exception '비로그인 비공개 댓글 조회'; end if;

  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub',a::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
  if not exists(select 1 from public.posts where id=v_post and view_count=0) then raise exception '비공개 조회수 우회'; end if;
  perform public.save_training_post_with_visibility('[검증] 공개 전환','<p>본문</p>',null,'[]','vibecoding','public',v_post);
  execute 'set local role anon';
  perform set_config('request.jwt.claim.sub','',true);
  perform set_config('request.jwt.claims','{"role":"anon"}',true);
  if not exists(select 1 from public.posts where id=v_post) then raise exception '공개 전환 후 비로그인 열람 실패'; end if;

  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub',a::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
  perform public.save_training_post_with_visibility('[검증] 다시 비공개','<p>본문</p>',null,'[]','vibecoding','private',v_post);
  execute 'set local role anon';
  perform set_config('request.jwt.claim.sub','',true);
  perform set_config('request.jwt.claims','{"role":"anon"}',true);
  if exists(select 1 from public.posts where id=v_post) then raise exception '다시 비공개 전환 실패'; end if;
  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub',u::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',u,'role','authenticated')::text,true);
  failed:=false;
  begin perform public.save_training_post_with_visibility('[검증] 미인증','<p>본문</p>',null,'[]','vibecoding','private');
  exception when raise_exception then failed:=true; end;
  if not failed then raise exception '미인증 회원 등록 허용'; end if;
  raise notice '공개·비공개 권한 검증 통과';
end $$;
rollback;
