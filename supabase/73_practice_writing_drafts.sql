-- ============================================================
-- 73_practice_writing_drafts.sql — 작성 중인 수업 사례(임시 저장·이어 쓰기) (PRD §13.7)
--
--  - practice_writing_drafts : 사례 쓰기 화면의 내용을 자동으로 저장해 두는 본인 전용 표.
--      data = 폼 내용 전체(jsonb), title = 카드에 보일 제목, updated_at = 마지막 저장 시각.
--  - 본인만 읽고·쓰고·지운다(운영진도 볼 수 없음 — 아직 공개하지 않은 글이므로).
--  - 한 사람당 10개까지(넘으면 오류 → 화면이 오래된 것을 지우라고 안내).
--  - 올리기에 성공하면 화면이 그 임시 저장을 지운다.
--
-- 선행: 04(profiles). 적용: SQL Editor 에 붙여넣고 실행. 재실행 안전.
-- ============================================================

create table if not exists public.practice_writing_drafts (
  id         uuid        primary key default gen_random_uuid(),
  owner_id   uuid        not null default auth.uid() references public.profiles (id) on delete cascade,
  title      text        not null default '',
  data       jsonb       not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint practice_writing_drafts_title_len check (char_length(title) <= 100),
  constraint practice_writing_drafts_data_shape check (
    jsonb_typeof(data) = 'object' and pg_column_size(data) <= 262144
  )
);

create index if not exists practice_writing_drafts_owner_idx
  on public.practice_writing_drafts (owner_id, updated_at desc);

-- 수정할 때마다 마지막 저장 시각을 서버 시간으로
create or replace function public.touch_practice_writing_draft()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_practice_writing_drafts_touch on public.practice_writing_drafts;
create trigger trg_practice_writing_drafts_touch
  before update on public.practice_writing_drafts
  for each row execute function public.touch_practice_writing_draft();

-- 한 사람당 10개까지
create or replace function public.limit_practice_writing_drafts()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (select count(*) from public.practice_writing_drafts where owner_id = new.owner_id) >= 10 then
    raise exception '작성 중인 사례는 10개까지 저장할 수 있어요. 필요 없는 것을 지워 주세요.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_practice_writing_drafts_limit on public.practice_writing_drafts;
create trigger trg_practice_writing_drafts_limit
  before insert on public.practice_writing_drafts
  for each row execute function public.limit_practice_writing_drafts();

alter table public.practice_writing_drafts enable row level security;

drop policy if exists "writing_drafts_select_own" on public.practice_writing_drafts;
create policy "writing_drafts_select_own" on public.practice_writing_drafts
  for select to authenticated
  using (owner_id = auth.uid());

drop policy if exists "writing_drafts_insert_own" on public.practice_writing_drafts;
create policy "writing_drafts_insert_own" on public.practice_writing_drafts
  for insert to authenticated
  with check (owner_id = auth.uid());

drop policy if exists "writing_drafts_update_own" on public.practice_writing_drafts;
create policy "writing_drafts_update_own" on public.practice_writing_drafts
  for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "writing_drafts_delete_own" on public.practice_writing_drafts;
create policy "writing_drafts_delete_own" on public.practice_writing_drafts
  for delete to authenticated
  using (owner_id = auth.uid());

revoke all on public.practice_writing_drafts from anon;
grant select, insert, update, delete on public.practice_writing_drafts to authenticated;
