/**
 * 열린연수방의 단계 패널·고정 연수·안내 문구.
 * /training = 단계별 카드 목록, /training/guide = 소개, /training/share/:id = 회원 연수.
 * 기존 고정 연수는 active/soon 상태와 교사인증 정책을 유지한다.
 */

export type TrainingPage = {
  /** 주소 끝부분: /training/<영역>/<slug> */
  slug: string
  label: string
  status: "active" | "soon"
  /** 맛보기 쪽 — 로그인·교사인증 없이 누구나 본다 */
  everyone?: boolean
  /** 갈래: 영역 안에서 갈래로 나뉘는 세부 연수면 "A"·"B"… (연수 단계 그림에서 선이 갈라진다) */
  branch?: string
  /** 사이드바처럼 좁은 곳에 쓰는 짧은 이름(없으면 label) */
  short?: string
  /** 공개 예정일(예: "11월 8일") — 공개예정 쪽에 '11월 8일 공개예정'으로 보인다. 없으면 '공개예정'만 */
  release?: string
}

export type TrainingStage = "vibecoding" | "agent" | "field"

export type TrainingCourse = {
  /** 주소 가운데: /training/<slug> */
  slug: TrainingStage
  title: string
  eyebrow: string
  description: string
  pages: TrainingPage[]
}

/** 열린연수방이란? 아이콘 이름(그림은 TrainingGuide 에서 lucide 아이콘으로 바꾼다) */
export type GuideIcon = "gift" | "clock" | "shield" | "monitor" | "card" | "slides" | "video" | "live" | "people"

