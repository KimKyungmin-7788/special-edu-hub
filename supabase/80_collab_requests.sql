-- ============================================================
-- 80_collab_requests.sql — 협업 프로젝트 2묶음 (PRD §15)
--
-- 설계 요약
--  - collab_requests   : 협업 요청. 지금 하는 일·요청 메시지·이루고 싶은 것.
--                        상태 pending(답 기다림) / accepted(함께함) / declined(이번엔 어려움) / closed(모집 마감).
--                        읽기 = 요청한 본인·그 프로젝트 리더·운영진만. 쓰기는 아래 RPC 로만.
--  - collab_team_links : 결성 때 리더가 넣는 카카오톡 오픈채팅 링크. 읽기 = 리더·함께하는 사람·운영진만.
--  - 함께하는 사람(닉네임)은 공개 — collab_members(프로젝트) 함수로만 내보낸다(요청 내용은 안 나감).
--  - RPC: send_collab_request / cancel_collab_request / decide_collab_request /
--         form_collab_project / set_collab_team_link / collab_members
--  - 알림: notifications 에 'collab' 종류 추가(snippet = 문장, link = 프로젝트 주소).
--
-- 선행: 41(notifications, notify 차단 규칙), 79(collab_projects), 12(is_verified_teacher), 15(is_staff).
-- 적용: Supabase 대시보드 > SQL Editor 에 붙여넣고 실행. 재실행 안전(idempotent).
-- ============================================================

-- ── 1. 요청 ──────────────────────────────────────────────
create table if not exists public.collab_requests (
  id          uuid        primary key default gen_random_uuid(),
  project_id  uuid        not null references public.collab_projects (id) on delete cascade,
  user_id     uuid        not null references public.profiles (id) on delete cascade,
  work        text        not null,
  message     text        not null,
  goal        text        not null default '',
  status      text        not null default 'pending',
  created_at  timestamptz not null default now(),
  decided_at  timestamptz,

  constraint collab_requests_unique   unique (project_id, user_id),
  constraint collab_requests_work     check (char_length(btrim(work)) between 1 and 60),
  constraint collab_requests_message  check (char_length(btrim(message)) between 1 and 300),
  constraint collab_requests_goal     check (char_length(goal) <= 200),
  constraint collab_requests_status   check (status in ('pending', 'accepted', 'declined', 'closed'))
);

create index if not exists collab_requests_project_idx on public.collab_requests (project_id, created_at);
create index if not exists collab_requests_user_idx    on public.collab_requests (user_id, created_at desc);

alter table public.collab_requests enable row level security;

drop policy if exists "collab_requests_read_party" on public.collab_requests;
create policy "collab_requests_read_party" on public.collab_requests
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_staff()
    or exists (select 1 from public.collab_projects p where p.id = project_id and p.leader_id = auth.uid())
  );

revoke all on public.collab_requests from anon, authenticated;
grant select on public.collab_requests to authenticated;

-- ── 2. 카카오톡 링크 ─────────────────────────────────────
create table if not exists public.collab_team_links (
  project_id  uuid        primary key references public.collab_projects (id) on delete cascade,
  kakao_url   text        not null,
  updated_at  timestamptz not null default now(),
  constraint collab_team_links_kakao check (kakao_url ~ '^https://open\.kakao\.com/[A-Za-z0-9/_-]+$')
);

alter table public.collab_team_links enable row level security;

drop policy if exists "collab_team_links_read_team" on public.collab_team_links;
create policy "collab_team_links_read_team" on public.collab_team_links
  for select to authenticated
  using (
    public.is_staff()
    or exists (select 1 from public.collab_projects p where p.id = project_id and p.leader_id = auth.uid())
    or exists (select 1 from public.collab_requests r
               where r.project_id = collab_team_links.project_id and r.user_id = auth.uid() and r.status = 'accepted')
  );

revoke all on public.collab_team_links from anon, authenticated;
grant select on public.collab_team_links to authenticated;

-- ── 3. 알림 종류 'collab' ────────────────────────────────
alter table public.notifications drop constraint if exists notifications_type;
alter table public.notifications add constraint notifications_type check (type in (
  'app_like', 'practice_like', 'comment_like', 'comment', 'reply', 'mention',
  'message', 'verify_approved', 'verify_rejected', 'notice', 'collab'
));

