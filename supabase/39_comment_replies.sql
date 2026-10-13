-- ============================================================
-- 39_comment_replies.sql — 댓글 답글(대댓글 1단계) 허용 (트랙 E, 2026-10-13)
--
-- 설계 요약
--  - 19 에서 미리 둔 parent_id 를 실제로 쓴다. 답글은 "최상위 댓글"에만 달 수 있다(1단계).
--    답글의 답글은 화면에서 같은 묶음 안에 '@닉네임' 멘션을 붙여 최상위 댓글에 단다.
--  - 부모 조건: 존재 + 최상위(parent_id is null) + 미삭제 + 같은 대상(앱 또는 사례).
--    → can_reply_to_comment() (security definer) 로 검사. 정책 안에서 comments 를 다시
--      읽으면 RLS 가 겹쳐 보이므로 함수로 분리한다.
--  - 멘션(@닉네임)은 본문 안 토큰 '@[닉네임](사용자id)' 으로 저장 → DB 변경 없음. 알림 없음.
--  - 답글이 달린 댓글을 지우면: 기존 소프트삭제 그대로. 화면이 부모가 안 보이는 답글 묶음에
--    '삭제된 댓글입니다' 자리를 표시한다(본문은 노출하지 않음).
--  - 잠금(34 restrictive 정책)·댓글 수 트리거(34)는 그대로 적용된다(답글도 1개로 셈).
--
-- 적용: Supabase 대시보드 > SQL Editor 에 붙여넣고 실행. 재실행 안전(idempotent).
-- 선행: 19(comments), 34(practice_id·잠금 정책).
-- ============================================================

-- 답글 묶음 조회용
create index if not exists comments_parent_idx
  on public.comments (parent_id) where parent_id is not null;

-- ── 부모 검사 함수 ────────────────────────────────────────
create or replace function public.can_reply_to_comment(
  p_parent   uuid,
  p_app      text,
  p_practice uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.comments c
     where c.id = p_parent
       and c.parent_id is null
       and c.deleted_at is null
       and c.app_id      is not distinct from p_app
       and c.practice_id is not distinct from p_practice
  );
$$;

revoke execute on function public.can_reply_to_comment(uuid, text, uuid) from public, anon;
grant  execute on function public.can_reply_to_comment(uuid, text, uuid) to authenticated;

-- ── 작성 정책 교체 (19 의 parent_id is null 강제를 풂) ──────
drop policy if exists "comments_insert_own" on public.comments;
create policy "comments_insert_own"
  on public.comments
  for insert
  to authenticated
  with check (
    auth.uid() = author_id
    and char_length(btrim(body)) > 0
    and (
      parent_id is null
      or public.can_reply_to_comment(parent_id, app_id, practice_id)
    )
  );
