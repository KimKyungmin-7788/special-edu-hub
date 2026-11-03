/**
 * 네비게이션 구조 — 메뉴와 라우트 제목의 단일 소스.
 * status: "active" = 이번 단계 작동 / "soon" = 자리만(준비 중).
 * end: NavLink 정확 일치 여부(루트 "/" 처럼 prefix 매칭을 막아야 할 때).
 * children: 넓은 화면 가로 메뉴에 마우스를 올리면 아래로 펼쳐지는 하부 섹션. 이름·주소는 각 영역 config 에서 가져온다.
 */

import { subjectCategories } from "@/config/categories"
import { training } from "@/config/training"

export type NavStatus = "active" | "soon"

export type NavItem = {
  label: string
  to: string
  status: NavStatus
  end?: boolean
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
    children: subjectCategories.map((c) => ({ label: c.name, to: `/apps/subject/${c.id}` })),
  },
  { label: "업무혁신", to: "/apps/work", status: "active" },
  { label: "수업실천사례", to: "/practices", status: "active" },
  {
    label: "열린연수방",
    to: "/training",
    status: "active",
    // 함께 여는 연수가 공개예정이면 하부 섹션 없이 열린연수방이란?으로만 간다
    children:
      training.share.status === "active"
        ? [
            { label: "열린 연수", to: training.basePath },
            { label: training.share.title, to: training.share.path },
          ]
        : undefined,
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
  { label: "교사인증센터", to: "/verify", status: "active" },
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
