/**
 * 가입할 때 받는 동의 세 가지 (66_consents.sql).
 *
 * 화면에 보이는 문서는 여기(이용약관 본문은 pages/Terms.tsx)에 두고, DB(consent_documents)에는
 * 버전과 본문 사본을 남긴다. 문서를 고치면 version 을 올리고, 같은 버전의 줄을 새 SQL 로 DB 에 넣는다.
 * DB 의 현재 버전과 여기 버전이 같을 때만 동의를 받는다(lib/consents.ts).
 */
export type ConsentKind = "terms" | "privacy" | "upload_pledge"

export const CONSENT_KINDS: ConsentKind[] = ["terms", "privacy", "upload_pledge"]

/**
 * 로그인 뒤 동의 창(편지)을 띄울지. 문구를 더 다듬는 동안 꺼 둔다(2026-11-11).
 * 꺼 둔 동안에도 가입 화면에서 체크한 동의는 첫 로그인 때 그대로 기록된다.
 * 다시 켤 때는 69_pledge_gate_off.sql 로 풀어 둔 등록 조건도 함께 되돌린다.
 */
export const CONSENT_DIALOG_ENABLED = false

type ConsentDoc = {
  version: string
  /** 체크박스 옆 문구 */
  label: string
  /** 전문을 보는 주소(새 탭) */
  href?: string
  /** 펼쳐 보는 본문 */
  items?: string[]
  notice?: string
  /** notice 아래 ‘자세히 보기’로 펼치는 설명 */
  details?: string[]
  /** 펼치지 않아도 보이는 권장 문구 */
  recommend?: string
}

export const consents: Record<ConsentKind, ConsentDoc> = {
  terms: {
    version: "2026-10-30",
    label: "이용약관에 동의합니다",
    href: "/terms",
  },
  privacy: {
    version: "2026-11-10",
    label: "개인정보 수집·이용에 동의합니다",
    href: "/privacy",
    items: [
      "수집 항목: 이메일 주소, 닉네임, 비밀번호(이메일 가입 시), 구글 계정 이름(구글로 로그인 시), 소속 학교(가입 후 입력), 동의한 문서의 버전과 동의 시각",
      "이용 목적: 회원 식별과 로그인·계정 관리, 교사 인증과 자료 등록 권한 부여, 서비스 이용 안내 메일 발송",
      "보유 기간: 회원 탈퇴 시 즉시 파기",
      "동의하지 않을 수 있으며, 동의하지 않으면 회원가입을 할 수 없습니다.",
    ],
  },
  upload_pledge: {
    version: "2026-11-10.2",
    label: "자료 등록 준수 서약에 동의합니다",
    items: [
      "학생을 알아볼 수 있는 정보(이름·얼굴·학교 등)를 자료에 담지 않았거나 필요한 동의를 받았습니다.",
      "자료에 쓴 글·그림·소리·글꼴은 직접 만들었거나 사용 허락을 받았습니다.",
      "자료가 개인정보를 다루거나 AI·외부 서비스를 쓰면 등록할 때 사실대로 적습니다.",
      "배포한 앱을 바꾸면 등록 정보도 함께 고칩니다.",
    ],
    notice: "누리집은 자체 검증 시스템으로 확인할 수 있는 범위 안에서 최소한으로 점검합니다.",
    details: [
      "등록하면 누리집이 자동으로 점검하고, 문제가 발견된 자료만 운영진이 확인합니다.",
      "앱 주소가 안전한 연결(https)로 열리는지, 다른 주소로 넘어가지 않는지 확인합니다.",
      "보안 설정(보안 헤더)과 개인정보처리방침·이용약관 페이지가 있는지 확인합니다.",
      "앱 파일을 읽어 외부로 연결하는 주소, 카메라·마이크·위치 사용, 기기 저장, 드러난 비밀 키가 있는지 확인합니다.",
      "앱을 실행하거나 로그인해서 확인하지는 않습니다. 서버에서 일어나는 처리, 방침 내용이 사실인지, 저작권은 확인하지 못합니다.",
      "확인하지 못한 항목은 안전하다고 표시하지 않습니다.",
    ],
    recommend: "배포하기 전에 자체 점검용 스킬이나 프롬프트로 먼저 점검하기를 권장합니다.",
  },
}

/**
 * 로그인 뒤 동의 창의 편지(ConsentDialog). 정식 문서(위 consents)를 쉬운 말로 풀어 쓴 안내이고,
 * 동의를 받는 문서는 위 consents 그대로다. **낱말** 은 강조 표시.
 */
export const consentLetter = {
  greeting: "선생님께",
  lead: "이곳은 특수교사가 만든 디지털교육 자료를 **서로 나누는 공간**입니다. **보안과 개인정보**가 무엇보다 중요하기에 시작하기 전에 **{count} 약속**을 부탁드립니다.",
  sectionLabel: "{count} 약속",
  promises: {
    terms: {
      title: "서로 존중하며 이용합니다",
      body: "다른 선생님의 자료와 글을 아끼고, 누리집의 **이용 규칙**을 지킵니다.",
      more: "",
    },
    privacy: {
      title: "선생님 정보는 꼭 필요한 만큼만 받습니다",
      body: "**이메일, 별명, 소속 학교**를 로그인과 교사 인증에만 쓰고, **탈퇴하시면 바로 지웁니다.**",
      more: "수집·이용 내용 자세히 보기",
    },
    upload_pledge: {
      title: "자료를 올릴 때는 학생을 먼저 생각합니다",
      body: "**학생을 알아볼 수 있는 정보**는 담지 않고, **직접 만들었거나 허락받은 자료**만 올립니다. 앱이 개인정보나 AI를 쓰면 **사실대로** 적습니다.",
      more: "서약 내용 자세히 보기",
    },
  } satisfies Record<ConsentKind, { title: string; body: string; more: string }>,
  noteTitle: "누리집의 점검은 최소한입니다",
  noteMore: "점검 방식 자세히 보기",
  signature: "운영진 드림",
  agree: "{count} 약속에 모두 동의합니다",
  submit: "함께할게요",
  /** 끝까지 내려 읽기 전 버튼 아래 안내 */
  readHint: "끝까지 읽으면 누를 수 있어요.",
  /** 편지 맨 아래 전문 링크(새 탭) */
  fullLinks: [
    { label: "이용약관 전문 보기", href: "/terms" },
    { label: "개인정보처리방침 전문 보기", href: "/privacy" },
  ],
  counts: ["", "한 가지", "두 가지", "세 가지"],
}
