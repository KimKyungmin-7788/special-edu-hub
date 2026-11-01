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
  /** 갈래: 같은 단계에서 고르는 연수면 "A"·"B"… (이어진 갈래 연수는 한 단계로 묶여 4A·4B처럼 번호가 붙는다) */
  branch?: string
  pages: TrainingPage[]
}

/** 열린연수방이란? 아이콘 이름(그림은 TrainingGuide 에서 lucide 아이콘으로 바꾼다) */
export type GuideIcon = "gift" | "clock" | "shield" | "slides" | "video" | "live" | "people"

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
      pages: [
        { slug: "setup", label: "환경구축", status: "active" },
        { slug: "survey", label: "연수 돌아보기", status: "active" },
      ],
    },
    // 3단계 뒤 두 갈래
    {
      slug: "field-problems",
      title: "현장의 문제 해결하기",
      branch: "A",
      pages: [],
    },
    {
      slug: "gamification",
      title: "특수교육을 위한 게이미피케이션 자료제작",
      branch: "B",
      pages: [],
    },
  ] satisfies TrainingCourse[] as TrainingCourse[],
  /** 열린연수방이란?(/training) 문구 — 소개 띠 → 연수 단계(가로) → 앞으로(가로). 글은 짧게, 그림이 먼저 */
  guide: {
    heading: "특수교사가 함께 배우고 나누는 연수 공간",
    lead: "기초부터 차근차근, 특수교육에 맞는 바이브코딩",
    facts: [
      { icon: "gift", label: "무료" },
      { icon: "clock", label: "언제든" },
      { icon: "shield", label: "교사인증 회원" },
    ] satisfies { icon: GuideIcon; label: string }[],
    /** 첫 번째로 열린 연수의 첫 쪽으로 가는 노란 버튼 */
    ctaLabel: "첫 연수 시작하기",
    coursesHeading: "연수 단계",
    future: {
      heading: "앞으로 이렇게 넓혀 가요",
      stages: [
        { icon: "slides", label: "HTML 슬라이드", now: true },
        { icon: "video", label: "영상 연수" },
        { icon: "live", label: "라이브 연수" },
        { icon: "people", label: "누구나 연수 열기" },
      ] satisfies { icon: GuideIcon; label: string; now?: boolean }[] as { icon: GuideIcon; label: string; now?: boolean }[],
      note: "소통방도 준비 중",
      link: { label: "연수 제안하기", to: "/contact" },
    },
    footnote: "공식 연수 시간(학점)으로 인정되지 않아요",
  },
}

/** /training/<연수>/<쪽>. 빈 칸은 건너뛴다 */
export const trainingPath = (...slugs: string[]) =>
  [training.basePath, ...slugs].filter(Boolean).join("/")

/** 연수의 첫 번째 동작하는 쪽(없으면 준비 중인 연수) */
export const firstActivePage = (course: TrainingCourse) =>
  course.pages.find((p) => p.status === "active")

export type TrainingStep = { n: number; courses: { course: TrainingCourse; label: string }[] }

/** 단계 묶음 — 갈래가 있는 연수가 이어지면 한 단계로 묶는다. 번호표는 1, 2, 3, 4A, 4B … */
export const trainingSteps = training.courses.reduce<TrainingStep[]>((steps, course, i) => {
  const prev = training.courses[i - 1]
  if (course.branch && prev?.branch) {
    steps[steps.length - 1].courses.push({ course, label: `${steps.length}${course.branch}` })
  } else {
    const n = steps.length + 1
    steps.push({ n, courses: [{ course, label: course.branch ? `${n}${course.branch}` : String(n) }] })
  }
  return steps
}, [])

/** 연수별 번호표(courses 순서와 같음): 1, 2, 3, 4A, 4B … */
export const courseLabels = trainingSteps.flatMap((step) => step.courses.map((c) => c.label))