-- 받는 사람이 행동한 사람을 차단했으면 보내지 않는다(41 notify 와 같은 규칙)
create or replace function public.notify_collab(p_user uuid, p_actor uuid, p_project uuid, p_title text, p_text text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user = p_actor then return; end if;
  if exists (select 1 from public.blocks b where b.blocker_id = p_user and b.blocked_id = p_actor) then return; end if;
  insert into public.notifications (user_id, actor_id, type, title, snippet, link)
  values (p_user, p_actor, 'collab', coalesce(p_title, ''), left(p_text, 120), '/training/projects/' || p_project);
end;
$$;

revoke execute on function public.notify_collab(uuid, uuid, uuid, text, text) from public, anon, authenticated;

-- ── 4. 요청 보내기 ───────────────────────────────────────
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

-- ── 5. 요청 취소(본인, 모집 중일 때만 — 함께하기로 된 뒤라도 결성 전이면 빠질 수 있다) ──
create or replace function public.cancel_collab_request(p_request uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.collab_requests r
   using public.collab_projects p
   where r.id = p_request and r.user_id = auth.uid()
     and p.id = r.project_id and p.status = 'recruiting';
  if not found then raise exception '취소할 수 없는 요청이에요.'; end if;
end;
$$;

-- ── 6. 함께하기 / 이번엔 어려워요(리더) ──────────────────
create or replace function public.decide_collab_request(p_request uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req public.collab_requests;
  v_project public.collab_projects;
begin
  select * into v_req from public.collab_requests where id = p_request;
  if not found then raise exception '요청을 찾을 수 없어요.'; end if;
  select * into v_project from public.collab_projects where id = v_req.project_id for update;
  if v_project.leader_id <> auth.uid() then raise exception '리더만 정할 수 있어요.'; end if;
  if v_project.status <> 'recruiting' then raise exception '모집이 끝난 프로젝트예요.'; end if;
  if v_req.status <> 'pending' then raise exception '이미 답한 요청이에요.'; end if;
  if p_accept and (select count(*) from public.collab_requests where project_id = v_project.id and status = 'accepted') >= v_project.needed then
    raise exception '모집 인원이 다 찼어요.';
  end if;

  update public.collab_requests
     set status = case when p_accept then 'accepted' else 'declined' end, decided_at = now()
   where id = p_request;

  perform public.notify_collab(v_req.user_id, auth.uid(), v_project.id, v_project.title,
    case when p_accept then '님의 프로젝트에 함께하게 되었어요' else '님이 이번엔 함께하기 어렵다고 답했어요' end);
end;
$$;

-- ── 7. 결성 확정(리더): 마감일 + 오픈채팅 링크 → 작업 중, 기다리는 요청은 모집 마감 ──
create or replace function public.form_collab_project(p_project uuid, p_due date, p_kakao text)
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
  if v_project.leader_id <> auth.uid() then raise exception '리더만 결성을 확정할 수 있어요.'; end if;
  if v_project.status <> 'recruiting' then raise exception '이미 결성된 프로젝트예요.'; end if;
  if not exists (select 1 from public.collab_requests where project_id = p_project and status = 'accepted') then
    raise exception '함께하는 사람이 1명 이상 있어야 해요.';
  end if;
  if p_due is null or p_due < current_date then raise exception '마감일은 오늘이나 그 뒤로 골라 주세요.'; end if;
  if p_kakao is null or btrim(p_kakao) !~ '^https://open\.kakao\.com/[A-Za-z0-9/_-]+$' then
    raise exception '카카오톡 오픈채팅 주소(https://open.kakao.com/…)를 넣어 주세요.';
  end if;

  update public.collab_projects set status = 'working', due_date = p_due where id = p_project;
  insert into public.collab_team_links (project_id, kakao_url) values (p_project, btrim(p_kakao))
  on conflict (project_id) do update set kakao_url = excluded.kakao_url, updated_at = now();
  update public.collab_requests set status = 'closed', decided_at = now()
   where project_id = p_project and status = 'pending';

  for v_member in select user_id from public.collab_requests where project_id = p_project and status = 'accepted' loop
    perform public.notify_collab(v_member, auth.uid(), p_project, v_project.title, '님의 프로젝트 팀이 꾸려졌어요. 팀 공간에서 단톡방에 들어가 주세요');
  end loop;
end;
$$;

-- ── 8. 오픈채팅 링크 바꾸기(리더, 작업 중) ──────────────
create or replace function public.set_collab_team_link(p_project uuid, p_kakao text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.collab_projects where id = p_project and leader_id = auth.uid() and status = 'working') then
    raise exception '작업 중인 프로젝트의 리더만 바꿀 수 있어요.';
  end if;
  if p_kakao is null or btrim(p_kakao) !~ '^https://open\.kakao\.com/[A-Za-z0-9/_-]+$' then
    raise exception '카카오톡 오픈채팅 주소(https://open.kakao.com/…)를 넣어 주세요.';
  end if;
  update public.collab_team_links set kakao_url = btrim(p_kakao), updated_at = now() where project_id = p_project;
end;
$$;

-- ── 9. 함께하는 사람(공개: 닉네임·사진만) ───────────────
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
   where r.project_id = p_project and r.status = 'accepted'
   order by r.decided_at;
$$;

revoke execute on function public.send_collab_request(uuid, text, text, text) from public, anon;
revoke execute on function public.cancel_collab_request(uuid) from public, anon;
revoke execute on function public.decide_collab_request(uuid, boolean) from public, anon;
revoke execute on function public.form_collab_project(uuid, date, text) from public, anon;
revoke execute on function public.set_collab_team_link(uuid, text) from public, anon;
grant execute on function public.send_collab_request(uuid, text, text, text) to authenticated;
grant execute on function public.cancel_collab_request(uuid) to authenticated;
grant execute on function public.decide_collab_request(uuid, boolean) to authenticated;
grant execute on function public.form_collab_project(uuid, date, text) to authenticated;
grant execute on function public.set_collab_team_link(uuid, text) to authenticated;
grant execute on function public.collab_members(uuid) to anon, authenticated;
