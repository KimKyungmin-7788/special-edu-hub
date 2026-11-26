-- ============================================================
-- 84_collab_hide_recruiting.sql — 모집 중에는 신청 상황을 숨긴다 (PRD §15, 2026-11-26)
--
-- 의도: 몇 명이 이미 함께하기로 했는지 몰라야 누구나 부담 없이 협업 요청을 보낸다.
--  - collab_members: 모집 중이면 리더·운영진·이미 함께하기로 된 본인에게만 함께하는 사람을 돌려준다.
--    결성 뒤(작업 중·완성·그만둠)에는 지금처럼 누구나 본다.
--  - send_collab_request: 함께하기가 필요 인원만큼 차도 모집 마감일까지는 요청을 받는다
--    ('다 찼어요'로 문이 닫히면 찼다는 사실이 드러나므로). 수락(함께하기)은 여전히 필요 인원까지만(80).
--
-- 선행: 80, 82. 적용: Supabase 대시보드 > SQL Editor 에 붙여넣고 실행. 재실행 안전(idempotent).
-- ============================================================

-- ── 1. 함께하는 사람: 모집 중에는 당사자만 ─────────────────
create or replace function public.collab_members(p_project uuid)
returns table (user_id uuid, nickname text, avatar_url text)
language sql
stable
security definer
set search_path = public
as $$
  select r.user_id, pr.nickname, pr.avatar_url
    from public.collab_requests r
    join public.profiles pr on pr.id = r.user_id
    join public.collab_projects p on p.id = r.project_id
   where r.project_id = p_project and r.status = 'accepted'
     and (
       p.status <> 'recruiting'
       or p.leader_id = auth.uid()
       or public.is_staff()
       or exists (select 1 from public.collab_requests me
                   where me.project_id = p_project and me.user_id = auth.uid() and me.status = 'accepted')
     )
   order by r.decided_at;
$$;

revoke execute on function public.collab_members(uuid) from public;
grant execute on function public.collab_members(uuid) to anon, authenticated;

-- ── 2. 협업 요청: 인원이 차도 모집 마감일까지 받는다(82 와 같고 '다 찼어요' 검사만 뺌) ──
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

revoke execute on function public.send_collab_request(uuid, text, text, text) from public, anon;
grant execute on function public.send_collab_request(uuid, text, text, text) to authenticated;
