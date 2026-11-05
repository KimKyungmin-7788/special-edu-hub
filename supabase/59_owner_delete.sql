-- ============================================================
-- 59_owner_delete.sql — 자료·수업실천사례를 작성자가 완전히 지우기 (2026-11-05)
--
-- 설계 요약
--  - 지금까지 자료(apps)·사례(practices)는 DELETE 정책이 없어 '숨기기'만 됐다(31: "DELETE 정책 없음 → 숨김만").
--    사용자 결정(2026-11-05): 작성자가 본인 글을 완전히 지울 수 있게 한다.
--  - apps: 작성자 본인 또는 관리자(is_admin) — 상세 화면 수정·삭제 버튼 조건과 같다.
--  - practices: 작성자 본인 또는 운영진(is_staff) — 상세 화면 수정·숨기기 버튼 조건과 같다.
--  - 함께 지워지는 것(이미 on delete cascade): 댓글·답글(19·34), 좋아요·담기(24·34), 사례↔자료 연결(31),
--    관련 알림(41). 새 소식의 자료 카드 연결(57)은 끊기기만 한다(set null). 신고(17)는 FK 가 없어 기록으로 남는다.
--  - 저장소 파일(썸네일·미리보기 영상·첨부)은 SQL 로 지울 수 없어 화면에서 지운다(본인 폴더 정책 12·50·53·31).
--
-- 적용: Supabase 대시보드 > SQL Editor 에 전체 붙여넣고 실행. 재실행 안전(idempotent).
-- 선행: 09(is_admin), 12(apps.owner_id), 15(is_staff), 31(practices).
-- ============================================================
begin;

drop policy if exists "apps_delete_owner_or_admin" on public.apps;
create policy "apps_delete_owner_or_admin" on public.apps
  for delete to authenticated
  using ((owner_id is not null and owner_id = auth.uid()) or public.is_admin());

drop policy if exists "practices_delete_owner_or_staff" on public.practices;
create policy "practices_delete_owner_or_staff" on public.practices
  for delete to authenticated
  using (owner_id = auth.uid() or public.is_staff());

grant delete on public.apps to authenticated;
grant delete on public.practices to authenticated;

commit;

-- 확인(선택): 아래가 두 줄이면 적용된 것
-- select tablename, policyname from pg_policies where policyname in ('apps_delete_owner_or_admin','practices_delete_owner_or_staff');
