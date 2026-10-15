-- 42. 키오스크 업체 확정기 (단독 도구 tools/kiosk-picker 전용)
-- 교사 1명당 1행. 다시 확정하면 덮어쓴다. 로그인 없이 anon 으로 읽기·확정.
-- 재실행해도 안전(idempotent).

create table if not exists public.kiosk_picks (
  teacher    text primary key,
  place      text not null,
  updated_at timestamptz not null default now()
);

alter table public.kiosk_picks drop constraint if exists kiosk_picks_teacher_chk;
alter table public.kiosk_picks add constraint kiosk_picks_teacher_chk check (teacher in (
  '박아남','백범준','박정아','오지선','조윤희','김숙','전세나','박경혜','석미현','김정은',
  '김금래','김용식','이다솜','원소형','이영주','안현희','김영채','김현숙','천명원','이지혜'
));

alter table public.kiosk_picks drop constraint if exists kiosk_picks_place_chk;
alter table public.kiosk_picks add constraint kiosk_picks_place_chk check (place in (
  '농협하나로-메가커피','방통대앞-메가커피','33떡볶이','맥도날드'
));

alter table public.kiosk_picks enable row level security;

drop policy if exists kiosk_picks_select on public.kiosk_picks;
create policy kiosk_picks_select on public.kiosk_picks for select to anon, authenticated using (true);

drop policy if exists kiosk_picks_insert on public.kiosk_picks;
create policy kiosk_picks_insert on public.kiosk_picks for insert to anon, authenticated with check (true);

drop policy if exists kiosk_picks_update on public.kiosk_picks;
create policy kiosk_picks_update on public.kiosk_picks for update to anon, authenticated using (true) with check (true);

grant select, insert, update on public.kiosk_picks to anon, authenticated;
