-- 42_board.sql 적용 후 실행하는 비파괴 권한 테스트.
-- 실제 anon/authenticated 역할과 JWT sub를 사용한다. 모든 쓰기·알림은 마지막에 롤백.
-- 인증 일반회원 2명, 미인증 일반회원 1명, 운영진 1명이 필요하다.
begin;
set local statement_timeout = '30s';
do $$
declare
  a uuid; b uuid; unverified uuid; staff uuid;
  post_a uuid; post_b uuid; comment_a uuid; comment_b uuid; reply_b uuid;
  failed boolean; checks text[] := '{}';
begin
  select id into a from public.profiles where is_teacher_verified and role = 'member' order by id limit 1;
  select id into b from public.profiles where is_teacher_verified and role = 'member' and id <> a order by id limit 1;
  select id into unverified from public.profiles where not is_teacher_verified and role = 'member' order by id limit 1;
  select id into staff from public.profiles where role in ('admin', 'manager') order by id limit 1;
  if a is null or b is null or unverified is null or staff is null then raise exception 'Missing test roles'; end if;

  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', a::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub',a,'role','authenticated')::text, true);
  post_a := public.save_board_post('[자동검증] 롤백할 글 A', '<p>본문 A</p>');
  if not exists(select 1 from public.posts where id=post_a and author_id=a) then raise exception 'FAIL create post'; end if;
  checks := array_append(checks, 'teacher creates post with own author');
  perform public.save_board_post('[자동검증] 수정 A', '<p>수정된 본문</p>', post_a);
  if not exists(select 1 from public.posts where id=post_a and title='[자동검증] 수정 A' and body='<p>수정된 본문</p>') then raise exception 'FAIL edit post'; end if;
  checks := array_append(checks, 'author edits post');
  failed := false;
  begin perform public.save_board_post('', '<p>내용</p>'); exception when others then failed := true; end;
  if not failed then raise exception 'FAIL empty title accepted'; end if;
  failed := false;
  begin perform public.save_board_post('빈 본문', '<p></p>'); exception when others then failed := true; end;
  if not failed then raise exception 'FAIL empty body accepted'; end if;
  checks := array_append(checks, 'empty title and body rejected');
  failed := false;
  begin insert into public.posts(board_id,author_id,title,body) select board_id,a,'직접쓰기','본문' from public.posts where id=post_a;
  exception when insufficient_privilege then failed := true; end;
  if not failed then raise exception 'FAIL direct insert accepted'; end if;
  failed := false;
  begin update public.posts set pinned=true where id=post_a; exception when insufficient_privilege then failed := true; end;
  if not failed then raise exception 'FAIL direct update accepted'; end if;
  failed := false;
  begin delete from public.posts where id=post_a; exception when insufficient_privilege then failed := true; end;
  if not failed then raise exception 'FAIL direct delete accepted'; end if;
  checks := array_append(checks, 'direct post insert/update/delete denied');
  failed := false;
  begin perform public.pin_board_post(post_a,true); exception when others then failed := true; end;
  if not failed then raise exception 'FAIL member pin accepted'; end if;
  checks := array_append(checks, 'member pin denied');

  insert into public.comments(post_id,author_id,body) values(post_a,a,'댓글 A') returning id into comment_a;
  perform public.edit_comment(comment_a,'댓글 A 수정');
  if not exists(select 1 from public.comments where id=comment_a and body='댓글 A 수정' and edited_at is not null) then raise exception 'FAIL comment edit'; end if;
  checks := array_append(checks, 'author creates and edits comment');

  perform set_config('request.jwt.claim.sub', b::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub',b,'role','authenticated')::text, true);
  post_b := public.save_board_post('[자동검증] 롤백할 글 B', '<p>본문 B</p>');
  failed := false;
  begin perform public.save_board_post('타인 수정','<p>불가</p>',post_a); exception when others then failed := true; end;
  if not failed then raise exception 'FAIL other post edit'; end if;
  failed := false;
  begin perform public.delete_board_post(post_a); exception when others then failed := true; end;
  if not failed then raise exception 'FAIL other post delete'; end if;
  failed := false;
  begin perform public.edit_comment(comment_a,'타인 수정'); exception when others then failed := true; end;
  if not failed then raise exception 'FAIL other comment edit'; end if;
  failed := false;
  begin perform public.delete_comment(comment_a); exception when others then failed := true; end;
  if not failed then raise exception 'FAIL other comment delete'; end if;
  checks := array_append(checks, 'other teacher cannot edit/delete post or comment');
  failed := false;
  begin insert into public.comments(post_id,author_id,body) values(post_a,a,'작성자 위조'); exception when insufficient_privilege then failed := true; when raise_exception then failed := true; end;
  if not failed then raise exception 'FAIL comment author spoof'; end if;
  checks := array_append(checks, 'comment author spoof denied');
  insert into public.comments(post_id,author_id,body) values(post_a,b,'댓글 B') returning id into comment_b;
  insert into public.comments(post_id,author_id,body,parent_id) values(post_a,b,'답글 B',comment_a) returning id into reply_b;
  failed := false;
  begin insert into public.comments(post_id,author_id,body,parent_id) values(post_b,b,'다른 글 답글',comment_a); exception when insufficient_privilege then failed := true; end;
  if not failed then raise exception 'FAIL cross-post reply'; end if;
  failed := false;
  begin insert into public.comments(post_id,author_id,body,parent_id) values(post_a,b,'2단계 답글',reply_b); exception when insufficient_privilege then failed := true; end;
  if not failed then raise exception 'FAIL nested reply'; end if;
  checks := array_append(checks, 'reply accepted; cross-post and nested reply denied');

  perform set_config('request.jwt.claim.sub', a::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub',a,'role','authenticated')::text, true);
  if not exists(select 1 from public.notifications where user_id=a and comment_id=comment_b and type='comment' and link='/board/'||post_a::text) then raise exception 'FAIL comment notification'; end if;
  if not exists(select 1 from public.notifications where user_id=a and comment_id=reply_b and type='reply' and link='/board/'||post_a::text) then raise exception 'FAIL reply notification'; end if;
  checks := array_append(checks, 'comment and reply notifications point to post');

  perform set_config('request.jwt.claim.sub', unverified::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub',unverified,'role','authenticated')::text, true);
  if not exists(select 1 from public.posts where id=post_a) then raise exception 'FAIL member read'; end if;
  failed := false;
  begin perform public.save_board_post('미인증 글','<p>불가</p>'); exception when others then failed := true; end;
  if not failed then raise exception 'FAIL unverified post'; end if;
  failed := false;
  begin insert into public.comments(post_id,author_id,body) values(post_a,unverified,'미인증 댓글'); exception when insufficient_privilege then failed := true; when raise_exception then failed := true; end;
  if not failed then raise exception 'FAIL unverified comment'; end if;
  checks := array_append(checks, 'unverified reads but cannot write post/comment');

  execute 'set local role anon';
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  if not exists(select 1 from public.posts where id=post_a) or not exists(select 1 from public.comments where id=comment_a) then raise exception 'FAIL public read'; end if;
  failed := false;
  begin perform public.save_board_post('비로그인 글','<p>불가</p>'); exception when insufficient_privilege then failed := true; end;
  if not failed then raise exception 'FAIL anonymous post'; end if;
  failed := false;
  begin insert into public.comments(post_id,author_id,body) values(post_a,a,'비로그인 댓글'); exception when insufficient_privilege then failed := true; when raise_exception then failed := true; end;
  if not failed then raise exception 'FAIL anonymous comment'; end if;
  checks := array_append(checks, 'anonymous reads but cannot write post/comment');

  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', staff::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub',staff,'role','authenticated')::text, true);
  perform public.pin_board_post(post_a,true);
  if not exists(select 1 from public.posts where id=post_a and pinned) then raise exception 'FAIL staff pin'; end if;
  perform public.pin_board_post(post_a,false);
  if not exists(select 1 from public.posts where id=post_a and not pinned) then raise exception 'FAIL staff unpin'; end if;
  failed := false;
  begin perform public.save_board_post('운영진 타인 수정','<p>불가</p>',post_a); exception when others then failed := true; end;
  if not failed then raise exception 'FAIL staff edits others body'; end if;
  perform public.delete_comment(comment_b);
  if exists(select 1 from public.comments where id=comment_b) then raise exception 'FAIL staff comment delete'; end if;
  perform public.delete_board_post(post_b);
  if exists(select 1 from public.posts where id=post_b) then raise exception 'FAIL staff post delete'; end if;
  checks := array_append(checks, 'staff pin/unpin and moderation; others body edit denied');

  perform set_config('request.jwt.claim.sub', a::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub',a,'role','authenticated')::text, true);
  perform public.delete_comment(comment_a);
  if exists(select 1 from public.comments where id=comment_a) then raise exception 'FAIL author comment delete'; end if;
  if not exists(select 1 from public.comments where id=reply_b) then raise exception 'FAIL orphan reply lost'; end if;
  checks := array_append(checks, 'author deletes comment; existing replies retained');
  failed := false;
  begin insert into public.comments(post_id,author_id,body,parent_id) values(post_a,a,'삭제댓글 답글',comment_a); exception when insufficient_privilege then failed := true; end;
  if not failed then raise exception 'FAIL reply to deleted comment'; end if;
  checks := array_append(checks, 'reply to deleted comment denied');
  perform public.delete_board_post(post_a);
  if exists(select 1 from public.posts where id=post_a) or exists(select 1 from public.comments where post_id=post_a) then raise exception 'FAIL deleted post visible'; end if;
  failed := false;
  begin insert into public.comments(post_id,author_id,body) values(post_a,a,'삭제글 댓글'); exception when insufficient_privilege then failed := true; when raise_exception then failed := true; end;
  if not failed then raise exception 'FAIL comment on deleted post'; end if;
  checks := array_append(checks, 'author deletes post; post/comments hidden; new comments denied');

  perform set_config('board_test.results', to_json(checks)::text, true);
end $$;
select current_setting('board_test.results')::json as passed;
rollback;
