-- ============================================================
-- 19_comments.sql — 댓글(comment) : 테이블 + RLS + 소프트삭제 RPC (PRD 4단계, 묶음 C-1)
--
-- 설계 요약 (앱 상세 댓글 — 안전 전제 차단/신고 갖춰진 뒤 공개 댓글)
--  - 발신 = 로그인 전체 개방(쪽지와 동일). 작성자 이름은 화면에서 ProfileTrigger 로 연결.
--  - 이번 범위 = 평면 댓글(대댓글 없음). parent_id 컬럼은 후속 답글용으로 미리 둔다
--    (이번 단계 INSERT 정책이 parent_id 를 항상 null 로 강제 → 동작은 아직 만들지 않음).
--  - 삭제 = 소프트삭제(deleted_at). 본인 또는 운영진만. 직접 UPDATE/DELETE 는 회수하고
--    delete_comment RPC(security definer)로만 처리 → 본문 수정·위조 불가.
--  - 수정(편집)은 이번 범위 밖(작성/삭제만).
--
-- 적용: Supabase 대시보드 > SQL Editor 에 붙여넣고 실행. 재실행 안전(idempotent).
-- 선행: 01_schema.sql(apps), 04_profiles.sql(profiles), 15_roles.sql(is_staff).
-- ============================================================

-- ── 테이블 ────────────────────────────────────────────────
create table if not exists public.comments (
  id         uuid        primary key default gen_random_uuid(),
  app_id     text        not null references public.apps (id)     on delete cascade,
  author_id  uuid        not null references public.profiles (id) on delete cascade,
  body       text        not null,
  parent_id  uuid        references public.comments (id) on delete cascade, -- 후속 답글용(이번 미사용)
  created_at timestamptz not null default now(),
  deleted_at timestamptz                                              -- 소프트삭제(채워지면 숨김)
);

-- 앱별 댓글 목록(오래된 순) 조회용. 삭제된 건 제외.
create index if not exists comments_app_idx
  on public.comments (app_id, created_at) where deleted_at is null;

-- ── RLS ──────────────────────────────────────────────────
alter table public.comments enable row level security;

-- 조회: 누구나(익명 포함) 미삭제 댓글만.
drop policy if exists "comments_public_read" on public.comments;
create policy "comments_public_read"
  on public.comments
  for select
  to anon, authenticated
  using (deleted_at is null);

-- 작성: 로그인 사용자가 본인 명의로만. 이번 범위는 평면 댓글 → parent_id 는 null 강제.
-- 빈 본문 차단.
drop policy if exists "comments_insert_own" on public.comments;
create policy "comments_insert_own"
  on public.comments
  for insert
  to authenticated
  with check (
    auth.uid() = author_id
    and parent_id is null
    and char_length(btrim(body)) > 0
  );

-- 수정/삭제는 delete_comment RPC 로만 → 직접 UPDATE/DELETE 회수(본문 수정·위조 차단).
revoke update, delete on public.comments from anon, authenticated;

-- ── 소프트삭제 RPC (security definer) ─────────────────────
-- 본인 또는 운영진만 자기/문제 댓글을 숨길 수 있다. 본문은 건드리지 않는다.
create or replace function public.delete_comment(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  c record;
begin
  select id, author_id, deleted_at into c
    from public.comments
   where id = p_id;
  if not found then
    raise exception 'comment not found';
  end if;

  if auth.uid() <> c.author_id and not public.is_staff() then
    raise exception 'permission denied';
  end if;

  if c.deleted_at is not null then
    return; -- 이미 삭제됨 → 조용히 통과
  end if;

  update public.comments
     set deleted_at = now()
   where id = p_id;
end;
$$;

revoke execute on function public.delete_comment(uuid) from anon;
grant  execute on function public.delete_comment(uuid) to authenticated;
