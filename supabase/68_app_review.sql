-- ============================================================
-- 68_app_review.sql — 자동 점검 뒤 공개 · 점검 이력 · 운영진 검토 (PRD 14.3 3·4단계, 2026-11-10)
--
-- 설계 요약
--  - 자료를 등록하면 누리집 서버(api/safety-check.ts)가 앱 주소를 자동으로 점검한다.
--      걸린 것 없음(pass)        → 바로 공개(approved), 마크 '자동 점검 확인'(verified)
--      확인 불가(unverifiable)   → 바로 공개(approved), 마크 '점검 미확인'(unverified)
--      보류 신호 있음(blocked)   → 공개 보류(held), 마크 '검토 중'(reviewing), 운영자에게 메일
--  - apps.review_status(게시 상태)와 apps.verification_status(검증 마크)는 별개의 칸이다.
--      review_status       : pending(점검 대기) · held(자동 보류) · changes_requested(보완 요청)
--                            · approved(공개) · suspended(게시 중단)
--      verification_status : unverified · verified · reviewing · reverify(재검증 필요)
--    두 칸은 작성자·운영진 모두 직접 고칠 수 없다. 아래 RPC 만 바꾼다(트리거가 강제).
--    작성자 숨김(apps.status)은 지금 그대로 따로 둔다.
--  - 공개 목록에는 status='published' 이면서 review_status='approved' 인 자료만 보인다.
--    작성자 본인과 운영진은 지금처럼 모두 본다.
--  - 앱 주소를 바꾸면 점검 대기(pending)로 돌아가 다시 점검받는다. 다른 칸만 고치면 그대로다.
--    앱 주소가 없는 자료(파일만)는 점검할 앱이 없어 바로 공개한다.
--  - 이미 공개돼 있던 자료를 다시 점검해 보류 신호가 나와도 자동으로 내리지 않는다.
--    마크만 '재검증 필요'로 바꾸고 운영자에게 알린다(내리는 것은 운영진이 누른다).
--  - 기존 자료는 모두 approved + unverified 로 시작한다(지금처럼 보인다).
--  - 서버 함수는 메일 발송과 같은 비밀값(Vault 의 email_webhook_secret = Vercel 의 EMAIL_WEBHOOK_SECRET)으로
--    record_app_check 를 부른다. 새로 넣을 설정은 없다.
--  - 서약의 점검 안내 한 줄을 새 방식에 맞게 고친 새 버전을 넣는다(동의한 회원에게 한 번 더 묻는다).
--
-- ⚠️ 적용 순서: 화면·서버 코드를 먼저 배포한 뒤 이 파일을 실행한다.
--    먼저 실행하면 새로 등록한 자료가 점검 대기에 머물러 공개되지 않는다.
--
-- 선행: 12·15·26·27·61(apps·정책·뷰), 47(request_email), 66(consent_documents).
-- 적용: Supabase 대시보드 > SQL Editor 에 붙여넣고 실행. 재실행 안전(idempotent).
-- ============================================================

-- ── 1. 상태 칸 ───────────────────────────────────────────
alter table public.apps add column if not exists review_status text not null default 'approved';
alter table public.apps add column if not exists verification_status text not null default 'unverified';

alter table public.apps drop constraint if exists apps_review_status_check;
alter table public.apps add constraint apps_review_status_check
  check (review_status in ('pending', 'held', 'changes_requested', 'approved', 'suspended'));

alter table public.apps drop constraint if exists apps_verification_status_check;
alter table public.apps add constraint apps_verification_status_check
  check (verification_status in ('unverified', 'verified', 'reviewing', 'reverify'));

-- ── 2. 상태 칸 지키기 ────────────────────────────────────
-- 아래 RPC 들은 실행 중에만 app.safety_writer='1' 을 켠다. 그 밖의 쓰기는 상태 칸을 바꾸지 못한다.
create or replace function public.apps_guard_review()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_new_url text := btrim(coalesce(new.app_url, ''));
begin
  if coalesce(current_setting('app.safety_writer', true), '') = '1' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.review_status := case when v_new_url = '' then 'approved' else 'pending' end;
    new.verification_status := 'unverified';
    return new;
  end if;

  new.review_status := old.review_status;
  new.verification_status := old.verification_status;

  if v_new_url is distinct from btrim(coalesce(old.app_url, '')) then
    new.verification_status := 'unverified';
    if v_new_url = '' then
      -- 앱 주소를 뺐다: 점검할 앱이 없으니 점검 때문에 막혀 있던 것은 푼다
      if old.review_status in ('pending', 'held') then
        new.review_status := 'approved';
      end if;
    elsif old.review_status in ('approved', 'held') then
      new.review_status := 'pending';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists apps_guard_review on public.apps;
