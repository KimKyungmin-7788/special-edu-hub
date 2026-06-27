-- ============================================================
-- 17_reports.sql — 신고(report) : 테이블 + RLS + RPC (묶음 R-2·R-3)
--
-- 설계 요약 (신고/차단 — 공개 확대 전 안전 전제)
--  - 신고 = 운영진에게 넘기는 도구(차단 blocks 와 별개).
--  - 이번 범위 대상 = 쪽지(message)만. 스키마는 user·app 까지 일반화해 두되
--    (target_type check), 제출 경로는 쪽지만 구현(report_message RPC).
--  - 프라이버시: reports 는 staff 전용 조회(+신고자 본인). 피신고자는 신고 사실·
--    신고자 신원을 못 본다. 권한은 RLS 가 강제(UI 아님).
--  - 쪽지 신고는 RPC 로 받는다(직접 insert 아님):
--      · 신고자가 그 쪽지의 당사자인지 검증(위조 방지)
--      · 신고 시점 본문을 DB 에서 스냅샷(target_snapshot) → 운영진이 전체 DM 을
--        열지 않고도 신고된 내용을 신뢰성 있게 확인(본문 위조 불가)
--      · 피신고 사용자(쪽지=발신자)를 reported_user_id 로 기록 → 운영진 조치 연결
--  - 처리(resolved/dismissed)는 staff 전용 RPC handle_report(R-3). 직접 UPDATE 회수.
--
-- 적용: Supabase 대시보드 > SQL Editor 에 붙여넣고 실행. 재실행 안전(idempotent).
-- 선행: 08_messages.sql(messages), 15_roles.sql(is_staff) 이 적용돼 있어야 한다.
-- ============================================================

-- ── 테이블 ────────────────────────────────────────────────
create table if not exists public.reports (
  id               uuid        primary key default gen_random_uuid(),
  reporter_id      uuid        not null references public.profiles (id) on delete cascade,
  target_type      text        not null check (target_type in ('user','app','message')),
  target_id        text        not null,            -- 다형성(uuid·text 혼재) → text, FK 없음
  reported_user_id uuid        references public.profiles (id) on delete set null, -- 피신고 사용자
  target_snapshot  text,                            -- 신고 시점 스냅샷(쪽지 본문 등)
  reason           text        not null,            -- 사유 분류 코드
  detail           text,                            -- 자유 서술(선택)
  status           text        not null default 'pending'
                               check (status in ('pending','resolved','dismissed')),
  handled_by       uuid        references public.profiles (id),
  handled_at       timestamptz,
  handler_note     text,
  created_at       timestamptz not null default now()
);

-- 신고 큐(대기/처리) 최신순 조회용.
create index if not exists reports_status_idx on public.reports (status, created_at desc);
-- 같은 사람이 같은 대상에 '대기중' 신고를 중복으로 쌓지 못하게(스팸 방지).
create unique index if not exists reports_one_pending
  on public.reports (reporter_id, target_type, target_id) where status = 'pending';

-- ── RLS ──────────────────────────────────────────────────
alter table public.reports enable row level security;

-- 조회: 운영진 전체 / 일반 사용자는 자기 신고만. (피신고자는 못 본다)
drop policy if exists "reports_select_staff_or_own" on public.reports;
create policy "reports_select_staff_or_own"
  on public.reports
  for select
  to authenticated
  using (public.is_staff() or auth.uid() = reporter_id);

-- 직접 신고 insert(향후 user·app 대상용): 본인 신고·pending 강제.
-- 쪽지 신고는 report_message RPC(security definer)로 받으므로 이 정책을 안 탄다.
drop policy if exists "reports_insert_own" on public.reports;
create policy "reports_insert_own"
  on public.reports
  for insert
  to authenticated
  with check (auth.uid() = reporter_id and status = 'pending');

-- 처리는 handle_report RPC 로만 → 직접 UPDATE/DELETE 회수.
revoke update, delete on public.reports from anon, authenticated;

-- ── 쪽지 신고 RPC (security definer) ──────────────────────
-- 신고자는 그 쪽지의 당사자여야 한다. 본문은 DB 에서 스냅샷(위조 불가).
create or replace function public.report_message(
  p_message_id uuid,
  p_reason     text,
  p_detail     text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  m record;
begin
  select id, sender_id, recipient_id, body
    into m
    from public.messages
   where id = p_message_id;
  if not found then
    raise exception 'message not found';
  end if;

  -- 위조 방지: 신고자는 그 쪽지의 발신자 또는 수신자여야.
  if auth.uid() not in (m.sender_id, m.recipient_id) then
    raise exception 'permission denied';
  end if;

  insert into public.reports (
    reporter_id, target_type, target_id, reported_user_id, target_snapshot, reason, detail
  )
  values (
    auth.uid(), 'message', m.id::text,
    case when m.sender_id = auth.uid() then m.recipient_id else m.sender_id end,
    m.body, p_reason, p_detail
  )
  -- 이미 같은 쪽지에 대기중 신고가 있으면 조용히 무시(중복 방지).
  on conflict (reporter_id, target_type, target_id) where status = 'pending'
  do nothing;
end;
$$;

revoke execute on function public.report_message(uuid, text, text) from anon;
grant  execute on function public.report_message(uuid, text, text) to authenticated;

-- ── 신고 처리 RPC (staff 전용, R-3) ───────────────────────
-- status 를 resolved/dismissed 로 바꾸고 처리자·시각·메모를 기록.
create or replace function public.handle_report(
  p_id     uuid,
  p_status text,
  p_note   text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    raise exception 'permission denied';
  end if;
  if p_status not in ('resolved','dismissed') then
    raise exception 'invalid status';
  end if;

  update public.reports
     set status       = p_status,
         handler_note = p_note,
         handled_by   = auth.uid(),
         handled_at   = now()
   where id = p_id;
end;
$$;

revoke execute on function public.handle_report(uuid, text, text) from anon;
grant  execute on function public.handle_report(uuid, text, text) to authenticated;
