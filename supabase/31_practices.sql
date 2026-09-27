-- ============================================================
-- 31_practices.sql — 수업실천사례 토대 (PRD §13, 묶음 P-1)
--
-- 설계 요약
--  - practices      : 사례 한 건. 고정 칸(제목·요약·대표사진·교과·대상·차시) + 자유 본문(HTML)
--                     + 링크/첨부파일 목록(jsonb). 삭제 대신 숨김(status).
--  - practice_apps  : 사례 ↔ 앱 연결(양방향 조회용). 앱마다 "이렇게 썼어요" 한 줄(note).
--  - practice-files : 첨부파일 공개 버킷(설계안 등). 파일당 10MB. 경로 <uid>/<uuid>.<ext>.
--                     ⚠️ 사용자 결정: 교사 전용 글이라도 파일 주소 자체는 공개. 뷰에서 주소만 가린다.
--  - 공개범위       : apps 와 같은 잠금 카드 방식. 권한 없는 사람에게는 뷰 practices_catalog 가
--                     body·links·files 를 비워서 주고 locked=true (제목·요약·대표사진은 공개).
--                     원본 테이블은 RESTRICTIVE 정책으로 교사 전용 행을 막는다(26 과 같은 꼴).
--  - 작성 = 인증교사 + 본인 명의 + 학생 개인정보 확인 체크(privacy_confirmed=true) 필수.
--    수정 = 본인·운영진. 집계 칼럼(조회·좋아요 등)은 컬럼 권한으로 클라이언트 수정 차단.
--
-- 선행: 04(profiles), 12(is_verified_teacher, app-thumbnails), 15(is_staff), 26(can_view_teacher_content).
-- 적용: Supabase 대시보드 > SQL Editor 에 붙여넣고 실행. 재실행 안전(idempotent).
-- ============================================================

-- ── 1. practices ────────────────────────────────────────
create table if not exists public.practices (
  id                uuid        primary key default gen_random_uuid(),
  owner_id          uuid        not null references public.profiles (id) on delete cascade,
  title             text        not null,
  summary           text        not null default '',
  cover_url         text        not null default '',
  category_ids      text[]      not null default '{}',   -- categories.ts id (앱과 공유)
  target            text        not null default '',     -- 대상(과정/학년군), 선택
  lesson_count      integer,                             -- 차시, 선택
  body              text        not null default '',     -- 자유 본문(HTML, TipTap)
  links             jsonb       not null default '[]',   -- [{title, url}]
  files             jsonb       not null default '[]',   -- [{name, path, url, size, mime}]
  visibility        text        not null default 'public',
  status            text        not null default 'published',
  privacy_confirmed boolean     not null default false,  -- 학생 개인정보 확인 체크
  view_count        integer     not null default 0,
  like_count        integer     not null default 0,
  bookmark_count    integer     not null default 0,
  comment_count     integer     not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint practices_title_len    check (char_length(btrim(title)) between 1 and 100),
  constraint practices_summary_len  check (char_length(summary) <= 60),
  constraint practices_target_len   check (char_length(target) <= 30),
  constraint practices_lesson_range check (lesson_count is null or lesson_count between 1 and 99),
  constraint practices_links_arr    check (jsonb_typeof(links) = 'array' and jsonb_array_length(links) <= 10),
  constraint practices_files_arr    check (jsonb_typeof(files) = 'array' and jsonb_array_length(files) <= 5),
  constraint practices_visibility   check (visibility in ('public', 'teachers')),
  constraint practices_status       check (status in ('published', 'hidden')),
  constraint practices_privacy      check (privacy_confirmed)
);

create index if not exists practices_status_created_idx
  on public.practices (status, created_at desc);
create index if not exists practices_owner_idx
  on public.practices (owner_id);
create index if not exists practices_categories_idx
  on public.practices using gin (category_ids);

-- updated_at 자동 갱신
create or replace function public.touch_practice_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_practices_touch on public.practices;
create trigger trg_practices_touch
  before update on public.practices
  for each row execute function public.touch_practice_updated_at();

-- ── 2. practices RLS ────────────────────────────────────
alter table public.practices enable row level security;

-- 조회: 공개 OR 본인 OR 운영진 (apps_public_read 와 같은 조건)
drop policy if exists "practices_public_read" on public.practices;
create policy "practices_public_read" on public.practices
  for select to anon, authenticated
  using (status = 'published' or owner_id = auth.uid() or public.is_staff());

-- 교사 전용 행: 권한 없으면 원본 조회 차단(뷰 practices_catalog 로만 잠금 카드 노출)
drop policy if exists "practices_teachers_only_read" on public.practices;
create policy "practices_teachers_only_read" on public.practices
  as restrictive
  for select to anon, authenticated
  using (visibility = 'public' or public.can_view_teacher_content(owner_id));

-- 등록: 인증교사 + 본인 명의 + 공개 상태로만
drop policy if exists "practices_insert_verified_owner" on public.practices;
create policy "practices_insert_verified_owner" on public.practices
  for insert to authenticated
  with check (
    public.is_verified_teacher()
    and owner_id = auth.uid()
    and status = 'published'
  );

-- 수정: 본인 또는 운영진(내용 수정·숨김/복구)
drop policy if exists "practices_update_owner_or_staff" on public.practices;
create policy "practices_update_owner_or_staff" on public.practices
  for update to authenticated
  using (owner_id = auth.uid() or public.is_staff())
  with check (owner_id = auth.uid() or public.is_staff());

