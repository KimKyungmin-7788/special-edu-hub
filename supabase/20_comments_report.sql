-- ============================================================
-- 20_comments_report.sql — 댓글 신고 연동 (PRD 4단계, 묶음 C-3)
--
-- 설계 요약
--  - 17_reports.sql 의 신고 인프라(reports 테이블·RLS·큐·handle_report)를 그대로 재사용.
--    이번엔 대상에 'comment' 를 추가하고, 쪽지(report_message)와 같은 모양의
--    report_comment RPC 를 둔다.
--  - 쪽지와 동일한 안전장치: 본문 스냅샷(target_snapshot)·피신고자(작성자) 기록·중복 pending 방지.
--    단 당사자 검증은 없다 — 댓글은 공개라 누구나 신고할 수 있다(스팸은 1인1대상 pending 유니크로 억제).
--  - /admin 신고큐는 target_type 무관하게 스냅샷·신고자·피신고자를 표시하므로 추가 작업 없음.
--
-- 적용: Supabase 대시보드 > SQL Editor 에 붙여넣고 실행. 재실행 안전(idempotent).
-- 선행: 17_reports.sql(reports·report 인프라), 19_comments.sql(comments).
-- ============================================================

-- ── 대상 타입에 'comment' 추가 ────────────────────────────
alter table public.reports drop constraint if exists reports_target_type_check;
alter table public.reports add  constraint reports_target_type_check
  check (target_type in ('user','app','message','comment'));

-- ── 댓글 신고 RPC (security definer) ──────────────────────
-- 본문은 DB 에서 스냅샷(위조 불가). 피신고자 = 댓글 작성자.
create or replace function public.report_comment(
  p_comment_id uuid,
  p_reason     text,
  p_detail     text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  c record;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select id, author_id, body into c
    from public.comments
   where id = p_comment_id;
  if not found then
    raise exception 'comment not found';
  end if;

  insert into public.reports (
    reporter_id, target_type, target_id, reported_user_id, target_snapshot, reason, detail
  )
  values (
    auth.uid(), 'comment', c.id::text, c.author_id, c.body, p_reason, p_detail
  )
  -- 이미 같은 댓글에 내 대기중 신고가 있으면 조용히 무시(중복 방지).
  on conflict (reporter_id, target_type, target_id) where status = 'pending'
  do nothing;
end;
$$;

revoke execute on function public.report_comment(uuid, text, text) from anon;
grant  execute on function public.report_comment(uuid, text, text) to authenticated;
