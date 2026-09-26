import type { SVGProps } from "react"

/**
 * 누리집 로고 — 글자 로고 "강릉": 초록 바탕 + 흰 글자 + 오른쪽 위 노란 점.
 * 로고를 바꿀 때는 이 파일만 고친다(CLAUDE.md 절대규칙 3).
 * 색은 토큰(--primary / --primary-foreground / --cta)만 쓴다. 글꼴은 누리집 본문 글꼴(--font-main).
 * 브라우저 탭 아이콘은 public/favicon.svg — CSS 변수를 못 쓰는 정적 파일이라
 * 같은 모양을 토큰 값(hex)으로 따로 두고, 16px 에서는 "강" 한 글자만 쓴다. 모양·색을 바꾸면 그 파일도 함께 바꾼다.
 */
export function SiteLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden {...props}>
      <rect width="40" height="40" rx="10" fill="var(--primary)" />
      <text
        x="20"
        y="25.5"
        textAnchor="middle"
        fontSize="14"
        fontWeight="700"
        letterSpacing="-0.5"
        fill="var(--primary-foreground)"
        style={{ fontFamily: "var(--font-main)" }}
      >
        강릉
      </text>
      <circle cx="31" cy="10" r="3" fill="var(--cta)" />
    </svg>
  )
}
