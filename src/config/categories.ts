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
}

export const categories: Category[] = [
  { id: "korean", name: "국어", type: "subject", icon: "book-open", sortOrder: 1 },
  { id: "math", name: "수학", type: "subject", icon: "calculator", sortOrder: 2 },
  { id: "social", name: "사회", type: "subject", icon: "globe", sortOrder: 3 },
  { id: "science", name: "과학", type: "subject", icon: "flask-conical", sortOrder: 4 },
  { id: "music", name: "음악", type: "subject", icon: "music", sortOrder: 5 },
  { id: "art", name: "미술", type: "subject", icon: "palette", sortOrder: 6 },
  { id: "pe", name: "체육", type: "subject", icon: "activity", sortOrder: 7 },
  { id: "life", name: "일상생활", type: "subject", icon: "house", sortOrder: 8 },
  { id: "career", name: "진로직업", type: "subject", icon: "briefcase", sortOrder: 9 },
  { id: "creative", name: "창체", type: "subject", icon: "sparkles", sortOrder: 10 },
  { id: "class", name: "학급경영", type: "subject", icon: "users", sortOrder: 11 },
  { id: "work", name: "업무혁신", type: "work", icon: "settings", sortOrder: 12 },
  { id: "automation", name: "업무자동화", type: "work", icon: "zap", sortOrder: 13, hideFromGrid: true },
]

/** id로 카테고리 조회 (이름·아이콘 렌더링용) */
export function getCategory(id: string): Category | undefined {
  return categories.find((c) => c.id === id)
}

export const subjectCategories = categories.filter((c) => c.type === "subject")
export const workCategories = categories.filter((c) => c.type === "work")
