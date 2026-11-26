-- ============================================================
-- 86_writing_drafts.sql — 자료 등록·게시글·협업 프로젝트 이어 쓰기(임시 저장) (2026-11-26)
--
-- 수업실천사례(73 practice_writing_drafts)와 같은 방식을 세 곳에 넓힌다.
--  - writing_drafts : 쓰기 화면 내용을 자동으로 저장해 두는 본인 전용 표.
--      kind  = 'app'(자료 등록) | 'post'(게시판 글) | 'project'(협업 프로젝트)
--      scope = 같은 종류 안의 구분(게시판 이름, 새싹자료 등). 없으면 ''.
--      data  = 폼 내용(jsonb), title = 카드에 보일 제목, updated_at = 마지막 저장 시각.
--  - 본인만 읽고·쓰고·지운다(운영진도 볼 수 없음 — 아직 공개하지 않은 글이므로).
--  - 종류마다 한 사람당 10개까지(넘으면 오류 → 화면이 오래된 것을 지우라고 안내).
--  - 올리기에 성공하면 화면이 그 임시 저장을 지운다. 고치기(수정) 화면은 저장하지 않는다.
--  - 아직 올리지 않은 파일(썸네일·대표 사진·첨부·영상)은 저장하지 않는다(주소가 있는 것만).
--
-- 선행: 04(profiles). 적용: Supabase 대시보드 > SQL Editor 에 붙여넣고 실행. 재실행 안전(idempotent).
-- ============================================================

create table if not exists public.writing_drafts (
  id         uuid        primary key default gen_random_uuid(),
  owner_id   uuid        not null default auth.uid() references public.profiles (id) on delete cascade,
  kind       text        not null,
  scope      text        not null default '',
  title      text        not null default '',
  data       jsonb       not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint writing_drafts_kind check (kind in ('app', 'post', 'project')),
  constraint writing_drafts_scope_len check (char_length(scope) <= 40),
  constraint writing_drafts_title_len check (char_length(title) <= 100),
  constraint writing_drafts_data_shape check (
    jsonb_typeof(data) = 'object' and pg_column_size(data) <= 262144
  )
);

create index if not exists writing_drafts_owner_idx
  on public.writing_drafts (owner_id, kind, updated_at desc);

-- 수정할 때마다 마지막 저장 시각을 서버 시간으로
create or replace function public.touch_writing_draft()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_writing_drafts_touch on public.writing_drafts;
create trigger trg_writing_drafts_touch
  before update on public.writing_drafts
  for each row execute function public.touch_writing_draft();

-- 종류마다 한 사람당 10개까지
create or replace function public.limit_writing_drafts()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (select count(*) from public.writing_drafts where owner_id = new.owner_id and kind = new.kind) >= 10 then
    raise exception '작성 중인 글은 10개까지 저장할 수 있어요. 필요 없는 것을 지워 주세요.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_writing_drafts_limit on public.writing_drafts;
create trigger trg_writing_drafts_limit
  before insert on public.writing_drafts
  for each row execute function public.limit_writing_drafts();

alter table public.writing_drafts enable row level security;

drop policy if exists "writing_drafts_select_own" on public.writing_drafts;
create policy "writing_drafts_select_own" on public.writing_drafts
  for select to authenticated
  using (owner_id = auth.uid());

drop policy if exists "writing_drafts_insert_own" on public.writing_drafts;
create policy "writing_drafts_insert_own" on public.writing_drafts
  for insert to authenticated
  with check (owner_id = auth.uid());

drop policy if exists "writing_drafts_update_own" on public.writing_drafts;
create policy "writing_drafts_update_own" on public.writing_drafts
  for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "writing_drafts_delete_own" on public.writing_drafts;
create policy "writing_drafts_delete_own" on public.writing_drafts
  for delete to authenticated
  using (owner_id = auth.uid());

revoke all on public.writing_drafts from anon;
grant select, insert, update, delete on public.writing_drafts to authenticated;
