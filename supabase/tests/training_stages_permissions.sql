-- 62 적용 후 SQL Editor에서 실행하는 권한·단계 저장 검증. 모든 쓰기는 마지막에 롤백한다.
-- 인증 교사 2명과 미인증 회원 1명이 필요하다.
begin;
set local statement_timeout = '30s';
do $$
declare a uuid; b uuid; unverified uuid; post_id uuid; failed boolean;
begin
  select id into a from public.profiles where is_teacher_verified order by id limit 1;
  select id into b from public.profiles where is_teacher_verified and id <> a order by id limit 1;
  select id into unverified from public.profiles where not is_teacher_verified order by id limit 1;
  if a is null or b is null or unverified is null then raise exception '검증용 인증 교사 2명·미인증 회원 1명이 필요합니다.'; end if;

  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', a::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', a, 'role', 'authenticated')::text, true);
  post_id := public.save_training_post_with_stage('[검증] 연수 단계', '<p>검증 후 롤백</p>', null, '[]', 'agent');
  if not exists(select 1 from public.posts where id = post_id and training_stage = 'agent' and author_id = a) then
    raise exception '단계 저장 실패';
  end if;
  perform public.save_training_post_with_stage('[검증] 단계 수정', '<p>검증 후 롤백</p>', null, '[]', 'field', post_id);
  if not exists(select 1 from public.posts where id = post_id and training_stage = 'field') then raise exception '단계 수정 실패'; end if;
  failed := false;
  begin perform public.save_training_post_with_stage('[검증] 잘못된 단계', '<p>본문</p>', null, '[]', 'unknown');
  exception when raise_exception then failed := true; end;
  if not failed then raise exception '잘못된 단계 허용'; end if;

  perform set_config('request.jwt.claim.sub', b::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', b, 'role', 'authenticated')::text, true);
  failed := false;
  begin perform public.save_training_post_with_stage('[검증] 타인 수정', '<p>본문</p>', null, '[]', 'agent', post_id);
  exception when raise_exception then failed := true; end;
  if not failed then raise exception '타인 글 수정 허용'; end if;

  perform set_config('request.jwt.claim.sub', unverified::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', unverified, 'role', 'authenticated')::text, true);
  failed := false;
  begin perform public.save_training_post_with_stage('[검증] 미인증 등록', '<p>본문</p>', null, '[]', 'agent');
  exception when raise_exception then failed := true; end;
  if not failed then raise exception '미인증 등록 허용'; end if;

  execute 'set local role anon';
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  if not exists(select 1 from public.posts where id = post_id and training_stage = 'field') then raise exception '공개 읽기 실패'; end if;
  failed := false;
  begin perform public.save_training_post_with_stage('[검증] 비로그인 등록', '<p>본문</p>', null, '[]', 'agent');
  exception when insufficient_privilege then failed := true; end;
  if not failed then raise exception '비로그인 등록 허용'; end if;
  raise notice '단계 등록·수정, 타인 수정 차단, 미인증·비로그인 등록 차단, 공개 읽기 검증 통과';
end $$;
rollback;
