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
}

export const vibecoding = {
  title: "바이브코딩 배우기",
  basePath: "/vibecoding",
  /** 하위 페이지 그림·로고 위치(public/vibecoding/) */
  assetBase: "/vibecoding/",
  pages: [
    { slug: "why", label: "왜 바이브코딩인가?", status: "active" },
    { slug: "setup", label: "바이브코딩 환경구축", status: "active" },
  ] satisfies VibecodingPage[] as VibecodingPage[],
}

export const vibecodingPath = (slug: string) => `${vibecoding.basePath}/${slug}`
