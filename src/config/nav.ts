/**
 * 네비게이션 구조 — 메뉴와 라우트 제목의 단일 소스.
 * status: "active" = 이번 단계 작동 / "soon" = 자리만(준비 중).
 * end: NavLink 정확 일치 여부(루트 "/" 처럼 prefix 매칭을 막아야 할 때).
 * groupStart: 넓은 화면 가로 메뉴에서 이 메뉴 앞에 얇은 세로선을 그어 묶음을 나눈다(홈 | 자료 | 함께 | 안내, 2026-11-28 B안).
 * children: 넓은 화면 가로 메뉴에 마우스를 올리면 아래로 펼쳐지는 하부 섹션. 이름·주소는 각 영역 config 에서 가져온다.
 */

import { subjectCategories } from "@/config/categories"
import { training } from "@/config/training"
import { seedling } from "@/config/seedling"
import { projects } from "@/config/projects"

export type NavStatus = "active" | "soon"

export type NavItem = {
  label: string
  to: string
  status: NavStatus
  end?: boolean
  groupStart?: boolean
  children?: NavChild[]
}

/** 하부 섹션 한 줄 */
export type NavChild = { label: string; to: string }

export const navItems: NavItem[] = [
  { label: "홈", to: "/", status: "active", end: true },
  {
    label: "과목별",
    to: "/apps/subject",
    status: "active",
    groupStart: true,
    children: subjectCategories.map((c) => ({ label: c.name, to: `/apps/subject/${c.id}` })),
  },
  { label: "업무혁신", to: "/apps/work", status: "active" },
  { label: seedling.title, to: seedling.path, status: "active" },
  { label: "수업실천사례", to: "/practices", status: "active" },
  {
    label: training.title,
    to: "/training",
    status: "active",
    groupStart: true,
    // 열린 연수(단계 연수 + 회원 연수) · 협업 프로젝트(PRD §15)
    children: [
      { label: training.catalogueLabel, to: training.basePath },
      { label: projects.title, to: projects.listPath },
    ],
  },
  {
    label: "게시판",
    to: "/board",
    status: "active",
    children: [
      { label: "자유게시판", to: "/board/free" },
      { label: "연구회게시판", to: "/board/research" },
    ],
  },
  { label: "교사인증센터", to: "/verify", status: "active", groupStart: true },
  {
    label: "소개",
    to: "/about",
    status: "active",
    children: [
      { label: "누리집 소개", to: "/about" },
      { label: "새 소식", to: "/updates" },
    ],
  },
]
