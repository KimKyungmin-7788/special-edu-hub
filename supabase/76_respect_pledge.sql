-- ============================================================
-- 76_respect_pledge.sql — 서로 존중 약속 (2026-11-23)
--
-- 설계 요약
--  - 66 의 동의 기록 장치에 문서 종류 'respect_pledge'(서로 존중 약속)를 더한다.
--    약속한 회원은 member_consents 에 계정·문서 버전·시각(서버 시각)이 남는다.
--  - 로그인한 모든 회원에게 한 번 묻는다(화면: RespectPledgeDialog). 네 가지를 모두 체크해야 기록되고,
--    '나중에'로 닫으면 기록 없이 다음 방문 때 다시 묻는다. 자료 등록을 막지는 않는다(스스로 지키는 약속).
--  - 기존 약관 동의 창(ConsentDialog)은 화면 설정에 없는 종류를 걸러 내므로 이 문서를 보여 주지 않는다.
--
-- 선행: 66_consents.sql
-- 적용: Supabase 대시보드 > SQL Editor 에 붙여넣고 실행. 재실행 안전(idempotent).
--       화면 코드 배포 전에 실행해도, 뒤에 실행해도 된다(문서가 없으면 창이 뜨지 않을 뿐).
-- ============================================================

-- ── 1. 문서 종류에 respect_pledge 추가 ───────────────────
alter table public.consent_documents
  drop constraint if exists consent_documents_kind_check;
alter table public.consent_documents
  add constraint consent_documents_kind_check
  check (kind in ('terms', 'privacy', 'upload_pledge', 'respect_pledge'));

-- ── 2. 현재 문서 넣기 (화면 src/config/respectPledge.ts 의 version 과 같아야 한다) ──
insert into public.consent_documents (kind, version, title, body, effective_date)
values
  ('respect_pledge', '2026-11-23', '서로 존중 약속', $doc$다른 선생님의 창작물을 존중할 것을 약속해요
아이디어·기능·교수법은 누구나 쓸 수 있어요. 다른 선생님이 직접 만든 표현은 그 선생님의 것입니다.

- 같은 아이디어로 만들 때는 화면·그림·문구·문제를 저만의 표현으로 만들겠습니다.
- 다른 선생님의 코드·그림·화면 구성·안내 문구·음성·문제 지문을 그대로 가져오지 않겠습니다.
- 참고한 자료가 있으면 출처와 원작자를 밝히겠습니다.
- 비슷한 자료를 만들고 싶으면 원작자와 먼저 이야기하고 함께 키워 가겠습니다.$doc$, '2026-11-23')
on conflict (kind, version) do nothing;

-- ── 적용 확인 ────────────────────────────────────────────
-- select kind, version, effective_date from public.consent_documents where kind = 'respect_pledge';
--   → respect_pledge | 2026-11-23 | 2026-11-23
-- 약속한 회원 수(운영진):
-- select count(*) from public.member_consents c join public.consent_documents d on d.id = c.document_id
--  where d.kind = 'respect_pledge';
