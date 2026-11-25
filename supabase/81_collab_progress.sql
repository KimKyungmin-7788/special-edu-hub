-- ============================================================
-- 81_collab_progress.sql — 협업 프로젝트 3묶음 (PRD §15.2-3)
--
-- 설계 요약
--  - collab_projects 에 review(협업 과정·후기), app_id(연결한 자료, 리더 본인 것만), done_at,
--    overdue_notified(마감 지남 알림 보냈는지) 추가. 이 칸들은 화면에서 직접 못 고치고 아래 RPC 로만.
--  - collab_updates : 진행 소식 한 줄(100자). 누구나 봄, 작업 중 프로젝트의 리더만 씀·지움(운영진도 지움).
--  - collab_notes   : 완성 뒤 팀원 한 줄 소감(100자). 누구나 봄, 함께한 본인만 씀·고침·지움.
--  - RPC: add_collab_update / delete_collab_update / extend_collab_due / finish_collab_project /
--         stop_collab_project / set_collab_note / notify_collab_overdue
--  - 마감 지남 알림: 예약 작업 없이, 리더가 사이트에 들어와 알림 수를 볼 때 notify_collab_overdue 가
--    마감일이 지난 작업 중 프로젝트마다 한 번만 알림을 만든다(기한을 늘리면 다시 한 번).
--
-- 선행: 79(collab_projects), 80(collab_requests, notify_collab, 'collab' 알림), 15(is_staff), 12(apps.owner_id).
-- 적용: Supabase 대시보드 > SQL Editor 에 붙여넣고 실행. 재실행 안전(idempotent).
-- ============================================================

-- ── 1. 프로젝트 칸 추가 ──────────────────────────────────
alter table public.collab_projects add column if not exists review text not null default '';
alter table public.collab_projects add column if not exists app_id text references public.apps (id) on delete set null;
alter table public.collab_projects add column if not exists done_at timestamptz;
alter table public.collab_projects add column if not exists overdue_notified boolean not null default false;

alter table public.collab_projects drop constraint if exists collab_projects_review;
alter table public.collab_projects add constraint collab_projects_review check (char_length(review) <= 2000);

-- 79 의 표 단위 select 권한에 새 칸도 포함된다. 쓰기 권한(칸 단위 insert/update)에는 넣지 않는다.

-- ── 2. 진행 소식 ─────────────────────────────────────────
create table if not exists public.collab_updates (
  id          uuid        primary key default gen_random_uuid(),
  project_id  uuid        not null references public.collab_projects (id) on delete cascade,
  body        text        not null,
  created_at  timestamptz not null default now(),
  constraint collab_updates_body check (char_length(btrim(body)) between 1 and 100)
);

create index if not exists collab_updates_project_idx on public.collab_updates (project_id, created_at desc);

alter table public.collab_updates enable row level security;

drop policy if exists "collab_updates_read" on public.collab_updates;
create policy "collab_updates_read" on public.collab_updates
  for select to anon, authenticated using (true);

revoke all on public.collab_updates from anon, authenticated;
grant select on public.collab_updates to anon, authenticated;

-- ── 3. 팀원 한 줄 소감 ───────────────────────────────────
create table if not exists public.collab_notes (
  project_id  uuid        not null references public.collab_projects (id) on delete cascade,
  user_id     uuid        not null references public.profiles (id) on delete cascade,
  body        text        not null,
  created_at  timestamptz not null default now(),
  primary key (project_id, user_id),
  constraint collab_notes_body check (char_length(btrim(body)) between 1 and 100)
);

alter table public.collab_notes enable row level security;

drop policy if exists "collab_notes_read" on public.collab_notes;
create policy "collab_notes_read" on public.collab_notes
  for select to anon, authenticated using (true);

revoke all on public.collab_notes from anon, authenticated;
grant select on public.collab_notes to anon, authenticated;

-- ── 4. 진행 소식 남기기·지우기 ───────────────────────────
create or replace function public.add_collab_update(p_project uuid, p_body text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.collab_projects where id = p_project and leader_id = auth.uid() and status = 'working') then
    raise exception '작업 중인 프로젝트의 리더만 소식을 남길 수 있어요.';
  end if;
  if p_body is null or char_length(btrim(p_body)) not between 1 and 100 then
    raise exception '소식은 1~100자로 써 주세요.';
  end if;
  insert into public.collab_updates (project_id, body) values (p_project, btrim(p_body));
end;
$$;

