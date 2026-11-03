-- ============================================================
-- 57_site_updates_app.sql — 새 소식에 자료 카드 통째로 보여 주기 (2026-11-03)
--
-- 설계 요약
--  - site_updates.app_id: 소식 아래 보여 줄 자료(선택). 있으면 목록과 똑같은 자료 카드
--    (썸네일·제목·작성자·조회/좋아요/댓글)를 보여 주고, 마우스를 올리면 미리보기 영상이 재생된다.
--    영상은 media_url(55)이 있으면 그것, 없으면 그 자료의 미리보기 영상.
--  - 자료가 지워지면 연결만 풀린다(on delete set null).
--  - '자료 카드 미리보기 영상' 소식에 '나도할 수 있다!편의점 - 상품진열편' 을 연결한다(사용자 결정 2026-11-03).
--
-- 적용: Supabase 대시보드 > SQL Editor 에 전체 붙여넣고 실행. 재실행 안전(idempotent).
-- 선행: 54(site_updates), 55(media_url).
-- ============================================================
begin;

alter table public.site_updates
  add column if not exists app_id text references public.apps (id) on delete set null;

update public.site_updates
set app_id = '76457a76-77df-46e0-aa90-1e2f1e98481e'
where title = '자료 카드 미리보기 영상' and app_id is null;

commit;

-- 확인(선택): 자료 id 가 보이면 적용된 것
-- select title, app_id from public.site_updates where app_id is not null;
