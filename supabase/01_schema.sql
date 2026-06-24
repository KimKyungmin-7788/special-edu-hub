-- 1단계-B: 스키마 (apps 테이블 하나)
-- 카테고리는 config(categories.ts)에서 관리하므로 별도 테이블 없이
-- 앱의 분류는 category_ids 배열 컬럼으로 저장한다(seed 의 categoryIds 와 동일 모양).
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 Run.

create table if not exists public.apps (
  id             text primary key,
  title          text    not null,
  app_url        text    not null,
  thumbnail_url  text    not null default '',
  author_name    text    not null default '',
  description    text    not null default '',
  category_ids   text[]  not null default '{}',
  view_count     integer not null default 0,
  like_count     integer not null default 0,
  bookmark_count integer not null default 0,
  created_at     date    not null default current_date
);

-- 목록 정렬(최신순)에 쓰는 인덱스
create index if not exists apps_created_at_idx on public.apps (created_at desc);
