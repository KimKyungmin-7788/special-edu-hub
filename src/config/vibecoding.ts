/**
 * 바이브코딩 영역(/vibecoding) — 왼쪽 사이드바 메뉴와 하위 페이지의 단일 소스.
 * 하위 페이지를 늘릴 때는 pages 에 한 줄 추가하고 App.tsx 에 라우트를 붙인다.
 * status: "active" = 동작 / "soon" = 자리만(준비 중).
 * 메뉴를 누르면 첫 번째 페이지가 바로 열린다(/vibecoding → 첫 페이지).
 */

export type VibecodingPage = {
  /** 주소 끝부분: /vibecoding/<slug> */
  slug: string
  label: string
  status: "active" | "soon"
  /** 바로 위 페이지에 딸린 하위 항목이면 true (메뉴에 2-1처럼 번호를 붙여요) */
  sub?: boolean
}

export const vibecoding = {
  title: "바이브코딩 배우기",
  basePath: "/vibecoding",
  /** 하위 페이지 그림·로고 위치(public/vibecoding/) */
  assetBase: "/vibecoding/",
  pages: [
    { slug: "why", label: "왜 바이브코딩인가?", status: "active" },
    { slug: "setup", label: "바이브코딩 환경구축", status: "active" },
    { slug: "survey", label: "연수 돌아보기", status: "active", sub: true },
  ] satisfies VibecodingPage[] as VibecodingPage[],
}

export const vibecodingPath = (slug: string) => `${vibecoding.basePath}/${slug}`

/** 메뉴 번호: 1, 2, 2-1처럼 하위 항목은 바로 위 번호에 붙여요 */
export const vibecodingNumbers = (() => {
  let main = 0
  let sub = 0
  return vibecoding.pages.map((p) => {
    if (p.sub) return `${main}-${++sub}`
    sub = 0
    return String(++main)
  })
})()
