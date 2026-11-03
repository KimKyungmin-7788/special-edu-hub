-- ============================================================
-- 54_site_updates.sql — 새 소식(/updates)을 운영진 페이지에서 쓰기 (2026-11-03)
--
-- 설계 요약
--  - site_updates: 누리집에 새로 생기거나 바뀐 것 한 건 = 한 줄. 최신(created_at)이 위.
--    kind: new(새 기능) · improve(개선) · notice(안내). link_to 는 사이트 안 경로('/…')만.
--  - 읽기: 누구나(비회원 포함). 쓰기·고치기·지우기: 운영진만(is_staff).
--  - 회원 알림은 화면에서 기존 send_notice RPC 로 따로 보낸다(이 표와 무관).
--  - 지금까지 src/config/updates.ts 에 적어 둔 소식 4건을 처음 한 번 옮겨 담는다.
--
-- 적용: Supabase 대시보드 > SQL Editor 에 전체 붙여넣고 실행. 재실행 안전(idempotent).
-- 선행: is_staff() 함수(운영진 판별).
-- ============================================================
begin;

create table if not exists public.site_updates (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'new' check (kind in ('new', 'improve', 'notice')),
  title text not null check (char_length(btrim(title)) between 1 and 100),
  body text not null default '' check (char_length(body) <= 1000),
  link_label text check (link_label is null or char_length(link_label) <= 30),
  link_to text check (link_to is null or link_to ~ '^/[^/]'),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null default auth.uid()
);

create index if not exists site_updates_created_at_idx on public.site_updates (created_at desc);

alter table public.site_updates enable row level security;

drop policy if exists "site_updates_read" on public.site_updates;
create policy "site_updates_read" on public.site_updates
  for select to anon, authenticated
  using (true);

drop policy if exists "site_updates_staff_insert" on public.site_updates;
create policy "site_updates_staff_insert" on public.site_updates
  for insert to authenticated
  with check (public.is_staff());

drop policy if exists "site_updates_staff_update" on public.site_updates;
create policy "site_updates_staff_update" on public.site_updates
  for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists "site_updates_staff_delete" on public.site_updates;
create policy "site_updates_staff_delete" on public.site_updates
  for delete to authenticated
  using (public.is_staff());

grant select on public.site_updates to anon, authenticated;
grant insert, update, delete on public.site_updates to authenticated;

-- ── 처음 소식 4건(이미 있으면 건너뜀) ─────────────────────
insert into public.site_updates (kind, title, body, link_label, link_to, created_at, created_by)
select v.kind, v.title, v.body, v.link_label, v.link_to, v.created_at::timestamptz, null
from (values
  ('improve', '소속 학교를 나이스에서 검색',
   '학교 이름 몇 글자만 치면 목록에서 고를 수 있어요.',
   null, null, '2026-11-02 12:00+09'),
  ('new', '자료에 파일 3개까지 첨부',
   '활동지·안내서 같은 파일을 자료와 함께 올릴 수 있어요.',
   null, null, '2026-11-02 12:01+09'),
  ('notice', '열린연수방 11월 8일 공개 예정',
   '''왜 바이브코딩인가?''와 ''기초 익히기''를 먼저 엽니다. 나머지 과정도 차례로 열어요.',
   '열린연수방 보기', '/training', '2026-11-03 12:00+09'),
  ('new', '자료 카드 미리보기 영상',
   '목록에서 자료 카드에 마우스를 올리면 앱 화면이 소리 없이 재생돼요. 자료 수정 화면의 ''미리보기 영상'' 칸에 앱 화면 녹화를 넣어 주세요. 영상이 길거나 커도 담을 10초를 고르면 누리집이 알아서 작게 줄여 담아요. 학생 얼굴이나 이름이 나오는 화면은 넣지 말아 주세요.',
   '내 자료에 넣어 보기', '/mypage', '2026-11-03 12:01+09')
) as v(kind, title, body, link_label, link_to, created_at)
where not exists (select 1 from public.site_updates s where s.title = v.title);

commit;

-- 확인(선택): 4줄이 나오면 적용된 것
-- select kind, title, created_at from public.site_updates order by created_at desc;
