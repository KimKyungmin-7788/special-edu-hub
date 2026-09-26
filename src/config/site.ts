/**
 * 브랜드 config — 누리집명·로고·히어로 문구를 한 곳에서 관리한다.
 * 화면 어디서도 이 값을 직접 쓰지 않고 여기서 불러온다.
 * (CLAUDE.md 절대규칙 3)
 */

export type HeroSlide =
  | {
      type: "text"
      /** 왼쪽 칸의 큰 회색 키워드(예: 공유·나눔·참여). 선택. */
      keyword?: string
      /** 줄바꿈은 \n */
      title: string
      subtitle?: string
      ctaLabel?: string
      /** 버튼 이동 경로(기본 /apps/subject). ctaAction 이 있으면 무시. */
      ctaHref?: string
      /** "write" = 글쓰기 버튼처럼 과목 선택 창을 띄운 뒤 글쓰기로 */
      ctaAction?: "write"
      /**
       * 오른쪽 배경 사진(넓은 화면에서만). 왼쪽으로 갈수록 배경색에 스며든다.
       * position = CSS object-position(사진 속 인물이 보이도록 맞춤). 장식용이라 대체텍스트 없음.
       */
      image?: { src: string; position?: string }
    }
  | { type: "banner"; imageUrl: string; alt?: string }

/** 누리집 이름 — 푸터·탭 제목·법적 페이지·인증 메일이 모두 이 값을 따른다. */
const SITE_NAME = "특수교육 디지털 학습자료 누리집"

export const site = {
  /** 누리집 이름(index.html <title> 도 같은 값으로 맞춰 둔다 — 첫 로딩 순간 표시용). */
  name: SITE_NAME,
  /**
   * 헤더 로고 옆 워드마크(2줄): eyebrow = 작은 윗줄, title = 굵은 아랫줄.
   * title 을 비워 두면 name 을 쓴다. 헤더에서만 쓰는 표기 — SITE_NAME 은 그대로.
   */
  headerBrand: {
    eyebrow: "강릉오성학교",
    title: "AI하이터치 수업 연구회 자료집",
  },
  /** 이미지 로고 들어오면 교체 */
  logoText: "로고",

  /**
   * 히어로 캐러셀: 문구 슬라이드 + 배너 이미지 슬라이드를 배열로(순서대로 넘김).
   * 1장이면 넘김 표시 없이 고정. 지금은 연구회 아카이브 1장 사용 중.
   * 3장 캐러셀로 되돌릴 때: heroSlides 를 heroSlidesThree 로 바꾼다.
   */
  heroSlides: [
    {
      type: "text",
      keyword: "기록",
      title: "강릉오성학교 학교안 연구회 플랫폼",
      subtitle: "연구회 선생님들이 수업을 두고 나눈 고민과 노력을 한곳에 모았습니다.",
      ctaLabel: "자료 둘러보기",
      ctaHref: "/apps/subject",
      image: { src: "/hero/research-together.webp", position: "right 38%" },
    },
  ] satisfies HeroSlide[],

  /** 보관 중인 3장 캐러셀(공유·나눔·참여) — "3장 캐러셀 적용" 요청 시 heroSlides 로 되돌린다. */
  heroSlidesThree: [
    {
      type: "text",
      keyword: "공유",
      title: "우리 아이를 위해 만든 디지털 학습자료가,\n모든 교실의 자료가 됩니다",
      subtitle: "바이브코딩으로 특수교사가 만들고 나누는 디지털 학습자료 누리집",
      ctaLabel: "자료 둘러보기",
      ctaHref: "/apps/subject",
    },
    {
      type: "text",
      keyword: "나눔",
      title: "혼자 고민하던 수업,\n함께라서 더 멀리 갑니다",
      subtitle: "정성껏 만든 자료를 나누고, 서로의 수업에 응원을 보내 주세요.",
      ctaLabel: "내 자료 공유하기",
      ctaAction: "write",
    },
    {
      type: "text",
      keyword: "참여",
      title: "교사인증을 하면\n자료를 올리고 교사 전용 자료도 볼 수 있어요",
      subtitle: "재직 확인 서류를 메일로 보내 주시면 운영진이 확인 후 승인해 드려요.",
      ctaLabel: "교사인증 하기",
      ctaHref: "/verify",
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

  /**
   * 교사인증(이메일 제출 방식) — 받는 주소·메일 제목·템플릿 문구.
   * 인증센터(/verify)가 이 값으로 메일 본문을 만든다.
   */
  verification: {
    email: "themaniwant19@gmail.com",
    /** 템플릿 첫 줄이자 메일 제목. */
    title: `[${SITE_NAME} 교사 인증]`,
    /** 템플릿의 '가입 플랫폼' 값. */
    platformName: SITE_NAME,
  },

  footer: {
    /** 외부 저작물 표시(라이선스 필수 문구 — 문구를 바꾸지 않는다). 카테고리 손그림 아이콘. */
    credits: [
      {
        label: "Designed by Freepik and distributed by Flaticon",
        href: "https://www.flaticon.com/",
      },
    ],
    /** 푸터 링크. emphasis=강조(개인정보처리방침). */
    links: [
      { label: "소개", to: "/about" },
      { label: "운영진 문의", to: "/contact" },
      { label: "이용약관", to: "/terms" },
      { label: "개인정보처리방침", to: "/privacy", emphasis: true },
    ] as { label: string; to: string; emphasis?: boolean }[],
  },
} as const