-- DELETE 정책 없음 → 숨김만.

-- 컬럼 권한: 집계 칼럼·owner 변경은 클라이언트에서 막는다(트리거/RPC 로만 갱신).
revoke insert, update on public.practices from anon, authenticated;
grant insert (owner_id, title, summary, cover_url, category_ids, target, lesson_count,
              body, links, files, visibility, status, privacy_confirmed)
  on public.practices to authenticated;
grant update (title, summary, cover_url, category_ids, target, lesson_count,
              body, links, files, visibility, status, privacy_confirmed)
  on public.practices to authenticated;

-- ── 3. 목록/상세용 뷰 (잠금 마스킹) ──────────────────────
-- 뷰는 소유자 권한으로 동작(원본 RLS 우회) → 공개상태 조건을 where 에 똑같이 둔다(26·28 과 동일).
create or replace view public.practices_catalog as
select
  pr.id,
  pr.owner_id,
  pr.title,
  pr.summary,
  pr.cover_url,
  pr.category_ids,
  pr.target,
  pr.lesson_count,
  case when l.locked then ''         else pr.body  end as body,
  case when l.locked then '[]'::jsonb else pr.links end as links,
  case when l.locked then '[]'::jsonb else pr.files end as files,
  jsonb_array_length(pr.files) as file_count,       -- 잠긴 카드에도 "첨부 N" 표시용
  pr.visibility,
  pr.status,
  pr.view_count,
  pr.like_count,
  pr.bookmark_count,
  pr.comment_count,
  pr.created_at,
  pr.updated_at,
  l.locked,
  p.nickname   as owner_nickname,
  p.avatar_url as owner_avatar_url
from public.practices pr
left join public.profiles p on p.id = pr.owner_id
cross join lateral (
  select coalesce(
    pr.visibility = 'teachers' and not public.can_view_teacher_content(pr.owner_id),
    true  -- 판단 불가면 잠근다
  ) as locked
) l
where pr.status = 'published'
   or pr.owner_id = auth.uid()
   or public.is_staff();

grant select on public.practices_catalog to anon, authenticated;

-- ── 4. practice_apps (사례 ↔ 앱) ─────────────────────────
create table if not exists public.practice_apps (
  practice_id uuid    not null references public.practices (id) on delete cascade,
  app_id      text    not null references public.apps (id)      on delete cascade,
  sort        integer not null default 0,
  note        text    not null default '',   -- "이렇게 썼어요" 한 줄, 선택
  primary key (practice_id, app_id),
  constraint practice_apps_note_len check (char_length(note) <= 60)
);

create index if not exists practice_apps_app_idx on public.practice_apps (app_id);

-- 헬퍼: 사례가 목록에 보이는가(공개상태 기준, 교사 전용 여부와 무관 — 연결 정보는 민감하지 않음)
create or replace function public.practice_is_listed(p_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.practices
    where id = p_id
      and (status = 'published' or owner_id = auth.uid() or public.is_staff())
  );
$$;

-- 헬퍼: 사례를 고칠 수 있는가(본인·운영진)
create or replace function public.practice_is_editable(p_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.practices
    where id = p_id
      and (owner_id = auth.uid() or public.is_staff())
  );
$$;

alter table public.practice_apps enable row level security;

drop policy if exists "practice_apps_read" on public.practice_apps;
create policy "practice_apps_read" on public.practice_apps
  for select to anon, authenticated
  using (public.practice_is_listed(practice_id));

drop policy if exists "practice_apps_insert" on public.practice_apps;
create policy "practice_apps_insert" on public.practice_apps
  for insert to authenticated
  with check (public.practice_is_editable(practice_id));

drop policy if exists "practice_apps_update" on public.practice_apps;
create policy "practice_apps_update" on public.practice_apps
  for update to authenticated
  using (public.practice_is_editable(practice_id))
  with check (public.practice_is_editable(practice_id));

drop policy if exists "practice_apps_delete" on public.practice_apps;
create policy "practice_apps_delete" on public.practice_apps
  for delete to authenticated
  using (public.practice_is_editable(practice_id));

-- ── 5. 첨부파일 공개 버킷 ────────────────────────────────
-- 브라우저가 hwp 등의 형식을 비워 보낼 수 있어, 클라이언트가 확장자로 contentType 을 정해 올린다.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'practice-files',
  'practice-files',
  true,
  10485760, -- 10MB
  array[
    'application/pdf',
    'application/x-hwp', 'application/haansofthwp', 'application/vnd.hancom.hwp',
    'application/vnd.hancom.hwpx', 'application/haansofthwpx',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/png', 'image/jpeg', 'image/webp'
  ]
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "practice_files_public_read" on storage.objects;
create policy "practice_files_public_read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'practice-files');

-- 업로드: 인증교사가 본인 uid 폴더에만
drop policy if exists "practice_files_own_insert" on storage.objects;
create policy "practice_files_own_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'practice-files'
    and auth.uid()::text = (storage.foldername(name))[1]
    and public.is_verified_teacher()
  );

-- 삭제: 본인 폴더만(첨부 빼기·교체 시 정리)
drop policy if exists "practice_files_own_delete" on storage.objects;
create policy "practice_files_own_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'practice-files'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
