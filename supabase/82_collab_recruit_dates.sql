-- ============================================================
-- 82_collab_recruit_dates.sql — 협업 프로젝트: 열 때 모집 마감일·완성 목표일 (PRD §15, 2026-11-26)
--
-- 설계 요약
--  - collab_projects.recruit_until(모집 마감일, 새로 여는 프로젝트는 필수) + recruit_notified(마감 알림 보냈는지).
--  - 열 때 완성 목표일(due_date, 선택)도 넣을 수 있다. 결성 확정 때 이 날짜가 미리 채워지고 바꿀 수 있다.
--  - 두 날짜는 모집 중일 때만 리더가 고칠 수 있다(트리거가 막음). 작업 중 마감일은 81 의 '기한 늘리기'로만.
--  - 모집 마감일이 지나면 새 협업 요청을 받지 않는다(send_collab_request). 리더는 결성 확정 또는 모집 기한 늘리기.
--  - 모집 마감일이 지나면 리더에게 알림 한 번(81 의 notify_collab_overdue 에 합침, 기한을 늘리면 다시 한 번).
--
-- 선행: 79, 80, 81. 적용: Supabase 대시보드 > SQL Editor 에 붙여넣고 실행. 재실행 안전(idempotent).
-- ============================================================

-- ── 1. 칸 추가 ───────────────────────────────────────────
alter table public.collab_projects add column if not exists recruit_until date;
alter table public.collab_projects add column if not exists recruit_notified boolean not null default false;

-- ── 2. 열기 규칙: 모집 마감일 필수(오늘 이후), 완성 목표일은 선택(모집 마감일 이후) ──
drop policy if exists "collab_projects_insert_verified_leader" on public.collab_projects;
create policy "collab_projects_insert_verified_leader" on public.collab_projects
  for insert to authenticated
  with check (
    public.is_verified_teacher()
    and leader_id = auth.uid()
    and status = 'recruiting'
    and recruit_until is not null
    and recruit_until >= current_date
    and (due_date is null or due_date >= recruit_until)
  );

grant insert (leader_id, title, vision, body, cover_url, mockup_url, needed, recruit_until, due_date)
  on public.collab_projects to authenticated;
grant update (title, vision, body, cover_url, mockup_url, needed, recruit_until, due_date)
  on public.collab_projects to authenticated;

-- ── 3. 날짜 고치기 지킴이: 화면에서 직접 고칠 때만 검사(RPC 는 소유자 권한이라 통과) ──
create or replace function public.guard_collab_project_dates()
returns trigger
language plpgsql
as $$
begin
  if current_user not in ('authenticated', 'anon') then return new; end if;
  if new.recruit_until is not distinct from old.recruit_until and new.due_date is not distinct from old.due_date then
    return new;
  end if;
  if old.status <> 'recruiting' then
    raise exception '모집 중일 때만 날짜를 고칠 수 있어요.';
  end if;
  if new.recruit_until is distinct from old.recruit_until then
    if new.recruit_until is null or new.recruit_until < current_date then
      raise exception '모집 마감일은 오늘이나 그 뒤로 골라 주세요.';
    end if;
    new.recruit_notified := false;
  end if;
  if new.due_date is not null and new.due_date < coalesce(new.recruit_until, current_date) then
    raise exception '완성 목표일은 모집 마감일이나 그 뒤로 골라 주세요.';
  end if;
  return new;
end;
$$;

drop trigger if exists collab_projects_guard_dates on public.collab_projects;
create trigger collab_projects_guard_dates
  before update on public.collab_projects
  for each row execute function public.guard_collab_project_dates();

-- ── 4. 협업 요청: 모집 마감일이 지나면 받지 않는다(80 과 같고 마감 검사만 더함) ──
create or replace function public.send_collab_request(p_project uuid, p_work text, p_message text, p_goal text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project public.collab_projects;
  v_id uuid;
begin
  if not public.is_verified_teacher() then raise exception '교사인증 회원만 협업 요청을 보낼 수 있어요.'; end if;
  select * into v_project from public.collab_projects where id = p_project for update;
  if not found then raise exception '프로젝트를 찾을 수 없어요.'; end if;
  if v_project.leader_id = auth.uid() then raise exception '내가 연 프로젝트에는 요청할 수 없어요.'; end if;
  if v_project.status <> 'recruiting' then raise exception '모집이 끝난 프로젝트예요.'; end if;
  if v_project.recruit_until is not null and v_project.recruit_until < current_date then
    raise exception '모집 기간이 끝났어요.';
  end if;
  if (select count(*) from public.collab_requests where project_id = p_project and status = 'accepted') >= v_project.needed then
    raise exception '모집 인원이 다 찼어요.';
  end if;
  if exists (select 1 from public.blocks b
             where (b.blocker_id = v_project.leader_id and b.blocked_id = auth.uid())
                or (b.blocker_id = auth.uid() and b.blocked_id = v_project.leader_id)) then
    raise exception '이 프로젝트에는 요청할 수 없어요.';
  end if;

  insert into public.collab_requests (project_id, user_id, work, message, goal)
  values (p_project, auth.uid(), btrim(p_work), btrim(p_message), btrim(coalesce(p_goal, '')))
  returning id into v_id;

  perform public.notify_collab(v_project.leader_id, auth.uid(), p_project, v_project.title, '님이 협업 요청을 보냈어요');
  return v_id;
end;
$$;

-- ── 5. 마감 지남 알림: 작업 중 마감(81) + 모집 마감(82), 프로젝트마다 한 번 ──
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

  with closed as (
    update public.collab_projects
       set recruit_notified = true
     where leader_id = auth.uid() and status = 'recruiting'
       and recruit_until < current_date and not recruit_notified
    returning id, title
  )
  insert into public.notifications (user_id, actor_id, type, title, snippet, link)
  select auth.uid(), null, 'collab', c.title,
         '모집 마감일이 지났어요. 결성을 확정하거나 모집 기한을 늘려 주세요', '/training/projects/' || c.id
    from closed c;
end;
$$;

revoke execute on function public.send_collab_request(uuid, text, text, text) from public, anon;
revoke execute on function public.notify_collab_overdue() from public, anon;
grant execute on function public.send_collab_request(uuid, text, text, text) to authenticated;
grant execute on function public.notify_collab_overdue() to authenticated;
