-- ============================================================
-- 66_consents.sql — 가입 동의 기록 (PRD 14.3 1단계, 2026-11-10)
--
-- 설계 요약
--  - 가입할 때 세 가지를 받는다: 이용약관(terms) · 개인정보 수집·이용 동의(privacy) ·
--    자료 등록 준수 서약(upload_pledge). 기존 회원·구글 가입자는 로그인 뒤 묻는 창으로 받는다.
--  - consent_documents: 문서 종류·버전·본문 사본·시행일. 한 번 넣은 줄은 고치거나 지우지 않는다.
--    문서를 개정하면 새 버전의 줄을 새 SQL 로 추가한다(종류마다 시행일이 가장 늦은 줄이 현재 문서).
--    화면에 보이는 문서는 코드(src/config/consents.ts, 약관은 src/pages/Terms.tsx)에 있고,
--    화면 쪽 버전과 여기 현재 버전이 같을 때만 동의를 받는다.
--  - member_consents: 누가 어떤 문서에 언제 동의했는지. 줄이 있으면 동의한 것.
--    기록은 record_consents RPC 로만 한다(시각은 서버 시각, 직접 쓰기 회수).
--    본인과 운영진만 읽는다. 회원이 탈퇴하면 함께 지워진다(profiles 따라 cascade).
--  - 자료 등록 준수 서약에 동의하지 않은 계정은 자료(apps)를 등록할 수 없다(RESTRICTIVE 정책).
--    기존 등록 정책(12·15)은 그대로 두고 AND 로 겹친다.
--
-- ⚠️ 적용 순서: 화면 코드를 먼저 배포한 뒤 이 파일을 실행한다.
--    먼저 실행하면 동의 창이 없는 옛 화면에서 자료 등록이 막힌다.
--
-- 선행: 04(profiles), 12(apps 등록 정책), 15(is_staff).
-- 적용: Supabase 대시보드 > SQL Editor 에 붙여넣고 실행. 재실행 안전(idempotent).
-- ============================================================

-- ── 1. 문서 ──────────────────────────────────────────────
create table if not exists public.consent_documents (
  id             uuid        primary key default gen_random_uuid(),
  kind           text        not null check (kind in ('terms', 'privacy', 'upload_pledge')),
  version        text        not null,
  title          text        not null,
  body           text        not null,           -- 동의받을 때의 본문 사본
  effective_date date        not null,
  created_at     timestamptz not null default now(),
  unique (kind, version)
);

alter table public.consent_documents enable row level security;

-- 누구나 읽는다(공개 문서). 쓰기는 SQL Editor 로만.
drop policy if exists "consent_documents_read" on public.consent_documents;
create policy "consent_documents_read" on public.consent_documents
  for select to anon, authenticated
  using (true);

revoke insert, update, delete on public.consent_documents from anon, authenticated;

