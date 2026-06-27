/**
 * 네비게이션 구조 — 메뉴와 라우트 제목의 단일 소스.
 * status: "active" = 이번 단계 작동 / "soon" = 자리만(준비 중).
 * end: NavLink 정확 일치 여부(루트 "/" 처럼 prefix 매칭을 막아야 할 때).
 */

export type NavStatus = "active" | "soon"

export type NavItem = {
  label: string
  to: string
  status: NavStatus
  end?: boolean
}

export const navItems: NavItem[] = [
  { label: "홈", to: "/", status: "active", end: true },
  { label: "과목별", to: "/apps/subject", status: "active" },
  { label: "업무혁신", to: "/apps/work", status: "active" },
  { label: "수업실천사례", to: "/practices", status: "soon" },
  { label: "자유게시판", to: "/board", status: "soon" },
  { label: "교사인증센터", to: "/verify", status: "soon" },
  { label: "소개", to: "/about", status: "soon" },
]
