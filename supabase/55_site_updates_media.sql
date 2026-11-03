-- ============================================================
-- 55_site_updates_media.sql — 새 소식에 보여 줄 영상 칸 (2026-11-03)
--
-- 설계 요약
--  - site_updates.media_url: 소식 아래에 보여 줄 짧은 영상의 공개 주소(선택). 없으면 null.
--    마우스를 올리면 재생(휴대폰·태블릿은 자동 반복). 운영진 탭에서 올리면 app-previews 버킷의
--    운영진 본인 폴더에 담긴다(53 의 본인 폴더 규칙 그대로, 새 버킷·정책 없음).
--  - '자료 카드 미리보기 영상' 소식에 '나도할 수 있다!편의점 - 상품진열편' 의 미리보기 영상을 넣는다
--    (사용자 결정 2026-11-03).
--
-- 적용: Supabase 대시보드 > SQL Editor 에 전체 붙여넣고 실행. 재실행 안전(idempotent).
-- 선행: 53(app-previews), 54(site_updates).
-- ============================================================
begin;

alter table public.site_updates add column if not exists media_url text;

alter table public.site_updates drop constraint if exists site_updates_media_url_https;
alter table public.site_updates add constraint site_updates_media_url_https
  check (media_url is null or media_url ~ '^https://');

update public.site_updates
set media_url = 'https://inqknxmsctuxwxmjfqft.supabase.co/storage/v1/object/public/app-previews/02d4adee-e18a-4955-97f4-222feff63718/27a055de-e387-4e07-94d8-56e8407e56ac.webm'
where title = '자료 카드 미리보기 영상' and media_url is null;

commit;

-- 확인(선택): 영상 주소가 보이면 적용된 것
-- select title, media_url from public.site_updates where media_url is not null;
