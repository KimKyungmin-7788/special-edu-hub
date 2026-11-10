/**
 * 가입할 때 받는 동의 세 가지 (66_consents.sql).
 *
 * 화면에 보이는 문서는 여기(이용약관 본문은 pages/Terms.tsx)에 두고, DB(consent_documents)에는
 * 버전과 본문 사본을 남긴다. 문서를 고치면 version 을 올리고, 같은 버전의 줄을 새 SQL 로 DB 에 넣는다.
 * DB 의 현재 버전과 여기 버전이 같을 때만 동의를 받는다(lib/consents.ts).
 */
export type ConsentKind = "terms" | "privacy" | "upload_pledge"

export const CONSENT_KINDS: ConsentKind[] = ["terms", "privacy", "upload_pledge"]

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
    version: "2026-11-10",
    label: "자료 등록 준수 서약에 동의합니다",
    items: [
      "학생을 알아볼 수 있는 정보(이름·얼굴·학교 등)를 자료에 담지 않았거나 필요한 동의를 받았습니다.",
      "자료에 쓴 글·그림·소리·글꼴은 직접 만들었거나 사용 허락을 받았습니다.",
      "자료가 개인정보를 다루거나 AI·외부 서비스를 쓰면 등록할 때 사실대로 적습니다.",
      "배포한 앱을 바꾸면 등록 정보도 함께 고칩니다.",
    ],
    notice: "누리집은 자체 검증 시스템으로 확인할 수 있는 범위 안에서 최소한으로 점검합니다.",
    details: [
      "운영진이 등록 정보를 확인한 뒤 자료를 공개합니다.",
      "앱 주소가 안전한 연결(https)로 열리는지, 다른 주소로 넘어가지 않는지 확인합니다.",
      "보안 설정(보안 헤더)과 개인정보처리방침·이용약관 페이지가 있는지 확인합니다.",
      "앱 파일을 읽어 외부로 연결하는 주소, 카메라·마이크·위치 사용, 기기 저장, 드러난 비밀 키가 있는지 확인합니다.",
      "앱을 실행하거나 로그인해서 확인하지는 않습니다. 서버에서 일어나는 처리, 방침 내용이 사실인지, 저작권은 확인하지 못합니다.",
      "확인하지 못한 항목은 안전하다고 표시하지 않습니다.",
    ],
    recommend: "배포하기 전에 자체 점검용 스킬이나 프롬프트로 먼저 점검하기를 권장합니다.",
  },
}
