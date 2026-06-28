-- ============================================================
-- 21_inquiries.sql — 운영진 문의(inquiry) : 테이블 + RLS + RPC (5단계 트랙 C)
--
-- 설계 요약
--  - 사용자→운영진 소통 창구. 신고(reports)와 분리(신고=콘텐츠 처리, 문의=건의/요청/오류).
--  - 비로그인도 문의 가능(이메일 필수). 로그인 시 user_id 연결·이메일 자동.
--  - 쓰기는 submit_inquiry RPC(security definer)로만 받는다(원시 INSERT 미개방=스팸/위조 억제,
--    검증 일원화: 유형 화이트리스트·빈값 차단·비로그인 이메일 필수·user_id=auth.uid() 강제).
--  - 조회: staff 전체 + 본인 자기 문의(로그인). 비로그인 문의는 본인이 다시 못 본다(식별 불가).
--  - 처리: staff 전용 handle_inquiry RPC. 답변 자체는 기존 쪽지로(이 테이블은 접수·처리상태만).
--
-- 적용: Supabase 대시보드 > SQL Editor 에 붙여넣고 실행. 재실행 안전(idempotent).
-- 선행: 04_profiles.sql(profiles), 15_roles.sql(is_staff).
-- ============================================================

-- ── 테이블 ────────────────────────────────────────────────
create table if not exists public.inquiries (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        references public.profiles (id) on delete set null, -- 비로그인=null
  email        text        not null,                       -- 회신 연락처(로그인=계정메일 가능)
  type         text        not null check (type in ('suggestion','request','bug','other')),
  subject      text        not null,
  body         text        not null,
  status       text        not null default 'open' check (status in ('open','handled')),
  handled_by   uuid        references public.profiles (id),
  handled_at   timestamptz,
  handler_note text,
  created_at   timestamptz not null default now()
);

-- 문의 큐(대기/처리) 최신순 조회용.
create index if not exists inquiries_status_idx on public.inquiries (status, created_at desc);

-- ── RLS ──────────────────────────────────────────────────
alter table public.inquiries enable row level security;

-- 조회: 운영진 전체 / 로그인 사용자는 자기 문의만. (비로그인 문의는 조회 경로 없음)
drop policy if exists "inquiries_select_staff_or_own" on public.inquiries;
create policy "inquiries_select_staff_or_own"
  on public.inquiries
  for select
  to authenticated
  using (public.is_staff() or auth.uid() = user_id);

-- 쓰기는 submit_inquiry / handle_inquiry RPC 로만 → 직접 INSERT/UPDATE/DELETE 회수.
revoke insert, update, delete on public.inquiries from anon, authenticated;

-- ── 문의 접수 RPC (security definer, 비로그인 포함) ────────
create or replace function public.submit_inquiry(
  p_type    text,
  p_subject text,
  p_body    text,
  p_email   text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid   uuid := auth.uid();
  mail  text := nullif(btrim(coalesce(p_email, '')), '');
begin
  if p_type not in ('suggestion','request','bug','other') then
    raise exception 'invalid type';
  end if;
  if nullif(btrim(coalesce(p_subject, '')), '') is null
     or nullif(btrim(coalesce(p_body, '')), '') is null then
    raise exception 'subject and body required';
  end if;

  -- 로그인 사용자는 계정 이메일로 대체 가능. 비로그인은 이메일 필수.
  if uid is not null and mail is null then
    select email into mail from public.profiles where id = uid;
  end if;
  if mail is null then
    raise exception 'email required';
  end if;

  insert into public.inquiries (user_id, email, type, subject, body)
  values (uid, mail, p_type, btrim(p_subject), btrim(p_body));
end;
$$;

grant execute on function public.submit_inquiry(text, text, text, text) to anon, authenticated;

-- ── 문의 처리 RPC (staff 전용) ────────────────────────────
create or replace function public.handle_inquiry(
  p_id   uuid,
  p_note text
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

  update public.inquiries
     set status       = 'handled',
         handler_note = nullif(btrim(coalesce(p_note, '')), ''),
         handled_by   = auth.uid(),
         handled_at   = now()
   where id = p_id;
end;
$$;

revoke execute on function public.handle_inquiry(uuid, text) from anon;
grant  execute on function public.handle_inquiry(uuid, text) to authenticated;