create or replace function public.delete_collab_update(p_update uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.collab_updates u
   using public.collab_projects p
   where u.id = p_update and p.id = u.project_id
     and (p.leader_id = auth.uid() or public.is_staff());
  if not found then raise exception '지울 수 없는 소식이에요.'; end if;
end;
$$;

-- ── 5. 기한 늘리기(리더, 작업 중) ────────────────────────
create or replace function public.extend_collab_due(p_project uuid, p_due date)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_due is null or p_due < current_date then raise exception '마감일은 오늘이나 그 뒤로 골라 주세요.'; end if;
  update public.collab_projects set due_date = p_due, overdue_notified = false
   where id = p_project and leader_id = auth.uid() and status = 'working';
  if not found then raise exception '작업 중인 프로젝트의 리더만 기한을 바꿀 수 있어요.'; end if;
end;
$$;

-- ── 6. 완성(리더, 작업 중 → 완성 / 완성 뒤 후기·자료 고치기) ──
create or replace function public.finish_collab_project(p_project uuid, p_review text, p_app text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project public.collab_projects;
  v_member uuid;
begin
  select * into v_project from public.collab_projects where id = p_project for update;
  if not found then raise exception '프로젝트를 찾을 수 없어요.'; end if;
  if v_project.leader_id <> auth.uid() then raise exception '리더만 완성으로 바꿀 수 있어요.'; end if;
  if v_project.status not in ('working', 'done') then raise exception '작업 중인 프로젝트만 완성으로 바꿀 수 있어요.'; end if;
  if p_review is null or char_length(btrim(p_review)) not between 1 and 2000 then
    raise exception '협업 과정과 후기를 1~2000자로 써 주세요.';
  end if;
  if nullif(p_app, '') is not null
     and not exists (select 1 from public.apps where id = p_app and owner_id = auth.uid()) then
    raise exception '내가 올린 자료만 연결할 수 있어요.';
  end if;

  update public.collab_projects
     set status = 'done', review = btrim(p_review), app_id = nullif(p_app, ''),
         done_at = coalesce(done_at, now())
   where id = p_project;

  if v_project.status = 'working' then
    for v_member in select user_id from public.collab_requests where project_id = p_project and status = 'accepted' loop
      perform public.notify_collab(v_member, auth.uid(), p_project, v_project.title, '님이 프로젝트를 완성으로 바꿨어요. 한 줄 소감을 남겨 주세요');
    end loop;
  end if;
end;
$$;

-- ── 7. 그만두기(리더, 작업 중) ───────────────────────────
create or replace function public.stop_collab_project(p_project uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project public.collab_projects;
  v_member uuid;
begin
  select * into v_project from public.collab_projects where id = p_project for update;
  if not found or v_project.leader_id <> auth.uid() or v_project.status <> 'working' then
    raise exception '작업 중인 프로젝트의 리더만 그만둘 수 있어요.';
  end if;
  update public.collab_projects set status = 'stopped' where id = p_project;
  for v_member in select user_id from public.collab_requests where project_id = p_project and status = 'accepted' loop
    perform public.notify_collab(v_member, auth.uid(), p_project, v_project.title, '님이 프로젝트를 그만두기로 했어요');
  end loop;
end;
$$;

-- ── 8. 한 줄 소감(함께한 본인, 완성 뒤). 빈 글이면 지운다 ──
create or replace function public.set_collab_note(p_project uuid, p_body text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.collab_projects where id = p_project and status = 'done') then
    raise exception '완성된 프로젝트에만 소감을 남길 수 있어요.';
  end if;
  if not exists (select 1 from public.collab_requests where project_id = p_project and user_id = auth.uid() and status = 'accepted') then
    raise exception '함께한 사람만 소감을 남길 수 있어요.';
  end if;
  if p_body is null or btrim(p_body) = '' then
    delete from public.collab_notes where project_id = p_project and user_id = auth.uid();
    return;
  end if;
  if char_length(btrim(p_body)) > 100 then raise exception '소감은 100자까지 쓸 수 있어요.'; end if;
  insert into public.collab_notes (project_id, user_id, body) values (p_project, auth.uid(), btrim(p_body))
  on conflict (project_id, user_id) do update set body = excluded.body;
end;
$$;

-- ── 9. 마감 지남 알림(리더 본인 것만, 프로젝트마다 한 번) ──
create or replace function public.notify_collab_overdue()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then return; end if;
  with due as (
    update public.collab_projects
       set overdue_notified = true
     where leader_id = auth.uid() and status = 'working'
       and due_date < current_date and not overdue_notified
    returning id, title
  )
  insert into public.notifications (user_id, actor_id, type, title, snippet, link)
  select auth.uid(), null, 'collab', d.title,
         '마감일이 지났어요. 기한을 늘리거나 완성·그만두기를 골라 주세요', '/training/projects/' || d.id
    from due d;
end;
$$;

revoke execute on function public.add_collab_update(uuid, text) from public, anon;
revoke execute on function public.delete_collab_update(uuid) from public, anon;
revoke execute on function public.extend_collab_due(uuid, date) from public, anon;
revoke execute on function public.finish_collab_project(uuid, text, text) from public, anon;
revoke execute on function public.stop_collab_project(uuid) from public, anon;
revoke execute on function public.set_collab_note(uuid, text) from public, anon;
revoke execute on function public.notify_collab_overdue() from public, anon;
grant execute on function public.add_collab_update(uuid, text) to authenticated;
grant execute on function public.delete_collab_update(uuid) to authenticated;
grant execute on function public.extend_collab_due(uuid, date) to authenticated;
grant execute on function public.finish_collab_project(uuid, text, text) to authenticated;
grant execute on function public.stop_collab_project(uuid) to authenticated;
grant execute on function public.set_collab_note(uuid, text) to authenticated;
grant execute on function public.notify_collab_overdue() to authenticated;
