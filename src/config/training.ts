/**
 * 열린연수방(/training) — 왼쪽 사이드바 메뉴·연수 목록·안내 문구의 단일 소스.
 * 주소: /training = 열린연수방이란?(누구나), /training/<연수 slug>/<쪽 slug> = 연수의 한 쪽(인증 교사만).
 * 연수·쪽을 늘릴 때는 courses 에 추가하고, 동작하는 쪽은 App.tsx 에 라우트를 붙인다.
 * status: "active" = 동작 / "soon" = 자리만(준비 중, 누르지 못함). 동작하는 쪽이 없는 연수는 연수 이름에 '준비중'.
 */

export type TrainingPage = {
  /** 주소 끝부분: /training/<연수>/<slug> */
  slug: string
  label: string
  status: "active" | "soon"
}

export type TrainingCourse = {
  /** 주소 가운데: /training/<slug> */
  slug: string
  title: string
  /** 안내 페이지 연수 목록에 붙는 한 줄 소개(선택) */
  summary?: string
  pages: TrainingPage[]
}

export type TrainingGuideSection = {
  heading: string
  items: string[]
  link?: { label: string; to: string }
}

export const training = {
  title: "열린연수방",
  basePath: "/training",
  guideLabel: "열린연수방이란?",
  courses: [
    {
      slug: "vibecoding",
      title: "특수교육을 위한 바이브코딩 시작하기",
      pages: [
        { slug: "why", label: "왜 바이브코딩인가?", status: "active" },
        { slug: "basics", label: "기초", status: "soon" },
        { slug: "apply", label: "활용", status: "soon" },
      ],
    },
    {
      slug: "vibecoding-expand",
      title: "바이브코딩 확장",
      pages: [{ slug: "expand", label: "확장", status: "soon" }],
    },
    {
      slug: "agent",
      title: "에이전트 코딩 최소한의 환경구축",
      summary: "Windows에서 Claude Code·Codex 설치부터 첫 앱 공개까지 한 화면씩 따라 합니다.",
      pages: [
        { slug: "setup", label: "환경구축", status: "active" },
        { slug: "survey", label: "연수 돌아보기", status: "active" },
      ],
    },
    {
      slug: "gamification",
      title: "특수교육을 위한 게이미피케이션 자료제작",
      pages: [],
    },
  ] satisfies TrainingCourse[] as TrainingCourse[],
  /** 열린연수방이란?(/training) 문구 */
  guide: {
    lead: "특수교사가 함께 배우고 나누는 연수 공간입니다. 기초부터 차근차근 시작해, 특수교육에 맞는 바이브코딩을 함께 고민하고 나눕니다.",
    sections: [
      {
        heading: "연수 듣는 방법",
        items: [
          "연수는 무료이며, 로그인하고 교사인증을 마친 선생님이 볼 수 있습니다.",
          "연수를 고른 뒤 메뉴의 번호 순서대로 보면 됩니다.",
          "정해진 시간표가 없습니다. 원하는 때에 원하는 만큼 보고, 멈춘 곳에서 다시 이어 보세요.",
          "‘연수 돌아보기’에 소감과 필요한 도움을 남겨 주시면 다음 연수를 준비하는 데 씁니다.",
          "이곳의 연수는 공식 연수 시간(학점)으로 인정되지 않습니다.",
        ],
        link: { label: "교사인증센터로 가기", to: "/verify" },
      },
      {
        heading: "앞으로 이렇게 넓혀 갑니다",
        items: [
          "지금은 HTML 슬라이드로 된 연수 자료를 올립니다. 앞으로 영상 연수와 라이브 연수로 넓혀 갑니다.",
          "그때부터는 누구나 연수를 열고 배움을 나눌 수 있게 하는 것이 목표입니다.",
          "연수를 듣고 함께 이야기 나눌 소통방도 준비하고 있습니다.",
          "함께 만들고 싶은 연수가 있으면 운영진에게 알려 주세요.",
        ],
        link: { label: "운영진에게 문의하기", to: "/contact" },
      },
    ] satisfies TrainingGuideSection[] as TrainingGuideSection[],
  },
}

/** /training/<연수>/<쪽>. 빈 칸은 건너뛴다 */
export const trainingPath = (...slugs: string[]) =>
  [training.basePath, ...slugs].filter(Boolean).join("/")

/** 연수의 첫 번째 동작하는 쪽(없으면 준비 중인 연수) */
export const firstActivePage = (course: TrainingCourse) =>
  course.pages.find((p) => p.status === "active")