-- 종류별 현재 문서(시행일이 가장 늦은 줄). 없으면 null.
create or replace function public.current_consent_document(p_kind text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select d.id
    from public.consent_documents d
   where d.kind = p_kind
   order by d.effective_date desc, d.created_at desc
   limit 1;
$$;

-- ── 2. 동의 기록 ─────────────────────────────────────────
create table if not exists public.member_consents (
  id          bigint      generated always as identity primary key,
  user_id     uuid        not null references public.profiles (id) on delete cascade,
  document_id uuid        not null references public.consent_documents (id),
  source      text        not null check (source in ('signup', 'login')),  -- 가입 화면 / 로그인 뒤 묻는 창
  agreed_at   timestamptz not null default now(),
  unique (user_id, document_id)
);

alter table public.member_consents enable row level security;

drop policy if exists "member_consents_select_own_or_staff" on public.member_consents;
create policy "member_consents_select_own_or_staff" on public.member_consents
  for select to authenticated
  using (auth.uid() = user_id or public.is_staff());

-- 기록은 record_consents RPC 로만 → 직접 쓰기 회수.
revoke insert, update, delete on public.member_consents from anon, authenticated;

-- ── 3. 아직 동의하지 않은 현재 문서 (로그인한 본인) ───────
create or replace function public.pending_consents()
returns table (kind text, version text)
language sql
stable
security definer
set search_path = public
as $$
  select d.kind, d.version
    from public.consent_documents d
   where auth.uid() is not null
     and d.id = public.current_consent_document(d.kind)
     and not exists (
       select 1 from public.member_consents c
        where c.user_id = auth.uid() and c.document_id = d.id
     );
$$;

revoke all on function public.pending_consents() from public, anon;
grant execute on function public.pending_consents() to authenticated;

-- ── 4. 동의 기록 RPC ─────────────────────────────────────
-- p_items: [{"kind":"terms","version":"2026-10-30"}, …]. 화면에서 본 버전이 현재 문서와 같아야 한다.
create or replace function public.record_consents(p_items jsonb, p_source text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_item jsonb;
  v_doc  uuid;
begin
  if v_uid is null then
    raise exception '로그인이 필요합니다.';
  end if;
  if p_source is null or p_source not in ('signup', 'login') then
    raise exception '알 수 없는 경로입니다.';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception '동의 항목이 올바르지 않습니다.';
  end if;

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_doc := public.current_consent_document(v_item->>'kind');
    if v_doc is null or not exists (
      select 1 from public.consent_documents d
       where d.id = v_doc and d.version = v_item->>'version'
    ) then
      raise exception '문서가 바뀌었습니다. 새로 고친 뒤 다시 동의해 주세요.';
    end if;

    insert into public.member_consents (user_id, document_id, source)
    values (v_uid, v_doc, p_source)
    on conflict (user_id, document_id) do nothing;
  end loop;
end;
$$;

revoke all on function public.record_consents(jsonb, text) from public, anon;
grant execute on function public.record_consents(jsonb, text) to authenticated;

-- ── 5. 서약에 동의한 계정만 자료 등록 ─────────────────────
create or replace function public.has_current_consent(p_kind text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    exists (
      select 1 from public.member_consents c
       where c.user_id = auth.uid()
         and c.document_id = public.current_consent_document(p_kind)
    ),
    false
  );
$$;

drop policy if exists "apps_insert_requires_pledge" on public.apps;
create policy "apps_insert_requires_pledge" on public.apps
  as restrictive
  for insert to authenticated
  with check (public.has_current_consent('upload_pledge'));

-- ── 6. 현재 문서 넣기 ────────────────────────────────────
insert into public.consent_documents (kind, version, title, body, effective_date)
values
  ('terms', '2026-10-30', '이용약관', $doc$제1조 (목적)
본 약관은 특수교육 디지털 학습자료 누리집(이하 ‘본 서비스’)의 이용과 관련하여 운영 주체와 이용자의 권리·의무 및 책임 사항을 규정함을 목적으로 합니다.

제2조 (정의)
- ‘이용자’란 본 서비스에 접속하여 본 약관에 따라 서비스를 이용하는 자를 말합니다.
- ‘회원’이란 가입 절차를 거쳐 계정을 보유한 이용자를 말합니다.
- ‘인증교사’란 특수교사 여부 확인 절차를 통과하여 자료 등록 권한을 부여받은 회원을 말합니다.
- ‘자료’란 회원이 등록한 웹앱·학습자료 및 그에 관한 소개·게시물을 말합니다.

제3조 (운영 주체 및 서비스의 성격)
본 서비스는 강릉오성학교 AI하이터치 수업 연구회가 운영합니다.
본 서비스는 특수교사 개발자들의 협력과 나눔을 위한 비영리 프로젝트로, 교사가 만든 디지털 교육자료를 모아 공개적으로 소개하는 카탈로그입니다.

제4조 (회원가입 및 교사 인증)
회원가입은 이용자가 약관에 동의하고 가입 양식을 작성하여 신청하면 운영 주체가 이를 승인함으로써 성립합니다.
자료 등록 등 일부 기능은 교사 인증을 완료한 회원에 한해 제공됩니다. 인증 과정에서 제출된 서류는 개인정보처리방침에 따라 처리됩니다.

제5조 (이용자의 의무)
이용자는 다음 행위를 하여서는 안 됩니다.
- 타인의 정보를 도용하거나 허위 정보를 등록하는 행위
- 타인을 비방·모욕하거나 명예를 훼손하는 행위
- 음란·폭력적이거나 법령·공서양속에 반하는 내용을 게시하는 행위
- 타인의 저작권 등 권리를 침해하는 자료를 등록하는 행위
- 서비스의 정상적인 운영을 방해하는 행위

제6조 (게시물의 권리와 책임)
회원이 등록한 자료·게시물의 저작권은 해당 회원에게 있으며, 그 내용에 대한 책임도 게시한 회원이 부담합니다.
회원은 본 서비스가 자료를 카탈로그 형태로 소개·노출하는 데 필요한 범위에서 게시물을 사용하는 것에 동의합니다.

제7조 (운영자의 권한)
운영 주체는 본 약관 또는 관계 법령에 위반되거나 타인의 권리를 침해하는 자료·게시물에 대해 사전 통지 없이 숨김·삭제 등의 조치를 할 수 있으며, 필요한 경우 교사 인증을 회수하거나 이용을 제한할 수 있습니다.

제8조 (면책)
본 서비스는 회원이 등록한 자료·외부 링크의 정확성·적법성·안전성을 보증하지 않으며, 이용자가 자료를 이용함으로써 발생한 결과에 대해 책임을 지지 않습니다.
천재지변, 외부 인프라 장애 등 운영 주체의 통제를 벗어난 사유로 인한 서비스 중단에 대해서는 책임이 면제됩니다.

제9조 (약관의 개정)
운영 주체는 필요한 경우 약관을 개정할 수 있으며, 개정 시 변경 내용과 시행일을 본 페이지를 통해 공지합니다.

제10조 (준거법 및 분쟁 해결)
본 약관은 대한민국 법령에 따라 해석되며, 서비스 이용과 관련한 분쟁은 관계 법령 및 상호 협의에 따라 해결합니다.$doc$, '2026-10-30'),

  ('privacy', '2026-11-10', '개인정보 수집·이용 동의', $doc$- 수집 항목: 이메일 주소, 닉네임, 비밀번호(이메일 가입 시), 구글 계정 이름(구글로 로그인 시), 소속 학교(가입 후 입력), 동의한 문서의 버전과 동의 시각
- 이용 목적: 회원 식별과 로그인·계정 관리, 교사 인증과 자료 등록 권한 부여, 서비스 이용 안내 메일 발송
- 보유 기간: 회원 탈퇴 시 즉시 파기
- 동의하지 않을 수 있으며, 동의하지 않으면 회원가입을 할 수 없습니다.$doc$, '2026-11-10'),

  ('upload_pledge', '2026-11-10', '자료 등록 준수 서약', $doc$- 학생을 알아볼 수 있는 정보(이름·얼굴·학교 등)를 자료에 담지 않았거나 필요한 동의를 받았습니다.
- 자료에 쓴 글·그림·소리·글꼴은 직접 만들었거나 사용 허락을 받았습니다.
- 자료가 개인정보를 다루거나 AI·외부 서비스를 쓰면 등록할 때 사실대로 적습니다.
- 배포한 앱을 바꾸면 등록 정보도 함께 고칩니다.

누리집은 자체 검증 시스템으로 확인할 수 있는 범위 안에서 최소한으로 점검합니다.
- 운영진이 등록 정보를 확인한 뒤 자료를 공개합니다.
- 앱 주소가 안전한 연결(https)로 열리는지, 다른 주소로 넘어가지 않는지 확인합니다.
- 보안 설정(보안 헤더)과 개인정보처리방침·이용약관 페이지가 있는지 확인합니다.
- 앱 파일을 읽어 외부로 연결하는 주소, 카메라·마이크·위치 사용, 기기 저장, 드러난 비밀 키가 있는지 확인합니다.
- 앱을 실행하거나 로그인해서 확인하지는 않습니다. 서버에서 일어나는 처리, 방침 내용이 사실인지, 저작권은 확인하지 못합니다.
- 확인하지 못한 항목은 안전하다고 표시하지 않습니다.

배포하기 전에 자체 점검용 스킬이나 프롬프트로 먼저 점검하기를 권장합니다.$doc$, '2026-11-10')
on conflict (kind, version) do nothing;

-- ── 적용 확인 ────────────────────────────────────────────
-- select kind, version, effective_date, length(body) from public.consent_documents order by kind;
--   → terms 2026-10-30 / privacy 2026-11-10 / upload_pledge 2026-11-10 세 줄
-- select polname, polpermissive from pg_policy where polrelid = 'public.apps'::regclass and polcmd = 'a';
--   → apps_insert_requires_pledge (polpermissive = false) 가 보이면 적용됨
