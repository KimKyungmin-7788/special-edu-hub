-- ============================================================
-- 56_notice_recall.sql — 보낸 공지 알림 목록·거두기 (2026-11-03)
--
-- 설계 요약
--  - send_notice(41)는 회원 한 명당 알림 한 줄(type='notice')을 한 번에 만든다.
--    한 번 보낸 공지의 줄들은 제목·보낸 시각(created_at, 한 트랜잭션이라 모두 같음)이 같다 → 이것이 "공지 한 건".
--  - list_sent_notices(): 보낸 공지를 한 건씩 묶어 최신순으로(받은 회원 수·읽은 수 포함). 운영진만.
--  - recall_notice(제목, 보낸 시각): 그 공지로 만든 알림을 모든 회원에게서 지운다. 지운 줄 수를 돌려준다. 운영진만.
--  - 표 권한은 그대로(회원은 자기 알림 읽기만). 두 함수만 security definer 로 운영진에게 연다.
--
-- 적용: Supabase 대시보드 > SQL Editor 에 전체 붙여넣고 실행. 재실행 안전(idempotent).
-- 선행: 15(is_staff), 41(notifications, send_notice).
-- ============================================================
begin;

create or replace function public.list_sent_notices()
returns table (
  title      text,
  snippet    text,
  link       text,
  sent_at    timestamptz,
  recipients integer,
  read_count integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    raise exception 'permission denied';
  end if;
  return query
    select n.title, min(n.snippet), min(n.link), n.created_at,
           count(*)::integer, count(n.read_at)::integer
      from public.notifications n
     where n.type = 'notice'
     group by n.title, n.created_at
     order by n.created_at desc
     limit 50;
end;
$$;

revoke execute on function public.list_sent_notices() from public, anon;
grant  execute on function public.list_sent_notices() to authenticated;

create or replace function public.recall_notice(p_title text, p_sent_at timestamptz)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if not public.is_staff() then
    raise exception 'permission denied';
  end if;
  delete from public.notifications
   where type = 'notice' and title = p_title and created_at = p_sent_at;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function public.recall_notice(text, timestamptz) from public, anon;
grant  execute on function public.recall_notice(text, timestamptz) to authenticated;

commit;

-- 확인(선택): 운영진으로 로그인한 화면에서 공지 알림 탭의 '보낸 공지' 목록이 보이면 적용된 것.
-- 비로그인(anon)으로 호출하면 권한 오류가 나야 정상.
