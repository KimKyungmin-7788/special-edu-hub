-- ============================================================
-- 26_app_visibility.sql — 자료 공개범위(전체 / 인증교사만) + 잠금 카드
--
-- 설계 요약
--  - apps.visibility: 'public'(기본) | 'teachers'(인증교사만). 기존 자료는 전부 public.
--  - 교사 전용 내용(app_url·description)을 볼 수 있는 사람 = 인증교사 · 작성자 본인 · 운영진.
--  - 목록/상세 읽기는 뷰 apps_catalog 로 한다. 권한 없는 사람에게는 교사 전용 행의
--    app_url·description 을 빈 값으로 내려주고 locked=true 를 붙인다(제목·썸네일은 노출 = 잠금 카드).
--    ※ 이 뷰는 의도적으로 소유자 권한(security definer 성격)으로 동작한다 — apps 원본 RLS 를
--      우회하므로 공개상태 조건(published/본인/운영진)을 뷰 where 절에 똑같이 둔다.
--      Supabase advisor 의 "Security Definer View" 경고는 이 이유로 의도된 것.
--  - apps 원본 테이블은 RESTRICTIVE 정책으로 권한 없는 사람의 교사 전용 행 SELECT 를 막는다
--    (뷰를 우회해 원본을 직접 조회해도 내용이 새지 않게). 기존 정책(15)은 그대로 두고 AND 로 겹친다.
--  - 댓글: 잠긴 자료의 댓글은 권한 없는 사람이 읽지도 쓰지도 못한다(RESTRICTIVE).
--
-- 선행: 12(apps.owner_id·status, is_verified_teacher), 15(is_staff), 19(comments).
-- 적용: Supabase 대시보드 > SQL Editor 에 붙여넣고 실행. 재실행 안전(idempotent).
-- ============================================================

-- ── 1. 컬럼 ─────────────────────────────────────────────
alter table public.apps
  add column if not exists visibility text not null default 'public';

alter table public.apps drop constraint if exists apps_visibility_check;
alter table public.apps
  add constraint apps_visibility_check check (visibility in ('public', 'teachers'));

-- ── 2. 교사 전용 내용 열람 가능 여부 헬퍼 ─────────────────
create or replace function public.can_view_teacher_content(app_owner uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select (app_owner is not null and app_owner = auth.uid())
      or public.is_verified_teacher()
      or public.is_staff();
$$;

-- ── 3. apps 원본: 권한 없으면 교사 전용 행 SELECT 차단 ────
drop policy if exists "apps_teachers_only_read" on public.apps;
create policy "apps_teachers_only_read" on public.apps
  as restrictive
  for select to anon, authenticated
  using (visibility = 'public' or public.can_view_teacher_content(owner_id));

-- ── 4. 목록/상세용 뷰 (잠금 마스킹) ──────────────────────
drop view if exists public.apps_catalog;
create view public.apps_catalog as
select
  a.id,
  a.title,
  case when l.locked then '' else a.app_url end     as app_url,
  a.thumbnail_url,
  a.author_name,
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
  l.locked
from public.apps a
cross join lateral (
  select (a.visibility = 'teachers'
          and not public.can_view_teacher_content(a.owner_id)) as locked
) l
-- apps_public_read(15) 와 같은 공개상태 조건: 공개 OR 본인 OR 운영진
where a.status = 'published'
   or (a.owner_id is not null and a.owner_id = auth.uid())
   or public.is_staff();

grant select on public.apps_catalog to anon, authenticated;

-- ── 5. 댓글: 잠긴 자료는 읽기·쓰기 차단 ───────────────────
drop policy if exists "comments_teachers_only_read" on public.comments;
create policy "comments_teachers_only_read" on public.comments
  as restrictive
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.apps a
      where a.id = comments.app_id
        and (a.visibility = 'public' or public.can_view_teacher_content(a.owner_id))
    )
  );

drop policy if exists "comments_teachers_only_insert" on public.comments;
create policy "comments_teachers_only_insert" on public.comments
  as restrictive
  for insert to authenticated
  with check (
    exists (
      select 1 from public.apps a
      where a.id = comments.app_id
        and (a.visibility = 'public' or public.can_view_teacher_content(a.owner_id))
    )
  );
