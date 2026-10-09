-- ============================================================
-- 38_site_visits.sql — 푸터 방문자 수(오늘 다녀간 사람·지금까지 다녀간 사람) (2026-10-09)
--
-- 세는 방법
--  - 브라우저마다 무작위 번호(visitor_key)를 만들어 기기에 저장하고, 같은 번호는 하루(한국 시간)에 한 번만 센다.
--  - 오늘 = 오늘 날짜 행 수, 지금까지 = 전체 행 수(날마다 센 방문자 수의 합).
--  - IP·계정 정보는 저장하지 않는다. visitor_key 는 무작위 문자열이라 누군지 알 수 없다.
--  - "지금 함께 보는 사람"은 Supabase 실시간(presence)으로 세며 DB 에 저장하지 않는다.
--
-- 보안
--  - 테이블은 RLS 를 켜고 정책을 두지 않아 직접 읽기·쓰기를 막는다. record_visit 함수로만 기록·집계한다.
--  - 누적 시작값(이 기능 이전 추정치)은 코드 config(site.ts visitors.baseTotal)에서 더한다. DB 에는 넣지 않는다.
--
-- 적용: Supabase 대시보드 > SQL Editor 에 붙여넣고 실행. 재실행 안전(idempotent).
-- 되돌리기: drop function public.record_visit(text); drop table public.site_visits;
-- ============================================================

create table if not exists public.site_visits (
  day         date        not null,
  visitor_key text        not null check (char_length(visitor_key) between 8 and 64),
  created_at  timestamptz not null default now(),
  primary key (day, visitor_key)
);

alter table public.site_visits enable row level security;
revoke all on public.site_visits from anon, authenticated;

-- 방문 기록(하루 한 번) + 오늘·누적 방문자 수 반환.
create or replace function public.record_visit(p_key text)
returns table (today bigint, total bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  d date := (now() at time zone 'Asia/Seoul')::date;
begin
  if p_key is null or char_length(p_key) not between 8 and 64 then
    raise exception 'invalid visitor key';
  end if;

  insert into public.site_visits (day, visitor_key)
  values (d, p_key)
  on conflict do nothing;

  return query
  select
    (select count(*) from public.site_visits v where v.day = d),
    (select count(*) from public.site_visits);
end;
$$;

revoke all on function public.record_visit(text) from public;
grant execute on function public.record_visit(text) to anon, authenticated;
