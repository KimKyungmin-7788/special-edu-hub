-- 58_member_email 적용 후 실행. 공개 설정·문의는 마지막에 ROLLBACK.
begin;
set local statement_timeout='30s';
do $$
declare admin_id uuid; m uuid; other uuid; denied boolean; n integer; mail text;
begin
  select id into admin_id from public.profiles where role='admin' limit 1;
  select id into m from public.profiles where role='member' limit 1;
  select id into other from public.profiles where role='member' and id<>m limit 1;
  if admin_id is null or m is null or other is null then raise exception '테스트에 관리자와 회원 2명이 필요합니다.'; end if;
  update public.profiles set email_public=false where id in (m, other);

  execute 'set local role authenticated';

  -- 관리자: 전체 회원 이메일을 받는다
  perform set_config('request.jwt.claim.sub',admin_id::text,true);
  select count(*) into n from public.admin_member_emails() where email is not null;
  if n < 2 then raise exception 'FAIL admin emails %', n; end if;

  -- 일반 회원: 관리자 함수 거절, 남의 비공개 이메일 못 받음, 본인 것은 받음
  perform set_config('request.jwt.claim.sub',m::text,true);
  denied:=false;
  begin perform public.admin_member_emails(); exception when raise_exception then denied:=true; end;
  if not denied then raise exception 'FAIL member reads all emails'; end if;
  if public.profile_email(other) is not null then raise exception 'FAIL private email exposed'; end if;
  if public.profile_email(m) is null then raise exception 'FAIL own email'; end if;

  -- profiles.email 칸 직접 읽기 차단(다른 칸은 그대로)
  denied:=false;
  begin perform email from public.profiles limit 1; exception when insufficient_privilege then denied:=true; end;
  if not denied then raise exception 'FAIL profiles.email readable'; end if;
  perform id, nickname, avatar_url, role, email_public from public.profiles limit 1;

  -- 로그인 문의: 이메일 칸을 비워도 계정 이메일로 접수
  perform public.submit_inquiry('request','[검증] 문의','본문',null);
  execute 'reset role';
  select email into mail from public.inquiries where user_id=m and subject='[검증] 문의' order by created_at desc limit 1;
  if mail is null then raise exception 'FAIL inquiry email'; end if;

  -- 공개를 켜면 다른 사람도 받는다, 비로그인은 공개분만
  update public.profiles set email_public=true where id=other;
  execute 'set local role anon';
  perform set_config('request.jwt.claim.sub','',true);
  if public.profile_email(other) is null then raise exception 'FAIL public email hidden'; end if;
  if public.profile_email(m) is not null then raise exception 'FAIL anon reads private email'; end if;
end $$;
select '회원 이메일 권한 검사 통과 — 모든 변경 롤백' as result;
rollback;
