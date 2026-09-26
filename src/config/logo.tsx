import type { SVGProps } from "react"

/**
 * 누리집 로고 — 동해 해돋이(강릉): 초록 바탕 위로 떠오르는 노란 해 + 흰 물결 두 줄.
 * "새 수업이 떠오르는 아침". 로고를 바꿀 때는 이 파일만 고친다(CLAUDE.md 절대규칙 3).
 * 색은 토큰(--primary / --cta / --primary-foreground)만 쓴다.
 * 브라우저 탭 아이콘은 public/favicon.svg — CSS 변수를 못 쓰는 정적 파일이라
 * 같은 모양을 토큰 값(hex)으로 따로 둔다. 모양·색을 바꾸면 그 파일도 함께 바꾼다.
 */
export function SiteLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden {...props}>
      <rect width="40" height="40" rx="10" fill="var(--primary)" />
      <path d="M11 23a9 9 0 0 1 18 0z" fill="var(--cta)" />
      <path
        d="M7 27c3-2 6-2 9 0s6 2 9 0 6-2 8 0M9 32c3-2 6-2 9 0s6 2 9 0"
        fill="none"
        stroke="var(--primary-foreground)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  )
}
