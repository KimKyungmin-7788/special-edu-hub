-- 44 적용 후 실행. 회원 등급·사진 기록·게시글 모두 마지막에 ROLLBACK.
-- storage.objects 에 기록만 넣어 정책을 검사한다(실제 파일 업로드 없음).
begin;
set local statement_timeout='30s';
do $$
declare a uuid; outsider uuid; staff uuid; pid uuid; own text; denied boolean;
begin
  select id into a from public.profiles where role='member' limit 1;
  select id into outsider from public.profiles where role='member' and id<>a limit 1;
  select id into staff from public.profiles where role='admin' limit 1;
  if a is null or outsider is null or staff is null then raise exception '테스트에 회원 2명과 관리자가 필요합니다.'; end if;
  own := a::text || '/' || gen_random_uuid()::text || '.webp';
  if coalesce((select public from storage.buckets where id='research-images'), true) then raise exception 'FAIL bucket missing or public'; end if;

  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub',staff::text,true);
  perform public.set_research_member(staff,false);
  perform public.set_research_member(outsider,false);
  perform public.set_research_member(a,true);

  -- 연구회회원: 본인 폴더 업로드·조회 가능, 남의 폴더 업로드 불가
  perform set_config('request.jwt.claim.sub',a::text,true);
  insert into storage.objects(bucket_id,name,owner_id) values('research-images',own,a::text);
  if not exists(select 1 from storage.objects where bucket_id='research-images' and name=own) then raise exception 'FAIL member read'; end if;
  denied:=false;
  begin insert into storage.objects(bucket_id,name,owner_id) values('research-images',outsider::text||'/'||gen_random_uuid()::text||'.webp',a::text);
  exception when insufficient_privilege then denied:=true; end;
  if not denied then raise exception 'FAIL member writes other folder'; end if;

  -- 저장 규칙: 비공개 위치 사진만 허용
  pid:=public.save_board_post_in_board('[검증] 사진','<p>본문</p><img data-research-path="'||own||'" width="300" style="width: 300px; height: auto;">',null,'research');
  denied:=false;
  begin perform public.save_board_post_in_board('외부','<p>본문</p><img src="https://example.org/a.png">',null,'research'); exception when raise_exception then denied:=true; end;
  if not denied then raise exception 'FAIL external image allowed'; end if;
  denied:=false;
  begin perform public.save_board_post_in_board('주소포함','<p>본문</p><img src="https://example.org/a.png" data-research-path="'||own||'">',null,'research'); exception when raise_exception then denied:=true; end;
  if not denied then raise exception 'FAIL src with path allowed'; end if;
  denied:=false;
  begin perform public.save_board_post_in_board('영상','<p>본문</p><video></video>',null,'research'); exception when raise_exception then denied:=true; end;
  if not denied then raise exception 'FAIL video allowed'; end if;

  -- 비회원·연구회 등급 없는 관리자: 업로드·조회 불가
  foreach pid in array array[outsider,staff] loop
    perform set_config('request.jwt.claim.sub',pid::text,true);
    if exists(select 1 from storage.objects where bucket_id='research-images' and name=own) then raise exception 'FAIL non-member reads image'; end if;
    denied:=false;
    begin insert into storage.objects(bucket_id,name,owner_id) values('research-images',pid::text||'/'||gen_random_uuid()::text||'.webp',pid::text);
    exception when insufficient_privilege then denied:=true; end;
    if not denied then raise exception 'FAIL non-member uploads'; end if;
  end loop;

  -- 등급 회수 후 작성자 본인도 조회 불가
  perform set_config('request.jwt.claim.sub',staff::text,true);
  perform public.set_research_member(a,false);
  perform set_config('request.jwt.claim.sub',a::text,true);
  if exists(select 1 from storage.objects where bucket_id='research-images' and name=own) then raise exception 'FAIL revoked member reads image'; end if;

  -- 비로그인 조회 불가, 자유게시판 사진 규칙은 그대로
  execute 'set local role anon';
  perform set_config('request.jwt.claim.sub','',true);
  if exists(select 1 from storage.objects where bucket_id='research-images') then raise exception 'FAIL anonymous reads image'; end if;
end $$;
select '연구회 사진 권한 검사 통과 — 모든 변경 롤백' as result;
rollback;