export const training = {
  title: "열린연수방",
  basePath: "/training",
  guideLabel: "열린연수방이란?",
  courses: [
    {
      slug: "vibecoding",
      title: "특수교육 바이브코딩 기초",
      eyebrow: "시작하기",
      description: "처음 만나는 AI와 수업 만들기",
      // 2026-11-03 사용자 요청: 열린연수방이란? 말고 모두 공개예정으로 잠금(운영진 포함). why·basics 는 11월 8일 공개 예정
      pages: [
        { slug: "why", label: "왜 바이브코딩인가?", status: "soon", release: "11월 8일", everyone: true },
        { slug: "basics", label: "기초 익히기", status: "soon", release: "11월 8일" },
        { slug: "methods", label: "다양한 방법 익히기", status: "soon" },
        { slug: "subjects", label: "교과별 활용", status: "soon" },
      ],
    },
    {
      slug: "agent",
      title: "에이전트코딩 환경구축",
      eyebrow: "준비하기",
      description: "GitHub · Supabase · Vercel · 하네스",
      pages: [
        { slug: "setup", label: "환경구축", status: "soon" },
        { slug: "survey", label: "연수 돌아보기", status: "soon" },
      ],
    },
    {
      slug: "field",
      title: "현장 활용",
      eyebrow: "활용하기",
      description: "문제 해결 · 학습 게임 · 수업 HTML",
      // 세 갈래로 나뉜다
      pages: [
        { slug: "problems", label: "현장의 문제 해결하기", status: "soon", branch: "A" },
        {
          slug: "gamification",
          label: "특수교육을 위한 게이미피케이션 자료제작",
          short: "게이미피케이션 자료제작",
          status: "soon",
          branch: "B",
        },
        { slug: "interactive-html", label: "인터랙티브 수업 HTML 제작", status: "soon", branch: "C" },
      ],
    },
  ] satisfies TrainingCourse[] as TrainingCourse[],
  /** 연수 흐름 밖의 함께하는 활동 — 사이드바 구분선 아래·연수 단계 그림 아래에 따로. 지금은 준비중 */
  study: { title: "스터디 활동" },
  /** 회원 연수 게시판(49·62). 누구나 보고, 인증 교사가 단계를 골라 올린다. */
  share: {
    title: "함께 여는 연수",
    path: "/training/share",
    /** "soon" 이면 목록·글·쓰기 모두 공개예정으로 막는다(이미 올린 글도, 운영진도). 화면에서만 막음 — 글 자체는 DB 에 그대로 */
    status: "active" as "active" | "soon",
    description: "선생님이 알려 주고 싶은 것을 연수로 열어 주세요. 누구나 보고 배울 수 있어요.",
    notice: "누구나 볼 수 있고, 교사인증 회원은 연수를 올리고 댓글을 남길 수 있어요. 학생 얼굴·이름이 나오는 자료는 올리지 않아요.",
    ctaLabel: "연수 올리기",
    emptyTitle: "첫 연수를 기다리고 있어요",
    emptyBody: "작은 팁 하나도 좋은 연수가 돼요. 알려 주고 싶은 것을 올려 주세요.",
    writeHeading: "연수 올리기",
    writeGuard: "학생의 얼굴·이름·개인 정보가 나오는 사진이나 자료는 올리지 말아 주세요.",
  },
  /** 공개예정 쪽 표시와, 그 주소로 바로 왔을 때의 안내 */
  soon: {
    label: "공개예정",
    notice: "지금 준비하고 있어요. 공개되면 이곳에서 바로 볼 수 있어요.",
    backLabel: "열린연수방이란? 보기",
  },
  /** 열린연수방이란?(/training) 문구 — 소개 띠 → 연수 단계(영역 칸을 세로 화살표로, 칸 안에 세부 연수) → 앞으로의 비전(가로). 글은 짧게, 그림이 먼저 */
  guide: {
    heading: "특수교사라면 누구나 언제든지 AI를 배울 수 있는 열린 배움공간",
    lead: "기초부터 차근차근, 특수교육에 맞는 바이브코딩",
    facts: [
      { icon: "gift", label: "연수비 무료" },
      { icon: "clock", label: "언제든" },
      { icon: "shield", label: "교사인증 회원" },
      // 2. 환경구축부터 필요한 것 — 들어가 보고서야 알게 되지 않도록 첫 화면에 적는다
      { icon: "monitor", label: "Windows 기준" },
      { icon: "card", label: "AI 도구 유료 구독 필요" },
    ] satisfies { icon: GuideIcon; label: string }[],
    /** 첫 번째로 열린 연수의 첫 쪽으로 가는 노란 버튼 */
    ctaLabel: "첫 연수 시작하기",
    coursesHeading: "연수 단계",
    future: {
      heading: "열린연수방 앞으로의 비전",
      stages: [
        { icon: "slides", label: "HTML 인터랙티브 연수자료", now: true },
        { icon: "video", label: "영상 연수" },
        { icon: "live", label: "라이브 연수" },
        { icon: "people", label: "누구나 연수 열기" },
      ] satisfies { icon: GuideIcon; label: string; now?: boolean }[] as { icon: GuideIcon; label: string; now?: boolean }[],
      note: "소통방도 준비 중",
      link: { label: "연수 제안하기", to: "/contact" },
    },
    footnote: "공식 연수 시간(학점)으로 인정되지 않아요. 이곳은 자발적 교사들이 모이는 실천 공동체입니다.",
  },
}

/** /training/<영역>/<세부 연수>. 빈 칸은 건너뛴다 */
export const trainingPath = (...slugs: string[]) =>
  [training.basePath, ...slugs].filter(Boolean).join("/")

/** 영역의 첫 번째 동작하는 쪽(없으면 준비 중인 영역) */
export const firstActivePage = (course: TrainingCourse) =>
  course.pages.find((p) => p.status === "active")

/** 공개예정 표시 — 예정일이 있으면 '11월 8일 공개예정', 없으면 '공개예정' */
export const soonLabel = (release?: string) =>
  release ? `${release} ${training.soon.label}` : training.soon.label

/** 영역 안 갈래 수('· 3갈래' 표시용, 갈래가 없으면 0) */
export const branchCount = (course: TrainingCourse) => course.pages.filter((p) => p.branch).length

/** 주소와 글쓰기에서 사용하는 단계 값은 같은 목록으로 검증한다. */
export function isTrainingStage(value: unknown): value is TrainingStage {
  return training.courses.some((course) => course.slug === value)
}

/** 기존 환경구축 자료의 확인된 표지 정보. 같은 단계의 다른 글에는 적용하지 않는다. */
export const setupMaterial = {
  url: "https://vibecoding-setting.vercel.app/",
  heading: "준비하기 → 연결하기 → 만들기",
  topics: ["GitHub", "Supabase", "Vercel"],
  badge: "Windows",
  summary: "3장 · 8단계로 차근차근 따라 해요.",
}
