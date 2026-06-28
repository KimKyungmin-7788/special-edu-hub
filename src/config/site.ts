/**
 * 브랜드 config — 누리집명·로고·히어로 문구를 한 곳에서 관리한다.
 * 화면 어디서도 이 값을 직접 쓰지 않고 여기서 불러온다.
 * (CLAUDE.md 절대규칙 3)
 */

export type HeroSlide =
  | { type: "text"; title: string; subtitle?: string; ctaLabel?: string }
  | { type: "banner"; imageUrl: string; alt?: string }

export const site = {
  /** 가칭 — 정식 명칭 확정되면 교체(법적 페이지·푸터가 이 값을 참조한다). */
  name: "(가칭) 특수교육 학습자료 누리집",
  /** 이미지 로고 들어오면 교체 */
  logoText: "로고",

  hero: {
    title: "히어로 문구 (예정)",
    subtitle: "",
    ctaLabel: "자료 둘러보기",
  },

  /** 히어로 캐러셀: 문구 슬라이드 + 배너 이미지 슬라이드를 배열로 */
  heroSlides: [
    {
      type: "text",
      title: "히어로 문구 (예정)",
      subtitle: "",
      ctaLabel: "자료 둘러보기",
    },
    // { type: "banner", imageUrl: "...", alt: "..." } // 배너 추가 시
  ] satisfies HeroSlide[],

  /**
   * 운영 주체·연락처(법적 페이지·푸터의 단일 소스).
   * 개인정보처리방침/이용약관은 이 값을 불러다 쓴다(직접 박지 않는다).
   */
  org: {
    name: "강릉오성학교 AI하이터치 수업 연구회",
    intro:
      "특수교사 개발자들의 협력과 나눔을 위한 강릉오성학교 AI하이터치 수업 연구회의 프로젝트입니다.",
    privacyOfficer: { name: "김경민", email: "themaniwant19@gmail.com" },
    /** 법적 문서 시행일(개정 시 갱신). */
    effectiveDate: "2026-06-28",
  },

  footer: {
    /** 푸터 링크. emphasis=강조(개인정보처리방침). */
    links: [
      { label: "소개", to: "/about" },
      { label: "운영진 문의", to: "/contact" },
      { label: "이용약관", to: "/terms" },
      { label: "개인정보처리방침", to: "/privacy", emphasis: true },
    ] as { label: string; to: string; emphasis?: boolean }[],
  },
} as const
