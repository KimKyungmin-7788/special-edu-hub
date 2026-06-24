-- 1단계-C: RLS 정책 (공개 읽기만)
-- apps 는 RLS 가 켜져 있다. 이번 단계는 "누구나 읽기(SELECT)"만 허용한다.
-- INSERT/UPDATE/DELETE 정책은 만들지 않는다 → 쓰기는 차단(후속 단계).
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 Run.

-- (안전하게) RLS 활성화 — 이미 켜져 있어도 무해
alter table public.apps enable row level security;

-- 누구나(anon 포함) SELECT 허용
create policy "apps_public_read"
  on public.apps
  for select
  to anon, authenticated
  using (true);
