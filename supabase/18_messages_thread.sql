-- ============================================================
-- 18_messages_thread.sql — 쪽지 대화방(스레드) 보조 RPC
--
-- 배경: 쪽지함을 받은함/보낸함 평면 목록 → 사람별 대화방(메신저식)으로 개편.
--  - 대화 목록·스레드 조회는 기존 messages RLS(내 것 + 내 쪽 미삭제)로 충분 →
--    클라이언트(lib/messages)에서 상대별로 묶는다. 새 정책 불필요.
--  - 다만 "대화방 열면 안 읽음 일괄 읽음" / "대화방 통째로 나가기(소프트삭제)"는
--    여러 행을 한 번에 바꾸므로 RPC 로 묶는다(08 의 직접 UPDATE 회수 원칙 유지).
--  - 두 함수 모두 호출자 본인 쪽만 건드린다. 본문·상대·created_at 은 불변.
--
-- 적용: Supabase 대시보드 > SQL Editor 에 붙여넣고 실행. 재실행 안전(idempotent).
-- 선행: 08_messages.sql.
-- ============================================================

-- 대화방 열 때: 그 상대에게서 받은 안 읽은 쪽지를 한 번에 읽음 처리.
create or replace function public.mark_thread_read(p_other uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.messages
     set read_at = now()
   where recipient_id = auth.uid()
     and sender_id    = p_other
     and read_at is null
     and recipient_deleted_at is null;
$$;

-- 대화방 나가기: 그 상대와 주고받은 쪽지를 내 쪽에서만 소프트 삭제.
-- 내가 보낸 건 sender_deleted_at, 받은 건 recipient_deleted_at 만 찍는다(상대 사본 유지).
create or replace function public.delete_thread(p_other uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.messages
     set sender_deleted_at = now()
   where sender_id = auth.uid()
     and recipient_id = p_other
     and sender_deleted_at is null;

  update public.messages
     set recipient_deleted_at = now()
   where recipient_id = auth.uid()
     and sender_id = p_other
     and recipient_deleted_at is null;
end;
$$;

revoke execute on function public.mark_thread_read(uuid) from anon;
revoke execute on function public.delete_thread(uuid)    from anon;
grant  execute on function public.mark_thread_read(uuid) to authenticated;
grant  execute on function public.delete_thread(uuid)    to authenticated;
