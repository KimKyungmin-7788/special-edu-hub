-- ============================================================
-- 88_collab_done_cover.sql — 완성 협업 2개(87)의 대표 사진을 연결한 자료의 썸네일로 (2026-11-28)
--
-- 파일을 복사하지 않고 자료 썸네일 주소를 그대로 쓴다.
-- 프로젝트를 지워도 자료가 쓰는 썸네일 파일은 남도록 화면 코드(deleteProject)가 확인한다.
-- 재실행 안전: 다시 실행해도 같은 값으로 덮어쓴다.
-- ============================================================

update public.collab_projects p
   set cover_url = a.thumbnail_url
  from public.apps a
 where a.id = p.app_id
   and p.id in ('1e41d5d4-526d-467a-9f41-cae55b51d4b5', '0e3eff72-8572-4e1b-bbaa-d5ca3bf5cfea')
   and a.thumbnail_url <> '';

-- 확인: 두 줄 모두 cover 칸에 주소가 나오면 성공
select p.title, p.cover_url as cover
  from public.collab_projects p
 where p.id in ('1e41d5d4-526d-467a-9f41-cae55b51d4b5', '0e3eff72-8572-4e1b-bbaa-d5ca3bf5cfea');