create trigger apps_guard_review
  before insert or update on public.apps
  for each row execute function public.apps_guard_review();

-- ── 3. 공개 범위: 승인된 자료만 ──────────────────────────
drop policy if exists "apps_public_read" on public.apps;
create policy "apps_public_read" on public.apps
  for select to anon, authenticated
  using (
    (status = 'published' and review_status = 'approved')
    or owner_id = auth.uid()
    or public.is_staff()
  );

create or replace view public.apps_catalog as
select
  a.id,
  a.title,
  case when l.locked then '' else a.app_url end     as app_url,
  a.thumbnail_url,
  coalesce(nullif(btrim(p.nickname), ''), a.author_name) as author_name,
  case when l.locked then '' else a.description end as description,
  a.category_ids,
  a.view_count,
  a.like_count,
  a.bookmark_count,
  a.created_at,
  a.owner_id,
  a.status,
  a.sort_order,
  a.visibility,
  l.locked,
  p.avatar_url as owner_avatar_url,
  a.summary,
  a.comment_count,
  case when l.locked then '' else a.achievement_standards end as achievement_standards,
  case when l.locked then '' else a.educational_intent end    as educational_intent,
  case when l.locked then '' else a.use_case_type end         as use_case_type,
  case when l.locked then '' else a.use_case end              as use_case,
  case when l.locked then '{}'::text[] else a.achievement_codes end as achievement_codes,
  case when l.locked then null else a.preview_url end         as preview_url,
  a.is_seedling,
  a.review_status,
  a.verification_status
from public.apps a
left join public.profiles p on p.id = a.owner_id
cross join lateral (
  select coalesce(
    a.visibility = 'teachers' and not public.can_view_teacher_content(a.owner_id),
    true  -- 판단 불가면 잠근다
  ) as locked
) l
where (a.status = 'published' and a.review_status = 'approved')
   or (a.owner_id is not null and a.owner_id = auth.uid())
   or public.is_staff();

grant select on public.apps_catalog to anon, authenticated;

-- ── 4. 점검 이력 · 검토 이력 ─────────────────────────────
create table if not exists public.app_checks (
  id              bigint      generated always as identity primary key,
  app_id          text        not null references public.apps (id) on delete cascade,
  trigger_kind    text        not null check (trigger_kind in ('register', 'edit', 'manual', 'staff')),
  requested_by    uuid        references public.profiles (id) on delete set null,
  url             text        not null default '',
  final_url       text        not null default '',
  status          text        not null check (status in ('pass', 'blocked', 'unverifiable')),
  reason          text        not null default '',
  findings        jsonb       not null default '[]'::jsonb,   -- [{rule, level, evidence}]
  facts           jsonb       not null default '{}'::jsonb,
  code_hash       text,
  file_count      integer     not null default 0,
  scanner_version text        not null default '',
  created_at      timestamptz not null default now()
);

create index if not exists app_checks_app_idx on public.app_checks (app_id, created_at desc, id desc);

create table if not exists public.app_review_events (
  id          bigint      generated always as identity primary key,
  app_id      text        not null references public.apps (id) on delete cascade,
  from_status text        not null,
  to_status   text        not null,
  actor_id    uuid        references public.profiles (id) on delete set null,  -- null = 자동 점검
  note        text        not null default '',
  created_at  timestamptz not null default now()
);

create index if not exists app_review_events_app_idx on public.app_review_events (app_id, created_at desc, id desc);

alter table public.app_checks enable row level security;
alter table public.app_review_events enable row level security;

-- 읽기: 운영진 또는 그 자료의 작성자. 쓰기는 RPC 로만.
drop policy if exists "app_checks_read" on public.app_checks;
create policy "app_checks_read" on public.app_checks
  for select to authenticated
  using (
    public.is_staff()
    or exists (select 1 from public.apps a where a.id = app_id and a.owner_id = auth.uid())
  );

drop policy if exists "app_review_events_read" on public.app_review_events;
create policy "app_review_events_read" on public.app_review_events
  for select to authenticated
  using (
    public.is_staff()
    or exists (select 1 from public.apps a where a.id = app_id and a.owner_id = auth.uid())
  );

