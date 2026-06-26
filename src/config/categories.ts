/**
 * 카테고리(과목·업무) 목록.
 * 시작 목록일 뿐 조정 가능. 1단계에서 Supabase categories 테이블 시드로 옮긴다.
 * icon 값은 lucide-react 아이콘명 기준.
 */

export type CategoryType = "subject" | "work"

export type Category = {
  id: string
  name: string
  type: CategoryType
  icon: string
  sortOrder: number
  /**
   * 랜딩 카테고리 그리드에서 숨긴다(상위 진입점 아님).
   * 업무혁신 같은 상위 분류의 하위 필터로만 쓰는 카테고리에 사용.
   */
  hideFromGrid?: boolean
  /**
   * 상위 과목 id. 값이 있으면 "하위 분류"로,
   * 해당 과목 페이지 안에서 칩 필터로만 쓰인다(그리드·사이드바엔 안 나온다).
   */
  parentId?: string
  /**
   * 하위 분류 칩 묶음. 인접 칩의 group 값이 바뀌면 그 사이에 구분선을 그린다.
   * (예: 사회/과학에서 사회 칩과 과학 칩 사이 구분)
   */
  group?: string
}

export const categories: Category[] = [
  { id: "korean", name: "국어", type: "subject", icon: "book-open", sortOrder: 1 },
  { id: "math", name: "수학", type: "subject", icon: "calculator", sortOrder: 2 },
  { id: "social-science", name: "사회/과학", type: "subject", icon: "globe", sortOrder: 3 },
  { id: "arts", name: "음악/미술/체육", type: "subject", icon: "music", sortOrder: 4 },
  { id: "career", name: "진로와직업", type: "subject", icon: "briefcase", sortOrder: 5 },
  { id: "life", name: "일상생활", type: "subject", icon: "house", sortOrder: 6 },
  { id: "creative", name: "창체", type: "subject", icon: "sparkles", sortOrder: 7 },
  { id: "class", name: "학급경영", type: "subject", icon: "users", sortOrder: 8 },
  { id: "work", name: "업무혁신", type: "work", icon: "settings", sortOrder: 9 },
  { id: "automation", name: "업무자동화", type: "work", icon: "zap", sortOrder: 10, hideFromGrid: true },

  // ── 국어 하위 분류 (과목 페이지 안에서 칩 필터로만 사용) ──
  { id: "ko-tracing", name: "선긋기,색칠", type: "subject", icon: "", sortOrder: 101, parentId: "korean" },
  { id: "ko-jamo", name: "자모음", type: "subject", icon: "", sortOrder: 102, parentId: "korean" },
  { id: "ko-word", name: "낱말", type: "subject", icon: "", sortOrder: 103, parentId: "korean" },
  { id: "ko-sentence", name: "문장구성", type: "subject", icon: "", sortOrder: 105, parentId: "korean" },
  { id: "ko-reading", name: "문장이해,독해", type: "subject", icon: "", sortOrder: 106, parentId: "korean" },
  { id: "ko-dictation", name: "쓰기", type: "subject", icon: "", sortOrder: 107, parentId: "korean" },
  { id: "ko-diary", name: "일기", type: "subject", icon: "", sortOrder: 108, parentId: "korean" },
  { id: "ko-letter", name: "편지", type: "subject", icon: "", sortOrder: 109, parentId: "korean" },
  { id: "ko-poem", name: "동시", type: "subject", icon: "", sortOrder: 110, parentId: "korean" },
  { id: "ko-picturebook", name: "그림책", type: "subject", icon: "", sortOrder: 111, parentId: "korean" },
  { id: "ko-etc", name: "기타", type: "subject", icon: "", sortOrder: 112, parentId: "korean" },
  { id: "ko-basic", name: "기본과정", type: "subject", icon: "", sortOrder: 113, parentId: "korean" },
  { id: "ko-common", name: "공통과정", type: "subject", icon: "", sortOrder: 114, parentId: "korean" },

  // ── 수학 하위 분류 ──
  { id: "ma-pre", name: "수이전", type: "subject", icon: "", sortOrder: 201, parentId: "math" },
  { id: "ma-number", name: "수개념", type: "subject", icon: "", sortOrder: 202, parentId: "math" },
  { id: "ma-add", name: "덧셈", type: "subject", icon: "", sortOrder: 203, parentId: "math" },
  { id: "ma-sub", name: "뺄셈", type: "subject", icon: "", sortOrder: 204, parentId: "math" },
  { id: "ma-mul", name: "곱셈", type: "subject", icon: "", sortOrder: 205, parentId: "math" },
  { id: "ma-div", name: "나눗셈", type: "subject", icon: "", sortOrder: 206, parentId: "math" },
  { id: "ma-space", name: "공간", type: "subject", icon: "", sortOrder: 207, parentId: "math" },
  { id: "ma-shape", name: "도형", type: "subject", icon: "", sortOrder: 208, parentId: "math" },
  { id: "ma-time", name: "시각", type: "subject", icon: "", sortOrder: 209, parentId: "math" },
  { id: "ma-calendar", name: "달력", type: "subject", icon: "", sortOrder: 210, parentId: "math" },
  { id: "ma-money", name: "화폐", type: "subject", icon: "", sortOrder: 211, parentId: "math" },
  { id: "ma-word-problem", name: "문장제", type: "subject", icon: "", sortOrder: 212, parentId: "math" },
  { id: "ma-etc", name: "기타", type: "subject", icon: "", sortOrder: 213, parentId: "math" },
  { id: "ma-basic", name: "기본교육과정", type: "subject", icon: "", sortOrder: 214, parentId: "math" },

  // ── 사회/과학 하위 분류 (2022 개정 기본교육과정 영역) ──
  // 사회: 사회과 3영역
  { id: "ss-self", name: "나의 삶", type: "subject", icon: "", sortOrder: 301, parentId: "social-science", group: "social" },
  { id: "ss-relation", name: "관계의 삶", type: "subject", icon: "", sortOrder: 302, parentId: "social-science", group: "social" },
  { id: "ss-citizen", name: "시민의 삶", type: "subject", icon: "", sortOrder: 303, parentId: "social-science", group: "social" },
  // 과학: 4영역
  { id: "ss-matter", name: "물질", type: "subject", icon: "", sortOrder: 304, parentId: "social-science", group: "science" },
  { id: "ss-life", name: "생명", type: "subject", icon: "", sortOrder: 305, parentId: "social-science", group: "science" },
  { id: "ss-earth", name: "지구와 우주", type: "subject", icon: "", sortOrder: 306, parentId: "social-science", group: "science" },
  { id: "ss-energy", name: "운동과 에너지", type: "subject", icon: "", sortOrder: 307, parentId: "social-science", group: "science" },
  // 공통
  { id: "ss-etc", name: "기타", type: "subject", icon: "", sortOrder: 308, parentId: "social-science", group: "common" },
  { id: "ss-basic", name: "기본교육과정", type: "subject", icon: "", sortOrder: 309, parentId: "social-science", group: "common" },

  // ── 음악/미술/체육 하위 분류 (2022 개정 기본교육과정 영역) ──
  // 음악
  { id: "ar-music-express", name: "음악표현", type: "subject", icon: "", sortOrder: 401, parentId: "arts", group: "music" },
  { id: "ar-music-listen", name: "감상", type: "subject", icon: "", sortOrder: 402, parentId: "arts", group: "music" },
  { id: "ar-music-life", name: "생활화", type: "subject", icon: "", sortOrder: 403, parentId: "arts", group: "music" },
  // 미술
  { id: "ar-art-express", name: "미술표현", type: "subject", icon: "", sortOrder: 404, parentId: "arts", group: "art" },
  { id: "ar-art-listen", name: "감상", type: "subject", icon: "", sortOrder: 405, parentId: "arts", group: "art" },
  { id: "ar-art-experience", name: "체험", type: "subject", icon: "", sortOrder: 406, parentId: "arts", group: "art" },
  // 체육
  { id: "ar-pe-health", name: "건강", type: "subject", icon: "", sortOrder: 407, parentId: "arts", group: "pe" },
  { id: "ar-pe-challenge", name: "도전과 경쟁", type: "subject", icon: "", sortOrder: 408, parentId: "arts", group: "pe" },
  { id: "ar-pe-express", name: "신체표현", type: "subject", icon: "", sortOrder: 409, parentId: "arts", group: "pe" },
  // 공통
  { id: "ar-etc", name: "기타", type: "subject", icon: "", sortOrder: 410, parentId: "arts", group: "common" },
  { id: "ar-basic", name: "기본교육과정", type: "subject", icon: "", sortOrder: 411, parentId: "arts", group: "common" },

  // ── 진로와직업 하위 분류 (2022 개정 기본교육과정 영역) ──
  { id: "ca-self", name: "자기이해", type: "subject", icon: "", sortOrder: 501, parentId: "career" },
  { id: "ca-world", name: "직업의 세계", type: "subject", icon: "", sortOrder: 502, parentId: "career" },
  { id: "ca-skill", name: "작업 기초 능력", type: "subject", icon: "", sortOrder: 503, parentId: "career" },
  { id: "ca-design", name: "진로 설계", type: "subject", icon: "", sortOrder: 504, parentId: "career" },
  { id: "ca-life", name: "직업생활", type: "subject", icon: "", sortOrder: 505, parentId: "career" },
  { id: "ca-etc", name: "기타", type: "subject", icon: "", sortOrder: 506, parentId: "career" },
  { id: "ca-basic", name: "기본교육과정", type: "subject", icon: "", sortOrder: 507, parentId: "career" },
]

/** id로 카테고리 조회 (이름·아이콘 렌더링용) */
export function getCategory(id: string): Category | undefined {
  return categories.find((c) => c.id === id)
}

/** 상위 과목만 (하위 분류 제외) — 사이드바·그리드용 */
export const subjectCategories = categories.filter(
  (c) => c.type === "subject" && !c.parentId,
)
export const workCategories = categories.filter(
  (c) => c.type === "work" && !c.parentId,
)

/** 특정 과목의 하위 분류 목록 (sortOrder 순). 없으면 빈 배열. */
export function getSubcategories(parentId: string): Category[] {
  return categories
    .filter((c) => c.parentId === parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
}
