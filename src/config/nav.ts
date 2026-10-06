/**
 * 네비게이션 구조 — 메뉴와 라우트 제목의 단일 소스.
 * status: "active" = 이번 단계 작동 / "soon" = 자리만(준비 중).
 * end: NavLink 정확 일치 여부(루트 "/" 처럼 prefix 매칭을 막아야 할 때).
 * outsideApp: 허브 라우터 밖 주소 → 일반 a 태그로 전체 페이지 이동(같은 탭).
 */

import { VIBE_SETUP_HREF } from "@/config/site"

export type NavStatus = "active" | "soon"

export type NavItem = {
  label: string
  to: string
  status: NavStatus
  end?: boolean
  outsideApp?: boolean
}

export const navItems: NavItem[] = [
  { label: "홈", to: "/", status: "active", end: true },
  { label: "과목별", to: "/apps/subject", status: "active" },
  { label: "업무혁신", to: "/apps/work", status: "active" },
  { label: "수업실천사례", to: "/practices", status: "active" },
  { label: "바이브코딩", to: VIBE_SETUP_HREF, status: "active", outsideApp: true },
  { label: "자유게시판", to: "/board", status: "soon" },
  { label: "교사인증센터", to: "/verify", status: "active" },
  { label: "소개", to: "/about", status: "soon" },
]
