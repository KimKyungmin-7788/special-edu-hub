-- ============================================================
-- 15_roles.sql — 운영진(manager) 등급 + 권한 부여 (PRD §11.1/§11.4)
--
-- 설계 합의
--  - role 을 "운영 권한 레벨"로 정리: member(일반) < manager(운영진) < admin(관리자).
--    교사 여부는 계속 is_teacher_verified 가 담당(역할과 분리). teacher 값은 미사용.
--  - 운영진(manager): 일상 운영 = 앱 숨김/공개 · 교사인증 심사 · 회원 조회 · (후속)신고.
--  - 관리자(admin)  : 위 전부 + 권한 부여/회수 + (후속)강제 탈퇴 등 돌이키기 어려운 것.
--  - 모더레이션 정책은 is_admin() → is_staff() 로 넓히고,
--    권한 부여는 admin 전용(is_admin)으로 RPC 에서만.
--  - role 컬럼은 클라 UPDATE 가 GRANT 로 잠겨 있다(04). 그냥 풀면 자기 role 을
--    admin 으로 올리는 권한상승 구멍이 생기므로(자기수정 정책), security definer
--    RPC set_user_role 로만 바꾼다. 마지막 관리자 강등(락아웃) 가드 포함.
--
-- 적용: Supabase 대시보드 > SQL Editor 에 붙여넣고 Run. 재실행 안전(idempotent).
-- ============================================================

-- ── 1. role 체크 제약에 manager 추가 ──────────────────────
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('member','teacher','manager','admin'));

-- ── 2. 운영진(staff) 판별 헬퍼 — is_admin() 과 같은 꼴 ─────
-- manager 또는 admin. is_admin()(admin 전용)은 그대로 둔다.
create or replace function public.is_staff()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('manager','admin')
  );
$$;

-- ── 3. 모더레이션 정책 확대 (is_admin → is_staff) ─────────
-- 운영진도 숨김앱 조회·숨김/복구, 교사인증 조회·심사·서류열람을 할 수 있게.

-- 3a) apps SELECT: 공개 OR 본인 OR 운영진 (12 의 apps_public_read 교체)
drop policy if exists "apps_public_read" on public.apps;
create policy "apps_public_read" on public.apps
  for select to anon, authenticated
  using (
    status = 'published'
    or owner_id = auth.uid()
    or public.is_staff()
  );

-- 3b) apps UPDATE: 본인 OR 운영진 (12 의 apps_update_owner_or_admin 교체)
drop policy if exists "apps_update_owner_or_admin" on public.apps;
create policy "apps_update_owner_or_admin" on public.apps
  for update to authenticated
  using (owner_id = auth.uid() or public.is_staff())
  with check (owner_id = auth.uid() or public.is_staff());

-- 3c) verification_requests SELECT: 본인 OR 운영진 (09 의 verif_select_own_or_admin 교체)
drop policy if exists "verif_select_own_or_admin" on public.verification_requests;
create policy "verif_select_own_or_admin" on public.verification_requests
  for select to authenticated
  using (auth.uid() = user_id or public.is_staff());

-- 3d) verification_requests UPDATE(심사): 운영진 (14 의 verif_update_admin 교체)
drop policy if exists "verif_update_admin" on public.verification_requests;
create policy "verif_update_admin" on public.verification_requests
  for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- 3e) verification-docs SELECT(서류 열람): 운영진 (14 의 verif_docs_read_admin 교체)
drop policy if exists "verif_docs_read_admin" on storage.objects;
create policy "verif_docs_read_admin" on storage.objects
  for select to authenticated
  using (bucket_id = 'verification-docs' and public.is_staff());

-- ── 4. 권한 부여 RPC (관리자 전용) ────────────────────────
-- 클라이언트는 role 을 직접 UPDATE 못 한다(GRANT 잠금) → 이 RPC 로만.
-- security definer 라 함수 소유자 권한으로 실행돼 컬럼 잠금/RLS 를 우회한다.
-- 내부에서 is_admin() 으로 호출자가 관리자인지 확인하고, 마지막 관리자
-- 강등(전체 잠김)을 막는다.
create or replace function public.set_user_role(target_id uuid, new_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_count int;
begin
  if not public.is_admin() then
    raise exception '권한이 없습니다(관리자만 가능).';
  end if;
  if new_role not in ('member','teacher','manager','admin') then
    raise exception '알 수 없는 권한입니다: %', new_role;
  end if;

  -- 마지막 관리자를 강등하면 아무도 권한을 못 바꾸게 되므로 막는다.
  if new_role <> 'admin' then
    select count(*) into admin_count from public.profiles where role = 'admin';
    if admin_count <= 1
       and exists (select 1 from public.profiles where id = target_id and role = 'admin')
    then
      raise exception '마지막 관리자는 강등할 수 없습니다.';
    end if;
  end if;

  update public.profiles set role = new_role where id = target_id;
end;
$$;

revoke execute on function public.set_user_role(uuid, text) from anon;
grant execute on function public.set_user_role(uuid, text) to authenticated;
