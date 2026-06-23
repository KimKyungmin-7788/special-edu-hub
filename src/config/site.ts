/**
 * 브랜드 config — 누리집명·로고·히어로 문구를 한 곳에서 관리한다.
 * 화면 어디서도 이 값을 직접 쓰지 않고 여기서 불러온다.
 * (CLAUDE.md 절대규칙 3)
 */

export type HeroSlide =
  | { type: "text"; title: string; subtitle?: string; ctaLabel?: string }
  | { type: "banner"; imageUrl: string; alt?: string }

export const site = {
  /** 가칭 — 추후 교체 */
  name: "강원 특수교육 디지털 학습자료 누리집",
  /** 이미지 로고 들어오면 교체 */
  logoText: "(로고 미정)",

  hero: {
    title: "교과서만으로는 수업이 힘든\n특수교사가 직접 만든 디지털 교육자료",
    subtitle: "",
    ctaLabel: "자료 둘러보기",
  },

  /** 히어로 캐러셀: 문구 슬라이드 + 배너 이미지 슬라이드를 배열로 */
  heroSlides: [
    {
      type: "text",
      title: "교과서만으로는 수업이 힘든\n특수교사가 직접 만든 디지털 교육자료",
      subtitle: "",
      ctaLabel: "자료 둘러보기",
    },
    // { type: "banner", imageUrl: "...", alt: "..." } // 배너 추가 시
  ] satisfies HeroSlide[],

  footer: {
    note: "특수교사가 만든 디지털 교육자료를 모아 보여주는 공개 카탈로그입니다.",
  },
} as const
