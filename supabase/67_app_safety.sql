-- ============================================================
-- 67_app_safety.sql — 자료별 안전 확인 정보 (PRD 14.3 2단계, 2026-11-10)
--
-- 설계 요약
--  - 등록 교사가 자료(웹앱)에 대해 적는 선택 입력: 학생 정보 저장, 저장 항목,
--    학생의 AI 사용, 대상 연령, 저작권. 그 앱을 쓰는 동료 교사에게 보여 주는 정보다.
--  - 저장할 때마다 새 줄을 넣는다(이력 보존). 자료의 현재 정보 = 가장 최근 줄.
--    고치거나 지우지 않는다. 자료를 지우면 함께 지워진다.
--  - 읽기: 그 자료를 볼 수 있는 사람(apps 의 RLS 를 그대로 따른다 — 숨김·교사 전용 포함).
--    쓰기: 자료 작성자 또는 운영진, 본인 이름으로만.
--
-- 선행: 12·15·26(apps 와 그 RLS), 15(is_staff).
-- 적용: Supabase 대시보드 > SQL Editor 에 붙여넣고 실행. 재실행 안전(idempotent).
--       화면 코드보다 먼저 실행해도, 나중에 실행해도 된다(없으면 화면이 입력란을 저장하지 않을 뿐).
-- ============================================================

create table if not exists public.app_safety_declarations (
  id            bigint      generated always as identity primary key,
  app_id        text        not null references public.apps (id) on delete cascade,
  declared_by   uuid        references public.profiles (id) on delete set null,
  student_data  text        check (student_data in ('none', 'device', 'server')),   -- 학생 정보 저장
  data_items    text[]      not null default '{}'
                            check (data_items <@ array['non_identifying', 'identifying', 'other']),
  data_other    text        not null default '' check (char_length(data_other) <= 100),  -- 직접 입력
  student_ai    boolean,                                                             -- 이 앱에서 학생이 AI 사용
  ai_service    text        not null default '' check (char_length(ai_service) <= 100),
  target_age    text        check (target_age in ('all', 'over14')),                -- 전 연령 / 만 14세 이상
  copyright     text        check (copyright in ('own', 'includes_others')),
  created_at    timestamptz not null default now()
);

create index if not exists app_safety_declarations_app_idx
  on public.app_safety_declarations (app_id, created_at desc, id desc);

alter table public.app_safety_declarations enable row level security;

-- 읽기: 그 자료를 볼 수 있으면 읽는다(아래 apps 조회에 apps 의 RLS 가 그대로 적용된다).
drop policy if exists "app_safety_read" on public.app_safety_declarations;
create policy "app_safety_read" on public.app_safety_declarations
  for select to anon, authenticated
  using (exists (select 1 from public.apps a where a.id = app_id));

-- 쓰기: 자료 작성자 또는 운영진이 본인 이름으로.
drop policy if exists "app_safety_insert_owner_or_staff" on public.app_safety_declarations;
create policy "app_safety_insert_owner_or_staff" on public.app_safety_declarations
  for insert to authenticated
  with check (
    declared_by = auth.uid()
    and exists (
      select 1 from public.apps a
       where a.id = app_id
         and (a.owner_id = auth.uid() or public.is_staff())
    )
  );

-- 이력은 고치거나 지우지 않는다.
revoke update, delete on public.app_safety_declarations from anon, authenticated;
revoke insert on public.app_safety_declarations from anon;

-- ── 적용 확인 ────────────────────────────────────────────
-- select polname, polcmd from pg_policy where polrelid = 'public.app_safety_declarations'::regclass;
--   → app_safety_read (r), app_safety_insert_owner_or_staff (a)
