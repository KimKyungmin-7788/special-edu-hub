-- ============================================================
-- 08_messages.sql — 쪽지(1:1 메시지) MVP : 테이블 + RLS + RPC
-- (2단계 묶음 E-1)
--
-- 설계 요약 (PRD §11.2.E)
--  - 발신: 로그인한 모든 사용자.
--  - 조회: 내가 sender 이거나 recipient 인 행만. 내 쪽에서 소프트 삭제한 행은 숨김.
--  - 발신: sender_id = auth.uid() 강제(발신자 위조 차단).
--  - 수정: 본문·상대·created_at 은 불변. read_at·삭제표시만 바뀐다.
--      ↳ 한 행에 두 당사자가 있고 각자 만질 컬럼이 달라(수신자=read_at·recipient_deleted_at,
--        발신자=sender_deleted_at), profiles 의 단순 컬럼 GRANT 로는 당사자 구분이 안 된다.
--        그래서 직접 UPDATE 는 회수(revoke)하고, 수정은 security definer RPC 로만 한다.
--  - 차단/신고는 후속. 구조만: blocks 테이블 + 발신 정책에 not exists(block) 한 줄 추가로 확장 가능.
--
-- 적용: Supabase 대시보드 > SQL Editor 에 붙여넣고 실행. 재실행 안전(idempotent).
-- ============================================================

-- ── 테이블 ────────────────────────────────────────────────
create table if not exists public.messages (
  id                   uuid        primary key default gen_random_uuid(),
  sender_id            uuid        not null references public.profiles (id) on delete cascade,
  recipient_id         uuid        not null references public.profiles (id) on delete cascade,
  body                 text        not null check (char_length(body) between 1 and 2000),
  created_at           timestamptz not null default now(),
  read_at              timestamptz,            -- null = 안 읽음
  sender_deleted_at    timestamptz,            -- 발신자가 보낸함에서 지움(소프트)
  recipient_deleted_at timestamptz,            -- 수신자가 받은함에서 지움(소프트)
  constraint messages_no_self check (sender_id <> recipient_id)
);

-- ── 인덱스 ────────────────────────────────────────────────
-- 받은함: recipient + 최신순 / 보낸함: sender + 최신순
create index if not exists messages_recipient_idx on public.messages (recipient_id, created_at desc);
create index if not exists messages_sender_idx    on public.messages (sender_id,    created_at desc);
-- 안 읽음 카운트(받은함, 미삭제, 미열람)용 부분 인덱스
create index if not exists messages_unread_idx
  on public.messages (recipient_id)
  where read_at is null and recipient_deleted_at is null;

-- ── RLS ──────────────────────────────────────────────────
alter table public.messages enable row level security;

-- 조회: 내가 당사자이고, 내 쪽에서 소프트 삭제하지 않은 행만 보인다.
drop policy if exists "messages_read_own" on public.messages;
create policy "messages_read_own"
  on public.messages
  for select
  to authenticated
  using (
    (auth.uid() = sender_id    and sender_deleted_at    is null) or
    (auth.uid() = recipient_id and recipient_deleted_at is null)
  );

-- 발신: 발신자 위조 차단(보내는 사람은 반드시 나).
drop policy if exists "messages_insert_self" on public.messages;
create policy "messages_insert_self"
  on public.messages
  for insert
  to authenticated
  with check (auth.uid() = sender_id);

-- 수정·삭제 정책은 두지 않는다 → 직접 UPDATE/DELETE 불가. 변경은 아래 RPC 로만.
revoke update, delete on public.messages from anon, authenticated;

-- ── RPC (security definer) ────────────────────────────────
-- 본문·상대는 절대 안 바뀐다. 각 당사자는 자기 쪽 상태만 변경.

-- 받은 쪽지 읽음 처리: 수신자 본인 + 아직 안 읽은 것만(한 번만 now() 기록).
create or replace function public.mark_message_read(p_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.messages
     set read_at = now()
   where id = p_id
     and recipient_id = auth.uid()
     and read_at is null;
$$;

-- 쪽지 삭제(소프트): 호출자가 발신자면 sender 쪽, 수신자면 recipient 쪽만 표시.
-- 한쪽이 지워도 상대 사본은 유지된다.
create or replace function public.delete_message(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.messages
     set sender_deleted_at    = case when sender_id    = auth.uid() then now()
                                     else sender_deleted_at    end,
         recipient_deleted_at = case when recipient_id = auth.uid() then now()
                                     else recipient_deleted_at end
   where id = p_id
     and (sender_id = auth.uid() or recipient_id = auth.uid());
end;
$$;

-- 익명 사용자는 RPC 호출 불가, 로그인 사용자만.
revoke execute on function public.mark_message_read(uuid) from anon;
revoke execute on function public.delete_message(uuid)    from anon;
grant  execute on function public.mark_message_read(uuid) to authenticated;
grant  execute on function public.delete_message(uuid)    to authenticated;