revoke insert, update, delete on public.app_checks from anon, authenticated;
revoke insert, update, delete on public.app_review_events from anon, authenticated;

-- ── 5. 상태 바꾸기(내부용) ───────────────────────────────
create or replace function public.set_app_review(
  p_app_id       text,
  p_review       text,
  p_verification text,
  p_actor        uuid,
  p_note         text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old text;
begin
  select review_status into v_old from public.apps where id = p_app_id for update;
  if not found then
    raise exception '자료를 찾을 수 없습니다.';
  end if;

  perform set_config('app.safety_writer', '1', true);
  update public.apps
     set review_status = p_review,
         verification_status = p_verification
   where id = p_app_id;
  perform set_config('app.safety_writer', '', true);

  if v_old is distinct from p_review then
    insert into public.app_review_events (app_id, from_status, to_status, actor_id, note)
    values (p_app_id, v_old, p_review, p_actor, left(coalesce(p_note, ''), 500));
  end if;
end;
$$;

revoke all on function public.set_app_review(text, text, text, uuid, text) from public, anon, authenticated;

-- ── 6. 점검 결과 기록 (서버 함수 전용) ───────────────────
-- p_secret 이 Vault 의 email_webhook_secret 과 같아야 한다. 결과에 따라 공개·보류를 정한다.
create or replace function public.record_app_check(
  p_secret       text,
  p_app_id       text,
  p_trigger      text,
  p_requested_by uuid,
  p_result       jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_secret text;
  v_app    record;
  v_status text := p_result->>'status';
  v_review text;
  v_verif  text;
  v_first  text;
begin
  select decrypted_secret into v_secret
    from vault.decrypted_secrets where name = 'email_webhook_secret';
  if v_secret is null or p_secret is null or p_secret <> v_secret then
    raise exception '권한이 없습니다.';
  end if;
  if v_status is null or v_status not in ('pass', 'blocked', 'unverifiable') then
    raise exception '점검 결과가 올바르지 않습니다.';
  end if;

  select id, title, owner_id, app_url, review_status, verification_status
    into v_app from public.apps where id = p_app_id;
  if not found then
    raise exception '자료를 찾을 수 없습니다.';
  end if;

  insert into public.app_checks
    (app_id, trigger_kind, requested_by, url, final_url, status, reason, findings, facts, code_hash, file_count, scanner_version)
  values
    (p_app_id, p_trigger, p_requested_by, coalesce(v_app.app_url, ''),
     coalesce(p_result->>'finalUrl', ''), v_status, coalesce(p_result->>'reason', ''),
     coalesce(p_result->'findings', '[]'::jsonb), coalesce(p_result->'facts', '{}'::jsonb),
     p_result->>'codeHash', coalesce((p_result->>'fileCount')::integer, 0),
     coalesce(p_result->>'scannerVersion', ''));

  v_review := v_app.review_status;
  if v_status = 'blocked' then
    if v_app.review_status in ('pending', 'held') then
      v_review := 'held';
      v_verif := 'reviewing';
    elsif v_app.review_status = 'approved' then
      v_verif := 'reverify';   -- 이미 공개된 자료는 자동으로 내리지 않는다
    else
      v_verif := 'reviewing';
    end if;
  else
    if v_app.review_status in ('pending', 'held') then
      v_review := 'approved';
    end if;
    v_verif := case when v_status = 'pass' then 'verified' else 'unverified' end;
  end if;

  perform public.set_app_review(
    p_app_id, v_review, v_verif, null,
    case v_status when 'blocked' then '자동 점검: 확인이 필요한 항목 발견'
                  when 'pass' then '자동 점검: 걸린 것 없음'
                  else '자동 점검: 확인 불가' end
  );

  -- 새로 보류됐거나, 공개 중인 자료가 재검증 필요로 바뀌면 운영자에게 메일
  if v_status = 'blocked'
     and (v_app.review_status is distinct from v_review or v_app.verification_status is distinct from v_verif) then
    select f->>'evidence' into v_first
      from jsonb_array_elements(coalesce(p_result->'findings', '[]'::jsonb)) f
     where f->>'level' = 'block' limit 1;
    perform public.request_email(
      'staff_app_held', v_app.owner_id, null,
      jsonb_build_object('title', v_app.title, 'appId', p_app_id, 'reason', coalesce(v_first, ''),
                         'held', case when v_review = 'held' then 'yes' else '' end)
    );
  end if;

  return jsonb_build_object('review_status', v_review, 'verification_status', v_verif);
end;
$$;

revoke all on function public.record_app_check(text, text, text, uuid, jsonb) from public;
grant execute on function public.record_app_check(text, text, text, uuid, jsonb) to anon, authenticated;

-- ── 7. 운영진 검토 ───────────────────────────────────────
-- approve(승인) · request_changes(보완 요청) · suspend(게시 중단). 작성자에게 메일로 알린다.
create or replace function public.review_app(p_app_id text, p_action text, p_note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_app    record;
  v_review text;
  v_verif  text;
  v_email  text;
begin
  if not public.is_staff() then
    raise exception '권한이 없습니다(운영진만 가능).';
  end if;
  v_review := case p_action
                when 'approve' then 'approved'
                when 'request_changes' then 'changes_requested'
                when 'suspend' then 'suspended'
              end;
  if v_review is null then
    raise exception '알 수 없는 처리입니다: %', p_action;
  end if;

  select id, title, owner_id, verification_status into v_app from public.apps where id = p_app_id;
  if not found then
    raise exception '자료를 찾을 수 없습니다.';
  end if;

  -- 승인하면 '검토 중' 마크는 내린다(자동 점검 확인은 아니므로 미확인으로)
  v_verif := case when p_action = 'approve' and v_app.verification_status = 'reviewing'
                  then 'unverified' else v_app.verification_status end;

  perform public.set_app_review(p_app_id, v_review, v_verif, auth.uid(), p_note);

  if v_app.owner_id is not null and v_app.owner_id <> auth.uid() then
    select email into v_email from auth.users where id = v_app.owner_id;
    if v_email is not null then
      perform public.request_email(
        'app_review', v_app.owner_id, v_email,
        jsonb_build_object('title', v_app.title, 'appId', p_app_id, 'action', p_action,
                           'note', left(coalesce(p_note, ''), 500))
      );
    end if;
  end if;
end;
$$;

revoke all on function public.review_app(text, text, text) from public, anon;
grant execute on function public.review_app(text, text, text) to authenticated;

-- ── 8. 서약 새 버전 (점검 안내 한 줄을 새 방식에 맞게) ────
insert into public.consent_documents (kind, version, title, body, effective_date)
values
  ('upload_pledge', '2026-11-10.2', '자료 등록 준수 서약', $doc$- 학생을 알아볼 수 있는 정보(이름·얼굴·학교 등)를 자료에 담지 않았거나 필요한 동의를 받았습니다.
- 자료에 쓴 글·그림·소리·글꼴은 직접 만들었거나 사용 허락을 받았습니다.
- 자료가 개인정보를 다루거나 AI·외부 서비스를 쓰면 등록할 때 사실대로 적습니다.
- 배포한 앱을 바꾸면 등록 정보도 함께 고칩니다.

누리집은 자체 검증 시스템으로 확인할 수 있는 범위 안에서 최소한으로 점검합니다.
- 등록하면 누리집이 자동으로 점검하고, 문제가 발견된 자료만 운영진이 확인합니다.
- 앱 주소가 안전한 연결(https)로 열리는지, 다른 주소로 넘어가지 않는지 확인합니다.
- 보안 설정(보안 헤더)과 개인정보처리방침·이용약관 페이지가 있는지 확인합니다.
- 앱 파일을 읽어 외부로 연결하는 주소, 카메라·마이크·위치 사용, 기기 저장, 드러난 비밀 키가 있는지 확인합니다.
- 앱을 실행하거나 로그인해서 확인하지는 않습니다. 서버에서 일어나는 처리, 방침 내용이 사실인지, 저작권은 확인하지 못합니다.
- 확인하지 못한 항목은 안전하다고 표시하지 않습니다.

배포하기 전에 자체 점검용 스킬이나 프롬프트로 먼저 점검하기를 권장합니다.$doc$, '2026-11-10')
on conflict (kind, version) do nothing;

-- ── 적용 확인 ────────────────────────────────────────────
-- select review_status, verification_status, count(*) from public.apps group by 1, 2;
--   → 기존 자료는 모두 approved / unverified
-- select kind, version from public.consent_documents order by kind, created_at;
--   → upload_pledge 2026-11-10.2 가 추가됨
